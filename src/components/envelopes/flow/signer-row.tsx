"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  GripVerticalIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  AnimatePresence,
  Reorder,
  motion,
  useAnimate,
  useDragControls,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";

import type { ContactSuggestion } from "@/components/contacts/contact-data";
import { ContactInput } from "@/components/contacts/contact-input";
import { FieldError } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import {
  DUR,
  EASE,
  SPRING_SOFT,
  exitDuration,
} from "@/components/ui/motion-tokens";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { SIGNATURE_MEANING_DETAILS } from "@/lib/signature-meanings";
import { signatureMeanings, type SignatureMeaning } from "@/lib/types/domain";

import { getSignerPalette } from "../signer-palette";
import { IdentityCheck } from "./identity-check";
import {
  validEmailPattern,
  type ShellSigner,
  type SignerChecks,
  type SignerField,
} from "./signers-model";

type SignerRowProps = {
  accessCodeError?: string;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  canRemove: boolean;
  disabled: boolean;
  emailError?: string;
  /** Addresses already on the envelope, not offered as suggestions. */
  exclude: readonly string[];
  index: number;
  nameError?: string;
  onBlur: (field: SignerField) => void;
  onChange: (field: SignerField, value: string) => void;
  onChecksChange: (patch: Partial<SignerChecks>) => void;
  onDragEnd: () => void;
  /** The pointer or focus is on this row (its fields light up beside it). */
  onHighlight?: (highlighted: boolean) => void;
  onMove: (direction: "earlier" | "later") => void;
  /** Someone was chosen from the address book. */
  onPick: (contact: ContactSuggestion) => void;
  onRemove: () => void;
  part11Mode: boolean;
  signer: ShellSigner;
};

const ORDINALS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
];

/** "Signs first", "Signs third". */
export function signsInOrder(index: number) {
  return `Signs ${ORDINALS[index] ?? `${index + 1}th`}`;
}

/**
 * One signer, as a calm row: their place in the order on a round avatar
 * in their signer colour, then name and email, then the identity check.
 * Grab the avatar to drag the row (the others make room); the Earlier and
 * Later buttons do the same from the keyboard. Row actions show on hover
 * and focus with a mouse, and stay visible on touch.
 */
