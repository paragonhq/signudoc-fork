"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import { useFieldControlProps } from "@/components/ui/field-context";
import { fieldControlClassName } from "@/components/ui/input";

/**
 * A native select in the field look. Native on purpose: phones get their own
 * picker wheel, keyboards get type-ahead, and forms submit it for free. The
 * chevron is drawn by the base `select` rule in globals.css.
 *
 * For a rich picker (colour dots, descriptions, actions) use DropdownMenu
 * with DropdownMenuRadioGroup instead.
 */
function Select({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & {
  size?: "default" | "sm";
}) {
  const wired = useFieldControlProps(props);

  return (
    <select
      className={cn(
        fieldControlClassName,
        "cursor-pointer truncate pr-9 pl-3.5",
        size === "sm" ? "h-(--control-h-sm) text-[0.8125rem]" : "h-(--field-h)",
        className,
      )}
      data-size={size}
      data-slot="select"
      {...wired}
    />
  );
}

export { Select };
