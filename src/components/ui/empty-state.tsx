import * as React from "react";
import { FileText } from "@/components/ui/icons";

import { cn } from "@/lib/cn";

/**
 * Kept for older callers: a calm document glyph in a soft icon tile.
 * (It used to be the sign-line sticker.) Decorative.
 */
function SignLineIllustration({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-[0.875rem] bg-(--accent-softer) text-(--accent) [&_svg]:size-5 [&_svg]:stroke-[1.75]",
        className,
      )}
    >
      <FileText />
    </span>
  );
}

type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** One action, the obvious next step. A second one only if it is real. */
  action?: React.ReactNode;
  /** One sentence: why it is empty or what will appear here. */
  description?: React.ReactNode;
  /** The glyph in the icon tile (a kit icon). Defaults to a document. */
  icon?: React.ReactNode;
  /** Replaces the icon tile with your own art. Use sparingly. */
  illustration?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** `compact` sits inside a table or sheet: no card of its own, less air. */
  size?: "default" | "compact";
  title: React.ReactNode;
  /**
   * Accepted for older callers. `accent` tints the icon tile violet
   * instead of grey; there are no slabs or rosettes any more.
   */
  tone?: "default" | "accent";
};

/**
 * An empty list or first run: an icon tile, a
 * title, one sentence, one action, centred in its own white card (or in
 * the card it sits in, with `size="compact"`). Teach the one thing that
 * fills it.
 *
 *   <EmptyState
 *     title="No envelopes yet"
 *     description="Upload a PDF, add who signs, and send it in a couple of minutes."
 *     action={<Button asChild><Link href="/envelopes/new">New envelope</Link></Button>}
 *   />
 */
function EmptyState({
  action,
  className,
  description,
  icon,
  illustration,
  secondaryAction,
  size = "default",
  title,
  tone = "default",
  ...props
}: EmptyStateProps) {
  const compact = size === "compact";

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact
          ? "gap-4 px-4 py-10"
          : "gap-5 rounded-(--radius-card) bg-(--paper) px-6 py-14 shadow-(--shadow-card) sm:py-16",
        className,
      )}
      data-slot="empty-state"
      data-tone={tone}
      {...props}
    >
      {illustration ?? (
        <span
          aria-hidden="true"
          className={cn(
            // A small raised tile: its fill, a top highlight, a hairline and
            // a contact shadow, so the glyph sits on an object, not a stain.
            "inline-flex size-12 shrink-0 items-center justify-center rounded-[0.875rem] [&_svg]:size-5 [&_svg]:stroke-[1.75]",
            "shadow-[var(--surface-highlight),inset_0_0_0_1px_rgb(var(--fg-rgb)/0.05),0_1px_2px_rgb(var(--fg-rgb)/0.05),0_4px_10px_-4px_rgb(var(--fg-rgb)/0.08)]",
            tone === "accent"
              ? "bg-(--accent-softer) text-(--accent)"
              : "bg-(--surface) text-(--fg)",
          )}
        >
          {icon ?? <FileText />}
        </span>
      )}
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2
          className={cn(
            "leading-snug font-semibold tracking-[-0.02em] text-balance text-(--fg)",
            compact ? "text-base" : "text-lg",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className="text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
            {description}
          </p>
        ) : null}
      </div>
      {action || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export { EmptyState, SignLineIllustration };
