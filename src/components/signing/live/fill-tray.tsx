"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { TextMorph } from "@/components/ui/text-morph";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import { NUMBER_ENTRY_MESSAGE } from "@/lib/field-choices";
import { cn } from "@/lib/cn";
import type { SigningCurrentField } from "@/lib/schemas/signing";

import { getFieldKindLabel } from "./field-logic";

/** The fields a phone fills in here rather than on the page. */
export function isTrayFillable(field: Pick<SigningCurrentField, "type">) {
  return (
    field.type === "text" ||
    field.type === "number" ||
    field.type === "dropdown"
  );
}

/**
 * On a phone a text, number or dropdown field on the page is a few pixels
 * tall: typing into it would zoom the page and hide what is being typed.
 * Tapping one opens this tray instead: the field's name, one large input
 * (17px, so iOS never zooms) or the dropdown's choices as big rows, and
 * Next, which walks on to the next field without closing when it is
 * another one to fill in. The page behind updates as they type.
 */
export function FillTray({
  field,
  hasNext,
  isInvalid,
  onClose,
  onNext,
  onValueChange,
  pageCount,
  value,
}: {
  field: SigningCurrentField | null;
  /** Another required field is still to do after this one. */
  hasNext: boolean;
  isInvalid: boolean;
  onClose: () => void;
  onNext: () => void;
  onValueChange: (value: string) => void;
  pageCount: number;
  value: string;
}) {
  // Keep the last field while the tray animates out.
  const [lastField, setLastField] = useState(field);
  const reduceMotion = useReducedMotion();

  if (field && field !== lastField) {
    setLastField(field);
  }

  const shown = field ?? lastField;
  const name = shown
    ? shown.label?.trim() || getFieldKindLabel(shown)
    : "Fill in";
  const where = shown
    ? [
        pageCount > 1 ? `Page ${shown.page}` : null,
        shown.required ? "Required" : "Optional",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const canMoveOn = !isInvalid && (!shown?.required || value.trim() !== "");

  return (
    <Tray
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={field !== null}
    >
      <TrayContent size="sm">
        <TrayHeader>
          <TrayTitle>{name}</TrayTitle>
          <TrayDescription>{where}</TrayDescription>
        </TrayHeader>
        <TrayBody className="overflow-x-hidden pt-2">
          <AnimatePresence initial={false} mode="popLayout">
            {shown ? (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  transition: {
                    duration: exitDuration(DUR.open),
                    ease: EASE.exit,
                  },
                  x: reduceMotion ? 0 : -24,
                }}
                initial={{ opacity: 0, x: reduceMotion ? 0 : 32 }}
                key={shown.id}
                transition={{ duration: DUR.open, ease: EASE.out }}
              >
                {shown.type === "dropdown" ? (
                  <div
                    aria-label={name}
                    className="flex flex-col gap-1"
                    role="group"
                  >
                    {(shown.options ?? []).map((option) => {
                      const selected = value === option;

                      return (
                        <button
                          aria-pressed={selected}
                          className={cn(
                            "flex min-h-13 items-center gap-3 rounded-(--radius-well) px-4 text-left text-[1.0625rem] leading-6 outline-none",
                            "transition-[background-color,box-shadow] duration-(--dur-hover) ease-(--ease-out) focus-visible:shadow-(--focus-ring) active:scale-[0.99]",
                            selected
                              ? "bg-(--accent-softer) font-medium text-(--fg) shadow-[inset_0_0_0_1.5px_rgb(var(--accent-rgb)/0.5)]"
                              : "bg-(--surface) text-(--fg)",
                          )}
                          key={option}
                          onClick={() =>
                            onValueChange(
                              selected && !shown.required ? "" : option,
                            )
                          }
                          type="button"
                        >
                          <span className="min-w-0 flex-1">{option}</span>
                          {selected ? (
                            <motion.span
                              animate={{ opacity: 1, scale: 1 }}
                              className="inline-flex size-6 items-center justify-center rounded-full bg-(--accent) text-(--on-accent)"
                              initial={{ opacity: 0, scale: 0.5 }}
                              transition={{
                                duration: DUR.move,
                                ease: EASE.pop,
                              }}
                            >
                              <CheckIcon
                                aria-hidden="true"
                                className="size-3.5"
                                strokeWidth={3}
                              />
                            </motion.span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Input
                      aria-describedby={
                        isInvalid ? `fill-tray-${shown.id}-error` : undefined
                      }
                      aria-invalid={isInvalid || undefined}
                      aria-label={name}
                      autoComplete="off"
                      autoFocus
                      className="h-14 text-[1.0625rem]"
                      enterKeyHint={hasNext ? "next" : "done"}
                      inputMode={shown.type === "number" ? "decimal" : "text"}
                      name={`fill-${shown.id}`}
                      onChange={(event) => onValueChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && canMoveOn) {
                          event.preventDefault();
                          onNext();
                        }
                      }}
                      placeholder={
                        shown.type === "number" ? "1250 or 12.5" : "Type here"
                      }
                      value={value}
                    />
                    {isInvalid ? (
                      <p
                        className="text-[0.8125rem] leading-5 text-(--danger)"
                        id={`fill-tray-${shown.id}-error`}
                        role="alert"
                      >
                        {NUMBER_ENTRY_MESSAGE}
                      </p>
                    ) : null}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </TrayBody>
        <TrayFooter>
          <Button
            className="w-full"
            disabled={!canMoveOn}
            onClick={onNext}
            size="lg"
          >
            <TextMorph>{hasNext ? "Next" : "Done"}</TextMorph>
          </Button>
        </TrayFooter>
      </TrayContent>
    </Tray>
  );
}
