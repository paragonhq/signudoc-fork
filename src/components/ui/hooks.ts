"use client";

import {
  useCallback,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * Subscribes to a media query. `serverValue` is what the server (and the
 * first hydration pass) renders; the client value follows right after.
 */
export function useMediaQuery(query: string, serverValue = false) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);

      list.addEventListener("change", onChange);

      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Desktop trays and layouts start at 640px (Tailwind `sm`). */
export function useIsDesktop() {
  return useMediaQuery("(min-width: 640px)", true);
}

export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}

const subscribeNothing = () => () => {};

/** True on Apple platforms, for ⌘ versus Ctrl in keyboard hints. */
export function useIsApplePlatform() {
  return useSyncExternalStore(
    subscribeNothing,
    () =>
      /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => true,
  );
}

type Size = { height: number; width: number };

/**
 * Measures an element's border box with a ResizeObserver. Returns a ref
 * callback and the latest size (null until the first measurement).
 */
export function useElementSize<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<Size | null>(null);

  useLayoutEffect(() => {
    if (!node) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      const next = box
        ? { height: box.blockSize, width: box.inlineSize }
        : {
            height: entry.contentRect.height,
            width: entry.contentRect.width,
          };

      setSize((previous) =>
        previous &&
        previous.height === next.height &&
        previous.width === next.width
          ? previous
          : next,
      );
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [node]);

  return [setNode, size] as const;
}

/**
 * Controlled-or-uncontrolled state: pass `value` to control it, or
 * `defaultValue` to let the component own it. `onChange` fires either way.
 */
export function useControllableState<T>({
  defaultValue,
  onChange,
  value,
}: {
  defaultValue: T;
  onChange?: (value: T) => void;
  value?: T;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) {
        setInternal(next);
      }

      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [current, setValue] as const;
}

/** Points several refs (callback or object) at one node. */
export function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.RefObject<T | null>).current = node;
      }
    }
  };
}
