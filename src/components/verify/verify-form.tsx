"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  FileText,
  FileX2,
  RotateCcw,
  Upload,
} from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { AuthNotice, IconTile } from "@/components/auth/auth-parts";
import { Seal } from "@/components/brand/marks";
import { AutoHeight } from "@/components/public/auto-height";
import { StepSwap } from "@/components/public/step-swap";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { TextMorph } from "@/components/ui/text-morph";
import { cn } from "@/lib/cn";

type MatchAnswer = {
  envelopeId: string;
  fileKind: "signed-document" | "certificate";
  finishedAt: number | null;
  match: true;
  signerCount: number;
  status: "completed" | "declined" | "voided";
  title: string;
};

type VerifyAnswer = { match: false } | MatchAnswer;

type Phase =
  | { kind: "idle" }
  | { file: File; kind: "hashing" }
  | { file: File; hash: string; kind: "checking" }
  | { answer: MatchAnswer; file: File; hash: string; kind: "match" }
  | { file: File; hash: string; kind: "no-match" }
  | { file: File; hash: string | null; kind: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

const STATUS_WORDS = {
  completed: "Completed",
  declined: "Declined",
  voided: "Voided",
} as const;

const sizeFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${sizeFormatter.format(bytes / 1024)} KB`;
  }

  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

async function sha256OfFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/*
 * Verify: one card with one job. Drop a PDF; a
 * calm line says what is happening (the file never leaves the device, only
 * its fingerprint is sent); the answer is a sentence. A match earns the
 * seal, the one moment of delight here. No match says plainly what that
 * means and what to do. The fingerprint itself waits behind "Details".
 */
export function VerifyForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  // The input is visually hidden; its keyboard focus is drawn on the zone.
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const busy = phase.kind === "hashing" || phase.kind === "checking";

  async function check(file: File) {
    setPhase({ file, kind: "hashing" });

    let sha256: string | null = null;

    try {
      sha256 = await sha256OfFile(file);
      setPhase({ file, hash: sha256, kind: "checking" });

      const response = await fetch("/api/verify", {
        body: JSON.stringify({ sha256 }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        (VerifyAnswer & { error?: string }) | null;

      if (!response.ok || !payload) {
        setPhase({
          file,
          hash: sha256,
          kind: "error",
          message: payload?.error ?? "The file could not be checked right now.",
        });
        return;
      }

      setPhase(
        payload.match
          ? { answer: payload, file, hash: sha256, kind: "match" }
          : { file, hash: sha256, kind: "no-match" },
      );
    } catch {
      setPhase({
        file,
        hash: sha256,
        kind: "error",
        message: sha256
          ? "The file could not be checked right now."
          : "The file could not be read.",
      });
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // The same file can be chosen again after "Check another file".
    event.target.value = "";

    if (!file) {
      return;
    }

    void check(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);

    if (busy) {
      return;
    }

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void check(file);
    }
  }

  function reset() {
    setPhase({ kind: "idle" });
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const announcement =
    phase.kind === "hashing"
      ? `Reading ${phase.file.name}.`
      : phase.kind === "checking"
        ? `Checking ${phase.file.name}.`
        : phase.kind === "match"
          ? "Match. This file is unchanged."
          : phase.kind === "no-match"
            ? "No match."
            : "";

  return (
    <div
      aria-label="Check a file"
      className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
      role="region"
    >
      {/* One input, always mounted, so the picker opens from any state. */}
      <input
        accept="application/pdf,.pdf"
        aria-label="PDF to verify"
        className="sr-only"
        // One file at a time, so a verdict cannot land on the wrong one.
        disabled={busy}
        id="verify-file"
        onBlur={() => setKeyboardFocus(false)}
        onChange={handleFile}
        onFocus={(event) =>
          setKeyboardFocus(event.currentTarget.matches(":focus-visible"))
        }
        ref={inputRef}
        type="file"
      />

      <AutoHeight innerClassName="relative">
        <StepSwap
          stepKey={phase.kind === "idle" ? "idle" : busy ? "work" : phase.kind}
        >
          {phase.kind === "idle" ? (
            <label
              className={cn(
                "flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-(--radius-card) px-6 py-10 text-center transition-[background-color,box-shadow] duration-(--dur-hover) ease-(--ease-out)",
                keyboardFocus && "shadow-(--focus-ring)",
                dragging
                  ? "bg-(--accent-softer) shadow-[inset_0_0_0_1.5px_rgb(var(--accent-rgb)/0.45)]"
                  : "hover:bg-(--paper-hover)",
              )}
              htmlFor="verify-file"
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  setDragging(false);
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <IconTile
                className={cn(
                  "transition-[translate,background-color,color] duration-(--dur-move) ease-(--ease-out)",
                  dragging && "-translate-y-1 bg-(--paper) text-(--accent-ink)",
                )}
                size="lg"
              >
                <Upload />
              </IconTile>
              <div className="flex flex-col gap-1">
                <p className="text-base font-semibold tracking-[-0.015em] text-(--fg)">
                  {dragging ? "Drop it to check" : "Drop a signed PDF here"}
                </p>
                <p className="text-sm text-(--secondary)">
                  or{" "}
                  <span className="font-medium text-(--accent-ink) underline underline-offset-4">
                    choose a file
                  </span>
                </p>
              </div>
              <p className="max-w-[34ch] text-[0.8125rem] leading-5 text-(--secondary)">
                The file stays on your device. Only its fingerprint is sent to
                be checked.
              </p>
            </label>
          ) : busy ? (
            <WorkingPanel file={phase.file} kind={phase.kind} />
          ) : phase.kind === "match" ? (
            <MatchPanel
              answer={phase.answer}
              hash={phase.hash}
              onReset={reset}
            />
          ) : phase.kind === "no-match" ? (
            <NoMatchPanel hash={phase.hash} onReset={reset} />
          ) : phase.kind === "error" ? (
            <ResultPanel
              actions={
                <Button onClick={reset} variant="outline">
                  <RotateCcw aria-hidden="true" />
                  Try another file
                </Button>
              }
              icon={
                <IconTile size="lg" tone="warning">
                  <FileText />
                </IconTile>
              }
              title="It could not be checked"
            >
              <AuthNotice className="text-left">{phase.message}</AuthNotice>
            </ResultPanel>
          ) : null}
        </StepSwap>
      </AutoHeight>

      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  );
}

/** Reading the file, then asking this site about it: one calm line. */
function WorkingPanel({
  file,
  kind,
}: {
  file: File;
  kind: "checking" | "hashing";
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <IconTile size="lg">
        <FileText />
      </IconTile>
      <div className="flex max-w-full min-w-0 flex-col items-center gap-1">
        <p className="max-w-full truncate text-base font-semibold tracking-[-0.015em] text-(--fg)">
          {file.name}
        </p>
        <p className="text-sm text-(--secondary)">
          <TextMorph>
            {kind === "hashing"
              ? "Reading the file…"
              : "Checking with this site…"}
          </TextMorph>
        </p>
      </div>
      <ProgressLine />
      <p className="text-[0.8125rem] text-(--secondary) tabular-nums">
        {formatSize(file.size)}
      </p>
    </div>
  );
}

/** An indeterminate line that glides, or a quiet pulse with reduced motion. */
function ProgressLine() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="relative h-1 w-40 overflow-hidden rounded-full bg-(--track)"
    >
      {reduceMotion ? (
        <div className="absolute inset-0 animate-pulse rounded-full bg-[rgb(var(--accent-rgb)/0.35)]" />
      ) : (
        <motion.div
          animate={{ x: ["-100%", "250%"] }}
          className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-(--accent)"
          transition={{
            duration: 1.1,
            ease: EASE.inOut,
            repeat: Infinity,
          }}
        />
      )}
    </div>
  );
}

function ResultPanel({
  actions,
  children,
  icon,
  title,
}: {
  actions: ReactNode;
  children?: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 px-4 pt-9 pb-6 text-center sm:px-8">
      {icon}
      <div className="flex w-full flex-col items-center gap-3">
        <h2 className="text-xl leading-7 font-semibold tracking-[-0.025em] text-balance text-(--fg)">
          {title}
        </h2>
        {children}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {actions}
      </div>
    </div>
  );
}

/** A match: the seal settles in, and the answer reads as a sentence. */
function MatchPanel({
  answer,
  hash,
  onReset,
}: {
  answer: MatchAnswer;
  hash: string;
  onReset: () => void;
}) {
  const kind =
    answer.fileKind === "signed-document"
      ? "signed document"
      : "audit certificate";
  const finished = answer.finishedAt
    ? `${dateFormatter.format(new Date(answer.finishedAt * 1000))} UTC`
    : null;

  return (
    <ResultPanel
      actions={
        <Button onClick={onReset} variant="outline">
          <RotateCcw aria-hidden="true" />
          Check another file
        </Button>
      }
      icon={
        <Seal
          className="size-20 [animation-delay:160ms]!"
          label="Sealed"
          stamped
        />
      }
      title="This file is unchanged."
    >
      <p className="max-w-[44ch] text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
        It is the {kind} this site produced for{" "}
        <span className="font-medium text-(--fg)">
          &ldquo;{answer.title}&rdquo;
        </span>
        , byte for byte
        {finished ? `, finished ${finished}` : ""}.
      </p>
      <Details
        rows={[
          { label: "Document", value: answer.title },
          { label: "Status", value: STATUS_WORDS[answer.status] },
          {
            label: "Signers",
            value: String(answer.signerCount),
          },
          { label: "Finished", value: finished ?? "Not recorded" },
          { label: "Envelope ID", mono: true, value: answer.envelopeId },
        ]}
        hash={hash}
      />
    </ResultPanel>
  );
}

function NoMatchPanel({
  hash,
  onReset,
}: {
  hash: string;
  onReset: () => void;
}) {
  return (
    <ResultPanel
      actions={
        <Button onClick={onReset} variant="outline">
          <RotateCcw aria-hidden="true" />
          Check another file
        </Button>
      }
      icon={
        <IconTile size="lg" tone="danger">
          <FileX2 />
        </IconTile>
      }
      title="This site did not produce this exact file."
    >
      <p className="max-w-[46ch] text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
        It is not necessarily forged, but it is not the copy this site sealed.
        Usually it was changed after signing, saved again by another program, or
        it is a copy from before signing finished. Ask the sender for the copy
        kept here, or download it again from the completion email.
      </p>
      <Details hash={hash} rows={[]} />
    </ResultPanel>
  );
}

/**
 * The facts and the fingerprint, folded: most people only need the
 * sentence above. Opens with height, like a tray growing.
 */
function Details({
  hash,
  rows,
}: {
  hash: string;
  rows: { label: string; mono?: boolean; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex w-full flex-col items-center">
      <button
        aria-controls="verify-details"
        aria-expanded={open}
        className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-medium text-(--secondary) outline-none transition-colors duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring)"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? "Hide details" : "Show details"}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 stroke-[1.75] transition-transform duration-(--dur-move) ease-(--ease-out)",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                duration: reduceMotion ? 0 : DUR.panel,
                ease: EASE.out,
              },
            }}
            className="w-full overflow-hidden"
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                duration: reduceMotion ? 0 : exitDuration(DUR.panel),
                ease: EASE.exit,
              },
            }}
            id="verify-details"
            initial={{ height: 0, opacity: 0 }}
          >
            <div className="mt-2 rounded-[0.875rem] bg-(--surface) px-4 py-1 text-left">
              <dl className="divide-y divide-(--divider)">
                {rows.map((row) => (
                  <div
                    className="flex items-baseline justify-between gap-4 py-2"
                    key={row.label}
                  >
                    <dt className="shrink-0 text-[0.8125rem] text-(--secondary)">
                      {row.label}
                    </dt>
                    <dd
                      className={cn(
                        "min-w-0 text-right text-sm font-medium text-pretty break-words text-(--fg)",
                        row.mono && "font-mono text-[0.8125rem]",
                      )}
                      title={row.value}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
                <div className="flex flex-col gap-1.5 py-3">
                  <dt className="text-[0.8125rem] text-(--secondary)">
                    SHA-256 fingerprint
                  </dt>
                  <dd className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-mono text-[0.8125rem] leading-5 break-all text-(--fg)">
                      {hash}
                    </span>
                    <CopyButton
                      aria-label="Copy SHA-256 fingerprint"
                      className="-mt-1 shrink-0"
                      size="sm"
                      toastMessage="Fingerprint copied"
                      value={hash}
                    >
                      Copy
                    </CopyButton>
                  </dd>
                </div>
              </dl>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
