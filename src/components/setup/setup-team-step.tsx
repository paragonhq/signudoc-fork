"use client";

import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  StepHeading,
  useSetupReducedMotion,
} from "@/components/setup/setup-parts";
import { CircleAlert, X } from "@/components/ui/icons";
import { DUR, EASE, SPRING_SETTLE } from "@/components/ui/motion-tokens";
import { fieldControlClassName } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import type { SignupMode, SignupPolicy } from "@/lib/signup-policy";
import {
  MAX_INVITATIONS_PER_REQUEST,
  inviteeSignupProblem,
  parseInviteeList,
} from "@/lib/team-invitation-rules";

/*
 * Optional: teammates' addresses as chips (typed, or a pasted list), and
 * who may create an account here. Anyone the chosen rule would turn away
 * is marked before anything is sent, with the reason.
 */

export type Invitee = {
  /** What was typed, lower-cased when it is an address. */
  value: string;
  valid: boolean;
};

export type InviteeProblem = { message: string; value: string };

/** Adds what was typed or pasted to the list, skipping repeats. */
export function addInvitees(current: Invitee[], typed: string): Invitee[] {
  const { emails, invalid } = parseInviteeList(typed);
  const seen = new Set(current.map((invitee) => invitee.value));
  const next = [...current];

  for (const value of emails) {
    if (!seen.has(value)) {
      seen.add(value);
      next.push({ valid: true, value });
    }
  }

  for (const value of invalid) {
    if (!seen.has(value)) {
      seen.add(value);
      next.push({ valid: false, value });
    }
  }

  return next;
}

/** Each invitee that cannot be invited as things stand, and why. */
export function findInviteeProblems(
  invitees: readonly Invitee[],
  policy: SignupPolicy,
): InviteeProblem[] {
  return invitees.flatMap((invitee) => {
    if (!invitee.valid) {
      return [{ message: "Not an email address", value: invitee.value }];
    }

    const problem = inviteeSignupProblem(invitee.value, policy);

    return problem ? [{ message: problem, value: invitee.value }] : [];
  });
}

/** "a, b and 2 more", short enough for one line. */
function listNames(values: readonly string[]): string {
  if (values.length <= 2) {
    return values.join(" and ");
  }

  return `${values.slice(0, 2).join(", ")} and ${String(values.length - 2)} more`;
}

