"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/cn";
import { motion } from "motion/react";

import { useGlide } from "@/components/ui/glide";
import { useControllableState } from "@/components/ui/hooks";

export type SegmentedItem<T extends string = string> = {
  /** Shown after the label in tabular figures, e.g. a filter's row count. */
  count?: number | string;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: T;
};

type SegmentedProps<T extends string> = {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  defaultValue?: T;
  /** Stretch to the container and share the width equally. */
  fill?: boolean;
  items: readonly SegmentedItem<T>[];
  name?: string;
  onValueChange?: (value: T) => void;
  size?: "default" | "sm";
  value?: T;
};

/**
 * One choice out of a few: list filters, Type/Draw, Day/Week. A radiogroup:
 * Tab enters on the selected item, arrow keys move and select, Home/End
 * jump. A pill track at 5% carbon (a shallow well) with one raised paper
 * thumb (highlight, hairline, contact shadow) that springs, stretching, to
 * the active item instead of each item painting its own
 * background. Too many items for a phone? It
 * scrolls sideways inside itself (never the page) and keeps the active
 * item in view.
 *
 * For switching between panels of content, use Tabs (proper tab/tabpanel
 * semantics); Segmented changes a value.
 */
function Segmented<T extends string>({
  className,
  defaultValue,
  fill = false,
  items,
  name,
  onValueChange,
  size = "default",
  value: valueProp,
  ...aria
}: SegmentedProps<T>) {
  const [value, setValue] = useControllableState<T | undefined>({
    defaultValue: defaultValue ?? items[0]?.value,
    onChange: onValueChange as ((value: T | undefined) => void) | undefined,
    value: valueProp,
  });
  const trackRef = React.useRef<HTMLDivElement>(null);
  // The raised thumb: one paper pill that springs to the active item and
  // stretches toward it on the way (ui/glide.tsx).
  const thumbRef = React.useRef<HTMLSpanElement>(null);
  const thumb = useGlide(
    trackRef,
    thumbRef,
    {
      attributes: ["data-state"],
      axis: "x",
      selector: '[data-state="checked"]',
      stretch: true,
    },
    [value, items],
  );

  // Keep the active item in view when the control scrolls sideways. Only
  // this scroller moves: never the page.
  const hasScrolledRef = React.useRef(false);

  React.useEffect(() => {
    const track = trackRef.current;
    const scroller = track?.parentElement;
    const active = track?.querySelector<HTMLElement>('[data-state="checked"]');

    if (!hasScrolledRef.current) {
      hasScrolledRef.current = true;
      return;
    }

    if (!active || !scroller || scroller.scrollWidth <= scroller.clientWidth) {
      return;
    }

    const start = active.offsetLeft;
    const end = start + active.offsetWidth;

    if (start < scroller.scrollLeft) {
      scroller.scrollTo({ behavior: "smooth", left: start - 12 });
    } else if (end > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollTo({
        behavior: "smooth",
        left: end - scroller.clientWidth + 12,
      });
    }
  }, [value]);

  return (
    <div
      className={cn(
        "no-scrollbar max-w-full overflow-x-auto overscroll-x-contain rounded-full",
        fill ? "flex w-full" : "inline-flex",
        className,
      )}
      data-slot="segmented"
    >
      <RadioGroupPrimitive.Root
        className={cn(
          "relative isolate inline-flex shrink-0 items-stretch gap-0.5 rounded-full bg-(--track) p-0.75 shadow-(--shadow-well)",
          size === "sm" ? "h-(--control-h-sm)" : "h-(--control-h)",
          fill && "flex w-full",
        )}
        loop
        name={name}
        onValueChange={(next) => setValue(next as T)}
        orientation="horizontal"
        ref={trackRef}
        value={value}
        {...aria}
      >
        {/* The thumb: a raised paper pill that springs to the active item. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute top-0.75 bottom-0.75 left-0 -z-10 rounded-full bg-(--paper) shadow-(--shadow-thumb) will-change-transform"
          data-slot="segmented-thumb"
          ref={thumbRef}
          style={{
            opacity: thumb.opacity,
            width: thumb.size,
            x: thumb.position,
          }}
        />
        {items.map((item) => (
          <RadioGroupPrimitive.Item
            className={cn(
              "group/segment inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full px-3.5 font-medium whitespace-nowrap text-(--secondary) outline-none select-none",
              "tactile [--press-scale:0.96]",
              "hover:text-(--fg) focus-visible:shadow-(--focus-ring)",
              "disabled:pointer-events-none disabled:opacity-45",
              "data-[state=checked]:text-(--fg)",
              "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
              size === "sm" ? "px-3 text-[0.8125rem]" : "text-sm",
              fill && "flex-1",
            )}
            data-slot="segmented-item"
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.count !== undefined ? (
              <span className="text-[0.8125rem] text-(--secondary) tabular-nums">
                {item.count}
              </span>
            ) : null}
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
    </div>
  );
}

export { Segmented };
