"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * One odometer column. A hidden digit in normal flow gives the column its
 * width and baseline; the 0–9 strip over it is clipped (with clip-path, so
 * the baseline is untouched) and slides to the current digit. A column
 * whose digit did not change does not move.
 */
function DigitColumn({ digit }: { digit: number }) {
  return (
    <span
      className="relative inline-block [clip-path:inset(0_-0.1em)]"
      data-slot="number-roll-digit"
    >
      <span className="invisible">0</span>
      <span
        className="absolute inset-x-0 top-0 flex h-[1000%] flex-col transition-transform duration-(--spring-soft-dur) ease-(--spring-soft) motion-reduce:transition-none"
        style={{ transform: `translateY(${digit * -10}%)` }}
      >
        {DIGITS.map((value) => (
          <span className="block h-[10%]" key={value}>
            {value}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * A number that rolls like an odometer when it changes: only the columns
 * whose digit changed move, digits are tabular, and columns are matched
 * from the right so 99 → 100 rolls the ones and tens and adds a hundreds
 * column. Screen readers read the formatted number once (an sr-only twin).
 *
 *   <NumberRoll value={count} />
 *   <NumberRoll value={0.42} format={{ style: "percent" }} />
 */
function NumberRoll({
  className,
  format,
  locale,
  value,
}: {
  className?: string;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  value: number;
}) {
  const formatted = React.useMemo(
    () => new Intl.NumberFormat(locale ?? "en-US", format).format(value),
    [format, locale, value],
  );
  const chars = Array.from(formatted);

  return (
    <span
      className={cn("inline-flex tabular-nums", className)}
      data-slot="number-roll"
    >
      <span className="sr-only">{formatted}</span>
      <span aria-hidden="true" className="inline-flex whitespace-pre">
        {chars.map((char, index) => {
          // Keyed from the right: the ones column is always the ones column.
          const key = chars.length - index;
          const digit = DIGITS.indexOf(char);

          return digit === -1 ? (
            <span key={`s${key}`}>{char}</span>
          ) : (
            <DigitColumn digit={digit} key={`d${key}`} />
          );
        })}
      </span>
    </span>
  );
}

export { NumberRoll };
