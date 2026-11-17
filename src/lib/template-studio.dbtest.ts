import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { PDFDocument } from "pdf-lib";
import type pg from "pg";

import { openTestDatabase } from "./db/test-database.ts";
import {
  createDraftEnvelope,
  getPrepareEnvelopeDataForUser,
  replaceDraftEnvelopeFields,
  replaceDraftEnvelopeSigners,
} from "./envelopes.ts";
import {
  createStorageService,
  type StorageService,
} from "./services/storage.ts";
import {
  deleteTemplateWithThumbnail,
  discardTemplateDraft,
  getTemplateDetailForUser,
  getTemplateDocumentForUser,
  getTemplateDraftForUser,
  getTemplateThumbnailForUser,
  renameTemplate,
  saveTemplateFromDraft,
  saveTemplateThumbnailForUser,
  startTemplateDraft,
  TemplateError,
} from "./templates.ts";

// "New template" and the template page against a real Postgres and real
// files: a scratch draft becomes a template and goes away, only the owner
// reads a template's document and picture, and a real draft is never
// mistaken for a scratch one. Run with `npm run test:db`.

let database: pg.Pool;
let storageDir: string;
let storageService: StorageService;
let sourcePdf: Uint8Array;
const createdUsers: string[] = [];

// The smallest JPEG the thumbnail check accepts: a 16 x 16 frame header.
const TINY_JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x10, 0x03, 0x01,
  0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
]);

before(async () => {
  database = await openTestDatabase();
  storageDir = await mkdtemp(path.join(tmpdir(), "signudoc-template-studio-"));
  storageService = createStorageService({
    env: { STORAGE_DRIVER: "local", STORAGE_LOCAL_DIR: storageDir },
  });

  const pdf = await PDFDocument.create();

  pdf.addPage([612, 792]);
  pdf.addPage([612, 792]);
  sourcePdf = await pdf.save();
});

after(async () => {
  await database.query(`delete from public."user" where id = any($1)`, [
    createdUsers,
  ]);
  await database.end();
  await rm(storageDir, { force: true, recursive: true });
});

async function createUser(): Promise<string> {
  const userId = randomUUID();

  createdUsers.push(userId);
  await database.query(
    `insert into public."user" (id, name, email, role) values ($1, 'Sam Sender', $2, 'user')`,
    [userId, `${userId}@example.test`],
  );

  return userId;
}

async function createUpload(userId: string) {
  const draft = await createDraftEnvelope(
    userId,
    {
      sourcePdf: { body: sourcePdf, filename: "services.pdf" },
      title: "Services agreement",
    },
    { database, storageService },
  );

  return draft.envelope.id;
}

async function placeFields(userId: string, envelopeId: string) {
  const envelope = await getPrepareEnvelopeDataForUser(userId, envelopeId, {
    database,
  });
  const [client, contractor] = [...envelope!.signers].sort(
    (left, right) => left.order - right.order,
  );
  const field = (signerId: string, type: string, page: number, y: number) => ({
    height: 0.04,
    page,
    required: true,
    signerId,
    type,
    width: 0.2,
    x: 0.1,
    y,
  });

  await replaceDraftEnvelopeFields(
    userId,
    envelopeId,
    {
      fields: [
        field(client!.id, "signature", 2, 0.8),
        field(client!.id, "date", 2, 0.86),
        field(contractor!.id, "signature", 2, 0.7),
      ],
    },
    database,
  );
}

test("a scratch draft becomes a template with its roles, and is removed", async () => {
  const userId = await createUser();
  const envelopeId = await createUpload(userId);

  await startTemplateDraft(
    userId,
    envelopeId,
    { roleNames: ["Client", "Contractor"] },
    database,
  );
  await placeFields(userId, envelopeId);

  const draft = await getTemplateDraftForUser(userId, envelopeId, database);

  assert.deepEqual(
    draft?.roles.map((role) => [role.name, role.summary]),
    [
      ["Client", "1 signature · 1 date"],
      ["Contractor", "1 signature"],
    ],
  );

  const saved = await saveTemplateFromDraft(
    userId,
    envelopeId,
    { name: "Services agreement" },
    { database, storageService },
  );
  const detail = await getTemplateDetailForUser(userId, saved.id, database);

  assert.equal(detail?.name, "Services agreement");
  assert.deepEqual(
    detail?.roles.map((role) => role.name),
    ["Client", "Contractor"],
  );
  assert.equal(detail?.fields.length, 3);
  assert.ok(detail?.fields.every((field) => field.page === 2));
  // The scratch draft is gone; the template keeps its own document.
  assert.equal(
    await getPrepareEnvelopeDataForUser(userId, envelopeId, { database }),
    null,
  );
  assert.ok(
    (
      await getTemplateDocumentForUser(userId, saved.id, {
        database,
        storageService,
      })
    ).body.length > 0,
  );
});

