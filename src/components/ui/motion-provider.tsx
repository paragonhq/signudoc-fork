"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * motion/react follows the person's reduced-motion setting: transforms and
 * layout animations are skipped, opacity still fades. Mounted once in the
 * root layout.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
