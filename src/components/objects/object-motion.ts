"use client";

import { useReducedMotion } from "motion/react";
import {
  useCallback,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
} from "react";

/*
 * What the signature objects (Envelope, DocumentStack, PaperSheet) share:
 * the three poses, the size scale over one master geometry, the springs,
 * and a reduced-motion read that is safe to hydrate.
 */

/** Rest (quiet, slightly alive), hover (anticipation), active (reveal). */
export type ObjectPose = "rest" | "hover" | "active";

export type ObjectSize = "sm" | "md" | "lg";

/** One master geometry, scaled: sm .65, md 1, lg 1.35. */
export const OBJECT_SCALE: Record<ObjectSize, number> = {
  lg: 1.35,
  md: 1,
  sm: 0.65,
};

export function objectScale(size: ObjectSize = "md", scale?: number) {
  return scale ?? OBJECT_SCALE[size];
}

const POSE_RANK: Record<ObjectPose, number> = { active: 2, hover: 1, rest: 0 };

/** The stronger of two poses: a parent's hover and the object's own click. */
export function strongerPose(left: ObjectPose, right: ObjectPose) {
  return POSE_RANK[left] >= POSE_RANK[right] ? left : right;
}

/**
 * The reference springs: soft and a little alive (stiffness 120, damping
 * 13–14), with a firmer one for presses and things that must not wobble.
 */
export const SPRING = {
  /** Flaps, letters, fanning pages. */
  body: { damping: 14, stiffness: 120, type: "spring" },
  /** The same, with one more visible bounce (lifts, settles). */
  lively: { damping: 13, stiffness: 120, type: "spring" },
  /** Slides that should land without overshooting out of a pocket. */
  firm: { damping: 22, stiffness: 190, type: "spring" },
  /** Presses and tilts that follow the pointer. */
  press: { damping: 24, stiffness: 320, type: "spring" },
} as const;

/** Reduced motion jumps straight to each pose. */
export const JUMP = { duration: 0 } as const;

const subscribeNever = () => () => {};

/**
 * The visitor's reduced-motion setting, read only after hydration: the
 * server cannot know it, so the first render always matches the server
 * (same pattern as ui/text-morph.tsx). Markup never branches on it; only
 * transitions do.
 */
export function useObjectReducedMotion() {
  const prefersReducedMotion = useReducedMotion();
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return mounted && Boolean(prefersReducedMotion);
}

/**
 * The pose an object shows: the one passed in, raised by the object's own
 * hover (fine pointers only) and click or tap (toggles the reveal) when it
 * is `interactive`.
 */
export function useObjectPose({
  interactive = false,
  pose = "rest",
}: {
  interactive?: boolean;
  pose?: ObjectPose;
}) {
  const [hovered, setHovered] = useState(false);
  const [opened, setOpened] = useState(false);
  const own: ObjectPose = opened ? "active" : hovered ? "hover" : "rest";

  const handlers = interactive
    ? {
        onClick: () => setOpened((value) => !value),
        onPointerEnter: (event: PointerEvent) => {
          if (event.pointerType === "mouse") {
            setHovered(true);
          }
        },
        onPointerLeave: (event: PointerEvent) => {
          if (event.pointerType === "mouse") {
            setHovered(false);
            setOpened(false);
          }
        },
      }
    : {};

  return {
    handlers,
    pose: interactive ? strongerPose(pose, own) : pose,
  };
}

/**
 * For a card or tile that carries an object: hover with a mouse, or
 * keyboard focus inside, asks for the object's hover pose. Spread `bind`
 * on the card, pass `pose` to the object.
 */
export function useHoverPose() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
  }, []);

  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    setFocused(event.target.matches(":focus-visible"));
  }, []);

  return {
    bind: {
      onBlur,
      onFocus,
      onPointerEnter: (event: PointerEvent) => {
        if (event.pointerType === "mouse") {
          setHovered(true);
        }
      },
      onPointerLeave: (event: PointerEvent) => {
        if (event.pointerType === "mouse") {
          setHovered(false);
        }
      },
    },
    hovered: hovered || focused,
    pose: (hovered || focused ? "hover" : "rest") as ObjectPose,
  };
}

/** A stable, url()-safe id for SVG filters from React's useId. */
export function svgId(reactId: string, name: string) {
  return `${name}-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
