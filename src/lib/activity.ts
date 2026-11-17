import {
  type DbExecutor,
  getDb,
  queryMany,
  queryOne,
} from "./db/connection.ts";
import type { AuditEventType, EnvelopeStatus } from "./types/domain.ts";

/*
 * Activity: what happened across one sender's envelopes, newest first, and
 * the small aggregate the Documents overview reads. Both are scoped to the
 * envelopes the caller owns (envelopes.user_id), never the organization.
 *
 * Only the events a sender cares about in a feed are listed (sent, viewed,
 * signed, declined, completed, voided, expired, reminders). The rest of the
 * audit trail (consent, identity checks, email delivery, copies) stays on
 * each envelope's own page. IP addresses and user agents never leave here.
 */

export const ACTIVITY_FILTERS = [
  "all",
  "signed",
  "viewed",
  "sent",
  "completed",
  "declined",
] as const;

export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export type ActivityKind =
  | "completed"
  | "declined"
  | "expired"
  | "reminded"
  | "sent"
  | "signed"
  | "viewed"
  | "voided";

const FEED_EVENTS = [
  "sent",
  "viewed",
  "signed",
  "declined",
  "completed",
  "voided",
  "expired",
  "reminded_manual",
  "reminded_auto",
] as const satisfies readonly AuditEventType[];

type FeedEvent = (typeof FEED_EVENTS)[number];

const EVENTS_FOR_FILTER: Record<ActivityFilter, readonly FeedEvent[]> = {
  all: FEED_EVENTS,
  completed: ["completed"],
  declined: ["declined"],
  sent: ["sent"],
  signed: ["signed"],
  viewed: ["viewed"],
};

const KIND_FOR_EVENT: Record<FeedEvent, ActivityKind> = {
  completed: "completed",
  declined: "declined",
  expired: "expired",
  reminded_auto: "reminded",
  reminded_manual: "reminded",
  sent: "sent",
  signed: "signed",
  viewed: "viewed",
  voided: "voided",
};

export type ActivityItem = {
  /** Who did it, or who it was for (sent, reminded): a name when known. */
  actorEmail: string | null;
  actorName: string | null;
  /** Seconds since the epoch. */
  at: number;
  /** An automatic reminder (as opposed to one the sender sent). */
  automatic: boolean;
  envelopeId: string;
  envelopeStatus: EnvelopeStatus;
  envelopeTitle: string;
  id: string;
  kind: ActivityKind;
  /** Why it was declined or voided, when someone said. */
  reason: string | null;
};

export type ActivityPage = {
  items: ActivityItem[];
  /** Pass back as `cursor` for the next, older page; null at the end. */
  nextCursor: string | null;
};

export const ACTIVITY_PAGE_SIZE = 30;
export const ACTIVITY_MAX_PAGE_SIZE = 60;
const REASON_MAX = 280;

export type ActivityCursor = { at: number; id: string };

const CURSOR_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function encodeActivityCursor(cursor: ActivityCursor): string {
  return `${String(cursor.at)}.${cursor.id}`;
}

export function decodeActivityCursor(value: string): ActivityCursor | null {
  const dot = value.indexOf(".");

  if (dot <= 0) {
    return null;
  }

  const atText = value.slice(0, dot);
  const id = value.slice(dot + 1);

  if (!/^\d{1,12}$/.test(atText) || !CURSOR_ID.test(id)) {
    return null;
  }

  return { at: Number(atText), id };
}

export type ActivityQuery = {
  cursor: ActivityCursor | null;
  filter: ActivityFilter;
  limit: number;
  /** Only events after this moment (seconds): for "anything new?". */
  since: number | null;
};

/**
 * Reads ?filter=, ?cursor=, ?since= and ?limit= strictly: anything that is
 * not exactly one of the known shapes is refused rather than guessed at.
 */
export function parseActivityQuery(
  params: URLSearchParams,
): { error: string; ok: false } | { ok: true; query: ActivityQuery } {
  const filterText = params.get("filter") ?? "all";

  if (!(ACTIVITY_FILTERS as readonly string[]).includes(filterText)) {
    return { error: "Unknown activity filter.", ok: false };
  }

  const cursorText = params.get("cursor");
  const cursor = cursorText ? decodeActivityCursor(cursorText) : null;

  if (cursorText && !cursor) {
    return { error: "Invalid activity cursor.", ok: false };
  }

  const sinceText = params.get("since");
  let since: number | null = null;

  if (sinceText !== null) {
    if (!/^\d{1,12}$/.test(sinceText)) {
      return { error: "Invalid activity time.", ok: false };
    }

    since = Number(sinceText);
  }

  if (cursor && since !== null) {
    return { error: "Use either cursor or since, not both.", ok: false };
  }

  const limitText = params.get("limit");
  let limit = ACTIVITY_PAGE_SIZE;

  if (limitText !== null) {
    if (!/^\d{1,3}$/.test(limitText)) {
      return { error: "Invalid activity page size.", ok: false };
    }

    limit = Math.min(Math.max(Number(limitText), 1), ACTIVITY_MAX_PAGE_SIZE);
  }

  return {
    ok: true,
    query: { cursor, filter: filterText as ActivityFilter, limit, since },
  };
}

