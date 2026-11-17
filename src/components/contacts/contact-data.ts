"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import type { Contact } from "@/lib/contacts";

/*
 * The address book on the client: fetched once per page from
 * /api/contacts the first time someone reaches for it (focusing a signer
 * field), then matched locally as they type, so suggestions keep up with
 * every keystroke without a request each.
 */

export type ContactSuggestion = Pick<
  Contact,
  "documentCount" | "email" | "name"
>;

let contactsRequest: Promise<ContactSuggestion[]> | null = null;

function fetchContacts(): Promise<ContactSuggestion[]> {
  contactsRequest ??= fetch("/api/contacts?limit=500", {
    headers: { accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("contacts unavailable");
      }

      const payload = (await response.json()) as {
        contacts?: ContactSuggestion[];
      };

      return (payload.contacts ?? []).map((contact) => ({
        documentCount: contact.documentCount,
        email: contact.email,
        name: contact.name,
      }));
    })
    .catch(() => {
      // Try again next time someone reaches for it.
      contactsRequest = null;

      return [];
    });

  return contactsRequest;
}

/** The contacts, once loaded; `load` is cheap to call again. */
export function useContactSuggestions() {
  const [contacts, setContacts] = useState<ContactSuggestion[] | null>(null);
  const load = useCallback(() => {
    void fetchContacts().then((loaded) => setContacts(loaded));
  }, []);

  return { contacts, load };
}

/* Matching ---------------------------------------------------------------- */

export type MatchSegment = { match: boolean; text: string };

/** Splits `text` around the first place `needle` appears, for highlighting. */
export function highlight(text: string, needle: string): MatchSegment[] {
  const at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;

  if (at < 0) {
    return [{ match: false, text }];
  }

  return [
    { match: false, text: text.slice(0, at) },
    { match: true, text: text.slice(at, at + needle.length) },
    { match: false, text: text.slice(at + needle.length) },
  ].filter((segment) => segment.text.length > 0);
}

function score(contact: ContactSuggestion, needle: string): number {
  const name = contact.name.toLowerCase();
  const email = contact.email.toLowerCase();

  if (name.startsWith(needle) || email.startsWith(needle)) {
    return 0;
  }

  if (name.split(/\s+/).some((word) => word.startsWith(needle))) {
    return 1;
  }

  if (name.includes(needle) || email.includes(needle)) {
    return 2;
  }

  return -1;
}

/**
 * Up to `limit` contacts for what was typed: whole-word and start matches
 * first, then anywhere in the name or address; the address book's own
 * order (most recent first) breaks ties. People already on this envelope
 * are left out, and so is an exact match of what is already there.
 */
export function matchContacts(
  contacts: readonly ContactSuggestion[],
  query: string,
  {
    exclude = [],
    limit = 5,
  }: { exclude?: readonly string[]; limit?: number } = {},
): ContactSuggestion[] {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return [];
  }

  const taken = new Set(exclude.map((email) => email.trim().toLowerCase()));

  return contacts
    .map((contact, index) => ({ contact, index, rank: score(contact, needle) }))
    .filter(
      ({ contact, rank }) =>
        rank >= 0 &&
        !taken.has(contact.email.toLowerCase()) &&
        contact.email.toLowerCase() !== needle &&
        contact.name.toLowerCase() !== needle,
    )
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, limit)
    .map(({ contact }) => contact);
}

/* "Send them a document" ---------------------------------------------------- */

const SEND_TO_KEY = "signudoc:send-to";
const SEND_TO_EVENT = "signudoc:send-to";

export type SendToContact = { email: string; name: string };

function readSendTo(): string | null {
  try {
    return window.sessionStorage.getItem(SEND_TO_KEY);
  } catch {
    return null;
  }
}

function subscribeSendTo(onChange: () => void) {
  window.addEventListener(SEND_TO_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(SEND_TO_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function parseSendTo(raw: string | null): SendToContact | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as Partial<SendToContact>;

    return typeof value.email === "string" && typeof value.name === "string"
      ? { email: value.email, name: value.name }
      : null;
  } catch {
    return null;
  }
}

/**
 * Remembers who the next envelope is for, in this tab only, until the
 * signers step fills them in (or the person clears it).
 */
export function rememberSendTo(contact: SendToContact | null) {
  try {
    if (contact) {
      window.sessionStorage.setItem(SEND_TO_KEY, JSON.stringify(contact));
    } else {
      window.sessionStorage.removeItem(SEND_TO_KEY);
    }
  } catch {
    // Private mode or storage turned off: the envelope simply starts empty.
  }

  window.dispatchEvent(new Event(SEND_TO_EVENT));
}

/** Who the next envelope is for, read after hydration (null on the server). */
export function useSendTo(): SendToContact | null {
  const raw = useSyncExternalStore(subscribeSendTo, readSendTo, () => null);

  return parseSendTo(raw);
}
