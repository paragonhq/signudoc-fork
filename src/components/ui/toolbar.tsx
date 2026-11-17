"use client";

import * as React from "react";
import { SearchIcon, XIcon } from "@/components/ui/icons";

import { cn } from "@/lib/cn";
import {
  mergeRefs,
  useControllableState,
  useIsApplePlatform,
} from "@/components/ui/hooks";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";

/*
 * The row under a page header: segmented filters, search, view toggles,
 * secondary actions. On a phone the search takes its own full-width line
 * and the rest wraps beneath it; nothing scrolls the page sideways.
 *
 *   <Toolbar aria-label="Filter documents">
 *     <Segmented aria-label="Status" items={filters} value={filter} onValueChange={setFilter} />
 *     <ToolbarSpacer />
 *     <SearchInput aria-label="Search documents" placeholder="Search" shortcut="mod+k"
 *       value={query} onValueChange={setQuery} />
 *   </Toolbar>
 */
function Toolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2 max-sm:*:data-[slot=search-input]:order-first",
        className,
      )}
      data-slot="toolbar"
      role={
        props["aria-label"] || props["aria-labelledby"] ? "group" : undefined
      }
      {...props}
    />
  );
}

/** Keeps items together when the toolbar wraps. */
function ToolbarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 items-center gap-2", className)}
      data-slot="toolbar-group"
      {...props}
    />
  );
}

/** Pushes what follows to the right edge (desktop). */
function ToolbarSpacer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("hidden flex-1 sm:block", className)}
      data-slot="toolbar-spacer"
      {...props}
    />
  );
}

/** A hairline between groups of toolbar controls. */
function ToolbarDivider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("mx-1 hidden h-5 w-px bg-(--border) sm:block", className)}
    />
  );
}

type SearchInputProps = Omit<
  React.ComponentProps<"input">,
  "defaultValue" | "type" | "value"
> & {
  defaultValue?: string;
  /** Classes for the input itself; `className` sizes the wrapper. */
  inputClassName?: string;
  onValueChange?: (value: string) => void;
  /**
   * Shows a Kbd hint and focuses the field on that key: "mod+k" (⌘K on
   * Apple, Ctrl K elsewhere) or "/". Don't bind mod+k if the page has a
   * command menu.
   */
  shortcut?: "mod+k" | "/";
  value?: string;
};

/**
 * A search field with a leading icon, a clear button once there is text,
 * and an optional shortcut hint. Escape clears it, then leaves it. Needs an
 * aria-label (or a visible Label) like any field.
 */
function SearchInput({
  className,
  defaultValue = "",
  inputClassName,
  onChange,
  onKeyDown,
  onValueChange,
  ref,
  shortcut,
  value: valueProp,
  ...props
}: SearchInputProps) {
  const [value, setValue] = useControllableState({
    defaultValue,
    onChange: onValueChange,
    value: valueProp,
  });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isApple = useIsApplePlatform();

  React.useEffect(() => {
    if (!shortcut) {
      return;
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      const matches =
        shortcut === "/"
          ? event.key === "/" && !typing
          : event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);

      if (matches) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);

    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [shortcut]);

  const hasValue = value.length > 0;
  const shortcutLabel = shortcut === "/" ? "/" : isApple ? "⌘K" : "Ctrl K";

  return (
    <div
      className={cn("relative w-full min-w-0 sm:w-64", className)}
      data-slot="search-input"
    >
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-(--tertiary)"
      />
      <Input
        autoComplete="off"
        className={cn(
          "pl-8.5 [&::-webkit-search-cancel-button]:appearance-none",
          shortcut || hasValue ? "pr-14" : "pr-3",
          inputClassName,
        )}
        enterKeyHint="search"
        onChange={(event) => {
          setValue(event.target.value);
          onChange?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (event.key === "Escape" && !event.defaultPrevented) {
            if (hasValue) {
              event.preventDefault();
              setValue("");
            } else {
              event.currentTarget.blur();
            }
          }
        }}
        ref={mergeRefs(inputRef, ref)}
        type="search"
        value={value}
        {...props}
      />
      <span className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center">
        {hasValue ? (
          <IconButton
            aria-label="Clear search"
            className="animate-in fade-in-0 zoom-in-90 duration-(--dur-hover)"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            size="xs"
            tooltip={false}
          >
            <XIcon />
          </IconButton>
        ) : shortcut ? (
          <Kbd className="mr-1 pointer-coarse:hidden">{shortcutLabel}</Kbd>
        ) : null}
      </span>
    </div>
  );
}

export { SearchInput, Toolbar, ToolbarDivider, ToolbarGroup, ToolbarSpacer };
