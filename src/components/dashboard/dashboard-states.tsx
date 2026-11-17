"use client";

import {
  CloudOffIcon,
  FileTextIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
} from "@/components/ui/icons";
import Link from "next/link";

import { Envelope } from "@/components/objects/envelope";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * No documents, ever: one card, one sentence, one button, over an envelope that opens when reached for
 * (objects/Envelope; decorative). The heading text is what the e2e suite
 * finds.
 */
export function DashboardFirstRun() {
  return (
    <EmptyState
      action={
        <Button asChild size="lg">
          <Link href="/envelopes/new">
            <PlusIcon aria-hidden="true" />
            New envelope
          </Link>
        </Button>
      }
      description="Upload a PDF, choose who signs, and send it in a couple of minutes. Everything you send lands here."
      icon={<FileTextIcon />}
      illustration={
        <span className="flex pt-10 pb-1">
          <Envelope interactive />
        </span>
      }
      title="No documents yet"
      tone="accent"
    />
  );
}

/** Nothing matches the filter or the search: say so, offer the way back. */
export function DashboardNoResults({
  filterLabel,
  onClear,
  query,
}: {
  /** The filter in words, lower case: "drafts", "completed documents". */
  filterLabel?: string;
  onClear: () => void;
  query: string;
}) {
  const trimmed = query.trim();

  return (
    <EmptyState
      action={
        trimmed || filterLabel ? (
          <Button onClick={onClear} size="sm" variant="outline">
            {trimmed ? "Clear search" : "Show everything"}
          </Button>
        ) : null
      }
      description={
        trimmed
          ? "Try a different title or email address."
          : "They will show up here as soon as there are some."
      }
      icon={<SearchIcon />}
      size="compact"
      title={
        trimmed
          ? `Nothing matches “${trimmed}”`
          : `No ${filterLabel ?? "documents"} right now`
      }
    />
  );
}

/** The list could not be loaded: calm, and one way to try again. */
export function DashboardLoadError({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <EmptyState
      action={
        <Button loading={retrying} onClick={onRetry} variant="outline">
          <RotateCcwIcon aria-hidden="true" />
          Try again
        </Button>
      }
      description="Your documents are safe. Check your connection and try again."
      icon={<CloudOffIcon />}
      role="alert"
      title="We couldn’t load your documents"
    />
  );
}

/** Skeleton rows in the shape of the real list. */
export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-3"
      data-slot="documents-skeleton"
    >
      <Skeleton className="ml-1 h-3 w-14 rounded-full" delay={150} />
      <div className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
        {Array.from({ length: rows }, (_, index) => (
          <div
            className="flex h-16 items-center gap-3.5 border-b border-(--divider) px-4 last:border-b-0 sm:px-5"
            key={index}
          >
            <Skeleton className="size-10 rounded-[0.625rem]" delay={150} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton
                className="h-3 rounded-full"
                delay={150}
                style={{ width: `${String(40 + ((index * 17) % 30))}%` }}
              />
              <Skeleton
                className="h-2.5 rounded-full"
                delay={150}
                style={{ width: `${String(24 + ((index * 11) % 20))}%` }}
              />
            </div>
            <Skeleton
              className="hidden h-6 w-20 rounded-full sm:block"
              delay={150}
            />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading documents…</span>
    </div>
  );
}

/** The whole page while the route loads (app/(app)/dashboard/loading.tsx):
 * the header, the three overview tiles, the filter and a card of rows. */
export function DashboardPageSkeleton(
  // `tiles` is accepted for older callers; the tiles are always drawn.
  _props: { tiles?: boolean } = {},
) {
  void _props;

  return (
    <div className="section-stack">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-7 w-40 rounded-lg" delay={150} />
          <Skeleton className="h-3.5 w-52 rounded-full" delay={150} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {[0, 1, 2].map((index) => (
          <div
            className="flex h-24 flex-col justify-between rounded-(--radius-card) bg-(--paper) p-3.5 shadow-(--shadow-card) sm:h-[9.25rem] sm:p-5"
            key={index}
          >
            <Skeleton className="h-3.5 w-2/3 rounded-full" delay={150} />
            <Skeleton className="h-7 w-12 rounded-lg sm:h-9" delay={150} />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-72 max-w-full rounded-full" delay={150} />
      <DashboardTableSkeleton />
    </div>
  );
}
