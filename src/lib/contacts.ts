import { type ContactStatusMix } from "./contact-words.ts";
import { type DbExecutor, getDb, queryMany } from "./db/connection.ts";

export {
  describeAgo,
  describeContactActivity,
  describeStatusMix,
  type ContactStatusMix,
} from "./contact-words.ts";

// The sender's address book: everyone they have put on one of their own
// envelopes, as a signer or as a copy recipient. Nothing is stored for it.
// It is read from the envelopes this account owns, so it is always as
// current as the documents themselves, and someone disappears from it when
// the last envelope that named them is deleted.
//
// The same person can be named on many envelopes, spelled differently. One
// address is one contact (whatever its case), and the name is the one used
// most recently.

/** Contacts listed at most, newest first. */
export const MAX_LISTED_CONTACTS = 500;
/** Recent documents kept per contact, for the contact's tray. */
export const MAX_CONTACT_DOCUMENTS = 8;
const MAX_SEARCH_LENGTH = 100;

/**
 * Stand-in signers of a template being made from scratch are not people
 * (see startTemplateDraft in templates.ts), so they are never contacts.
 */
const ROLE_STAND_IN_DOMAIN = "template-role.invalid";

export type ContactDocumentStatus =
  "completed" | "declined" | "draft" | "expired" | "sent" | "voided";

export type ContactDocument = {
  id: string;
  /** Signed for, or only sent a copy. */
  role: "cc" | "signer";
  /** When it was sent, or created for a draft (unix seconds). */
  sentAt: number | null;
  createdAt: number;
  status: ContactDocumentStatus;
  title: string;
};

export type Contact = {
  documentCount: number;
  email: string;
  /** The last envelope that named them, sent or not (unix seconds). */
  lastActivityAt: number;
  /** The last envelope that named them and was sent (unix seconds). */
  lastSentAt: number | null;
  name: string;
  statusMix: ContactStatusMix;
};

export type ContactWithDocuments = Contact & {
  documents: readonly ContactDocument[];
};

/** Lowercased, trimmed and cut to a sensible length. Empty matches everyone. */
export function normalizeContactSearch(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().slice(0, MAX_SEARCH_LENGTH)
    : "";
}

/** A requested list length, kept between 1 and MAX_LISTED_CONTACTS. */
export function normalizeContactLimit(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value.trim())
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return MAX_LISTED_CONTACTS;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LISTED_CONTACTS);
}

type ContactRow = {
  completed: number;
  declined: number;
  documentCount: number;
  draft: number;
  email: string;
  ended: number;
  lastActivityAt: number;
  lastSentAt: number | null;
  name: string;
  waiting: number;
};

type ContactDocumentRow = {
  createdAt: number;
  emailKey: string;
  expiresAt: number | null;
  id: string;
  role: string;
  sentAt: number | null;
  status: string;
  title: string;
};

function mapContact(row: ContactRow): Contact {
  return {
    documentCount: row.documentCount,
    email: row.email,
    lastActivityAt: row.lastActivityAt,
    lastSentAt: row.lastSentAt ?? null,
    name: row.name.trim() || row.email,
    statusMix: {
      completed: row.completed,
      declined: row.declined,
      draft: row.draft,
      ended: row.ended,
      waiting: row.waiting,
    },
  };
}

export function toContactDocumentStatus(
  status: string,
  expiresAt: number | null,
  now: number,
): ContactDocumentStatus {
  switch (status) {
    case "completed":
    case "declined":
    case "draft":
    case "voided":
      return status;
    default:
      return typeof expiresAt === "number" && expiresAt <= now
        ? "expired"
        : "sent";
  }
}

/**
 * The contacts of one sender, the most recently involved first. Only the
 * envelopes `userId` owns are read: the address book never shows who
 * someone else sends to.
 */