export type ActivityRow = {
  actorEmail: string | null;
  actorType: string;
  createdAt: number;
  envelopeId: string;
  envelopeStatus: EnvelopeStatus;
  envelopeTitle: string;
  event: string;
  id: string;
  reason: string | null;
  signerEmail: string | null;
  signerName: string | null;
};

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

/** One audit row as the feed shows it; null for events the feed skips. */
export function toActivityItem(row: ActivityRow): ActivityItem | null {
  if (!(FEED_EVENTS as readonly string[]).includes(row.event)) {
    return null;
  }

  const event = row.event as FeedEvent;
  const kind = KIND_FOR_EVENT[event];
  // The sender is the actor of "sent" and of a manual reminder; the feed
  // names the person it went to. A signer's own events name the signer.
  const signerEmail =
    cleanText(row.signerEmail) ??
    (row.actorType === "signer" ? cleanText(row.actorEmail) : null);
  const hasPerson =
    kind === "sent" ||
    kind === "viewed" ||
    kind === "signed" ||
    kind === "declined" ||
    kind === "reminded";
  const reason =
    kind === "declined" || kind === "voided" ? cleanText(row.reason) : null;

  return {
    actorEmail: hasPerson ? signerEmail : null,
    actorName: hasPerson ? cleanText(row.signerName) : null,
    at: row.createdAt,
    automatic: event === "reminded_auto",
    envelopeId: row.envelopeId,
    envelopeStatus: row.envelopeStatus,
    envelopeTitle: row.envelopeTitle,
    id: row.id,
    kind,
    reason:
      reason && reason.length > REASON_MAX
        ? `${reason.slice(0, REASON_MAX - 1)}…`
        : reason,
  };
}

/**
 * The caller's activity, newest first. Ownership is the join: an event is
 * listed only when its envelope's user_id is the caller.
 */
export async function listActivityForUser(
  userId: string,
  query: Partial<ActivityQuery> = {},
  database: DbExecutor = getDb(),
): Promise<ActivityPage> {
  const filter = query.filter ?? "all";
  const limit = Math.min(
    Math.max(query.limit ?? ACTIVITY_PAGE_SIZE, 1),
    ACTIVITY_MAX_PAGE_SIZE,
  );
  const values: unknown[] = [userId, [...EVENTS_FOR_FILTER[filter]]];
  const clauses = ["e.user_id = $1", "a.event = any($2::text[])"];

  if (query.cursor) {
    values.push(query.cursor.at, query.cursor.id);
    clauses.push(
      `(a.created_at, a.id) < ($${String(values.length - 1)}::bigint, $${String(values.length)}::text)`,
    );
  }

  if (typeof query.since === "number") {
    values.push(query.since);
    clauses.push(`a.created_at > $${String(values.length)}::bigint`);
  }

  values.push(limit + 1);

  const rows = await queryMany<ActivityRow>(
    database,
    `
      SELECT
        a.id,
        a.envelope_id AS "envelopeId",
        e.title AS "envelopeTitle",
        e.status AS "envelopeStatus",
        a.event,
        a.actor_type AS "actorType",
        a.actor_email AS "actorEmail",
        a.metadata->>'signerName' AS "signerName",
        a.metadata->>'signerEmail' AS "signerEmail",
        a.metadata->>'reason' AS "reason",
        a.created_at AS "createdAt"
      FROM audit_events a
      JOIN envelopes e ON e.id = a.envelope_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $${String(values.length)}
    `,
    values,
  );

  const page = rows.slice(0, limit);
  const last = page.at(-1);

  return {
    items: page
      .map(toActivityItem)
      .filter((item): item is ActivityItem => item !== null),
    nextCursor:
      rows.length > limit && last
        ? encodeActivityCursor({ at: last.createdAt, id: last.id })
        : null,
  };
}

/* ------------------------------------------------------------------------ */
/* The Documents overview                                                   */
/* ------------------------------------------------------------------------ */

/** Stand-in signers of a template being made (see lib/templates.ts). */
const TEMPLATE_ROLE_EMAIL_PATTERN = "%@template-role.invalid";
const WEEK = 7 * 24 * 60 * 60;
export const OVERVIEW_WEEKS = 8;

