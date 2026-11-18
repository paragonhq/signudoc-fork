"use client";

import {
  CircleAlertIcon,
  FileUpIcon,
  PencilIcon,
  PencilLineIcon,
} from "@/components/ui/icons";
import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { Skeleton } from "@/components/ui/skeleton";
import { TextMorph } from "@/components/ui/text-morph";
import { cn } from "@/lib/cn";

import { AutoHeight } from "./auto-height";

export type UploadSummary = {
  file: File;
  fileName: string;
  sizeLabel: string;
};

export type DropSheetPhase = "done" | "idle" | "uploading";

type UploadDropSheetProps = {
  errorMessage: string | null;
  isDragActive: boolean;
  /** A Word or other document is being read before the editor opens. */
  isImporting?: boolean;
  /** Present when the chosen PDF was written here: reopens the editor. */
  onEditDocument?: () => void;
  onOpenFilePicker: () => void;
  onRemoveFile: () => void;
  /** Opens the document editor on a blank page. */
  onWriteDocument?: () => void;
  phase: DropSheetPhase;
  previewUrl: string | null;
  /** Goes up by one each time a file is refused, to nudge the card. */
  refusals: number;
  summary: UploadSummary | null;
  /** The title field, drawn under the drop area while there is no file. */
  titleField: ReactNode;
  /** The title, edited in place beside the page once there is a file. */
  titleInline: ReactNode;
};

const swap = {
  animate: { opacity: 1, scale: 1 },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: exitDuration(DUR.open), ease: EASE.exit },
  },
  initial: { opacity: 0, scale: 0.98 },
  transition: { duration: DUR.open, ease: EASE.out },
} as const;

/**
 * The one white card on the upload step. Empty, it is a large, friendly
 * drop area (the whole page takes a drop too) with the title field under
 * it. With a file, the drop area becomes the document: its first page,
 * the title to edit in place, the file's name and size. The card glides
 * to its new height instead of jumping. A refused file nudges the card
 * once and says why under it.
 */
