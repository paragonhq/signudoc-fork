"use client";

import { CheckIcon, MinusIcon } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ComponentProps, ReactNode, RefObject } from "react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { Spinner } from "@/components/ui/spinner";
import { TextMorph } from "@/components/ui/text-morph";

export type ReturnFocusProps = {
  /**
   * Trays opened from the overflow menu: the menu item is gone by the time
   * the tray closes, so focus goes back to the menu's trigger instead.
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export type ConfirmPhase = "idle" | "pending" | "done";

/** How long "Saved" shows before the tray closes and the toast takes over. */
export const DONE_HOLD_MS = 520;

/**
 * A tray's primary button whose label travels with the work: Save →
 * Saving… → Saved, in one morphing label, with a spinner and then a tick.
 * Clicks are ignored while it is busy or done (it stays focusable).
 */
export function ConfirmButton({
  className,
  labels,
  phase,
  ...props
}: Omit<ComponentProps<typeof Button>, "children" | "loading"> & {
  labels: { done: string; idle: string; pending: string };
  phase: ConfirmPhase;
}) {
  const busy = phase !== "idle";

  return (
    <Button
      aria-busy={phase === "pending" || undefined}
      aria-disabled={busy || undefined}
      className={cn(busy && "pointer-events-none", className)}
      {...props}
      onClick={busy ? (event) => event.preventDefault() : props.onClick}
    >
      {phase === "pending" ? <Spinner /> : null}
      {phase === "done" ? <CheckIcon aria-hidden="true" /> : null}
      <TextMorph>{labels[phase]}</TextMorph>
    </Button>
  );
}

/** A server error inside a tray: opens with height and opacity. */
export function TrayError({ message }: { message: string | null }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{
            height: 0,
            opacity: 0,
            transition: { duration: exitDuration(DUR.move), ease: EASE.exit },
          }}
          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          role="alert"
          transition={{ duration: DUR.move, ease: EASE.out }}
        >
          <span className="block rounded-(--radius-well) bg-(--danger-soft) px-3.5 py-2.5 text-[0.8125rem] leading-5 font-medium text-(--danger)">
            {message}
          </span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * What carries over and what does not, as two short lists in one soft
 * well. Used by "Copy to new draft" and "Save as template" so the
 * consequence is visible, not buried in a paragraph.
 */
export function KeptList({
  kept,
  className,
  notKept,
}: {
  className?: string;
  kept: readonly ReactNode[];
  notKept: readonly ReactNode[];
}) {
  return (
    <div
      className={cn(
        "grid gap-4 rounded-(--radius-well) bg-(--surface) px-4 py-3.5 sm:grid-cols-2",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.8125rem] leading-5 font-medium text-(--fg)">
          Comes along
        </span>
        <ul className="flex flex-col gap-1">
          {kept.map((item, index) => (
            <li
              className="flex items-start gap-2 text-[0.8125rem] leading-5 text-(--fg)"
              key={index}
            >
              <CheckIcon
                aria-hidden="true"
                className="mt-[3px] size-3.5 shrink-0 text-(--success)"
                strokeWidth={2}
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.8125rem] leading-5 font-medium text-(--fg)">
          Left behind
        </span>
        <ul className="flex flex-col gap-1">
          {notKept.map((item, index) => (
            <li
              className="flex items-start gap-2 text-[0.8125rem] leading-5 text-(--secondary)"
              key={index}
            >
              <MinusIcon
                aria-hidden="true"
                className="mt-[3px] size-3.5 shrink-0"
                strokeWidth={2}
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