export type DocumentsOverview = {
  /** Completed per week, oldest first; the last is the week to now. */
  completedByWeek: number[];
  completedThisMonth: number;
  completedTotal: number;
  /** Drafts to finish (templates being made are counted apart). */
  drafts: number;
  /** Out for signature and past the deadline. */
  expired: number;
  /** When the longest-waiting envelope went out (seconds), if any. */
  oldestWaitingSince: number | null;
  /** Across everything waiting: signatures in, of those needed. */
  signaturesIn: number;
  signaturesNeeded: number;
  templateDrafts: number;
  waiting: number;
};

/** The first moment of the month `now` falls in, UTC, in seconds. */
export function startOfMonthUtc(nowSeconds: number) {
  const date = new Date(nowSeconds * 1000);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000;
}

/** Counts per week bucket (0 = the last 7 days) into an oldest-first list. */
export function weeklySeries(
  buckets: readonly { count: number; week: number }[],
  weeks = OVERVIEW_WEEKS,
) {
  const series = Array.from({ length: weeks }, () => 0);

  for (const { count, week } of buckets) {
    if (week >= 0 && week < weeks) {
      series[weeks - 1 - week] = (series[weeks - 1 - week] ?? 0) + count;
    }
  }

  return series;
}

export async function getDocumentsOverview(
  userId: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  database: DbExecutor = getDb(),
): Promise<DocumentsOverview> {
  const monthStart = startOfMonthUtc(nowSeconds);

  const [counts, weeks, signatures] = await Promise.all([
    queryOne<{
      completedThisMonth: number;
      completedTotal: number;
      drafts: number;
      expired: number;
      oldestWaitingSince: number | null;
      templateDrafts: number;
      waiting: number;
    }>(
      database,
      `
        WITH mine AS (
          SELECT
            e.id,
            e.status,
            e.sent_at,
            e.completed_at,
            e.expires_at,
            (
              e.status = 'draft'
              AND EXISTS (
                SELECT 1 FROM signers s WHERE s.envelope_id = e.id
              )
              AND NOT EXISTS (
                SELECT 1
                FROM signers s
                WHERE s.envelope_id = e.id
                  AND lower(s.email) NOT LIKE $4
              )
            ) AS is_template_draft
          FROM envelopes e
          WHERE e.user_id = $1
        )
        SELECT
          count(*) FILTER (
            WHERE status = 'sent' AND (expires_at IS NULL OR expires_at > $2)
          ) AS waiting,
          count(*) FILTER (
            WHERE status = 'sent' AND expires_at IS NOT NULL AND expires_at <= $2
          ) AS expired,
          count(*) FILTER (
            WHERE status = 'draft' AND NOT is_template_draft
          ) AS drafts,
          count(*) FILTER (WHERE is_template_draft) AS "templateDrafts",
          count(*) FILTER (
            WHERE status = 'completed' AND completed_at >= $3
          ) AS "completedThisMonth",
          count(*) FILTER (WHERE status = 'completed') AS "completedTotal",
          min(sent_at) FILTER (
            WHERE status = 'sent' AND (expires_at IS NULL OR expires_at > $2)
          ) AS "oldestWaitingSince"
        FROM mine
      `,
      [userId, nowSeconds, monthStart, TEMPLATE_ROLE_EMAIL_PATTERN],
    ),
    queryMany<{ count: number; week: number }>(
      database,
      `
        SELECT
          floor(($2::bigint - completed_at) / ${String(WEEK)})::int AS week,
          count(*) AS count
        FROM envelopes
        WHERE user_id = $1
          AND status = 'completed'
          AND completed_at IS NOT NULL
          AND completed_at > $2::bigint - ${String(WEEK * OVERVIEW_WEEKS)}
          AND completed_at <= $2::bigint
        GROUP BY 1
      `,
      [userId, nowSeconds],
    ),
    queryOne<{ needed: number; signed: number }>(
      database,
      `
        SELECT
          count(*) FILTER (WHERE s.status = 'signed') AS signed,
          count(*) AS needed
        FROM signers s
        JOIN envelopes e ON e.id = s.envelope_id
        WHERE e.user_id = $1
          AND e.status = 'sent'
          AND (e.expires_at IS NULL OR e.expires_at > $2)
      `,
      [userId, nowSeconds],
    ),
  ]);

  return {
    completedByWeek: weeklySeries(weeks),
    completedThisMonth: Number(counts?.completedThisMonth ?? 0),
    completedTotal: Number(counts?.completedTotal ?? 0),
    drafts: Number(counts?.drafts ?? 0),
    expired: Number(counts?.expired ?? 0),
    oldestWaitingSince:
      counts?.oldestWaitingSince === null ||
      counts?.oldestWaitingSince === undefined
        ? null
        : Number(counts.oldestWaitingSince),
    signaturesIn: Number(signatures?.signed ?? 0),
    signaturesNeeded: Number(signatures?.needed ?? 0),
    templateDrafts: Number(counts?.templateDrafts ?? 0),
    waiting: Number(counts?.waiting ?? 0),
  };
}
