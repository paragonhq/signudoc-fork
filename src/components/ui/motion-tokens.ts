/*
 * The motion tokens from globals.css, for motion/react (which cannot read
 * CSS custom properties for easing). Keep the two in step.
 * Durations are in seconds, as motion expects.
 */

export const EASE = {
  out: [0.23, 1, 0.32, 1],
  spring: [0.24, 1.34, 0.38, 1],
  softSpring: [0.3, 1.12, 0.4, 1],
  pop: [0.34, 1.56, 0.64, 1],
  inOut: [0.77, 0, 0.175, 1],
  exit: [0.4, 0, 1, 1],
  drawer: [0.32, 0.72, 0, 1],
} as const;

export const DUR = {
  press: 0.12,
  hover: 0.16,
  move: 0.22,
  open: 0.26,
  panel: 0.32,
  morph: 0.42,
} as const;

/** Exits run at about 60% of their entrance. */
export const exitDuration = (enter: number) => Math.round(enter * 600) / 1000;

/** A spring for small things that may overshoot once (thumbs, chips). */
export const SPRING_SNAPPY = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.9,
} as const;

/** A spring for panels and trays that settle with barely a bounce. */
export const SPRING_SOFT = {
  type: "spring",
  stiffness: 380,
  damping: 40,
  mass: 1,
} as const;

/*
 * The craft springs: the same physics as the CSS
 * --spring-* curves in globals.css, for motion/react.
 */

/** A press: fast, critically damped, no bounce. */
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 500,
  damping: 32,
  mass: 0.5,
} as const;

/** A release or a small object settling: one tiny overshoot. */
export const SPRING_SETTLE = {
  type: "spring",
  stiffness: 300,
  damping: 16,
  mass: 0.6,
} as const;

/** Thumbs and highlights travelling between items: about 3% overshoot. */
export const SPRING_THUMB = {
  type: "spring",
  stiffness: 260,
  damping: 24,
  mass: 1,
} as const;

/** The leading edge of a stretching thumb: a little ahead of the rest. */
export const SPRING_THUMB_LEAD = {
  type: "spring",
  stiffness: 340,
  damping: 28,
  mass: 1,
} as const;

/** The trailing edge of a stretching thumb: lags, so the thumb stretches. */
export const SPRING_THUMB_TRAIL = {
  type: "spring",
  stiffness: 190,
  damping: 24,
  mass: 1,
} as const;

/** Panels and trays changing size: no visible bounce. */
export const SPRING_PANEL = {
  type: "spring",
  stiffness: 200,
  damping: 26,
  mass: 1,
} as const;
