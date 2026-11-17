import * as React from "react";

import { cn } from "@/lib/cn";
import { PlateLabel, type PlateSize } from "@/components/ui/plate-label";

/*
 * The tab flag: the small sizes of PlateLabel (ui/plate-label.tsx), kept
 * under its older name and props. It marks where you are and what is
 * yours to do: the current step in a flow, "Sign here", "Your turn", the
 * active filter.
 *
 *   <TabFlag>02 Signers</TabFlag>                       carbon (current step)
 *   <TabFlag tone="sign-here">Sign here</TabFlag>       Tab yellow, carbon text
 *   <TabFlag tone="accent" icon={<PenLine />}>Your turn</TabFlag>
 *
 * Tab yellow is for "sign here" only. Never decoration. New work can use
 * PlateLabel directly (sm = TabFlag md, xs = TabFlag sm).
 */

export type TabFlagTone = "ink" | "accent" | "sign-here";

type TabFlagProps = React.ComponentProps<"span"> & {
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: TabFlagTone;
};

const SIZES: Record<NonNullable<TabFlagProps["size"]>, PlateSize> = {
  lg: "md",
  md: "sm",
  sm: "xs",
};

const TONES = {
  accent: "accent",
  ink: "carbon",
  "sign-here": "yellow",
} as const;

function TabFlag({
  className,
  size = "md",
  tone = "ink",
  ...props
}: TabFlagProps) {
  return (
    <PlateLabel
      className={cn("tab-flag", className)}
      data-flag-tone={tone}
      mono={size === "lg"}
      size={SIZES[size]}
      tone={TONES[tone]}
      {...props}
    />
  );
}

export { TabFlag };
