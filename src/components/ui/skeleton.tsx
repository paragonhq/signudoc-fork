import * as React from "react";

import { cn } from "@/lib/cn";

type SkeletonProps = React.ComponentProps<"div"> & {
  /**
   * Wait this long (ms) before showing, so fast loads never flash a
   * skeleton. 150 is right for most lists; 0 shows at once.
   */
  delay?: number;
  /**
   * Accepted for older callers. Both variants draw the same soft rounded
   * block; `line` is just a text-line shape (full radius).
   */
  variant?: "block" | "line";
};

/**
 * A placeholder in the shape of what is coming: a soft tint that breathes
 * gently (a still tint with reduced motion). Decorative: put `aria-busy` on
 * the region that is loading and keep a visible or sr-only "Loading…"
 * there. Size it like the real content so nothing jumps when it arrives.
 */
function Skeleton({
  className,
  delay = 0,
  style,
  variant = "block",
  ...props
}: SkeletonProps) {
  const delayStyle = delay
    ? ({
        ...style,
        "--skeleton-delay": `${delay}ms`,
      } as React.CSSProperties)
    : style;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton",
        variant === "line" && "rounded-full",
        className,
      )}
      data-slot="skeleton"
      data-variant={variant}
      style={delayStyle}
      {...props}
    />
  );
}

/** A few lines of text, the last one shorter. */
function SkeletonText({
  className,
  delay,
  lines = 3,
}: {
  className?: string;
  delay?: number;
  lines?: number;
}) {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-slot="skeleton-text"
    >
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          className={cn(
            "h-3 rounded-full",
            index === lines - 1 && lines > 1 ? "w-3/5" : "w-full",
          )}
          delay={delay}
          key={index}
        />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText };
