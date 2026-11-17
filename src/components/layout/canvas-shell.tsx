"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { createContext, use, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { type ProgressStep } from "@/components/ui/progress-steps";
import { SimpleTooltip } from "@/components/ui/tooltip";

type CanvasShellProps = {
  /** Slot left of Next: undo/redo and the like (desktop). */
  actions?: ReactNode;
  backHref: string;
  backLabel: string;
  children: ReactNode;
  /** 1-based; kept for callers, no longer drawn. */
  currentStep?: number;
  /** More of the line under the title: "3 pages". */
  eyebrow?: ReactNode;
  /** Id of an element that explains why Next is disabled. */
  nextDescribedBy?: string;
  nextDisabled?: boolean;
  nextHref?: string;
  nextLabel?: string;
  nextLoading?: boolean;
  onNext?: () => void;
  /** Slot for the save state. */
  status?: ReactNode;
  stepLabel: string;
  /** Kept for callers, no longer drawn. */
  steps?: readonly ProgressStep[];
  title: string;
};

/**
 * Lets a surface that reuses the builder for something other than an
 * envelope say where Back goes and what the bar says, without the builder
 * knowing. Used by "New template" (templates/new/[id]/fields): the same
 * builder, its own words. Anything left out keeps the builder's own.
 */
export type CanvasShellOverrides = {
  backHref?: string;
  backLabel?: string;
  nextLabel?: string;
  stepLabel?: string;
};

const CanvasShellOverridesContext = createContext<CanvasShellOverrides>({});

export function CanvasShellOverridesProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CanvasShellOverrides;
}) {
  return (
    <CanvasShellOverridesContext value={value}>
      {children}
    </CanvasShellOverridesContext>
  );
}

/**
 * Full-bleed editor chrome for the builder: one
 * light bar the colour of the page (back, the document's name with where
 * you are in plain words under it, then the quiet things on the right:
 * whatever the screen adds, its save state, and Next) over a canvas that
 * fills the rest of the viewport. The canvas manages its own scrolling.
 *
 * `steps` and `currentStep` are accepted for older callers; the bar says
 * "Step 3 of 4" in words instead of drawing a rail.
 */
export function CanvasShell({
  actions,
  backHref,
  backLabel,
  children,
  eyebrow,
  nextDescribedBy,
  nextDisabled = true,
  nextHref,
  nextLabel,
  nextLoading = false,
  onNext,
  status,
  stepLabel,
  title,
}: CanvasShellProps) {
  const overrides = use(CanvasShellOverridesContext);

  backHref = overrides.backHref ?? backHref;
  backLabel = overrides.backLabel ?? backLabel;
  stepLabel = overrides.stepLabel ?? stepLabel;

  const nextButtonLabel = overrides.nextLabel ?? nextLabel ?? "Next";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-(--page)">
      <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <SimpleTooltip label={backLabel} side="bottom">
            <Button
              asChild
              className="shrink-0 rounded-full"
              size="icon"
              variant="ghost"
            >
              <Link href={backHref}>
                <ArrowLeftIcon aria-hidden="true" />
                <span className="sr-only">{backLabel}</span>
              </Link>
            </Button>
          </SimpleTooltip>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-[0.9375rem] leading-5 font-semibold tracking-[-0.01em] text-(--fg)">
              {title}
            </h1>
            <p className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
              {stepLabel}
              {eyebrow ? (
                <span className="max-sm:hidden"> · {eyebrow}</span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
          {actions}
          {status}
          {nextHref && !nextDisabled && !nextLoading ? (
            <Button asChild className="ml-1">
              <Link href={nextHref}>{nextButtonLabel}</Link>
            </Button>
          ) : (
            <Button
              aria-describedby={nextDescribedBy}
              className="ml-1"
              disabled={nextDisabled}
              loading={nextLoading}
              onClick={onNext}
            >
              {nextButtonLabel}
            </Button>
          )}
        </div>
      </header>
      <main className="relative flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
