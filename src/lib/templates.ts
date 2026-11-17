import { randomUUID } from "node:crypto";

import {
  type DbExecutor,
  type DbPool,
  getDb,
  queryMany,
  queryOne,
  withTransaction,
} from "./db/connection.ts";
import {
  createDraftEnvelope,
  deleteDraftEnvelope,
  EnvelopeDocumentAccessError,
  getDraftEnvelopeDocumentForUser,
  getPrepareEnvelopeDataForUser,
  replaceDraftEnvelopeFields,
  replaceDraftEnvelopeSigners,
} from "./envelopes.ts";
import { countAnswerableFields } from "./field-choices.ts";
import { fieldPlacementListSchema } from "./schemas/field.ts";
import {
  saveTemplateSchema,
  templateRolesSchema,
  useTemplateSchema,
  type TemplateRole,
} from "./schemas/template.ts";
import { buildTemplatePdfKey } from "./services/storage-keys.ts";
import {
  createStorageService,
  StorageObjectNotFoundError,
  type StorageObjectStream,
  type StorageService,
} from "./services/storage.ts";
import {
  assertThumbnailImage,
  buildThumbnailEtag,
  matchesEtag,
  THUMBNAIL_CONTENT_TYPE,
} from "./services/thumbnails.ts";

// A template is a document, the fields placed on it and its signing order,
// kept so the same thing can be sent again. It names no one: each place in
// the signing order is a role ("Client"), filled in when the template is
// used. It is made from an envelope and turned back into a draft envelope,
// so everything a draft can hold, a template can hold.

/** A guard on storage, not a product limit anyone should run into. */
export const MAX_TEMPLATES_PER_USER = 100;

const UNUSABLE_TEMPLATE_MESSAGE =
  "This template can no longer be used. Delete it, then save the document as a template again.";

export class TemplateError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "TemplateError";
    this.statusCode = statusCode;
  }
}

type TemplateOptions = {
  database?: DbPool;
  storageService?: StorageService;
};

/** Refuses another template for a user who already has the most allowed. */
async function assertRoomForTemplate(
  userId: string,
  database: DbExecutor,
): Promise<void> {
  const existing = await queryOne<{ total: number }>(
    database,
    `SELECT count(*)::int AS total FROM templates WHERE user_id = $1`,
    [userId],
  );

  if ((existing?.total ?? 0) >= MAX_TEMPLATES_PER_USER) {
    throw new TemplateError(
      `You have ${String(MAX_TEMPLATES_PER_USER)} templates, which is the most an account can keep. Delete one to save another.`,
      409,
    );
  }
}

type TemplateRow = {
  createdAt: number;
  fields: unknown;
  id: string;
  name: string;
  pageCount: number;
  roles: unknown;
  sourcePdfFilename: string;
  sourcePdfKey: string;
};

export type TemplateListItem = {
  createdAtLabel: string;
  fieldCountLabel: string;
  id: string;
  name: string;
  pageCountLabel: string;
  /** In signing order. */
  roleNames: string[];
};

/** What the "use this template" form needs. */
export type UseTemplateData = {
  fieldCountLabel: string;
  id: string;
  name: string;
  pageCountLabel: string;
  roles: TemplateRole[];
};

export type SavedTemplate = {
  id: string;
  name: string;
};

export type DraftFromTemplate = {
  envelopeId: string;
  redirectPath: string;
};

const TEMPLATE_COLUMNS = `
  id,
  name,
  page_count AS "pageCount",
  roles,
  fields,
  source_pdf_key AS "sourcePdfKey",
  source_pdf_filename AS "sourcePdfFilename",
  created_at AS "createdAt"
`;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function countLabel(count: number, singular: string): string {
  return `${String(count)} ${count === 1 ? singular : `${singular}s`}`;
}

// A list must still open when one template's stored contents cannot be
// read, so the names and the count are taken leniently here. Using a
// template checks them properly.
function readRoleNames(roles: unknown): string[] {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.flatMap((role: unknown) =>
    typeof role === "object" &&
    role !== null &&
    "name" in role &&
    typeof role.name === "string"
      ? [role.name]
      : [],
  );
}

