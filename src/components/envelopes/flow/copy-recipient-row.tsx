"use client";

import { MailIcon, XIcon } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";

import type { ContactSuggestion } from "@/components/contacts/contact-data";
import { ContactInput } from "@/components/contacts/contact-input";
import { FieldError } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";

import type { ShellCopyRecipient, SignerField } from "./signers-model";

type CopyRecipientRowProps = {
  disabled: boolean;
  emailError?: string;
  /** Addresses already on the envelope, not offered as suggestions. */
  exclude: readonly string[];
  index: number;
  nameError?: string;
  onBlur: (field: SignerField) => void;
  onChange: (field: SignerField, value: string) => void;
  onPick: (contact: ContactSuggestion) => void;
  onRemove: () => void;
  recipient: ShellCopyRecipient;
};

/**
 * Someone who gets the finished document without signing: a calm row with
 * a mail avatar, name and email, and a remove button (shown on hover and
 * focus with a mouse). Opens with height and collapses when removed.
 */
export function CopyRecipientRow({
  disabled,
  emailError,
  exclude,
  index,
  nameError,
  onBlur,
  onChange,
  onPick,
  onRemove,
  recipient,
}: CopyRecipientRowProps) {
  const reduceMotion = useReducedMotion();
  const position = index + 1;
  const nameId = `copy-${recipient.localId}-name`;
  const emailId = `copy-${recipient.localId}-email`;

  return (
    <motion.li
      animate={{ height: "auto", opacity: 1 }}
      className="group/row relative overflow-hidden not-first:before:absolute not-first:before:top-0 not-first:before:right-4 not-first:before:left-[3.75rem] not-first:before:h-px not-first:before:bg-(--divider) sm:not-first:before:right-5 sm:not-first:before:left-[4.25rem]"
      exit={{
        height: 0,
        opacity: 0,
        transition: { duration: exitDuration(DUR.panel), ease: EASE.exit },
      }}
      initial={{ height: 0, opacity: 0 }}
      layout={reduceMotion ? false : "position"}
      transition={
        reduceMotion ? { duration: 0 } : { duration: DUR.panel, ease: EASE.out }
      }
    >
      <div className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5">
        <span
          aria-hidden="true"
          className="mt-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-(--surface-strong) text-(--secondary)"
        >
          <MailIcon className="size-4" strokeWidth={1.75} />
        </span>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 sm:gap-3">
          <div className="flex min-w-0 flex-col">
            <ContactInput
              aria-describedby={nameError ? `${nameId}-error` : undefined}
              aria-invalid={nameError ? true : undefined}
              aria-label={`Copy recipient ${position} name`}
              autoComplete="off"
              disabled={disabled}
              exclude={exclude}
              id={nameId}
              onBlur={() => onBlur("name")}
              onChange={(event) => onChange("name", event.target.value)}
              onPick={onPick}
              placeholder="Full name"
              type="text"
              value={recipient.name}
            />
            <FieldError id={`${nameId}-error`}>{nameError}</FieldError>
          </div>
          <div className="flex min-w-0 flex-col">
            <ContactInput
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              aria-invalid={emailError ? true : undefined}
              aria-label={`Copy recipient ${position} email`}
              autoComplete="off"
              disabled={disabled}
              exclude={exclude}
              id={emailId}
              inputMode="email"
              onBlur={() => onBlur("email")}
              onChange={(event) => onChange("email", event.target.value)}
              onPick={onPick}
              placeholder="Email"
              spellCheck={false}
              type="email"
              value={recipient.email}
            />
            <FieldError id={`${emailId}-error`}>{emailError}</FieldError>
          </div>
        </div>
        <div className="flex h-(--field-h) items-center transition-opacity duration-(--dur-hover) ease-(--ease-out) pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-within/row:opacity-100">
          <IconButton
            aria-label={`Remove copy recipient ${position}`}
            className="hover:bg-(--danger-soft) hover:[--btn-fg:var(--danger)]"
            disabled={disabled}
            onClick={onRemove}
            size="sm"
            tooltip="Remove"
          >
            <XIcon />
          </IconButton>
        </div>
      </div>
    </motion.li>
  );
}
