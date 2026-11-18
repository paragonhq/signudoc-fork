"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { Check } from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

/*
 * Our own colour picker: a swatch that opens a small popover with a
 * saturation/brightness field, a hue slider, a row of presets and a hex
 * field. Everything is keyboard reachable (arrows move the field and the
 * slider, Shift moves further). Values in and out are "#rrggbb".
 */

type Hsv = { h: number; s: number; v: number };

const PRESETS = [
  "#3f22ec",
  "#1a73e8",
  "#0e7490",
  "#047857",
  "#65a30d",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#7c3aed",
  "#334155",
  "#111827",
];

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function hexToHsv(hex: string): Hsv | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let raw = m[1];
  if (raw.length === 3) raw = [...raw].map((c) => c + c).join("");
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  function handle(event: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    onMove(
      clamp((event.clientX - rect.left) / rect.width),
      clamp((event.clientY - rect.top) / rect.height),
    );
  }
  return {
    ref,
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus();
      handle(event);
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) handle(event);
    },
  };
}

function arrowDelta(event: KeyboardEvent, step: number) {
  const big = event.shiftKey ? step * 10 : step;
  switch (event.key) {
    case "ArrowLeft":
      return [-big, 0];
    case "ArrowRight":
      return [big, 0];
    case "ArrowUp":
      return [0, big];
    case "ArrowDown":
      return [0, -big];
    default:
      return null;
  }
}

export type ColorPickerProps = {
  /** "#rrggbb", or anything; an invalid value shows `fallback`. */
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  /** Colour shown on the trigger (e.g. an adjusted shade). Defaults to the value. */
  displayColor?: string;
  className?: string;
  "aria-label"?: string;
};

export function ColorPicker({
  value,
  fallback,
  onChange,
  disabled,
  displayColor,
  className,
  "aria-label": ariaLabel = "Choose a color",
}: ColorPickerProps) {
  const [hsv, setHsv] = useState<Hsv>(
    () => hexToHsv(value) ?? hexToHsv(fallback)!,
  );
  const [draft, setDraft] = useState(value || fallback);
  const [lastEmitted, setLastEmitted] = useState<string | null>(null);

  // Follow outside changes (typed elsewhere, reset) without fighting the
  // hue when saturation is 0 — only resync when the hex really differs.
  // Adjusted during render (React's pattern for props that drive state),
  // not in an effect, so there is no extra render with stale colours.
  const [synced, setSynced] = useState({ fallback, value });

  if (synced.value !== value || synced.fallback !== fallback) {
    setSynced({ fallback, value });

    if (value.toLowerCase() !== lastEmitted) {
      const next = hexToHsv(value) ?? hexToHsv(fallback);

      if (next) setHsv(next);
      setDraft(value || fallback);
    }
  }

  const hex = hsvToHex(hsv);

  function commit(next: Hsv, keepDraft = false) {
    setHsv(next);
    const out = hsvToHex(next);
    setLastEmitted(out);
    if (!keepDraft) setDraft(out);
    onChange(out);
  }

  const field = useDrag((x, y) => commit({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => commit({ ...hsv, h: x * 359.999 }));

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          aria-label={ariaLabel}
          className={cn(
            "relative inline-flex size-(--field-h) shrink-0 rounded-[0.875rem] shadow-[inset_0_0_0_1px_rgb(var(--fg-rgb)/0.1)] outline-none transition-[background-color,box-shadow,scale] duration-(--dur-move) ease-(--ease-out) focus-visible:shadow-(--focus-ring) active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          style={{ backgroundColor: displayColor ?? hex }}
          type="button"
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="flex flex-col gap-3">
          {/* Saturation × brightness */}
          <div
            {...field}
            aria-label="Saturation and brightness"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(hsv.s * 100)}
            aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
            className="relative h-36 touch-none cursor-crosshair rounded-[0.625rem] outline-none focus-visible:shadow-(--focus-ring)"
            onKeyDown={(event) => {
              const d = arrowDelta(event, 0.01);
              if (!d) return;
              event.preventDefault();
              commit({
                ...hsv,
                s: clamp(hsv.s + d[0]),
                v: clamp(hsv.v + d[1]),
              });
            }}
            role="slider"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
            }}
            tabIndex={0}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute size-4 -translate-1/2 rounded-full shadow-[0_0_0_2px_#fff,0_0_0_3px_rgb(0_0_0/0.2),0_1px_4px_rgb(0_0_0/0.3)]"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                backgroundColor: hex,
              }}
            />
          </div>

          {/* Hue */}
          <div
            {...hue}
            aria-label="Hue"
            aria-valuemax={360}
            aria-valuemin={0}
            aria-valuenow={Math.round(hsv.h)}
            className="relative h-3 touch-none cursor-pointer rounded-full outline-none focus-visible:shadow-(--focus-ring)"
            onKeyDown={(event) => {
              const d = arrowDelta(event, 1);
              if (!d) return;
              event.preventDefault();
              commit({ ...hsv, h: (hsv.h + d[0] + d[1] + 360) % 360 });
            }}
            role="slider"
            style={{
              background:
                "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            }}
            tabIndex={0}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 size-4 -translate-1/2 rounded-full shadow-[0_0_0_2px_#fff,0_0_0_3px_rgb(0_0_0/0.2),0_1px_4px_rgb(0_0_0/0.3)]"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                backgroundColor: `hsl(${hsv.h} 100% 50%)`,
              }}
            />
          </div>

          {/* Presets */}
          <div
            className="grid grid-cols-6 gap-1.5"
            role="group"
            aria-label="Presets"
          >
            {PRESETS.map((preset) => {
              const selected = preset === hex;
              return (
                <button
                  aria-label={preset}
                  aria-pressed={selected}
                  className="flex aspect-square items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] outline-none transition-[scale] duration-(--dur-press) ease-(--ease-out) hover:scale-110 focus-visible:shadow-(--focus-ring) active:scale-95"
                  key={preset}
                  onClick={() => commit(hexToHsv(preset)!)}
                  style={{ backgroundColor: preset }}
                  type="button"
                >
                  {selected ? (
                    <Check
                      aria-hidden="true"
                      className="size-3.5 text-white"
                      strokeWidth={2.5}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Hex */}
          <label className="flex h-9 items-center gap-2 rounded-[0.625rem] bg-(--hover) px-2.5 focus-within:shadow-(--focus-ring)">
            <span className="text-xs font-medium text-(--secondary)">HEX</span>
            <input
              aria-label="Hex color"
              autoCapitalize="none"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase tabular-nums text-(--fg) outline-none"
              maxLength={7}
              onBlur={() => setDraft(hex)}
              onChange={(event) => {
                const text = event.target.value;
                setDraft(text);
                const next = /^#?[0-9a-f]{6}$/i.test(text.trim())
                  ? hexToHsv(text)
                  : null;
                if (next) commit(next, true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setDraft(hex);
                }
              }}
              spellCheck={false}
              value={draft.toUpperCase()}
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}
