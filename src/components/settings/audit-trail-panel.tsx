"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Download,
  LogIn,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  type IconComponent,
} from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";
import {
  CARD_DIVIDERS,
  CardNotice,
  GENERIC_ERROR_MESSAGE,
  Notice,
  SettingsSection,
  isAbortError,
} from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemAuditEvent } from "@/lib/services/system-audit";

// The install's own audit trail, as a calm list in day groups: who signed
// in (or failed to), changes to how people sign in, and changes to
// settings, roles, the logo, identity confirmations and signing locks.
// Every record is chained to the one before by a hash; one quiet sentence
// says whether the chain holds. Sequence numbers and IP addresses are in
// the CSV.

type AuditResponse = {
  chain?:
    | { events: number; ok: true }
    | { brokenAtSequence: number; events: number; ok: false };
  error?: string;
  events?: SystemAuditEvent[];
} | null;

type Category = "all" | "sign-in" | "security" | "changes";

const PAGE_SIZE = 10;

const EVENT_LABELS: Record<SystemAuditEvent["event"], string> = {
  account_closure_requested: "Account closure requested",
  account_deleted: "Account deleted",
  email_domain_changed: "Email domain changed",
  envelope_deleted: "Finished envelope deleted",
  envelope_file_downloaded: "Another member's file downloaded",
  identity_verification_revoked: "Identity confirmation taken back",
  identity_verified: "Identity confirmed",
  logo_changed: "Logo changed",
  part11_mode_changed: "Part 11 mode changed",
  password_changed: "Password changed",
  password_reset: "Password reset by email link",
  reauthentication_failed: "Wrong password while signing",
  role_changed: "Role changed",
  settings_changed: "Settings changed",
  sign_in_failed: "Sign-in failed",
  sign_in_locked: "Sign-in stopped after wrong passwords",
  sign_in_succeeded: "Signed in",
  sessions_revoked: "Signed out everywhere",
  signed_out: "Signed out",
  signing_locked: "Signing locked",
  signing_unlocked: "Signing unlocked",
  two_factor_backup_codes_regenerated: "New backup codes made",
  two_factor_disabled: "Two-step sign-in turned off",
  two_factor_enabled: "Two-step sign-in turned on",
  two_factor_requirement_changed: "Two-step sign-in requirement changed",
  two_factor_reset: "Two-step sign-in reset by an administrator",
};

const SIGN_IN_FAILURE_REASONS: Record<string, string> = {
  ACCOUNT_TEMPORARILY_LOCKED: "second step locked after wrong codes",
  EMAIL_NOT_VERIFIED: "email address not confirmed yet",
  INVALID_BACKUP_CODE: "wrong backup code",
  INVALID_CODE: "wrong authenticator code",
  INVALID_EMAIL_OR_PASSWORD: "wrong email or password",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "too many wrong codes, signed out",
};

const SIGN_IN_EVENTS = new Set<SystemAuditEvent["event"]>([
  "reauthentication_failed",
  "sessions_revoked",
  "sign_in_failed",
  "sign_in_locked",
  "sign_in_succeeded",
  "signed_out",
]);

const CHANGE_EVENTS = new Set<SystemAuditEvent["event"]>([
  "email_domain_changed",
  "logo_changed",
  "part11_mode_changed",
  "settings_changed",
  "two_factor_requirement_changed",
]);

const WARNING_EVENTS = new Set<SystemAuditEvent["event"]>([
  "account_closure_requested",
  "account_deleted",
  "envelope_deleted",
  "reauthentication_failed",
  "sign_in_failed",
  "sign_in_locked",
  "signing_locked",
  "two_factor_disabled",
  "two_factor_reset",
]);

function categoryOf(event: SystemAuditEvent): Exclude<Category, "all"> {
  if (SIGN_IN_EVENTS.has(event.event)) {
    return "sign-in";
  }

  return CHANGE_EVENTS.has(event.event) ? "changes" : "security";
}

const DOWNLOADED_FILE_LABELS: Record<string, string> = {
  audit_trail: "audit trail",
  evidence: "certificate",
  signed: "signed PDF",
};

