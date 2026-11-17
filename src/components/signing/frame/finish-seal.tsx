"use client";

import { motion, useReducedMotion } from "motion/react";

import { Seal } from "@/components/brand/marks";
import { useBranding } from "@/components/layout/branding-provider";
import { EASE } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

/**
 * The signer's seal, with "SIGNED · 17 NOV 2026 · SIGNUDOC ·" around its
 * ring: the one delight of the signing journey. With `settle` it lands the
 * way a seal is pressed: a touch large and turned, then down into place
 * with a small give, its shadow gathering under it. Decorative: the
 * heading beside it says "Signed" / "You're done".
 */
export function FinishSeal({
  className,
  date,
  delay = 0,
  settle = false,
}: {
  className?: string;
  /** Already formatted (formatSealDate), so server and browser agree. */
  date: string;
  /** Seconds before it lands. */
  delay?: number;
  settle?: boolean;
}) {
  const { productName } = useBranding();
  const reduceMotion = useReducedMotion();
  const name = productName.trim().toUpperCase().slice(0, 14) || "SIGNUDOC";
  const animated = settle && !reduceMotion;

  return (
    <div aria-hidden="true" className={cn("relative size-40", className)}>
      <motion.span
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-[8%] top-[14%] rounded-full bg-[rgb(var(--fg-rgb)/0.22)] blur-xl"
        initial={animated ? { opacity: 0, scale: 0.6 } : false}
        transition={{ delay: delay + 0.12, duration: 0.5, ease: EASE.out }}
      />
      <motion.div
        animate={{ opacity: 1, rotate: -6, scale: 1 }}
        className="relative size-full"
        initial={
          animated
            ? { opacity: 0, rotate: -18, scale: 1.35 }
            : settle && reduceMotion
              ? { opacity: 0, rotate: -6, scale: 1 }
              : false
        }
        transition={
          reduceMotion
            ? { delay, duration: 0.2 }
            : {
                delay,
                opacity: { delay, duration: 0.18 },
                type: "spring",
                stiffness: 320,
                damping: 20,
                mass: 0.9,
              }
        }
      >
        <Seal
          className="size-full"
          ringText={`Signed · ${date} · ${name} · `}
          tone="flag"
        />
      </motion.div>
    </div>
  );
}
