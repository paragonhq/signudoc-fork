"use client";

import { useState, type ReactNode } from "react";

import { ColorPicker } from "@/components/ui/color-picker";
import { IconButton } from "@/components/ui/icon-button";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

/*
 * Small pieces the composer's toolbar, menus and side panels share. Every
 * control keeps the editor's selection: it never takes focus on press.
 */

export const keepSelection = (event: { preventDefault: () => void }) =>
  event.preventDefault();

export function ToolButton({
  active = false,
  children,
  disabled,
  label,
  onClick,
  shortcut,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <IconButton
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-[0.5rem] text-(--secondary-strong) hover:text-(--fg)",
        active &&
          "bg-(--accent-soft) text-(--accent-ink) hover:bg-(--accent-soft-hover) hover:text-(--accent-ink)",
      )}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={keepSelection}
      shortcut={shortcut}
      size="sm"
      tooltipSide="bottom"
    >
      {children}
    </IconButton>
  );
}

/** A text trigger with a chevron, for menus like Style and Font. */
export function ToolTrigger({
  children,
  className,
  label,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <SimpleTooltip label={label} side="bottom">
      <button
        aria-label={label}
        className={cn(
          "inline-flex h-(--control-h-sm) shrink-0 items-center gap-1.5 rounded-[0.5rem] px-2.5 text-[0.8125rem] font-medium text-(--fg) outline-none transition-[background-color] duration-(--dur-hover) hover:bg-(--hover) focus-visible:shadow-(--focus-ring) data-[state=open]:bg-(--hover) disabled:opacity-45",
          className,
        )}
        onMouseDown={keepSelection}
        type="button"
        {...props}
      >
        <span className="min-w-0 truncate">{children}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-(--tertiary)"
        />
      </button>
    </SimpleTooltip>
  );
}

export function ToolDivider() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 h-5 w-px shrink-0 bg-(--divider)"
    />
  );
}

// A word-processor palette: greys, then eight hues in four tints.
const GREYS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#cccccc",
  "#d9d9d9",
  "#efefef",
  "#f3f3f3",
  "#ffffff",
];
const HUES = [
  [
    "#980000",
    "#ff0000",
    "#ff9900",
    "#ffff00",
    "#00ff00",
    "#00ffff",
    "#4a86e8",
    "#0000ff",
    "#9900ff",
    "#ff00ff",
  ],
  [
    "#e6b8af",
    "#f4cccc",
    "#fce5cd",
    "#fff2cc",
    "#d9ead3",
    "#d0e0e3",
    "#c9daf8",
    "#cfe2f3",
    "#d9d2e9",
    "#ead1dc",
  ],
  [
    "#dd7e6b",
    "#ea9999",
    "#f9cb9c",
    "#ffe599",
    "#b6d7a8",
    "#a2c4c9",
    "#a4c2f4",
    "#9fc5e8",
    "#b4a7d6",
    "#d5a6bd",
  ],
  [
    "#a61c00",
    "#cc0000",
    "#e69138",
    "#f1c232",
    "#6aa84f",
    "#45818e",
    "#3c78d8",
    "#3d85c6",
    "#674ea7",
    "#a64d79",
  ],
  [
    "#5b0f00",
    "#660000",
    "#783f04",
    "#7f6000",
    "#274e13",
    "#0c343d",
    "#1c4587",
    "#073763",
    "#20124d",
    "#4c1130",
  ],
];

