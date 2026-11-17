import type { EnvelopeFlagStatus } from "@/components/ui/status-flag";
import type { SignerState } from "@/components/ui/avatar";
import type { DashboardEnvelopeListItem } from "@/lib/envelopes";

/*
 * Everything the Documents screen shows is derived here from the list item
 * the server already sends (title, status, status label, context line,
 * created date, addresses). Nothing new is fetched. Where the item does not
 * say something (when a document was completed, when a deadline falls),
 * the screen does not pretend to know it.
 */

export type DocumentFilter =
  "all" | "draft" | "waiting" | "completed" | "declined" | "voided" | "expired";

export type DocumentView = "table" | "grid";

export type DocumentSort =
  | { by: "created"; direction: "ascending" | "descending" }
  | { by: "title"; direction: "ascending" | "descending" };

export type DerivedSigner = {
  email: string;
  state?: SignerState;
};

export type DocumentRow = {
  /** The status the flag shows: waiting while out, expired past deadline. */
  flag: Exclude<EnvelopeFlagStatus, "sent">;
  createdAt: number | null;
  /** "ENV-8F3A21": the first characters of the id, for scanning. */
  shortId: string;
  signers: DerivedSigner[];
  /** Signed of total, when the item says so. */
  progress: { signed: number; total: number } | null;
  source: DashboardEnvelopeListItem;
  /**
   * A draft that is a template being made (its signers are role stand-ins):
   * it opens where the template is saved, not in the envelope flow.
   */
  templateDraft: boolean;
};

export const FILTER_LABELS: Record<DocumentFilter, string> = {
  all: "All",
  completed: "Completed",
  declined: "Declined",
  draft: "Drafts",
  expired: "Expired",
  voided: "Voided",
  waiting: "Waiting",
};

/** Always offered; the rest appear only when something is in them. */
const CORE_FILTERS: readonly DocumentFilter[] = [
  "all",
  "draft",
  "waiting",
  "completed",
];
const OCCASIONAL_FILTERS: readonly DocumentFilter[] = [
  "declined",
  "voided",
  "expired",
];

export function flagFor(
  envelope: DashboardEnvelopeListItem,
): DocumentRow["flag"] {
  if (envelope.expired) {
    return "expired";
  }

  return envelope.status === "sent" ? "waiting" : envelope.status;
}

export function shortIdFor(id: string) {
  return `ENV-${id
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase()}`;
}

function parseCreated(label: string): number | null {
  const parsed = Date.parse(`${label} UTC`);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const fallback = Date.parse(label);

  return Number.isFinite(fallback) ? fallback : null;
}

function splitEmails(list: string) {
  return list
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0 && email !== "—");
}

/**
 * Who signs, in order, as far as the list item tells. The addresses list
 * the signers first (in signing order) and then anyone who gets a copy, so
 * once the count of signers is known the first n addresses are them.
 */
function deriveSigners(envelope: DashboardEnvelopeListItem): {
  progress: DocumentRow["progress"];
  signers: DerivedSigner[];
} {
  const emails = envelope.searchableEmails;
  const context = envelope.contextLine;

  if (envelope.status === "completed") {
    const sentTo = context.startsWith("Sent to:")
      ? splitEmails(context.slice("Sent to:".length))
      : [];
    const total = sentTo.length;

    return {
      progress: total > 0 ? { signed: total, total } : null,
      signers: sentTo.map((email) => ({ email, state: "signed" })),
    };
  }

  if (envelope.status === "sent") {
    const match = /^(\d+) of (\d+) signed$/.exec(envelope.statusLabel);
    const total = match ? Number(match[2]) : 1;
    const signed = match ? Number(match[1]) : 0;
    const people = emails.slice(0, total);

    return {
      progress: { signed, total },
      signers: people.map((email, index) => ({
        email,
        state: index < signed ? "signed" : "waiting",
      })),
    };
  }

  if (envelope.status === "draft") {
    const match = /^(\d+) signers?/.exec(context);
    const total = match ? Number(match[1]) : 0;

    return {
      progress: null,
      signers: emails.slice(0, total).map((email) => ({ email })),
    };
  }

  if (envelope.status === "declined") {
    const by = context.startsWith("Declined by:")
      ? context.slice("Declined by:".length).trim()
      : "";

    return {
      progress: null,
      signers: by && by !== "—" ? [{ email: by, state: "declined" }] : [],
    };
  }

  return { progress: null, signers: [] };
}

export function toRow(
  envelope: DashboardEnvelopeListItem,
  templateDraftIds?: ReadonlySet<string>,
): DocumentRow {
  const templateDraft =
    envelope.status === "draft" &&
    (templateDraftIds?.has(envelope.id) ?? false);
  const { progress, signers } = templateDraft
    ? { progress: null, signers: [] }
    : deriveSigners(envelope);

  return {
    createdAt: parseCreated(envelope.createdAtLabel),
    flag: flagFor(envelope),
    progress,
    shortId: shortIdFor(envelope.id),
    signers,
    source: envelope,
    templateDraft,
  };
}

