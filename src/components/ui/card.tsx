import * as React from "react";

import { cn } from "@/lib/cn";

/*
 * Card keeps its old parts, drawn as a calm Sheet: a white surface, no
 * border line, 20px corners and the soft elevation.
 * `variant` is still accepted: `quiet` drops the elevation to the faint
 * ring for cards nested in a busy layout. New work uses Sheet directly.
 */
function Card({
  className,
  size = "default",
  variant = "ink",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm";
  /** `ink` soft elevation (default) · `quiet` faint ring only. */
  variant?: "ink" | "quiet";
}) {
  return (
    <div
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-(--radius-card) bg-(--paper)",
        variant === "ink" ? "shadow-(--shadow-card)" : "shadow-(--ring-faint)",
        "text-sm text-(--fg) data-[size=sm]:gap-3 *:[img:first-child]:rounded-t-(--radius-card) *:[img:last-child]:rounded-b-(--radius-card)",
        className,
      )}
      data-size={size}
      data-slot="card"
      data-variant={variant}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-6 pt-6 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:pt-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4",
        className,
      )}
      data-slot="card-header"
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-base leading-6 font-semibold tracking-[-0.015em] text-(--fg) group-data-[size=sm]/card:text-[0.9375rem]",
        className,
      )}
      data-slot="card-title"
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm leading-5 text-(--secondary)", className)}
      data-slot="card-description"
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      data-slot="card-action"
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "px-6 pb-6 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:pb-4",
        className,
      )}
      data-slot="card-content"
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-(--divider) px-5 py-4 group-data-[size=sm]/card:px-4",
        className,
      )}
      data-slot="card-footer"
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
