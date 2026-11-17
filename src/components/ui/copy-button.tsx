"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toaster";

const RESET_AFTER_MS = 1600;

type CopyButtonProps = Omit<
  ButtonProps,
  "children" | "onClick" | "value" | "aria-label"
> & {
  /** What the copy is of, for the accessible name: "Copy signing link". */
  "aria-label"?: string;
  /** Visible text after the icon, e.g. "Copy link". Icon-only when absent. */
  children?: React.ReactNode;
  onCopied?: () => void;
  /** A toast after copying: `true` says "Copied", a string says that. */
  toastMessage?: boolean | string;
  value: string;
};

/**
 * Copies a value. The icon morphs copy → check (a blur cross-fade with a
 * small pop), a polite live region says "Copied", and it resets after
 * 1.6s. Falls back to a hidden textarea where the Clipboard API is missing.
 */
function CopyButton({
  "aria-label": ariaLabel = "Copy",
  children,
  className,
  onCopied,
  size,
  toastMessage = false,
  value,
  variant = "ghost",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement("textarea");

        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.");
      return;
    }

    setCopied(true);
    onCopied?.();

    if (toastMessage) {
      toast(typeof toastMessage === "string" ? toastMessage : "Copied");
    }

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), RESET_AFTER_MS);
  }

  const iconOnly = !children;
  const icons = (
    <span
      aria-hidden="true"
      className="relative inline-grid size-4 shrink-0 place-items-center *:col-start-1 *:row-start-1"
    >
      <CopyIcon
        className={cn(
          "transition-[opacity,scale,filter] duration-(--dur-hover) ease-(--ease-out)",
          copied ? "scale-50 opacity-0 blur-[2px]" : "scale-100 opacity-100",
        )}
      />
      <CheckIcon
        className={cn(
          "text-(--success) transition-[opacity,scale,filter] duration-(--spring-pop-dur) ease-(--spring-pop)",
          copied ? "scale-100 opacity-100" : "scale-50 opacity-0 blur-[2px]",
        )}
      />
    </span>
  );
  const button = (
    <Button
      aria-label={iconOnly ? ariaLabel : undefined}
      className={className}
      data-copied={copied || undefined}
      onClick={() => void copy()}
      size={size ?? (iconOnly ? "icon-sm" : "sm")}
      type="button"
      variant={variant}
      {...props}
    >
      {icons}
      {children}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </Button>
  );

  return iconOnly ? (
    <SimpleTooltip label={copied ? "Copied" : ariaLabel}>
      {button}
    </SimpleTooltip>
  ) : (
    button
  );
}

export { CopyButton };
