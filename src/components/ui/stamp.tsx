import * as React from "react";

import { cn } from "@/lib/cn";
import { hashString } from "@/components/brand/seeded";

/*
 * Stamp, calm: no ovals, rotation, texture or
 * landing any more. It renders a soft pill in the tone's tint with the
 * word in sentence case (.stamp in globals.css). Props are kept for older
 * callers; `rotate`, `texture` and `land` are accepted and ignored. The
 * text is real text; pass `decorative` when the same words are already on
 * the page.
 *
 *   <Stamp tone="success">Sealed</Stamp>
 */

export type StampTone = "carbon" | "success" | "danger" | "warning" | "accent";

type StampProps = Omit<React.ComponentProps<"span">, "children"> & {
  children: string;
  /** Hide from assistive tech when the verdict is written elsewhere. */
  decorative?: boolean;
  /** Play the one-time landing (pressed down, one settle). */
  land?: boolean;
  /** Degrees. Default: a stable -4..4 picked from the word. */
  rotate?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Ink speckle mask. Default on for md and up. */
  texture?: boolean;
  tone?: StampTone;
  /** `outline`: the inked impression (default). `solid`: a filled plate. */
  variant?: "outline" | "solid";
};

/** A stable tilt between -4 and 4 degrees, never flat. */
export function stampRotation(text: string) {
  const steps = [-4, -3, -2.5, -2, 2, 2.5, 3, 4];

  return steps[hashString(text.toUpperCase()) % steps.length]!;
}

/** "SEALED" or "sealed" → "Sealed"; mixed case is left as written. */
function sentenceCase(text: string) {
  if (text !== text.toUpperCase() && text !== text.toLowerCase()) {
    return text;
  }

  const lower = text.toLowerCase();

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function Stamp({
  children,
  className,
  decorative = false,
  land = false,
  rotate,
  size = "md",
  style,
  texture,
  tone = "carbon",
  variant = "outline",
  ...props
}: StampProps) {
  void land;
  void rotate;
  void texture;

  return (
    <span
      aria-hidden={decorative || undefined}
      className={cn("stamp", className)}
      data-size={size}
      data-slot="stamp"
      data-tone={tone}
      data-variant={variant}
      style={style}
      {...props}
    >
      {sentenceCase(children)}
    </span>
  );
}

export { Stamp, type StampProps };
