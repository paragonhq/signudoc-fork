"use client";

import { ArrowDownIcon, CheckIcon, ChevronUpIcon } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/components/ui/hooks";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TextMorph } from "@/components/ui/text-morph";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayDescription,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import { cn } from "@/lib/cn";
import type { SigningCurrentField } from "@/lib/schemas/signing";

import { TYPED_SIGNATURE_FONT, getFieldKindLabel } from "./field-logic";

export type ChecklistItem = {
  field: SigningCurrentField;
  isComplete: boolean;
  isInvalid: boolean;
  isTarget: boolean;
  value: string | null;
};

export type FinishPhase = "idle" | "signing" | "signed";

export function fieldName(field: SigningCurrentField) {
  return field.label?.trim() || getFieldKindLabel(field);
}

/*
 * Nothing in the status button may say "finish": the Finish button is
 * found by that name, and the status button sits right beside it.
 */

/**
 * The one way forward, floating in thumb reach at the bottom of the
 * screen: where the signer stands in words ("3 required remaining", and
 * what is next) and one button that walks them through the fields, then
 * becomes Finish. Tapping the words opens the list of fields.
 */
export function ActionBar({
  canFinish,
  checklist,
  completedCount,
  finishPhase,
  invalidNumberCount,
  onFinish,
  onNext,
  onSelectField,
  pageCount,
  remainingCount,
  requiredCount,
  target,
}: {
  canFinish: boolean;
  checklist: ChecklistItem[];
  completedCount: number;
  finishPhase: FinishPhase;
  invalidNumberCount: number;
  onFinish: () => void;
  onNext: () => void;
  onSelectField: (field: SigningCurrentField) => void;
  pageCount: number;
  remainingCount: number;
  requiredCount: number;
  target: SigningCurrentField | null;
}) {
  const [isListOpen, setIsListOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const isBusy = finishPhase !== "idle";
  const hasWork = remainingCount > 0;
  const progress = requiredCount === 0 ? 1 : completedCount / requiredCount;
  const statusText =
    invalidNumberCount > 0
      ? "Fix the number in red"
      : hasWork
        ? `${remainingCount} required remaining`
        : "All required fields done";
  const detailText =
    invalidNumberCount > 0
      ? "Use digits, with a point for decimals."
      : hasWork && target
        ? `Next: ${fieldName(target)}${pageCount > 1 ? `, page ${target.page}` : ""}`
        : "You can still change anything.";
  const label =
    finishPhase === "signed"
      ? "Signed"
      : finishPhase === "signing"
        ? "Signing…"
        : hasWork
          ? "Next field"
          : "Finish";

  const doneCount = checklist.filter(
    (item) => item.value !== null && !item.isInvalid,
  ).length;
  const statusButton = (
    <button
      onClick={isDesktop ? undefined : () => setIsListOpen(true)}
      className="group/status flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full py-1 pr-1 pl-2 sm:gap-3 sm:pr-2 text-left outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) focus-visible:shadow-(--focus-ring)"
      type="button"
    >
      <ProgressRing
        done={!hasWork && invalidNumberCount === 0}
        invalid={invalidNumberCount > 0}
        progress={progress}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          aria-live="polite"
          className={cn(
            "truncate text-[0.9375rem] leading-5 font-medium tracking-[-0.01em] tabular-nums",
            invalidNumberCount > 0 ? "text-(--danger)" : "text-(--fg)",
          )}
        >
          <span id="signing-finish-reason">{statusText}</span>
        </span>
        <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
          <span className="sr-only">. </span>
          {detailText}
          <span className="sr-only">. Show your fields</span>
        </span>
      </span>
      <ChevronUpIcon
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 text-(--secondary) transition-transform duration-(--dur-move) ease-(--ease-out) max-sm:hidden",
          isListOpen && "rotate-180",
        )}
        strokeWidth={1.75}
      />
    </button>
  );
  const fieldList = (
    <ol className="flex flex-col">
      {checklist.map((item) => (
        <li key={item.field.id}>
          <ChecklistRow
            item={item}
            onSelect={(field) => {
              setIsListOpen(false);
              onSelectField(field);
            }}
            pageCount={pageCount}
          />
        </li>
      ))}
    </ol>
  );

  return (
    <aside
      aria-label="Signing progress"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-6"
    >
      <div className="pointer-events-auto flex w-full max-w-[32rem] items-center gap-2 rounded-full bg-(--paper) p-2 shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.05),0_12px_32px_-12px_rgb(var(--fg-rgb)/0.28),0_2px_6px_rgb(var(--fg-rgb)/0.05)]">
        {isDesktop ? (
          <Popover onOpenChange={setIsListOpen} open={isListOpen}>
            <PopoverTrigger asChild>{statusButton}</PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[min(22rem,calc(100vw-1.5rem))] p-1.5"
              side="top"
              sideOffset={14}
            >
              <p className="px-2.5 pt-1.5 pb-1 text-[0.8125rem] leading-5 font-medium text-(--secondary)">
                Your fields
              </p>
              {fieldList}
            </PopoverContent>
          </Popover>
        ) : (
          <>
            {statusButton}
            <Tray onOpenChange={setIsListOpen} open={isListOpen}>
              <TrayContent size="sm">
                <TrayHeader>
                  <TrayTitle>Your fields</TrayTitle>
                  <TrayDescription>
                    {doneCount} of {checklist.length} done. Tap one to go to it.
                  </TrayDescription>
                </TrayHeader>
                <TrayBody className="-mx-2 pt-1 pb-4">{fieldList}</TrayBody>
              </TrayContent>
            </Tray>
          </>
        )}

        <Button
          aria-describedby={
            !hasWork && !canFinish ? "signing-finish-reason" : undefined
          }
          className="h-12 shrink-0 px-5 text-[0.9375rem] sm:min-w-[8.5rem]"
          disabled={isBusy || (!hasWork && !canFinish)}
          onClick={hasWork ? onNext : onFinish}
          size="lg"
        >
          {hasWork ? (
            <ArrowDownIcon
              aria-hidden="true"
              className="size-4 max-sm:hidden"
            />
          ) : finishPhase === "signed" ? (
            <CheckIcon aria-hidden="true" />
          ) : null}
          <TextMorph>{label}</TextMorph>
        </Button>
      </div>
    </aside>
  );
}

