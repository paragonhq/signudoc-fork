import type { EnvelopeFlagStatus } from "@/components/ui/status-flag";
import type { EnvelopeDetailFieldView } from "@/lib/envelope-detail-fields";
import type {
  EnvelopeDetailData,
  EnvelopeDetailSignerView,
} from "@/lib/envelopes";
import { formatReminderInterval } from "@/lib/services/reminders";

import {
  buildRoute,
  firstName,
  latestEvent,
  parseDeadlineLabel,
  parseTimelineStamp,
  relativeDay,
  relativeTime,
  sentAtLabel,
  timelineKind,
  type RouteNode,
} from "./derive";

/** Everything the page's sections read, derived once per render. */
export type DetailModel = {
  /**
   * Who sent it, when an administrator is looking at another member's
   * envelope. They can read and download it, and delete it once it is
   * finished; everything that changes it stays with its sender.
   */
  ownerLabel: string | null;
  /** The viewer sent it: every action is theirs. */
  isOwn: boolean;
  currentSigner: EnvelopeDetailSignerView | null;
  /** The deadline as a timestamp, when its label can be read back. */
  deadlineAt: number | null;
  /** The plain-language deadline line ("Expires …."). */
  deadlineText: string | null;
  envelopeId: string;
  /** Where each field sits and whether it is filled, for the viewer. */
  fields: readonly EnvelopeDetailFieldView[];
  flagStatus: EnvelopeFlagStatus;
  isExpired: boolean;
  /** When the page was rendered: one clock for server and browser. */
  now: number;
  pageCount: number;
  record: EnvelopeDetailData;
  reminderHelperText: string | null;
  reminderLimited: boolean;
  remindersText: string;
  route: RouteNode[];
  sentAt: string | null;
  signedCount: number;
  /** The sentence's later parts: "sent 2 hours ago". */
  statusDetail: string | null;
  /** The sentence's first part: "Waiting for Riley to sign". */
  statusHeadline: string;
  /** Where it stands, in one sentence: "Waiting for Riley to sign · sent 2 hours ago". */
  statusLine: string;
};

export function buildDetailModel(
  envelopeId: string,
  record: EnvelopeDetailData,
  now: number,
  ownerLabel?: string,
): DetailModel {
  const deadline = record.status === "sent" ? record.deadline : null;
  const isExpired = Boolean(deadline?.expired);
  const manualReminder = record.manualReminder ?? null;
  const reminderLimited =
    record.status === "sent" &&
    manualReminder !== null &&
    !manualReminder.canSend;
  const reminderHelperText =
    record.status === "sent" && manualReminder?.nextAvailableAtLabel
      ? `You can send another reminder after ${manualReminder.nextAvailableAtLabel}.`
      : null;
  const deadlineText = !deadline
    ? null
    : isExpired
      ? `Expired ${deadline.expiresAtLabel ?? ""}. Nobody can sign until you set a new deadline.`.replace(
          " .",
          ".",
        )
      : deadline.expiresAtLabel
        ? `Expires ${deadline.expiresAtLabel}.`
        : "No deadline. Each signing link lasts seven days.";
  const reminderIntervalDays = record.reminderIntervalDays ?? null;
  const remindersText =
    reminderIntervalDays === null
      ? "Automatic reminders are off."
      : `Automatic reminders: ${formatReminderInterval(reminderIntervalDays).toLowerCase()}.`;
  const currentSigner =
    record.status === "sent"
      ? (record.signers.find((signer) => signer.status === "waiting") ?? null)
      : null;
  const route = buildRoute(record);
  const signedCount = record.signers.filter(
    (signer) => signer.status === "signed",
  ).length;
  const sentAt = sentAtLabel(record.timeline);
  const statusParts = statusSentence({
    currentSigner,
    isExpired,
    now,
    record,
    signedCount,
  });

  return {
    isOwn: ownerLabel === undefined,
    ownerLabel: ownerLabel ?? null,
    currentSigner,
    deadlineAt: parseDeadlineLabel(deadline?.expiresAtLabel),
    deadlineText,
    envelopeId,
    fields: record.fields ?? [],
    flagStatus: isExpired ? "expired" : record.status,
    isExpired,
    now,
    pageCount: Math.max(1, record.pageCount ?? 1),
    record,
    reminderHelperText,
    reminderLimited,
    remindersText,
    route,
    sentAt,
    signedCount,
    statusDetail: statusParts.slice(1).join(" · ") || null,
    statusHeadline: statusParts[0] ?? "",
    statusLine: statusParts.join(" · "),
  };
}

/** When the newest event of a kind happened, in words ("2 hours ago"). */
function whenLast(
  record: EnvelopeDetailData,
  now: number,
  kind: ReturnType<typeof timelineKind>,
  day = false,
) {
  const event = latestEvent(
    record.timeline,
    (item) => timelineKind(item) === kind,
  );
  const at = event ? parseTimelineStamp(event.timestamp, now) : null;

  return day ? relativeDay(at, now) : relativeTime(at, now);
}

/** The status sentence, in parts: the headline first, then the detail. */
function statusSentence({
  currentSigner,
  isExpired,
  now,
  record,
  signedCount,
}: {
  currentSigner: EnvelopeDetailSignerView | null;
  isExpired: boolean;
  now: number;
  record: EnvelopeDetailData;
  signedCount: number;
}) {
  const total = record.signers.length;
  const join = (...parts: (string | null | undefined)[]) =>
    parts.filter((part): part is string => Boolean(part));

  switch (record.status) {
    case "draft":
      return total === 0
        ? join("Not sent yet", "add who signs to continue")
        : join(
            "Not sent yet",
            `${String(total)} ${total === 1 ? "signer" : "signers"} added`,
          );
    case "sent": {
      if (isExpired) {
        return ["The deadline passed before everyone signed"];
      }

      if (!currentSigner) {
        return ["Out for signature"];
      }

      const who = firstName(currentSigner.name);

      if (signedCount > 0) {
        return join(
          `Waiting for ${who} to sign`,
          `${String(signedCount)} of ${String(total)} signed`,
        );
      }

      const sent = whenLast(record, now, "sent");

      return join(`Waiting for ${who} to sign`, sent ? `sent ${sent}` : null);
    }
    case "completed": {
      const when =
        whenLast(record, now, "completed", true) ??
        whenLast(record, now, "signed", true);
      const by =
        total === 1 && record.signers[0]
          ? `Signed by ${firstName(record.signers[0].name)}`
          : "Signed by everyone";

      return join(by, when ? `completed ${when}` : null);
    }
    case "declined": {
      const decliner = record.signers.find(
        (signer) => signer.status === "declined",
      );
      const when = whenLast(record, now, "declined", true);

      return join(
        decliner
          ? `${firstName(decliner.name)} declined to sign`
          : "A signer declined to sign",
        when,
      );
    }
    default: {
      const when = whenLast(record, now, "voided", true);

      return join(when ? `Voided ${when}` : "Voided", "nobody can sign it now");
    }
  }
}