function countFields(fields: unknown): number {
  if (!Array.isArray(fields)) {
    return 0;
  }

  return countAnswerableFields(
    fields.flatMap((field: unknown) =>
      typeof field === "object" && field !== null
        ? [
            {
              groupId:
                "groupId" in field && typeof field.groupId === "string"
                  ? field.groupId
                  : undefined,
              type: "type" in field ? String(field.type) : "",
            },
          ]
        : [],
    ),
    () => true,
  );
}

async function getTemplateRow(
  userId: string,
  templateId: string,
  database: DbExecutor,
): Promise<TemplateRow | null> {
  return queryOne<TemplateRow>(
    database,
    `SELECT ${TEMPLATE_COLUMNS} FROM templates WHERE id = $1 AND user_id = $2`,
    [templateId, userId],
  );
}

export async function listTemplatesForUser(
  userId: string,
  database: DbExecutor = getDb(),
): Promise<TemplateListItem[]> {
  const rows = await queryMany<TemplateRow>(
    database,
    `
      SELECT ${TEMPLATE_COLUMNS}
      FROM templates
      WHERE user_id = $1
      ORDER BY created_at DESC, id ASC
    `,
    [userId],
  );

  return rows.map((row) => ({
    createdAtLabel: dateFormatter.format(new Date(row.createdAt * 1000)),
    fieldCountLabel: countLabel(countFields(row.fields), "field"),
    id: row.id,
    name: row.name,
    pageCountLabel: countLabel(row.pageCount, "page"),
    roleNames: readRoleNames(row.roles),
  }));
}

export async function getUseTemplateDataForUser(
  userId: string,
  templateId: string,
  database: DbExecutor = getDb(),
): Promise<UseTemplateData | null> {
  const row = await getTemplateRow(userId, templateId, database);

  if (!row) {
    return null;
  }

  const roles = templateRolesSchema.safeParse(row.roles);

  if (!roles.success) {
    throw new TemplateError(UNUSABLE_TEMPLATE_MESSAGE, 409);
  }

  return {
    fieldCountLabel: countLabel(countFields(row.fields), "field"),
    id: row.id,
    name: row.name,
    pageCountLabel: countLabel(row.pageCount, "page"),
    roles: roles.data,
  };
}

/**
 * Keeps an envelope's document, fields and signing order as a template.
 * Any envelope of the user's will do, sent or not: only where the fields
 * are is copied, never what was entered in them, and the signers' names
 * and addresses are left behind.
 */
export async function saveEnvelopeAsTemplate(
  userId: string,
  envelopeId: string,
  input: unknown,
  {
    database = getDb(),
    storageService = createStorageService(),
  }: TemplateOptions = {},
): Promise<SavedTemplate> {
  const parsedInput = saveTemplateSchema.parse(input);
  const envelope = await getPrepareEnvelopeDataForUser(userId, envelopeId, {
    database,
  });

  if (!envelope) {
    throw new TemplateError("Envelope not found.", 404);
  }

  const signers = [...envelope.signers].sort(
    (left, right) => left.order - right.order,
  );

  if (signers.length === 0) {
    throw new TemplateError(
      "Add at least one signer before saving this as a template.",
      400,
    );
  }

  const roleNames =
    parsedInput.roleNames ??
    signers.map((_, index) => `Signer ${String(index + 1)}`);

  if (roleNames.length !== signers.length) {
    throw new TemplateError(
      "The signers of this envelope have changed. Reload the page and try again.",
      409,
    );
  }

  const roles = templateRolesSchema.parse(
    roleNames.map((name) => ({ id: randomUUID(), name })),
  );
  const roleIdBySignerId = new Map(
    signers.map((signer, index) => [signer.id, roles[index]!.id] as const),
  );
  // Where each field is and what kind it is. Anything a signer entered
  // stays with the envelope.
  const fields = fieldPlacementListSchema.parse(
    envelope.fields.flatMap((field) => {
      const roleId = roleIdBySignerId.get(field.signerId);

      return roleId
        ? [
            {
              groupId: field.groupId,
              height: field.height,
              label: field.label,
              options: field.options,
              page: field.page,
              required: field.required,
              signerId: roleId,
              type: field.type,
              width: field.width,
              x: field.x,
              y: field.y,
            },
          ]
        : [];
    }),
  );

  // Before the document is copied, so a full account costs no upload. It is
  // counted again when the template is stored.
  await assertRoomForTemplate(userId, database);

  let document: Awaited<ReturnType<typeof getDraftEnvelopeDocumentForUser>>;

  try {
    document = await getDraftEnvelopeDocumentForUser(userId, envelopeId, {
      database,
      storageService,
    });
  } catch (error) {
    if (error instanceof EnvelopeDocumentAccessError) {
      throw new TemplateError(
        "This envelope's document is no longer available, so it cannot be saved as a template.",
        error.statusCode,
      );
    }

    throw error;
  }

  const templateId = randomUUID();
  const sourcePdfKey = buildTemplatePdfKey({ templateId, userId });
  const now = Math.floor(Date.now() / 1000);

  await storageService.putObject({
    body: document.body,
    contentType: "application/pdf",
    key: sourcePdfKey,
  });

  try {
    await withTransaction(async (tx) => {
      // Two saves at the same moment would both pass the count above. Here
      // the saves of one user take turns, and each counts what the one
      // before it stored.
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 13))", [
        userId,
      ]);
      await assertRoomForTemplate(userId, tx);
      await tx.query(
        `
          INSERT INTO templates (
            id,
            user_id,
            name,
            source_pdf_key,
            source_pdf_filename,
            source_pdf_size_bytes,
            page_count,
            roles,
            fields,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $10)
        `,
        [
          templateId,
          userId,
          parsedInput.name,
          sourcePdfKey,
          document.fileName,
          document.body.length,
          envelope.pageCount,
          JSON.stringify(roles),
          JSON.stringify(fields),
          now,
        ],
      );
    }, database);
  } catch (error) {
    // Nothing points at the copy, so nothing would ever remove it.
    await storageService.deleteObject(sourcePdfKey).catch(() => undefined);
    throw error;
  }

  return { id: templateId, name: parsedInput.name };
}

