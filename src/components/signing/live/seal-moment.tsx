"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { Rosette } from "@/components/brand/marks";
import { DUR, EASE } from "@/components/ui/motion-tokens";

import { SEAL_PLAYED_KEY } from "../frame/done-seal";
import { FinishSeal } from "../frame/finish-seal";

/**
 * The moment the signature counts: the page clears, the seal settles in,
 * "Signed" and the signer's name and date appear under it. It rests a
 * moment, then the done page takes over with the seal in the same place.
 */
export function SealMoment({
  open,
  signedOn,
  signerName,
}: {
  open: boolean;
  /** "17 NOV 2026", for the seal's ring. */
  signedOn: string;
  signerName: string;
}) {
  const reduceMotion = useReducedMotion();
  const [today] = useState(() =>
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date()),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    try {
      window.sessionStorage.setItem(SEAL_PLAYED_KEY, String(Date.now()));
    } catch {
      // Without storage the done page plays the seal again; that is fine.
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] flex flex-col bg-(--page) px-6"
          initial={{ opacity: 0 }}
          role="status"
          transition={{ duration: DUR.open, ease: EASE.out }}
        >
          {/* Laid out like the done page (header height, then the same
              top offset), so the seal is already where it will stay. */}
          <div className="flex flex-1 flex-col items-center pt-[calc(env(safe-area-inset-top)+4rem+max(2rem,10vh))]">
            <div className="relative flex items-center justify-center">
              <Rosette className="pointer-events-none absolute size-[22rem] max-w-[100vw] text-(--accent) opacity-[0.07]" />
              <FinishSeal
                className="size-40 sm:size-44"
                date={signedOn}
                delay={0.12}
                settle
              />
            </div>
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 flex flex-col items-center gap-1 text-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              transition={{ delay: 0.45, duration: DUR.open, ease: EASE.out }}
            >
              <p className="text-[1.75rem] leading-9 font-semibold tracking-[-0.03em] text-(--fg) max-sm:text-2xl">
                Signed
              </p>
              <p className="text-[0.9375rem] leading-6 text-(--secondary)">
                {signerName} · {today}
              </p>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
