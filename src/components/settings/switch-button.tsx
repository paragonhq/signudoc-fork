"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * A switch for a site-wide setting that is saved on the server the moment
 * it is flipped (Part 11 mode, requiring two-step sign-in). It looks like
 * the kit's Switch, but stays a button whose name says what pressing it
 * does ("Require two-step sign-in"), because the change can be refused.
 *
 * While the request runs the thumb has already travelled to where it is
 * going (the press feels instant); if the server refuses, `on` never
 * changes and the thumb glides back.
 */
export function SwitchButton({
  children,
  className,
  disabled,
  loading = false,
  on,
  onClick,
  ...props
}: Omit<ComponentProps<"button">, "type"> & {
  loading?: boolean;
  on: boolean;
}) {
  const shown = loading ? !on : on;

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={cn("switch", loading && "cursor-progress", className)}
      data-size="default"
      data-slot="switch-button"
      data-state={shown ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
      type="button"
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="switch-thumb" />
    </button>
  );
}
