import * as React from "react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/cn";

/*
 * The plate: SignuDoc's label and banner shape, the logo's silhouette (a
 * rectangle with a pointed right end, skewed -12deg). The shape is drawn
 * behind the label (.plate-label in globals.css) so the text stays upright.
 *
 *   <PlateLabel>02 Signers</PlateLabel>                     section label
 *   <PlateLabel size="md" tone="accent">Your turn</PlateLabel>
 *   <PlateLabel size="lg" tone="violet">No envelope fees</PlateLabel>
 *   <PlateLabel size="xs" tone="yellow">Sign here</PlateLabel>
 *
 * Sizes: micro 14px (order numbers), xs 20px and sm 24px (mono caps:
 * flags, steps, section labels), md 32px (display: a banner), lg 48px
 * (display: a hero plate). Tones: carbon (Bond text), carbon-yellow
 * (yellow text), accent (install colour, on-accent text), violet (brand
 * violet, yellow text: brand moments), yellow (carbon text; only where a
 * person signs, their turn, or the active marker), accent-soft and
 * neutral-soft (quiet plates for dense lists), bond (on carbon grounds).
 */

export type PlateTone =
  | "carbon"
  | "carbon-yellow"
  | "accent"
  | "violet"
  | "yellow"
  | "accent-soft"
  | "neutral-soft"
  | "bond";

export type PlateSize = "micro" | "xs" | "sm" | "md" | "lg";

type PlateLabelProps = React.ComponentProps<"span"> & {
  /** Render onto the child (e.g. a Link) instead of a span. */
  asChild?: boolean;
  icon?: React.ReactNode;
  /** Force mono caps on md/lg (xs/sm/micro are always mono). */
  mono?: boolean;
  size?: PlateSize;
  tone?: PlateTone;
};

function PlateLabel({
  asChild = false,
  children,
  className,
  icon,
  mono,
  size = "sm",
  tone = "carbon",
  ...props
}: PlateLabelProps) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      className={cn("plate-label", className)}
      data-mono={mono ? "true" : undefined}
      data-size={size}
      data-slot="plate-label"
      data-tone={tone}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Comp>
  );
}

export { PlateLabel, type PlateLabelProps };
