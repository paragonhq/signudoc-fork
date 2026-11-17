"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";

import { cn } from "@/lib/cn";
import { type FieldResizeHandle } from "@/lib/utils/pdf-coords";
import { useElementSize } from "@/components/ui/hooks";
import { IconButton } from "@/components/ui/icon-button";
import {
  beginDocumentPanGesture,
  clampDocumentZoomLevel,
  DEFAULT_DOCUMENT_ZOOM_LEVEL,
  DocumentZoomControls,
  DOCUMENT_ZOOM_STEP,
  endDocumentPanGesture,
  moveDocumentPanGesture,
  type DocumentPanGesture,
} from "@/components/shared/document-viewport";

import { InteractivePlacedField } from "../interactive-placed-field";
import { PdfPageCanvas } from "../pdf-page-canvas";
import {
  clamp,
  getFieldTool,
  resizeFieldFromHandle,
  type PrepareField,
  type PrepareFieldType,
  type PrepareShellSigner,
  type Rect,
} from "./model";
import {
  boundingRect,
  buildSnapTargets,
  nearestSnap,
  SNAP_DISTANCE_PX,
  toPoints,
  type SnapTargets,
} from "./snapping";

const DRAG_THRESHOLD_PX = 3;

type Gesture = {
  badge: "position" | "size";
  corner?: FieldResizeHandle;
  elements: HTMLElement[];
  hasMoved: boolean;
  ids: string[];
  /** The latest result, applied on release. */
  next: { dx: number; dy: number } | Rect;
  pointerId: number;
  primary: PrepareField;
  startBox: Rect;
  startX: number;
  startY: number;
  targets: SnapTargets;
  viewportHeight: number;
  viewportWidth: number;
  wasSelected: boolean;
};

export type DocumentStageProps = {
  activePage: number;
  armedSigner: PrepareShellSigner;
  armedTool: PrepareFieldType | null;
  /** Floating things at the foot of the desk (the dock, the coach mark). */
  bottomSlot?: ReactNode;
  /** Space kept clear under the page for the bottom slot, in px. */
  bottomInset: number;
  documentUrl: string | null;
  /**
   * Width the floating inspector takes from the right of the desk, in px
   * (0 where it is a tray). The page is sized as if it were always there,
   * so selecting a field never resizes the page; it only glides aside.
   */
  inspectorWidth?: number;
  isInspectorOpen?: boolean;
  /** The fields on this page. */
  fields: readonly PrepareField[];
  isDropTarget: boolean;
  onClearSelection: () => void;
  onCommitMove: (ids: string[], deltaX: number, deltaY: number) => void;
  onCommitResize: (fieldId: string, rect: Rect) => void;
  onInteractionChange: (isActive: boolean) => void;
  onPageChange: (page: number) => void;
  /** Place the armed tool at a point on the page, in page fractions. */
  onPlace: (pointX: number, pointY: number, keepArmed: boolean) => void;
  onSelect: (ids: string[]) => void;
  /** A field was pressed and let go without moving. */
  onTapField: (fieldId: string) => void;
  onToggleSelect: (fieldId: string) => void;
  onZoomChange: (zoom: number) => void;
  page: { heightPt: number; pageNumber: number; widthPt: number };
  pageCount: number;
  /** Show previous/next page beside the zoom (false where a bar has them). */
  pageControls?: boolean;
  primaryId: string | null;
  selectedIds: readonly string[];
  signers: readonly PrepareShellSigner[];
  /** A short, passing note centred at the top of the desk. */
  noticeSlot?: ReactNode;
  /** Something beside the zoom controls, top-left. */
  topSlot?: ReactNode;
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: number;
};

/**
 * The desk: the document page on a soft dotted desk, fitted to the space
 * between the floating controls, with a gentle page shadow. Fields sit on
 * the page; the stage runs their gestures.
 *
 * Gestures are rigid and cheap: one layout read when a drag starts, then
 * transforms written straight to the dragged elements (no React renders
 * per frame), snapping to the page's edges and centre and to other
 * fields, with guides drawn by the same direct writes. The result is
 * committed once, on release, as one undoable step.
 */
