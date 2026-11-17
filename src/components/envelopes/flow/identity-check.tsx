"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DUR,
  EASE,
  SPRING_SNAPPY,
  exitDuration,
} from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

import {
  SIGNER_CHECK_CHOICES,
  checkChoicePatch,
  signerCheckChoice,
  type ShellSigner,
  type SignerChecks,
} from "./signers-model";

const reveal = {
  animate: { height: "auto", opacity: 1 },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: exitDuration(DUR.move), ease: EASE.exit },
  },
  initial: { height: 0, opacity: 0 },
  transition: { duration: DUR.move, ease: EASE.out },
} as const;

type IdentityCheckProps = {
  accessCodeError?: string;
  disabled: boolean;
  onChecksChange: (patch: Partial<SignerChecks>) => void;
  order: number;
  signer: ShellSigner;
  /** Something at the end of the line (the row's actions). */
  trailing?: ReactNode;
};

/**
 * How we check it's really them, as one compact line: a small segmented
 * choice (No check, Email code, Access code) whose white thumb slides to
 * the pick. Nothing else shows until it matters: a sentence about what the
 * check does, and the code field only for an access code. Each radio keeps
 * its full sentence as its accessible name.
 */
export function IdentityCheck({
  accessCodeError,
  disabled,
  onChecksChange,
  order,
  signer,
  trailing,
}: IdentityCheckProps) {
  const reduceMotion = useReducedMotion();
  const choice = signerCheckChoice(signer);
  const keepsSavedCode = signer.hasAccessCode && !signer.removeAccessCode;
  const chosen = SIGNER_CHECK_CHOICES.find((item) => item.value === choice);
  const accessCodeId = `signer-${signer.localId}-access-code`;
  const detail =
    choice === "both"
      ? "They must pass both an emailed code and an access code. Picking one removes the other."
      : choice === "none"
        ? null
        : chosen?.detail;

  return (
    <fieldset className="flex min-w-0 flex-col" disabled={disabled}>
      <legend className="sr-only">
        Signer {order}: extra check before signing (optional)
      </legend>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          aria-hidden="true"
          className="text-[0.8125rem] leading-5 text-(--secondary)"
        >
          Identity check
        </span>
        <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-(--track) p-0.5 no-scrollbar">
          {SIGNER_CHECK_CHOICES.map((item) => {
            const checked = choice === item.value;

            return (
              <label
                className={cn(
                  "relative inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full px-3 text-[0.8125rem] font-medium whitespace-nowrap select-none",
                  "transition-[color] duration-(--dur-hover) ease-(--ease-out)",
                  "has-focus-visible:shadow-(--focus-ring) has-disabled:cursor-not-allowed has-disabled:opacity-50",
                  checked
                    ? "text-(--fg)"
                    : "text-(--secondary-strong) hover:text-(--fg)",
                )}
                key={item.value}
              >
                {checked ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-(--paper) shadow-(--shadow-thumb)"
                    layoutId={`identity-thumb-${signer.localId}`}
                    transition={reduceMotion ? { duration: 0 } : SPRING_SNAPPY}
                  />
                ) : null}
                <span className="relative">{item.short}</span>
                <input
                  aria-label={`Signer ${order} check: ${item.label}`}
                  checked={checked}
                  className="absolute inset-0 z-10 m-0 cursor-[inherit] appearance-none rounded-full opacity-0"
                  name={`signer-${signer.localId}-check`}
                  onChange={() =>
                    onChecksChange(checkChoicePatch(signer, item.value))
                  }
                  type="radio"
                  value={item.value}
                />
              </label>
            );
          })}
        </div>
        {trailing}
      </div>

      <AnimatePresence initial={false}>
        {detail ? (
          <motion.div className="overflow-hidden" key="detail" {...reveal}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.p
                animate={{ opacity: 1 }}
                className="pt-2 text-[0.8125rem] leading-5 text-pretty text-(--secondary)"
                exit={{ opacity: 0, transition: { duration: DUR.press } }}
                initial={{ opacity: 0 }}
                key={choice}
                transition={{ duration: DUR.hover }}
              >
                {detail}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {signer.wantsAccessCode ? (
          <motion.div className="overflow-hidden" key="code" {...reveal}>
            <div className="flex max-w-sm flex-col gap-1.5 px-0.5 pt-3 pb-1">
              <label
                className="text-[0.8125rem] leading-5 font-medium text-(--fg)"
                htmlFor={accessCodeId}
              >
                The code you’ll give them yourself
                {keepsSavedCode ? (
                  <span className="font-normal text-(--secondary)">
                    {" "}
                    (a code is set; type a new one to change it)
                  </span>
                ) : null}
              </label>
              <Input
                aria-describedby={
                  accessCodeError ? `${accessCodeId}-error` : undefined
                }
                aria-invalid={accessCodeError ? true : undefined}
                aria-label={`Signer ${order} access code`}
                autoComplete="off"
                className="tracking-[0.06em]"
                id={accessCodeId}
                maxLength={64}
                onChange={(event) =>
                  onChecksChange({ accessCode: event.target.value })
                }
                placeholder={
                  keepsSavedCode ? "••••••" : "At least 4 characters"
                }
                spellCheck={false}
                type="text"
                value={signer.accessCode}
              />
              <FieldError className="pt-0" id={`${accessCodeId}-error`}>
                {accessCodeError}
              </FieldError>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </fieldset>
  );
}
