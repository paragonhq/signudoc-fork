import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import type pg from "pg";

import { getDocumentsOverview, listActivityForUser } from "./activity.ts";
import { openTestDatabase } from "./db/test-database.ts";
import { recordAuditEvent } from "./services/audit.ts";

// The Activity feed and the Documents overview against a real Postgres:
// each account sees only what happened on its own envelopes. Run with
// `npm run test:db`.

let database: pg.Pool;
const userIds: string[] = [];

async function insertUser(): Promise<string> {
  const userId = randomUUID();

  await database.query(
    `insert into public."user" (id, name, email) values ($1, $2, $3)`,
    [userId, "Activity Tester", `activity+${userId}@example.com`],
  );
  userIds.push(userId);

  return userId;
}

async function insertEnvelope(
  userId: string,
  input: {
    completedAt?: number;
    signerEmails?: string[];
    status?: string;
    title: string;
  },
): Promise<string> {
  const envelopeId = randomUUID();

  await database.query(
    `
      insert into public.envelopes (
        id, user_id, title, status, source_pdf_key, source_pdf_filename,
        source_pdf_size_bytes, page_count, source_pdf_hash, sent_at,
        completed_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      envelopeId,
      userId,
      input.title,
      input.status ?? "draft",
      `users/${userId}/envelopes/${envelopeId}/original.pdf`,
      "sample.pdf",
      1024,
      1,
      "0".repeat(64),
      input.status && input.status !== "draft"
        ? Math.floor(Date.now() / 1000) - 3600
        : null,
      input.completedAt ?? null,
    ],
  );

  for (const [index, email] of (input.signerEmails ?? []).entries()) {
    await database.query(
      `
        insert into public.signers (id, envelope_id, name, email, sign_order)
        values ($1, $2, $3, $4, $5)
      `,
      [
        randomUUID(),
        envelopeId,
        `Signer ${String(index + 1)}`,
        email,
        index + 1,
      ],
    );
  }

  return envelopeId;
}

before(async () => {
  database = await openTestDatabase();
});

after(async () => {
  if (userIds.length > 0) {
    await database.query(`delete from public."user" where id = any($1)`, [
      userIds,
    ]);
  }

  await database.end();
});

test("the feed lists only the caller's own envelopes' events", async () => {
  const mine = await insertUser();
  const theirs = await insertUser();
  const myEnvelope = await insertEnvelope(mine, {
    status: "sent",
    title: "Mine",
  });
  const theirEnvelope = await insertEnvelope(theirs, {
    status: "sent",
    title: "Theirs",
  });
  const now = Math.floor(Date.now() / 1000);

  for (const [envelopeId, at] of [
    [myEnvelope, now - 30],
    [theirEnvelope, now - 20],
  ] as const) {
    await recordAuditEvent(
      {
        actorEmail: "riley@example.test",
        actorType: "signer",
        createdAt: at,
        envelopeId,
        event: "viewed",
        metadata: {
          signerEmail: "riley@example.test",
          signerName: "Riley",
        },
      },
      database,
    );
  }

  // An event the feed does not show.
  await recordAuditEvent(
    {
      actorType: "system",
      createdAt: now - 10,
      envelopeId: myEnvelope,
      event: "email_sent",
    },
    database,
  );

  const page = await listActivityForUser(mine, {}, database);

  assert.deepEqual(
    page.items.map((item) => [item.envelopeTitle, item.kind, item.actorName]),
    [["Mine", "viewed", "Riley"]],
  );
  assert.equal(page.nextCursor, null);

  const newer = await listActivityForUser(mine, { since: now - 30 }, database);

  assert.equal(newer.items.length, 0, "since is exclusive");
});

test("the overview counts drafts, template drafts and this month", async () => {
  const userId = await insertUser();
  const now = Math.floor(Date.now() / 1000);

  await insertEnvelope(userId, {
    signerEmails: ["pat@example.test"],
    title: "A draft",
  });
  await insertEnvelope(userId, {
    signerEmails: ["role-1@template-role.invalid"],
    title: "A template being made",
  });
  await insertEnvelope(userId, {
    signerEmails: ["pat@example.test", "sam@example.test"],
    status: "sent",
    title: "Out for signature",
  });
  await insertEnvelope(userId, {
    completedAt: now - 60,
    status: "completed",
    title: "Done",
  });

  const overview = await getDocumentsOverview(userId, now, database);

  assert.equal(overview.drafts, 1);
  assert.equal(overview.templateDrafts, 1);
  assert.equal(overview.waiting, 1);
  assert.equal(overview.signaturesNeeded, 2);
  assert.equal(overview.signaturesIn, 0);
  assert.equal(overview.completedTotal, 1);
  assert.equal(overview.completedThisMonth, 1);
  assert.equal(overview.completedByWeek.at(-1), 1);
});
