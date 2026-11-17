"use client";

import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { type PointerEvent as ReactPointerEvent } from "react";

import { cn } from "@/lib/cn";

export type DocumentPanGesture = {
  hasMoved: boolean;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startScrollTop: number;
};

export const DEFAULT_DOCUMENT_ZOOM_LEVEL = 1;
export const DOCUMENT_ZOOM_STEP = 0.1;

const DOCUMENT_PAN_THRESHOLD_PX = 6;
const MAX_DOCUMENT_ZOOM_LEVEL = 2;
const MIN_DOCUMENT_ZOOM_LEVEL = 0.6;

function roundNormalized(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function clampDocumentZoomLevel(value: number) {
  return Math.min(
    MAX_DOCUMENT_ZOOM_LEVEL,
    Math.max(MIN_DOCUMENT_ZOOM_LEVEL, roundNormalized(value)),
  );
}

export function beginDocumentPanGesture(input: {
  canStart?: boolean;
  event: ReactPointerEvent<HTMLDivElement>;
  scrollContainer: HTMLDivElement | null;
  shouldIgnoreTarget?: (target: HTMLElement) => boolean;
  zoomLevel: number;
}): DocumentPanGesture | null {
  if (
    input.canStart === false ||
    input.zoomLevel <= DEFAULT_DOCUMENT_ZOOM_LEVEL ||
    input.event.button !== 0
  ) {
    return null;
  }

  const target = input.event.target;
  const scrollContainer = input.scrollContainer;

  if (!(scrollContainer instanceof HTMLDivElement)) {
    return null;
  }

  if (
    !(target instanceof HTMLElement) ||
    input.shouldIgnoreTarget?.(target) === true
  ) {
    return null;
  }

  const canPanHorizontally =
    scrollContainer.scrollWidth > scrollContainer.clientWidth;
  const canPanVertically =
    scrollContainer.scrollHeight > scrollContainer.clientHeight;

  if (!canPanHorizontally && !canPanVertically) {
    return null;
  }

  if (typeof scrollContainer.setPointerCapture === "function") {
    scrollContainer.setPointerCapture(input.event.pointerId);
  }

  return {
    hasMoved: false,
    pointerId: input.event.pointerId,
    startClientX: input.event.clientX,
    startClientY: input.event.clientY,
    startScrollLeft: scrollContainer.scrollLeft,
    startScrollTop: scrollContainer.scrollTop,
  };
}

export function moveDocumentPanGesture(input: {
  event: ReactPointerEvent<HTMLDivElement>;
  gesture: DocumentPanGesture | null;
  onPanStart: () => void;
  scrollContainer: HTMLDivElement | null;
}) {
  const scrollContainer = input.scrollContainer;
  const gesture = input.gesture;

  if (
    !(scrollContainer instanceof HTMLDivElement) ||
    !gesture ||
    input.event.pointerId !== gesture.pointerId
  ) {
    return;
  }

  const deltaX = input.event.clientX - gesture.startClientX;
  const deltaY = input.event.clientY - gesture.startClientY;

  if (
    !gesture.hasMoved &&
    Math.hypot(deltaX, deltaY) < DOCUMENT_PAN_THRESHOLD_PX
  ) {
    return;
  }

  input.event.preventDefault();

  if (!gesture.hasMoved) {
    gesture.hasMoved = true;
    input.onPanStart();
  }

  scrollContainer.scrollLeft = gesture.startScrollLeft - deltaX;
  scrollContainer.scrollTop = gesture.startScrollTop - deltaY;
}

export function endDocumentPanGesture(input: {
  event: ReactPointerEvent<HTMLDivElement>;
  gesture: DocumentPanGesture | null;
  onPanEnd: () => void;
  scrollContainer: HTMLDivElement | null;
}): boolean {
  const scrollContainer = input.scrollContainer;
  const gesture = input.gesture;

  if (
    !(scrollContainer instanceof HTMLDivElement) ||
    !gesture ||
    input.event.pointerId !== gesture.pointerId
  ) {
    return false;
  }

  if (typeof scrollContainer.releasePointerCapture === "function") {
    scrollContainer.releasePointerCapture(input.event.pointerId);
  }

  if (gesture.hasMoved) {
    input.onPanEnd();
  }

  return true;
}

export const MIN_DOCUMENT_ZOOM = MIN_DOCUMENT_ZOOM_LEVEL;
export const MAX_DOCUMENT_ZOOM = MAX_DOCUMENT_ZOOM_LEVEL;

const zoomButtonClassName =
  "inline-flex size-8 items-center justify-center rounded-full text-(--secondary) outline-none transition-[background-color,color,scale] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) hover:text-(--fg) active:scale-[0.94] active:duration-(--dur-press) focus-visible:shadow-(--focus-ring) disabled:pointer-events-none disabled:text-(--placeholder) pointer-coarse:size-10";

/**
 * Zoom out, the zoom level, zoom in, and Fit: a small white pill. The
 * builder and the signing view both use it.
 */
export function DocumentZoomControls({
  className,
  onDecrease,
  onIncrease,
  onReset,
  zoomLevel,
}: {
  className?: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onReset: () => void;
  zoomLevel: number;
}) {
  const zoomPercentage = Math.round(zoomLevel * 100);

  return (
    <div
      aria-label="Zoom"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-(--paper) p-1 shadow-(--ring-soft)",
        className,
      )}
      role="group"
    >
      <button
        aria-label="Zoom out"
        className={zoomButtonClassName}
        disabled={zoomLevel <= MIN_DOCUMENT_ZOOM_LEVEL}
        onClick={onDecrease}
        type="button"
      >
        <MinusIcon aria-hidden="true" className="size-3.5" />
      </button>
      <span
        aria-live="polite"
        className="min-w-[3rem] text-center text-[0.8125rem] font-medium text-(--fg) tabular-nums"
      >
        {zoomPercentage}%
      </span>
      <button
        aria-label="Zoom in"
        className={zoomButtonClassName}
        disabled={zoomLevel >= MAX_DOCUMENT_ZOOM_LEVEL}
        onClick={onIncrease}
        type="button"
      >
        <PlusIcon aria-hidden="true" className="size-3.5" />
      </button>
      <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-(--divider)" />
      <button
        className={cn(
          zoomButtonClassName,
          "w-auto px-2.5 text-[0.8125rem] font-medium",
        )}
        onClick={onReset}
        type="button"
      >
        Fit
      </button>
    </div>
  );
}