/**
 * Starts a draft envelope from a template: the template's document and
 * fields, with a person named for each role. The draft is an ordinary one
 * from then on, and changing it does not change the template.
 */
export async function createDraftFromTemplate(
  userId: string,
  templateId: string,
  input: unknown,
  {
    database = getDb(),
    storageService = createStorageService(),
  }: TemplateOptions = {},
): Promise<DraftFromTemplate> {
  const parsedInput = useTemplateSchema.parse(input);
  const template = await getTemplateRow(userId, templateId, database);

  if (!template) {
    throw new TemplateError("Template not found.", 404);
  }

  const roles = templateRolesSchema.safeParse(template.roles);
  const fields = fieldPlacementListSchema.safeParse(template.fields);

  if (!roles.success || !fields.success) {
    throw new TemplateError(UNUSABLE_TEMPLATE_MESSAGE, 409);
  }

  const roleIds = new Set(roles.data.map((role) => role.id));

  if (fields.data.some((field) => !roleIds.has(field.signerId))) {
    throw new TemplateError(UNUSABLE_TEMPLATE_MESSAGE, 409);
  }

  if (parsedInput.signers.length !== roles.data.length) {
    throw new TemplateError(
      "Name one person for each signer in this template.",
      400,
    );
  }

  let sourcePdf: Uint8Array;

  try {
    sourcePdf = (await storageService.getObject(template.sourcePdfKey)).body;
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      throw new TemplateError(UNUSABLE_TEMPLATE_MESSAGE, 409);
    }

    throw error;
  }

  const draft = await createDraftEnvelope(
    userId,
    {
      sourcePdf: {
        body: sourcePdf,
        contentType: "application/pdf",
        filename: template.sourcePdfFilename,
      },
      title: parsedInput.title,
    },
    { database, storageService },
  );
  const envelopeId = draft.envelope.id;

  try {
    const saved = await replaceDraftEnvelopeSigners(
      userId,
      envelopeId,
      { signers: parsedInput.signers },
      database,
    );
    const signerIdByOrder = new Map(
      saved.signers.map((signer) => [signer.signOrder, signer.id] as const),
    );
    const signerIdByRoleId = new Map(
      roles.data.map(
        (role, index) => [role.id, signerIdByOrder.get(index + 1)] as const,
      ),
    );

    await replaceDraftEnvelopeFields(
      userId,
      envelopeId,
      {
        fields: fields.data.map((field) => ({
          ...field,
          signerId: signerIdByRoleId.get(field.signerId),
        })),
      },
      database,
    );
  } catch (error) {
    // Half a draft is worse than none: the sender would find a document
    // with no fields on it and no sign of why.
    await deleteDraftEnvelope(userId, envelopeId, {
      database,
      storageService,
    }).catch(() => undefined);

    throw error;
  }

  return {
    envelopeId,
    // Everything is already in place, so the sender lands where they can
    // check it and send. The earlier steps are one click back.
    redirectPath: `/envelopes/${envelopeId}/review`,
  };
}

