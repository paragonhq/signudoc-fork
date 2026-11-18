"use client";

import { ChevronRightIcon } from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import {
  groupRows,
  plainStatusLine,
  rowHref,
  TIME_GROUP_LABELS,
  type DocumentRow,
} from "@/components/dashboard/dashboard-model";
import { PaperThumb } from "@/components/dashboard/paper-thumb";
import { getInitials } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { StatusFlag } from "@/components/ui/status-flag";
import { getSignerPalette } from "@/components/envelopes/signer-palette";

export type ListSelection = {
  /** Checkboxes on every row (a phone's "Select", or once one is ticked). */
  active: boolean;
  /** Tapping a row ticks it instead of opening it (explicit "Select"). */
  rowToggles: boolean;
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
};

/**
 * The documents, grouped by when they were made (Today, This week,
 * Earlier), each group a white card of calm rows.
 * No column headers, no IDs: a page, a title, where it stands in words,
 * who signs and a soft status pill. The whole row opens the document.
 *
 * Selecting: with a mouse, the page tile turns into a checkbox under the
 * pointer (or with focus); once one is ticked, every row shows its box.
 * Rows that leave (a deleted draft) fold away instead of vanishing.
 */
export function DocumentList({
  now,
  rows,
  selection,
}: {
  now: number;
  rows: readonly DocumentRow[];
  selection?: ListSelection;
}) {
  return (
    <div className="section-stack" data-slot="document-list">
      {groupRows(rows, now).map(({ group, rows: groupRows }) => (
        <section
          aria-labelledby={`documents-${group}`}
          className="flex flex-col gap-2.5"
          key={group}
        >
          <h2
            className="px-1 text-[0.8125rem] leading-5 font-medium text-(--secondary)"
            id={`documents-${group}`}
          >
            {TIME_GROUP_LABELS[group]}
          </h2>
          <ul className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
            <AnimatePresence initial={false}>
              {groupRows.map((row) => (
                <motion.li
                  className="group/row relative overflow-hidden not-first:before:absolute not-first:before:top-0 not-first:before:right-4 not-first:before:left-[4.375rem] not-first:before:z-10 not-first:before:h-px not-first:before:bg-(--divider) sm:not-first:before:right-5 sm:not-first:before:left-[4.75rem]"
                  data-checks={selection?.active ? "" : undefined}
                  data-selected={
                    selection?.selected.has(row.source.id) ? "true" : undefined
                  }
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: {
                      duration: exitDuration(DUR.panel),
                      ease: EASE.exit,
                    },
                  }}
                  key={row.source.id}
                >
                  <DocumentListRow now={now} row={row} selection={selection} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  );
}

function DocumentListRow({
  now,
  row,
  selection,
}: {
  now: number;
  row: DocumentRow;
  selection?: ListSelection;
}) {
  const { id, title } = row.source;
  const isSelected = selection?.selected.has(id) ?? false;

  return (
    <>
      <Link
        className={cn(
          "flex min-h-16 items-center gap-3.5 px-4 py-3 outline-none sm:gap-4 sm:px-5",
          "transition-[background-color] duration-(--dur-hover) ease-(--ease-out)",
          "hover:bg-(--hover) active:bg-(--press) focus-visible:bg-(--hover) focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--accent-rgb)/0.45)]",
          "group-data-selected/row:bg-[rgb(var(--accent-rgb)/0.05)] group-data-selected/row:hover:bg-[rgb(var(--accent-rgb)/0.08)]",
        )}
        href={rowHref(row)}
        onClick={(event) => {
          if (selection?.rowToggles) {
            event.preventDefault();
            selection.toggle(id);
          }
        }}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-(--surface) transition-opacity duration-(--dur-hover) ease-(--ease-out) group-data-checks/row:opacity-0 pointer-fine:group-hover/row:opacity-0 group-has-[button:focus-visible]/row:opacity-0">
          <PaperThumb
            className="h-[2.125rem] rounded-[0.3125rem]"
            envelopeId={id}
            interactive
            title={title}
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[0.9375rem] leading-5 font-medium tracking-[-0.01em] text-(--fg)">
            {title}
          </span>
          <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
            {row.source.senderLabel ? (
              <>
                <span className="sr-only">Sent by </span>
                <span className="text-(--fg)/80">{row.source.senderLabel}</span>
                <span aria-hidden="true"> · </span>
              </>
            ) : null}
            {plainStatusLine(row, now)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <Signers row={row} />
          {row.templateDraft ? (
            <StatusFlag glyph="dot" size="sm" tone="accent">
              Template draft
            </StatusFlag>
          ) : (
            <StatusFlag size="sm" status={row.flag} />
          )}
          <ChevronRightIcon
            aria-hidden="true"
            className="-ml-1 hidden size-4 text-(--secondary) opacity-0 transition-[opacity,translate] duration-(--dur-hover) ease-(--ease-out) group-hover/row:translate-x-0.5 group-hover/row:opacity-100 group-has-[a:focus-visible]/row:opacity-100 sm:pointer-fine:block"
          />
        </span>
      </Link>
      {selection ? (
        <span
          className={cn(
            // Over the page tile: the tile becomes the checkbox.
            "absolute top-1/2 left-4 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-[0.625rem] sm:left-5",
            "pointer-events-none scale-90 opacity-0 transition-[opacity,scale] duration-(--dur-hover) ease-(--ease-out)",
            "pointer-fine:group-hover/row:pointer-events-auto pointer-fine:group-hover/row:scale-100 pointer-fine:group-hover/row:opacity-100",
            "group-data-checks/row:pointer-events-auto group-data-checks/row:scale-100 group-data-checks/row:opacity-100",
            "has-[button:focus-visible]:pointer-events-auto has-[button:focus-visible]:scale-100 has-[button:focus-visible]:opacity-100",
            "motion-reduce:scale-100",
          )}
        >
          <Checkbox
            aria-label={`Select ${title}`}
            checked={isSelected}
            onCheckedChange={() => selection.toggle(id)}
          />
        </span>
      ) : null}
    </>
  );
}

const MAX_FACES = 3;

/** Who signs, as small overlapping initials in their signer colours. */
function Signers({ row }: { row: DocumentRow }) {
  const faces = row.signers.slice(0, MAX_FACES);
  const extra = row.signers.length - faces.length;

  if (faces.length === 0) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="hidden items-center -space-x-1.5 md:flex"
    >
      {faces.map((signer, index) => {
        const palette = getSignerPalette(index);

        return (
          <span
            className="inline-flex size-6 items-center justify-center rounded-full bg-(--paper) text-[0.625rem] font-semibold shadow-[0_0_0_2px_var(--paper)]"
            key={`${signer.email}-${String(index)}`}
            style={{ color: palette.color }}
            title={signer.email}
          >
            <span
              className="inline-flex size-full items-center justify-center rounded-full"
              style={{ background: palette.tint }}
            >
              {getInitials(signer.email)}
            </span>
          </span>
        );
      })}
      {extra > 0 ? (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-(--surface-strong) text-[0.625rem] font-medium text-(--secondary) shadow-[0_0_0_2px_var(--paper)]">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
