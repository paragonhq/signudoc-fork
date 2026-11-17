"use client";

import {
  ArrowUpIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
  RotateCcwIcon,
} from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { ActivityListSkeleton } from "@/components/activity/activity-skeleton";
import {
  ACTIVITY_LOOK,
  activitySentence,
  clockTime,
  dayLabel,
  localDayKey,
  personFor,
  TONE_TILE,
} from "@/components/activity/activity-words";
import { SignatureLineIllustration } from "@/components/illustrations/illustrations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DUR, EASE, SPRING_SOFT } from "@/components/ui/motion-tokens";
import { Segmented } from "@/components/ui/segmented";
import type {
  ActivityFilter,
  ActivityItem,
  ActivityPage,
} from "@/lib/activity";
import { cn } from "@/lib/cn";

/*
 * Activity: what happened across every
 * document you sent, newest first, grouped by day in your own time zone.
 * One calm card per day; each event is a sentence ("Riley signed Mutual
 * NDA") with a small tinted glyph on a quiet timeline thread, and opens its
 * document.
 *
 * It feels live without shouting: it checks for news every half minute
 * while the tab is visible. At the top, new events fold in; further down a
 * small pill offers them instead of moving the page under you. Whatever
 * happened since your last visit carries a violet dot.
 */

const FILTER_ITEMS: { label: string; value: ActivityFilter }[] = [
  { label: "All", value: "all" },
  { label: "Signed", value: "signed" },
  { label: "Viewed", value: "viewed" },
  { label: "Sent", value: "sent" },
  { label: "Completed", value: "completed" },
  { label: "Declined", value: "declined" },
];

const EMPTY_WORDS: Record<ActivityFilter, string> = {
  all: "Nothing has happened yet",
  completed: "Nothing completed yet",
  declined: "No one has declined",
  sent: "Nothing sent yet",
  signed: "No signatures yet",
  viewed: "No one has opened anything yet",
};

const LAST_VISIT_KEY = "signudoc:activity-last-visit";
const POLL_MS = 30_000;
/** Within this far of the top, news folds straight in. */
const NEAR_TOP = 160;

type Feed = {
  items: ActivityItem[];
  nextCursor: string | null;
  status: "error" | "loading" | "ready";
};

const subscribeNever = () => () => {};

