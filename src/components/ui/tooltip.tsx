"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/cn";
import { Kbd } from "@/components/ui/kbd";

/*
 * Tooltips are small pills of layered paper (top highlight, hairline,
 * soft shadow). The first one waits 400ms and springs in from its trigger; moving to a neighbour within 300ms shows it at once with
 * no animation (Radix's skip delay, styled by .tooltip-surface in
 * globals.css). Tooltips never hold the only copy of information: on touch
 * they do not open, so the trigger must make sense without them.
 */
function TooltipProvider({
  delayDuration = 400,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  shortcut,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  /** A keyboard shortcut shown as a Kbd chip after the label, e.g. "⌘D". */
  shortcut?: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          "tooltip-surface z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-2 rounded-(--radius-well) bg-(--paper) px-2.5 py-1.5 text-xs leading-4 font-medium text-(--fg) shadow-(--shadow-pop) select-none",
          shortcut ? "pr-1.5" : null,
          className,
        )}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        {...props}
      >
        {children}
        {shortcut ? (
          <Kbd className="h-4.5 min-w-4.5 text-[0.6875rem]">{shortcut}</Kbd>
        ) : null}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

/**
 * The common case in one line: wraps a single focusable child.
 *
 *   <SimpleTooltip label="Duplicate" shortcut="⌘D"><IconButton …/></SimpleTooltip>
 */
function SimpleTooltip({
  children,
  label,
  shortcut,
  side = "top",
  align,
  disabled = false,
}: {
  align?: React.ComponentProps<typeof TooltipPrimitive.Content>["align"];
  children: React.ReactElement;
  disabled?: boolean;
  label: React.ReactNode;
  shortcut?: React.ReactNode;
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>["side"];
}) {
  if (disabled) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent align={align} shortcut={shortcut} side={side}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  SimpleTooltip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
};