function describeEvent(event: SystemAuditEvent): string {
  const metadata = event.metadata ?? {};
  const target =
    typeof metadata.targetName === "string"
      ? `${metadata.targetName}${typeof metadata.targetEmail === "string" ? ` <${metadata.targetEmail}>` : ""}`
      : null;

  switch (event.event) {
    case "envelope_deleted":
      return [
        typeof metadata.title === "string" ? `"${metadata.title}"` : null,
        typeof metadata.status === "string" ? metadata.status : null,
        typeof metadata.reason === "string" && metadata.reason
          ? metadata.reason
          : null,
        typeof metadata.ownerEmail === "string"
          ? `sent by ${metadata.ownerEmail}`
          : null,
      ]
        .filter(Boolean)
        .join(", ");
    case "envelope_file_downloaded":
      return [
        typeof metadata.file === "string"
          ? (DOWNLOADED_FILE_LABELS[metadata.file] ?? metadata.file)
          : null,
        typeof metadata.ownerEmail === "string"
          ? `sent by ${metadata.ownerEmail}`
          : null,
      ]
        .filter(Boolean)
        .join(", ");
    case "part11_mode_changed":
    case "two_factor_requirement_changed":
      return metadata.to === true ? "Turned on" : "Turned off";
    case "role_changed":
      return `${target ?? "Account"}: ${String(metadata.from)} to ${String(metadata.to)}`;
    case "settings_changed":
      return typeof metadata.changes === "object" && metadata.changes
        ? Object.keys(metadata.changes).join(", ")
        : "";
    case "identity_verified":
      return `${target ?? ""}${typeof metadata.note === "string" ? `: ${metadata.note}` : ""}`;
    case "reauthentication_failed":
    case "signing_locked":
      return typeof metadata.failedAttempts === "number"
        ? `${String(metadata.failedAttempts)} wrong in a row`
        : "";
    case "sign_in_failed":
      return typeof metadata.reason === "string"
        ? (SIGN_IN_FAILURE_REASONS[metadata.reason] ?? metadata.reason)
        : "";
    case "sign_in_succeeded":
      return metadata.secondStep === "backup_code"
        ? "with a backup code"
        : metadata.secondStep === "authenticator"
          ? "with an authenticator code"
          : "";
    case "logo_changed":
      return metadata.action === "removed" ? "Removed" : "Replaced";
    case "email_domain_changed":
      return typeof metadata.domain === "string" ? metadata.domain : "";
    default:
      return target ?? "";
  }
}

const CATEGORY_ORDER: Category[] = ["all", "sign-in", "security", "changes"];

const CATEGORY_TILES: Record<
  Exclude<Category, "all"> | "warning",
  { className: string; icon: IconComponent }
> = {
  changes: {
    className: "bg-(--surface-strong) text-(--secondary-strong)",
    icon: SlidersHorizontal,
  },
  security: {
    className: "bg-(--signer-4-tint) text-(--signer-4)",
    icon: ShieldCheck,
  },
  "sign-in": {
    className: "bg-(--signer-1-tint) text-(--signer-1)",
    icon: LogIn,
  },
  warning: {
    className: "bg-(--danger-soft) text-(--danger)",
    icon: ShieldAlert,
  },
};

function dayKey(seconds: number) {
  const date = new Date(seconds * 1000);

  return `${String(date.getFullYear())}-${String(date.getMonth())}-${String(date.getDate())}`;
}

