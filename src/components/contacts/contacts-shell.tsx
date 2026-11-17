"use client";

import {
  ChevronRightIcon,
  RotateCcwIcon,
  SendIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { TeamIllustration } from "@/components/illustrations/illustrations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import { Segmented } from "@/components/ui/segmented";
import { SearchInput } from "@/components/ui/toolbar";
import { cn } from "@/lib/cn";
import { describeContactActivity } from "@/lib/contact-words";
import type { ContactWithDocuments } from "@/lib/contacts";

import { ContactAvatar, StatusMixBar } from "./contact-parts";
import { ContactTray } from "./contact-tray";

type ContactsShellProps = {
  contacts?: readonly ContactWithDocuments[];
  initialState?: "error";
  /** Unix seconds, from the server, so "2 days ago" reads the same on both. */
  now: number;
};

type SortOrder = "name" | "recent";

/** Search appears once there are enough people to need it. */
const SEARCH_FROM = 6;

function overview(count: number) {
  return count === 1
    ? "One person you’ve sent documents to."
    : `${String(count)} people you’ve sent documents to.`;
}

/** "R" for Riley; "#" for anything that is not a letter. */
function groupLetter(name: string) {
  const first = name.trim().charAt(0).toUpperCase();

  return /\p{L}/u.test(first) ? first : "#";
}

/*
 * Contacts, the address book. Everyone you have
 * sent to, newest first or by name, as calm rows: initials on a soft
 * tint, the name and address, how many documents and when you last sent
 * one, and a short bar of how those documents stand. A row opens the
 * person in a tray, with their documents and "Send them a document".
 */
export function ContactsShell({
  contacts = [],
  initialState,
  now,
}: ContactsShellProps) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("recent");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const selected =
    contacts.find((contact) => contact.email === selectedEmail) ?? null;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? contacts.filter(
          (contact) =>
            contact.name.toLowerCase().includes(needle) ||
            contact.email.toLowerCase().includes(needle),
        )
      : [...contacts];

    return sort === "name"
      ? matching.sort((left, right) =>
          left.name.localeCompare(right.name, undefined, {
            sensitivity: "base",
          }),
        )
      : matching;
  }, [contacts, query, sort]);

  // By name, the list is an address book: grouped under its letters.
  const groups = useMemo(() => {
    if (sort !== "name") {
      return [{ label: null, people: visible }];
    }

    const byLetter = new Map<string, ContactWithDocuments[]>();

    for (const contact of visible) {
      const letter = groupLetter(contact.name);

      byLetter.set(letter, [...(byLetter.get(letter) ?? []), contact]);
    }

    return [...byLetter.entries()].map(([label, people]) => ({
      label,
      people,
    }));
  }, [sort, visible]);

  function openContact(email: string) {
    setSelectedEmail(email);
    setTrayOpen(true);
  }

  if (initialState === "error") {
    return (
      <div className="section-stack">
        <PageHeader title="Contacts" />
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
            description="Something went wrong on our side. Try again in a moment."
            icon={<UsersIcon />}
            title="Couldn’t load your contacts"
          />
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="section-stack">
        <PageHeader title="Contacts" />
        <section
          aria-labelledby="contacts-first-run"
          className="flex flex-col items-center gap-8 rounded-(--radius-card) bg-(--paper) px-6 py-14 text-center shadow-(--shadow-card) sm:py-20"
        >
          <TeamIllustration className="w-52 sm:w-60" />
          <div className="flex max-w-md flex-col gap-2">
            <h2
              className="text-xl leading-7 font-semibold tracking-[-0.02em] text-(--fg)"
              id="contacts-first-run"
            >
              No contacts yet
            </h2>
            <p className="text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
              Everyone you send a document to lands here, ready to pick the next
              time you send.
            </p>
          </div>
          <Button asChild className="max-sm:h-12">
            <Link href="/envelopes/new">
              <SendIcon aria-hidden="true" />
              Send a document
            </Link>
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="section-stack">
      <PageHeader
        actions={
          contacts.length >= SEARCH_FROM ? (
            <SearchInput
              aria-label="Search contacts"
              className="max-sm:order-last max-sm:basis-full sm:w-64"
              onValueChange={setQuery}
              placeholder="Name or email"
              shortcut="/"
              value={query}
            />
          ) : undefined
        }
        description={overview(contacts.length)}
        title="Contacts"
      />

      <section aria-label="Your contacts" className="flex flex-col gap-5">
        {contacts.length > 1 ? (
          <Segmented
            aria-label="Sort by"
            className="self-start"
            items={[
              { label: "Recent", value: "recent" },
              { label: "Name", value: "name" },
            ]}
            onValueChange={(value) => setSort(value)}
            size="sm"
            value={sort}
          />
        ) : null}

        {visible.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={() => setQuery("")} variant="outline">
                Clear search
              </Button>
            }
            description="Try part of their name or their email address."
            icon={<UsersIcon />}
            title="No one matches"
          />
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div className="flex flex-col gap-2" key={group.label ?? "all"}>
                {group.label ? (
                  <h2 className="px-1 text-[0.8125rem] leading-5 font-medium text-(--secondary)">
                    {group.label}
                  </h2>
                ) : null}
                <ul className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
                  <AnimatePresence initial={false} mode="popLayout">
                    {group.people.map((contact) => (
                      <motion.li
                        animate={{ opacity: 1 }}
                        className="relative not-first:before:absolute not-first:before:top-0 not-first:before:right-5 not-first:before:left-[4.75rem] not-first:before:h-px not-first:before:bg-(--divider)"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        key={contact.email}
                        layout="position"
                        transition={{ duration: DUR.move, ease: EASE.out }}
                      >
                        <ContactRow
                          contact={contact}
                          now={now}
                          onOpen={() => openContact(contact.email)}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <ContactTray
        contact={selected}
        now={now}
        onOpenChange={setTrayOpen}
        open={trayOpen && selected !== null}
      />
    </div>
  );
}

function ContactRow({
  contact,
  now,
  onOpen,
}: {
  contact: ContactWithDocuments;
  now: number;
  onOpen: () => void;
}) {
  const activity = describeContactActivity(contact, now);

  return (
    <button
      aria-haspopup="dialog"
      className={cn(
        "group/row flex min-h-[4.5rem] w-full items-center gap-4 px-4 py-3 text-left outline-none sm:px-5",
        "transition-[background-color] duration-(--dur-hover) ease-(--ease-out)",
        "hover:bg-(--hover) active:bg-(--press) focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--accent-rgb)/0.45)]",
      )}
      onClick={onOpen}
      type="button"
    >
      <ContactAvatar email={contact.email} name={contact.name} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:grid sm:grid-cols-[minmax(0,1fr)_16rem] sm:items-center sm:gap-6">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[0.9375rem] leading-5 font-medium tracking-[-0.01em] text-(--fg)">
            {contact.name}
          </span>
          <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
            {contact.email}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-3">
          <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
            {activity}
          </span>
        </span>
      </span>
      <span className="flex w-14 shrink-0 max-sm:hidden">
        <StatusMixBar mix={contact.statusMix} />
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-(--secondary) transition-[opacity,translate] duration-(--dur-hover) ease-(--ease-out) pointer-fine:-translate-x-1 pointer-fine:opacity-0 pointer-fine:group-hover/row:translate-x-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-visible/row:translate-x-0 pointer-fine:group-focus-visible/row:opacity-100"
      />
    </button>
  );
}
