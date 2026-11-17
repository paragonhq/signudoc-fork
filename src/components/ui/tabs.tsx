"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/cn";
import { motion } from "motion/react";

import { useGlide } from "@/components/ui/glide";
import { mergeRefs } from "@/components/ui/hooks";

/*
 * Tabs switch between panels of content. One indicator springs to the
 * active tab, stretching toward it on the way: a raised paper pill in a
 * shallow pill well (`default`) or a 2px
 * underline on a faint divider (`line`, for page-level sections). The indicator
 * follows Radix's data-state, so controlled and uncontrolled both work.
 * Vertical tabs paint the active trigger instead of sliding.
 */
function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      className={cn(
        "group/tabs flex gap-3 data-horizontal:flex-col",
        className,
      )}
      data-orientation={orientation}
      data-slot="tabs"
      orientation={orientation}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate inline-flex w-fit items-center text-(--secondary) group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:items-stretch",
  {
    variants: {
      variant: {
        default:
          "h-(--control-h) gap-0.5 rounded-full bg-(--track) p-0.75 shadow-(--shadow-well)",
        line: "h-10 gap-6 border-b border-(--divider) group-data-vertical/tabs:gap-0.5 group-data-vertical/tabs:border-b-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  children,
  className,
  ref,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  // One indicator glides to the active tab and stretches toward it on the
  // way (ui/glide.tsx). Vertical lists paint the active trigger instead.
  const indicatorRef = React.useRef<HTMLSpanElement>(null);
  const indicator = useGlide(listRef, indicatorRef, {
    attributes: ["data-state"],
    axis: "x",
    selector: ':scope > [role="tab"][data-state="active"]',
    stretch: true,
  });

  return (
    <TabsPrimitive.List
      className={cn(tabsListVariants({ variant }), className)}
      data-slot="tabs-list"
      data-variant={variant}
      ref={mergeRefs(listRef, ref)}
      {...props}
    >
      <motion.span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 -z-10 will-change-transform group-data-vertical/tabs:hidden",
          variant === "line"
            ? "-bottom-px h-0.5 rounded-full bg-(--fg)"
            : "top-0.75 bottom-0.75 rounded-full bg-(--paper) shadow-(--shadow-thumb)",
        )}
        data-slot="tabs-indicator"
        ref={indicatorRef}
        style={{
          opacity: indicator.opacity,
          width: indicator.size,
          x: indicator.position,
        }}
      />
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative inline-flex h-full items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap text-(--secondary) outline-none select-none",
        "tactile [--press-scale:0.96]",
        "hover:text-(--fg) focus-visible:shadow-(--focus-ring)",
        "disabled:pointer-events-none disabled:opacity-45 data-active:text-(--fg)",
        "group-data-[variant=default]/tabs-list:flex-1 group-data-[variant=default]/tabs-list:rounded-full group-data-[variant=default]/tabs-list:px-3.5",
        "group-data-[variant=line]/tabs-list:rounded-xs group-data-[variant=line]/tabs-list:px-0.5",
        "group-data-vertical/tabs:h-(--control-h) group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:rounded-full group-data-vertical/tabs:px-3.5 group-data-vertical/tabs:data-active:bg-(--paper) group-data-vertical/tabs:data-active:shadow-(--shadow-thumb)",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "flex-1 text-sm outline-none focus-visible:shadow-(--focus-ring) data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-(--dur-hover)",
        className,
      )}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