export async function deleteTemplate(
  userId: string,
  templateId: string,
  {
    database = getDb(),
    storageService = createStorageService(),
  }: TemplateOptions = {},
): Promise<void> {
  const template = await queryOne<{ sourcePdfKey: string }>(
    database,
    `
      SELECT source_pdf_key AS "sourcePdfKey"
      FROM templates
      WHERE id = $1 AND user_id = $2
    `,
    [templateId, userId],
  );

  if (!template) {
    throw new TemplateError("Template not found.", 404);
  }

  // The document goes first and the template only once it is gone. If
  // storage fails, the template is still listed, and deleting it again
  // tries again. The other way round, a failure would leave a document that
  // nothing points to, which nothing would ever remove. Envelopes made from
  // the template have their own copies of the document.
  try {
    await storageService.deleteObject(template.sourcePdfKey);
  } catch (error) {
    console.error(
      `Failed to delete the document of template ${templateId}:`,
      error,
    );

    throw new TemplateError(
      "The template's document could not be deleted, so the template was kept. Try again in a moment.",
      503,
    );
  }

  await database.query(`DELETE FROM templates WHERE id = $1 AND user_id = $2`, [
    templateId,
    userId,
  ]);
}

/* ------------------------------------------------------------------ */
/* Template studio: the library, the template page, its             */
/* pictures, renaming, and making a template from scratch. Everything    */
/* below is additive: the functions above behave as they always did.    */
/* ------------------------------------------------------------------ */

/** What each kind of field is called in a summary, singular and plural. */
const FIELD_KIND_WORDS: Record<string, readonly [string, string]> = {
  checkbox: ["checkbox", "checkboxes"],
  date: ["date", "dates"],
  dropdown: ["dropdown", "dropdowns"],
  initials: ["initials", "initials"],
  name: ["name", "names"],
  number: ["number", "numbers"],
  radio: ["choice", "choices"],
  signature: ["signature", "signatures"],
  text: ["text field", "text fields"],
};

/** The order kinds are named in: what people look for first. */
const FIELD_KIND_ORDER = [
  "signature",
  "initials",
  "date",
  "name",
  "text",
  "number",
  "checkbox",
  "dropdown",
  "radio",
];

export type TemplateFieldPreview = {
  height: number;
  page: number;
  /** Index of the role in signing order. */
  roleIndex: number;
  type: string;
  width: number;
  x: number;
  y: number;
};

export type TemplateRoleSummary = {
  fieldCount: number;
  id: string;
  name: string;
  /** "2 signatures · 1 date", or "No fields yet". */
  summary: string;
};

/** What the template page and the "use" preview need. */
export type TemplateDetail = {
  createdAt: number;
  createdAtLabel: string;
  fieldCount: number;
  fieldCountLabel: string;
  fields: TemplateFieldPreview[];
  fileName: string;
  id: string;
  name: string;
  pageCount: number;
  pageCountLabel: string;
  roles: TemplateRoleSummary[];
};

/** One template in the library grid, with numbers to sort by. */
export type TemplateLibraryItem = TemplateListItem & {
  createdAt: number;
  fieldCount: number;
  pageCount: number;
};

function readFieldPreviews(
  fields: unknown,
  roleIds: readonly string[],
): TemplateFieldPreview[] {
  if (!Array.isArray(fields)) {
    return [];
  }

  const roleIndexById = new Map(roleIds.map((id, index) => [id, index]));

  return fields.flatMap((field: unknown) => {
    if (typeof field !== "object" || field === null) {
      return [];
    }

    const record = field as Record<string, unknown>;
    const numbers = [record.x, record.y, record.width, record.height];
    const roleIndex =
      typeof record.signerId === "string"
        ? roleIndexById.get(record.signerId)
        : undefined;

    if (
      roleIndex === undefined ||
      typeof record.page !== "number" ||
      numbers.some((value) => typeof value !== "number")
    ) {
      return [];
    }

    return [
      {
        height: record.height as number,
        page: record.page,
        roleIndex,
        type: String(record.type ?? ""),
        width: record.width as number,
        x: record.x as number,
        y: record.y as number,
      },
    ];
  });
}