function dayLabel(seconds: number, now: Date) {
  const date = new Date(seconds * 1000);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((today.getTime() - that.getTime()) / 86_400_000);

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    weekday: "long",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

function timeOfDay(seconds: number) {
  return new Date(seconds * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The same thing by the same person in a row, on the same day, is one
 * line ("Signed in · 6 times"). The CSV keeps every record.
 */
function collapseRuns(events: readonly SystemAuditEvent[]) {
  const runs: SystemAuditEvent[][] = [];

  for (const event of events) {
    const run = runs.at(-1);
    const previous = run?.[0];

    if (
      run &&
      previous &&
      previous.event === event.event &&
      previous.actorEmail === event.actorEmail &&
      dayKey(previous.createdAt) === dayKey(event.createdAt) &&
      describeEvent(previous) === describeEvent(event)
    ) {
      run.push(event);
    } else {
      runs.push([event]);
    }
  }

  return runs;
}

/** Lines in day groups: Today, Yesterday, then dates. */
function groupByDay(runs: readonly SystemAuditEvent[][]) {
  const groups: { key: string; runs: SystemAuditEvent[][] }[] = [];

  for (const run of runs) {
    const key = dayKey(run[0].createdAt);
    const group = groups.at(-1);

    if (group && group.key === key) {
      group.runs.push(run);
    } else {
      groups.push({ key, runs: [run] });
    }
  }

  return groups;
}

export function AuditTrailPanel({
  revision = 0,
}: {
  /** Bumped by the page when something it saved should show up here. */
  revision?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [audit, setAudit] = useState<AuditResponse>(null);
  const [refreshes, setRefreshes] = useState(0);
  // Which request the data on screen answers; loading until it is this one.
  const requestKey = `${String(revision)}:${String(refreshes)}`;
  const [answered, setAnswered] = useState<string | null>(null);
  const loading = answered !== requestKey;
  const [category, setCategory] = useState<Category>("all");
  const [direction, setDirection] = useState(1);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/audit", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => null)) as AuditResponse;

        setAudit(
          response.ok
            ? payload
            : { error: payload?.error ?? GENERIC_ERROR_MESSAGE },
        );
        setAnswered(requestKey);
      })
      .catch((loadError: unknown) => {
        if (!isAbortError(loadError)) {
          setAudit({ error: GENERIC_ERROR_MESSAGE });
          setAnswered(requestKey);
        }
      });

    return () => controller.abort();
  }, [requestKey]);

  const events = useMemo(() => audit?.events ?? [], [audit]);
  const filtered = useMemo(
    () =>
      category === "all"
        ? events
        : events.filter((event) => categoryOf(event) === category),
    [category, events],
  );
  const runs = useMemo(() => collapseRuns(filtered), [filtered]);
  const groups = useMemo(() => groupByDay(runs.slice(0, shown)), [runs, shown]);
  const firstLoad = loading && audit === null;
  // One clock for the day labels, set when the panel first draws.
  const [now] = useState(() => new Date());
  const travel = reduceMotion ? 0 : 20;

  function chooseCategory(next: Category) {
    setDirection(
      CATEGORY_ORDER.indexOf(next) >= CATEGORY_ORDER.indexOf(category) ? 1 : -1,
    );
    setCategory(next);
    setShown(PAGE_SIZE);
  }

  return (
    <SettingsSection
      actions={
        <>
          <IconButton
            aria-label="Refresh"
            disabled={loading}
            onClick={() => setRefreshes((value) => value + 1)}
            size="sm"
          >
            <RotateCw
              aria-hidden="true"
              className={
                loading ? "animate-spin motion-reduce:animate-none" : undefined
              }
            />
          </IconButton>
          <Button asChild size="sm" variant="outline">
            <a href="/api/admin/audit?format=csv">
              <Download aria-hidden="true" />
              <span className="max-sm:hidden">Download as CSV</span>
              <span className="sm:hidden">CSV</span>
            </a>
          </Button>
        </>
      }
      description="Sign-ins and changes on this site. Each envelope keeps its own trail too."
      id="audit-trail"
      title="Audit trail"
    >
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
        <Segmented
          aria-label="Filter the audit trail"
          className="self-start"
          items={[
            { label: "All", value: "all" },
            { label: "Sign-ins", value: "sign-in" },
            { label: "Security", value: "security" },
            { label: "Changes", value: "changes" },
          ]}
          onValueChange={chooseCategory}
          size="sm"
          value={category}
        />
        <ChainStatus chain={audit?.chain} loading={firstLoad} />
      </div>

      {audit?.error ? (
        <CardNotice>
          <Notice
            action={
              <Button
                onClick={() => setRefreshes((value) => value + 1)}
                size="sm"
                variant="outline"
              >
                Try again
              </Button>
            }
            role="alert"
            tone="danger"
          >
            {audit.error}
          </Notice>
        </CardNotice>
      ) : null}

      <div
        aria-busy={loading || undefined}
        aria-label="Site audit trail"
        className="relative overflow-hidden"
        role="region"
      >
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <motion.div
            animate={{
              opacity: 1,
              transition: { duration: DUR.open, ease: EASE.out },
              x: 0,
            }}
            custom={direction}
            exit="exit"
            initial="enter"
            key={category}
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
            {firstLoad ? (
              <AuditSkeleton />
            ) : !audit?.error && filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
                <p className="text-[0.9375rem] font-medium text-(--fg)">
                  Nothing recorded yet.
                </p>
                <p className="text-[0.8125rem] text-(--secondary)">
                  {category === "all"
                    ? "Sign-ins and changes appear here as they happen."
                    : "Nothing of this kind in the latest events."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col pb-2">
                {groups.map((group) => (
                  <section
                    aria-label={dayLabel(group.runs[0][0].createdAt, now)}
                    className="flex flex-col"
                    key={group.key}
                  >
                    <h4 className="px-4 pt-3 pb-1 text-[0.8125rem] leading-5 font-medium text-(--secondary) sm:px-5">
                      {dayLabel(group.runs[0][0].createdAt, now)}
                    </h4>
                    <ul className={cn("flex flex-col", CARD_DIVIDERS)}>
                      {group.runs.map((run) => (
                        <AuditRow key={run[0].id} run={run} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {runs.length > PAGE_SIZE ? (
        <div className="flex items-center justify-center px-4 py-3 sm:px-5">
          {shown < runs.length ? (
            <Button
              onClick={() => setShown((value) => value + PAGE_SIZE * 2)}
              size="sm"
              variant="ghost"
            >
              Show more
            </Button>
          ) : (
            <p className="text-[0.8125rem] text-(--secondary)">
              That is the latest. The CSV has every record.
            </p>
          )}
        </div>
      ) : null}
    </SettingsSection>
  );
}

function AuditRow({ run }: { run: SystemAuditEvent[] }) {
  const event = run[0];
  const detail = describeEvent(event);
  const warn = WARNING_EVENTS.has(event.event);
  const tile = CATEGORY_TILES[warn ? "warning" : categoryOf(event)];
  const Icon = tile.icon;
  const secondary = [
    detail,
    event.actorEmail,
    run.length > 1 ? `${String(run.length)} times` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className="flex min-h-14 items-center gap-3.5 px-4 py-2.5 sm:px-5"
      title={event.ipAddress ? `From ${event.ipAddress}` : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-[0.625rem]",
          tile.className,
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm leading-5 font-medium text-(--fg)">
          {EVENT_LABELS[event.event] ?? event.event}
        </p>
        {secondary ? (
          <p className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
            {secondary}
          </p>
        ) : null}
      </div>
      <time
        className="shrink-0 text-[0.8125rem] text-(--secondary) tabular-nums"
        dateTime={new Date(event.createdAt * 1000).toISOString()}
      >
        {timeOfDay(event.createdAt)}
      </time>
    </li>
  );
}

function AuditSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1 px-4 py-3 sm:px-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="flex min-h-14 items-center gap-3.5" key={index}>
          <Skeleton className="size-8 rounded-[0.625rem]" delay={150} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-40" delay={150} />
            <Skeleton className="h-3 w-56 max-w-full" delay={150} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Whether the chain holds, as one quiet sentence. */
function ChainStatus({
  chain,
  loading,
}: {
  chain: NonNullable<AuditResponse>["chain"];
  loading: boolean;
}) {
  if (loading || !chain) {
    return null;
  }

  if (chain.ok) {
    return (
      <p
        className="flex items-start gap-2 text-[0.8125rem] leading-5 text-(--secondary)"
        role="status"
      >
        <CircleCheck
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-(--success)"
          strokeWidth={1.75}
        />
        {chain.events === 1
          ? "The one event checks out: nothing was changed or removed."
          : `All ${String(chain.events)} events check out: nothing was changed or removed.`}
      </p>
    );
  }

  return (
    <p
      className="flex items-start gap-2 text-[0.8125rem] leading-5 font-medium text-(--danger)"
      role="status"
    >
      <CircleAlert
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.75}
      />
      {`Event ${String(chain.brokenAtSequence)} does not check out: a record was changed or removed.`}
    </p>
  );
}
