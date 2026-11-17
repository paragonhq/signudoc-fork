import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

/*
 * Buttons. Pills: 40px with
 * a mouse, 44px on touch (`--control-h`), 36px for `sm`, 48px for `lg`.
 *
 * Each filled or raised variant is built in layers (globals.css, "Materials
 * for controls"): its fill, a 1px inner top highlight, a hairline edge and
 * a contact shadow. Pressed, the button sinks on a fast spring (.97) while
 * the highlight dims and the contact shadow flattens; released, it settles
 * back with one tiny overshoot (`.tactile`). The hierarchy holds: primary
 * is a violet object, outline is raised paper, secondary a tinted chip,
 * ghost is text until touched. Hover only for fine pointers.
 *
 * Each variant sets --btn-fg, the colour of its label, so the loading
 * spinner can keep that colour while the label turns transparent (the
 * label stays in place, so the button never changes width).
 */
const buttonVariants = cva(
  [
    "tactile group/button relative inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-clip-padding",
    "text-sm font-medium tracking-[-0.01em] whitespace-nowrap text-(--btn-fg) select-none outline-none",
    "disabled:pointer-events-none disabled:opacity-45",
    "data-loading:cursor-progress data-loading:text-transparent",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:stroke-[1.75]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "mat-fill bg-primary [--btn-fg:var(--on-accent)] hover:bg-(--accent-hover)",
        /** Secondary: raised paper with a hairline and a contact shadow. */
        outline:
          "mat-raised bg-(--paper) [--btn-fg:var(--fg)] hover:bg-(--paper-hover)",
        secondary:
          "mat-tint bg-(--accent-soft) [--btn-fg:var(--accent-ink)] hover:bg-(--accent-soft-hover)",
        ghost:
          "bg-transparent [--btn-fg:var(--secondary)] focus-visible:shadow-(--focus-ring) hover:bg-(--hover) hover:[--btn-fg:var(--fg)] active:bg-(--press) data-[state=open]:bg-(--hover) data-[state=open]:[--btn-fg:var(--fg)]",
        destructive:
          "mat-fill bg-(--danger-solid) [--btn-fg:var(--on-accent)] [--fill-rgb:var(--danger-solid-rgb)] hover:bg-(--danger-solid-hover)",
        "destructive-ghost":
          "bg-transparent [--btn-fg:var(--danger)] focus-visible:shadow-(--focus-ring) hover:bg-(--danger-soft) active:bg-[rgb(var(--danger-rgb)/0.14)]",
        /** Carbon: kept for older screens; a quiet dark pill. */
        ink: "mat-fill bg-(--fg) [--btn-fg:var(--paper)] [--fill-rgb:var(--fg-rgb)] hover:bg-[rgb(var(--fg-rgb)/0.86)]",
        /** White on a dark or violet ground. */
        inverse:
          "mat-raised bg-(--paper) [--btn-fg:var(--fg)] hover:bg-[rgb(255_255_255/0.88)]",
        link: "h-auto min-h-0 px-0 [--btn-fg:var(--accent-ink)] focus-visible:shadow-(--focus-ring) underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default:
          "min-h-(--control-h) gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "min-h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "min-h-(--control-h-sm) gap-1.5 px-3.5 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-4",
        lg: "min-h-12 gap-2 px-6 text-[0.9375rem]",
        icon: "size-(--control-h) [--press-scale:0.94]",
        "icon-xs":
          "size-7 [--press-scale:0.92] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-(--control-h-sm) [--press-scale:0.94] [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-11 [--press-scale:0.95] pointer-coarse:size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /**
     * Busy: a spinner sits over the label (which stays, so the width holds),
     * clicks are ignored and `aria-busy` is set. The button stays focusable.
     */
    loading?: boolean;
  };

function blockWhileLoading(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault();
}

function Button({
  asChild = false,
  children,
  className,
  loading = false,
  onClick,
  size = "default",
  style,
  variant = "default",
  ...props
}: ButtonProps) {
  // Filled variants pin their label colour inline, so a stray text colour
  // from an older screen cannot turn a violet button's label dark.
  const pinsColor = variant === "default" || variant === "destructive";
  const resolvedStyle =
    pinsColor || loading
      ? {
          ...style,
          color: loading ? "transparent" : "var(--on-accent)",
        }
      : style;
  const spinner = loading ? (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center animate-in fade-in-0 zoom-in-50 duration-(--spring-pop-dur) ease-(--spring-pop)"
      style={{ color: "var(--btn-fg)" }}
    >
      <Spinner />
    </span>
  ) : null;
  const shared = {
    "aria-busy": loading || undefined,
    "aria-disabled": loading || props["aria-disabled"] || undefined,
    className: cn(buttonVariants({ variant, size, className })),
    "data-loading": loading || undefined,
    "data-size": size,
    "data-slot": "button",
    "data-variant": variant,
    onClick: loading ? blockWhileLoading : onClick,
    style: resolvedStyle,
  };

  if (asChild) {
    // Slot needs its child alone; Slottable lets the spinner ride along.
    return loading ? (
      <Slot.Root {...props} {...shared}>
        <Slot.Slottable>{children}</Slot.Slottable>
        {spinner}
      </Slot.Root>
    ) : (
      <Slot.Root {...props} {...shared}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button {...props} {...shared}>
      {children}
      {spinner}
    </button>
  );
}

export { Button, buttonVariants, type ButtonProps };
