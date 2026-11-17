"use client";

import {
  CircleCheckIcon,
  ClockIcon,
  FileTextIcon,
  type IconComponent,
} from "@/components/ui/icons";
import type { ReactNode } from "react";

import type {
  DocumentFilter,
  DocumentRow,
} from "@/components/dashboard/dashboard-model";
import { DocumentStack } from "@/components/objects/document-stack";
import {
  useHoverPose,
  type ObjectPose,
} from "@/components/objects/object-motion";
import { DocumentThumbnail } from "@/components/shared/document-thumbnail";
import { NumberRoll } from "@/components/ui/number-roll";
import type { DocumentsOverview } from "@/lib/activity";
import { cn } from "@/lib/cn";

type OverviewFilter = Extract<
  DocumentFilter,
  "completed" | "draft" | "waiting"
>;

/*
 * The overview: three calm tiles that say where things stand and double as
 * filters for the list below (press one to show just those; press it again
 * for everything). Each carries one small, real picture of its number: the
 * signatures collected so far, the drafts themselves, and completions over
 * the last eight weeks. On a phone they shrink to the number and a word.
 */
export function DashboardOverview({
  filter,
  onFilter,
  overview,
  rows,
}: {
  filter: DocumentFilter;
  onFilter: (filter: OverviewFilter) => void;
  overview: DocumentsOverview;
  rows: readonly DocumentRow[];
}) {
  const drafts = rows
    .filter((row) => row.flag === "draft" && !row.templateDraft)
    .slice(0, 3);
  const draftCount = overview.drafts + overview.templateDrafts;

  return (
    <section
      aria-label="Overview"
      className="grid grid-cols-3 gap-x-4 gap-y-(--card-row-gap) sm:gap-x-5"
    >
      <Tile
        caption={
          overview.signaturesNeeded > 0
            ? `${String(overview.signaturesIn)} of ${String(overview.signaturesNeeded)} signatures in`
            : "Nothing out right now"
        }
        graphic={
          <SignatureMeter
            needed={overview.signaturesNeeded}
            signed={overview.signaturesIn}
          />
        }
        icon={ClockIcon}
        label="Waiting on others"
        onPress={() => onFilter("waiting")}
        pressed={filter === "waiting"}
        shortLabel="Waiting"
        tone="warning"
        value={overview.waiting}
      />
      <Tile
        caption={
          draftCount === 0
            ? "Nothing in progress"
            : overview.templateDrafts > 0
              ? `${String(overview.templateDrafts)} ${overview.templateDrafts === 1 ? "is a template" : "are templates"} in progress`
              : "Finish and send when ready"
        }
        graphic={
          drafts.length > 0
            ? (pose) => <DraftPages pose={pose} rows={drafts} />
            : null
        }
        icon={FileTextIcon}
        label="Drafts"
        onPress={() => onFilter("draft")}
        pressed={filter === "draft"}
        shortLabel="Drafts"
        tone="neutral"
        value={draftCount}
      />
      <Tile
        caption={`${String(overview.completedTotal)} completed in all`}
        graphic={<WeeklyBars weeks={overview.completedByWeek} />}
        icon={CircleCheckIcon}
        label="Completed this month"
        onPress={() => onFilter("completed")}
        pressed={filter === "completed"}
        shortLabel="Completed"
        tone="success"
        value={overview.completedThisMonth}
      />
    </section>
  );
}

const TILE_TONES = {
  neutral: "bg-(--surface-strong) text-(--secondary-strong)",
  success: "bg-(--success-soft) text-(--success)",
  warning: "bg-(--warning-soft) text-(--warning)",
} as const;