function readRoles(roles: unknown): { id: string; name: string }[] {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.flatMap((role: unknown) =>
    typeof role === "object" &&
    role !== null &&
    "name" in role &&
    typeof role.name === "string" &&
    "id" in role &&
    typeof role.id === "string"
      ? [{ id: role.id, name: role.name }]
      : [],
  );
}

/** "2 signatures · 1 date" for one role's fields. Radio groups count once. */
export function summarizeFieldKinds(
  fields: readonly { groupId?: string; type: string }[],
): string {
  const counts = new Map<string, number>();
  const seenGroups = new Set<string>();

  for (const field of fields) {
    if (field.type === "radio" && field.groupId) {
      if (seenGroups.has(field.groupId)) {
        continue;
      }

      seenGroups.add(field.groupId);
    }

    counts.set(field.type, (counts.get(field.type) ?? 0) + 1);
  }

  const parts = [...counts.entries()]
    .sort(
      ([left], [right]) =>
        ((FIELD_KIND_ORDER.indexOf(left) + 99) % 99) -
        ((FIELD_KIND_ORDER.indexOf(right) + 99) % 99),
    )
    .map(([type, count]) => {
      const words = FIELD_KIND_WORDS[type] ?? ["field", "fields"];

      return `${String(count)} ${count === 1 ? words[0] : words[1]}`;
    });

  return parts.length > 0 ? parts.join(" · ") : "No fields yet";
}

/** The library: every template with what the grid shows and sorts by. */
export async function listTemplateLibraryForUser(
  userId: string,
  database: DbExecutor = getDb(),
): Promise<TemplateLibraryItem[]> {
  const rows = await queryMany<TemplateRow>(
    database,
    `
      SELECT ${TEMPLATE_COLUMNS}
      FROM templates
      WHERE user_id = $1
      ORDER BY created_at DESC, id ASC
    `,
    [userId],
  );

  return rows.map((row) => {
    const fieldCount = countFields(row.fields);

    return {
      createdAt: Number(row.createdAt),
      createdAtLabel: dateFormatter.format(new Date(row.createdAt * 1000)),
      fieldCount,
      fieldCountLabel: countLabel(fieldCount, "field"),
      id: row.id,
      name: row.name,
      pageCount: row.pageCount,
      pageCountLabel: countLabel(row.pageCount, "page"),
      roleNames: readRoleNames(row.roles),
    };
  });
}

/** Everything the template page shows. Null when it is not this user's. */
export async function getTemplateDetailForUser(
  userId: string,
  templateId: string,
  database: DbExecutor = getDb(),
): Promise<TemplateDetail | null> {
  const row = await getTemplateRow(userId, templateId, database);

  if (!row) {
    return null;
  }

  const roles = readRoles(row.roles);
  const rawFields = Array.isArray(row.fields)
    ? (row.fields as unknown[]).flatMap((field) =>
        typeof field === "object" && field !== null
          ? [field as Record<string, unknown>]
          : [],
      )
    : [];
  const fieldCount = countFields(row.fields);

  return {
    createdAt: Number(row.createdAt),
    createdAtLabel: dateFormatter.format(new Date(row.createdAt * 1000)),
    fieldCount,
    fieldCountLabel: countLabel(fieldCount, "field"),
    fields: readFieldPreviews(
      row.fields,
      roles.map((role) => role.id),
    ),
    fileName: row.sourcePdfFilename,
    id: row.id,
    name: row.name,
    pageCount: row.pageCount,
    pageCountLabel: countLabel(row.pageCount, "page"),
    roles: roles.map((role) => {
      const own = rawFields
        .filter((field) => field.signerId === role.id)
        .map((field) => ({
          groupId:
            typeof field.groupId === "string" ? field.groupId : undefined,
          type: String(field.type ?? ""),
        }));

      return {
        fieldCount: countAnswerableFields(own, () => true),
        id: role.id,
        name: role.name,
        summary: summarizeFieldKinds(own),
      };
    }),
  };
}

