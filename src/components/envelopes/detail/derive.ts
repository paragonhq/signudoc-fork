import type {
  EnvelopeDetailData,
  EnvelopeDetailSignerView,
  EnvelopeDetailTimelineItem,
} from "@/lib/envelopes";

/*
 * Pure view-model helpers for the envelope detail page. Everything here is
 * derived from data the server already sends; nothing new is fetched.
 */

export type DetailStatus = EnvelopeDetailData["status"];

/** How a signer reads on the route. */
export type RouteNodeState =
  "current" | "declined" | "not-reached" | "signed" | "upcoming" | "viewed";

export type RouteNode = {
  declineReason: string | null;
  index: number;
  signer: EnvelopeDetailSignerView;
  state: RouteNodeState;
};

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Reads a deadline label ("January 15, 2027 at 8:00 AM UTC") back into a
 * timestamp, so the page can count down to it. Null when the label is in a
 * shape we don't recognise; the label is then shown as it is.
 */
export function parseDeadlineLabel(label: string | null | undefined) {
  if (!label) {
    return null;
  }

  const match =
    /^([A-Za-z]+) (\d{1,2}), (\d{4}) at (\d{1,2}):(\d{2})\s?(AM|PM) UTC$/.exec(
      label.trim(),
    );

  if (!match) {
    return null;
  }

  const month = MONTHS.indexOf(match[1]!.toLowerCase());

  if (month < 0) {
    return null;
  }

  let hours = Number(match[4]) % 12;

  if (match[6] === "PM") {
    hours += 12;
  }

  return Date.UTC(
    Number(match[3]),
    month,
    Number(match[2]),
    hours,
    Number(match[5]),
  );
}

/**
 * How long is left before a deadline, in words: "29 days left",
 * "5 hours left". `soon` under three days.
 */
export function timeLeft(msLeft: number) {
  const hours = Math.floor(Math.max(0, msLeft) / 3_600_000);
  const days = Math.floor(hours / 24);
  const label =
    days >= 2
      ? `${String(days)} days left`
      : hours >= 2
        ? `${String(hours)} hours left`
        : hours === 1
          ? "About an hour left"
          : "Less than an hour left";

  return { label, soon: msLeft < 3 * 24 * 60 * 60 * 1000 };
}

function mentions(description: string, name: string) {
  return name.trim().length > 0 && description.includes(name);
}

/**
 * Puts each signer on the route. "Viewed" comes from the audit trail (a
 * "Viewed by …" event for that signer); everything else from their status.
 */
export function buildRoute(record: EnvelopeDetailData): RouteNode[] {
  const ordered = [...record.signers].sort(
    (left, right) => left.order - right.order,
  );

  return ordered.map((signer, index) => {
    const declineReason = signer.metaLabel.startsWith("Decline reason: ")
      ? signer.metaLabel.slice("Decline reason: ".length)
      : null;
    let state: RouteNodeState;

    if (signer.status === "signed") {
      state = "signed";
    } else if (signer.status === "declined") {
      state = "declined";
    } else if (signer.status === "waiting" && record.status === "sent") {
      const viewed = record.timeline.some(
        (event) =>
          event.description.startsWith("Viewed by ") &&
          (mentions(event.description, signer.name) ||
            mentions(event.description, signer.email)),
      );

      state = viewed ? "viewed" : "current";
    } else if (record.status === "declined" || record.status === "voided") {
      state = "not-reached";
    } else {
      state = "upcoming";
    }

    return { declineReason, index, signer, state };
  });
}

export type TimelineKind =
  | "completed"
  | "consented"
  | "copied"
  | "corrected"
  | "created"
  | "deadline"
  | "declined"
  | "email"
  | "expired"
  | "failed"
  | "reminder"
  | "sent"
  | "signed"
  | "verified"
  | "viewed"
  | "voided"
  | "other";

/**
 * The server sends a sentence per event, not its type, so the icon is read
 * from the sentence. Unknown sentences get a plain dot.
 */
export function timelineKind(event: EnvelopeDetailTimelineItem): TimelineKind {
  const text = event.description.toLowerCase();

  if (text.startsWith("envelope created")) return "created";
  if (text.startsWith("copied")) return "copied";
  if (text.startsWith("sent to")) return "sent";
  if (text.startsWith("viewed")) return "viewed";
  if (text.startsWith("signed")) return "signed";
  if (text.startsWith("declined")) return "declined";
  if (text.startsWith("wrong") || text.includes("failed")) return "failed";
  if (text.includes("reminder")) return "reminder";
  if (text.includes("deadline passed")) return "expired";
  if (text.includes("deadline")) return "deadline";
  if (text.includes("voided")) return "voided";
  if (text.includes("certificate generated")) return "completed";
  if (text.includes("correct")) return "corrected";
  if (text.includes("confirmed their identity")) return "verified";
  if (text.includes("agreed to use")) return "consented";
  if (text.startsWith("email")) return "email";

  return event.tone === "success" ? "completed" : "other";
}

/** The first "Sent to …" event's timestamp, if the trail has one. */
export function sentAtLabel(timeline: readonly EnvelopeDetailTimelineItem[]) {
  return (
    timeline.find((event) => event.description.startsWith("Sent to "))
      ?.timestamp ?? null
  );
}

