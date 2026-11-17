"use client";

import { ChevronRightIcon } from "@/components/ui/icons";
import { motion } from "motion/react";
import type { RefObject } from "react";

import { PaperThumb } from "@/components/dashboard/paper-thumb";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import { StatusFlag } from "@/components/ui/status-flag";
import { cn } from "@/lib/cn";

import { CompletedSeal, OverflowMenu, PrimaryAction } from "./detail-header";
import type { RouteNode } from "./derive";
import type { DetailModel } from "./model";
import type { TrayName } from "./trays/tray-name";
import type { EnvelopeActions } from "./use-envelope-actions";

const card = "rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)";

/**
 * Where it stands, at the top of the story: the status in a word and in a
 * sentence, how far along the signing is, and the one thing to do next
 * (everything else behind "More").
 */
export function StatusCard({
  actions,
  model,
  moreRef,
  onOpenTray,
}: {
  actions: EnvelopeActions;
  model: DetailModel;
  moreRef: RefObject<HTMLButtonElement | null>;
  onOpenTray: (tray: TrayName) => void;
}) {
  const { record } = model;
  const showProgress = record.status !== "draft" && model.route.length > 0;

  return (
    <section aria-label="Status" className={cn(card, "p-5 sm:p-6")}>
      <div className="flex items-center gap-2.5">
        {model.flagStatus === "completed" ? (
          // On a desktop the seal is pressed into the page in the viewer
          // instead: one seal per screen.
          <CompletedSeal className="lg:hidden" envelopeId={model.envelopeId} />
        ) : null}
        <StatusFlag status={model.flagStatus} />
      </div>
      <p className="mt-3 text-[1.0625rem] leading-6 font-semibold tracking-[-0.015em] text-pretty text-(--fg)">
        {model.statusHeadline}
        {model.statusDetail ? (
          <span className="block text-[0.9375rem] font-normal tracking-normal text-(--secondary)">
            <span className="sr-only"> · </span>
            {capitalise(model.statusDetail)}
          </span>
        ) : null}
      </p>

      {showProgress ? <SigningProgress model={model} /> : null}

      <div className="mt-5 flex items-center gap-2">
        <PrimaryAction
          actions={actions}
          className="h-11 flex-1 max-sm:h-12"
          model={model}
          onOpenTray={onOpenTray}
        />
        <OverflowMenu
          actions={actions}
          model={model}
          moreRef={moreRef}
          onOpenTray={onOpenTray}
        />
      </div>
      {record.status === "sent" && model.reminderLimited ? (
        <p className="mt-2.5 text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
          {model.reminderHelperText ??
            "A reminder went out recently. You can send another later."}
        </p>
      ) : null}
    </section>
  );
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const SEGMENT: Record<RouteNode["state"], string> = {
  current: "bg-(--accent)",
  declined: "bg-(--danger)",
  "not-reached": "bg-(--surface-strong)",
  signed: "bg-(--success)",
  upcoming: "bg-(--surface-strong)",
  viewed: "bg-(--accent)",
};

/**
 * A bar in as many parts as there are signers, each filled in as they
 * sign, the current one in the accent. The parts fill in once, in order,
 * when the page opens.
 */
function SigningProgress({ model }: { model: DetailModel }) {
  const total = model.route.length;
  const label = `${String(model.signedCount)} of ${String(total)} signed`;

  return (
    <div className="mt-5 flex flex-col gap-2">
      <div
        aria-label={label}
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={model.signedCount}
        className="flex h-1.5 gap-1"
        role="progressbar"
      >
        {model.route.map((node, index) => (
          <span
            className="relative flex-1 overflow-hidden rounded-full bg-(--surface-strong)"
            key={node.signer.id}
          >
            {node.state === "upcoming" ||
            node.state === "not-reached" ? null : (
              <motion.span
                animate={{ scaleX: 1 }}
                className={cn(
                  "absolute inset-0 origin-left rounded-full",
                  SEGMENT[node.state],
                  (node.state === "current" || node.state === "viewed") &&
                    "opacity-35",
                )}
                initial={{ scaleX: 0 }}
                transition={{
                  delay: 0.12 + index * 0.08,
                  duration: DUR.morph,
                  ease: EASE.out,
                }}
              />
            )}
          </span>
        ))}
      </div>
      <p
        aria-hidden="true"
        className="text-[0.8125rem] leading-5 text-(--secondary) tabular-nums"
      >
        {label}
      </p>
    </div>
  );
}

/**
 * On a phone the document waits behind this row: its first page, what it
 * holds, and a tap opens it in a tray.
 */
export function ViewDocumentRow({
  model,
  morph,
  onOpen,
  triggerRef,
}: {
  model: DetailModel;
  /** Carry the dashboard row's page (only where the big page is not shown). */
  morph: boolean;
  onOpen: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const fieldCount = model.fields.length;
  const pages = `${String(model.pageCount)} ${model.pageCount === 1 ? "page" : "pages"}`;
  const fields =
    fieldCount > 0
      ? `${String(fieldCount)} ${fieldCount === 1 ? "field" : "fields"}`
      : null;

  return (
    <button
      aria-haspopup="dialog"
      className={cn(
        card,
        "group/doc flex w-full items-center gap-4 p-3 pr-4 text-left outline-none transition-[scale,box-shadow] duration-(--dur-hover) ease-(--ease-out) focus-visible:shadow-(--focus-ring) active:scale-[0.985]",
      )}
      onClick={onOpen}
      ref={triggerRef}
      type="button"
    >
      <span className="flex h-16 shrink-0 items-center">
        <PaperThumb
          className="h-full"
          envelopeId={model.envelopeId}
          morph={morph}
          title={model.record.title}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[0.9375rem] leading-5 font-medium text-(--fg)">
          View document
        </span>
        <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
          {[
            model.record.status === "completed" ? "Signed copy" : null,
            pages,
            fields,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 text-(--secondary) transition-transform duration-(--dur-hover) ease-(--ease-out) group-hover/doc:translate-x-0.5"
      />
    </button>
  );
}
