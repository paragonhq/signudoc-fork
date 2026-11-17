"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/cn";
import { useFieldControlProps } from "@/components/ui/field-context";

/**
 * An on/off switch for settings that apply at once. The thumb springs
 * across (--ease-spring) and stretches while pressed. 32×18 with a mouse,
 * 44×26 on touch (.switch in globals.css). Use a Checkbox instead when the
 * choice only applies after a Save.
 */
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "default" | "sm";
}) {
  const wired = useFieldControlProps(props);

  return (
    <SwitchPrimitive.Root
      className={cn("switch peer", className)}
      data-size={size}
      data-slot="switch"
      {...wired}
    >
      <SwitchPrimitive.Thumb
        className="switch-thumb"
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
