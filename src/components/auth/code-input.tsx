"use client";

import { useState, type ComponentProps } from "react";

import { useFieldControlProps } from "@/components/ui/field-context";
import { cn } from "@/lib/cn";

/**
 * A one-time code drawn as six boxes. Underneath it is one real input (so
 * paste, autofill from SMS or a password manager, screen readers and
 * `getByLabel` all see a single field); the boxes only draw its value. The
 * box the next digit goes into shows the caret. Wire it inside a FormField.
 */
export function CodeInput({
  className,
  length = 6,
  onComplete,
  onValueChange,
  value,
  ...props
}: Omit<ComponentProps<"input">, "onChange" | "value"> & {
  length?: number;
  /** Called once all digits are typed. */
  onComplete?: (code: string) => void;
  onValueChange: (value: string) => void;
  value: string;
}) {
  const wired = useFieldControlProps(props);
  const [focused, setFocused] = useState(false);
  const digits = value.replace(/\D/g, "").slice(0, length);
  const activeIndex = Math.min(digits.length, length - 1);

  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden="true"
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      >
        {Array.from({ length }, (_, index) => {
          const char = digits[index];
          const isActive = focused && index === activeIndex && !wired.disabled;
          const isFilledActive = isActive && digits.length === length;

          return (
            <span
              className={cn(
                "relative flex h-14 items-center justify-center rounded-(--radius-well) bg-(--paper) text-[1.375rem] font-semibold tracking-[-0.02em] text-(--fg) tabular-nums",
                "transition-[box-shadow,background-color] duration-(--dur-hover) ease-(--ease-out)",
                // A gap after the third box reads as two groups of three.
                length === 6 && index === 3 && "ml-2.5",
                wired["aria-invalid"]
                  ? "shadow-[inset_0_0_0_1px_var(--danger)]"
                  : isActive
                    ? "shadow-(--focus-ring-input)"
                    : "shadow-(--ring-input)",
                wired.disabled && "bg-(--surface) text-(--secondary)",
              )}
              key={index}
            >
              {char ? (
                <span className="animate-in duration-(--dur-hover) ease-(--ease-out) fade-in-0 zoom-in-75 motion-reduce:zoom-in-100">
                  {char}
                </span>
              ) : null}
              {isActive && !isFilledActive && !char ? (
                <span className="h-6 w-[1.5px] animate-pulse rounded-full bg-(--accent) motion-reduce:animate-none" />
              ) : null}
            </span>
          );
        })}
      </div>
      <input
        autoComplete="one-time-code"
        className="absolute inset-0 h-full w-full cursor-text appearance-none rounded-(--radius-well) border-0 bg-transparent font-mono text-transparent caret-transparent outline-none selection:bg-transparent"
        inputMode="numeric"
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, length);

          onValueChange(next);

          if (next.length === length && digits.length !== length) {
            onComplete?.(next);
          }
        }}
        onFocus={() => setFocused(true)}
        pattern="[0-9]*"
        spellCheck={false}
        type="text"
        value={digits}
        {...wired}
      />
    </div>
  );
}
