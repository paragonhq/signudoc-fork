import {
  BadgeCheckIcon,
  BanIcon,
  BellIcon,
  CircleXIcon,
  EyeIcon,
  PenLineIcon,
  SendIcon,
  TimerIcon,
  type IconComponent,
} from "@/components/ui/icons";
import type { ActivityItem, ActivityKind } from "@/lib/activity";

/*
 * How an activity event reads, in words and one small tinted glyph. Shared
 * by the Activity page and the "latest" line on Documents, so the same
 * event always says the same thing.
 */

export type ActivityTone =
  "accent" | "danger" | "neutral" | "success" | "warning";

export const ACTIVITY_LOOK: Record<
  ActivityKind,
  { icon: IconComponent; tone: ActivityTone }
> = {
  completed: { icon: BadgeCheckIcon, tone: "success" },
  declined: { icon: CircleXIcon, tone: "danger" },
  expired: { icon: TimerIcon, tone: "warning" },
  reminded: { icon: BellIcon, tone: "warning" },
  sent: { icon: SendIcon, tone: "accent" },
  signed: { icon: PenLineIcon, tone: "success" },
  viewed: { icon: EyeIcon, tone: "neutral" },
  voided: { icon: BanIcon, tone: "neutral" },
};

/** Tile tint and glyph colour per tone (all ≥4.5:1 on their tint). */
export const TONE_TILE: Record<ActivityTone, string> = {
  accent: "bg-(--accent-softer) text-(--accent-ink)",
  danger: "bg-(--danger-soft) text-(--danger)",
  neutral: "bg-(--surface-strong) text-(--secondary-strong)",
  success: "bg-(--success-soft) text-(--success)",
  warning: "bg-(--warning-soft) text-(--warning)",
};

export type SentencePart = {
  emphasis?: "person" | "title";
  text: string;
};

export function personFor(item: ActivityItem) {
  return item.actorName ?? item.actorEmail ?? "A signer";
}

/** "Riley Chen signed Mutual NDA", as parts the page can emphasise. */
export function activitySentence(item: ActivityItem): SentencePart[] {
  const person: SentencePart = { emphasis: "person", text: personFor(item) };
  const title: SentencePart = { emphasis: "title", text: item.envelopeTitle };

  switch (item.kind) {
    case "sent":
      return [{ text: "You sent " }, title, { text: " to " }, person];
    case "viewed":
      return [person, { text: " opened " }, title];
    case "signed":
      return [person, { text: " signed " }, title];
    case "declined":
      return [person, { text: " declined " }, title];
    case "completed":
      return [title, { text: " is complete. Everyone signed." }];
    case "voided":
      return [{ text: "You voided " }, title];
    case "expired":
      return [title, { text: " passed its deadline" }];
    case "reminded":
      return item.automatic
        ? [{ text: "Automatic reminder to " }, person, { text: " for " }, title]
        : [{ text: "You reminded " }, person, { text: " about " }, title];
    default:
      return [title];
  }
}

export function sentenceText(item: ActivityItem) {
  return activitySentence(item)
    .map((part) => part.text)
    .join("");
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Just now", "5 min ago", "2 h ago", "Yesterday", "3 days ago", "Nov 3". */
export function relativeTime(atSeconds: number, nowMs: number) {
  const elapsed = Math.max(0, nowMs - atSeconds * 1000);

  if (elapsed < MINUTE) {
    return "Just now";
  }

  if (elapsed < HOUR) {
    return `${String(Math.floor(elapsed / MINUTE))} min ago`;
  }

  if (elapsed < DAY) {
    return `${String(Math.floor(elapsed / HOUR))} h ago`;
  }

  const days = Math.floor(elapsed / DAY);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${String(days)} days ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(atSeconds * 1000));
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/** "2:14 PM", in the viewer's own time zone. */
export function clockTime(atSeconds: number) {
  return timeFormatter.format(new Date(atSeconds * 1000));
}

/** The viewer's local calendar day, as a sortable key. */
export function localDayKey(atSeconds: number) {
  const date = new Date(atSeconds * 1000);

  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** "Today", "Yesterday", "Monday", "Mon, Nov 3", "Nov 3, 2025". */
export function dayLabel(atSeconds: number, nowMs: number) {
  const date = new Date(atSeconds * 1000);
  const now = new Date(nowMs);
  const startOf = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / DAY);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: date.getFullYear() === now.getFullYear() ? "short" : undefined,
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
}
