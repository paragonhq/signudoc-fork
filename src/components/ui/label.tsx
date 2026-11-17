"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/cn";

/** A field label: 13px, weight 500, carbon. Sentence case. */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "flex items-center gap-2 text-[0.8125rem] leading-5 font-medium text-(--fg) select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
