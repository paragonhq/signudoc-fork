"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { StepIndicator } from "@/components/shared/step-indicator";
import { Button } from "@/components/ui/button";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import type { ProgressStep } from "@/components/ui/progress-steps";
import { cn } from "@/lib/cn";

import { useFlowEntrance } from "./flow-motion";

/** The send flow's four steps. */
export const FLOW_STEPS: readonly ProgressStep[] = [
  "Upload",
  "Signers",
  "Fields",
  "Review",
];

type FlowFrameProps = {
  /**
   * What sits beside the step on a wide screen, usually the document
   * being sent (FlowDocument). Hidden below 1024px: phones get the step
   * alone, with its own compact line about the document.
   */
  aside?: ReactNode;
  children: ReactNode;
  /** One quiet line under the question. */
  description?: ReactNode;
  /** The action row (FlowActions). */
  footer?: ReactNode;
  step: 1 | 2 | 3 | 4;
  /** The step's one question: "What needs signing?" */
  title: ReactNode;
};

/**
 * The frame shared by Upload, Signers and Review:
 * a short guided conversation, one question per screen. A quiet progress
 * bar, the question as the page title, one line of help, the step's
 * content in a single centred column, and the action row at the end.
 *
 * Moving forward through the flow, the step arrives from the right; going
 * back, from the left. A full page load just appears.
 */
export function FlowFrame({
  aside,
  children,
  description,
  footer,
  step,
  title,
}: FlowFrameProps) {
  const reduceMotion = useReducedMotion();
  const { direction, previous } = useFlowEntrance(step);
  const travel = reduceMotion ? 0 : 24 * direction;
  const column = (
    <>
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-7 sm:gap-8"
        initial={direction === 0 ? false : { opacity: 0, x: travel }}
        transition={{ duration: DUR.panel, ease: EASE.out }}
      >
        <PageHeader description={description} title={title} />
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </motion.div>
      {footer}
    </>
  );

  if (!aside) {
    return (
      <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-7 sm:gap-8">
        <StepIndicator current={step} previous={previous} steps={FLOW_STEPS} />
        {column}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-7 sm:gap-8 lg:max-w-[70rem]">
      <StepIndicator current={step} previous={previous} steps={FLOW_STEPS} />
      <div className="flex flex-col gap-7 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:items-start lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] xl:gap-16">
        <div className="flex min-w-0 flex-col gap-7 sm:gap-8">{column}</div>
        <motion.aside
          animate={{ opacity: 1, y: 0 }}
          className="hidden lg:sticky lg:top-24 lg:block"
          initial={
            direction === 0 || reduceMotion ? false : { opacity: 0, y: 8 }
          }
          transition={{ delay: 0.06, duration: DUR.panel, ease: EASE.out }}
        >
          {aside}
        </motion.aside>
      </div>
    </div>
  );
}

type FlowActionsProps = {
  /**
   * Where Back goes (with an arrow), or a plain link such as Cancel when
   * a label is given. Omit for none.
   */
  back?: { href: string; label?: string };
  /** One line before the primary action: what happens next. */
  hint?: ReactNode;
  /** Runs on ⌘↵ / Ctrl+Enter while the primary action can run. */
  onShortcut?: () => void;
  /** The primary action. */
  primary: ReactNode;
};

/**
 * The step's actions: Back on the left, a line saying what happens next
 * and the primary action on the right. On a desktop it rides the bottom
 * of the window while the step is taller than it, over a soft fade of the
 * page, and comes to rest under the content. On a phone it simply sits
 * under the content, clear of the floating tab bar.
 */
export function FlowActions({
  back,
  hint,
  onShortcut,
  primary,
}: FlowActionsProps) {
  useEffect(() => {
    if (!onShortcut) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Enter" &&
        (event.metaKey || event.ctrlKey) &&
        !event.defaultPrevented &&
        !event.repeat
      ) {
        event.preventDefault();
        onShortcut?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onShortcut]);

  return (
    <div
      className={cn(
        // Phones: at rest under the content (the tab bar floats there).
        // Desktop: rides the bottom of the window over a fade of the page.
        "-mx-2 px-2 lg:sticky lg:bottom-0 lg:z-20 lg:-mt-4 lg:pt-8 lg:pb-6",
        "lg:bg-linear-to-t lg:from-(--page) lg:from-70% lg:to-[rgb(var(--page-rgb)/0)]",
      )}
      data-slot="flow-actions"
    >
      <div className="flex items-center gap-3">
        {back ? (
          <Button asChild className="-ml-3 max-sm:px-3" variant="ghost">
            <Link href={back.href}>
              {back.label ? null : <ArrowLeftIcon aria-hidden="true" />}
              {back.label ?? "Back"}
            </Link>
          </Button>
        ) : null}
        <div className="ml-auto flex min-w-0 items-center gap-4">
          {hint ? (
            <p className="hidden min-w-0 truncate text-[0.8125rem] leading-5 text-(--secondary) sm:block">
              {hint}
            </p>
          ) : null}
          {primary}
        </div>
      </div>
    </div>
  );
}

/**
 * "Next", with an arrow drawn as an icon. The arrow the tests and screen
 * readers expect ("Next ->", "Next →") stays in the accessible name.
 */
export function NextLabel({ arrow }: { arrow: "->" | "→" }) {
  return (
    <>
      Next<span className="sr-only"> {arrow}</span>
      <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
    </>
  );
}

/** A middle dot between words in a quiet line. */
export function MetaDot() {
  return (
    <span aria-hidden="true" className="px-1.5 text-(--placeholder)">
      ·
    </span>
  );
}
