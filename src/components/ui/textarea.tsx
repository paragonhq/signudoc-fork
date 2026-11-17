"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import { useFieldControlProps } from "@/components/ui/field-context";
import {
  fieldControlClassName,
  fieldReadOnlyClassName,
} from "@/components/ui/input";

/** A multi-line field: the Input look, growing with its content. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const wired = useFieldControlProps(props);

  return (
    <textarea
      className={cn(
        fieldControlClassName,
        fieldReadOnlyClassName,
        "flex field-sizing-content min-h-24 resize-y px-3.5 py-2.5 leading-6",
        className,
      )}
      data-slot="textarea"
      {...wired}
    />
  );
}

export { Textarea };
