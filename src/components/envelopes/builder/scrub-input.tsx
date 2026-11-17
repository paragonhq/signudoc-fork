"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "@/lib/cn";

type ScrubInputProps = {
  /** Read by screen readers: "Width in points". */
  "aria-label": string;
  disabled?: boolean;
  /** The one or two letters on the left: W, H, X, Y. Drag it to scrub. */
  label: string;
  max: number;
  min: number;
  /** Called with every scrubbed or typed value; the caller clamps. */
  onChange: (value: number) => void;
  /** While the label is being dragged (for undo grouping, autosave). */
  onScrubChange?: (isScrubbing: boolean) => void;
  unit?: string;
  value: number;
};

/**
 * A number field in the design-tool manner: type a value, nudge it with
 * the arrow keys (Shift for 10), or drag sideways on its letter to scrub
 * it, one point per pixel (Shift for 10). The pointer is captured while
 * scrubbing, so it keeps going past the edge of the panel.
 */
export function ScrubInput({
  "aria-label": ariaLabel,
  disabled = false,
  label,
  max,
  min,
  onChange,
  onScrubChange,
  unit = "pt",
  value,
}: ScrubInputProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubRef = useRef<{
    accumulated: number;
    pointerId: number;
    startValue: number;
    startX: number;
  } | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  const clampValue = (next: number) =>
    Math.round(Math.min(max, Math.max(min, next)));

  function commitDraft() {
    if (draft === null) {
      return;
    }

    const parsed = Number.parseFloat(draft.replace(",", "."));

    setDraft(null);

    if (Number.isFinite(parsed)) {
      onChange(clampValue(parsed));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      event.currentTarget.select();
      return;
    }

    if (event.key === "Escape") {
      if (draft !== null) {
        event.preventDefault();
        event.stopPropagation();
        setDraft(null);
      }

      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const step =
        (event.shiftKey ? 10 : 1) * (event.key === "ArrowUp" ? 1 : -1);

      setDraft(null);
      onChange(clampValue(value + step));
    }
  }

  function beginScrub(event: ReactPointerEvent<HTMLLabelElement>) {
    if (disabled || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubRef.current = {
      accumulated: 0,
      pointerId: event.pointerId,
      startValue: value,
      startX: event.clientX,
    };
  }

  function moveScrub(event: ReactPointerEvent<HTMLLabelElement>) {
    const scrub = scrubRef.current;

    if (!scrub || scrub.pointerId !== event.pointerId) {
      return;
    }

    const distance = event.clientX - scrub.startX;

    if (!isScrubbing) {
      if (Math.abs(distance) < 2) {
        return;
      }

      setIsScrubbing(true);
      onScrubChange?.(true);
    }

    const next = clampValue(
      scrub.startValue + distance * (event.shiftKey ? 10 : 1),
    );

    // One update per frame, however fast the pointer reports.
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setDraft(null);
      onChange(next);
    });
  }

  function endScrub(event: ReactPointerEvent<HTMLLabelElement>) {
    const scrub = scrubRef.current;

    if (!scrub || scrub.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    scrubRef.current = null;

    if (isScrubbing) {
      setIsScrubbing(false);
      onScrubChange?.(false);
    } else {
      document.getElementById(id)?.focus();
    }
  }

  return (
    <div
      className={cn(
        // A quiet well: tinted, no edge; focused, white with the input halo.
        "group/scrub flex h-9 min-w-0 items-center rounded-[0.625rem] bg-(--track) transition-[background-color,box-shadow] duration-(--dur-hover) ease-(--ease-out)",
        "focus-within:bg-(--paper) focus-within:shadow-[var(--ring-input),var(--focus-ring-input)] pointer-coarse:h-11",
        isScrubbing && "bg-(--paper) shadow-(--ring-input)",
        disabled && "pointer-events-none opacity-50",
      )}
      data-scrubbing={isScrubbing || undefined}
    >
      <label
        className={cn(
          "flex h-full w-8 shrink-0 cursor-ew-resize touch-none items-center justify-center rounded-l-[0.625rem] text-xs font-medium text-(--secondary) select-none",
          "transition-colors duration-(--dur-hover) hover:text-(--fg)",
          isScrubbing && "text-(--accent-ink)",
        )}
        htmlFor={id}
        onPointerCancel={endScrub}
        onPointerDown={beginScrub}
        onPointerMove={moveScrub}
        onPointerUp={endScrub}
        title="Drag to adjust"
      >
        {label}
      </label>
      <input
        aria-label={ariaLabel}
        className="h-full w-full min-w-0 bg-transparent pr-1 text-[0.8125rem] text-(--fg) tabular-nums outline-none pointer-coarse:text-base"
        disabled={disabled}
        id={id}
        inputMode="decimal"
        onBlur={commitDraft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        value={draft ?? String(value)}
      />
      <span aria-hidden="true" className="pr-2.5 text-xs text-(--secondary)">
        {unit}
      </span>
    </div>
  );
}
