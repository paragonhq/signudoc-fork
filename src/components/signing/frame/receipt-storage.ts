/*
 * The hand-off from the signing view to the done page. The signing link
 * stops working the moment the signature lands, so what the receipt says
 * (when, and who is next) travels in the browser's session storage, keyed
 * by the link. Missing or unreadable, the done page says the general thing.
 */

export type StoredReceipt = {
  /** This signature completes the envelope. */
  isLastSigner: boolean;
  nextSignerName: string | null;
  /** ISO time the signature landed; null when a provider finishes it. */
  signedAt: string | null;
  title: string;
};

function receiptKey(token: string) {
  return `signudoc:receipt:${token}`;
}

export function saveReceipt(token: string, receipt: StoredReceipt) {
  try {
    window.sessionStorage.setItem(receiptKey(token), JSON.stringify(receipt));
  } catch {
    // Blocked storage: the done page falls back to the general copy.
  }
}

export function readReceipt(token: string): StoredReceipt | null {
  try {
    const raw = window.sessionStorage.getItem(receiptKey(token));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredReceipt>;

    if (typeof parsed.title !== "string") {
      return null;
    }

    return {
      isLastSigner: parsed.isLastSigner === true,
      nextSignerName:
        typeof parsed.nextSignerName === "string"
          ? parsed.nextSignerName
          : null,
      signedAt: typeof parsed.signedAt === "string" ? parsed.signedAt : null,
      title: parsed.title,
    };
  } catch {
    return null;
  }
}

/** The signing link's token, from /sign/<token> or /sign/<token>/done. */
export function tokenFromPath(pathname: string): string | null {
  const match = /^\/sign\/([^/]+)/.exec(pathname);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
