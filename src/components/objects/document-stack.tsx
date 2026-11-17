"use client";

import { motion, type Transition } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { OBJECT_ROOT, PAPER_CONTACT, PAPER_EDGE } from "./material";
import {
  JUMP,
  objectScale,
  SPRING,
  useObjectPose,
  useObjectReducedMotion,
  type ObjectPose,
  type ObjectSize,
} from "./object-motion";

/*
 * A few pages of one thing (a template's pages, the latest drafts) as a
 * real stack of paper. The first page is on top and is the real picture
 * when there is one; the pages under it are real pictures too when given,
 * else calm paper with a few lines.
 *
 * Poses: rest (squared up, 2–4° offsets), hover (the pages fan out, each
 * on its own spring, the top page leading), active (spread like a hand of
 * cards). Fanning out leads from the top page; gathering in leads from
 * the bottom one.
 *
 *   <DocumentStack pages={[<img … />]} count={3} pose={cardHovered ? "hover" : "rest"} />
 */

/** The master sheet, in px at md: a US Letter page. */
const W = 96;
const H = 124;

/** A page: a picture's URL, your own node, or null for plain paper. */
export type StackPage = ReactNode | string | null;

type Place = { r: number; x: number; y: number };

/** Index 0 is the top page. Tuned per count, not computed. */
const PLACES: Record<1 | 2 | 3 | 4, Record<ObjectPose, Place[]>> = {
  1: {
    active: [{ r: 0, x: 0, y: -6 }],
    hover: [{ r: -1.5, x: 0, y: -3 }],
    rest: [{ r: 0, x: 0, y: 0 }],
  },
  2: {
    active: [
      { r: 7, x: 18, y: -6 },
      { r: -9, x: -18, y: 0 },
    ],
    hover: [
      { r: 3, x: 7, y: -4 },
      { r: -6, x: -9, y: -1 },
    ],
    rest: [
      { r: 0, x: 0, y: 0 },
      { r: -3.5, x: -3, y: -1 },
    ],
  },
  3: {
    active: [
      { r: 0, x: 0, y: -9 },
      { r: 15, x: 32, y: 2 },
      { r: -15, x: -32, y: 2 },
    ],
    hover: [
      { r: 0, x: 0, y: -5 },
      { r: 7, x: 14, y: -1 },
      { r: -8, x: -14, y: -1 },
    ],
    rest: [
      { r: 0, x: 0, y: 0 },
      { r: 3, x: 3, y: -1 },
      { r: -4, x: -3, y: -2 },
    ],
  },
  4: {
    active: [
      { r: -4, x: -10, y: -9 },
      { r: 6, x: 14, y: -6 },
      { r: -16, x: -36, y: 4 },
      { r: 17, x: 38, y: 5 },
    ],
    hover: [
      { r: -1, x: -2, y: -5 },
      { r: 5, x: 10, y: -2 },
      { r: -8, x: -15, y: 0 },
      { r: 10, x: 20, y: 1 },
    ],
    rest: [
      { r: 0, x: 0, y: 0 },
      { r: 2.5, x: 3, y: -1 },
      { r: -3.5, x: -3, y: -2 },
      { r: 4, x: 4, y: -3 },
    ],
  },
};

/** Fanning out: the top page leads. Gathering in: the bottom page leads. */
const OUT_DELAYS = [0, 0.04, 0.07, 0.09];

type SheetCustom = { count: number; index: number; reduce: boolean };

function place(pose: ObjectPose) {
  return ({ count, index, reduce }: SheetCustom) => {
    const key = Math.min(4, Math.max(1, count)) as 1 | 2 | 3 | 4;
    const target = PLACES[key][pose][index] ?? { r: 0, x: 0, y: 0 };
    const order = pose === "rest" ? count - 1 - index : index;
    const transition: Transition = reduce
      ? JUMP
      : { ...SPRING.body, delay: OUT_DELAYS[order] ?? 0.1 };

    return { rotate: target.r, transition, x: target.x, y: target.y };
  };
}

const sheetVariants = {
  active: place("active"),
  hover: place("hover"),
  rest: place("rest"),
};

