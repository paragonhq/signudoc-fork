import * as React from "react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/cn";

/*
 * A sticker: whatever is inside gets a die-cut white edge and a soft lift,
 * rotated a few degrees, like the sticker sheet. Brand moments only (done,
 * sealed, empty states, onboarding, 404, landing): one per screen. It
 * peels on once when it mounts (from +6deg and 1.04, 420ms soft spring);
 * with reduced motion it only fades. CSS only, so it renders on the server.
 *
 *   <Sticker rotate={-4}><Seal ringText="SEALED · SHA-256 ·" /></Sticker>
 *
 * The edge follows the alpha of the content, so give it a shape (an SVG
 * mark, a plate, a card), not loose text.
 */

type StickerProps = React.ComponentProps<"div"> & {
  /** Render onto the child instead of a wrapping div. */
  asChild?: boolean;
  /** Delay the peel (ms), to scatter a few stickers. */
  delay?: number;
  /** Width of the white die-cut edge, px. */
  edge?: number;
  /** Peel in on mount. */
  peel?: boolean;
  /** Degrees; the sheet uses -8 to 10. */
  rotate?: number;
};

/**
 * Calm (docs/redesign/calm.md): stickers are retired. This renders its
 * children as they are: no die-cut edge, no shadow, no rotation, no peel.
 */
function Sticker({
  asChild = false,
  className,
  delay: _delay,
  edge: _edge,
  peel: _peel,
  rotate: _rotate,
  ...props
}: StickerProps) {
  const Comp = asChild ? Slot.Root : "div";

  void _delay;
  void _edge;
  void _peel;
  void _rotate;

  return (
    <Comp
      className={cn("inline-block", className)}
      data-slot="sticker"
      {...props}
    />
  );
}

export { Sticker, type StickerProps };