/** Renames a template. The name follows the same rules as when saved. */
export async function renameTemplate(
  userId: string,
  templateId: string,
  input: unknown,
  database: DbExecutor = getDb(),
): Promise<SavedTemplate> {
  const { name } = saveTemplateSchema.pick({ name: true }).parse(input);
  const result = await database.query(
    `
      UPDATE templates
      SET name = $3, updated_at = $4
      WHERE id = $1 AND user_id = $2
    `,
    [templateId, userId, name, Math.floor(Date.now() / 1000)],
  );

  if (result.rowCount !== 1) {
    throw new TemplateError("Template not found.", 404);
  }

  return { id: templateId, name };
}

export type TemplateDocument = {
  body: Uint8Array;
  contentLength: number;
  fileName: string;
};

/** The template's PDF, for its owner only. */
export async function getTemplateDocumentForUser(
  userId: string,
  templateId: string,
  {
    database = getDb(),
    storageService = createStorageService(),
  }: TemplateOptions = {},
): Promise<TemplateDocument> {
  const template = await getTemplateRow(userId, templateId, database);

  if (!template) {
    throw new TemplateError("Template not found.", 404);
  }

  try {
    const object = await storageService.getObject(template.sourcePdfKey);

    return {
      body: object.body,
      contentLength: object.contentLength ?? object.body.length,
      fileName: template.sourcePdfFilename,
    };
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      throw new TemplateError("This template's document is unavailable.", 404);
    }

    throw error;
  }
}

/**
 * Where a template's first-page picture lives: beside its document, so
 * whatever removes the template's folder finds it without a column.
 */
export function buildTemplateThumbnailKey(input: {
  sourcePdfKey: string;
  templateId: string;
  userId: string;
}): string {
  const normalized = input.sourcePdfKey.trim().replaceAll("\\", "/");
  const folder = normalized.includes("/")
    ? normalized.slice(0, normalized.lastIndexOf("/"))
    : "";
  const folderName = folder.slice(folder.lastIndexOf("/") + 1);

  if (folder && folderName === input.templateId) {
    return `${folder}/thumbnail.jpg`;
  }

  return buildTemplatePdfKey({
    templateId: input.templateId,
    userId: input.userId,
  }).replace(/original\.pdf$/, "thumbnail.jpg");
}

/** The ETag a browser quotes back for a template's picture. */
export function buildTemplateThumbnailEtag(templateId: string): string {
  return buildThumbnailEtag(`template-${templateId}`);
}

export type TemplateThumbnail =
  | { etag: string; isNotModified: true }
  | { etag: string; isNotModified: false; picture: StorageObjectStream };

/** Streams the stored first-page picture, or 404 when there is none yet. */
export async function getTemplateThumbnailForUser(
  userId: string,
  templateId: string,
  {
    database = getDb(),
    ifNoneMatch,
    storageService = createStorageService(),
  }: TemplateOptions & { ifNoneMatch?: string | null } = {},
): Promise<TemplateThumbnail> {
  const template = await getTemplateRow(userId, templateId, database);

  if (!template) {
    throw new TemplateError("Template not found.", 404);
  }

  const etag = buildTemplateThumbnailEtag(template.id);

  if (matchesEtag(ifNoneMatch, etag)) {
    return { etag, isNotModified: true };
  }

  try {
    const picture = await storageService.getObjectStream(
      buildTemplateThumbnailKey({
        sourcePdfKey: template.sourcePdfKey,
        templateId: template.id,
        userId,
      }),
    );

    return { etag, isNotModified: false, picture };
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      throw new TemplateError("This template has no picture yet.", 404);
    }

    throw error;
  }
}

/**
 * Keeps the picture of the first page that the owner's browser drew. The
 * bytes are checked as for envelopes (services/thumbnails.ts), and the
 * first picture stays: the document never changes.
 */
