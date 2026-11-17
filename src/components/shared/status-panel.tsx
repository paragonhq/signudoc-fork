import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";
import {
  StatusFlag,
  type StatusFlagGlyph,
  type StatusFlagTone,
} from "@/components/ui/status-flag";

type StatusPanelProps = {
  action?: {
    href: string;
    label: string;
  };
  description: string;
  footer?: ReactNode;
  eyebrow?: string;
  title: string;
  tone?: "error" | "loading" | "neutral";
};

const FLAG: Record<
  NonNullable<StatusPanelProps["tone"]>,
  { glyph: StatusFlagGlyph; label: string; tone: StatusFlagTone }
> = {
  error: { glyph: "x", label: "Error", tone: "danger" },
  loading: { glyph: "ring", label: "Loading", tone: "accent" },
  neutral: { glyph: "dot", label: "Ready", tone: "neutral" },
};

/**
 * A whole-region state: something failed, is loading, or is ready but
 * empty of action. A paper sheet with a status flag, a title, one sentence
 * that says what to do next, and one action.
 */
export function StatusPanel({
  action,
  description,
  footer,
  eyebrow,
  title,
  tone = "neutral",
}: StatusPanelProps) {
  const flag = FLAG[tone];

  return (
    <section
      aria-busy={tone === "loading" || undefined}
      className="flex flex-col items-start gap-4 rounded-xl border border-(--border) bg-(--paper) px-5 py-6 sm:px-8 sm:py-8"
      data-animate="enter"
      role={tone === "error" ? "alert" : undefined}
    >
      <StatusFlag glyph={flag.glyph} tone={flag.tone}>
        {eyebrow ?? flag.label}
      </StatusFlag>
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h2 className="text-lg leading-tight font-semibold tracking-[-0.02em] text-balance text-(--fg)">
          {title}
        </h2>
        <p className="text-sm leading-6 text-pretty text-(--secondary)">
          {description}
        </p>
      </div>
      {tone === "loading" ? (
        <SkeletonText className="w-full max-w-xl" delay={150} lines={3} />
      ) : null}
      {action || footer ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {action ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : null}
          {footer}
        </div>
      ) : null}
    </section>
  );
}