/** Where a row opens: the document, or the template being saved. */
export function rowHref(row: DocumentRow) {
  const id = encodeURIComponent(row.source.id);

  return row.templateDraft ? `/templates/new/${id}` : `/envelopes/${id}`;
}

export function countRows(rows: readonly DocumentRow[]) {
  const counts: Record<DocumentFilter, number> = {
    all: rows.length,
    completed: 0,
    declined: 0,
    draft: 0,
    expired: 0,
    voided: 0,
    waiting: 0,
  };

  for (const row of rows) {
    counts[row.flag] += 1;
  }

  return counts;
}

export function visibleFilters(
  counts: Record<DocumentFilter, number>,
  selected: DocumentFilter,
) {
  return [
    ...CORE_FILTERS,
    ...OCCASIONAL_FILTERS.filter(
      (filter) => counts[filter] > 0 || filter === selected,
    ),
  ];
}

export function filterRows(
  rows: readonly DocumentRow[],
  filter: DocumentFilter,
  query: string,
) {
  const needle = query.trim().toLowerCase();

  return rows.filter((row) => {
    if (filter !== "all" && row.flag !== filter) {
      return false;
    }

    if (!needle) {
      return true;
    }

    return (
      row.source.title.toLowerCase().includes(needle) ||
      row.shortId.toLowerCase().includes(needle) ||
      row.source.searchableEmails.some((email) =>
        email.toLowerCase().includes(needle),
      )
    );
  });
}

export function sortRows(rows: readonly DocumentRow[], sort: DocumentSort) {
  const factor = sort.direction === "ascending" ? 1 : -1;

  // The server sends newest first; that order breaks ties.
  return rows
    .map((row, index) => ({ index, row }))
    .sort((left, right) => {
      if (sort.by === "title") {
        const compared = left.row.source.title.localeCompare(
          right.row.source.title,
          undefined,
          { sensitivity: "base" },
        );

        return compared === 0 ? left.index - right.index : compared * factor;
      }

      const leftTime = left.row.createdAt ?? 0;
      const rightTime = right.row.createdAt ?? 0;

      return leftTime === rightTime
        ? (left.index - right.index) *
            (sort.direction === "descending" ? 1 : -1)
        : (leftTime - rightTime) * factor;
    })
    .map(({ row }) => row);
}

const DAY = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday", "4d ago", "3w ago", or the date itself. */
export function relativeDay(timestamp: number | null, now: number) {
  if (timestamp === null) {
    return null;
  }

  const today = Math.floor(now / DAY);
  const then = Math.floor(timestamp / DAY);
  const days = today - then;

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 14) {
    return `${String(days)}d ago`;
  }

  if (days < 60) {
    return `${String(Math.floor(days / 7))}w ago`;
  }

  return null;
}

export function signersSummary(row: DocumentRow) {
  if (row.progress) {
    return `${String(row.progress.signed)}/${String(row.progress.total)}`;
  }

  if (row.flag === "draft") {
    return row.signers.length > 0 ? String(row.signers.length) : "—";
  }

  return null;
}

export function signersSentence(row: DocumentRow) {
  if (row.progress) {
    return `${String(row.progress.signed)} of ${String(row.progress.total)} signed`;
  }

  if (row.flag === "draft") {
    const count = row.signers.length;

    return count === 0
      ? "No signers yet"
      : `${String(count)} signer${count === 1 ? "" : "s"} added`;
  }

  return row.source.contextLine;
}

/* ------------------------------------------------------------------------ */
/* Calm Documents screen                            */
/* ------------------------------------------------------------------------ */

export type TimeGroup = "today" | "week" | "earlier";

export const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  earlier: "Earlier",
  today: "Today",
  week: "This week",
};

/** Today, the six days before it, or earlier, by the day it was created. */
export function timeGroupFor(row: DocumentRow, now: number): TimeGroup {
  if (row.createdAt === null) {
    return "earlier";
  }

  const days = Math.floor(now / DAY) - Math.floor(row.createdAt / DAY);

  if (days <= 0) {
    return "today";
  }

  return days < 7 ? "week" : "earlier";
}

/** Rows in their time groups, newest group first, empty groups left out. */
export function groupRows(rows: readonly DocumentRow[], now: number) {
  const groups: Record<TimeGroup, DocumentRow[]> = {
    earlier: [],
    today: [],
    week: [],
  };

  for (const row of rows) {
    groups[timeGroupFor(row, now)].push(row);
  }

  return (["today", "week", "earlier"] as const)
    .filter((group) => groups[group].length > 0)
    .map((group) => ({ group, rows: groups[group] }));
}

