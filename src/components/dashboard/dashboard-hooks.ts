"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import type { DocumentView } from "@/components/dashboard/dashboard-model";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private windows and blocked storage: the choice lasts this visit.
  }
}

/**
 * Table or grid, remembered per browser. The server always renders the
 * table (the enterprise default); a stored "grid" takes over after mount.
 */
export function useRememberedView(
  storageKey: string,
): [DocumentView, (view: DocumentView) => void] {
  const [view, setView] = useState<DocumentView>("table");

  useEffect(() => {
    const stored = readStorage(storageKey);

    if (stored === "grid" || stored === "table") {
      // Reading browser storage has to wait for the browser.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(stored);
    }
  }, [storageKey]);

  const choose = useCallback(
    (next: DocumentView) => {
      setView(next);
      writeStorage(storageKey, next);
    },
    [storageKey],
  );

  return [view, choose];
}

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;

  return Boolean(
    element &&
    (element.isContentEditable ||
      element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.tagName === "SELECT" ||
      element.closest("[role='dialog'], [role='menu']")),
  );
}

/** A single-key shortcut (no modifiers) that never fires while typing. */
export function useKeyShortcut(key: string, onPress: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key.toLowerCase() !== key.toLowerCase() ||
        isTyping(event.target)
      ) {
        return;
      }

      event.preventDefault();
      onPress();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, onPress]);
}

/** N opens a new envelope from anywhere on the page. */
export function useNewEnvelopeShortcut() {
  const router = useRouter();
  const go = useCallback(() => router.push("/envelopes/new"), [router]);

  useKeyShortcut("n", go);
}

const subscribeNever = () => () => {};

/**
 * "Now" for relative dates: null on the server and during hydration (so
 * the markup matches), the real time once in the browser.
 */
export function useClientNow(): number | null {
  return useSyncExternalStore(
    subscribeNever,
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => null,
  );
}
