import * as React from "react";

import { seededRandom } from "@/components/brand/seeded";

/*
 * Microtext: one line of tiny mono hash text (7.5px, +0.1em), the guard
 * line of security printing. A divider under page headers on proof pages
 * (detail, audit, verify, certificate) and the bottom edge of the rail.
 * Decorative (aria-hidden); never the only place a hash is written.
 *
 * Deterministic: the text is derived from `seed` (an envelope id, a
 * digest), so server and browser render the same characters. A few pairs
 * are highlighted (`<mark>`) like the digest board.
 *
 *   <Microtext seed={envelope.id} />
 *   <Microtext seed="rail" tone="carbon" />
 */

const HEX = "0123456789abcdef";

/** Groups of 8 hex digits from the seed; every ~9th pair highlighted. */
export function microtextGroups(seed: string | number, count = 48) {
  const random = seededRandom(`microtext:${seed}`);

  return Array.from({ length: count }, () => {
    let group = "";

    for (let index = 0; index < 8; index += 1) {
      group += HEX[Math.floor(random() * 16)];
    }

    return { group, mark: random() < 0.11 };
  });
}

type MicrotextProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Number of 8-digit groups (enough for ~1600px by default). */
  groups?: number;
  /** Highlight a few pairs in the accent (paper) or yellow (carbon). */
  highlight?: boolean;
  /** Anything stable: an envelope id, a digest, a page name. */
  seed?: string | number;
  /** `paper` carbon at 30% · `carbon` Bond at 30% (dark grounds) · `accent`. */
  tone?: "paper" | "carbon" | "accent";
};

/**
 * Calm (docs/redesign/calm.md): microtext is retired and renders nothing.
 * The props are kept so older callers still compile.
 */
function Microtext(props: MicrotextProps) {
  void props;

  return null;
}

export { Microtext, type MicrotextProps };
