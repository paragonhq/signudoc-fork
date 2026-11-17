"use client";

import { RotateCwIcon } from "@/components/ui/icons";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { TextMorph } from "@/components/ui/text-morph";

import { type SaveState } from "./model";

function formatAgo(savedAt: number, now: number) {
  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));

  if (seconds < 5) {
    return "just now";
  }

  if (seconds < 60) {
    return `${String(seconds)}s ago`;
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${String(minutes)}m ago`;
  }

  return `${String(Math.round(minutes / 60))}h ago`;
}

/** Re-renders every few seconds while there is a time to show. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 5000);

    return () => window.clearInterval(interval);
  }, [active]);

  return now;
}

/**
 * The autosave state, quiet: a small dot and "Saved", "Saving…" or "Not
 * saved" with a retry; when it was saved lives in the tooltip. The label morphs between states. Screen
 * readers hear the short state from one polite status region (exactly
 * "Saved", "Saving…" or "Not saved"); the time beside it is visual only.
 */
export function SaveStatus({
  onRetry,
  saveError,
  savedAt,
  saveState,
}: {
  onRetry: () => void;
  saveError: string | null;
  savedAt: number | null;
  saveState: SaveState;
}) {
  const now = useNow(saveState === "saved" && savedAt !== null);
  const isError = saveState === "error";
  const label = isError
    ? "Not saved"
    : saveState === "saving"
      ? "Saving…"
      : "Saved";

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <p className="sr-only" role="status">
        {saveState === "saving" ? "Saving..." : isError ? "Not saved" : "Saved"}
      </p>
      <SimpleTooltip
        label={
          isError
            ? (saveError ?? "Your last change was not saved.")
            : saveState === "saved" && savedAt !== null
              ? `Saved ${formatAgo(savedAt, now)}`
              : "Changes save as you go"
        }
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 text-[0.8125rem] leading-none",
            isError ? "text-(--danger)" : "text-(--secondary)",
          )}
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full transition-colors duration-(--dur-hover)",
              isError
                ? "bg-(--danger)"
                : saveState === "saving"
                  ? "animate-pulse bg-(--accent)"
                  : "bg-(--success-dot)",
            )}
          />
          <TextMorph className="max-md:sr-only">{label}</TextMorph>
        </span>
      </SimpleTooltip>
      {isError ? (
        <SimpleTooltip label={saveError ?? "Your last change was not saved."}>
          <Button
            className="h-7 min-h-7 gap-1 rounded-full px-2.5 text-xs"
            onClick={onRetry}
            size="xs"
            variant="destructive-ghost"
          >
            <RotateCwIcon aria-hidden="true" />
            Retry
          </Button>
        </SimpleTooltip>
      ) : null}
      {isError && saveError ? (
        <p className="sr-only" role="alert">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
