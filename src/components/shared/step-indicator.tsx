"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import type { ProgressStep } from "@/components/ui/progress-steps";

type StepIndicatorProps = {
  className?: string;
  /** The current step, 1-based. */
  current: number;
  /**
   * The step the person came from, when they arrived by navigating inside
   * the flow: the bar fills (or empties) from there instead of appearing.
   */
  previous?: number | null;
  steps: readonly ProgressStep[];
};

function stepLabel(step: ProgressStep) {
  return typeof step === "string" ? step : step.label;
}

/**
 * The send flow's progress, quiet: four short
 * segments that fill in the accent as you go, and only the current step
 * named beside them ("Signers  2 of 4"). Moving forward fills the next
 * segment from the left; going back empties it. Finished steps are not
 * links here: each step offers its own way back where it is useful.
 */
export function StepIndicator({
  className,
  current,
  previous = null,
  steps,
}: StepIndicatorProps) {
  const reduceMotion = useReducedMotion();
  const total = steps.length;
  const currentIndex = Math.min(Math.max(current, 1), total) - 1;
  const currentStep = steps[currentIndex];

  return (
    <nav aria-label="Progress" className={cn("min-w-0", className)}>
      <div className="flex items-center gap-3">
        <ol className="flex shrink-0 items-center gap-1">
          {steps.map((step, index) => {
            const label = stepLabel(step);
            const filled = index <= currentIndex;
            const wasFilled =
              previous === null ? filled : index <= previous - 1;

            return (
              <li
                aria-current={index === currentIndex ? "step" : undefined}
                className="relative h-1 w-5 overflow-hidden rounded-full bg-(--track) sm:w-6"
                key={`${label}-${index}`}
              >
                <span className="sr-only">
                  {label}
                  {index < currentIndex
                    ? ", done"
                    : index === currentIndex
                      ? ", current step"
                      : ""}
                </span>
                <motion.span
                  animate={{ scaleX: filled ? 1 : 0 }}
                  aria-hidden="true"
                  className="absolute inset-0 origin-left rounded-full bg-(--accent)"
                  initial={reduceMotion ? false : { scaleX: wasFilled ? 1 : 0 }}
                  transition={{
                    delay: previous === null ? 0 : 0.08,
                    duration: DUR.morph,
                    ease: EASE.out,
                  }}
                />
              </li>
            );
          })}
        </ol>
        <p
          aria-hidden="true"
          className="flex min-w-0 items-baseline gap-2 text-[0.8125rem] leading-5"
        >
          <span className="truncate font-medium text-(--fg)">
            {currentStep ? stepLabel(currentStep) : null}
          </span>
          <span className="shrink-0 text-(--secondary) tabular-nums">
            {currentIndex + 1} of {total}
          </span>
        </p>
      </div>
    </nav>
  );
}