const SHORT_MONTHS = MONTHS.map((month) => month.slice(0, 3));

/**
 * Reads an audit timestamp ("Nov 17, 4:01 PM", UTC, no year) back into a
 * time. The year is the latest one that does not put it in the future.
 */
export function parseTimelineStamp(label: string, now: number) {
  const match = /^([A-Za-z]{3}) (\d{1,2}), (\d{1,2}):(\d{2})\s?(AM|PM)$/.exec(
    label.trim(),
  );

  if (!match) {
    return null;
  }

  const month = SHORT_MONTHS.indexOf(match[1]!.toLowerCase());

  if (month < 0) {
    return null;
  }

  let hours = Number(match[3]) % 12;

  if (match[5] === "PM") {
    hours += 12;
  }

  const year = new Date(now).getUTCFullYear();
  const at = (y: number) =>
    Date.UTC(y, month, Number(match[2]), hours, Number(match[4]));
  const guess = at(year);

  // A minute of slack for clocks that disagree a little.
  return guess > now + 60_000 ? at(year - 1) : guess;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5 minutes ago", "2 hours ago", "yesterday", "3 days ago", "on Nov 3". */
export function relativeTime(at: number | null, now: number) {
  if (at === null) {
    return null;
  }

  const elapsed = Math.max(0, now - at);

  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);

    return minutes === 1 ? "a minute ago" : `${String(minutes)} minutes ago`;
  }

  const today = Math.floor(now / DAY);
  const day = Math.floor(at / DAY);

  if (day === today) {
    const hours = Math.floor(elapsed / HOUR);

    return hours === 1 ? "an hour ago" : `${String(hours)} hours ago`;
  }

  if (today - day === 1) return "yesterday";
  if (today - day < 7) return `${String(today - day)} days ago`;

  return `on ${new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(at))}`;
}

/** "today", "yesterday", "3 days ago", "on Nov 3": for things that happened on a day. */
export function relativeDay(at: number | null, now: number) {
  const words = relativeTime(at, now);

  if (words === null) {
    return null;
  }

  return /minute|hour|just now/.test(words) ? "today" : words;
}

/** "Riley Recipient" -> "Riley"; an email stays an email. */
export function firstName(name: string) {
  const trimmed = name.trim();

  if (!trimmed || trimmed.includes("@")) {
    return trimmed;
  }

  return trimmed.split(/\s+/)[0]!;
}

/** The newest event that passes `test`. */
export function latestEvent(
  timeline: readonly EnvelopeDetailTimelineItem[],
  test: (event: EnvelopeDetailTimelineItem) => boolean,
) {
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const event = timeline[index]!;

    if (test(event)) {
      return event;
    }
  }

  return null;
}

/**
 * Receipts the mail server gave back: kept in the full activity, left out
 * of the short summary so the three lines shown are things people did.
 */
export function isMilestone(event: EnvelopeDetailTimelineItem) {
  return timelineKind(event) !== "email";
}

/** "Nov 17, 2026" (a signer's date, UTC) -> a time at the start of that day. */
export function parseShortDate(label: string) {
  const match = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(label.trim());
  const month = match ? SHORT_MONTHS.indexOf(match[1]!.toLowerCase()) : -1;

  return match && month >= 0
    ? Date.UTC(Number(match[3]), month, Number(match[2]))
    : null;
}

/** What the audit trail says about one signer, as times. */
export type SignerPresence = {
  /** When their link was last sent. */
  sentAt: number | null;
  /** When they signed, from the trail (more exact than the signer's date). */
  signedAt: number | null;
  /** When they last opened it. Null: they have not opened it yet. */
  viewedAt: number | null;
  /** Reminders sent to them, newest last. */
  reminders: { at: number | null; automatic: boolean }[];
};

/** Does this event name this signer (by name or email)? */
function namesSigner(
  event: EnvelopeDetailTimelineItem,
  signer: Pick<EnvelopeDetailSignerView, "email" | "name">,
) {
  return (
    mentions(event.description, signer.name) ||
    mentions(event.description, signer.email)
  );
}

/**
 * When a signer was sent the link, opened it, was reminded and signed, read
 * from the audit trail's sentences.
 */
export function signerPresence(
  signer: Pick<EnvelopeDetailSignerView, "email" | "name">,
  timeline: readonly EnvelopeDetailTimelineItem[],
  now: number,
): SignerPresence {
  const at = (event: EnvelopeDetailTimelineItem | null) =>
    event ? parseTimelineStamp(event.timestamp, now) : null;
  const latest = (prefix: string) =>
    latestEvent(
      timeline,
      (event) =>
        event.description.startsWith(prefix) && namesSigner(event, signer),
    );
  const reminders = timeline
    .filter(
      (event) =>
        (event.description.startsWith("Manual reminder sent to ") ||
          event.description.startsWith("Automatic reminder sent to ")) &&
        namesSigner(event, signer),
    )
    .map((event) => ({
      at: at(event),
      automatic: event.description.startsWith("Automatic"),
    }));

  return {
    reminders,
    sentAt: at(latest("Sent to ")),
    signedAt: at(latest("Signed by ")),
    viewedAt: at(latest("Viewed by ")),
  };
}
