"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** An administrator's Documents: their own envelopes, or everyone's. */
export type DashboardView = "all" | "mine";

/** Links to the pages before and after this one, when there are any. */
export type DashboardPagination = {
  newerHref?: string;
  olderHref?: string;
};

/**
 * Mine / Everyone's, for administrators. Each is its own page (a link,
 * not a toggle), so the same pill track as Segmented with the paper
 * thumb drawn on the current one.
 */
export function WhoseEnvelopes({ view }: { view: DashboardView }) {
  const items = [
    { href: "/dashboard", label: "Mine", value: "mine" },
    { href: "/dashboard?view=all", label: "Everyone's", value: "all" },
  ] as const;

  return (
    <nav
      aria-label="Whose envelopes"
      className="inline-flex h-(--control-h-sm) shrink-0 items-stretch gap-0.5 rounded-full bg-(--track) p-0.75 shadow-(--shadow-well)"
    >
      {items.map((item) => {
        const current = item.value === view;

        return (
          <Link
            aria-current={current ? "page" : undefined}
            className={cn(
              "tactile inline-flex items-center rounded-full px-3 text-[0.8125rem] font-medium whitespace-nowrap outline-none [--press-scale:0.96]",
              "transition-[color,background-color,box-shadow] duration-(--dur-hover) ease-(--ease-out)",
              "focus-visible:shadow-(--focus-ring)",
              current
                ? "bg-(--paper) text-(--fg) shadow-(--shadow-thumb)"
                : "text-(--secondary) hover:text-(--fg)",
            )}
            href={item.href}
            key={item.value}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Typing narrows what is on this page at once; Enter searches every
 * envelope on the server, not only the ones loaded here.
 */
export function DocumentSearch({
  onChange,
  value,
  view,
}: {
  onChange: (value: string) => void;
  value: string;
  view?: DashboardView;
}) {
  return (
    <form
      action="/dashboard"
      className="min-w-0 flex-1 sm:w-56 sm:flex-none"
      method="get"
      role="search"
    >
      {view === "all" ? <input name="view" type="hidden" value="all" /> : null}
      <label
        className={cn(
          "group/search flex h-(--control-h-sm) items-center gap-2 rounded-full bg-(--track) px-3 text-(--secondary) shadow-(--shadow-well)",
          "transition-[background-color,box-shadow] duration-(--dur-hover) ease-(--ease-out)",
          "focus-within:bg-(--paper) focus-within:shadow-(--focus-ring-input)",
        )}
      >
        <SearchIcon aria-hidden="true" className="size-3.5 shrink-0" />
        <input
          aria-label="Search by title or email..."
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[0.8125rem] text-(--fg) outline-none placeholder:text-(--placeholder) pointer-coarse:text-base [&::-webkit-search-cancel-button]:hidden"
          name="q"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value)
          }
          placeholder="Search title or email"
          spellCheck={false}
          type="search"
          value={value}
        />
      </label>
    </form>
  );
}

/** Newer and Older, when the list runs past one page. */
export function DocumentPager({
  pagination,
}: {
  pagination?: DashboardPagination;
}) {
  if (!pagination?.newerHref && !pagination?.olderHref) {
    return null;
  }

  return (
    <nav aria-label="Pages" className="flex items-center justify-end gap-2">
      {pagination.newerHref ? (
        <Button asChild size="sm" variant="outline">
          <Link href={pagination.newerHref}>
            <ChevronLeft aria-hidden="true" />
            Newer
          </Link>
        </Button>
      ) : null}
      {pagination.olderHref ? (
        <Button asChild size="sm" variant="outline">
          <Link href={pagination.olderHref}>
            Older
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      ) : null}
    </nav>
  );
}
