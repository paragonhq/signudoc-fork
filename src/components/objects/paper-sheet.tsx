"use client";

import { animate, motion, useMotionValue } from "motion/react";
import { useEffect, type PointerEvent, type ReactNode, type Ref } from "react";

import { cn } from "@/lib/cn";

import { OBJECT_ROOT, PAPER_CONTACT, PAPER_EDGE, PAPER_LIFT } from "./material";
import {
  JUMP,
  SPRING,
  useObjectReducedMotion,
  type ObjectPose,
} from "./object-motion";

/*
 * A sheet of paper around a page picture: the fill, a hairline, an inner
 * edge highlight and a soft contact shadow. When `interactive`, it tilts
 * 2–3° toward a mouse pointer on a spring while its shadow grows, and it
 * presses flat (scale .98) while held. Touch gets the press only. Reduced
 * motion keeps the material and drops the travel.
 *
 * The sheet takes the size of its content (give the content a height),
 * like the thumbnails it wraps:
 *
 *   <PaperSheet interactive className="h-10"><img … className="h-full" /></PaperSheet>
 */

/** The most a sheet leans toward the pointer, in degrees. */
const MAX_TILT = 2.5;

export function PaperSheet({
  children,
  className,
  contentClassName,
  interactive = false,
  pose = "rest",
  ref,
}: {
  children: ReactNode;
  className?: string;
  /** Classes for the clipped paper the content sits on (radius, fill). */
  contentClassName?: string;
  interactive?: boolean;
  /** A parent's pose: hover lifts the shadow, active presses flat. */
  pose?: ObjectPose;
  ref?: Ref<HTMLSpanElement>;
}) {
  const reduce = useObjectReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const scale = useMotionValue(1);
  const lift = useMotionValue(0);

  useEffect(() => {
    const controls = [
      animate(lift, pose === "rest" ? 0 : 1, reduce ? JUMP : SPRING.press),
      animate(
        scale,
        pose === "active" ? 0.98 : 1,
        reduce ? JUMP : SPRING.press,
      ),
    ];

    return () => controls.forEach((control) => control.stop());
  }, [lift, pose, reduce, scale]);

  function lean(event: PointerEvent<HTMLSpanElement>) {
    if (!interactive || reduce || event.pointerType !== "mouse") {
      return;
    }

    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;

    animate(rotateY, x * 2 * MAX_TILT, SPRING.press);
    animate(rotateX, -y * 2 * MAX_TILT, SPRING.press);
    animate(lift, 1, SPRING.press);
  }

  function settle() {
    if (!interactive) {
      return;
    }

    const spring = reduce ? JUMP : SPRING.press;

    animate(rotateX, 0, spring);
    animate(rotateY, 0, spring);
    animate(scale, pose === "active" ? 0.98 : 1, spring);
    animate(lift, pose === "rest" ? 0 : 1, spring);
  }

  return (
    <motion.span
      className={cn(
        OBJECT_ROOT,
        "relative isolate inline-flex shrink-0 rounded-[0.375rem]",
        className,
      )}
      data-slot="paper-sheet"
      onPointerCancel={settle}
      onPointerDown={() => {
        if (interactive) {
          animate(scale, 0.98, reduce ? JUMP : SPRING.press);
        }
      }}
      onPointerLeave={settle}
      onPointerMove={lean}
      onPointerUp={() => {
        if (interactive) {
          animate(scale, 1, reduce ? JUMP : SPRING.press);
        }
      }}
      ref={ref}
      style={{
        rotateX,
        rotateY,
        scale,
        transformPerspective: 500,
      }}
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 block rounded-[inherit]"
        style={{ boxShadow: PAPER_LIFT, opacity: lift }}
      />
      <span
        className={cn(
          "relative flex h-full overflow-hidden rounded-[inherit] bg-(--paper-fill)",
          contentClassName,
        )}
        style={{ boxShadow: PAPER_CONTACT }}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block rounded-[inherit]"
        style={{ boxShadow: PAPER_EDGE }}
      />
    </motion.span>
  );
}
