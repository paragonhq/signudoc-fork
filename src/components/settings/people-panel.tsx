"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  MoreHorizontal,
  ShieldMinus,
  ShieldPlus,
  SmartphoneNfc,
} from "@/components/ui/icons";

import { cn } from "@/lib/cn";
import {
  CARD_DIVIDERS,
  CardNotice,
  GENERIC_ERROR_MESSAGE,
  Notice,
  SettingsSection,
} from "@/components/settings/settings-ui";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusFlag } from "@/components/ui/status-flag";
import { toast } from "@/components/ui/toaster";
import { SearchInput } from "@/components/ui/toolbar";
import {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import type { PeopleList, Person, PersonRole } from "@/lib/people";

// Who has an account on this install, and which of them are administrators.
// Administrators only.
//
// The list that arrives stops at five hundred accounts, so finding a person
// is the server's job: what is typed is sent along, and the list on screen
// is the answer to it.

/** How long typing has to pause before the list is asked for again. */
const SEARCH_DELAY_MS = 250;
/** With fewer accounts than this, nobody needs to search. */
const SEARCH_FROM_TOTAL = 9;

type PeopleResponse =
  (Partial<PeopleList> & { error?: string; you?: string }) | null;

function readPeopleList(payload: PeopleResponse): PeopleList | null {
  if (!payload || !Array.isArray(payload.people)) {
    return null;
  }

  return {
    administratorCount:
      payload.administratorCount ??
      payload.people.filter((person) => person.role === "admin").length,
    people: payload.people,
    total: payload.total ?? payload.people.length,
  };
}

export function PeoplePanel({ part11Mode = false }: { part11Mode?: boolean }) {
  function showsPart11(person: Person) {
    return (
      part11Mode ||
      person.hasOpenPart11Signing ||
      person.identityVerifiedAt !== null ||
      person.signingLockedAt !== null
    );
  }

  const router = useRouter();
  const [list, setList] = useState<PeopleList | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  // What the list on screen was asked for: `filter`, once typing has paused.
  const [search, setSearch] = useState("");
  // Counts up to have the list asked for again with the same search.
  const [reloads, setReloads] = useState(0);
  // The search as it stands now, for an answer that arrives after it moved.
  const latestSearch = useRef(search);
  // Part 11: the person whose identity is being confirmed, and how.
  const [verifying, setVerifying] = useState<Person | null>(null);
  const [verificationNote, setVerificationNote] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // Two-step reset: the person it is for.
  const [resetting, setResetting] = useState<Person | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Which request the list on screen answers; loading until it is this one.
  const requestKey = `${search}\u0000${String(reloads)}`;
  const [answered, setAnswered] = useState<string | null>(null);
  const loading = answered !== requestKey;

  useEffect(() => {
    latestSearch.current = search;
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearch(filter.trim()),
      SEARCH_DELAY_MS,
    );

    return () => window.clearTimeout(timer);
  }, [filter]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/admin/people?search=${encodeURIComponent(search)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => null)) as PeopleResponse;
        const loaded = readPeopleList(payload);

        if (!response.ok || !loaded) {
          setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
          setAnswered(requestKey);
          return;
        }

        setList(loaded);
        setYou(payload?.you ?? null);
        setError(null);
        setAnswered(requestKey);
      })
      .catch((loadError: unknown) => {
        // Leaving the page, or typing on, cancels the request; that is not
        // a failure.
        if (!(
          loadError instanceof DOMException && loadError.name === "AbortError"
        )) {
          setError(GENERIC_ERROR_MESSAGE);
          setAnswered(requestKey);
        }
      });

    return () => controller.abort();
  }, [search, requestKey]);

  /** Takes a changed list from the server, unless the search moved on. */
  function acceptChanged(changed: PeopleList) {
    // The search moved on while this was being saved. The list that came
    // back answers the old one, so the list is asked for again.
    if (latestSearch.current !== search) {
      setReloads((count) => count + 1);
      return;
    }

    setList(changed);
  }

  async function changeRole(person: Person, role: PersonRole) {
    if (pendingId) {
      return;
    }

    setPendingId(person.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/people/${encodeURIComponent(person.id)}`,
        {
          body: JSON.stringify({ role, search }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as PeopleResponse;
      const changed = readPeopleList(payload);

      if (!response.ok || !changed) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      toast.success(
        role === "admin"
          ? `${person.name} is now an administrator`
          : `${person.name} is no longer an administrator`,
      );

      // Having given up the role, this page is no longer theirs to see:
      // the page is drawn again without the administrator's sections.
      if (person.id === you && role === "user") {
        router.refresh();
        return;
      }

      acceptChanged(changed);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  }

  async function resetTwoFactorFor(person: Person) {
    setResetError(null);
    setPendingId(person.id);

    try {
      const response = await fetch(
        `/api/admin/people/${encodeURIComponent(person.id)}/two-factor?search=${encodeURIComponent(search)}`,
        { method: "DELETE" },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as PeopleResponse;
      const changed = readPeopleList(payload);

      if (!response.ok || !changed) {
        setResetError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        throw new Error("reset failed");
      }

      toast.success(`Two-step sign-in reset for ${person.name}`, {
        description: "They were signed out everywhere and can set it up again.",
      });
      acceptChanged(changed);
    } catch (resetFailure) {
      setResetError((current) => current ?? GENERIC_ERROR_MESSAGE);
      throw resetFailure;
    } finally {
      setPendingId(null);
    }
  }

  async function changePart11(
    person: Person,
    action: "revoke" | "unlock" | "verify",
  ) {
    if (pendingId) {
      return;
    }

    setPendingId(person.id);
    setError(null);
    setVerifyError(null);

    try {
      const response = await fetch(
        `/api/admin/people/${encodeURIComponent(person.id)}/part11`,
        {
          body: JSON.stringify({
            action,
            note: action === "verify" ? verificationNote : undefined,
            search,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as PeopleResponse;
      const changed = readPeopleList(payload);

      if (!response.ok || !changed) {
        const message = payload?.error ?? GENERIC_ERROR_MESSAGE;

        if (action === "verify") {
          setVerifyError(message);
        } else {
          setError(message);
        }

        return;
      }

      setVerifying(null);
      setVerificationNote("");
      toast.success(
        action === "verify"
          ? `${person.name}'s identity is confirmed`
          : action === "unlock"
            ? `Signing unlocked for ${person.name}`
            : `${person.name}'s identity confirmation was taken back`,
      );
      acceptChanged(changed);
    } catch {
      if (action === "verify") {
        setVerifyError(GENERIC_ERROR_MESSAGE);
      } else {
        setError(GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setPendingId(null);
    }
  }

  function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (verifying && verificationNote.trim()) {
      void changePart11(verifying, "verify");
    }
  }

  const people = list?.people ?? null;
  const administratorCount = list?.administratorCount ?? 0;
  const searching = filter.trim().length > 0 || search.length > 0;
  const canSearch =
    list !== null && (searching || list.total >= SEARCH_FROM_TOTAL);

  return (
    <SettingsSection
      description={
        list
          ? `Everyone with an account here: ${plural(list.total, "person", "people")}, ${plural(administratorCount, "administrator", "administrators")}.`
          : "Everyone with an account here."
      }
      id="people"
      title="People"
    >
      {canSearch ? (
        <div className="px-4 py-3 sm:px-5">
          <SearchInput
            aria-label="Find a person"
            className="w-full"
            onValueChange={setFilter}
            placeholder="Find by name or email"
            value={filter}
          />
        </div>
      ) : null}
      {list && administratorCount === 1 && !searching ? (
        <CardNotice>
          <Notice tone="warning">
            There is only one administrator. Make a second, so that one person
            leaving does not lock everyone out.
          </Notice>
        </CardNotice>
      ) : null}
      {error ? (
        <CardNotice>
          <Notice
            action={
              <Button
                onClick={() => {
                  setError(null);
                  setReloads((count) => count + 1);
                }}
                size="sm"
                variant="outline"
              >
                Try again
              </Button>
            }
            role="alert"
            tone="danger"
          >
            {error}
          </Notice>
        </CardNotice>
      ) : null}

      {people === null ? (
        error ? null : (
          <PeopleSkeleton />
        )
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
          <p className="text-[0.9375rem] font-medium text-(--fg)">
            Nobody matches that.
          </p>
          <p className="text-[0.8125rem] text-(--secondary)">
            Try part of a name, or a different email address.
          </p>
        </div>
      ) : (
        <ul
          aria-busy={loading || undefined}
          aria-label="People"
          className={cn(
            "flex flex-col transition-opacity duration-(--dur-hover) ease-(--ease-out)",
            CARD_DIVIDERS,
            loading && "opacity-60",
          )}
        >
          {people.map((person) => {
            const isAdmin = person.role === "admin";
            const isYou = person.id === you;
            const isLastAdmin = isAdmin && administratorCount === 1;
            const busy = pendingId === person.id;
            const notes = [
              !person.emailVerified ? "Email not confirmed" : null,
              person.closing ? "Account closing" : null,
              person.signingLockedAt !== null ? "Signing locked" : null,
            ].filter((note): note is string => note !== null);

            return (
              <li
                aria-busy={busy || undefined}
                className={cn(
                  "flex min-h-16 flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-3 transition-opacity duration-(--dur-hover) sm:px-5",
                  busy && "opacity-60",
                )}
                key={person.id}
              >
                <Avatar
                  name={person.name || person.email}
                  size="lg"
                  tone={isAdmin ? "accent" : "ink"}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate text-[0.9375rem] leading-5 font-medium tracking-[-0.01em] text-(--fg)">
                      {person.name}
                    </span>
                    {isYou ? (
                      <span className="shrink-0 text-[0.8125rem] text-(--secondary)">
                        You
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
                    {person.email}
                    {notes.map((note) => (
                      <span
                        className={
                          note === "Signing locked"
                            ? "text-(--danger)"
                            : "text-(--warning)"
                        }
                        key={note}
                      >
                        {` · ${note}`}
                      </span>
                    ))}
                  </p>
                </div>
                {showsPart11(person) ? (
                  <IdentityControls
                    busy={pendingId !== null}
                    onConfirm={() => {
                      setVerificationNote("");
                      setVerifyError(null);
                      setVerifying(person);
                    }}
                    onRevoke={() => void changePart11(person, "revoke")}
                    onUnlock={() => void changePart11(person, "unlock")}
                    part11Mode={part11Mode}
                    person={person}
                  />
                ) : null}
                <div className="flex shrink-0 items-center gap-1.5">
                  <StatusFlag
                    className="max-sm:hidden"
                    glyph={isAdmin ? "dot" : "none"}
                    size="sm"
                    tone={isAdmin ? "accent" : "neutral"}
                  >
                    {isAdmin ? "Administrator" : "Member"}
                  </StatusFlag>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton
                        aria-label={`Actions for ${person.name}`}
                        disabled={pendingId !== null}
                        size="sm"
                      >
                        <MoreHorizontal />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                      <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                        <span className="truncate font-medium text-(--fg)">
                          {isAdmin ? "Administrator" : "Member"}
                        </span>
                        <span className="truncate">
                          {person.twoFactorEnabled
                            ? "Uses two-step sign-in"
                            : "Signs in with a password only"}
                        </span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {isAdmin ? (
                        <DropdownMenuItem
                          disabled={isLastAdmin}
                          onSelect={() => void changeRole(person, "user")}
                          variant="destructive"
                        >
                          <ShieldMinus aria-hidden="true" />
                          <span className="flex flex-col">
                            <span>Remove as administrator</span>
                            <span className="text-xs text-(--secondary)">
                              {isLastAdmin
                                ? "There has to be at least one."
                                : "Documents they received as one move to an administrator who stays."}
                            </span>
                          </span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          disabled={!person.emailVerified || person.closing}
                          onSelect={() => void changeRole(person, "admin")}
                        >
                          <ShieldPlus aria-hidden="true" />
                          <span className="flex flex-col">
                            <span>Make administrator</span>
                            <span className="text-xs text-(--secondary)">
                              {person.closing
                                ? "Their account is closing."
                                : !person.emailVerified
                                  ? "Their email is not confirmed yet."
                                  : "They can change these settings."}
                            </span>
                          </span>
                        </DropdownMenuItem>
                      )}
                      {person.twoFactorEnabled && !isYou ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => {
                              setResetError(null);
                              setResetting(person);
                            }}
                            variant="destructive"
                          >
                            <SmartphoneNfc aria-hidden="true" />
                            <span className="flex flex-col">
                              <span>Reset two-step sign-in</span>
                              <span className="text-xs text-(--secondary)">
                                For a lost phone and lost backup codes.
                              </span>
                            </span>
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {list && list.total > list.people.length ? (
        <p className="px-4 py-3 text-[0.8125rem] text-(--secondary) sm:px-5">
          Showing the first{" "}
          <span className="tabular-nums">{list.people.length}</span> of{" "}
          <span className="tabular-nums">{list.total}</span>. Search to find the
          others.
        </p>
      ) : null}

      {/* Part 11: how the administrator checked who this is. */}
      <Tray
        onOpenChange={(open) => {
          if (!open && pendingId === null) {
            setVerifying(null);
          }
        }}
        open={verifying !== null}
      >
        <TrayContent size="sm">
          <form
            className="flex min-h-0 flex-col"
            noValidate
            onSubmit={submitVerification}
          >
            <TrayHeader>
              <TrayTitle>Confirm identity</TrayTitle>
              <TrayDescription>
                {verifying
                  ? `Before ${verifying.name} can sign Part 11 envelopes, record how you checked who they are. It goes in the site audit trail.`
                  : null}
              </TrayDescription>
            </TrayHeader>
            <TrayBody className="pt-4">
              <FormField
                error={verifyError ?? undefined}
                hint="For example: passport seen in person, HR record 4417."
                label="How did you check who this is?"
              >
                <Input
                  autoFocus
                  maxLength={500}
                  onChange={(event) => {
                    setVerificationNote(event.target.value);
                    setVerifyError(null);
                  }}
                  value={verificationNote}
                />
              </FormField>
            </TrayBody>
            <TrayFooter>
              <TrayClose asChild>
                <Button
                  disabled={pendingId !== null}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
              </TrayClose>
              <Button
                disabled={verificationNote.trim().length === 0}
                loading={verifying !== null && pendingId === verifying.id}
                type="submit"
              >
                Save
              </Button>
            </TrayFooter>
          </form>
        </TrayContent>
      </Tray>

      <ConfirmTray
        confirmLabel="Reset two-step sign-in"
        description="For someone who lost their phone and their backup codes. Their two-step sign-in is turned off and they are signed out everywhere."
        error={resetError}
        onConfirm={() => (resetting ? resetTwoFactorFor(resetting) : undefined)}
        onOpenChange={(open) => {
          if (!open) {
            setResetting(null);
          }
        }}
        open={resetting !== null}
        title={
          resetting
            ? `Reset two-step sign-in for ${resetting.name}?`
            : "Reset two-step sign-in?"
        }
      />
    </SettingsSection>
  );
}

/** Loading: the shape of the rows that are coming. */
function PeopleSkeleton() {
  return (
    <div aria-hidden="true" className={cn("flex flex-col", CARD_DIVIDERS)}>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="flex min-h-16 items-center gap-3.5 px-4 py-3 sm:px-5"
          key={index}
        >
          <Skeleton className="size-10 rounded-full" delay={150} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-32" delay={150} />
            <Skeleton className="h-3 w-48" delay={150} />
          </div>
        </div>
      ))}
    </div>
  );
}

function plural(count: number, one: string, many: string) {
  return `${String(count)} ${count === 1 ? one : many}`;
}

/**
 * Part 11 on a person's row: whether an administrator has confirmed who
 * they are, and the one action that fits. On a phone it drops under the
 * name, lined up with it.
 */
function IdentityControls({
  busy,
  onConfirm,
  onRevoke,
  onUnlock,
  part11Mode,
  person,
}: {
  busy: boolean;
  onConfirm: () => void;
  onRevoke: () => void;
  onUnlock: () => void;
  part11Mode: boolean;
  person: Person;
}) {
  const confirmed = person.identityVerifiedAt !== null;
  const canConfirm = part11Mode || person.hasOpenPart11Signing;

  if (!confirmed && !canConfirm && person.signingLockedAt === null) {
    return null;
  }

  return (
    <div className="order-last flex w-full flex-wrap items-center gap-1.5 pl-[3.375rem] md:order-none md:w-auto md:pl-0">
      {confirmed ? (
        <>
          <StatusFlag
            glyph="check"
            size="sm"
            title={person.identityVerificationNote ?? undefined}
            tone="success"
          >
            Identity confirmed
          </StatusFlag>
          <Button
            aria-label={`Take back ${person.name}'s identity confirmation`}
            disabled={busy}
            onClick={onRevoke}
            size="xs"
            variant="ghost"
          >
            Take back
          </Button>
        </>
      ) : canConfirm ? (
        <Button
          aria-label={`Confirm ${person.name}'s identity`}
          disabled={busy || !person.emailVerified}
          onClick={onConfirm}
          size="xs"
          variant="secondary"
        >
          Confirm identity
        </Button>
      ) : null}
      {person.signingLockedAt !== null ? (
        <Button
          aria-label={`Unlock signing for ${person.name}`}
          disabled={busy}
          onClick={onUnlock}
          size="xs"
          variant="outline"
        >
          Unlock signing
        </Button>
      ) : null}
    </div>
  );
}