export function DocumentStack({
  className,
  count,
  interactive = false,
  pages,
  pose: posed = "rest",
  scale,
  size = "md",
}: {
  className?: string;
  /** How many sheets to show (1–4). Defaults to the pages given. */
  count?: number;
  interactive?: boolean;
  /** Top page first. */
  pages: readonly StackPage[];
  pose?: ObjectPose;
  /** Overrides `size` with an exact factor of the master geometry. */
  scale?: number;
  size?: ObjectSize;
}) {
  const reduce = useObjectReducedMotion();
  const { handlers, pose } = useObjectPose({ interactive, pose: posed });
  const sheets = Math.min(4, Math.max(1, count ?? pages.length));
  const factor = objectScale(size, scale);

  return (
    <span
      aria-hidden="true"
      className={cn(
        OBJECT_ROOT,
        "relative inline-block shrink-0 align-middle",
        interactive && "cursor-pointer",
        className,
      )}
      data-pose={pose}
      data-slot="document-stack"
      style={{ height: H * factor, width: W * factor }}
      {...handlers}
    >
      <span
        className="absolute top-0 left-0 block origin-top-left"
        style={{ height: H, transform: `scale(${String(factor)})`, width: W }}
      >
        <span
          className="absolute -bottom-1.5 left-1 right-1 block h-3 rounded-[50%]"
          style={{
            background:
              "radial-gradient(closest-side, var(--obj-contact), transparent)",
          }}
        />
        {Array.from({ length: sheets }, (_, index) => {
          // Drawn bottom page first, so the top page paints last.
          const at = sheets - 1 - index;

          return (
            <motion.span
              animate={pose}
              className="absolute inset-0 block origin-[50%_108%] rounded-[5px] bg-(--paper-fill)"
              custom={{ count: sheets, index: at, reduce }}
              initial={false}
              key={at}
              style={{ boxShadow: PAPER_CONTACT }}
              variants={sheetVariants}
            >
              <span className="absolute inset-0 block overflow-hidden rounded-[inherit]">
                <SheetFace page={pages[at] ?? null} seed={at} />
                {at > 0 ? (
                  // Pages further down sit a touch deeper in the stack.
                  <span
                    className="absolute inset-0 block bg-[rgb(var(--fg-rgb)/0.025)]"
                    style={{ opacity: Math.min(1, at * 0.6) }}
                  />
                ) : null}
              </span>
              <span
                className="pointer-events-none absolute inset-0 block rounded-[inherit]"
                style={{ boxShadow: PAPER_EDGE }}
              />
            </motion.span>
          );
        })}
      </span>
    </span>
  );
}

function SheetFace({ page, seed }: { page: StackPage; seed: number }) {
  if (typeof page === "string") {
    return (
      // Decorative: the card around the stack carries the name.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="absolute inset-0 size-full object-cover object-top"
        decoding="async"
        draggable={false}
        loading="lazy"
        src={page}
      />
    );
  }

  if (page) {
    return (
      <span className="absolute inset-0 flex *:h-full *:w-full">{page}</span>
    );
  }

  return <PlaceholderLines seed={seed} />;
}

const LINE_SETS = [
  [0.9, 1, 0.84, 1, 0.62],
  [1, 0.8, 0.95, 0.7],
  [0.86, 1, 0.92, 1, 0.5],
  [1, 0.9, 0.66],
] as const;

/** Plain paper with a few quiet lines, varied so a stack is not stamped. */
function PlaceholderLines({ seed }: { seed: number }) {
  const lines = LINE_SETS[seed % LINE_SETS.length] ?? LINE_SETS[0];

  return (
    <svg
      className="absolute inset-0"
      height={H}
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      width={W}
    >
      <rect
        fill="var(--paper-line-strong)"
        height="3.5"
        rx="1.75"
        width="34"
        x="12"
        y="14"
      />
      {lines.map((fraction, index) => (
        <rect
          fill="var(--paper-line)"
          height="2.5"
          key={index}
          rx="1.25"
          width={72 * fraction}
          x="12"
          y={26 + index * 7}
        />
      ))}
    </svg>
  );
}