function readLastVisit(): number | null {
  try {
    const value = Number(window.localStorage.getItem(LAST_VISIT_KEY));

    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeLastVisit(seconds: number) {
  try {
    window.localStorage.setItem(LAST_VISIT_KEY, String(seconds));
  } catch {
    // Private windows and blocked storage: no "new" dots next time.
  }
}

async function fetchActivity(params: Record<string, string>) {
  const response = await fetch(
    `/api/activity?${new URLSearchParams(params).toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  return (await response.json()) as ActivityPage;
}

export function ActivityShell({
  initialPage,
  initialState,
}: {
  initialPage: ActivityPage;
  initialState?: "error";
}) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [feeds, setFeeds] = useState<Partial<Record<ActivityFilter, Feed>>>(
    () => ({
      all: {
        items: initialPage.items,
        nextCursor: initialPage.nextCursor,
        status: "ready",
      },
    }),
  );
  const [pending, setPending] = useState<ActivityItem[]>([]);
  const [arrived, setArrived] = useState<ReadonlySet<string>>(() => new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisit, setLastVisit] = useState<number | null>(null);
  const [pulse, setPulse] = useState(0);
  const filterRef = useRef(filter);
  const feedsRef = useRef(feeds);

  // Times and days are the viewer's own: only once in the browser.
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    filterRef.current = filter;
    feedsRef.current = feeds;
  }, [feeds, filter]);

  // What counts as new: anything after the last visit. Then this visit
  // becomes the last one. Read once per mount (a ref, so a second effect
  // run in development does not read back the time it just wrote).
  const visitRead = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (visitRead.current === undefined) {
      visitRead.current = readLastVisit();
      writeLastVisit(Math.floor(Date.now() / 1000));
    }

    // Reading browser storage has to wait for the browser.
    setLastVisit(visitRead.current);
  }, []);

  const feed = feeds[filter];

  const loadFilter = useCallback(async (next: ActivityFilter) => {
    setFeeds((current) => ({
      ...current,
      [next]: { items: [], nextCursor: null, status: "loading" },
    }));

    try {
      const page = await fetchActivity({ filter: next });

      setFeeds((current) => ({
        ...current,
        [next]: { ...page, status: "ready" },
      }));
    } catch {
      setFeeds((current) => ({
        ...current,
        [next]: { items: [], nextCursor: null, status: "error" },
      }));
    }
  }, []);

  function chooseFilter(next: ActivityFilter) {
    setFilter(next);
    setPending([]);

    if (!feeds[next] || feeds[next]?.status === "error") {
      void loadFilter(next);
    }
  }

  async function loadMore() {
    if (!feed?.nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const page = await fetchActivity({ cursor: feed.nextCursor, filter });

      setFeeds((current) => {
        const existing = current[filter];
        const known = new Set(existing?.items.map((item) => item.id));

        return {
          ...current,
          [filter]: {
            items: [
              ...(existing?.items ?? []),
              ...page.items.filter((item) => !known.has(item.id)),
            ],
            nextCursor: page.nextCursor,
            status: "ready",
          },
        };
      });
    } catch {
      // The button stays; trying again is the way back.
    } finally {
      setLoadingMore(false);
    }
  }

  const mergeIn = useCallback(
    (forFilter: ActivityFilter, fresh: readonly ActivityItem[]) => {
      setFeeds((current) => {
        const existing = current[forFilter];

        if (!existing) {
          return current;
        }

        const known = new Set(existing.items.map((item) => item.id));
        const added = fresh.filter((item) => !known.has(item.id));

        return {
          ...current,
          [forFilter]: { ...existing, items: [...added, ...existing.items] },
        };
      });
      setArrived(
        (current) => new Set([...current, ...fresh.map((item) => item.id)]),
      );
    },
    [],
  );

  // Ask for news every half minute while the page is in view.
  useEffect(() => {
    if (initialState === "error") {
      return;
    }

    let cancelled = false;

    async function check() {
      if (document.visibilityState !== "visible") {
        return;
      }

      const forFilter = filterRef.current;
      const current = feedsRef.current[forFilter];

      if (!current || current.status !== "ready") {
        return;
      }

      const newest = current.items[0]?.at ?? 0;

      try {
        const page = await fetchActivity({
          filter: forFilter,
          // Same-second events are possible: ask from just before and
          // drop the ones already shown.
          since: String(Math.max(0, newest - 1)),
        });

        if (cancelled || forFilter !== filterRef.current) {
          return;
        }

        const known = new Set(current.items.map((item) => item.id));
        const fresh = page.items.filter((item) => !known.has(item.id));

        setNow(Date.now());
        setPulse((value) => value + 1);

        if (fresh.length === 0) {
          return;
        }

        if (window.scrollY < NEAR_TOP) {
          mergeIn(forFilter, fresh);
        } else {
          setPending((existing) => {
            const seen = new Set(existing.map((item) => item.id));

            return [...fresh.filter((item) => !seen.has(item.id)), ...existing];
          });
        }
      } catch {
        // Quietly try again next time.
      }
    }

    const timer = window.setInterval(() => void check(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void check();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initialState, mergeIn]);

  function showPending() {
    mergeIn(filter, pending);
    setPending([]);
    window.scrollTo({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      top: 0,
    });
  }

  const newSinceVisit = useMemo(
    () =>
      lastVisit === null
        ? 0
        : (feeds.all?.items.filter((item) => item.at > lastVisit).length ?? 0),
    [feeds.all, lastVisit],
  );

  if (initialState === "error") {
    return (
      <div className="section-stack">
        <PageHeader title="Activity" />
        <div role="alert">
          <EmptyState
            action={
              <Button
                loading={retrying}
                onClick={() => startRetry(() => router.refresh())}
                variant="outline"
              >
                <RotateCcwIcon aria-hidden="true" />
                Try again
              </Button>
            }
            description="Your documents are safe. Check your connection and try again."
            icon={<ClockIcon />}
            title="We couldn’t load your activity"
          />
        </div>
      </div>
    );
  }

  const firstRun =
    filter === "all" && feed?.status === "ready" && feed.items.length === 0;

  return (
    <div className="section-stack">
      <PageHeader
        actions={<LiveBadge pulse={pulse} />}
        actionsInline
        description={
          newSinceVisit > 0 ? (
            <>
              <span className="font-medium text-(--accent-ink)">
                {newSinceVisit} new
              </span>{" "}
              since your last visit
            </>
          ) : (
            "What happened on the documents you send, as it happens."
          )
        }
        title="Activity"
      />

      {firstRun ? (
        <ActivityFirstRun />
      ) : (
        <section aria-label="Activity" className="flex flex-col gap-5">
          <Segmented
            aria-label="Show"
            className="self-start max-sm:mask-[linear-gradient(to_right,black_82%,transparent)]"
            items={FILTER_ITEMS}
            onValueChange={chooseFilter}
            value={filter}
          />

          <PendingPill count={pending.length} onShow={showPending} />

          {!mounted || !feed || feed.status === "loading" ? (
            <ActivityListSkeleton />
          ) : feed.status === "error" ? (
            <div className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
              <EmptyState
                action={
                  <Button
                    onClick={() => void loadFilter(filter)}
                    size="sm"
                    variant="outline"
                  >
                    <RotateCcwIcon aria-hidden="true" />
                    Try again
                  </Button>
                }
                description="Check your connection and try again."
                icon={<ClockIcon />}
                role="alert"
                size="compact"
                title="This list couldn’t load"
              />
            </div>
          ) : feed.items.length === 0 ? (
            <div className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
              <EmptyState
                action={
                  <Button
                    onClick={() => chooseFilter("all")}
                    size="sm"
                    variant="outline"
                  >
                    Show everything
                  </Button>
                }
                description="It will show up here the moment it happens."
                icon={<ClockIcon />}
                size="compact"
                title={EMPTY_WORDS[filter]}
              />
            </div>
          ) : (
            <>
              <ActivityDays
                arrived={arrived}
                items={feed.items}
                lastVisit={lastVisit}
                now={now}
              />
              <div className="flex justify-center pt-2">
                {feed.nextCursor ? (
                  <Button
                    loading={loadingMore}
                    onClick={() => void loadMore()}
                    variant="outline"
                  >
                    Show earlier
                  </Button>
                ) : (
                  <p className="text-[0.8125rem] text-(--secondary)">
                    That’s everything.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

/** "Live": a green dot that breathes once each time the page checks in. */
function LiveBadge({ pulse }: { pulse: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <span
      className="inline-flex h-8 items-center gap-2 rounded-full bg-(--paper) px-3 text-[0.8125rem] font-medium text-(--secondary) shadow-(--ring-soft)"
      title="Checks for news every 30 seconds"
    >
      <span aria-hidden="true" className="relative flex size-2">
        {pulse > 0 && !reduceMotion ? (
          <motion.span
            animate={{ opacity: 0, scale: 2.8 }}
            className="absolute inset-0 rounded-full bg-(--success-dot)"
            initial={{ opacity: 0.55, scale: 1 }}
            key={pulse}
            transition={{ duration: 1.2, ease: EASE.out }}
          />
        ) : null}
        <span className="relative size-2 rounded-full bg-(--success-dot)" />
      </span>
      Live
    </span>
  );
}

/** News that arrived while you were reading further down. */
function PendingPill({ count, onShow }: { count: number; onShow: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none sticky top-20 z-20 -mb-5 flex h-0 justify-center"
    >
      <AnimatePresence>
        {count > 0 ? (
          <motion.button
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-(--accent) pr-4 pl-3 text-sm font-medium text-(--on-accent) shadow-(--shadow-pop) outline-none transition-[background-color,scale] duration-(--dur-hover) hover:bg-(--accent-hover) active:scale-[0.97] focus-visible:shadow-(--focus-ring)"
            exit={{ opacity: 0, scale: 0.96, y: reduceMotion ? 0 : -6 }}
            initial={{ opacity: 0, scale: 0.96, y: reduceMotion ? 0 : -8 }}
            onClick={onShow}
            transition={reduceMotion ? { duration: DUR.hover } : SPRING_SOFT}
            type="button"
          >
            <ArrowUpIcon aria-hidden="true" className="size-4" />
            {count === 1 ? "1 new event" : `${String(count)} new events`}
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ActivityDays({
  arrived,
  items,
  lastVisit,
  now,
}: {
  arrived: ReadonlySet<string>;
  items: readonly ActivityItem[];
  lastVisit: number | null;
  now: number;
}) {
  const days = useMemo(() => {
    const groups: { items: ActivityItem[]; key: string; label: string }[] = [];

    for (const item of items) {
      const key = localDayKey(item.at);
      const last = groups.at(-1);

      if (last && last.key === key) {
        last.items.push(item);
      } else {
        groups.push({ items: [item], key, label: dayLabel(item.at, now) });
      }
    }

    return groups;
  }, [items, now]);

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => (
        <section
          aria-labelledby={`activity-${day.key}`}
          className="flex flex-col gap-2.5"
          key={day.key}
        >
          <h2
            className="px-1 text-[0.8125rem] leading-5 font-medium text-(--secondary)"
            id={`activity-${day.key}`}
          >
            {day.label}
          </h2>
          <ol className="overflow-hidden rounded-(--radius-card) bg-(--paper) py-1.5 shadow-(--shadow-card)">
            <AnimatePresence initial={false}>
              {day.items.map((item, index) => (
                <motion.li
                  animate={{ height: "auto", opacity: 1 }}
                  className="relative"
                  initial={
                    arrived.has(item.id) ? { height: 0, opacity: 0 } : false
                  }
                  key={item.id}
                  transition={{ duration: DUR.panel, ease: EASE.out }}
                >
                  <ActivityRow
                    isFirst={index === 0}
                    isLast={index === day.items.length - 1}
                    isNew={
                      arrived.has(item.id) ||
                      (lastVisit !== null && item.at > lastVisit)
                    }
                    item={item}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </section>
      ))}
    </div>
  );
}

function ActivityRow({
  isFirst,
  isLast,
  isNew,
  item,
}: {
  isFirst: boolean;
  isLast: boolean;
  isNew: boolean;
  item: ActivityItem;
}) {
  const look = ACTIVITY_LOOK[item.kind];
  const Icon = look.icon;
  const person = personFor(item);
  const detail =
    item.reason !== null
      ? `“${item.reason}”`
      : item.kind === "completed"
        ? "The signed PDF and its certificate are ready"
        : item.actorName && item.actorEmail && item.actorEmail !== person
          ? item.actorEmail
          : null;

  return (
    <Link
      className={cn(
        "group/row relative isolate mx-1.5 flex items-start gap-3.5 rounded-[0.875rem] px-2.5 py-3 outline-none sm:gap-4 sm:px-3.5",
        "transition-[background-color] duration-(--dur-hover) ease-(--ease-out)",
        "hover:bg-(--hover) active:bg-(--press) focus-visible:bg-(--hover) focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--accent-rgb)/0.45)]",
      )}
      data-new={isNew ? "" : undefined}
      href={`/envelopes/${encodeURIComponent(item.envelopeId)}`}
    >
      {isNew ? <ArrivalGlow /> : null}
      {/* The thread that ties the day's events together. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-[calc(0.625rem+1.125rem-0.5px)] w-px bg-(--divider) sm:left-[calc(0.875rem+1.125rem-0.5px)]",
          isFirst ? "top-1/2" : "-top-1.5",
          isLast ? "bottom-1/2" : "-bottom-1.5",
          isFirst && isLast && "hidden",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full shadow-[0_0_0_4px_var(--paper)] transition-[scale] duration-(--dur-move) ease-(--ease-spring) group-hover/row:scale-105 motion-reduce:group-hover/row:scale-100",
          TONE_TILE[look.tone],
        )}
      >
        <Icon className="size-4" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <span className="text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
          {activitySentence(item).map((part, index) =>
            part.emphasis ? (
              <span className="font-medium text-(--fg)" key={index}>
                {part.text}
              </span>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </span>
        {detail ? (
          <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
            {detail}
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 items-center gap-1.5 pt-1">
        {isNew ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-(--accent-ink)">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-(--accent)"
            />
            <span className="max-sm:sr-only">New</span>
          </span>
        ) : null}
        <time
          className="text-[0.8125rem] leading-5 text-(--secondary) tabular-nums"
          dateTime={new Date(item.at * 1000).toISOString()}
        >
          {clockTime(item.at)}
        </time>
        <ChevronRightIcon
          aria-hidden="true"
          className="-mr-1 hidden size-4 text-(--secondary) opacity-0 transition-[opacity,translate] duration-(--dur-hover) ease-(--ease-out) group-hover/row:translate-x-0.5 group-hover/row:opacity-100 group-focus-visible/row:opacity-100 sm:pointer-fine:block"
        />
      </span>
    </Link>
  );
}

/**
 * New since your last visit: the row starts faintly violet and lets the
 * tint go once you have had a moment to see it; the "New" dot stays.
 */
function ArrivalGlow() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return null;
  }

  return (
    <motion.span
      animate={{ opacity: 0 }}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-[rgb(var(--accent-rgb)/0.07)]"
      initial={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 2.4, ease: EASE.out }}
    />
  );
}

/** Nothing has happened yet: what this page is for, and how to fill it. */
function ActivityFirstRun() {
  return (
    <section
      aria-labelledby="activity-first-run"
      className="flex flex-col items-center gap-8 rounded-(--radius-card) bg-(--paper) px-6 py-14 text-center shadow-(--shadow-card) sm:py-20"
    >
      <SignatureLineIllustration className="w-52 sm:w-60" />
      <div className="flex max-w-md flex-col gap-2">
        <h2
          className="text-xl leading-7 font-semibold tracking-[-0.02em] text-(--fg)"
          id="activity-first-run"
        >
          Nothing has happened yet
        </h2>
        <p className="text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
          Send a document and every open, signature and reminder shows up here
          as it happens.
        </p>
      </div>
      <Button asChild className="max-sm:h-12">
        <Link href="/envelopes/new">
          <PlusIcon aria-hidden="true" />
          New envelope
        </Link>
      </Button>
    </section>
  );
}
