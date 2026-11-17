import * as React from "react";

import { cn } from "@/lib/cn";

type KbdProps = React.ComponentProps<"kbd"> & {
  /**
   * `paper` on light grounds; `plate` on dark grounds (white at low
   * opacity).
   */
  tone?: "paper" | "plate";
};

/**
 * A quiet keyboard hint: a small keycap (paper, a top highlight, a
 * hairline and a 1px lip), 6px corners. Write keys the way the
 * platform shows them: ⌘K, ⌘↵, ⌫, N. Hidden from phones' touch layouts by
 * the caller when the shortcut cannot be pressed there.
 */
function Kbd({ className, tone = "paper", ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-0.5 rounded-md px-1.5",
        "font-sans text-xs leading-none font-medium tabular-nums select-none",
        // A keycap: its own fill, a top highlight, a hairline and a 1px
        // lip underneath, so it reads as a key and not a tag.
        tone === "paper"
          ? "bg-(--paper) text-(--secondary) shadow-[var(--surface-highlight),0_0_0_1px_rgb(var(--fg-rgb)/0.1),0_1px_0_rgb(var(--fg-rgb)/0.1)]"
          : "bg-[rgb(255_255_255/0.14)] text-[rgb(255_255_255/0.86)] shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_0_rgb(0_0_0/0.2)]",
        className,
      )}
      data-slot="kbd"
      data-tone={tone}
      {...props}
    />
  );
}

/** Keys pressed together, e.g. <KbdGroup><Kbd>⌘</Kbd><Kbd>D</Kbd></KbdGroup>. */
function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      data-slot="kbd-group"
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
