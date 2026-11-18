"use client";

import { ArrowRightIcon } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  ACTIVITY_LOOK,
  activitySentence,
  relativeTime,
  TONE_TILE,
} from "@/components/activity/activity-words";
import { BulkActionBar } from "@/components/dashboard/dashboard-bulk";
import {
  useClientNow,
  useNewEnvelopeShortcut,
} from "@/components/dashboard/dashboard-hooks";
import {
  DocumentList,
  type ListSelection,
} from "@/components/dashboard/dashboard-list";
import {
  countRows,
  FILTER_LABELS,
  filterRows,
  needsYou,
  overviewSentence,
  toRow,
  type DocumentFilter,
} from "@/components/dashboard/dashboard-model";
import { DashboardNeedsYou } from "@/components/dashboard/dashboard-needs-you";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import {
  DocumentPager,
  DocumentSearch,
  WhoseEnvelopes,
  type DashboardPagination,
  type DashboardView,
} from "@/components/dashboard/dashboard-scope";
import {
  DashboardFirstRun,
  DashboardLoadError,
  DashboardNoResults,
} from "@/components/dashboard/dashboard-states";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { Segmented } from "@/components/ui/segmented";
import type { ActivityItem, DocumentsOverview } from "@/lib/activity";
import { cn } from "@/lib/cn";
import type { DashboardEnvelopeListItem } from "@/lib/envelopes";

export type DashboardShellState = "default" | "empty" | "error";

type DashboardShellProps = {
  envelopes?: readonly DashboardEnvelopeListItem[];
  /** The search the page was loaded with, run on the server. */
  initialSearch?: string;
  initialState?: DashboardShellState;
  /** The newest thing that happened, for the header's quiet line. */
  latestActivity?: ActivityItem | null;
  /**
   * When the page was rendered (ms). Time groups and "waiting n days" are
   * worked out from it on the server and in the browser alike, so the two
   * always agree. Defaults to the time of the first render.
   */
  now?: number;
  /** Counts beyond the list (this month, signatures in). */
  overview?: DocumentsOverview | null;
  /** Links to the newer and older pages, when the list runs past one. */
  pagination?: DashboardPagination;
  /** Drafts that are templates being made: they open the save step. */
  templateDraftIds?: readonly string[];
  /** For an administrator: their own envelopes, or everyone's. */
  view?: DashboardView;
};

/** Always offered, in this order; the rest only when something is in them. */
const CORE_FILTERS: readonly DocumentFilter[] = [
  "all",
  "waiting",
  "draft",
  "completed",
];
const OCCASIONAL_FILTERS: readonly DocumentFilter[] = [
  "expired",
  "declined",
  "voided",
];

/** How each filter reads in the "No … right now" sentence. */
const EMPTY_FILTER_WORDS: Record<DocumentFilter, string | undefined> = {
  all: undefined,
  completed: "completed documents",
  declined: "declined documents",
  draft: "drafts",
  expired: "expired documents",
  voided: "voided documents",
  waiting: "documents waiting on others",
};

/*
 * Documents, the reference screen for the calm system. One job: see
 * where your documents stand and act on the few that need you. Search and "New" live in the top bar
 * (⌘K, N), so the page carries neither.
 *
 *   header      title and the latest thing that happened (→ Activity)
 *   overview    three tiles that are also filters
 *   needs you   up to three cards, only when something needs the sender
 *   filter      a segmented control; the list slides in the direction you
 *               moved (right → from the right); "Select" on the right
 *   list        grouped by time, calm rows, the whole row opens the page;
 *               tick rows for the floating bar of bulk actions
 */
