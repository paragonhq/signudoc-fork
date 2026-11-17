"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useElementSize } from "@/components/ui/hooks";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

/**
 * Glides its own height to its content's, so a card that swaps one step for
 * another changes size as one object instead of jumping. (The same
 * behaviour the Tray has inside; ui/tray.tsx does not export it.)
 */
export function AutoHeight({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const [measure, size] = useElementSize<HTMLDivElement>();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      // The 4px gutter (both sides) is inside the animated box.
      animate={{ height: size ? size.height + 8 : "auto" }}
      className={cn("overflow-hidden", className)}
      initial={false}
      // Keep focus rings that sit at the edge visible while resting.
      style={{ margin: "-4px", padding: "4px" }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: DUR.panel, ease: EASE.softSpring }
      }
    >
      <div className={innerClassName} ref={measure}>
        {children}
      </div>
    </motion.div>
  );
}
