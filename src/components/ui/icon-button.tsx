"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";

const SIZE_MAP = {
  xs: "icon-xs",
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
} as const;

type IconButtonProps = Omit<ButtonProps, "size" | "aria-label"> & {
  /** Required: an icon-only button needs a name. Also the default tooltip. */
  "aria-label": string;
  /** xs 28 · sm 32 (40 touch) · md 36 (44 touch) · lg 44 (48 touch). */
  size?: keyof typeof SIZE_MAP;
  /**
   * Tooltip on hover/focus (fine pointers). `true` (default) shows the
   * aria-label; pass a node to say something else; `false` for none.
   */
  tooltip?: boolean | React.ReactNode;
  /** Shortcut shown in the tooltip as a Kbd chip, e.g. "⌘D". */
  shortcut?: React.ReactNode;
  tooltipSide?: "top" | "right" | "bottom" | "left";
};

/**
 * An icon-only button. Same variants as Button (default `ghost`), with a
 * required aria-label and an optional tooltip. Small sizes keep a 44px hit
 * area on touch without growing.
 */
function IconButton({
  className,
  shortcut,
  size = "md",
  tooltip = true,
  tooltipSide = "top",
  variant = "ghost",
  ...props
}: IconButtonProps) {
  const button = (
    <Button
      className={cn(
        size === "xs" &&
          "before:absolute before:-inset-2 before:content-[''] pointer-fine:before:hidden",
        className,
      )}
      data-slot="icon-button"
      size={SIZE_MAP[size]}
      variant={variant}
      {...props}
    />
  );

  if (tooltip === false || tooltip === null) {
    return button;
  }

  return (
    <SimpleTooltip
      label={tooltip === true ? props["aria-label"] : tooltip}
      shortcut={shortcut}
      side={tooltipSide}
    >
      {button}
    </SimpleTooltip>
  );
}

export { IconButton, type IconButtonProps };
