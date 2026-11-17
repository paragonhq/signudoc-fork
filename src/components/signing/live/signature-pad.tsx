"use client";

import { EraserIcon, Undo2Icon } from "@/components/ui/icons";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

type Point = { pressure: number; x: number; y: number };

/** Stroke width in CSS pixels; a pen's pressure moves it a little. */
const BASE_WIDTH = 2.4;

function readInkColor() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--brand-carbon")
    .trim();

  return value || "black";
}

/**
 * The yellow sign line along the bottom of the signature face: one calm
 * rounded rule. Decorative; lay it inside a positioned box.
 */
export function SignatureLine() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-7 bottom-[24%] h-[3px] rounded-full bg-(--sign-here) shadow-[0_1px_0_rgb(var(--fg-rgb)/0.12)] sm:inset-x-9"
    />
  );
}

/**
 * The draw pad: a soft well with the yellow sign line, a canvas over it.
 * Strokes are kept as points (relative to the pad, so a resize redraws
 * them in place) and drawn as smooth curves through their midpoints. Undo
 * takes back the last stroke; Clear starts again. The exported PNG holds
 * only the ink, never the sign line.
 */
export function SignaturePad({
  className,
  initialDataUrl,
  isInitials,
  onChange,
}: {
  className?: string;
  /** A drawing applied earlier, shown as the starting point. */
  initialDataUrl?: string | null;
  isInitials: boolean;
  onChange: (value: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Point[][]>([]);
  const activeStrokeRef = useRef<Point[] | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const inkRef = useRef("black");
  // The starting drawing is read once; later exports must not feed back in.
  const [startingImage] = useState(initialDataUrl ?? null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [hasBase, setHasBase] = useState(Boolean(startingImage));
  const isEmpty = strokeCount === 0 && !hasBase;

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return null;
    }

    return { canvas, context };
  }, []);

  const drawStroke = useCallback(
    (
      context: CanvasRenderingContext2D,
      stroke: Point[],
      from = 0,
      finish = false,
    ) => {
      const canvas = context.canvas;
      const ratio = canvas.width / Math.max(canvas.clientWidth, 1);
      const width = canvas.width / ratio;
      const height = canvas.height / ratio;
      const at = (point: Point) => ({
        x: point.x * width,
        y: point.y * height,
      });

      context.strokeStyle = inkRef.current;
      context.fillStyle = inkRef.current;
      context.lineCap = "round";
      context.lineJoin = "round";

      if (stroke.length === 1) {
        const dot = at(stroke[0]!);

        context.beginPath();
        context.arc(dot.x, dot.y, BASE_WIDTH * 0.6, 0, Math.PI * 2);
        context.fill();

        return;
      }

      // Quadratic curves through the midpoints: each point is the control
      // for the curve between the midpoints on either side of it.
      for (let index = Math.max(1, from); index < stroke.length; index += 1) {
        const previous = at(stroke[index - 1]!);
        const current = at(stroke[index]!);
        const beforePrevious = index > 1 ? at(stroke[index - 2]!) : previous;
        const start = {
          x: (beforePrevious.x + previous.x) / 2,
          y: (beforePrevious.y + previous.y) / 2,
        };
        const end = {
          x: (previous.x + current.x) / 2,
          y: (previous.y + current.y) / 2,
        };
        const pressure = stroke[index]!.pressure;

        context.lineWidth = BASE_WIDTH * (0.75 + pressure * 0.5);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.quadraticCurveTo(previous.x, previous.y, end.x, end.y);
        context.stroke();
      }

      // The curves stop at the last midpoint; a finished stroke reaches its
      // last point.
      if (finish) {
        const previous = at(stroke[stroke.length - 2]!);
        const last = at(stroke[stroke.length - 1]!);

        context.beginPath();
        context.moveTo((previous.x + last.x) / 2, (previous.y + last.y) / 2);
        context.lineTo(last.x, last.y);
        context.stroke();
      }
    },
    [],
  );

  const redraw = useCallback(() => {
    const target = getContext();

    if (!target) {
      return;
    }

    const { canvas, context } = target;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (baseImageRef.current?.complete) {
      context.drawImage(
        baseImageRef.current,
        0,
        0,
        canvas.clientWidth,
        canvas.clientHeight,
      );
    }

    for (const stroke of strokesRef.current) {
      drawStroke(context, stroke, 0, true);
    }
  }, [drawStroke, getContext]);

  const exportImage = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    if (strokesRef.current.length === 0 && !baseImageRef.current) {
      onChange(null);
      return;
    }

    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  // Size the canvas to its box at the device's pixel ratio, and again when
  // the box changes.
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    inkRef.current = readInkColor();

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = Math.max(canvas.offsetWidth, 1);
      const height = Math.max(canvas.offsetHeight, 1);

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
      redraw();
    };

    resize();

    const observer = new ResizeObserver(resize);

    observer.observe(canvas);

    return () => observer.disconnect();
  }, [redraw]);

  // An earlier drawing is the starting point.
  useEffect(() => {
    if (!startingImage) {
      return;
    }

    const image = new window.Image();

    image.onload = () => {
      baseImageRef.current = image;
      redraw();
    };
    image.src = startingImage;
  }, [redraw, startingImage]);

  function toPoint(
    event: ReactPointerEvent<HTMLCanvasElement> | PointerEvent,
  ): Point | null {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      // A mouse reports 0 or 0.5; only a pen's pressure means anything.
      pressure: event.pointerType === "pen" ? event.pressure : 0.5,
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = toPoint(event);
    const target = getContext();

    if (!point || !target || event.button > 0) {
      return;
    }

    event.preventDefault();
    target.canvas.setPointerCapture(event.pointerId);
    activeStrokeRef.current = [point];
    drawStroke(target.context, [point]);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokeRef.current;
    const target = getContext();

    if (!stroke || !target) {
      return;
    }

    event.preventDefault();

    const from = stroke.length;
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [
      event.nativeEvent,
    ];

    for (const sample of samples) {
      const point = toPoint(sample);

      if (point) {
        stroke.push(point);
      }
    }

    drawStroke(target.context, stroke, from);
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokeRef.current;
    const canvas = canvasRef.current;

    if (!stroke || !canvas) {
      return;
    }

    event.preventDefault();

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    const target = getContext();

    if (target && stroke.length > 1) {
      drawStroke(target.context, stroke, stroke.length, true);
    }

    activeStrokeRef.current = null;
    strokesRef.current = [...strokesRef.current, stroke];
    setStrokeCount(strokesRef.current.length);
    exportImage();
  }

  function undo() {
    if (strokesRef.current.length === 0) {
      return;
    }

    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redraw();
    exportImage();
  }

  function clear() {
    strokesRef.current = [];
    baseImageRef.current = null;
    setStrokeCount(0);
    setHasBase(false);
    redraw();
    onChange(null);
  }

  return (
    <div
      className={cn(
        "relative h-44 overflow-hidden rounded-(--radius-well) bg-(--surface) sm:h-48",
        className,
      )}
    >
      <SignatureLine />
      {isEmpty ? (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[34%] text-center text-[0.9375rem] text-(--secondary)"
        >
          {isInitials ? "Draw your initials" : "Draw your signature"}
        </p>
      ) : null}
      <canvas
        aria-label={
          isInitials ? "Draw initials canvas" : "Draw signature canvas"
        }
        className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        data-vaul-no-drag
        onLostPointerCapture={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        ref={canvasRef}
        role="img"
      />
      <div className="absolute top-2 right-2 flex gap-1">
        <IconButton
          aria-label="Undo last stroke"
          disabled={strokeCount === 0}
          onClick={undo}
          size="sm"
          variant="ghost"
        >
          <Undo2Icon />
        </IconButton>
        <IconButton
          aria-label="Clear"
          disabled={isEmpty}
          onClick={clear}
          size="sm"
          variant="ghost"
        >
          <EraserIcon />
        </IconButton>
      </div>
    </div>
  );
}