export function UploadDropSheet({
  errorMessage,
  isDragActive,
  isImporting = false,
  onEditDocument,
  onOpenFilePicker,
  onRemoveFile,
  onWriteDocument,
  phase,
  previewUrl,
  refusals,
  summary,
  titleField,
  titleInline,
}: UploadDropSheetProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();
  const lastRefusalsRef = useRef(refusals);

  useEffect(() => {
    if (refusals === lastRefusalsRef.current) {
      return;
    }

    lastRefusalsRef.current = refusals;

    if (reduceMotion || !scope.current) {
      return;
    }

    void animate(
      scope.current,
      { x: [0, -6, 5, -2, 0] },
      { duration: 0.36, ease: EASE.out },
    );
  }, [animate, reduceMotion, refusals, scope]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
        ref={scope}
      >
        <AutoHeight>
          <AnimatePresence initial={false} mode="popLayout">
            {summary ? (
              <motion.div key="file" {...swap}>
                <SelectedFile
                  onEditDocument={onEditDocument}
                  onOpenFilePicker={onOpenFilePicker}
                  onRemoveFile={onRemoveFile}
                  phase={phase}
                  previewUrl={previewUrl}
                  summary={summary}
                  titleInline={titleInline}
                />
              </motion.div>
            ) : (
              <motion.div className="flex flex-col" key="empty" {...swap}>
                <div className="p-2">
                  <DropArea
                    hasError={Boolean(errorMessage)}
                    isDragActive={isDragActive}
                    isImporting={isImporting}
                    onOpenFilePicker={onOpenFilePicker}
                  />
                </div>
                {onWriteDocument ? (
                  <WriteDocumentRow onWriteDocument={onWriteDocument} />
                ) : null}
                <div className="px-4 pt-3 pb-5 sm:px-6">{titleField}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </AutoHeight>
      </div>

      <AnimatePresence initial={false}>
        {errorMessage ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{
              height: 0,
              opacity: 0,
              transition: { duration: exitDuration(DUR.move), ease: EASE.exit },
            }}
            initial={{ height: 0, opacity: 0 }}
            key="error"
            transition={{ duration: DUR.move, ease: EASE.out }}
          >
            <div
              className="flex items-start gap-3 rounded-(--radius-well) bg-(--danger-soft) px-4 py-3"
              role="alert"
            >
              <CircleAlertIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-(--danger)"
              />
              <p className="text-sm leading-5 text-(--danger)">
                {errorMessage}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * The other way in: write the document here, with the same editor a word
 * processor has, instead of uploading one.
 */
export function WriteDocumentRow({
  className,
  onWriteDocument,
}: {
  className?: string;
  onWriteDocument: () => void;
}) {
  return (
    <div className={cn("flex flex-col gap-3 px-4 pt-3 sm:px-6", className)}>
      <div
        aria-hidden="true"
        className="flex items-center gap-3 text-[0.75rem] font-medium text-(--tertiary)"
      >
        <span className="h-px flex-1 bg-(--divider)" />
        or
        <span className="h-px flex-1 bg-(--divider)" />
      </div>
      <button
        className="group/write flex items-center gap-3.5 rounded-[0.875rem] bg-(--surface) p-3 pr-4 text-left outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--surface-strong) focus-visible:shadow-(--focus-ring)"
        onClick={onWriteDocument}
        type="button"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-(--paper) text-(--accent) shadow-(--shadow-card-flat) transition-transform duration-(--dur-move) ease-(--ease-spring) group-hover/write:-translate-y-0.5"
        >
          <PencilLineIcon className="size-5" strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-(--fg)">
            Write a document
          </span>
          <span className="text-[0.8125rem] leading-5 text-(--secondary)">
            Start blank or from an outline, paste from anywhere, format it fully
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-(--tertiary) transition-[translate,color] duration-(--dur-hover) group-hover/write:translate-x-0.5 group-hover/write:text-(--fg)"
        >
          →
        </span>
      </button>
    </div>
  );
}

function DropArea({
  hasError,
  isDragActive,
  isImporting,
  onOpenFilePicker,
}: {
  hasError: boolean;
  isDragActive: boolean;
  isImporting: boolean;
  onOpenFilePicker: () => void;
}) {
  return (
    <button
      className={cn(
        "group/drop flex min-h-60 w-full flex-col items-center justify-center gap-4 rounded-[0.875rem] px-6 py-10 text-center outline-none sm:min-h-72",
        "border border-dashed transition-[background-color,border-color] duration-(--dur-hover) ease-(--ease-out)",
        "focus-visible:shadow-(--focus-ring)",
        isDragActive
          ? "border-[rgb(var(--accent-rgb)/0.55)] bg-(--accent-softer)"
          : hasError
            ? "border-[rgb(var(--danger-rgb)/0.35)] bg-(--surface)"
            : "border-[rgb(var(--fg-rgb)/0.12)] bg-(--surface) hover:border-[rgb(var(--fg-rgb)/0.2)]",
      )}
      aria-busy={isImporting}
      data-drop=""
      disabled={isImporting}
      onClick={onOpenFilePicker}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-14 items-center justify-center rounded-[1rem] bg-(--paper) text-(--accent) shadow-(--shadow-card-flat)",
          "transition-transform duration-(--dur-move) ease-(--ease-spring) group-hover/drop:-translate-y-0.5 group-active/drop:scale-[0.97]",
          isDragActive && "-translate-y-1 scale-105",
        )}
      >
        <FileUpIcon className="size-6" strokeWidth={1.75} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[1.0625rem] leading-6 font-semibold tracking-[-0.015em] text-(--fg)">
          {isImporting ? (
            "Opening your document…"
          ) : isDragActive ? (
            "Let go to add it"
          ) : (
            <>
              <span className="pointer-coarse:hidden">
                Drop your PDF or Word document here
              </span>
              <span className="hidden pointer-coarse:inline">
                Choose a document
              </span>
            </>
          )}
        </span>
        <span className="text-sm leading-5 text-(--secondary)">
          <span className="pointer-coarse:hidden">
            or{" "}
            <span className="font-medium text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.3)] underline-offset-4 transition-[text-decoration-color] duration-(--dur-hover) group-hover/drop:decoration-(--accent-ink)">
              choose a file
            </span>{" "}
            ·{" "}
          </span>
          PDF or Word (.docx) · up to 20 MB
        </span>
      </span>
    </button>
  );
}

function SelectedFile({
  onEditDocument,
  onOpenFilePicker,
  onRemoveFile,
  phase,
  previewUrl,
  summary,
  titleInline,
}: {
  onEditDocument?: () => void;
  onOpenFilePicker: () => void;
  onRemoveFile: () => void;
  phase: DropSheetPhase;
  previewUrl: string | null;
  summary: UploadSummary;
  titleInline: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const isBusy = phase !== "idle";

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-4 p-4 [grid-template-areas:'thumb_meta'_'title_title'] sm:grid-rows-[auto_1fr] sm:gap-x-6 sm:gap-y-2 sm:p-6 sm:[grid-template-areas:'thumb_title'_'thumb_meta']">
      {/* The first page, on a soft well, like the documents list. */}
      <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-(--radius-well) bg-(--surface) [grid-area:thumb] sm:h-40 sm:w-32">
        <AnimatePresence initial={false} mode="popLayout">
          {previewUrl ? (
            // A blob: URL drawn in this browser from the chosen file.
            <motion.img
              alt="First page of the chosen PDF"
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="block h-[4.75rem] w-auto max-w-16 rounded-[0.3125rem] bg-(--paper) object-contain shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.06),0_1px_2px_rgb(var(--fg-rgb)/0.06),0_6px_16px_-8px_rgb(var(--fg-rgb)/0.18)] sm:h-[8.25rem] sm:max-w-[6.75rem] sm:rounded-[0.375rem]"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.94, y: 4 }
              }
              key={previewUrl}
              src={previewUrl}
              transition={{ duration: DUR.open, ease: EASE.out }}
            />
          ) : (
            <Skeleton
              className="aspect-[17/22] h-[4.75rem] rounded-[0.3125rem] sm:h-[8.25rem]"
              delay={150}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="min-w-0 pt-0.5 [grid-area:title]">{titleInline}</div>

      <div className="flex min-w-0 flex-col gap-2 [grid-area:meta] max-sm:self-center">
        <p className="flex min-w-0 items-center text-[0.8125rem] leading-5 text-(--secondary)">
          <span className="truncate">{summary.fileName}</span>
          <span aria-hidden="true" className="px-1.5">
            ·
          </span>
          <span className="shrink-0 tabular-nums">{summary.sizeLabel}</span>
        </p>

        <div className="min-h-(--control-h-sm)">
          <AnimatePresence initial={false} mode="popLayout">
            {isBusy ? (
              <motion.div
                animate={{ opacity: 1 }}
                className="flex flex-col gap-2 pt-1"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="progress"
                transition={{ duration: DUR.hover }}
              >
                <UploadBar done={phase === "done"} />
                <p className="text-[0.8125rem] leading-5 text-(--secondary)">
                  <TextMorph live>
                    {phase === "done" ? "Saved as a draft" : "Uploading…"}
                  </TextMorph>
                </p>
              </motion.div>
            ) : (
              <motion.div
                animate={{ opacity: 1 }}
                className="-ml-2.5 flex flex-wrap items-center gap-1"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="actions"
                transition={{ duration: DUR.hover }}
              >
                {onEditDocument ? (
                  <Button
                    onClick={onEditDocument}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <PencilIcon aria-hidden="true" />
                    Edit document
                  </Button>
                ) : null}
                <Button
                  onClick={onOpenFilePicker}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Replace
                </Button>
                <Button
                  onClick={onRemoveFile}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/**
 * The upload has no byte count, so the bar eases towards 90% while the
 * file goes up and closes when the draft exists.
 */
function UploadBar({ done }: { done: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <span
      aria-hidden="true"
      className="block h-1 w-full max-w-xs overflow-hidden rounded-full bg-(--track)"
    >
      <motion.span
        animate={{ scaleX: done ? 1 : 0.9 }}
        className="block h-full origin-left rounded-full bg-(--accent)"
        initial={{ scaleX: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : done
              ? { duration: DUR.open, ease: EASE.out }
              : { duration: 4.5, ease: EASE.out }
        }
      />
    </span>
  );
}

/**
 * The title, edited in place beside the page: it reads as the document's
 * name and turns into a field on hover and focus.
 */
export function InlineTitle({
  disabled,
  inputRef,
  onChange,
  onEnter,
  value,
}: {
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onEnter: () => void;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <label
        className="text-[0.8125rem] leading-5 font-medium text-(--secondary)"
        htmlFor="envelope-title-inline"
      >
        Envelope title
      </label>
      <div className="group/title relative -mx-2.5 min-w-0">
        <input
          autoComplete="off"
          className={cn(
            "h-11 w-full min-w-0 rounded-(--radius-well) bg-transparent px-2.5 pr-9 text-lg leading-7 font-semibold tracking-[-0.02em] text-(--fg) outline-none placeholder:font-medium placeholder:text-(--placeholder) sm:text-xl",
            "transition-[box-shadow,background-color] duration-(--dur-hover) ease-(--ease-out)",
            "hover:bg-(--hover) focus:bg-(--paper) focus:shadow-(--focus-ring-input) disabled:opacity-60",
            !value.trim() && "shadow-(--ring-input)",
          )}
          disabled={disabled}
          id="envelope-title-inline"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
              event.preventDefault();
              onEnter();
            }
          }}
          placeholder="Give it a title"
          ref={inputRef}
          value={value}
        />
        <PencilIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-(--secondary) opacity-0 transition-opacity duration-(--dur-hover) group-hover/title:opacity-100 group-focus-within/title:opacity-0 pointer-coarse:opacity-100"
        />
      </div>
    </div>
  );
}
