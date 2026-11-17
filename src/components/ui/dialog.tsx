"use client";

import * as React from "react";
import { XIcon } from "@/components/ui/icons";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

/*
 * The older dialog API, kept so existing screens work, restyled to the Tray
 * look: centred with the tray entrance on desktop, a bottom sheet that
 * slides up with the drawer curve on phones (CSS only, no drag, so a
 * signature pad inside it is never mistaken for a swipe).
 *
 * New work uses Tray (ui/tray.tsx): same parts, plus a real drag-to-dismiss
 * drawer on phones, a danger tone and height that animates between steps.
 */
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "overlay-surface fixed inset-0 isolate z-50 bg-(--overlay)",
        className,
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "tray-surface fixed z-50 grid gap-5 overflow-y-auto overscroll-contain rounded-(--radius-tray) bg-(--paper) p-6 text-sm text-(--fg) shadow-(--shadow-tray) outline-none",
          // Phone: a tray floating 8px in from the edges.
          "inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] mx-auto max-h-[92dvh] w-auto",
          // Desktop: centred, without a translate (so text stays crisp).
          "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-[27.5rem]",
          className,
        )}
        data-sheet=""
        data-slot="dialog-content"
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close asChild data-slot="dialog-close">
            <IconButton
              aria-label="Close"
              className="absolute top-4 right-4 bg-(--surface) hover:bg-(--surface-strong)"
              size="sm"
              tooltip={false}
            >
              <XIcon />
            </IconButton>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      data-slot="dialog-header"
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end",
        className,
      )}
      data-slot="dialog-footer"
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "pr-8 text-lg leading-6 font-semibold tracking-[-0.02em] text-balance text-(--fg)",
        className,
      )}
      data-slot="dialog-title"
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "text-sm leading-6 text-pretty text-(--secondary) *:[a]:text-(--accent-ink) *:[a]:underline *:[a]:underline-offset-4",
        className,
      )}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
