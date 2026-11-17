"use client";

import { ChevronDownIcon } from "@/components/ui/icons";
import {
  memo,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "@/lib/cn";
import { type FieldResizeHandle } from "@/lib/utils/pdf-coords";

import { fieldToolIcons, SignLine } from "./builder/field-glyphs";
import { type PrepareFieldType } from "./builder/model";

const compactFieldHeightThreshold = 0.03;
const compactFieldWidthThreshold = 0.07;

const resizeHandles: ReadonlyArray<{
  corner: FieldResizeHandle;
  className: string;
}> = [
  {
    corner: "top-left",
    className: "-left-[4.5px] -top-[4.5px] cursor-nwse-resize",
  },
  {
    corner: "top-right",
    className: "-right-[4.5px] -top-[4.5px] cursor-nesw-resize",
  },
  {
    corner: "bottom-left",
    className: "-bottom-[4.5px] -left-[4.5px] cursor-nesw-resize",
  },
  {
    corner: "bottom-right",
    className: "-bottom-[4.5px] -right-[4.5px] cursor-nwse-resize",
  },
];

type InteractivePlacedFieldProps = {
  /** Shown inside the field, when it is large enough. */
  displayLabel: string;
  field: {
    height: number;
    id: string;
    required: boolean;
    type: PrepareFieldType;
    width: number;
    x: number;
    y: number;
  };
  /** Selected, and the one the inspector edits: shows the resize handles. */
  isPrimary: boolean;
  isSelected: boolean;
  /** The accessible name after the signer's name ("Sign", "Radio button: Yes"). */
  label: string;
  onHandlePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    fieldId: string,
    corner: FieldResizeHandle,
  ) => void;
  onKeyboardSelect: (fieldId: string, extend: boolean) => void;
  onPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    fieldId: string,
  ) => void;
  signer: {
    color: string;
    name: string;
    tint: string;
  };
};

/**
 * A field on the document page: a clean box in its signer's tint, with a
 * soft yellow sign-here line on signature and initials. Selected, it wears
 * the accent ring; the one the inspector edits gets four small handles. Purely presentational: the
 * stage owns the gestures (so a drag can move several fields, snap, and
 * write transforms without re-rendering), the field only reports where a
 * pointer went down.
 */
function InteractivePlacedFieldImpl({
  displayLabel,
  field,
  isPrimary,
  isSelected,
  label,
  onHandlePointerDown,
  onKeyboardSelect,
  onPointerDown,
  signer,
}: InteractivePlacedFieldProps) {
  const Icon = fieldToolIcons[field.type];
  const isRadio = field.type === "radio";
  const isCheckbox = field.type === "checkbox";
  const isMark = isRadio || isCheckbox;
  const isSigning = field.type === "signature" || field.type === "initials";
  const isRoomy =
    !isMark &&
    field.width >= compactFieldWidthThreshold &&
    field.height >= compactFieldHeightThreshold;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onKeyboardSelect(field.id, event.shiftKey);
  }

  return (
    <div
      aria-label={`${signer.name} · ${label}`}
      aria-pressed={isSelected}
      className={cn(
        "group/field absolute z-2 cursor-grab touch-none overflow-visible select-none [container-type:size]",
        "border outline-none",
        "transition-[box-shadow,outline-color,outline-offset] duration-(--dur-hover) ease-(--ease-out)",
        // Lifted while dragged: a soft shadow, like a slip of paper.
        "data-dragging:z-4 data-dragging:cursor-grabbing data-dragging:shadow-(--shadow-pop) data-dragging:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent-rgb)/0.5)] focus-visible:outline-solid",
        field.required ? "border-solid" : "border-dashed",
        isRadio ? "rounded-full" : "rounded-[0.3125rem]",
        isSelected
          ? "z-3 outline-2 outline-offset-2 outline-(--accent) outline-solid"
          : "outline-0 outline-transparent hover:shadow-[0_0_0_3px_rgb(var(--fg-rgb)/0.06)]",
      )}
      data-field-id={field.id}
      data-placed-field="true"
      data-selected={isSelected || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => onPointerDown(event, field.id)}
      role="button"
      style={{
        backgroundColor: signer.tint,
        borderColor: signer.color,
        color: signer.color,
        height: `${field.height * 100}%`,
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.width * 100}%`,
      }}
      tabIndex={0}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center overflow-hidden",
          isMark ? "justify-center" : "justify-start gap-[0.4em] px-[0.55em]",
        )}
        style={{ fontSize: "clamp(8px, 36cqh, 13px)" }}
      >
        {isRadio ? (
          <span
            aria-hidden="true"
            className="size-[42%] rounded-full bg-current opacity-80"
          />
        ) : isCheckbox ? (
          <svg
            aria-hidden="true"
            className="size-[70%]"
            fill="none"
            viewBox="0 0 12 12"
          >
            <path
              d="M2.5 6.3 5 8.6l4.5-5.2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ) : isRoomy ? (
          <>
            <Icon
              aria-hidden="true"
              className={cn(
                "size-[1.15em] shrink-0",
                isSigning && "self-start mt-[0.45em]",
              )}
              strokeWidth={1.75}
            />
            <span
              className={cn(
                "pointer-events-none min-w-0 flex-1 truncate leading-none font-medium tracking-[-0.01em]",
                isSigning && "self-start mt-[0.55em]",
              )}
            >
              {displayLabel}
            </span>
            {field.type === "dropdown" ? (
              <ChevronDownIcon
                aria-hidden="true"
                className="size-[1.1em] shrink-0 opacity-70"
              />
            ) : null}
            {isSigning ? <SignLine /> : null}
          </>
        ) : (
          <Icon
            aria-hidden="true"
            className="mx-auto size-[1.2em] max-h-[80cqh] max-w-[80cqw]"
            strokeWidth={1.75}
          />
        )}
      </span>

      {isPrimary
        ? resizeHandles.map((handle) => (
            <span
              aria-hidden="true"
              className={cn(
                "absolute z-1 size-[7px] rounded-[2px] bg-(--paper) shadow-[0_0_0_1.5px_var(--accent),0_1px_2px_rgb(var(--fg-rgb)/0.2)] group-data-dragging/field:opacity-0",
                // Tiny fields (a checkbox, a radio) keep their handles out
                // of the way; the inspector sizes them precisely.
                "@max-[1.75rem]:hidden",
                // A wider, invisible hit area; generous on touch.
                "before:absolute before:-inset-1.5 before:content-[''] pointer-coarse:before:-inset-3",
                handle.className,
              )}
              data-resize-handle={handle.corner}
              key={handle.corner}
              onPointerDown={(event) =>
                onHandlePointerDown(event, field.id, handle.corner)
              }
            />
          ))
        : null}
    </div>
  );
}

export const InteractivePlacedField = memo(InteractivePlacedFieldImpl);