/** Progress as a small ring that fills, then turns into a check. */
function ProgressRing({
  done,
  invalid,
  progress,
}: {
  done: boolean;
  invalid: boolean;
  progress: number;
}) {
  const reduceMotion = useReducedMotion();
  const radius = 13;
  const circumference = 2 * Math.PI * radius;

  return (
    <span aria-hidden="true" className="relative size-8 shrink-0">
      <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
        <circle
          cx="16"
          cy="16"
          fill="none"
          r={radius}
          stroke="rgb(var(--fg-rgb) / 0.08)"
          strokeWidth="3"
        />
        <circle
          className="transition-[stroke-dashoffset,stroke] duration-(--dur-panel) ease-(--ease-out)"
          cx="16"
          cy="16"
          fill="none"
          r={radius}
          stroke={
            invalid
              ? "var(--danger)"
              : done
                ? "var(--success)"
                : "var(--accent)"
          }
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      {done ? (
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center text-(--success)"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.5 }}
          transition={{ duration: DUR.open, ease: EASE.pop }}
        >
          <CheckIcon className="size-3.5" strokeWidth={3} />
        </motion.span>
      ) : null}
    </span>
  );
}

export function ChecklistRow({
  item,
  onSelect,
  pageCount,
}: {
  item: ChecklistItem;
  onSelect: (field: SigningCurrentField) => void;
  pageCount: number;
}) {
  const { field, isInvalid, isTarget, value } = item;
  const isSignature = field.type === "signature" || field.type === "initials";
  const isTyped = isSignature && value !== null && !value.startsWith("Drawn");
  const status = isInvalid
    ? "Fix this"
    : value !== null
      ? "Done"
      : field.required
        ? "Required"
        : "Optional";
  const where = pageCount > 1 ? `Page ${field.page} · ` : "";

  return (
    <button
      aria-current={isTarget ? "step" : undefined}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-[0.625rem] px-2.5 py-1.5 text-left outline-none",
        "transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) focus-visible:bg-(--hover)",
      )}
      onClick={() => onSelect(field)}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
          isInvalid
            ? "bg-(--danger-solid) text-(--on-accent)"
            : value !== null
              ? "bg-(--success) text-(--on-accent)"
              : isTarget
                ? "bg-(--sign-here) shadow-[0_0_0_1.5px_rgb(var(--fg-rgb)/0.5)]"
                : field.required
                  ? "bg-[rgb(var(--sign-here-rgb)/0.5)] shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.18)]"
                  : "shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.18)]",
        )}
      >
        {isInvalid ? (
          <span className="text-[0.625rem] font-semibold">!</span>
        ) : value !== null ? (
          <CheckIcon className="size-3" strokeWidth={3} />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm leading-5 font-medium text-(--fg)">
          {fieldName(field)}
        </span>
        <span
          className={cn(
            "truncate text-[0.8125rem] leading-5",
            isInvalid ? "text-(--danger)" : "text-(--secondary)",
          )}
        >
          {where}
          {value !== null ? (
            <span
              style={isTyped ? { fontFamily: TYPED_SIGNATURE_FONT } : undefined}
            >
              {value}
            </span>
          ) : (
            status
          )}
        </span>
      </span>
      <span className="sr-only">, {status}</span>
    </button>
  );
}
