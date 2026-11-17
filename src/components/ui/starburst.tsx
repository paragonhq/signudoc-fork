import * as React from "react";

import { cn } from "@/lib/cn";

/*
 * Starburst, calm: the burst is gone. It renders
 * the fact as plain text: the number (or word) in 600 with an optional
 * secondary caption beside it. The props are kept for older callers;
 * `rotate`, `size` and `tone` are accepted and ignored except for size,
 * which picks the text size.
 *
 *   <Starburst caption="waiting on you">3</Starburst>
 */

const SIZES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
} as const;

type StarburstProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** A short line after the main text ("per seat", "waiting"). */
  caption?: React.ReactNode;
  children: React.ReactNode;
  /** Ignored (kept for older callers). */
  rotate?: number;
  size?: keyof typeof SIZES;
  /** Ignored (kept for older callers). */
  tone?: "carbon" | "violet" | "yellow";
};

function Starburst({
  caption,
  children,
  className,
  rotate: _rotate,
  size = "md",
  tone,
  ...props
}: StarburstProps) {
  void _rotate;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-baseline gap-1.5 text-(--fg)",
        className,
      )}
      data-slot="starburst"
      data-tone={tone}
      {...props}
    >
      <span
        className={cn(
          "font-semibold tracking-[-0.02em] tabular-nums",
          SIZES[size],
        )}
      >
        {children}
      </span>
      {caption ? (
        <span className="text-[0.8125rem] text-(--secondary)">{caption}</span>
      ) : null}
    </span>
  );
}

export { Starburst, type StarburstProps };