test("a template with no fields is not saved", async () => {
  const userId = await createUser();
  const envelopeId = await createUpload(userId);

  await startTemplateDraft(
    userId,
    envelopeId,
    { roleNames: ["Client"] },
    database,
  );
  await assert.rejects(
    saveTemplateFromDraft(
      userId,
      envelopeId,
      { name: "Empty" },
      { database, storageService },
    ),
    (error: unknown) =>
      error instanceof TemplateError && error.statusCode === 400,
  );

  await discardTemplateDraft(userId, envelopeId, { database, storageService });
  assert.equal(
    await getTemplateDraftForUser(userId, envelopeId, database),
    null,
  );
});

test("a real draft is never taken for a scratch draft", async () => {
  const userId = await createUser();
  const envelopeId = await createUpload(userId);

  await replaceDraftEnvelopeSigners(
    userId,
    envelopeId,
    { signers: [{ email: "riley@example.test", name: "Riley" }] },
    database,
  );

  assert.equal(
    await getTemplateDraftForUser(userId, envelopeId, database),
    null,
  );
  await assert.rejects(
    startTemplateDraft(userId, envelopeId, { roleNames: ["Client"] }, database),
    (error: unknown) =>
      error instanceof TemplateError && error.statusCode === 409,
  );
  await assert.rejects(
    discardTemplateDraft(userId, envelopeId, { database, storageService }),
    (error: unknown) =>
      error instanceof TemplateError && error.statusCode === 404,
  );
  // Still there, untouched.
  assert.ok(
    await getPrepareEnvelopeDataForUser(userId, envelopeId, { database }),
  );
});

test("roles need different names", async () => {
  const userId = await createUser();
  const envelopeId = await createUpload(userId);

  await assert.rejects(
    startTemplateDraft(
      userId,
      envelopeId,
      { roleNames: ["Client", "client"] },
      database,
    ),
    (error: unknown) =>
      error instanceof TemplateError && error.statusCode === 400,
  );
});

test("only the owner reads, renames or pictures a template", async () => {
  const ownerId = await createUser();
  const strangerId = await createUser();
  const envelopeId = await createUpload(ownerId);

  await startTemplateDraft(
    ownerId,
    envelopeId,
    { roleNames: ["Client", "Contractor"] },
    database,
  );
  await placeFields(ownerId, envelopeId);

  const saved = await saveTemplateFromDraft(
    ownerId,
    envelopeId,
    { name: "Owner's template" },
    { database, storageService },
  );
  const notFound = (error: unknown) =>
    error instanceof TemplateError && error.statusCode === 404;

  assert.equal(
    await getTemplateDetailForUser(strangerId, saved.id, database),
    null,
  );
  await assert.rejects(
    getTemplateDocumentForUser(strangerId, saved.id, {
      database,
      storageService,
    }),
    notFound,
  );
  await assert.rejects(
    renameTemplate(strangerId, saved.id, { name: "Mine now" }, database),
    notFound,
  );
  await assert.rejects(
    saveTemplateThumbnailForUser(strangerId, saved.id, TINY_JPEG, {
      database,
      storageService,
    }),
    notFound,
  );

  // No picture yet, then the owner's browser sends one.
  await assert.rejects(
    getTemplateThumbnailForUser(ownerId, saved.id, {
      database,
      storageService,
    }),
    notFound,
  );
  await saveTemplateThumbnailForUser(ownerId, saved.id, TINY_JPEG, {
    database,
    storageService,
  });

  const picture = await getTemplateThumbnailForUser(ownerId, saved.id, {
    database,
    storageService,
  });

  assert.equal(picture.isNotModified, false);
  assert.equal(
    (
      await getTemplateThumbnailForUser(ownerId, saved.id, {
        database,
        ifNoneMatch: picture.etag,
        storageService,
      })
    ).isNotModified,
    true,
  );
  await assert.rejects(
    getTemplateThumbnailForUser(strangerId, saved.id, {
      database,
      storageService,
    }),
    notFound,
  );

  await renameTemplate(ownerId, saved.id, { name: "Renamed" }, database);
  assert.equal(
    (await getTemplateDetailForUser(ownerId, saved.id, database))?.name,
    "Renamed",
  );

  // Deleting takes the picture with it.
  await deleteTemplateWithThumbnail(ownerId, saved.id, {
    database,
    storageService,
  });
  await assert.rejects(
    storageService.getObject(
      `users/${ownerId}/templates/${saved.id}/thumbnail.jpg`,
    ),
  );
});
