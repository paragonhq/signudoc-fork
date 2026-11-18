import { type DbExecutor, getDb, queryOne } from "./db/connection.ts";

// Whose envelope a signed-in account is looking at. Its sender sees it, as
// before; an administrator sees every envelope in the install, to read,
// download and, once it is finished, delete. Everything else that changes
// an envelope (sending, voiding, reminders, editing) stays with its sender.

export type EnvelopeViewerAccess = {
  ownerEmail: string;
  ownerName: string | null;
  ownerUserId: string;
  /** False when an administrator is looking at someone else's envelope. */
  viewerIsOwner: boolean;
};

type AccessRow = {
  ownerEmail: string;
  ownerName: string | null;
  ownerUserId: string;
  viewerRole: string | null;
};

/**
 * The envelope's sender, when `viewerUserId` may see it: as its sender, or
 * as an administrator. Null when the envelope does not exist or is not
 * theirs to see, which callers report as "not found".
 */
export async function resolveEnvelopeViewerAccess(
  viewerUserId: string,
  envelopeId: string,
  database: DbExecutor = getDb(),
): Promise<EnvelopeViewerAccess | null> {
  const row = await queryOne<AccessRow>(
    database,
    `
      SELECT
        e.user_id AS "ownerUserId",
        owner.email AS "ownerEmail",
        owner.name AS "ownerName",
        (SELECT role FROM public."user" WHERE id = $2) AS "viewerRole"
      FROM envelopes e
      JOIN public."user" owner ON owner.id = e.user_id
      WHERE e.id = $1
    `,
    [envelopeId, viewerUserId],
  );

  if (!row) {
    return null;
  }

  const viewerIsOwner = row.ownerUserId === viewerUserId;

  if (!viewerIsOwner && row.viewerRole !== "admin") {
    return null;
  }

  return {
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    ownerUserId: row.ownerUserId,
    viewerIsOwner,
  };
}

/** How an administrator sees who sent an envelope. */
export function formatEnvelopeOwner(
  access: Pick<EnvelopeViewerAccess, "ownerEmail" | "ownerName">,
): string {
  const name = access.ownerName?.trim();

  return name ? `${name} (${access.ownerEmail})` : access.ownerEmail;
}
