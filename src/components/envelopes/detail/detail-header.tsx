"use client";

import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BanIcon,
  BellRingIcon,
  CalendarClockIcon,
  CheckIcon,
  CopyPlusIcon,
  DownloadIcon,
  FileClockIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
  PencilLineIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";

import { Seal } from "@/components/brand/marks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { TextMorph } from "@/components/ui/text-morph";
import { cn } from "@/lib/cn";

import type { DetailModel } from "./model";
import type { TrayName } from "./trays/tray-name";
import type { EnvelopeActions } from "./use-envelope-actions";

type HeaderProps = {
  actions: EnvelopeActions;
  model: DetailModel;
  moreRef: RefObject<HTMLButtonElement | null>;
  onOpenTray: (tray: TrayName) => void;
};

export function BackLink({
  href = "/dashboard",
  label = "Documents",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      className="group/back -ml-1 inline-flex w-fit items-center gap-1.5 rounded-full px-1 py-0.5 text-sm font-medium text-(--secondary) transition-colors duration-(--dur-hover) ease-(--ease-out) outline-none hover:text-(--fg) focus-visible:shadow-(--focus-ring)"
      href={href}
    >
      <ArrowLeftIcon
        aria-hidden="true"
        className="size-4 transition-transform duration-(--dur-hover) ease-(--ease-out) group-hover/back:-translate-x-0.5"
        strokeWidth={1.75}
      />
      {label}
    </Link>
  );
}

/**
 * The top of the document page: its name, and what it is in a few words.
 * Where it stands and what to do next open the story beside the document
 * (StatusCard).
 */
export function DetailHeader({ model }: { model: DetailModel }) {
  const { record } = model;
  const people = record.signers.length;
  const meta = [
    `${String(model.pageCount)} ${model.pageCount === 1 ? "page" : "pages"}`,
    people > 0
      ? `${String(people)} ${people === 1 ? "signer" : "signers"}`
      : null,
    record.createdAtLabel ? `Created ${record.createdAtLabel}` : null,
  ].filter(Boolean);

  return (
    <header className="flex min-w-0 flex-col gap-1.5">
      <h1
        className={cn(
          "text-2xl leading-8 font-semibold tracking-[-0.03em] text-balance break-words text-(--fg) sm:text-[1.75rem] sm:leading-9",
          record.status === "voided" && "text-(--secondary)",
        )}
      >
        {record.title}
      </h1>
      <p className="text-[0.9375rem] leading-6 text-(--secondary)">
        {meta.join(" · ")}
      </p>
      {model.ownerLabel ? (
        <p className="text-[0.9375rem] leading-6 text-(--secondary)">
          Sent by {model.ownerLabel}
        </p>
      ) : null}
    </header>
  );
}

const sealKey = (envelopeId: string) => `signudoc:sealed:${envelopeId}`;

/*
 * Whether this visit is the first in the session, read once per page view
 * and shared, so the seal on the status card (phones) and the one on the
 * page (desktop) agree on whether to press.
 */
const firstVisits = new Map<string, { at: number; first: boolean }>();

function readFirstVisit(envelopeId: string) {
  const cached = firstVisits.get(envelopeId);

  if (cached && Date.now() - cached.at < 2000) {
    return cached.first;
  }

  let first = false;

  try {
    first = !window.sessionStorage.getItem(sealKey(envelopeId));
    window.sessionStorage.setItem(sealKey(envelopeId), "seen");
  } catch {
    // Storage refused (private windows): just show it.
  }

  firstVisits.set(envelopeId, { at: Date.now(), first });

  return first;
}

/**
 * A completed document's seal: pressed on the first visit in a session,
 * then simply there. `onPaper` is the larger one pressed into the corner
 * of the page in the viewer, a little later so the page has landed first.
 */
export function CompletedSeal({
  className,
  envelopeId,
  onPaper = false,
}: {
  className?: string;
  envelopeId: string;
  onPaper?: boolean;
}) {
  const [phase, setPhase] = useState<"pending" | "land" | "rest">("pending");

  useEffect(() => {
    const first = readFirstVisit(envelopeId);

    // After the page has settled, so the press is seen, not missed.
    const timer = window.setTimeout(
      () => setPhase(first ? "land" : "rest"),
      first ? (onPaper ? 420 : 280) : 0,
    );

    return () => window.clearTimeout(timer);
  }, [envelopeId, onPaper]);

  return (
    <Seal
      className={cn(
        "size-8",
        onPaper && "size-14",
        phase === "pending" && "opacity-0",
        className,
      )}
      stamped={phase === "land"}
    />
  );
}

