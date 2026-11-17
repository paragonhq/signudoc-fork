"use client";

import * as React from "react";
import { animate, useMotionValue, type MotionValue } from "motion/react";

import {
  SPRING_THUMB,
  SPRING_THUMB_LEAD,
  SPRING_THUMB_TRAIL,
} from "@/components/ui/motion-tokens";

/*
 * Glide: one layer (a raised thumb, a hover pill, a selection highlight)
 * that travels to whichever item is active instead of each item painting
 * its own background. Its two edges ride their own
 * springs; with `stretch`, the leading edge is stiffer than the trailing
 * one, so the layer stretches toward where it is going and gathers up as
 * it lands. Interruptible: retargeting mid-flight springs on from where it
 * is.
 *
 * Positions come from offsetLeft/offsetTop (not getBoundingClientRect), so
 * a container that is itself scaling in (a menu opening) does not throw
 * the layer off. Reduced motion jumps. Nothing here changes markup between
 * server and client: the layer renders hidden and is placed after mount.
 */

type GlideAxis = "x" | "y";

export type GlideOptions = {
  /** Attributes whose change (anywhere inside the container) moves it. */
  attributes: string[];
  axis: GlideAxis;
  /**
   * Fade in at the item on first appearance (menus, lists) instead of
   * showing at once (thumbs that always have an active item).
   */
  fadeIn?: boolean;
  /** Called after each placement with the active item (or null). */
  onPlace?: (active: HTMLElement | null, layer: HTMLElement) => void;
  /** Matches the active item inside the container. */
  selector: string;
  /** Stretch toward the target while travelling. */
  stretch?: boolean;
};

export type Glide = {
  opacity: MotionValue<number>;
  /** The travelling edge, as a transform (x or y). */
  position: MotionValue<number>;
  /** Width (axis x) or height (axis y). */
  size: MotionValue<number>;
};

/** An element's offset inside an ancestor, ignoring transforms. */
export function offsetWithin(element: HTMLElement, ancestor: HTMLElement) {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;

  while (node && node !== ancestor) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  if (node === ancestor) {
    return { left, top };
  }

  // The ancestor is not in the offset chain: fall back to rects.
  const a = element.getBoundingClientRect();
  const b = ancestor.getBoundingClientRect();

  return {
    left: a.left - b.left + ancestor.scrollLeft,
    top: a.top - b.top + ancestor.scrollTop,
  };
}

export function useGlide(
  /**
   * The element the items live in. Leave it null to use the layer's parent
   * (handy when the layer is rendered by a child component, whose effects
   * run before its ancestors' refs are attached).
   */
  containerRef: React.RefObject<HTMLElement | null> | null,
  /** The travelling layer (render it with the returned motion values). */
  layerRef: React.RefObject<HTMLElement | null>,
  options: GlideOptions,
  /** Re-place (animated) when any of these change. */
  deps: readonly unknown[] = [],
): Glide {
  const start = useMotionValue(0);
  const end = useMotionValue(0);
  const opacity = useMotionValue(0);
  const size = useMotionValue(0);
  const optionsRef = React.useRef(options);
  const placeRef = React.useRef<((animated: boolean) => void) | null>(null);

  React.useLayoutEffect(() => {
    optionsRef.current = options;
  });

  React.useLayoutEffect(() => {
    const layer = layerRef.current;
    const container = containerRef?.current ?? layer?.parentElement ?? null;

    if (!container || !layer) {
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let shown = false;

    const place = (animated: boolean) => {
      const { axis, fadeIn, onPlace, selector, stretch } = optionsRef.current;
      const active = container.querySelector<HTMLElement>(selector);

      if (!active) {
        if (shown) {
          animate(opacity, 0, { duration: 0.12, ease: "easeOut" });
        }

        shown = false;
        onPlace?.(null, layer);
        return;
      }

      const parent = (layer.offsetParent as HTMLElement | null) ?? container;
      const offset = offsetWithin(active, parent);
      const nextStart = axis === "x" ? offset.left : offset.top;
      const nextEnd =
        nextStart + (axis === "x" ? active.offsetWidth : active.offsetHeight);

      if (!animated || !shown || reduce.matches) {
        start.jump(nextStart);
        end.jump(nextEnd);

        if (!shown && fadeIn && animated && !reduce.matches) {
          opacity.jump(0);
          animate(opacity, 1, { duration: 0.12, ease: "easeOut" });
        } else {
          opacity.jump(1);
        }
      } else {
        const forward = nextStart > start.get();
        const lead = stretch ? SPRING_THUMB_LEAD : SPRING_THUMB;
        const trail = stretch ? SPRING_THUMB_TRAIL : SPRING_THUMB;

        animate(start, nextStart, forward ? trail : lead);
        animate(end, nextEnd, forward ? lead : trail);
        animate(opacity, 1, { duration: 0.12, ease: "easeOut" });
      }

      shown = true;
      container.setAttribute("data-glide-ready", "");
      onPlace?.(active, layer);
    };

    // Width follows both edges. Subscribed explicitly (not derived) so a
    // jump() on first placement always reaches it.
    const syncSize = () => size.set(Math.max(0, end.get() - start.get()));
    const offStart = start.on("change", syncSize);
    const offEnd = end.on("change", syncSize);

    placeRef.current = place;
    place(false);
    syncSize();

    const mutations = new MutationObserver(() => place(true));
    // Fonts loading or the container resizing move the items: follow them
    // without animating.
    const resizes = new ResizeObserver(() => place(false));

    mutations.observe(container, {
      attributeFilter: optionsRef.current.attributes,
      attributes: true,
      childList: true,
      subtree: true,
    });
    resizes.observe(container);

    return () => {
      mutations.disconnect();
      resizes.disconnect();
      offStart();
      offEnd();
      placeRef.current = null;
    };
    // The motion values are stable; options are read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, layerRef]);

  React.useLayoutEffect(() => {
    placeRef.current?.(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { opacity, position: start, size };
}
