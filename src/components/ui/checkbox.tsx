"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/cn";
import { useFieldControlProps } from "@/components/ui/field-context";

/**
 * A checkbox: 18px box, 8px-ish corners, accent fill. The tick draws on and
 * pops with --ease-pop; indeterminate shows a dash. The hit area grows to
 * 44px on touch without growing the box (.checkbox in globals.css).
 * Pair it with a label via ChoiceField, or a <Label htmlFor>.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const wired = useFieldControlProps(props);

  return (
    <CheckboxPrimitive.Root
      className={cn("checkbox peer", className)}
      data-slot="checkbox"
      {...wired}
    >
      <CheckboxPrimitive.Indicator
        className="checkbox-mark"
        data-slot="checkbox-indicator"
        forceMount
      >
        <svg aria-hidden="true" fill="none" viewBox="0 0 12 12">
          <path
            className="checkbox-tick"
            d="M2.5 6.25 4.9 8.6 9.5 3.6"
            pathLength={1}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
          />
          <path
            className="checkbox-dash"
            d="M3 6h6"
            pathLength={1}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.75"
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
