"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import { useFieldControlProps } from "@/components/ui/field-context";

/*
 * Text fields: 44px, 14px corners, white,
 * a 1px ring at 10% carbon over a shallow inner well, all drawn as inset
 * shadows (so nothing shifts), and an accent halo at 30% that grows on a
 * spring when the field takes focus. 16px text on touch so iOS does not zoom.
 * When a field turns invalid it shakes once, 4px each way (.field-control
 * in globals.css).
 */
const fieldControlClassName = [
  "field-control w-full min-w-0 rounded-(--radius-well) border-0 bg-(--paper) text-[0.9375rem] text-(--fg) outline-none",
  "shadow-(--ring-input)",
  "[transition:box-shadow_var(--spring-pop-dur)_var(--spring-pop),background-color_var(--dur-hover)_var(--ease-out)]",
  "placeholder:text-(--placeholder) pointer-coarse:text-base",
  "hover:not-focus:not-disabled:shadow-(--ring-input-hover)",
  "focus:shadow-(--focus-ring-input)",
  "disabled:cursor-not-allowed disabled:bg-(--surface) disabled:text-(--secondary)",
  "aria-invalid:shadow-[inset_0_0_0_1px_var(--danger),var(--shadow-well),0_0_0_0_rgb(var(--danger-rgb)/0)] aria-invalid:focus:shadow-(--focus-ring-danger)",
].join(" ");

/** Read-only text fields read as text: a quiet well, no focus halo. */
const fieldReadOnlyClassName =
  "read-only:bg-(--surface) read-only:shadow-(--shadow-well) read-only:focus:shadow-(--ring-input)";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const wired = useFieldControlProps(props);

  return (
    <input
      className={cn(
        fieldControlClassName,
        fieldReadOnlyClassName,
        "h-(--field-h) px-3.5",
        "file:mr-3 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-(--fg)",
        className,
      )}
      data-slot="input"
      type={type}
      {...wired}
    />
  );
}

export { Input, fieldControlClassName, fieldReadOnlyClassName };
