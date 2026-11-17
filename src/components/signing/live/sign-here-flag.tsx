"use client";

import { motion, useReducedMotion } from "motion/react";

import { SPRING_SOFT } from "@/components/ui/motion-tokens";
import type { SigningCurrentField } from "@/lib/schemas/signing";

import { getFlagLabel } from "./field-logic";

/** A field this close to the top of the page gets the flag beside it. */
const ROOM_ABOVE = 0.04;

/**
 * The small yellow "Sign here" flag. It sits on the top edge of the field
 * the signer should do next and, being one object (a shared layoutId), it
 * travels there on a soft spring when they move on, across pages too.
 * Decorative: the field itself carries the name and state.
 */
export function SignHereFlag({ field }: { field: SigningCurrentField }) {
  const reduceMotion = useReducedMotion();
  const onTheLeft = field.y < ROOM_ABOVE && field.x >= 0.15;
  const anchor = onTheLeft
    ? {
        left: `${field.x * 100}%`,
        top: `${(field.y + field.height / 2) * 100}%`,
      }
    : {
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
      };

  return (
    <div
      aria-hidden="true"
      className={
        onTheLeft
          ? "pointer-events-none absolute z-3 -translate-x-full -translate-y-1/2 pr-1.5"
          : "pointer-events-none absolute z-3 -translate-y-full pb-1"
      }
      style={anchor}
    >
      <motion.span
        className="flex h-6 items-center gap-1 rounded-full bg-(--sign-here) pr-2.5 pl-2 text-xs leading-none font-semibold whitespace-nowrap text-(--sign-here-ink) shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.08),0_4px_12px_-4px_rgb(var(--fg-rgb)/0.3)]"
        layoutId="sign-here-flag"
        transition={reduceMotion ? { duration: 0 } : SPRING_SOFT}
      >
        <svg
          className="size-3"
          fill="none"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d={
              onTheLeft
                ? "M3 6h6M6.5 3.5 9 6 6.5 8.5"
                : "M6 3v6M3.5 6.5 6 9l2.5-2.5"
            }
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
        {getFlagLabel(field)}
      </motion.span>
    </div>
  );
}
