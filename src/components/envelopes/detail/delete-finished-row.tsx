"use client";

import { Button } from "@/components/ui/button";
import { Trash2Icon } from "@/components/ui/icons";

/**
 * The administrator's way to delete a finished envelope. Quiet, at the foot
 * of the page, and only shown to administrators: the button opens a danger
 * tray that says exactly what goes and asks for a reason.
 */
export function DeleteFinishedRow({ onDelete }: { onDelete: () => void }) {
  return (
    <section
      aria-labelledby="delete-finished-title"
      className="flex flex-col gap-3 rounded-(--radius-card) bg-(--paper) px-5 py-4 shadow-(--shadow-card) sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h2
          className="text-[0.9375rem] leading-6 font-medium text-(--fg)"
          id="delete-finished-title"
        >
          Delete for good
        </h2>
        <p className="text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
          Administrators can remove a finished envelope and everything with it.
          The install&apos;s audit log keeps a record.
        </p>
      </div>
      <Button
        className="shrink-0"
        onClick={onDelete}
        type="button"
        variant="destructive-ghost"
      >
        <Trash2Icon aria-hidden="true" />
        Delete envelope
      </Button>
    </section>
  );
}
