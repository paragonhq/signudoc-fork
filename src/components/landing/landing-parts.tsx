"use client";

import { motion, useReducedMotion } from "motion/react";

import { AppIcon } from "@/components/brand/marks";
import { DUR, EASE } from "@/components/ui/motion-tokens";

/*
 * The landing page's one product visual: a document page as it looks when
 * a signer reaches the yellow "sign here" field. The signature writes
 * itself once, then a small "Completed" note settles under the page. With
 * reduced motion both are simply there.
 */
export function HeroDocument() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[34rem]">
      <div className="rounded-(--radius-tray) bg-(--paper) p-6 shadow-(--shadow-tray) sm:p-9">
        <div className="flex items-center gap-2.5">
          <AppIcon className="size-6 rounded-[0.4rem]" />
          <span className="text-sm font-semibold tracking-[-0.015em] text-(--fg)">
            Services agreement
          </span>
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
          <div className="h-2 w-3/4 rounded-full bg-(--surface-strong)" />
          <div className="h-2 w-full rounded-full bg-(--surface)" />
          <div className="h-2 w-5/6 rounded-full bg-(--surface)" />
          <div className="h-2 w-2/3 rounded-full bg-(--surface)" />
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="h-2 w-full rounded-full bg-(--surface)" />
          <div className="h-2 w-4/5 rounded-full bg-(--surface)" />
        </div>

        <div className="mt-9">
          <div className="relative h-20 rounded-[0.875rem] bg-[rgb(var(--sign-here-rgb)/0.35)] px-4">
            <svg
              className="absolute inset-x-5 bottom-4 h-12 w-[calc(100%-2.5rem)]"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 300 48"
            >
              <motion.path
                animate={{ pathLength: 1 }}
                d="M6 34c10-18 18-26 24-22s-8 26-2 28 16-30 26-30-6 26 4 26 14-18 22-18 0 16 8 16 12-12 20-12 4 10 12 10 20-8 34-8 30 4 46 2"
                initial={{ pathLength: reduceMotion ? 1 : 0 }}
                stroke="var(--fg)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.25"
                transition={{ delay: 0.6, duration: 1.4, ease: EASE.inOut }}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span className="absolute inset-x-5 bottom-3.5 h-px bg-[rgb(var(--fg-rgb)/0.3)]" />
          </div>
          <div className="mt-2.5 flex justify-between text-[0.8125rem] text-(--secondary)">
            <span>Ada Lovelace</span>
            <span className="tabular-nums">17 Nov 2026</span>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-(--paper) py-2 pr-4 pl-3 whitespace-nowrap shadow-(--shadow-pop) sm:left-auto sm:-right-6 sm:translate-x-0"
        initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 8 }}
        transition={{ delay: 2.1, duration: DUR.panel, ease: EASE.out }}
      >
        <span className="size-2 rounded-full bg-(--success-dot)" />
        <span className="text-sm font-medium text-(--fg)">Completed</span>
        <span className="text-sm text-(--secondary)">· sealed just now</span>
      </motion.div>
    </div>
  );
}