/** "riley@acme.test and 2 others". */
function people(emails: readonly string[]) {
  if (emails.length === 0) {
    return null;
  }

  const [first] = emails;
  const others = emails.length - 1;

  return others === 0
    ? first!
    : `${first!} and ${String(others)} other${others === 1 ? "" : "s"}`;
}

function afterPrefix(line: string, prefix: string) {
  return line.startsWith(prefix) ? line.slice(prefix.length).trim() : null;
}

/** "Nov 3, 2026" → "Nov 3" (the year only when it is not this one). */
function shortDate(label: string, now: number) {
  const year = String(new Date(now).getUTCFullYear());

  return label.endsWith(`, ${year}`)
    ? label.slice(0, -`, ${year}`.length)
    : label;
}

/**
 * Where the document stands, in plain words, for the row's second line:
 * "Waiting for riley@acme.test · 1 of 2 signed", "Signed by 2 people",
 * "No signers yet". Built only from what the list item already says.
 */
export function plainStatusLine(row: DocumentRow, now: number) {
  const context = row.source.contextLine;

  if (row.templateDraft) {
    return "A template in progress · finish saving it";
  }

  switch (row.flag) {
    case "draft": {
      const count = row.signers.length;

      return count === 0 ? "No signers yet" : context;
    }
    case "waiting": {
      const who = afterPrefix(context, "Waiting on:");
      const progress =
        row.progress && row.progress.total > 1
          ? ` · ${String(row.progress.signed)} of ${String(row.progress.total)} signed`
          : "";

      return who && who !== "—"
        ? `Waiting for ${who}${progress}`
        : `Out for signature${progress}`;
    }
    case "expired": {
      const match = /^Expired (.+?) · was waiting on: (.+)$/.exec(context);

      return match
        ? `Expired ${shortDate(match[1]!, now)} · was waiting for ${match[2]!}`
        : "Past its deadline";
    }
    case "completed": {
      const who = people(row.signers.map((signer) => signer.email));

      return who ? `Signed by ${who}` : "Signed by everyone";
    }
    case "declined": {
      const who = afterPrefix(context, "Declined by:");

      return who && who !== "—" ? `Declined by ${who}` : "Declined";
    }
    case "voided": {
      const when = afterPrefix(context, "Voided on");

      return when ? `Voided ${shortDate(when, now)}` : "Voided";
    }
    default:
      return context;
  }
}

/** The header's quiet line: "2 waiting on others · 1 draft". */
export function overviewSentence(counts: Record<DocumentFilter, number>) {
  const parts = [
    counts.waiting > 0 ? `${String(counts.waiting)} waiting on others` : null,
    counts.draft > 0
      ? `${String(counts.draft)} ${counts.draft === 1 ? "draft" : "drafts"}`
      : null,
    counts.expired > 0 ? `${String(counts.expired)} expired` : null,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return counts.all === 1
    ? "1 document, all settled"
    : `${String(counts.all)} documents, all settled`;
}

export type NeedsYouKind = "attention" | "draft" | "nudge";

export type NeedsYouItem = {
  kind: NeedsYouKind;
  /** One short reason, in words. */
  reason: string;
  row: DocumentRow;
};

/** Waiting at least this long before we suggest a reminder. */
const NUDGE_AFTER_DAYS = 3;

/**
 * At most three things that need the sender, most urgent first: documents
 * that stopped (expired, declined), drafts to finish, and documents that
 * have been waiting a while (a reminder can help). Empty when nothing does.
 */
export function needsYou(
  rows: readonly DocumentRow[],
  now: number,
  limit = 3,
): NeedsYouItem[] {
  const items: NeedsYouItem[] = [];

  for (const row of rows) {
    if (row.flag === "expired") {
      items.push({ kind: "attention", reason: "Past its deadline", row });
    } else if (row.flag === "declined") {
      const who = afterPrefix(row.source.contextLine, "Declined by:");

      items.push({
        kind: "attention",
        reason: who && who !== "—" ? `Declined by ${who}` : "Declined",
        row,
      });
    }
  }

  for (const row of rows) {
    if (row.flag === "draft" && !row.templateDraft) {
      items.push({
        kind: "draft",
        reason:
          row.signers.length === 0
            ? "Add who signs and send"
            : "Ready to finish and send",
        row,
      });
    }
  }

  for (const row of rows) {
    if (row.flag !== "waiting" || row.createdAt === null) {
      continue;
    }

    const days = Math.floor(now / DAY) - Math.floor(row.createdAt / DAY);

    if (days >= NUDGE_AFTER_DAYS) {
      items.push({
        kind: "nudge",
        reason: `Waiting ${String(days)} days`,
        row,
      });
    }
  }

  return items.slice(0, limit);
}
