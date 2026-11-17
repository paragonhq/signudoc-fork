"use client";

import {
  BellIcon,
  DownloadIcon,
  Trash2Icon,
  XIcon,
} from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DocumentRow } from "@/components/dashboard/dashboard-model";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { SPRING_SOFT } from "@/components/ui/motion-tokens";
import { NumberRoll } from "@/components/ui/number-roll";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";

/*
 * The floating bar for what is selected. Only actions the product already
 * has, each applied to the documents it makes sense for:
 *
 *   Download   completed documents: their signed PDFs
 *   Remind     documents waiting on someone: the same reminder as the
 *              detail page (POST /api/envelopes/:id/nudge)
 *   Delete     drafts (DELETE /api/envelopes/:id), behind a hold-to-confirm
 *
 * It rises from the bottom (above the phone's tab bar) and settles with a
 * soft spring; Esc or × clears the selection.
 */
export function BulkActionBar({
  onClear,
  onRemoved,
  rows,
}: {
  onClear: () => void;
  /** Rows that are gone (deleted): fold them away straight away. */
  onRemoved: (ids: readonly string[]) => void;
  rows: readonly DocumentRow[];
}) {
  const reduceMotion = useReducedMotion();
  const open = rows.length > 0;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="pointer-events-none fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center lg:bottom-8"
          exit={{
            opacity: 0,
            scale: reduceMotion ? 1 : 0.97,
            transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
            y: reduceMotion ? 0 : 12,
          }}
          initial={{
            opacity: 0,
            scale: reduceMotion ? 1 : 0.96,
            y: reduceMotion ? 0 : 20,
          }}
          transition={reduceMotion ? { duration: 0.16 } : SPRING_SOFT}
        >
          <BarContents onClear={onClear} onRemoved={onRemoved} rows={rows} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type NudgeOutcome = "failed" | "recent" | "sent";

function BarContents({
  onClear,
  onRemoved,
  rows,
}: {
  onClear: () => void;
  onRemoved: (ids: readonly string[]) => void;
  rows: readonly DocumentRow[];
}) {
  const router = useRouter();
  const [reminding, setReminding] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const completed = rows.filter((row) => row.flag === "completed");
  const waiting = rows.filter((row) => row.flag === "waiting");
  const drafts = rows.filter((row) => row.flag === "draft");
  const nothing =
    completed.length === 0 && waiting.length === 0 && drafts.length === 0;

  function download() {
    // One file each, a moment apart, so the browser takes every one.
    completed.forEach((row, index) => {
      window.setTimeout(() => {
        const link = document.createElement("a");

        link.href = `/api/envelopes/${encodeURIComponent(row.source.id)}/download?type=signed`;
        link.rel = "noopener";
        link.download = "";
        document.body.append(link);
        link.click();
        link.remove();
      }, index * 400);
    });

    toast.success(
      completed.length === 1
        ? "Downloading the signed PDF"
        : `Downloading ${String(completed.length)} signed PDFs`,
    );
  }

  async function remind() {
    if (reminding) {
      return;
    }

    setReminding(true);

    const outcomes = await Promise.all(
      waiting.map(async (row): Promise<NudgeOutcome> => {
        try {
          const response = await fetch(
            `/api/envelopes/${encodeURIComponent(row.source.id)}/nudge`,
            { method: "POST" },
          );

          if (response.ok) {
            return "sent";
          }

          return response.status === 409 || response.status === 429
            ? "recent"
            : "failed";
        } catch {
          return "failed";
        }
      }),
    );

    setReminding(false);

    const sent = outcomes.filter((outcome) => outcome === "sent").length;
    const recent = outcomes.filter((outcome) => outcome === "recent").length;
    const failed = outcomes.length - sent - recent;
    const notes = [
      recent > 0
        ? `${String(recent)} reminded recently, try again later`
        : null,
      failed > 0 ? `${String(failed)} couldn’t be sent` : null,
    ].filter(Boolean);

    if (sent > 0) {
      toast.success(
        `${sent === 1 ? "Reminder sent" : `${String(sent)} reminders sent`}${notes.length > 0 ? ` · ${notes.join(" · ")}` : ""}`,
      );
    } else {
      toast.error(notes.join(" · ") || "No reminders went out.");
    }

    router.refresh();
  }

  async function deleteDrafts() {
    const results = await Promise.all(
      drafts.map(async (row) => {
        try {
          const response = await fetch(
            `/api/envelopes/${encodeURIComponent(row.source.id)}`,
            { method: "DELETE" },
          );

          return { id: row.source.id, ok: response.ok };
        } catch {
          return { id: row.source.id, ok: false };
        }
      }),
    );
    const deleted = results.filter((result) => result.ok).map((r) => r.id);
    const failed = results.length - deleted.length;

    if (deleted.length === 0) {
      throw new Error("Nothing was deleted.");
    }

    onRemoved(deleted);
    toast.success(
      `${deleted.length === 1 ? "Draft deleted" : `${String(deleted.length)} drafts deleted`}${failed > 0 ? ` · ${String(failed)} couldn’t be deleted` : ""}`,
    );
    router.refresh();
  }

  return (
    <div
      aria-label="Selected documents"
      className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-(--paper) p-1.5 shadow-(--shadow-pop) [scrollbar-width:none]"
      role="toolbar"
    >
      <span
        aria-live="polite"
        className="flex shrink-0 items-center gap-1 pr-2 pl-3 text-sm font-medium text-(--fg)"
      >
        <NumberRoll value={rows.length} />
        <span>selected</span>
      </span>
      <span
        aria-hidden="true"
        className="mx-1 h-5 w-px shrink-0 bg-(--divider)"
      />

      {nothing ? (
        <span className="px-2 text-[0.8125rem] text-(--secondary)">
          Nothing to do with these together
        </span>
      ) : null}

      {completed.length > 0 ? (
        <Button
          aria-label={`Download ${String(completed.length)} signed ${completed.length === 1 ? "PDF" : "PDFs"}`}
          onClick={download}
          size="sm"
          variant="ghost"
        >
          <DownloadIcon aria-hidden="true" />
          <span className="max-sm:sr-only">Download</span>
          <Count value={completed.length} />
        </Button>
      ) : null}

      {waiting.length > 0 ? (
        <Button
          aria-label={`Send ${String(waiting.length)} ${waiting.length === 1 ? "reminder" : "reminders"}`}
          loading={reminding}
          onClick={() => void remind()}
          size="sm"
          variant="ghost"
        >
          <BellIcon aria-hidden="true" />
          <span className="max-sm:sr-only">Remind</span>
          <Count value={waiting.length} />
        </Button>
      ) : null}

      {drafts.length > 0 ? (
        <ConfirmTray
          confirmLabel={drafts.length === 1 ? "Delete draft" : "Delete drafts"}
          description="They were never sent, so no one else has seen them. This can’t be undone."
          onConfirm={deleteDrafts}
          onOpenChange={setConfirmOpen}
          open={confirmOpen}
          title={
            drafts.length === 1
              ? "Delete this draft?"
              : `Delete ${String(drafts.length)} drafts?`
          }
          trigger={
            <Button
              aria-label={`Delete ${String(drafts.length)} ${drafts.length === 1 ? "draft" : "drafts"}`}
              size="sm"
              variant="destructive-ghost"
            >
              <Trash2Icon aria-hidden="true" />
              <span className="max-sm:sr-only">Delete</span>
              <Count tone="danger" value={drafts.length} />
            </Button>
          }
        />
      ) : null}

      <span
        aria-hidden="true"
        className="mx-1 h-5 w-px shrink-0 bg-(--divider)"
      />
      <Button
        aria-label="Clear selection"
        className="shrink-0"
        onClick={onClear}
        size="icon-sm"
        variant="ghost"
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}

function Count({
  tone = "default",
  value,
}: {
  tone?: "danger" | "default";
  value: number;
}) {
  return (
    <span
      className={cn(
        "-mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums",
        tone === "danger"
          ? "bg-(--danger-soft) text-(--danger)"
          : "bg-(--surface-strong) text-(--secondary-strong)",
      )}
    >
      {value}
    </span>
  );
}