export function SignerRow({
  accessCodeError,
  canMoveEarlier,
  canMoveLater,
  canRemove,
  disabled,
  emailError,
  exclude,
  index,
  nameError,
  onBlur,
  onChange,
  onChecksChange,
  onDragEnd,
  onHighlight,
  onMove,
  onPick,
  onRemove,
  part11Mode,
  signer,
}: SignerRowProps) {
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();
  const [fieldsScope, animateFields] = useAnimate<HTMLDivElement>();
  const [isDragging, setIsDragging] = useState(false);
  const palette = getSignerPalette(index);
  const order = index + 1;
  const nameId = `signer-${signer.localId}-name`;
  const emailId = `signer-${signer.localId}-email`;
  const meaningId = `signer-${signer.localId}-meaning`;
  const canDrag = canMoveEarlier || canMoveLater;
  const emailLooksValid =
    signer.touched.email &&
    !emailError &&
    validEmailPattern.test(signer.email.trim().toLowerCase());
  // Picking someone fills both fields; they settle into place together.
  function handlePick(contact: ContactSuggestion) {
    onPick(contact);

    if (!reduceMotion && fieldsScope.current) {
      void animateFields(
        fieldsScope.current,
        { scale: [0.985, 1], y: [2, 0] },
        { damping: 26, stiffness: 520, type: "spring" },
      );
    }
  }

  const actions = (
    <RowActions
      canMoveEarlier={canMoveEarlier}
      canMoveLater={canMoveLater}
      canRemove={canRemove}
      disabled={disabled}
      onMove={onMove}
      onRemove={onRemove}
      order={order}
    />
  );

  return (
    <Reorder.Item
      animate={{ height: "auto", opacity: 1 }}
      as="li"
      className={cn(
        "group/row relative bg-(--paper) first:rounded-t-(--radius-card)",
        // A hairline between rows, starting after the avatar.
        "not-first:before:absolute not-first:before:top-0 not-first:before:right-4 not-first:before:left-[3.75rem] not-first:before:h-px not-first:before:bg-(--divider) sm:not-first:before:right-5 sm:not-first:before:left-[4.25rem]",
        isDragging &&
          "z-10 rounded-(--radius-card) shadow-(--shadow-card-flat) before:hidden",
      )}
      dragControls={controls}
      dragListener={false}
      exit={{
        height: 0,
        opacity: 0,
        transition: { duration: exitDuration(DUR.panel), ease: EASE.exit },
      }}
      initial={{ height: 0, opacity: 0 }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onHighlight?.(false);
        }
      }}
      onDragStart={() => setIsDragging(true)}
      onFocus={() => onHighlight?.(true)}
      onPointerEnter={() => onHighlight?.(true)}
      onPointerLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) {
          onHighlight?.(false);
        }
      }}
      style={{ overflow: isDragging ? "visible" : "hidden" }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              default: { duration: DUR.panel, ease: EASE.out },
              layout: SPRING_SOFT,
            }
      }
      value={signer}
    >
      <div className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
        {/* The avatar is the drag handle (pointer and touch). */}
        <div
          aria-hidden="true"
          className={cn(
            "relative mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-semibold tabular-nums select-none",
            canDrag &&
              !disabled &&
              "cursor-grab touch-none active:cursor-grabbing",
          )}
          onPointerDown={(event) => {
            if (canDrag && !disabled) {
              event.preventDefault();
              controls.start(event);
            }
          }}
          style={{ backgroundColor: palette.tint, color: palette.color }}
          title={canDrag ? "Drag to change the order" : undefined}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "transition-opacity duration-(--dur-hover)",
                canDrag &&
                  !disabled &&
                  "pointer-fine:group-hover/row:opacity-0",
              )}
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 6 }}
              key={order}
              transition={{ duration: DUR.move, ease: EASE.out }}
            >
              {order}
            </motion.span>
          </AnimatePresence>
          {canDrag && !disabled ? (
            <GripVerticalIcon className="absolute size-4 opacity-0 transition-opacity duration-(--dur-hover) pointer-fine:group-hover/row:opacity-100" />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Phone: the order in words and the actions, above the fields. */}
          <div className="-mb-1 flex min-h-8 items-center justify-between gap-2 sm:hidden">
            <span className="text-[0.8125rem] leading-5 font-medium text-(--secondary)">
              {signsInOrder(index)}
            </span>
            {actions}
          </div>

          <div className="flex min-w-0 items-start">
            <div
              className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 sm:gap-3"
              ref={fieldsScope}
            >
              <div className="flex min-w-0 flex-col">
                <ContactInput
                  aria-describedby={nameError ? `${nameId}-error` : undefined}
                  aria-invalid={nameError ? true : undefined}
                  aria-label={`Signer ${order} name`}
                  autoComplete="off"
                  disabled={disabled}
                  exclude={exclude}
                  id={nameId}
                  onBlur={() => onBlur("name")}
                  onChange={(event) => onChange("name", event.target.value)}
                  onPick={handlePick}
                  placeholder="Full name"
                  type="text"
                  value={signer.name}
                />
                <FieldError id={`${nameId}-error`}>{nameError}</FieldError>
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="relative">
                  <ContactInput
                    aria-describedby={
                      emailError ? `${emailId}-error` : undefined
                    }
                    aria-invalid={emailError ? true : undefined}
                    aria-label={`Signer ${order} email`}
                    autoComplete="off"
                    className="pr-9"
                    disabled={disabled}
                    exclude={exclude}
                    id={emailId}
                    inputMode="email"
                    onBlur={() => onBlur("email")}
                    onChange={(event) => onChange("email", event.target.value)}
                    onPick={handlePick}
                    placeholder="Email"
                    spellCheck={false}
                    type="email"
                    value={signer.email}
                  />
                  <AnimatePresence initial={false}>
                    {emailLooksValid ? (
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-(--success)"
                        exit={{ opacity: 0, scale: 0.6 }}
                        initial={{ opacity: 0, scale: 0.6 }}
                        key="ok"
                        transition={{ duration: DUR.hover, ease: EASE.pop }}
                      >
                        <CheckIcon className="size-4" strokeWidth={2.25} />
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
                <FieldError id={`${emailId}-error`}>{emailError}</FieldError>
              </div>
            </div>
          </div>

          <IdentityCheck
            accessCodeError={accessCodeError}
            disabled={disabled}
            onChecksChange={onChecksChange}
            order={order}
            signer={signer}
            trailing={<div className="ml-auto hidden sm:block">{actions}</div>}
          />

          {part11Mode ? (
            <div className="flex flex-col gap-1.5 rounded-(--radius-well) bg-(--surface) p-3.5">
              <label
                className="text-[0.8125rem] leading-5 font-medium text-(--fg)"
                htmlFor={meaningId}
              >
                What this signature means
              </label>
              <p className="text-[0.8125rem] leading-5 text-(--secondary)">
                Printed beside their signature with their name and the time.
                They need a confirmed account here.
              </p>
              <Select
                aria-invalid={!signer.signatureMeaning ? true : undefined}
                aria-label={`Signer ${order} signature meaning`}
                className="mt-1"
                disabled={disabled}
                id={meaningId}
                onChange={(event) =>
                  onChecksChange({
                    signatureMeaning: (
                      signatureMeanings as readonly string[]
                    ).includes(event.target.value)
                      ? (event.target.value as SignatureMeaning)
                      : null,
                  })
                }
                value={signer.signatureMeaning ?? ""}
              >
                <option value="">Choose a meaning</option>
                {signatureMeanings.map((meaning) => (
                  <option key={meaning} value={meaning}>
                    {SIGNATURE_MEANING_DETAILS[meaning].label}
                  </option>
                ))}
              </Select>
              {signer.signatureMeaning ? (
                <p className="text-[0.8125rem] leading-5 text-(--fg)">
                  {SIGNATURE_MEANING_DETAILS[signer.signatureMeaning].statement}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Reorder.Item>
  );
}

function RowActions({
  canMoveEarlier,
  canMoveLater,
  canRemove,
  disabled,
  onMove,
  onRemove,
  order,
}: {
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  canRemove: boolean;
  disabled: boolean;
  onMove: (direction: "earlier" | "later") => void;
  onRemove: () => void;
  order: number;
}) {
  const canMove = canMoveEarlier || canMoveLater;

  if (!canMove && !canRemove) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5",
        // Revealed with a mouse on hover or keyboard focus; always on touch.
        "transition-opacity duration-(--dur-hover) ease-(--ease-out)",
        "pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-within/row:opacity-100",
      )}
    >
      {canMove ? (
        <>
          <IconButton
            aria-label={`Move signer ${order} earlier`}
            disabled={disabled || !canMoveEarlier}
            onClick={() => onMove("earlier")}
            size="sm"
            tooltip="Earlier"
          >
            <ArrowUpIcon />
          </IconButton>
          <IconButton
            aria-label={`Move signer ${order} later`}
            disabled={disabled || !canMoveLater}
            onClick={() => onMove("later")}
            size="sm"
            tooltip="Later"
          >
            <ArrowDownIcon />
          </IconButton>
        </>
      ) : null}
      {canRemove ? (
        <IconButton
          aria-label={`Remove signer ${order}`}
          className="hover:bg-(--danger-soft) hover:[--btn-fg:var(--danger)]"
          disabled={disabled}
          onClick={onRemove}
          size="sm"
          tooltip="Remove"
        >
          <XIcon />
        </IconButton>
      ) : null}
    </div>
  );
}
