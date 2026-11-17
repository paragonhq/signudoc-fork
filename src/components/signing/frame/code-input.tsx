"use client";

import { useState } from "react";

import { useFieldControlProps } from "@/components/ui/field-context";
import { cn } from "@/lib/cn";

/**
 * A one-time code as six boxes. Underneath is one real, labelled input
 * (numeric keyboard, `one-time-code` autofill, paste of the whole code), so
 * the boxes are only how it looks: typing, deleting, pasting and screen
 * readers all work on the input. Put it inside a FormField for its label,
 * hint and error. Calls `onComplete` when the last digit lands.
 */
export function CodeInput({
  className,
  disabled,
  length = 6,
  name,
  onChange,
  onComplete,
  value,
  ...props
}: {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  length?: number;
  name?: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  value: string;
}) {
  const wired = useFieldControlProps({ disabled, ...props });
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(wired["aria-invalid"]);
  const activeIndex = Math.min(value.length, length - 1);
  const half = Math.ceil(length / 2);

  return (
    <div className={cn("relative w-full", className)}>
      <div aria-hidden="true" className="flex items-center gap-2">
        {Array.from({ length }, (_, index) => {
          const char = value[index] ?? "";
          const isActive = focused && index === activeIndex && !wired.disabled;

          return (
            <div className="contents" key={index}>
              {index === half ? <span className="w-1 shrink-0 sm:w-2" /> : null}
              <span
                className={cn(
                  "relative flex h-14 min-w-0 flex-1 items-center justify-center rounded-(--radius-well) bg-(--paper) text-2xl font-semibold text-(--fg) tabular-nums",
                  "transition-[box-shadow,background-color] duration-(--dur-hover) ease-(--ease-out)",
                  char
                    ? "shadow-(--ring-input-hover)"
                    : "shadow-(--ring-input)",
                  isActive && "shadow-(--focus-ring-input)",
                  invalid && "bg-(--danger-soft) shadow-(--focus-ring-danger)",
                  wired.disabled && "bg-(--surface) text-(--secondary)",
                )}
              >
                {char}
                {isActive && !char ? (
                  <span className="h-6 w-0.5 animate-pulse rounded-full bg-(--accent) motion-reduce:animate-none" />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <input
        {...wired}
        autoComplete="one-time-code"
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed"
        inputMode="numeric"
        maxLength={length}
        name={name}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, length);

          onChange(next);

          if (next.length === length && next !== value) {
            onComplete?.(next);
          }
        }}
        onFocus={(event) => {
          setFocused(true);
          // Keep the caret at the end: the boxes fill left to right.
          const end = event.target.value.length;

          event.target.setSelectionRange(end, end);
        }}
        pattern="[0-9]*"
        spellCheck={false}
        type="text"
        value={value}
      />
    </div>
  );
}
