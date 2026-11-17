"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { useElementSize } from "@/components/ui/hooks";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

/**
 * Glides its height to its content's, so a block that swaps what it shows
 * (an empty drop sheet becoming a file, a check revealing its input) grows
 * instead of jumping. Reduced motion: the height snaps.
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
      animate={{ height: size ? size.height : "auto" }}
      className={cn("overflow-hidden", className)}
      initial={false}
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