/** The one thing to do next, by state. */
export function PrimaryAction({
  actions,
  className,
  model,
  onOpenTray,
}: {
  actions: EnvelopeActions;
  className?: string;
  model: DetailModel;
  onOpenTray: (tray: TrayName) => void;
}) {
  const { record } = model;

  // Someone else's envelope, seen by an administrator: reading and
  // downloading are theirs, changing it stays with its sender.
  if (!model.isOwn) {
    if (record.status === "completed") {
      return (
        <Button
          className={className}
          onClick={() => actions.download("signed")}
        >
          <DownloadIcon aria-hidden="true" />
          Download signed PDF
        </Button>
      );
    }

    if (record.status === "declined" || record.status === "voided") {
      return (
        <Button
          className={className}
          onClick={() => actions.download("evidence")}
        >
          <FileClockIcon aria-hidden="true" />
          Download certificate
        </Button>
      );
    }

    return (
      <Button asChild className={className}>
        <a
          href={`/api/envelopes/${encodeURIComponent(model.envelopeId)}/document`}
          rel="noopener"
          target="_blank"
        >
          <ArrowUpRightIcon aria-hidden="true" />
          Open the PDF
        </a>
      </Button>
    );
  }

  if (record.status === "draft") {
    return (
      <Button asChild className={className}>
        <Link
          href={`/envelopes/${encodeURIComponent(model.envelopeId)}/prepare`}
        >
          <PencilLineIcon aria-hidden="true" />
          Continue editing
        </Link>
      </Button>
    );
  }

  if (record.status === "sent" && model.isExpired) {
    return (
      <Button className={className} onClick={() => onOpenTray("deadline")}>
        <CalendarClockIcon aria-hidden="true" />
        Set a new deadline
      </Button>
    );
  }

  if (record.status === "sent") {
    return (
      <ReminderButton actions={actions} className={className} model={model} />
    );
  }

  if (record.status === "completed") {
    return (
      <Button className={className} onClick={() => actions.download("signed")}>
        <DownloadIcon aria-hidden="true" />
        Download signed PDF
      </Button>
    );
  }

  return (
    <Button className={className} onClick={() => onOpenTray("copy")}>
      <CopyPlusIcon aria-hidden="true" />
      Copy to new draft
    </Button>
  );
}

/** Send reminder → Sending… → Reminder sent, in one morphing label. */
function ReminderButton({
  actions,
  className,
  model,
}: {
  actions: EnvelopeActions;
  className?: string;
  model: DetailModel;
}) {
  const [justSent, setJustSent] = useState(false);
  const sent = justSent || model.reminderLimited;
  const sending = actions.isSendingReminder;

  return (
    <Button
      aria-live="polite"
      className={className}
      disabled={!model.currentSigner || sent}
      onClick={() => {
        if (sending || sent) {
          return;
        }

        void actions
          .sendReminder(model.currentSigner?.name)
          .then((ok) => setJustSent(ok));
      }}
      title={sent ? (model.reminderHelperText ?? undefined) : undefined}
      variant={sent ? "outline" : "default"}
    >
      {sent ? (
        <CheckIcon aria-hidden="true" className="text-(--success)" />
      ) : (
        <BellRingIcon aria-hidden="true" />
      )}
      <TextMorph>
        {sent ? "Reminder sent" : sending ? "Sending…" : "Send reminder"}
      </TextMorph>
    </Button>
  );
}

/** Everything that is not the next step, grouped by how often it is needed. */
export function OverflowMenu({
  actions,
  className,
  model,
  moreRef,
  onOpenTray,
}: HeaderProps & { className?: string }) {
  const { record } = model;
  const status = record.status;
  const copyIsPrimary = status === "declined" || status === "voided";
  const finished =
    status === "completed" || status === "declined" || status === "voided";
  const own = model.isOwn;
  // For someone else's declined or voided envelope the certificate is the
  // main button already.
  const certificateIsPrimary =
    !own && (status === "declined" || status === "voided");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label="More actions"
          className={cn("size-11 max-sm:size-12", className)}
          ref={moreRef}
          size="md"
          tooltip={false}
          variant="outline"
        >
          <MoreHorizontalIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem asChild>
          <a
            href={`/api/envelopes/${encodeURIComponent(model.envelopeId)}/document`}
            rel="noopener"
            target="_blank"
          >
            <ArrowUpRightIcon aria-hidden="true" />
            Open the PDF
          </a>
        </DropdownMenuItem>
        {finished && !certificateIsPrimary ? (
          <DropdownMenuItem onSelect={() => actions.download("evidence")}>
            <FileClockIcon aria-hidden="true" />
            Download certificate
          </DropdownMenuItem>
        ) : null}
        {status !== "draft" ? (
          <DropdownMenuItem onSelect={() => actions.exportAuditTrail()}>
            <DownloadIcon aria-hidden="true" />
            Export audit trail
          </DropdownMenuItem>
        ) : null}
        {own && status === "sent" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onOpenTray("deadline")}>
              <CalendarClockIcon aria-hidden="true" />
              {model.isExpired ? "Set a new deadline" : "Change deadline"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenTray("reminders")}>
              <BellRingIcon aria-hidden="true" />
              Reminders
            </DropdownMenuItem>
          </>
        ) : null}
        {own &&
        ((status !== "draft" && !copyIsPrimary) ||
          record.signers.length > 0) ? (
          <DropdownMenuSeparator />
        ) : null}
        {own && status !== "draft" && !copyIsPrimary ? (
          <DropdownMenuItem onSelect={() => onOpenTray("copy")}>
            <CopyPlusIcon aria-hidden="true" />
            Copy to new draft
          </DropdownMenuItem>
        ) : null}
        {own && record.signers.length > 0 ? (
          <DropdownMenuItem onSelect={() => onOpenTray("template")}>
            <LayoutTemplateIcon aria-hidden="true" />
            Save as template
          </DropdownMenuItem>
        ) : null}
        {own && status === "sent" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onOpenTray("void")}
              variant="destructive"
            >
              <BanIcon aria-hidden="true" />
              Void envelope
            </DropdownMenuItem>
          </>
        ) : null}
        {own && status === "draft" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onOpenTray("delete")}
              variant="destructive"
            >
              <Trash2Icon aria-hidden="true" />
              Delete draft
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
