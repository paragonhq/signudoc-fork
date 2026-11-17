import * as React from "react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/cn";

/*
 * Sheets: white surfaces on the Bond-light page,
 * no border lines, 20px corners, soft elevation. Sections inside a sheet
 * are split by faint dividers.
 *
 * `variant` is still accepted for older screens: `ink` (default) gets the
 * soft elevation, `quiet` only the faint ring (a sheet nested in a busy
 * layout). Neither draws a border.
 *
 *   <Sheet>
 *     <SheetHeader>
 *       <div>
 *         <SheetTitle>Signers</SheetTitle>
 *         <SheetDescription>They sign in this order.</SheetDescription>
 *       </div>
 *       <SheetActions><Button size="sm" variant="outline">Add signer</Button></SheetActions>
 *     </SheetHeader>
 *     <SheetSection>…</SheetSection>
 *     <SheetFooter>…</SheetFooter>
 *   </Sheet>
 *
 * (Not to be confused with a side drawer: trays are ui/tray.tsx.)
 */
type SheetVariant = "ink" | "quiet";

const SHEET_ELEVATION: Record<SheetVariant, string> = {
  ink: "shadow-(--shadow-card)",
  quiet: "shadow-(--ring-faint)",
};

function Sheet({
  asChild = false,
  className,
  variant = "ink",
  ...props
}: React.ComponentProps<"section"> & {
  asChild?: boolean;
  /** `ink` soft elevation (default) · `quiet` faint ring. Never a border. */
  variant?: SheetVariant;
}) {
  const Comp = asChild ? Slot.Root : "section";

  return (
    <Comp
      className={cn(
        "flex min-w-0 flex-col rounded-(--radius-card) bg-(--paper)",
        SHEET_ELEVATION[variant],
        className,
      )}
      data-slot="sheet"
      data-variant={variant}
      {...props}
    />
  );
}

/** Title (and description) on the left, actions on the right; wraps on phones. */
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 pb-3 sm:px-6",
        className,
      )}
      data-slot="sheet-header"
      {...props}
    />
  );
}

function SheetTitle({
  as: Tag = "h2",
  className,
  ...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" | "h4" }) {
  return (
    <Tag
      className={cn(
        "text-base leading-6 font-semibold tracking-[-0.015em] text-(--fg)",
        className,
      )}
      data-slot="sheet-title"
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm leading-5 text-(--secondary)", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

/** A small label above a sheet title: 13px, sentence case, secondary. */
function SheetEyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "mb-1 text-[0.8125rem] leading-5 font-medium text-(--secondary)",
        className,
      )}
      data-slot="sheet-eyebrow"
      {...props}
    />
  );
}

function SheetActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}
      data-slot="sheet-actions"
      {...props}
    />
  );
}

/**
 * A section of the sheet. Sections after the first are separated by a
 * hairline. `flush` drops the padding (for a table or a list that brings
 * its own).
 */
function SheetSection({
  className,
  flush = false,
  ...props
}: React.ComponentProps<"div"> & { flush?: boolean }) {
  return (
    <div
      className={cn(
        "min-w-0 border-t border-(--divider) first:border-t-0",
        !flush && "px-5 py-5 sm:px-6",
        className,
      )}
      data-slot="sheet-section"
      {...props}
    />
  );
}

/** Actions at the foot of a sheet, under a faint divider. */
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 rounded-b-(--radius-card) border-t border-(--divider) px-5 py-4 sm:px-6",
        className,
      )}
      data-slot="sheet-footer"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetActions,
  SheetDescription,
  SheetEyebrow,
  SheetFooter,
  SheetHeader,
  SheetSection,
  SheetTitle,
};
