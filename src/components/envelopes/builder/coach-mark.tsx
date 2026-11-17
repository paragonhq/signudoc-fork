"use client";

import { XIcon } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";

/**
 * The first-run tip, floating above the dock rather than over the
 * document: how to place a field, with the keys. Dismissed for good with
 * its close button, and gone by itself once a field is on the page.
 */
export function CoachMark({
  onDismiss,
  open,
  signerName,
}: {
  onDismiss: () => void;
  open: boolean;
  signerName: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.aside
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          aria-label="Getting started"
          className="pointer-events-auto relative flex w-[24rem] max-w-full items-start gap-3 rounded-(--radius-card) bg-(--paper) py-3 pr-10 pl-4 shadow-(--shadow-pop)"
          exit={{
            filter: "blur(2px)",
            opacity: 0,
            transition: { duration: exitDuration(DUR.open), ease: EASE.exit },
            y: reduceMotion ? 0 : 4,
          }}
          initial={{
            filter: "blur(2px)",
            opacity: 0,
            y: reduceMotion ? 0 : 6,
          }}
          transition={{ delay: 0.35, duration: DUR.open, ease: EASE.out }}
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm leading-5 font-medium text-(--fg)">
              Drag a field onto the page
            </p>
            <p className="text-[0.8125rem] leading-5 text-(--secondary)">
              Start with where {signerName} signs. Or press <Kbd>1</Kbd>–
              <Kbd>8</Kbd> and click the spot.
            </p>
          </div>
          <IconButton
            aria-label="Dismiss tip"
            className="absolute top-2 right-2 rounded-full"
            onClick={onDismiss}
            size="xs"
            tooltip={false}
          >
            <XIcon />
          </IconButton>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
