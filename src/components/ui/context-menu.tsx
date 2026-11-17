"use client";

import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";

import { cn } from "@/lib/cn";
import { CheckIcon, ChevronRightIcon } from "@/components/ui/icons";

/*
 * The right-click menu. Same surface, rows and motion as DropdownMenu, so
 * a menu looks the same whether it came from a button or a right click.
 *
 *   <ContextMenu>
 *     <ContextMenuTrigger asChild><div>…</div></ContextMenuTrigger>
 *     <ContextMenuContent>
 *       <ContextMenuItem onSelect={cut}>Cut<ContextMenuShortcut>⌘X</ContextMenuShortcut></ContextMenuItem>
 *     </ContextMenuContent>
 *   </ContextMenu>
 */

const rowClassName =
  "relative flex min-h-8 cursor-default items-center gap-2.5 rounded-[0.5rem] px-2.5 py-1.5 text-[0.8125rem] outline-hidden select-none transition-colors duration-(--dur-press) focus:bg-(--hover) data-disabled:pointer-events-none data-disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:text-(--secondary)";

function ContextMenu(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Root>,
) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>,
) {
  return (
    <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
  );
}

function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn(
          "menu-surface z-[80] max-h-(--radix-context-menu-content-available-height) min-w-56 origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-(--radius-well) bg-(--paper) p-1.5 text-(--fg) shadow-(--shadow-pop)",
          className,
        )}
        collisionPadding={8}
        data-slot="context-menu-content"
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  variant?: "default" | "destructive";
}) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        rowClassName,
        "data-[variant=destructive]:text-(--danger) data-[variant=destructive]:[&_svg]:text-(--danger)",
        className,
      )}
      data-slot="context-menu-item"
      data-variant={variant}
      {...props}
    />
  );
}

function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      className={cn(rowClassName, "pr-8", className)}
      data-slot="context-menu-checkbox-item"
      {...props}
    >
      {children}
      <span className="pointer-events-none absolute right-2.5 flex items-center text-(--accent)">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="text-(--accent)!" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label>) {
  return (
    <ContextMenuPrimitive.Label
      className={cn(
        "px-2.5 py-1.5 text-xs font-medium text-(--secondary)",
        className,
      )}
      data-slot="context-menu-label"
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn("-mx-1.5 my-1.5 h-px bg-(--divider)", className)}
      data-slot="context-menu-separator"
      {...props}
    />
  );
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "ml-auto pl-6 text-xs tracking-wide text-(--tertiary)",
        className,
      )}
      data-slot="context-menu-shortcut"
      {...props}
    />
  );
}

function ContextMenuSub(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>,
) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

function ContextMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger>) {
  return (
    <ContextMenuPrimitive.SubTrigger
      className={cn(rowClassName, "data-[state=open]:bg-(--hover)", className)}
      data-slot="context-menu-sub-trigger"
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        className={cn(
          "menu-surface z-[80] min-w-48 origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-(--radius-well) bg-(--paper) p-1.5 text-(--fg) shadow-(--shadow-pop)",
          className,
        )}
        collisionPadding={8}
        data-slot="context-menu-sub-content"
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
