import * as React from "react";

import { pick, seededRandom } from "@/components/brand/seeded";

/*
 * Retired: <SignLines> renders nothing.
 * Kept for reference: the sign-line field from the profile banner: rows of "×" + a signature
 * line, skewed -12deg like the plate, most in a quiet grey and about one in
 * six in the accent. Decorative (aria-hidden) and deterministic: the same
 * seed draws the same field on the server and in the browser.
 *
 * It fills its box at 1:1 scale (rows 34px apart), clipped to the box: it
 * defaults to `h-full w-full`, so absolutely position it inside a sized,
 * `relative` parent (an <svg> does not stretch between top and bottom on
 * its own; override the height/width classes, not `bottom-*`). `fade` masks one side to nothing,
 * e.g. behind a page header's actions:
 *
 *   <div className="relative">
 *     <SignLines className="absolute inset-y-0 right-0 w-1/2" fade="left" />
 *     …
 *   </div>
 */

/** Line lengths and gaps, in px, measured off the banner board. */
const LINE_LENGTHS = [68, 118, 178, 238, 318] as const;
const GAPS = [26, 40, 58] as const;

type SignLinesTone = "paper" | "carbon" | "inverse";

type SignLinesProps = Omit<React.ComponentProps<"svg">, "children"> & {
  /** Share of strokes in the accent, 0–1. Default 1/6. */
  accentRatio?: number;
  /** Row spacing: dense 28, default 34, sparse 44 (px). */
  density?: "dense" | "default" | "sparse";
  /** Fade one side (or both) to transparent. */
  fade?: "left" | "right" | "both" | "none";
  /** Rows to draw; enough for ~480px by default. */
  rows?: number;
  /** Any string or number: the same seed draws the same field. */
  seed?: number | string;
  tone?: SignLinesTone;
  /** Width to fill, in px (the field is clipped to its box). */
  width?: number;
};

function buildField({
  accentRatio,
  rowGap,
  rows,
  seed,
  width,
}: {
  accentRatio: number;
  rowGap: number;
  rows: number;
  seed: number | string;
  width: number;
}) {
  const random = seededRandom(seed);
  const base = { lines: [] as string[], marks: [] as string[] };
  const accent = { lines: [] as string[], marks: [] as string[] };
  // The skew pushes lower rows left; start far enough left to cover.
  const reach = width + rows * rowGap * 0.22 + 120;

  for (let row = 0; row < rows; row += 1) {
    const y = 12 + row * rowGap;
    let x = -Math.round(random() * 120) - 20;

    while (x < reach) {
      const length = pick(random, LINE_LENGTHS);
      const target = random() < accentRatio ? accent : base;

      target.marks.push(`M${x},${y}l10,10m0,-10l-10,10`);
      target.lines.push(`M${x + 22},${y + 5}h${length}`);
      x += 22 + length + pick(random, GAPS);
    }
  }

  return {
    accent: { lines: accent.lines.join(""), marks: accent.marks.join("") },
    base: { lines: base.lines.join(""), marks: base.marks.join("") },
  };
}

/**
 * Calm: sign-line fields are retired and render
 * nothing. The props are kept so older callers still compile; buildField
 * stays for anything that draws the motif itself.
 */
function SignLines(props: SignLinesProps) {
  void props;

  return null;
}

export { SignLines, buildField, type SignLinesProps };