export function DocumentStage(props: DocumentStageProps) {
  const {
    activePage,
    armedSigner,
    armedTool,
    bottomInset,
    documentUrl,
    fields,
    inspectorWidth = 0,
    isInspectorOpen = false,
    page,
    pageCount,
    primaryId,
    selectedIds,
    signers,
    viewportRef,
    zoom,
  } = props;
  const [measureDesk, deskSize] = useElementSize<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const panRef = useRef<DocumentPanGesture | null>(null);
  const verticalGuideRef = useRef<HTMLDivElement | null>(null);
  const horizontalGuideRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const zoomAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Fit the page between the floating controls; zoom scales from there.
  const isCompact = (deskSize?.width ?? 1024) < 640;
  const padX = isCompact ? 12 : 40;
  const padTop = isCompact ? 60 : 64;
  const padBottom = bottomInset;
  const aspect = page.widthPt / page.heightPt;
  const deskWidth = deskSize?.width ?? 0;
  const availableWidth = Math.max(160, deskWidth - padX * 2 - inspectorWidth);
  const availableHeight = Math.max(
    200,
    (deskSize?.height ?? 0) - padTop - padBottom,
  );
  const fitWidth = Math.min(availableWidth, availableHeight * aspect);
  const pageWidth = deskSize ? Math.round(fitWidth * zoom) : 0;
  const pageHeight = deskSize ? Math.round((fitWidth * zoom) / aspect) : 0;
  const canPan = zoom > DEFAULT_DOCUMENT_ZOOM_LEVEL;
  // With the inspector open, slide the page left just enough to clear it.
  const pageShift =
    isInspectorOpen && inspectorWidth > 0 && zoom <= DEFAULT_DOCUMENT_ZOOM_LEVEL
      ? Math.max(
          0,
          (deskWidth + pageWidth) / 2 + 24 - (deskWidth - inspectorWidth),
        )
      : 0;

  function changeZoom(next: number) {
    const scroller = scrollRef.current;

    if (scroller) {
      zoomAnchorRef.current = {
        x:
          (scroller.scrollLeft + scroller.clientWidth / 2) /
          Math.max(1, scroller.scrollWidth),
        y:
          (scroller.scrollTop + scroller.clientHeight / 2) /
          Math.max(1, scroller.scrollHeight),
      };
    }

    props.onZoomChange(clampDocumentZoomLevel(next));
  }

  // Keep the middle of the view in the middle when the zoom changes.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const anchor = zoomAnchorRef.current;

    if (!scroller || !anchor) {
      return;
    }

    zoomAnchorRef.current = null;
    scroller.scrollLeft =
      anchor.x * scroller.scrollWidth - scroller.clientWidth / 2;
    scroller.scrollTop =
      anchor.y * scroller.scrollHeight - scroller.clientHeight / 2;
  }, [pageWidth]);

  const latestRef = useRef({ changeZoom, zoom });

  useEffect(() => {
    latestRef.current = { changeZoom, zoom };
  });

  // Pinch (or Ctrl + wheel) zooms the desk instead of the browser.
  useEffect(() => {
    const scroller = scrollRef.current;

    if (!scroller) {
      return;
    }

    let pending = 0;
    let frame: number | null = null;

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      pending += -event.deltaY * 0.01;

      if (frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null;
          const delta = pending;

          pending = 0;
          latestRef.current.changeZoom(latestRef.current.zoom * (1 + delta));
        });
      }
    }

    scroller.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      scroller.removeEventListener("wheel", handleWheel);

      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Guides and the measure badge: written directly, never rendered    */
  /* ---------------------------------------------------------------- */

  function showGuides(x: number | null, y: number | null) {
    const vertical = verticalGuideRef.current;
    const horizontal = horizontalGuideRef.current;

    if (vertical) {
      vertical.dataset.on = String(x !== null);

      if (x !== null) {
        vertical.style.left = `${x * 100}%`;
      }
    }

    if (horizontal) {
      horizontal.dataset.on = String(y !== null);

      if (y !== null) {
        horizontal.style.top = `${y * 100}%`;
      }
    }
  }

  function showBadge(rect: Rect | null, kind: "position" | "size") {
    const badge = badgeRef.current;

    if (!badge) {
      return;
    }

    if (!rect) {
      badge.dataset.on = "false";
      return;
    }

    badge.dataset.on = "true";
    badge.style.left = `${(rect.x + rect.width / 2) * 100}%`;
    badge.style.top = `${(rect.y + rect.height) * 100}%`;
    badge.textContent =
      kind === "size"
        ? `${toPoints(rect.width, page.widthPt)} × ${toPoints(rect.height, page.heightPt)}`
        : `${toPoints(rect.x, page.widthPt)}, ${toPoints(rect.y, page.heightPt)}`;
  }

  /* ---------------------------------------------------------------- */
  /* Field gestures                                                    */
  /* ---------------------------------------------------------------- */

  function startGesture(
    event: ReactPointerEvent<HTMLElement>,
    fieldId: string,
    corner?: FieldResizeHandle,
  ) {
    if (event.button !== 0 || armedTool) {
      return;
    }

    const viewport = viewportRef.current;
    const primary = fields.find((field) => field.id === fieldId);

    if (!viewport || !primary) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const wasSelected = selectedIds.includes(fieldId);
    let ids: string[];

    if (corner) {
      ids = [fieldId];
    } else if (event.shiftKey) {
      props.onToggleSelect(fieldId);

      if (wasSelected) {
        return;
      }

      ids = [...selectedIds.filter((id) => id !== fieldId), fieldId];
    } else if (wasSelected) {
      ids = [...selectedIds];
    } else {
      props.onSelect([fieldId]);
      ids = [fieldId];
    }

    // The one layout read of the gesture.
    const viewportRect = viewport.getBoundingClientRect();

    if (viewportRect.width === 0 || viewportRect.height === 0) {
      return;
    }

    const moving = fields.filter((field) => ids.includes(field.id));
    const elements = ids
      .map((id) =>
        viewport.querySelector<HTMLElement>(
          `[data-field-id="${CSS.escape(id)}"]`,
        ),
      )
      .filter((element): element is HTMLElement => element !== null);
    const target = event.currentTarget;

    target.setPointerCapture(event.pointerId);

    gestureRef.current = {
      badge: corner ? "size" : "position",
      corner,
      elements,
      hasMoved: false,
      ids,
      next: corner ? { ...primary } : { dx: 0, dy: 0 },
      pointerId: event.pointerId,
      primary,
      startBox: corner ? primary : boundingRect(moving),
      startX: event.clientX,
      startY: event.clientY,
      targets: buildSnapTargets(
        fields.filter((field) => !ids.includes(field.id)),
      ),
      viewportHeight: viewportRect.height,
      viewportWidth: viewportRect.width,
      wasSelected,
    };

    function handleMove(moveEvent: PointerEvent) {
      const gesture = gestureRef.current;

      if (!gesture || moveEvent.pointerId !== gesture.pointerId) {
        return;
      }

      const distanceX = moveEvent.clientX - gesture.startX;
      const distanceY = moveEvent.clientY - gesture.startY;

      if (
        !gesture.hasMoved &&
        Math.hypot(distanceX, distanceY) < DRAG_THRESHOLD_PX
      ) {
        return;
      }

      if (!gesture.hasMoved) {
        gesture.hasMoved = true;

        for (const element of gesture.elements) {
          element.dataset.dragging = "true";
        }

        props.onInteractionChange(true);
      }

      const { viewportHeight: height, viewportWidth: width } = gesture;
      const thresholdX = SNAP_DISTANCE_PX / width;
      const thresholdY = SNAP_DISTANCE_PX / height;
      const snaps = !moveEvent.altKey;
      const deltaX = distanceX / width;
      const deltaY = distanceY / height;

      if (gesture.corner) {
        const tool = getFieldTool(gesture.primary.type);
        const rect = resizeFieldFromHandle(
          gesture.primary,
          gesture.corner,
          deltaX,
          deltaY,
        );
        const movesLeft = gesture.corner.endsWith("left");
        const movesTop = gesture.corner.startsWith("top");
        let guideX: number | null = null;
        let guideY: number | null = null;

        if (snaps) {
          const edgeX = movesLeft ? rect.x : rect.x + rect.width;
          const hitX = nearestSnap([edgeX], gesture.targets.x, thresholdX);

          if (hitX) {
            const right = rect.x + rect.width;

            if (movesLeft && right - hitX.target >= tool.minWidth) {
              rect.x = hitX.target;
              rect.width = right - hitX.target;
              guideX = hitX.target;
            } else if (!movesLeft && hitX.target - rect.x >= tool.minWidth) {
              rect.width = hitX.target - rect.x;
              guideX = hitX.target;
            }
          }

          const edgeY = movesTop ? rect.y : rect.y + rect.height;
          const hitY = nearestSnap([edgeY], gesture.targets.y, thresholdY);

          if (hitY) {
            const bottom = rect.y + rect.height;

            if (movesTop && bottom - hitY.target >= tool.minHeight) {
              rect.y = hitY.target;
              rect.height = bottom - hitY.target;
              guideY = hitY.target;
            } else if (!movesTop && hitY.target - rect.y >= tool.minHeight) {
              rect.height = hitY.target - rect.y;
              guideY = hitY.target;
            }
          }
        }

        gesture.next = rect;

        const element = gesture.elements[0];

        if (element) {
          element.style.left = `${rect.x * 100}%`;
          element.style.top = `${rect.y * 100}%`;
          element.style.width = `${rect.width * 100}%`;
          element.style.height = `${rect.height * 100}%`;
        }

        showGuides(guideX, guideY);
        showBadge(rect, "size");
        return;
      }

      const box = gesture.startBox;
      let x = clamp(box.x + deltaX, 0, 1 - box.width);
      let y = clamp(box.y + deltaY, 0, 1 - box.height);
      let guideX: number | null = null;
      let guideY: number | null = null;

      if (snaps) {
        const hitX = nearestSnap(
          [x, x + box.width / 2, x + box.width],
          gesture.targets.x,
          thresholdX,
        );
        const hitY = nearestSnap(
          [y, y + box.height / 2, y + box.height],
          gesture.targets.y,
          thresholdY,
        );

        if (hitX) {
          x = clamp(x + hitX.offset, 0, 1 - box.width);
          guideX = hitX.target;
        }

        if (hitY) {
          y = clamp(y + hitY.offset, 0, 1 - box.height);
          guideY = hitY.target;
        }
      }

      const dx = x - box.x;
      const dy = y - box.y;
      const transform = `translate3d(${dx * width}px, ${dy * height}px, 0)`;

      gesture.next = { dx, dy };

      for (const element of gesture.elements) {
        element.style.transform = transform;
      }

      showGuides(guideX, guideY);
      showBadge({ ...box, x, y }, "position");
    }

    function finish(endEvent: PointerEvent, cancelled: boolean) {
      const gesture = gestureRef.current;

      if (!gesture || endEvent.pointerId !== gesture.pointerId) {
        return;
      }

      gestureRef.current = null;
      target.removeEventListener("pointermove", handleMove);
      target.removeEventListener("pointerup", handleUp);
      target.removeEventListener("pointercancel", handleCancel);
      window.removeEventListener("keydown", handleKey, true);

      if (target.hasPointerCapture(endEvent.pointerId)) {
        target.releasePointerCapture(endEvent.pointerId);
      }

      showGuides(null, null);
      showBadge(null, "position");

      if (!gesture.hasMoved) {
        if (!cancelled && !endEvent.shiftKey) {
          if (
            gesture.wasSelected &&
            selectedIds.length > 1 &&
            !gesture.corner
          ) {
            props.onSelect([gesture.primary.id]);
          }

          props.onTapField(gesture.primary.id);
        }

        return;
      }

      // Commit, then drop the temporary styles in the same frame, so the
      // field lands where it was let go with no flicker.
      if (!cancelled) {
        flushSync(() => {
          if ("dx" in gesture.next) {
            props.onCommitMove(gesture.ids, gesture.next.dx, gesture.next.dy);
          } else {
            props.onCommitResize(gesture.primary.id, gesture.next);
          }
        });
      }

      for (const element of gesture.elements) {
        element.style.transform = "";
        delete element.dataset.dragging;

        // A cancelled resize goes back to where it started; a committed
        // one was just rendered by React with the new size.
        if (gesture.corner && cancelled) {
          element.style.left = `${gesture.primary.x * 100}%`;
          element.style.top = `${gesture.primary.y * 100}%`;
          element.style.width = `${gesture.primary.width * 100}%`;
          element.style.height = `${gesture.primary.height * 100}%`;
        }
      }

      props.onInteractionChange(false);
    }

    function handleUp(upEvent: PointerEvent) {
      finish(upEvent, false);
    }

    function handleCancel(cancelEvent: PointerEvent) {
      finish(cancelEvent, true);
    }

    function handleKey(keyEvent: KeyboardEvent) {
      const gesture = gestureRef.current;

      if (keyEvent.key === "Escape" && gesture) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        finish(
          new PointerEvent("pointercancel", { pointerId: gesture.pointerId }),
          true,
        );
      }
    }

    target.addEventListener("pointermove", handleMove);
    target.addEventListener("pointerup", handleUp);
    target.addEventListener("pointercancel", handleCancel);
    window.addEventListener("keydown", handleKey, true);
  }

  function handleFieldPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    fieldId: string,
  ) {
    startGesture(event, fieldId);
  }

  function handleHandlePointerDown(
    event: ReactPointerEvent<HTMLElement>,
    fieldId: string,
    corner: FieldResizeHandle,
  ) {
    startGesture(event, fieldId, corner);
  }

  function handleKeyboardSelect(fieldId: string, extend: boolean) {
    if (extend) {
      props.onToggleSelect(fieldId);
    } else {
      props.onSelect([fieldId]);
      props.onTapField(fieldId);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Desk: deselect on empty space, pan when zoomed in                 */
  /* ---------------------------------------------------------------- */

  function handleDeskPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target;

    if (
      target instanceof HTMLElement &&
      (target.closest("[data-placed-field='true']") ||
        target.closest("[data-stage-chrome]"))
    ) {
      return;
    }

    if (!armedTool && !event.shiftKey && selectedIds.length > 0) {
      props.onClearSelection();
    }

    if (event.pointerType === "touch") {
      return;
    }

    panRef.current = beginDocumentPanGesture({
      canStart: !armedTool && canPan,
      event,
      scrollContainer: scrollRef.current,
      zoomLevel: zoom,
    });
  }

  /* ---------------------------------------------------------------- */
  /* Arm-then-click placement, with a preview that follows the pointer */
  /* ---------------------------------------------------------------- */

  const armedToolInfo = armedTool ? getFieldTool(armedTool) : null;

  function handlePlacementMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const preview = previewRef.current;

    if (!preview || !armedToolInfo || event.pointerType === "touch") {
      return;
    }

    const width = armedToolInfo.defaultWidth * pageWidth;
    const height = armedToolInfo.defaultHeight * pageHeight;
    const x = clamp(
      event.nativeEvent.offsetX - width / 2,
      0,
      pageWidth - width,
    );
    const y = clamp(
      event.nativeEvent.offsetY - height / 2,
      0,
      pageHeight - height,
    );

    preview.dataset.on = "true";
    preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function handlePlacementClick(event: ReactMouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    // A keyboard press has no pointer position: place in the middle.
    const isKeyboard = event.detail === 0;
    const pointX = isKeyboard ? 0.5 : (event.clientX - rect.left) / rect.width;
    const pointY = isKeyboard ? 0.5 : (event.clientY - rect.top) / rect.height;

    if (previewRef.current) {
      previewRef.current.dataset.on = "false";
    }

    props.onPlace(pointX, pointY, event.shiftKey || event.altKey);
  }

  return (
    <div
      className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
      ref={measureDesk}
    >
      <div
        className={cn(
          "absolute inset-0 overflow-auto overscroll-contain",
          canPan &&
            !armedTool &&
            (isPanning ? "cursor-grabbing" : "cursor-grab"),
        )}
        data-paper-grid
        onPointerCancel={(event) => {
          if (
            endDocumentPanGesture({
              event,
              gesture: panRef.current,
              onPanEnd: () => setIsPanning(false),
              scrollContainer: scrollRef.current,
            })
          ) {
            panRef.current = null;
          }
        }}
        onPointerDown={handleDeskPointerDown}
        onPointerMove={(event) =>
          moveDocumentPanGesture({
            event,
            gesture: panRef.current,
            onPanStart: () => setIsPanning(true),
            scrollContainer: scrollRef.current,
          })
        }
        onPointerUp={(event) => {
          if (
            endDocumentPanGesture({
              event,
              gesture: panRef.current,
              onPanEnd: () => setIsPanning(false),
              scrollContainer: scrollRef.current,
            })
          ) {
            panRef.current = null;
          }
        }}
        ref={scrollRef}
      >
        <div
          className="grid min-h-full w-max min-w-full place-items-center"
          style={{ padding: `${padTop}px ${padX}px ${padBottom}px` }}
        >
          <div
            className={cn(
              "relative rounded-[3px] bg-(--paper)",
              "shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.04),0_1px_2px_rgb(var(--fg-rgb)/0.05),0_16px_40px_-16px_rgb(var(--fg-rgb)/0.18)]",
              "transition-[box-shadow,translate] duration-(--dur-panel) ease-(--ease-out)",
              props.isDropTarget &&
                "shadow-[0_0_0_2px_rgb(var(--accent-rgb)/0.45),0_16px_40px_-16px_rgb(var(--fg-rgb)/0.18)]",
            )}
            style={{
              height: pageHeight,
              translate: pageShift ? `${String(-pageShift)}px 0` : undefined,
              width: pageWidth,
            }}
          >
            <div
              className="relative size-full overflow-hidden rounded-[3px]"
              data-field-viewport
              ref={viewportRef}
            >
              <PdfPageCanvas
                documentUrl={documentUrl}
                pageNumber={activePage}
              />

              {fields.map((field) => {
                const signer =
                  signers.find((entry) => entry.id === field.signerId) ??
                  signers[0];
                const tool = getFieldTool(field.type);

                return (
                  <InteractivePlacedField
                    displayLabel={field.label?.trim() || tool.placeholderLabel}
                    field={field}
                    isPrimary={primaryId === field.id}
                    isSelected={selectedIds.includes(field.id)}
                    key={field.id}
                    label={
                      field.type === "radio" && field.label
                        ? `Radio button: ${field.label}`
                        : field.label?.trim() && field.type !== "radio"
                          ? field.label.trim()
                          : tool.placeholderLabel
                    }
                    onHandlePointerDown={handleHandlePointerDown}
                    onKeyboardSelect={handleKeyboardSelect}
                    onPointerDown={handleFieldPointerDown}
                    signer={signer}
                  />
                );
              })}

              {/* Guides and the measure badge, written to directly. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20"
              >
                <div
                  className="absolute top-0 bottom-0 w-px -translate-x-1/2 scale-y-[0.96] bg-(--accent) opacity-0 transition-[opacity,scale] duration-(--dur-hover) ease-(--ease-spring) data-[on=true]:scale-y-100 data-[on=true]:opacity-100"
                  data-on="false"
                  ref={verticalGuideRef}
                />
                <div
                  className="absolute right-0 left-0 h-px -translate-y-1/2 scale-x-[0.96] bg-(--accent) opacity-0 transition-[opacity,scale] duration-(--dur-hover) ease-(--ease-spring) data-[on=true]:scale-x-100 data-[on=true]:opacity-100"
                  data-on="false"
                  ref={horizontalGuideRef}
                />
                <div
                  className="absolute mt-2 -translate-x-1/2 rounded-full bg-(--paper) px-2 py-0.5 text-[0.6875rem] leading-4 font-medium whitespace-nowrap text-(--fg) tabular-nums opacity-0 shadow-(--shadow-pop) data-[on=true]:opacity-100"
                  data-on="false"
                  ref={badgeRef}
                />
              </div>

              {armedToolInfo ? (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-0 z-11 rounded-[0.3125rem] border border-dashed opacity-0 data-[on=true]:opacity-80"
                    data-on="false"
                    ref={previewRef}
                    style={{
                      backgroundColor: armedSigner.tint,
                      borderColor: armedSigner.color,
                      height: armedToolInfo.defaultHeight * pageHeight,
                      width: armedToolInfo.defaultWidth * pageWidth,
                    }}
                  />
                  <button
                    aria-label={`Place ${armedToolInfo.label} on page ${activePage}`}
                    className="absolute inset-0 z-10 cursor-crosshair bg-[rgb(var(--accent-rgb)/0.03)] outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--accent)]"
                    onClick={handlePlacementClick}
                    onPointerLeave={() => {
                      if (previewRef.current) {
                        previewRef.current.dataset.on = "false";
                      }
                    }}
                    onPointerMove={handlePlacementMove}
                    type="button"
                  >
                    <span className="sr-only">
                      Place {armedToolInfo.label} on the document page
                    </span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Page and zoom, top-left: the one side the inspector never covers. */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-start gap-3">
        <div
          className="pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-full bg-(--paper) p-1 shadow-(--shadow-pop)"
          data-stage-chrome
        >
          {pageCount > 1 && props.pageControls !== false ? (
            <>
              <IconButton
                aria-label="Previous page"
                className="rounded-full"
                disabled={activePage <= 1}
                onClick={() => props.onPageChange(activePage - 1)}
                shortcut="⇞"
                size="sm"
              >
                <ChevronLeftIcon />
              </IconButton>
              <span className="min-w-[3.25rem] text-center text-[0.8125rem] font-medium text-(--fg) tabular-nums">
                <span className="sr-only">Page </span>
                {activePage}
                <span className="text-(--secondary)"> of {pageCount}</span>
              </span>
              <IconButton
                aria-label="Next page"
                className="rounded-full"
                disabled={activePage >= pageCount}
                onClick={() => props.onPageChange(activePage + 1)}
                shortcut="⇟"
                size="sm"
              >
                <ChevronRightIcon />
              </IconButton>
              <span
                aria-hidden="true"
                className="mx-0.5 h-4 w-px bg-(--divider)"
              />
            </>
          ) : null}
          <DocumentZoomControls
            className="bg-transparent p-0 shadow-none"
            onDecrease={() => changeZoom(zoom - DOCUMENT_ZOOM_STEP)}
            onIncrease={() => changeZoom(zoom + DOCUMENT_ZOOM_STEP)}
            onReset={() => changeZoom(DEFAULT_DOCUMENT_ZOOM_LEVEL)}
            zoomLevel={zoom}
          />
        </div>
        {props.topSlot ? (
          <div className="pointer-events-auto min-w-0">{props.topSlot}</div>
        ) : null}
      </div>

      {props.noticeSlot ? (
        <div className="pointer-events-none absolute inset-x-3 top-4 z-20 flex justify-center">
          {props.noticeSlot}
        </div>
      ) : null}

      {props.bottomSlot ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-4 z-20 flex flex-col-reverse items-center gap-2">
          {props.bottomSlot}
        </div>
      ) : null}
    </div>
  );
}
