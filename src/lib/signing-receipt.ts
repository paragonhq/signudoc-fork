import {
  type DbExecutor,
  getDb,
  queryMany,
  queryOne,
} from "./db/connection.ts";
import { hashOpaqueToken } from "./services/opaque-tokens.ts";

/*
 * What the done page can say about who signs next. The signing link stops
 * naming the signer the moment they sign, so this is read while the link
 * still works: the signing page loads it next to the payload (which has
 * already passed the link's checks) and the browser keeps it for the done
 * page. Only a first name, and only for an envelope that is still out.
 */

export type SigningRouteAhead = {
  /** This signer is the last one: their signature completes it. */
  isLastSigner: boolean;
  /** Who signs after them, by first name. */
  nextSignerName: string | null;
};

type RouteSignerRow = {
  envelopeId: string;
  id: string;
  name: string;
  signOrder: number;
  status: string;
};

/** "Riley Recipient" → "Riley"; an address → the part before the @. */
export function firstNameOf(name: string): string {
  const trimmed = name.trim();
  const local = trimmed.includes("@") ? (trimmed.split("@")[0] ?? "") : trimmed;
  const first = local.split(/\s+/)[0] ?? "";

  return first.length > 0 ? first : trimmed;
}

/** The first signer, in signing order, who has not signed yet. */
export function pickNextSigner<
  T extends { id: string; signOrder: number; status: string },
>(signers: readonly T[], currentSignerId: string): T | null {
  return (
    [...signers]
      .sort((a, b) => a.signOrder - b.signOrder)
      .find(
        (signer) =>
          signer.id !== currentSignerId &&
          (signer.status === "pending" || signer.status === "notified"),
      ) ?? null
  );
}

/**
 * Who signs after the holder of this signing link, or null when the link
 * does not name a signer whose turn it is.
 */
export async function getSigningRouteAhead(
  token: string,
  { database = getDb() }: { database?: DbExecutor } = {},
): Promise<SigningRouteAhead | null> {
  const signer = await queryOne<RouteSignerRow>(
    database,
    `
      SELECT
        s.id,
        s.envelope_id AS "envelopeId",
        s.name,
        s.sign_order AS "signOrder",
        s.status
      FROM signers s
      JOIN envelopes e ON e.id = s.envelope_id
      WHERE s.signing_token_hash = $1
        AND s.role = 'signer'
        AND s.status = 'notified'
        AND e.status = 'sent'
      LIMIT 1
    `,
    [hashOpaqueToken(token)],
  );

  if (!signer) {
    return null;
  }

  const signers = await queryMany<RouteSignerRow>(
    database,
    `
      SELECT
        id,
        envelope_id AS "envelopeId",
        name,
        sign_order AS "signOrder",
        status
      FROM signers
      WHERE envelope_id = $1
        AND role = 'signer'
    `,
    [signer.envelopeId],
  );
  const next = pickNextSigner(signers, signer.id);

  return {
    isLastSigner: next === null,
    nextSignerName: next ? firstNameOf(next.name) : null,
  };
}
