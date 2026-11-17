"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";

import { cn } from "@/lib/cn";

/**
 * A pressed/unpressed button: bold, italic, "show grid". For one choice out
 * of several, use Segmented instead.
 */
const toggleVariants = cva(
  [
    "group/toggle inline-flex items-center justify-center gap-1.5 rounded-full text-[0.8125rem] font-medium whitespace-nowrap text-(--secondary) outline-none",
    "transition-[background-color,color,box-shadow,scale] duration-(--dur-hover) ease-(--ease-out)",
    "hover:bg-(--hover) hover:text-(--fg) active:scale-[0.97] focus-visible:shadow-(--focus-ring)",
    "disabled:pointer-events-none disabled:opacity-45",
    "data-[state=on]:bg-(--accent-soft) data-[state=on]:text-(--accent-ink) data-[state=on]:hover:bg-(--accent-soft-hover) data-[state=on]:hover:text-(--accent-ink)",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "bg-(--paper) shadow-(--ring-soft)",
      },
      size: {
        default: "h-(--control-h) min-w-(--control-h) px-2.5",
        sm: "h-(--control-h-sm) min-w-(--control-h-sm) px-2",
        lg: "h-11 min-w-11 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      className={cn(toggleVariants({ variant, size, className }))}
      data-slot="toggle"
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