function Tile({
  caption,
  graphic,
  icon: Icon,
  label,
  onPress,
  pressed,
  shortLabel,
  tone,
  value,
}: {
  caption: string;
  /** The tile's picture; a function receives the tile's hover pose. */
  graphic: ReactNode | ((pose: ObjectPose) => ReactNode);
  icon: IconComponent;
  label: string;
  onPress: () => void;
  pressed: boolean;
  shortLabel: string;
  tone: keyof typeof TILE_TONES;
  value: number;
}) {
  const hover = useHoverPose();

  return (
    <button
      aria-label={`${label}: ${String(value)}. ${caption}`}
      aria-pressed={pressed}
      className={cn(
        "group/tile relative flex min-w-0 flex-col items-start gap-2 overflow-hidden rounded-(--radius-card) bg-(--paper) p-3.5 text-left shadow-(--shadow-card) outline-none sm:gap-4 sm:p-5",
        "transition-[translate,box-shadow,scale] duration-(--dur-move) ease-(--ease-out)",
        "pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-(--shadow-card-hover) motion-reduce:pointer-fine:hover:translate-y-0",
        "active:scale-[0.985] active:duration-(--dur-press) motion-reduce:active:scale-100",
        "aria-pressed:shadow-(--shadow-card-selected) aria-pressed:pointer-fine:hover:shadow-(--shadow-card-selected)",
        "focus-visible:shadow-(--shadow-card-focus)",
      )}
      onClick={onPress}
      type="button"
      {...hover.bind}
    >
      <span className="flex w-full min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "hidden size-8 shrink-0 items-center justify-center rounded-[0.625rem] sm:flex",
            TILE_TONES[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="truncate text-[0.8125rem] leading-5 font-medium text-(--secondary) transition-colors duration-(--dur-hover) group-aria-pressed/tile:text-(--accent-ink) sm:text-sm">
          <span className="sm:hidden">{shortLabel}</span>
          <span className="max-sm:hidden">{label}</span>
        </span>
      </span>

      <span className="flex w-full items-end justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1">
          <NumberRoll
            className="text-2xl leading-none font-semibold tracking-[-0.03em] text-(--fg) sm:text-[2.25rem]"
            value={value}
          />
          <span className="truncate text-[0.8125rem] leading-5 text-(--secondary) max-sm:hidden">
            {caption}
          </span>
        </span>
        {graphic ? (
          <span aria-hidden="true" className="shrink-0 max-md:hidden">
            {typeof graphic === "function" ? graphic(hover.pose) : graphic}
          </span>
        ) : null}
      </span>
    </button>
  );
}

const METER_SEGMENTS = 10;

/** Signatures collected of those needed, as a short row of segments. */
function SignatureMeter({
  needed,
  signed,
}: {
  needed: number;
  signed: number;
}) {
  if (needed === 0) {
    return null;
  }

  const segments = Math.min(needed, METER_SEGMENTS);
  const filled =
    needed <= METER_SEGMENTS
      ? signed
      : Math.round((signed / needed) * METER_SEGMENTS);

  return (
    <span className="mb-1.5 flex items-center gap-[3px]">
      {Array.from({ length: segments }, (_, index) => (
        <span
          className={cn(
            "h-5 w-1.5 rounded-full transition-[background-color] duration-(--dur-panel) ease-(--ease-out)",
            index < filled
              ? "bg-(--success-dot)"
              : "bg-[rgb(var(--warning-rgb)/0.16)]",
          )}
          key={index}
          style={{ transitionDelay: `${String(index * 30)}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * The latest drafts' first pages as a small stack of paper; they fan out
 * when the tile is reached for (objects/DocumentStack).
 */
function DraftPages({
  pose,
  rows,
}: {
  pose: ObjectPose;
  rows: readonly DocumentRow[];
}) {
  return (
    <DocumentStack
      className="mr-2 mb-1"
      pages={rows.map((row) => (
        <DocumentThumbnail
          className="h-full w-full rounded-none object-cover object-top shadow-none ring-0"
          envelopeId={row.source.id}
          key={row.source.id}
          title={row.source.title}
        />
      ))}
      // So small a stack needs the full spread to read as fanning.
      pose={pose === "hover" ? "active" : pose}
      scale={0.4}
    />
  );
}

/** Completions per week for the last eight weeks; this week in violet. */
function WeeklyBars({ weeks }: { weeks: readonly number[] }) {
  const max = Math.max(1, ...weeks);

  return (
    <span className="mb-1.5 flex h-10 items-end gap-1">
      {weeks.map((count, index) => {
        const isCurrent = index === weeks.length - 1;

        return (
          <span
            className={cn(
              "w-2 origin-bottom rounded-full transition-[height] duration-(--dur-panel) ease-(--ease-out)",
              isCurrent
                ? "bg-(--accent)"
                : count > 0
                  ? "bg-(--accent-soft-hover)"
                  : "bg-(--surface-strong)",
            )}
            key={index}
            style={{ height: `${String(Math.max(12, (count / max) * 100))}%` }}
          />
        );
      })}
    </span>
  );
}