export async function saveTemplateThumbnailForUser(
  userId: string,
  templateId: string,
  body: Uint8Array,
  {
    database = getDb(),
    storageService = createStorageService(),
  }: TemplateOptions = {},
): Promise<void> {
  assertThumbnailImage(body);

  const template = await getTemplateRow(userId, templateId, database);

  if (!template) {
    throw new TemplateError("Template not found.", 404);
  }

  const key = buildTemplateThumbnailKey({
    sourcePdfKey: template.sourcePdfKey,
    templateId: template.id,
    userId,
  });

  await storageService.putObject({
    body,
    contentType: THUMBNAIL_CONTENT_TYPE,
    keepExisting: true,
    key,
  });

  // Deleted while the picture was written: nothing would remove it later.
  if (!(await getTemplateRow(userId, templateId, database))) {
    await storageService.deleteObject(key).catch(() => undefined);

    throw new TemplateError("Template not found.", 404);
  }
}

/** Removes a deleted template's picture, if it had one. Never throws. */
export async function deleteTemplateThumbnail(
  input: { sourcePdfKey: string; templateId: string; userId: string },
  storageService: StorageService = createStorageService(),
): Promise<void> {
  await storageService
    .deleteObject(buildTemplateThumbnailKey(input))
    .catch(() => undefined);
}

/**
 * Deletes a template and its picture. `deleteTemplate` keeps its old
 * behaviour; this adds the picture, best effort, once the template is gone.
 */
export async function deleteTemplateWithThumbnail(
  userId: string,
  templateId: string,
  {
    database = getDb(),
    storageService = createStorageService(),
  }: TemplateOptions = {},
): Promise<void> {
  const template = await queryOne<{ sourcePdfKey: string }>(
    database,
    `SELECT source_pdf_key AS "sourcePdfKey" FROM templates WHERE id = $1 AND user_id = $2`,
    [templateId, userId],
  );

  await deleteTemplate(userId, templateId, { database, storageService });

  if (template) {
    await deleteTemplateThumbnail(
      { sourcePdfKey: template.sourcePdfKey, templateId, userId },
      storageService,
    );
  }
}

/* Making a template from scratch --------------------------------------- */

// A template from scratch borrows the envelope machinery: the PDF becomes a
// scratch draft whose signers stand in for the roles, the ordinary builder
// places the fields, and saveEnvelopeAsTemplate keeps the result. The
// stand-ins have addresses no mail can reach, so a scratch draft is easy
// to recognise and can never be sent to anyone by mistake.

const SCRATCH_EMAIL_DOMAIN = "template-role.invalid";

export function buildRoleStandInEmail(index: number): string {
  return `role-${String(index + 1)}@${SCRATCH_EMAIL_DOMAIN}`;
}

