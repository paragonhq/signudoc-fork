"use client";

import {
  AlarmClockOffIcon,
  BanIcon,
  BellRingIcon,
  CalendarClockIcon,
  CheckCheckIcon,
  ChevronDownIcon,
  CircleDotIcon,
  CopyPlusIcon,
  EyeIcon,
  FilePlus2Icon,
  HandshakeIcon,
  MailCheckIcon,
  PenLineIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserPenIcon,
  XIcon,
  type IconComponent,
} from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { TextMorph } from "@/components/ui/text-morph";
import type { EnvelopeDetailTimelineItem } from "@/lib/envelopes";
import { cn } from "@/lib/cn";

import {
  isMilestone,
  parseTimelineStamp,
  relativeTime,
  timelineKind,
  type TimelineKind,
} from "./derive";
import { Section } from "./section";

const KIND_ICON: Record<TimelineKind, IconComponent> = {
  completed: CheckCheckIcon,
  consented: HandshakeIcon,
  copied: CopyPlusIcon,
  corrected: UserPenIcon,
  created: FilePlus2Icon,
  deadline: CalendarClockIcon,
  declined: XIcon,
  email: MailCheckIcon,
  expired: AlarmClockOffIcon,
  failed: ShieldAlertIcon,
  other: CircleDotIcon,
  reminder: BellRingIcon,
  sent: SendIcon,
  signed: PenLineIcon,
  verified: ShieldCheckIcon,
  viewed: EyeIcon,
  voided: BanIcon,
};

const TONE_TILE: Record<EnvelopeDetailTimelineItem["tone"], string> = {
  accent: "bg-(--accent-softer) text-(--accent-ink)",
  danger: "bg-(--danger-soft) text-(--danger)",
  neutral: "bg-(--surface) text-(--secondary)",
  success: "bg-(--success-soft) text-(--success)",
};

/** How many things the page shows before "Show all activity". */
const SUMMARY = 3;

/**
 * What happened, newest first. Only the latest three things people did
 * show at first; "Show all activity" opens the full trail in place (mail
 * receipts included), each line growing into its spot.
 */
export function Activity({
  now,
  timeline,
}: {
  now: number;
  timeline: readonly EnvelopeDetailTimelineItem[];
}) {
  const listId = useId();
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const newestFirst = useMemo(() => [...timeline].reverse(), [timeline]);
  const summary = useMemo(
    () =>
      new Set(
        newestFirst
          .filter(isMilestone)
          .slice(0, SUMMARY)
          .map((event) => event.id),
      ),
    [newestFirst],
  );
  const canExpand = newestFirst.length > summary.size;
  const shown = expanded
    ? newestFirst
    : newestFirst.filter((event) => summary.has(event.id));

  return (
    <Section title="Activity">
      <div className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
        {timeline.length === 0 ? (
          <p className="px-5 py-6 text-[0.9375rem] leading-6 text-(--secondary)">
            Nothing yet. Each step is recorded here as it happens.
          </p>
        ) : (
          <ol className="flex flex-col px-4 pt-2 sm:px-5" id={listId}>
            <AnimatePresence initial={false}>
              {shown.map((event, index) => (
                <motion.li
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: {
                      duration: exitDuration(DUR.move),
                      ease: EASE.exit,
                    },
                  }}
                  initial={
                    reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
                  }
                  key={event.id}
                  transition={{
                    delay: reduceMotion ? 0 : Math.min(index, 8) * 0.02,
                    duration: DUR.move,
                    ease: EASE.out,
                  }}
                >
                  <ActivityLine
                    event={event}
                    last={index === shown.length - 1}
                    now={now}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}

        {canExpand ? (
          <div className="px-2.5 pb-2.5 sm:px-3.5">
            <Button
              aria-controls={listId}
              aria-expanded={expanded}
              className="text-(--secondary) hover:text-(--fg)"
              onClick={() => setExpanded((open) => !open)}
              size="sm"
              variant="ghost"
            >
              <ChevronDownIcon
                aria-hidden="true"
                className={cn(
                  "transition-transform duration-(--dur-move) ease-(--ease-out)",
                  expanded && "rotate-180",
                )}
              />
              <TextMorph>
                {expanded
                  ? "Show less"
                  : `Show all activity (${String(newestFirst.length)})`}
              </TextMorph>
            </Button>
          </div>
        ) : (
          <div className="h-2" />
        )}
      </div>
    </Section>
  );
}

function ActivityLine({
  event,
  last,
  now,
}: {
  event: EnvelopeDetailTimelineItem;
  last: boolean;
  now: number;
}) {
  const Icon = KIND_ICON[timelineKind(event)];
  const when = relativeTime(parseTimelineStamp(event.timestamp, now), now);

  return (
    <div className="relative flex items-start gap-3 py-2.5">
      {/* A quiet thread from one event to the next. */}
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute top-[2.375rem] -bottom-px left-[0.8125rem] w-px bg-(--divider)"
        />
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5",
          TONE_TILE[event.tone],
        )}
      >
        <Icon strokeWidth={1.75} />
      </span>
      <p className="min-w-0 flex-1 pt-1 text-sm leading-5 text-pretty text-(--fg)">
        {event.description}
      </p>
      <time
        className="shrink-0 pt-1 text-[0.8125rem] leading-5 text-(--secondary) tabular-nums"
        title={`${event.timestamp} UTC`}
      >
        {when ?? event.timestamp}
      </time>
    </div>
  );
}