export function SetupTeamStep({
  disabled,
  domains,
  draft,
  error,
  hosted,
  invitees,
  onDraftChange,
  onInviteesChange,
  onSignupModeChange,
  signupMode,
}: {
  disabled: boolean;
  /** The domains "People at my organization" means. Empty hides that choice. */
  domains: readonly string[];
  draft: string;
  error: string | null;
  hosted: boolean;
  invitees: Invitee[];
  onDraftChange: (value: string) => void;
  onInviteesChange: (invitees: Invitee[]) => void;
  onSignupModeChange: (mode: SignupMode) => void;
  signupMode: SignupMode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useSetupReducedMotion();
  const labelId = useId();
  const hintId = useId();
  const policy: SignupPolicy = {
    allowedEmailDomains: domains,
    signupMode,
  };
  const problems = findInviteeProblems(invitees, policy);
  const problemFor = new Map(
    problems.map((problem) => [problem.value, problem.message]),
  );
  const tooMany = invitees.length > MAX_INVITATIONS_PER_REQUEST;
  const domainLabel =
    domains.length === 1 ? `@${domains[0]}` : "My organization";
  const modeItems = [
    ...(domains.length > 0
      ? [{ label: domainLabel, value: "domains" as const }]
      : []),
    { label: "Anyone", value: "open" as const },
    { label: "Nobody new", value: "closed" as const },
  ];
  const modeDescription =
    signupMode === "domains"
      ? domains.length === 1
        ? `Anyone with an @${domains[0]} address can create an account.`
        : `People at ${domains.map((domain) => `@${domain}`).join(", ")} can create an account.`
      : signupMode === "open"
        ? "Anyone who finds this site can create an account."
        : "Nobody new can create an account, invited or not.";

  function commitDraft() {
    if (draft.trim()) {
      onInviteesChange(addInvitees(invitees, draft));
      onDraftChange("");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      (event.key === "Enter" || event.key === "," || event.key === ";") &&
      draft.trim()
    ) {
      // Enter with something typed adds it; with nothing typed it moves on.
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === "Backspace" && draft === "" && invitees.length > 0) {
      event.preventDefault();
      onInviteesChange(invitees.slice(0, -1));
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");

    if (/[\s,;]/.test(text.trim())) {
      event.preventDefault();
      onInviteesChange(addInvitees(invitees, `${draft} ${text}`));
      onDraftChange("");
    }
  }

  function remove(value: string) {
    onInviteesChange(invitees.filter((invitee) => invitee.value !== value));
    inputRef.current?.focus();
  }

  const notAddresses = problems
    .filter((problem) => problem.message === "Not an email address")
    .map((problem) => problem.value);
  const turnedAway = problems
    .filter((problem) => problem.message !== "Not an email address")
    .map((problem) => problem.value);
  const summary = tooMany
    ? `Up to ${String(MAX_INVITATIONS_PER_REQUEST)} at a time. Invite the rest from Settings later.`
    : [
        notAddresses.length > 0
          ? `${listNames(notAddresses)} ${notAddresses.length === 1 ? "is not an email address" : "are not email addresses"}.`
          : null,
        turnedAway.length > 0
          ? signupMode === "closed"
            ? "Nobody new can create an account, so these invitations could not be used. Choose who can join below."
            : `${listNames(turnedAway)} could not create an account under this rule. Remove ${turnedAway.length === 1 ? "it" : "them"}, or choose Anyone below.`
          : null,
      ]
        .filter(Boolean)
        .join(" ") || null;
  const message = error ?? summary;

  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        description="They get an email with a link to create their account."
        title="Invite your team"
      />

      <div className="flex flex-col gap-1.5">
        <label
          className="text-sm leading-5 font-medium text-(--fg)"
          htmlFor={`${labelId}-input`}
          id={labelId}
        >
          Teammates&apos; emails
        </label>
        <div
          className={cn(
            fieldControlClassName,
            "flex min-h-(--field-h) cursor-text flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:shadow-(--focus-ring-input)",
            disabled && "pointer-events-none bg-(--surface)",
          )}
          onClick={() => inputRef.current?.focus()}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {invitees.map((invitee) => {
              const problem = problemFor.get(invitee.value);

              return (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "inline-flex h-7 max-w-full items-center gap-1 rounded-full pr-0.5 pl-2.5 text-[0.8125rem] leading-5 font-medium",
                    problem
                      ? "bg-(--danger-soft) text-(--danger)"
                      : "bg-[rgb(var(--accent-rgb)/0.12)] text-(--fg)",
                  )}
                  exit={{
                    opacity: 0,
                    scale: reduceMotion ? 1 : 0.9,
                    transition: {
                      duration: DUR.hover * 0.6,
                      ease: EASE.exit,
                    },
                  }}
                  initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.85 }}
                  key={invitee.value}
                  layout={!reduceMotion}
                  title={problem}
                  transition={
                    reduceMotion ? { duration: DUR.hover } : SPRING_SETTLE
                  }
                >
                  {problem ? (
                    <CircleAlert aria-hidden="true" className="size-3.5" />
                  ) : null}
                  <span className="truncate">{invitee.value}</span>
                  <button
                    aria-label={`Remove ${invitee.value}`}
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-(--dur-hover) ease-(--ease-out) hover:bg-[rgb(var(--fg-rgb)/0.08)] focus-visible:shadow-(--focus-ring) pointer-coarse:size-7"
                    disabled={disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      remove(invitee.value);
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                </motion.span>
              );
            })}
          </AnimatePresence>
          <input
            aria-describedby={hintId}
            aria-invalid={message ? true : undefined}
            autoCapitalize="none"
            autoComplete="off"
            className="h-7 min-w-[10rem] flex-1 bg-transparent px-1.5 text-[0.9375rem] text-(--fg) outline-none placeholder:text-(--placeholder) pointer-coarse:text-base"
            data-1p-ignore="true"
            data-lpignore="true"
            disabled={disabled}
            id={`${labelId}-input`}
            inputMode="email"
            name="setup-invitees"
            onBlur={commitDraft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={invitees.length === 0 ? "name@company.com" : ""}
            ref={inputRef}
            spellCheck={false}
            type="text"
            value={draft}
          />
        </div>
        <p
          className={cn(
            "flex items-start gap-1.5 text-xs leading-5",
            message ? "font-medium text-(--danger)" : "text-(--secondary)",
          )}
          id={hintId}
          role={message ? "alert" : undefined}
        >
          {message ? (
            <CircleAlert
              aria-hidden="true"
              className="mt-[0.1875rem] size-3.5 shrink-0"
            />
          ) : null}
          <span>
            {message ??
              "Separate addresses with commas, or paste a list. Up to 25."}
          </span>
        </p>
      </div>

      {!hosted ? (
        <div className="flex flex-col gap-1.5">
          <span
            className="text-sm leading-5 font-medium text-(--fg)"
            id={`${labelId}-mode`}
          >
            Who can join
          </span>
          <Segmented
            aria-labelledby={`${labelId}-mode`}
            fill
            items={modeItems.map((item) => ({ ...item, disabled }))}
            name="setup-signup-mode"
            onValueChange={onSignupModeChange}
            value={signupMode}
          />
          <p className="text-xs leading-5 text-(--secondary)">
            {modeDescription} People you send documents to never need an
            account.
          </p>
        </div>
      ) : null}
    </div>
  );
}
