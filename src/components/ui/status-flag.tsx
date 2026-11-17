import * as React from "react";

import { cn } from "@/lib/cn";
import type { EnvelopeStatus } from "@/lib/types/domain";
import { StatusDot } from "@/components/ui/status-dot";

/*
 * Status: a soft pill, a tinted background, a
 * coloured dot and a sentence-case word: Draft, Waiting, Completed,
 * Declined, Voided, Expired. No stamps, no plates, no mono caps. Colour
 * says the state and the word says it again, so no one depends on colour.
 *
 *   <StatusFlag status="sent" />
 *   <StatusFlag status={envelope.expired ? "expired" : envelope.status} />
 *   <StatusFlag tone="warning">Closing</StatusFlag>
 */

export type StatusFlagTone =
  "neutral" | "accent" | "success" | "danger" | "warning";

export type StatusFlagGlyph =
  "dot" | "ring" | "check" | "x" | "clock" | "seal" | "slash" | "none";

/**
 * Every state an envelope can show: the stored statuses from
 * lib/types/domain.ts, plus the two the UI derives (`waiting` while signers
 * are still to sign, `expired` once the deadline passed).
 */
export type EnvelopeFlagStatus = EnvelopeStatus | "waiting" | "expired";

const STATUS: Record<
  EnvelopeFlagStatus,
  { glyph: StatusFlagGlyph; label: string; tone: StatusFlagTone }
> = {
  completed: { glyph: "seal", label: "Completed", tone: "success" },
  declined: { glyph: "x", label: "Declined", tone: "danger" },
  draft: { glyph: "dot", label: "Draft", tone: "neutral" },
  expired: { glyph: "clock", label: "Expired", tone: "warning" },
  sent: { glyph: "dot", label: "Waiting", tone: "warning" },
  voided: { glyph: "slash", label: "Voided", tone: "neutral" },
  waiting: { glyph: "dot", label: "Waiting", tone: "warning" },
};

/** Pill tint and text colour; the dot takes the stronger --dot colour. */
/*
 * Each pill is an inset tint well: the tint, a hairline of its own colour
 * just inside the edge, and a faint inner shadow along the top.
 */
const WELL =
  "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--dot)_16%,transparent),inset_0_1px_1.5px_rgb(var(--fg-rgb)/0.05)]";

const TONES: Record<StatusFlagTone, string> = {
  accent: "bg-(--accent-softer) text-(--accent-ink) [--dot:var(--accent)]",
  danger: "bg-(--danger-soft) text-(--danger) [--dot:var(--danger)]",
  neutral:
    "bg-(--surface-strong) text-(--secondary) [--dot:var(--dot-neutral)]",
  success: "bg-(--success-soft) text-(--success) [--dot:var(--success-dot)]",
  warning: "bg-(--warning-soft) text-(--warning) [--dot:var(--warning-dot)]",
};

/** A scalloped seal edge, 12 lobes, on the 8×8 glyph grid. */
const SEAL_GLYPH = (() => {
  const points: string[] = [];

  for (let step = 0; step < 72; step += 1) {
    const angle = (step / 72) * Math.PI * 2;
    const radius = 3.55 + 0.45 * Math.cos(angle * 12);

    points.push(
      `${(4 + Math.cos(angle) * radius).toFixed(2)},${(4 + Math.sin(angle) * radius).toFixed(2)}`,
    );
  }

  return `M${points.join("L")}Z`;
})();

/** The small glyphs, drawn on an 8×8 grid in currentColor. */
function FlagGlyph({ glyph }: { glyph: StatusFlagGlyph }) {
  if (glyph === "none") {
    return null;
  }

  const shape = (() => {
    switch (glyph) {
      case "dot":
        return <circle cx="4" cy="4" fill="currentColor" r="2.5" />;
      case "ring":
        return (
          <circle
            cx="4"
            cy="4"
            fill="none"
            r="2.6"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        );
      case "check":
        return (
          <path
            d="M1.4 4.2 3.2 6 6.6 2.2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        );
      case "x":
        return (
          <path
            d="M2 2l4 4M6 2 2 6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        );
      case "slash":
        return (
          <>
            <circle
              cx="4"
              cy="4"
              fill="none"
              r="2.9"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M2 6 6 2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.2"
            />
          </>
        );
      case "clock":
        return (
          <>
            <circle
              cx="4"
              cy="4"
              fill="none"
              r="3"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M4 2.4V4l1.1.8"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.1"
            />
          </>
        );
      case "seal":
        // A tiny scalloped seal with a tick: the completion mark.
        return (
          <>
            <path d={SEAL_GLYPH} fill="currentColor" />
            <path
              d="M2.5 4.1 3.5 5.1 5.5 3"
              fill="none"
              stroke="var(--success-soft)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
            />
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <svg
      aria-hidden="true"
      className="size-2 shrink-0 overflow-visible"
      data-slot="status-flag-glyph"
      viewBox="0 0 8 8"
    >
      {shape}
    </svg>
  );
}

type StatusFlagProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Overrides the label, e.g. "Waiting on 2" or "Expired 3 Nov". */
  children?: React.ReactNode;
  /** Overrides the glyph (generic flags). */
  glyph?: StatusFlagGlyph;
  size?: "sm" | "md";
  /** An envelope status. Sets tone, glyph and label. */
  status?: EnvelopeFlagStatus;
  /** A generic flag. Ignored when `status` is set, unless given too. */
  tone?: StatusFlagTone;
};

function StatusFlag({
  children,
  className,
  glyph,
  size = "md",
  status,
  tone,
  ...props
}: StatusFlagProps) {
  const preset = status ? STATUS[status] : undefined;
  const resolvedTone = tone ?? preset?.tone ?? "neutral";
  const label = children ?? preset?.label;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm"
          ? "h-5.5 px-2 text-xs"
          : "h-6 pr-2.5 pl-2 text-[0.8125rem]",
        TONES[resolvedTone],
        WELL,
        className,
      )}
      data-slot="status-flag"
      data-status={status}
      data-tone={resolvedTone}
      {...props}
    >
      {glyph === "none" ? null : (
        <StatusDot signature={`${resolvedTone}:${status ?? ""}`} />
      )}
      <span className="leading-none">{label}</span>
    </span>
  );
}

export { StatusFlag, FlagGlyph };
