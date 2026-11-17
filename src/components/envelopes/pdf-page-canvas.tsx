"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import {
  loadPdfJsModule,
  PDF_JS_STANDARD_FONT_DATA_URL,
} from "@/lib/pdfjs-client";
import { Skeleton } from "@/components/ui/skeleton";

type PdfJsModule = Awaited<ReturnType<typeof loadPdfJsModule>>;
type PdfDocumentProxy = Awaited<
  ReturnType<PdfJsModule["getDocument"]>["promise"]
>;
type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;
type PdfRenderTask = ReturnType<PdfPageProxy["render"]>;
export type PdfPageRenderState = "error" | "loading" | "ready";

type PdfPageCanvasProps = {
  documentUrl: string | null;
  onRenderStateChange?: (state: PdfPageRenderState) => void;
  pageNumber: number;
};

/**
 * One PDF page, rendered to fill its `[data-field-viewport]` parent. Used
 * by the builder and the signing view.
 *
 * Re-renders (a zoom step, a resize) draw into an offscreen canvas first
 * and swap it in when done, so the page never blanks between sizes. The
 * first render shows a paper skeleton; a page that cannot be drawn says so
 * quietly in place.
 */
export function PdfPageCanvas({
  documentUrl,
  onRenderStateChange,
  pageNumber,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [documentProxy, setDocumentProxy] = useState<PdfDocumentProxy | null>(
    null,
  );
  const [viewportSize, setViewportSize] = useState({ height: 0, width: 0 });
  const [renderState, setRenderState] = useState<PdfPageRenderState>("loading");
  // Whether the visible canvas holds this page yet. Re-renders at a new
  // size keep the old pixels up instead of falling back to the skeleton.
  const [paintedPage, setPaintedPage] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const viewportCandidate = canvas?.closest("[data-field-viewport]");

    if (!(viewportCandidate instanceof HTMLElement)) {
      return;
    }

    const viewportElement: HTMLElement = viewportCandidate;

    function updateViewportSize() {
      const nextWidth = Math.round(viewportElement.clientWidth);
      const nextHeight = Math.round(viewportElement.clientHeight);

      if (nextWidth === 0 || nextHeight === 0) {
        return;
      }

      setViewportSize((currentSize) =>
        currentSize.width === nextWidth && currentSize.height === nextHeight
          ? currentSize
          : { height: nextHeight, width: nextWidth },
      );
    }

    updateViewportSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewportSize);

      return () => window.removeEventListener("resize", updateViewportSize);
    }

    const resizeObserver = new ResizeObserver(updateViewportSize);

    resizeObserver.observe(viewportElement);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    let isActive = true;
    let activeDocument: PdfDocumentProxy | null = null;
    let loadingTask: ReturnType<PdfJsModule["getDocument"]> | null = null;

    async function loadDocument() {
      setRenderState("loading");
      setDocumentProxy(null);
      setPaintedPage(null);

      if (!documentUrl) {
        return;
      }

      try {
        const pdfjs = await loadPdfJsModule();
        loadingTask = pdfjs.getDocument({
          standardFontDataUrl: PDF_JS_STANDARD_FONT_DATA_URL,
          url: documentUrl,
        });
        const nextDocument = await loadingTask.promise;

        if (!isActive) {
          await nextDocument.destroy();
          return;
        }

        activeDocument = nextDocument;
        setDocumentProxy(nextDocument);
      } catch (error) {
        if (isActive) {
          console.error("Failed to load the PDF preview document.", error);
          setDocumentProxy(null);
          setRenderState("error");
        }
      }
    }

    void loadDocument();

    return () => {
      isActive = false;
      void loadingTask?.destroy();
      void activeDocument?.destroy();
    };
  }, [documentUrl]);

  useEffect(() => {
    if (
      !documentProxy ||
      !canvasRef.current ||
      viewportSize.width === 0 ||
      viewportSize.height === 0
    ) {
      return;
    }

    const pdf = documentProxy;
    let isActive = true;
    let activePage: PdfPageProxy | null = null;
    let renderTask: PdfRenderTask | null = null;

    async function renderPage(showSkeleton: boolean) {
      if (showSkeleton) {
        setRenderState("loading");
      }

      try {
        const page = await pdf.getPage(pageNumber);

        if (!isActive) {
          page.cleanup();
          return;
        }

        activePage = page;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          viewportSize.width / baseViewport.width,
          viewportSize.height / baseViewport.height,
        );
        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        const visible = canvasRef.current;

        if (!visible) {
          return;
        }

        // Draw offscreen, then swap: the page on screen stays put until
        // the new pixels are ready.
        const buffer = document.createElement("canvas");
        const bufferContext = buffer.getContext("2d");

        if (!bufferContext) {
          throw new Error("Unable to render PDF canvas context.");
        }

        buffer.width = Math.floor(viewport.width * outputScale);
        buffer.height = Math.floor(viewport.height * outputScale);

        renderTask = page.render({
          canvas: buffer,
          canvasContext: bufferContext,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
          viewport,
        });

        await renderTask.promise;

        if (!isActive) {
          return;
        }

        const context = visible.getContext("2d");

        if (!context) {
          throw new Error("Unable to render PDF canvas context.");
        }

        visible.width = buffer.width;
        visible.height = buffer.height;
        visible.style.width = `${viewport.width}px`;
        visible.style.height = `${viewport.height}px`;
        context.drawImage(buffer, 0, 0);
        setPaintedPage(pageNumber);
        setRenderState("ready");
      } catch (error) {
        if (
          isActive &&
          (!error ||
            typeof error !== "object" ||
            !("name" in error) ||
            error.name !== "RenderingCancelledException")
        ) {
          console.error("Failed to render the PDF preview page.", error);
          setRenderState("error");
        }
      }
    }

    void renderPage(paintedPage !== pageNumber);

    return () => {
      isActive = false;
      renderTask?.cancel();
      activePage?.cleanup();
    };
    // paintedPage is read to decide whether to show the skeleton, not as a
    // reason to render again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentProxy, pageNumber, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    onRenderStateChange?.(renderState);
  }, [onRenderStateChange, renderState]);

  const showsPage = paintedPage === pageNumber;

  return (
    <div
      aria-busy={renderState === "loading" || undefined}
      aria-label={`Rendered PDF page ${pageNumber}`}
      className="absolute inset-0 flex items-center justify-center bg-(--paper-raised)"
      role="img"
    >
      <canvas
        className={cn(
          "max-h-full max-w-full transition-opacity duration-(--dur-open) ease-(--ease-out)",
          showsPage ? "opacity-100" : "opacity-0",
        )}
        ref={canvasRef}
      />
      {renderState === "error" ? (
        <div className="absolute inset-0 z-1 flex flex-col items-start justify-end gap-1.5 bg-(--paper-raised) p-[8%]">
          <span className="meta text-(--danger)">Page {pageNumber}</span>
          <p className="text-sm font-medium text-(--fg)">
            This page couldn&apos;t be shown.
          </p>
          <p className="max-w-[34ch] text-[0.8125rem] leading-5 text-(--secondary)">
            Reload the page, or open the draft again in a moment.
          </p>
        </div>
      ) : !showsPage ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-1 flex flex-col gap-[3%] p-[9%]"
        >
          <Skeleton className="h-[2.2%] w-[46%] rounded-xs" delay={150} />
          <Skeleton
            className="mt-[3%] h-[1.4%] w-full rounded-xs"
            delay={150}
          />
          <Skeleton className="h-[1.4%] w-[94%] rounded-xs" delay={150} />
          <Skeleton className="h-[1.4%] w-[88%] rounded-xs" delay={150} />
          <Skeleton className="h-[1.4%] w-[62%] rounded-xs" delay={150} />
          <Skeleton
            className="mt-[4%] h-[1.4%] w-full rounded-xs"
            delay={150}
          />
          <Skeleton className="h-[1.4%] w-[91%] rounded-xs" delay={150} />
          <Skeleton className="h-[1.4%] w-[70%] rounded-xs" delay={150} />
          <span className="meta mt-auto">Rendering page {pageNumber}</span>
        </div>
      ) : null}
    </div>
  );
}
