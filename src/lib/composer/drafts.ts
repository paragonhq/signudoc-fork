// The composer keeps the document being written on this device, so closing
// the editor or reloading the page loses nothing. One draft per place the
// composer opens from (a new envelope, a new template).

import { isPageSetup, type PageSetup } from "./page.ts";

export type ComposerSource = { html: string; page: PageSetup; title: string };

type Stored = ComposerSource & { savedAt: number };

function storageName(key: string) {
  return `signudoc:composer:${key}`;
}

export function readComposerDraft(key: string): Stored | null {
  try {
    const raw = window.localStorage.getItem(storageName(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    return typeof parsed.html === "string" && isPageSetup(parsed.page)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function writeComposerDraft(key: string, value: ComposerSource) {
  try {
    window.localStorage.setItem(
      storageName(key),
      JSON.stringify({ ...value, savedAt: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearComposerDraft(key: string) {
  try {
    window.localStorage.removeItem(storageName(key));
  } catch {
    // Storage unavailable: nothing was kept.
  }
}
