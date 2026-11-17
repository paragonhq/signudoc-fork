/*
 * Snapping for the builder's drag and resize. Everything is in page
 * fractions (0..1); the threshold arrives already converted from screen
 * pixels, so snapping feels the same at every zoom.
 */
import { type Rect } from "./model";

export type SnapTargets = { x: number[]; y: number[] };
export type SnapHit = { offset: number; target: number };

/** Snap distance on screen, in CSS pixels. */
export const SNAP_DISTANCE_PX = 5;

/** The page's edges and centre, and the edges and centres of other fields. */
export function buildSnapTargets(others: readonly Rect[]): SnapTargets {
  const x = [0, 0.5, 1];
  const y = [0, 0.5, 1];

  for (const rect of others) {
    x.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
    y.push(rect.y, rect.y + rect.height / 2, rect.y + rect.height);
  }

  return { x, y };
}

/** The nearest target to any of the candidate lines, within `threshold`. */
export function nearestSnap(
  lines: readonly number[],
  targets: readonly number[],
  threshold: number,
): SnapHit | null {
  let best: SnapHit | null = null;

  for (const line of lines) {
    for (const target of targets) {
      const offset = target - line;

      if (
        Math.abs(offset) <= threshold &&
        (best === null || Math.abs(offset) < Math.abs(best.offset))
      ) {
        best = { offset, target };
      }
    }
  }

  return best;
}

export function boundingRect(rects: readonly Rect[]): Rect {
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));

  return { height: bottom - top, width: right - left, x: left, y: top };
}

/** Page fractions to PDF points, rounded for display. */
export function toPoints(value: number, pageSize: number) {
  return Math.round(value * pageSize);
}
