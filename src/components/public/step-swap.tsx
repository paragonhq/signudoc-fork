"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";

/**
 * Swaps one step of a card for the next, like a Family tray: going forward
 * the new step slides in from the right while the old one leaves to the
 * left; going back, the reverse. Pair it with AutoHeight so the card
 * around it changes height as one object. Reduced motion keeps the
 * cross-fade and drops the travel.
 */
export function StepSwap({
  children,
  direction = 1,
  stepKey,
}: {
  children: ReactNode;
  /** 1 moves forward (new step from the right), -1 goes back. */
  direction?: 1 | -1;
  stepKey: string;
}) {
  const reduceMotion = useReducedMotion();
  const travel = reduceMotion ? 0 : 24;

  return (
    <AnimatePresence custom={direction} initial={false} mode="popLayout">
      <motion.div
        animate={{
          opacity: 1,
          transition: { duration: DUR.panel, ease: EASE.out },
          x: 0,
        }}
        custom={direction}
        exit="exit"
        initial="enter"
        key={stepKey}
        variants={{
          enter: (to: number) => ({ opacity: 0, x: travel * to }),
          exit: (to: number) => ({
            opacity: 0,
            transition: {
              duration: exitDuration(DUR.open),
              ease: EASE.exit,
            },
            x: -travel * 0.6 * to,
          }),
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
