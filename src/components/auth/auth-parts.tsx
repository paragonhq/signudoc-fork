"use client";

import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";

import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

/*
 * Small parts shared by the auth, setup and public screens: the heading block, an icon tile, the inline
 * notice and the "or" divider. Quiet by design: no eyebrows, no rules.
 */

const TILE_TONES = {
  accent: "bg-(--accent-soft) text-(--accent-ink)",
  danger: "bg-(--danger-soft) text-(--danger)",
  neutral: "bg-(--surface-strong) text-(--secondary-strong)",
  success: "bg-(--success-soft) text-(--success)",
  warning: "bg-(--warning-soft) text-(--warning)",
} as const;

export type IconTileTone = keyof typeof TILE_TONES;

/** A soft rounded tile holding one kit icon, tinted by meaning. */
export function IconTile({
  children,
  className,
  size = "md",
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
  tone?: IconTileTone;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors duration-(--dur-move) ease-(--ease-out) [&_svg]:stroke-[1.75]",
        size === "lg"
          ? "size-14 rounded-[1.125rem] [&_svg]:size-6"
          : "size-10 rounded-[0.75rem] [&_svg]:size-5",
        TILE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The heading block of a card: an optional icon tile, the title and one
 * line of description. `eyebrow` and `rule` are accepted for older callers
 * and ignored.
 */
export function AuthHeading({
  children,
  className,
  description,
  icon,
  title,
}: {
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  /** @deprecated Calm has no eyebrows. */
  eyebrow?: ReactNode;
  /** An IconTile above the title, for states rather than forms. */
  icon?: ReactNode;
  /** @deprecated Calm has no rules. */
  rule?: boolean;
  title: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {icon ? <div className="mb-3">{icon}</div> : null}
      <h1 className="text-[1.375rem] leading-7 font-semibold tracking-[-0.03em] text-balance text-(--fg) sm:text-2xl sm:leading-8">
        {title}
      </h1>
      {description ? (
        <p className="text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** The foot of a form: the primary action, with a little air above it. */
export function AuthFormFoot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5 pt-1", className)}>
      {children}
    </div>
  );
}

const NOTICE_TONES = {
  danger: {
    className: "bg-(--danger-soft) text-(--danger)",
    icon: CircleAlert,
  },
  info: {
    className: "bg-(--accent-softer) text-(--accent-ink)",
    icon: Info,
  },
  success: {
    className: "bg-(--success-soft) text-(--success)",
    icon: CircleCheck,
  },
} as const;

/**
 * An inline message above a form, in a soft tinted well. Opens with height
 * and opacity, closes faster. `danger` is an alert (announced at once); the
 * others are status.
 */
export function AuthNotice({
  children,
  className,
  tone = "danger",
}: {
  children?: ReactNode;
  className?: string;
  tone?: keyof typeof NOTICE_TONES;
}) {
  const { className: toneClass, icon: Icon } = NOTICE_TONES[tone];

  return (
    <AnimatePresence initial={false}>
      {children ? (
        <motion.div
          animate={{
            height: "auto",
            opacity: 1,
            transition: { duration: DUR.move, ease: EASE.out },
          }}
          className="overflow-hidden"
          exit={{
            height: 0,
            opacity: 0,
            transition: { duration: exitDuration(DUR.move), ease: EASE.exit },
          }}
          initial={{ height: 0, opacity: 0 }}
          key="notice"
        >
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-(--radius-well) px-3.5 py-3 text-sm leading-5 font-medium",
              toneClass,
              className,
            )}
            role={tone === "danger" ? "alert" : "status"}
          >
            <Icon
              aria-hidden="true"
              className="mt-px size-4 shrink-0 stroke-[1.75]"
            />
            <div className="min-w-0 text-pretty">{children}</div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Two faint lines with a quiet "or" between them. */
export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <span className="h-px flex-1 bg-(--divider)" />
      <span className="text-[0.8125rem] text-(--secondary)">{label}</span>
      <span className="h-px flex-1 bg-(--divider)" />
    </div>
  );
}

/** A quiet text button in the accent ink: "Forgot password?" and friends. */
export const textActionClassName =
  "inline-flex min-h-8 items-center rounded-md px-1 -mx-1 text-left text-[0.8125rem] font-medium text-(--accent-ink) underline-offset-4 outline-none transition-colors duration-(--dur-hover) ease-(--ease-out) hover:underline focus-visible:shadow-(--focus-ring) disabled:pointer-events-none disabled:opacity-50 pointer-coarse:min-h-10";
