import * as React from "react";
import Link from "next/link";
import { Check } from "@/components/ui/icons";

import { cn } from "@/lib/cn";

export type ProgressStep =
  | string
  | {
      /** Completed steps with an href become links back to that step. */
      href?: string;
      label: string;
    };

function stepLabel(step: ProgressStep) {
  return typeof step === "string" ? step : step.label;
}

function stepHref(step: ProgressStep) {
  return typeof step === "string" ? undefined : step.href;
}

/**
 * The step rail for flows (Upload, Signers, Fields, Review), calm: a
 * numbered dot and a label per step. The current step is in the accent,
 * finished steps get a tick (and link back when given an href), later
 * steps wait in secondary text. On a phone it compacts to "Step 2 of 4",
 * the step's name and a thin bar.
 *
 *   <ProgressSteps
 *     current={2}
 *     steps={[{ label: "Upload", href: `/envelopes/${id}/upload` }, "Signers", "Fields", "Review"]}
 *   />
 */
function ProgressSteps({
  className,
  current,
  label = "Progress",
  steps,
}: {
  className?: string;
  /** The current step, 1-based. */
  current: number;
  /** The nav's accessible name. */
  label?: string;
  steps: readonly ProgressStep[];
}) {
  const total = steps.length;
  const currentIndex = Math.min(Math.max(current, 1), total) - 1;
  const currentStep = steps[currentIndex];

  return (
    <nav aria-label={label} className={cn("min-w-0", className)}>
      {/* Desktop and tablet: the rail. */}
      <ol className="hidden items-center gap-3 sm:flex">
        {steps.map((step, index) => {
          const text = stepLabel(step);
          const href = stepHref(step);
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === total - 1;

          return (
            <li
              className={cn(
                "flex min-w-0 items-center gap-3",
                !isLast && "flex-1",
              )}
              key={`${text}-${index}`}
            >
              {isDone ? (
                <DoneStep href={href} index={index} label={text} />
              ) : (
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 text-sm font-medium",
                    isCurrent ? "text-(--fg)" : "text-(--secondary)",
                  )}
                >
                  <StepDot state={isCurrent ? "current" : "later"}>
                    {index + 1}
                  </StepDot>
                  {text}
                </span>
              )}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="relative h-px min-w-4 flex-1 overflow-hidden rounded-full bg-(--border-strong)"
                >
                  {/* The finished part of the line fills from the left. */}
                  <span
                    className={cn(
                      "absolute inset-0 origin-left rounded-full bg-(--accent) transition-transform duration-(--spring-soft-dur) ease-(--spring-soft)",
                      isDone ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Phone: Step n of N, the name, and a thin bar. */}
      <div className="flex flex-col gap-2 sm:hidden">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-[0.8125rem] font-medium text-(--secondary)">
            Step {currentIndex + 1} of {total}
          </span>
          <span
            aria-current="step"
            className="truncate text-sm font-medium text-(--fg)"
          >
            {currentStep ? stepLabel(currentStep) : null}
          </span>
        </p>
        <span
          aria-hidden="true"
          className="h-1 overflow-hidden rounded-full bg-(--track)"
        >
          <span
            className="block h-full origin-left rounded-full bg-(--accent) transition-transform duration-(--spring-soft-dur) ease-(--spring-soft)"
            style={{ transform: `scaleX(${(currentIndex + 1) / total})` }}
          />
        </span>
      </div>
    </nav>
  );
}

function StepDot({
  children,
  state,
}: {
  children: React.ReactNode;
  state: "current" | "done" | "later";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-[background-color,color,box-shadow] duration-(--dur-hover)",
        // Current: a small violet object (highlight, edge, contact) with a
        // soft halo; done: a tinted chip; later: a shallow well.
        state === "current" &&
          "bg-(--accent) bg-(image:--surface-sheen) text-(--on-accent) shadow-[var(--surface-highlight-fill),inset_0_0_0_1px_rgb(0_0_0/0.1),0_1px_2px_rgb(var(--accent-rgb)/0.3),0_0_0_4px_rgb(var(--accent-rgb)/0.12)]",
        state === "done" &&
          "bg-(--accent-soft) text-(--accent-ink) shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.08)]",
        state === "later" &&
          "bg-(--track) text-(--secondary) shadow-(--shadow-well)",
      )}
    >
      {children}
    </span>
  );
}

function DoneStep({
  href,
  index,
  label,
}: {
  href?: string;
  index: number;
  label: string;
}) {
  const content = (
    <>
      <StepDot state="done">
        <Check className="size-3.5" strokeWidth={2.25} />
      </StepDot>
      <span>{label}</span>
      <span className="sr-only">
        (step {index + 1}, done{href ? ", go back" : ""})
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        className="inline-flex shrink-0 items-center gap-2 rounded-full text-sm font-medium text-(--secondary) outline-none transition-colors duration-(--dur-hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring)"
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-(--secondary)">
      {content}
    </span>
  );
}

export { ProgressSteps };