export async function listContactsForUser(
  userId: string,
  {
    limit = MAX_LISTED_CONTACTS,
    now = Math.floor(Date.now() / 1000),
    search = "",
  }: { limit?: number; now?: number; search?: string } = {},
  database: DbExecutor = getDb(),
): Promise<Contact[]> {
  const needle = normalizeContactSearch(search);
  const rows = await queryMany<ContactRow>(
    database,
    `
      WITH named AS (
        SELECT
          lower(s.email) AS email_key,
          s.email,
          s.name,
          e.id AS envelope_id,
          e.status AS envelope_status,
          e.expires_at,
          e.sent_at,
          coalesce(e.sent_at, e.created_at) AS touched_at
        FROM signers s
        JOIN envelopes e ON e.id = s.envelope_id
        WHERE e.user_id = $1
          AND lower(s.email) NOT LIKE $4
      ),
      matching AS (
        SELECT DISTINCT email_key
        FROM named
        WHERE $2::text = ''
          OR position($2::text in lower(name)) > 0
          OR position($2::text in email_key) > 0
      )
      SELECT
        (array_agg(n.email ORDER BY n.touched_at DESC, n.envelope_id))[1]
          AS email,
        (array_agg(n.name ORDER BY n.touched_at DESC, n.envelope_id))[1]
          AS name,
        count(*)::int AS "documentCount",
        max(n.sent_at) AS "lastSentAt",
        max(n.touched_at) AS "lastActivityAt",
        count(*) FILTER (WHERE n.envelope_status = 'completed')::int
          AS completed,
        count(*) FILTER (WHERE n.envelope_status = 'declined')::int
          AS declined,
        count(*) FILTER (WHERE n.envelope_status = 'draft')::int AS draft,
        count(*) FILTER (
          WHERE n.envelope_status = 'voided'
            OR (n.envelope_status = 'sent' AND n.expires_at <= $5)
        )::int AS ended,
        count(*) FILTER (
          WHERE n.envelope_status = 'sent'
            AND (n.expires_at IS NULL OR n.expires_at > $5)
        )::int AS waiting
      FROM named n
      JOIN matching m ON m.email_key = n.email_key
      GROUP BY n.email_key
      ORDER BY max(n.touched_at) DESC, n.email_key ASC
      LIMIT $3
    `,
    [
      userId,
      needle,
      normalizeContactLimit(limit),
      `%@${ROLE_STAND_IN_DOMAIN}`,
      now,
    ],
  );

  return rows.map(mapContact);
}

/**
 * The most recent documents of each of the given contacts, from the
 * envelopes `userId` owns, keyed by lowercased address.
 */
export async function listContactDocumentsForUser(
  userId: string,
  emails: readonly string[],
  {
    now = Math.floor(Date.now() / 1000),
    perContact = MAX_CONTACT_DOCUMENTS,
  }: { now?: number; perContact?: number } = {},
  database: DbExecutor = getDb(),
): Promise<Map<string, ContactDocument[]>> {
  const keys = [...new Set(emails.map((email) => email.toLowerCase()))];
  const documents = new Map<string, ContactDocument[]>();

  if (keys.length === 0) {
    return documents;
  }

  const rows = await queryMany<ContactDocumentRow>(
    database,
    `
      SELECT
        "emailKey", id, title, status, role,
        "sentAt", "createdAt", "expiresAt"
      FROM (
        SELECT
          lower(s.email) AS "emailKey",
          e.id,
          e.title,
          e.status,
          s.role,
          e.sent_at AS "sentAt",
          e.created_at AS "createdAt",
          e.expires_at AS "expiresAt",
          row_number() OVER (
            PARTITION BY lower(s.email)
            ORDER BY coalesce(e.sent_at, e.created_at) DESC, e.id ASC
          ) AS position
        FROM signers s
        JOIN envelopes e ON e.id = s.envelope_id
        WHERE e.user_id = $1
          AND lower(s.email) = ANY($2::text[])
      ) recent
      WHERE position <= $3
      ORDER BY "emailKey" ASC, position ASC
    `,
    [userId, keys, Math.max(1, Math.trunc(perContact))],
  );

  for (const row of rows) {
    const list = documents.get(row.emailKey) ?? [];

    list.push({
      createdAt: row.createdAt,
      id: row.id,
      role: row.role === "cc" ? "cc" : "signer",
      sentAt: row.sentAt ?? null,
      status: toContactDocumentStatus(row.status, row.expiresAt, now),
      title: row.title,
    });
    documents.set(row.emailKey, list);
  }

  return documents;
}

/** Contacts with their recent documents, for the Contacts page. */
export async function listContactBookForUser(
  userId: string,
  options: { now?: number; search?: string } = {},
  database: DbExecutor = getDb(),
): Promise<ContactWithDocuments[]> {
  const contacts = await listContactsForUser(userId, options, database);
  const documents = await listContactDocumentsForUser(
    userId,
    contacts.map((contact) => contact.email),
    options,
    database,
  );

  return contacts.map((contact) => ({
    ...contact,
    documents: documents.get(contact.email.toLowerCase()) ?? [],
  }));
}
