// Contacts in words, for the address book and the signers step. No
// database here, so the browser can use it too (see contacts.ts).

export type ContactStatusMix = {
  completed: number;
  declined: number;
  draft: number;
  /** Voided, or past its deadline before everyone signed. */
  ended: number;
  waiting: number;
};

const DAY = 24 * 60 * 60;

/** "today", "yesterday", "3 days ago", "2 weeks ago", "5 months ago". */
export function describeAgo(timestamp: number, now: number): string {
  const days = Math.floor(Math.max(0, now - timestamp) / DAY);

  if (days === 0) {
    return "today";
  }

  if (days === 1) {
    return "yesterday";
  }

  if (days < 14) {
    return `${String(days)} days ago`;
  }

  if (days < 60) {
    return `${String(Math.floor(days / 7))} weeks ago`;
  }

  if (days < 365 * 2) {
    return `${String(Math.floor(days / 30))} months ago`;
  }

  return `${String(Math.floor(days / 365))} years ago`;
}

/** "3 documents · last sent 2 days ago", or "1 document · not sent yet". */
export function describeContactActivity(
  contact: { documentCount: number; lastSentAt: number | null },
  now: number,
): string {
  const documents = `${String(contact.documentCount)} ${contact.documentCount === 1 ? "document" : "documents"}`;
  const sent =
    contact.lastSentAt === null
      ? "not sent yet"
      : `last sent ${describeAgo(contact.lastSentAt, now)}`;

  return `${documents} · ${sent}`;
}

/** "2 completed, 1 waiting": the mix in words, busiest first; empty for none. */
export function describeStatusMix(mix: ContactStatusMix): string {
  const parts: [number, string][] = [
    [mix.completed, "completed"],
    [mix.waiting, "waiting"],
    [mix.declined, "declined"],
    [mix.ended, "ended"],
    [mix.draft, mix.draft === 1 ? "draft" : "drafts"],
  ];

  return parts
    .filter(([count]) => count > 0)
    .map(([count, word]) => `${String(count)} ${word}`)
    .join(", ");
}