export function DashboardShell({
  envelopes: providedEnvelopes,
  initialSearch = "",
  initialState = "default",
  latestActivity = null,
  now: providedNow,
  overview = null,
  pagination,
  templateDraftIds,
  view,
}: DashboardShellProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [retrying, startRetry] = useTransition();
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const [query, setQuery] = useState(initialSearch);
  const [direction, setDirection] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [selectMode, setSelectMode] = useState(false);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  // One clock for the whole render: the server's when given.
  const [now] = useState(() => providedNow ?? Date.now());

  useNewEnvelopeShortcut();

  const templateDrafts = useMemo(
    () => new Set(templateDraftIds ?? []),
    [templateDraftIds],
  );
  const rows = useMemo(
    () =>
      initialState === "default"
        ? (providedEnvelopes ?? [])
            .filter((envelope) => !removed.has(envelope.id))
            .map((envelope) => toRow(envelope, templateDrafts))
        : [],
    [initialState, providedEnvelopes, removed, templateDrafts],
  );
  const counts = useMemo(() => countRows(rows), [rows]);
  const attention = useMemo(() => needsYou(rows, now), [rows, now]);
  const visible = useMemo(
    () => filterRows(rows, filter, query),
    [rows, filter, query],
  );
  const everyone = view === "all";
  const title = everyone ? "All envelopes" : "Documents";
  // The list itself was searched, or is a later page: "Clear" loads the
  // start again rather than only emptying the box.
  const narrowedOnServer = Boolean(initialSearch || pagination?.newerHref);
  const startHref = everyone ? "/dashboard?view=all" : "/dashboard";
  const filters = useMemo(
    () => [
      ...CORE_FILTERS,
      ...OCCASIONAL_FILTERS.filter(
        (value) => counts[value] > 0 || value === filter,
      ),
    ],
    [counts, filter],
  );
  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row.source.id)),
    [rows, selected],
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectMode(false);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  // Esc lets go of the selection (unless a tray or menu has the key).
  useEffect(() => {
    if (selected.size === 0 && !selectMode) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !target?.closest("[role='dialog'], [role='menu']")
      ) {
        clearSelection();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearSelection, selectMode, selected.size]);

  const isEmpty =
    initialState === "empty" ||
    (initialState === "default" && rows.length === 0 && !narrowedOnServer);

  function chooseFilter(next: DocumentFilter) {
    const from = filters.indexOf(filter);
    const to = filters.indexOf(next);

    setDirection(to >= from ? 1 : -1);
    setFilter(next);
  }

  function clearFilters() {
    if (narrowedOnServer) {
      router.push(startHref);
      return;
    }

    setDirection(-1);
    setFilter("all");
    setQuery("");
  }

  const whose = view ? <WhoseEnvelopes view={view} /> : undefined;

  if (initialState === "error") {
    return (
      <div className="section-stack">
        <PageHeader actions={whose} actionsInline title={title} />
        <DashboardLoadError
          onRetry={() => startRetry(() => router.refresh())}
          retrying={retrying}
        />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="section-stack">
        <PageHeader actions={whose} actionsInline title={title} />
        {everyone ? <EveryoneEmpty /> : <DashboardFirstRun />}
      </div>
    );
  }

  const travel = reduceMotion ? 0 : 20;
  const visibleIds = visible.map((row) => row.source.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));
  const selecting = selectMode || selected.size > 0;
  const selection: ListSelection = {
    active: selecting,
    rowToggles: selectMode,
    selected,
    toggle,
  };

  return (
    <div className="section-stack">
      <PageHeader
        actions={whose}
        actionsInline
        description={
          everyone ? (
            "Every envelope in your organization, whoever sent it."
          ) : latestActivity ? (
            <LatestActivity item={latestActivity} />
          ) : (
            overviewSentence(counts)
          )
        }
        title={title}
      />

      {overview && !everyone ? (
        <DashboardOverview
          filter={filter}
          onFilter={(next) => chooseFilter(filter === next ? "all" : next)}
          overview={overview}
          rows={rows}
        />
      ) : null}

      {everyone ? null : <DashboardNeedsYou items={attention} />}

      <section aria-label="All documents" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            aria-label="Show"
            className={cn(
              "min-w-0",
              // Too many to fit a phone: it scrolls; fade the edge to say so.
              filters.length > 4 &&
                "max-sm:mask-[linear-gradient(to_right,black_80%,transparent)]",
            )}
            items={filters.map((value) => ({
              label: FILTER_LABELS[value],
              value,
            }))}
            onValueChange={chooseFilter}
            value={filter}
          />
          <div className="flex w-full items-center gap-1 sm:ml-auto sm:w-auto">
            <DocumentSearch onChange={setQuery} value={query} view={view} />
            {selecting ? (
              <div className="flex shrink-0 items-center gap-1">
                <label className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-full py-2 pr-1 pl-3 text-sm font-medium text-(--secondary) transition-colors duration-(--dur-hover) hover:text-(--fg)">
                  <span className="max-sm:hidden">Select all</span>
                  <span className="sm:hidden">All</span>
                  <Checkbox
                    aria-label="Select all shown"
                    checked={
                      allVisibleSelected
                        ? true
                        : someVisibleSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={() =>
                      setSelected((current) => {
                        const next = new Set(current);

                        for (const id of visibleIds) {
                          if (allVisibleSelected) {
                            next.delete(id);
                          } else {
                            next.add(id);
                          }
                        }

                        return next;
                      })
                    }
                  />
                </label>
                {selectMode || selected.size > 0 ? (
                  <Button onClick={clearSelection} size="sm" variant="ghost">
                    Done
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button
                className="shrink-0"
                onClick={() => setSelectMode(true)}
                size="sm"
                variant="ghost"
              >
                Select
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          {/*
           * "wait", not "popLayout": the same document can be in both
           * lists, and its page carries a view-transition name that must
           * be unique. The exit is short, so the swap still reads as one.
           */}
          <AnimatePresence custom={direction} initial={false} mode="wait">
            <motion.div
              animate={{
                opacity: 1,
                transition: { duration: DUR.open, ease: EASE.out },
                x: 0,
              }}
              custom={direction}
              exit="exit"
              initial="enter"
              key={filter}
              variants={{
                enter: (travelDirection: number) => ({
                  opacity: 0,
                  x: travel * travelDirection,
                }),
                exit: (travelDirection: number) => ({
                  opacity: 0,
                  transition: {
                    duration: exitDuration(DUR.hover),
                    ease: EASE.exit,
                  },
                  x: -travel * 0.6 * travelDirection,
                }),
              }}
            >
              {visible.length > 0 ? (
                <DocumentList now={now} rows={visible} selection={selection} />
              ) : (
                <div className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
                  <DashboardNoResults
                    filterLabel={EMPTY_FILTER_WORDS[filter]}
                    onClear={clearFilters}
                    query={query}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <DocumentPager pagination={pagination} />
      </section>

      <BulkActionBar
        onClear={clearSelection}
        onRemoved={(ids) => {
          setRemoved((current) => new Set([...current, ...ids]));
          setSelected((current) => {
            const next = new Set(current);

            for (const id of ids) {
              next.delete(id);
            }

            return next;
          });
        }}
        rows={selectMode && selectedRows.length === 0 ? [] : selectedRows}
      />
    </div>
  );
}

/** Nobody in the install has started an envelope yet. */
function EveryoneEmpty() {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-(--radius-card) bg-(--paper) px-6 py-16 text-center shadow-(--shadow-card)">
      <h2 className="text-[0.9375rem] font-medium text-(--fg)">
        No envelopes yet
      </h2>
      <p className="text-sm text-(--secondary)">
        Nobody in your organization has started an envelope.
      </p>
    </div>
  );
}

/** "Just now" → "just now" mid-sentence; dates keep their capitals. */
function softCase(text: string) {
  return /^(Just|Yesterday)/.test(text)
    ? text.charAt(0).toLowerCase() + text.slice(1)
    : text;
}

/**
 * The header's quiet line: the newest thing that happened, in words, and
 * the way to everything else that did. Its time is worked out in the
 * browser (the server cannot know the viewer's clock).
 */
function LatestActivity({ item }: { item: ActivityItem }) {
  const clientNow = useClientNow();
  const look = ACTIVITY_LOOK[item.kind];
  const Icon = look.icon;

  return (
    <Link
      className="group/latest -mx-1 mt-1 inline-flex max-w-full items-center gap-2 rounded-full py-0.5 pr-2 pl-1 outline-none transition-[background-color] duration-(--dur-hover) hover:bg-(--hover) focus-visible:shadow-(--focus-ring)"
      href="/activity"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          TONE_TILE[look.tone],
        )}
      >
        <Icon className="size-3" />
      </span>
      <span className="min-w-0 max-sm:truncate sm:whitespace-nowrap">
        {activitySentence(item).map((part, index) =>
          part.emphasis ? (
            <span className="font-medium text-(--fg)" key={index}>
              {part.text}
            </span>
          ) : (
            part.text
          ),
        )}
        {clientNow ? (
          <span className="text-(--secondary)">
            {" "}
            · {softCase(relativeTime(item.at, clientNow))}
          </span>
        ) : null}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 pl-1 font-medium text-(--fg) max-sm:sr-only">
        Activity
        <ArrowRightIcon
          aria-hidden="true"
          className="size-3.5 transition-transform duration-(--dur-hover) ease-(--ease-out) group-hover/latest:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