function isDark(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

export function ColorGrid({
  onPick,
  resetLabel,
  value,
}: {
  onPick: (color: string | null) => void;
  resetLabel: string;
  value: string | null;
}) {
  const [custom, setCustom] = useState(
    value && value !== "transparent" ? value : "#3f22ec",
  );
  const normalized = value?.toLowerCase() ?? null;

  return (
    <div className="flex flex-col gap-2.5">
      <button
        className="flex h-8 items-center gap-2 rounded-[0.5rem] px-2 text-[0.8125rem] text-(--fg) outline-none hover:bg-(--hover) focus-visible:shadow-(--focus-ring)"
        onClick={() => onPick(null)}
        onMouseDown={keepSelection}
        type="button"
      >
        <span className="relative size-4 rounded-[3px] border border-(--border) bg-white after:absolute after:top-1/2 after:left-[-2px] after:h-px after:w-[calc(100%+4px)] after:-rotate-45 after:bg-(--danger)" />
        {resetLabel}
      </button>
      <div
        className="grid grid-cols-10 gap-1"
        role="group"
        aria-label="Colours"
      >
        {[GREYS, ...HUES].flat().map((color) => (
          <button
            aria-label={color}
            className="relative size-5 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] outline-none transition-[scale] duration-(--dur-press) hover:scale-115 focus-visible:shadow-(--focus-ring)"
            key={color}
            onClick={() => onPick(color)}
            onMouseDown={keepSelection}
            style={{ backgroundColor: color }}
            type="button"
          >
            {normalized === color ? (
              <CheckIcon
                aria-hidden="true"
                className="absolute inset-0 m-auto size-3"
                style={{ color: isDark(color) ? "#ffffff" : "#000000" }}
              />
            ) : null}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-(--divider) pt-2.5">
        <ColorPicker
          aria-label="Custom colour"
          fallback="#3f22ec"
          onChange={setCustom}
          value={custom}
        />
        <button
          className="h-8 flex-1 rounded-[0.5rem] bg-(--surface) px-2.5 text-[0.8125rem] font-medium text-(--fg) outline-none hover:bg-(--surface-strong) focus-visible:shadow-(--focus-ring)"
          onClick={() => onPick(custom)}
          onMouseDown={keepSelection}
          type="button"
        >
          Use custom colour
        </button>
      </div>
    </div>
  );
}

/** A toolbar button that opens a colour palette. */
export function ColorButton({
  children,
  label,
  onPick,
  resetLabel,
  swatch,
  value,
}: {
  children: ReactNode;
  label: string;
  onPick: (color: string | null) => void;
  resetLabel: string;
  swatch: string | null;
  value: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <SimpleTooltip label={label} side="bottom">
        <PopoverTrigger asChild>
          <button
            aria-label={label}
            className="relative inline-flex size-(--control-h-sm) shrink-0 flex-col items-center justify-center rounded-[0.5rem] text-(--secondary-strong) outline-none transition-[background-color] duration-(--dur-hover) hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring) data-[state=open]:bg-(--hover)"
            onMouseDown={keepSelection}
            type="button"
          >
            <span className="-mt-0.5 [&_svg]:size-4">{children}</span>
            <span
              aria-hidden="true"
              className="absolute bottom-1 h-[3px] w-4 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]"
              style={{
                backgroundColor:
                  swatch && swatch !== "transparent" ? swatch : "transparent",
              }}
            />
          </button>
        </PopoverTrigger>
      </SimpleTooltip>
      <PopoverContent
        align="start"
        className="w-auto p-3"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <ColorGrid
          onPick={(color) => {
            onPick(color);
            setOpen(false);
          }}
          resetLabel={resetLabel}
          value={value}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Hover a grid to choose a table's size, like a word processor. */
export function TableGrid({
  onPick,
}: {
  onPick: (rows: number, columns: number) => void;
}) {
  const [hover, setHover] = useState({ columns: 3, rows: 3 });
  const size = 8;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid gap-1"
        onMouseLeave={() => setHover({ columns: 0, rows: 0 })}
        role="grid"
        aria-label="Table size"
        style={{ gridTemplateColumns: `repeat(${size}, 1.125rem)` }}
      >
        {Array.from({ length: size * size }, (_, index) => {
          const row = Math.floor(index / size) + 1;
          const column = (index % size) + 1;
          const on = row <= hover.rows && column <= hover.columns;

          return (
            <button
              aria-label={`${row} by ${column} table`}
              className={cn(
                "size-[1.125rem] rounded-[3px] border outline-none transition-colors duration-75 focus-visible:shadow-(--focus-ring)",
                on
                  ? "border-(--accent) bg-(--accent-soft)"
                  : "border-(--border) bg-(--paper)",
              )}
              key={index}
              onClick={() => onPick(row, column)}
              onFocus={() => setHover({ columns: column, rows: row })}
              onMouseDown={keepSelection}
              onMouseEnter={() => setHover({ columns: column, rows: row })}
              type="button"
            />
          );
        })}
      </div>
      <p className="text-center text-xs font-medium tabular-nums text-(--secondary)">
        {hover.rows && hover.columns
          ? `${hover.rows} × ${hover.columns}`
          : "Choose a size"}
      </p>
    </div>
  );
}
