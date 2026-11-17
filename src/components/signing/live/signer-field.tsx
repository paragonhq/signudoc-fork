"use client";

import { CheckIcon, LockIcon, PenLineIcon } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import type { CSSProperties, Ref } from "react";

import { DUR, EASE } from "@/components/ui/motion-tokens";
import { NUMBER_ENTRY_MESSAGE } from "@/lib/field-choices";
import { cn } from "@/lib/cn";
import type {
  SigningCurrentField,
  SigningVisibleField,
} from "@/lib/schemas/signing";

import {
  TYPED_SIGNATURE_FONT,
  getCanvasFieldLabel,
  getFieldFrame,
  getFieldKindLabel,
  getFieldLabel,
  getVisibleFieldValue,
  hasRoomForLabel,
  hasRoomForValue,
  type SignatureEntry,
} from "./field-logic";

/*
 * Fields on the page. The signer's own are washed in the yellow sign-here
 * colour until they are done; the one the flag points at is solid yellow
 * and lifts a little off the page. Earlier signers' values sit quiet and
 * locked.
 */

type FieldTone = "target" | "required" | "optional" | "done" | "invalid";

const toneClassName: Record<FieldTone, string> = {
  target:
    "bg-(--sign-here) shadow-[0_0_0_1.5px_rgb(var(--fg-rgb)/0.5),0_6px_16px_-6px_rgb(var(--fg-rgb)/0.35)]",
  required:
    "bg-[rgb(var(--sign-here-rgb)/0.45)] shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.2)] hover:bg-[rgb(var(--sign-here-rgb)/0.75)]",
  optional:
    "bg-[rgb(var(--sign-here-rgb)/0.16)] shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.14)] hover:bg-[rgb(var(--sign-here-rgb)/0.4)]",
  done: "bg-[rgb(var(--sign-here-rgb)/0.12)] shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.08)] hover:bg-[rgb(var(--sign-here-rgb)/0.3)]",
  invalid: "bg-(--danger-soft) shadow-[0_0_0_1.5px_var(--danger)]",
};

const fieldBase =
  "absolute z-2 text-(--sign-here-ink) outline-none [container-type:size] transition-[background-color,box-shadow] duration-(--dur-hover) ease-(--ease-out) focus-visible:shadow-(--focus-ring)";

/** A soft yellow ring that leaves the field once when the flag arrives. */
function ArrivalPulse({ shape }: { shape: "box" | "round" }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return null;
  }

  return (
    <motion.span
      animate={{ opacity: 0, scale: 1.18 }}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -inset-0.5 border-2 border-[rgb(var(--sign-here-rgb)/0.9)]",
        shape === "round" ? "rounded-full" : "rounded-[6px]",
      )}
      initial={{ opacity: 0.9, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE.out }}
    />
  );
}

type CurrentSignerFieldProps = {
  /** Play the write-on: the signature was just applied to this field. */
  animateSignature: boolean;
  checkboxValue: boolean;
  field: SigningCurrentField;
  /** True for a number field holding something that is not a number. */
  isInvalid: boolean;
  isComplete: boolean;
  isTarget: boolean;
  /** A signature is ready to drop in with one tap. */
  hasReusableSignature: boolean;
  localDateLabel: string;
  /** What a name field shows: the name the sender gave this signer. */
  signerName?: string;
  onCheckboxChange: (checked: boolean) => void;
  onFocusField: () => void;
  /**
   * Set on a phone: text, number and dropdown fields open the fill-in tray
   * instead of taking the keyboard on the page (too small to type into).
   */
  onOpenFill?: () => void;
  onSignatureClick: () => void;
  onTextChange: (value: string) => void;
  ref?: Ref<HTMLElement>;
  signatureEntry?: SignatureEntry;
  textValue: string;
};

