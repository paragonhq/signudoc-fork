"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/cn";

/*
 * Popovers share the menu surface: layered paper (a top highlight, a
 * hairline, contact and ambient shadows) that grows from its trigger on a
 * spring (Radix sets the transform origin; .menu-surface in globals.css
 * springs in and fades out in ~150ms). Use them for small,
 * non-blocking editors: a date, a reminder interval, a signer's colour.
 * Anything with more than one decision belongs in a Tray.
 */
function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverClose({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Close>) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

function PopoverContent({
  align = "center",
  className,
  collisionPadding = 12,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          "menu-surface z-50 max-h-(--radix-popover-content-available-height) w-72 max-w-[calc(100vw-1.5rem)] origin-(--radix-popover-content-transform-origin) overflow-y-auto rounded-(--radius-well) bg-(--paper) p-4 text-sm text-(--fg) shadow-(--shadow-pop) outline-none",
          className,
        )}
        collisionPadding={collisionPadding}
        data-slot="popover-content"
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/** A quiet title line at the top of a popover. */
function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center justify-between text-sm font-semibold text-(--fg)",
        className,
      )}
      data-slot="popover-header"
      {...props}
    />
  );
}

export {
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
};