export function isRoleStandInEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${SCRATCH_EMAIL_DOMAIN}`);
}

const scratchRoleNamesSchema = saveTemplateSchema.shape.roleNames.unwrap();

/**
 * Turns a fresh draft into a template's scratch draft: one stand-in signer
 * per role, named after the role, in signing order.
 */
export async function startTemplateDraft(
  userId: string,
  envelopeId: string,
  input: unknown,
  database: DbPool = getDb(),
): Promise<{ envelopeId: string; roleNames: string[] }> {
  const roleNames = scratchRoleNamesSchema.parse(
    typeof input === "object" && input !== null && "roleNames" in input
      ? input.roleNames
      : undefined,
  );
  const seen = new Set<string>();

  for (const name of roleNames) {
    const key = name.trim().toLowerCase();

    if (seen.has(key)) {
      throw new TemplateError(
        "Give each signer in the template a different name.",
        400,
      );
    }

    seen.add(key);
  }

  const envelope = await getPrepareEnvelopeDataForUser(userId, envelopeId, {
    database,
  });

  if (!envelope) {
    throw new TemplateError("Envelope not found.", 404);
  }

  if (envelope.status !== "draft") {
    throw new TemplateError("Only a draft can become a template.", 409);
  }

  if (
    envelope.signers.some((signer) => !isRoleStandInEmail(signer.email)) &&
    envelope.signers.length > 0
  ) {
    throw new TemplateError(
      "This draft already has signers, so it cannot be used for a new template.",
      409,
    );
  }

  await replaceDraftEnvelopeSigners(
    userId,
    envelopeId,
    {
      signers: roleNames.map((name, index) => ({
        email: buildRoleStandInEmail(index),
        name: name.trim(),
        signOrder: index + 1,
      })),
    },
    database,
  );

  return { envelopeId, roleNames: roleNames.map((name) => name.trim()) };
}

export type TemplateDraftSummary = {
  envelopeId: string;
  fieldCount: number;
  /** Where the fields are, by role, for the preview. */
  fields: TemplateFieldPreview[];
  pageCount: number;
  roles: TemplateRoleSummary[];
  title: string;
};

/** A scratch draft as the "save template" step shows it, or null. */
export async function getTemplateDraftForUser(
  userId: string,
  envelopeId: string,
  database: DbPool = getDb(),
): Promise<TemplateDraftSummary | null> {
  const envelope = await getPrepareEnvelopeDataForUser(userId, envelopeId, {
    database,
  });

  if (
    !envelope ||
    envelope.status !== "draft" ||
    envelope.signers.length === 0 ||
    envelope.signers.some((signer) => !isRoleStandInEmail(signer.email))
  ) {
    return null;
  }

  const signers = [...envelope.signers].sort(
    (left, right) => left.order - right.order,
  );
  const roleIndexBySignerId = new Map(
    signers.map((signer, index) => [signer.id, index] as const),
  );

  return {
    envelopeId,
    fields: envelope.fields.flatMap((field) => {
      const roleIndex = roleIndexBySignerId.get(field.signerId);

      return roleIndex === undefined
        ? []
        : [
            {
              height: field.height,
              page: field.page,
              roleIndex,
              type: field.type,
              width: field.width,
              x: field.x,
              y: field.y,
            },
          ];
    }),
    fieldCount: countAnswerableFields(
      envelope.fields.map((field) => ({
        groupId: field.groupId ?? undefined,
        type: field.type,
      })),
      () => true,
    ),
    pageCount: envelope.pageCount,
    roles: signers.map((signer) => {
      const own = envelope.fields
        .filter((field) => field.signerId === signer.id)
        .map((field) => ({
          groupId: field.groupId ?? undefined,
          type: field.type,
        }));

      return {
        fieldCount: countAnswerableFields(own, () => true),
        id: signer.id,
        name: signer.name,
        summary: summarizeFieldKinds(own),
      };
    }),
    title: envelope.title,
  };
}

/**
 * Keeps a scratch draft as a template, named by the person, with its
 * stand-ins' names as the roles, then removes the scratch draft.
 */
export async function saveTemplateFromDraft(
  userId: string,
  envelopeId: string,
  input: unknown,
  {
    database = getDb(),
    storageService = createStorageService(),
  }: TemplateOptions = {},
): Promise<SavedTemplate> {
  const { name } = saveTemplateSchema.pick({ name: true }).parse(input);
  const draft = await getTemplateDraftForUser(userId, envelopeId, database);

  if (!draft) {
    throw new TemplateError("This template draft is no longer here.", 404);
  }

  if (draft.fieldCount === 0) {
    throw new TemplateError(
      "Place at least one field before saving the template.",
      400,
    );
  }

  const saved = await saveEnvelopeAsTemplate(
    userId,
    envelopeId,
    { name, roleNames: draft.roles.map((role) => role.name) },
    { database, storageService },
  );

  // The template has its own copy of the document now.
  await deleteDraftEnvelope(userId, envelopeId, {
    database,
    storageService,
  }).catch((error) => {
    console.error(
      `Failed to remove the scratch draft ${envelopeId} after saving a template:`,
      error,
    );
  });

  return saved;
}

/** Throws away a scratch draft the person no longer wants. */
export async function discardTemplateDraft(
  userId: string,
  envelopeId: string,
  {
    database = getDb(),
    storageService = createStorageService(),
  }: TemplateOptions = {},
): Promise<void> {
  const draft = await getTemplateDraftForUser(userId, envelopeId, database);

  if (!draft) {
    throw new TemplateError("This template draft is no longer here.", 404);
  }

  await deleteDraftEnvelope(userId, envelopeId, { database, storageService });
}

/**
 * Remembers, for one browser, which draft is a template being made, so the
 * workspace can bring the person back to "Save template" when the builder
 * finishes. Holds only an envelope id the server checks again before use.
 */
export const TEMPLATE_DRAFT_COOKIE = "signudoc_template_draft";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** The cookie's value when it is a plausible id, otherwise null. */
export function readTemplateDraftCookie(
  value: string | undefined | null,
): string | null {
  return value && ID_PATTERN.test(value) ? value : null;
}