export function CurrentSignerField({
  animateSignature,
  checkboxValue,
  field,
  hasReusableSignature,
  isComplete,
  isInvalid,
  isTarget,
  localDateLabel,
  signerName = "",
  onCheckboxChange,
  onFocusField,
  onOpenFill,
  onSignatureClick,
  onTextChange,
  ref,
  signatureEntry,
  textValue,
}: CurrentSignerFieldProps) {
  const frame = getFieldFrame(field);
  const showLabel = hasRoomForLabel(field);
  const showValue = hasRoomForValue(field);
  const tone: FieldTone = isInvalid
    ? "invalid"
    : isTarget
      ? "target"
      : isComplete && (field.required || hasValue())
        ? "done"
        : field.required
          ? "required"
          : "optional";
  const stateId = `signing-field-${field.id}-state`;
  const stateText = isInvalid
    ? "Not a number"
    : isComplete && (field.required || hasValue())
      ? "Done"
      : field.required
        ? "Required"
        : "Optional";

  function hasValue() {
    switch (field.type) {
      case "signature":
      case "initials":
        return Boolean(signatureEntry?.value);
      case "checkbox":
      case "radio":
        return checkboxValue;
      default:
        return textValue.trim().length > 0;
    }
  }

  const stateNote = (
    <span className="sr-only" id={stateId}>
      {stateText}
    </span>
  );

  if (field.type === "signature" || field.type === "initials") {
    const isInitials = field.type === "initials";

    return (
      <button
        aria-describedby={stateId}
        aria-label={getFieldKindLabel(field)}
        className={cn(
          fieldBase,
          "group/field cursor-pointer overflow-visible rounded-[5px]",
          toneClassName[tone],
        )}
        data-signing-field="true"
        data-target={isTarget || undefined}
        onClick={onSignatureClick}
        onFocus={onFocusField}
        ref={ref as Ref<HTMLButtonElement>}
        style={frame}
        type="button"
      >
        {stateNote}
        {isTarget ? <ArrivalPulse key="pulse" shape="box" /> : null}
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          {signatureEntry?.value ? (
            <SignatureInk
              animate={animateSignature}
              entry={signatureEntry}
              isInitials={isInitials}
              showValue={showValue}
            />
          ) : showLabel ? (
            <span className="absolute inset-0 flex items-center justify-center gap-[0.35em] px-[6%] text-[clamp(9px,30cqh,13px)] leading-none font-medium">
              <PenLineIcon
                aria-hidden="true"
                className="size-[1.15em] shrink-0 opacity-70"
                strokeWidth={1.75}
              />
              <span className="truncate">
                {hasReusableSignature
                  ? isInitials
                    ? "Tap to initial"
                    : "Tap to sign"
                  : getCanvasFieldLabel(field)}
              </span>
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  if (field.type === "date" || field.type === "name") {
    const autoValue = field.type === "name" ? signerName : localDateLabel;

    return (
      <div
        className={cn(
          fieldBase,
          "flex items-center overflow-hidden rounded-[5px]",
          toneClassName.done,
          "hover:bg-[rgb(var(--sign-here-rgb)/0.12)]",
        )}
        data-signing-field="true"
        style={frame}
        title="Filled in when you finish"
      >
        {showValue ? (
          <span className="truncate px-[6%] text-[clamp(8px,52cqh,13px)] font-medium">
            {autoValue}
          </span>
        ) : null}
      </div>
    );
  }

  if (
    onOpenFill &&
    (field.type === "text" ||
      field.type === "number" ||
      field.type === "dropdown")
  ) {
    const display = textValue.trim();

    return (
      <button
        aria-describedby={stateId}
        aria-haspopup="dialog"
        aria-label={getFieldLabel(field)}
        className={cn(
          fieldBase,
          "flex cursor-pointer items-center overflow-hidden rounded-[5px] text-left",
          toneClassName[tone],
        )}
        data-signing-field="true"
        data-target={isTarget || undefined}
        id={`signing-field-${field.id}`}
        onClick={onOpenFill}
        onFocus={onFocusField}
        ref={ref as Ref<HTMLButtonElement>}
        style={frame}
        type="button"
      >
        {isTarget ? <ArrivalPulse key="pulse" shape="box" /> : null}
        {stateNote}
        {showValue || showLabel ? (
          <span
            className={cn(
              "block min-w-0 truncate px-[max(3px,4cqw)] text-[clamp(7px,56cqh,15px)]",
              display ? "text-(--fg)" : "text-[rgb(var(--fg-rgb)/0.6)]",
            )}
          >
            {display || (showLabel ? getCanvasFieldLabel(field) : "")}
          </span>
        ) : null}
      </button>
    );
  }

  if (field.type === "text" || field.type === "number") {
    const isNumber = field.type === "number";

    return (
      <div
        className={cn(
          fieldBase,
          "overflow-hidden rounded-[5px] focus-within:bg-(--paper) focus-within:shadow-(--focus-ring-input)",
          toneClassName[tone],
        )}
        data-signing-field="true"
        data-target={isTarget || undefined}
        style={frame}
        title={isInvalid ? NUMBER_ENTRY_MESSAGE : undefined}
      >
        {isTarget ? <ArrivalPulse key="pulse" shape="box" /> : null}
        {stateNote}
        <input
          aria-describedby={stateId}
          aria-invalid={isInvalid ? true : undefined}
          aria-label={getFieldLabel(field)}
          autoComplete="off"
          className="h-full w-full border-none bg-transparent px-[max(4px,4cqw)] text-[clamp(10px,56cqh,15px)] text-(--fg) outline-none placeholder:text-[rgb(var(--fg-rgb)/0.55)]"
          id={`signing-field-${field.id}`}
          inputMode={isNumber ? "decimal" : undefined}
          name={`signing-field-${field.id}`}
          onChange={(event) => onTextChange(event.target.value)}
          onFocus={onFocusField}
          placeholder={
            showLabel ? (isNumber ? "Number" : getFieldLabel(field)) : ""
          }
          ref={ref as Ref<HTMLInputElement>}
          value={textValue}
        />
      </div>
    );
  }

  if (field.type === "dropdown") {
    return (
      <div
        className={cn(
          fieldBase,
          "overflow-hidden rounded-[5px] focus-within:bg-(--paper) focus-within:shadow-(--focus-ring-input)",
          toneClassName[tone],
        )}
        data-signing-field="true"
        data-target={isTarget || undefined}
        style={frame}
      >
        {isTarget ? <ArrivalPulse key="pulse" shape="box" /> : null}
        {stateNote}
        <select
          aria-describedby={stateId}
          aria-label={getFieldLabel(field)}
          className={cn(
            "h-full w-full cursor-pointer border-none bg-transparent bg-size-[0.75rem] bg-position-[right_0.25rem_center] pr-5 pl-[max(4px,3cqw)] text-[clamp(10px,52cqh,14px)] outline-none",
            textValue ? "text-(--fg)" : "text-[rgb(var(--fg-rgb)/0.62)]",
          )}
          id={`signing-field-${field.id}`}
          name={`signing-field-${field.id}`}
          onChange={(event) => onTextChange(event.target.value)}
          onFocus={onFocusField}
          ref={ref as Ref<HTMLSelectElement>}
          value={textValue}
        >
          <option value="">
            {field.required ? "Choose one" : "No answer"}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <button
        aria-checked={checkboxValue}
        aria-describedby={stateId}
        aria-label={getFieldLabel(field)}
        className={cn(
          fieldBase,
          "flex cursor-pointer items-center justify-center rounded-full",
          checkboxValue
            ? "bg-(--paper) shadow-[0_0_0_1.5px_rgb(var(--fg-rgb)/0.55)]"
            : toneClassName[tone],
        )}
        data-signing-field="true"
        data-target={isTarget || undefined}
        // An answer that is needed can be changed but not taken back; one
        // that is optional can be cleared by choosing it again.
        onClick={() => onCheckboxChange(field.required ? true : !checkboxValue)}
        onFocus={onFocusField}
        ref={ref as Ref<HTMLButtonElement>}
        role="radio"
        style={frame}
        type="button"
      >
        {stateNote}
        {isTarget ? <ArrivalPulse key="pulse" shape="round" /> : null}
        {checkboxValue ? (
          <motion.span
            animate={{ scale: 1 }}
            aria-hidden="true"
            className="block size-[52%] max-h-3 max-w-3 rounded-full bg-(--fg)"
            initial={{ scale: 0.4 }}
            transition={{ duration: DUR.move, ease: EASE.pop }}
          />
        ) : null}
      </button>
    );
  }

  return (
    <button
      aria-describedby={stateId}
      aria-label={getFieldLabel(field)}
      aria-pressed={checkboxValue}
      className={cn(
        fieldBase,
        "flex cursor-pointer items-center justify-center rounded-[4px]",
        checkboxValue
          ? "bg-(--paper) shadow-[0_0_0_1.5px_rgb(var(--fg-rgb)/0.55)]"
          : toneClassName[tone],
      )}
      data-signing-field="true"
      data-target={isTarget || undefined}
      onClick={() => onCheckboxChange(!checkboxValue)}
      onFocus={onFocusField}
      ref={ref as Ref<HTMLButtonElement>}
      style={frame}
      type="button"
    >
      {stateNote}
      {isTarget ? <ArrivalPulse key="pulse" shape="box" /> : null}
      {checkboxValue ? (
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          aria-hidden="true"
          className="flex size-[72%] max-h-4 max-w-4 items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: DUR.move, ease: EASE.pop }}
        >
          <CheckIcon className="size-full" strokeWidth={3} />
        </motion.span>
      ) : null}
    </button>
  );
}

/**
 * The signature in the field. When it was just applied it writes on from
 * left to right and settles; afterwards it simply sits there.
 */
function SignatureInk({
  animate,
  entry,
  isInitials,
  showValue,
}: {
  animate: boolean;
  entry: SignatureEntry;
  isInitials: boolean;
  showValue: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;
  const content =
    entry.inputMethod === "drawn" && entry.imageDataUrl ? (
      <span className="relative block h-full w-full">
        <Image
          alt={`${isInitials ? "Initials" : "Signature"} preview`}
          className="object-contain p-[4%]"
          fill
          src={entry.imageDataUrl}
          unoptimized
        />
      </span>
    ) : showValue ? (
      <span
        className="block max-w-full truncate px-[5%] leading-[1.15] text-[min(60cqh,calc(190cqw/var(--chars)))] text-(--fg)"
        style={
          {
            "--chars": Math.max(entry.value.length, 3),
            fontFamily: TYPED_SIGNATURE_FONT,
          } as CSSProperties
        }
      >
        {entry.value}
      </span>
    ) : (
      <CheckIcon aria-hidden="true" className="size-[60%] max-h-4 max-w-4" />
    );

  return (
    <motion.span
      animate={
        shouldAnimate
          ? { clipPath: "inset(0 0% 0 0)", opacity: 1, scale: 1 }
          : undefined
      }
      className="absolute inset-0 flex items-center justify-center"
      initial={
        shouldAnimate
          ? { clipPath: "inset(0 100% 0 0)", opacity: 0.4, scale: 1.06 }
          : false
      }
      transition={{
        clipPath: { duration: DUR.morph, ease: EASE.out },
        opacity: { duration: DUR.open, ease: EASE.out },
        scale: { delay: DUR.move, duration: DUR.panel, ease: EASE.softSpring },
      }}
    >
      {content}
    </motion.span>
  );
}

/**
 * Who signed a locked signature, in a small tag above it: "Ada signed".
 * Only where the page is drawn large enough for it to read.
 */
export function LockedFieldCaption({ field }: { field: SigningVisibleField }) {
  if (field.type !== "signature" && field.type !== "initials") {
    return null;
  }

  const frame = getFieldFrame(field);
  const firstName = field.signerName.trim().split(/\s+/)[0] ?? field.signerName;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute z-1 inline-flex -translate-y-[calc(100%+3px)] items-center gap-1 rounded-full bg-(--paper) py-0.5 pr-2 pl-1.5 text-[0.6875rem] leading-4 font-medium whitespace-nowrap text-(--secondary-strong) shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.08),0_2px_6px_-2px_rgb(var(--fg-rgb)/0.12)] max-sm:hidden"
      style={{ left: frame.left, top: frame.top }}
    >
      <LockIcon className="size-2.5" strokeWidth={2} />
      {firstName} signed
    </span>
  );
}

/** An earlier signer's value: visible, quiet and locked. */
export function LockedField({ field }: { field: SigningVisibleField }) {
  const frame = getFieldFrame(field);
  const showLabel = hasRoomForLabel(field);
  const showValue = hasRoomForValue(field);
  const lockedBase =
    "pointer-events-none absolute z-1 bg-[rgb(var(--fg-rgb)/0.04)] text-(--secondary) shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.1)] [container-type:size]";

  if (field.type === "radio" || field.type === "checkbox") {
    return (
      <div
        className={cn(
          lockedBase,
          "flex items-center justify-center",
          field.type === "radio" ? "rounded-full" : "rounded-[4px]",
        )}
        data-signing-field="true"
        style={frame}
      >
        {field.checked ? (
          field.type === "radio" ? (
            <span
              aria-hidden="true"
              className="block size-[52%] max-h-3 max-w-3 rounded-full bg-(--secondary)"
            />
          ) : (
            <CheckIcon
              aria-hidden="true"
              className="size-[68%] max-h-4 max-w-4"
              strokeWidth={2.5}
            />
          )
        ) : null}
      </div>
    );
  }

  if (
    (field.type === "signature" || field.type === "initials") &&
    field.imageDataUrl
  ) {
    return (
      <div
        className={cn(lockedBase, "overflow-hidden rounded-[5px]")}
        data-signing-field="true"
        style={frame}
      >
        <Image
          alt={`${field.signerName} completed ${field.type}`}
          className="object-contain p-[4%] opacity-80"
          fill
          src={field.imageDataUrl}
          unoptimized
        />
      </div>
    );
  }

  const isTypedSignature =
    field.inputMethod === "typed" &&
    (field.type === "signature" || field.type === "initials");

  return (
    <div
      className={cn(lockedBase, "overflow-hidden rounded-sm")}
      data-signing-field="true"
      style={frame}
    >
      <div className="flex h-full w-full items-center gap-[3%] overflow-hidden px-[4%]">
        {showLabel ? (
          <LockIcon
            aria-hidden="true"
            className="size-[clamp(7px,30cqh,10px)] shrink-0 opacity-60"
          />
        ) : null}
        {showValue ? (
          <p
            className={cn(
              "min-w-0 truncate",
              isTypedSignature
                ? "text-[min(56cqh,calc(190cqw/var(--chars)))] leading-[1.15] text-(--fg)/80"
                : "text-[clamp(8px,48cqh,12px)] font-medium",
            )}
            style={
              {
                "--chars": Math.max((field.value ?? "").length, 3),
                fontFamily: isTypedSignature ? TYPED_SIGNATURE_FONT : undefined,
              } as CSSProperties
            }
          >
            {getVisibleFieldValue(field)}
          </p>
        ) : showLabel ? (
          <p className="w-full truncate text-center text-[clamp(8px,32cqh,11px)] font-medium text-(--secondary)">
            {getCanvasFieldLabel(field)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
