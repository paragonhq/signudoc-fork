"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { getSignerPalette } from "@/components/envelopes/signer-palette";
import {
  loadPdfJsModule,
  PDF_JS_STANDARD_FONT_DATA_URL,
} from "@/lib/pdfjs-client";
import { renderPdfThumbnail } from "@/lib/pdf-thumbnail";
import { createSharedSerialQueue } from "@/lib/shared-serial-queue";
import type { TemplateFieldPreview } from "@/lib/templates";

/*
 * A template's pages, drawn in the browser from its PDF (the server never
 * renders PDFs). Three pieces:
 *
 *   TemplateThumb      the first page as a stored picture, for the library.
 *                      A template with no picture yet has it drawn once from
 *                      its PDF (one at a time) and saved for next time.
 *   useTemplatePdf     loads the PDF once for a page that shows several
 *                      pages of it (the template page, "use template").
 *   TemplatePage       one page at the width of its box, with the template's
 *                      fields laid over it in each role's colour.
 */

/** What a field is called on the preview, where it has room for a word. */
const FIELD_LABELS: Record<string, string> = {
  date: "Date",
  dropdown: "Dropdown",
  initials: "Initials",
  name: "Name",
  number: "Number",
  signature: "Signature",
  text: "Text",
};

export function templateDocumentUrl(templateId: string) {
  return `/api/templates/${encodeURIComponent(templateId)}/document`;
}

export function templateThumbnailUrl(templateId: string) {
  return `/api/templates/${encodeURIComponent(templateId)}/thumbnail`;
}

const backfillQueue = createSharedSerialQueue(async (templateId: string) => {
  const thumbnail = await renderPdfThumbnail({
    url: templateDocumentUrl(templateId),
  });

  void fetch(templateThumbnailUrl(templateId), {
    body: thumbnail,
    headers: { "content-type": "image/jpeg" },
    method: "PUT",
  }).catch(() => undefined);

  return thumbnail;
});

type ThumbState = "drawn" | "loading" | "missing" | "stored";

/** A template's first page as a picture, sized by its parent's height. */
export function TemplateThumb({
  className,
  name,
  templateId,
}: {
  className?: string;
  name: string;
  templateId: string;
}) {
  const [state, setState] = useState<ThumbState>("loading");
  const [drawnUrl, setDrawnUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      // A card that is gone gives up its place in the drawing queue.
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, []);

  useEffect(
    () => () => {
      if (drawnUrl) {
        URL.revokeObjectURL(drawnUrl);
      }
    },
    [drawnUrl],
  );

  function drawFromPdf() {
    if (releaseRef.current || drawnUrl) {
      return;
    }

    const request = backfillQueue.request(templateId);

    releaseRef.current = request.release;
    request.result
      .then((blob) => {
        if (releaseRef.current !== request.release) {
          return;
        }

        if (mountedRef.current) {
          setDrawnUrl(URL.createObjectURL(blob));
          setState("drawn");
        }
      })
      .catch(() => {
        if (mountedRef.current && releaseRef.current === request.release) {
          setState("missing");
        }
      });
  }

  // An image that settled before React attached its handlers.
  useEffect(() => {
    const image = imageRef.current;

    if (!image?.complete) {
      return;
    }

    if (image.naturalWidth > 0) {
      setState("stored");
    } else {
      drawFromPdf();
    }
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageClassName = cn(
    "block h-full w-auto max-w-full rounded-[0.375rem] bg-(--paper) object-contain shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.06),0_1px_2px_rgb(var(--fg-rgb)/0.06),0_8px_24px_-12px_rgb(var(--fg-rgb)/0.18)]",
    className,
  );

  if (state === "missing") {
    return <BlankPage className={className} />;
  }

  if (state === "drawn" && drawnUrl) {
    return (
      // A blob: URL drawn here; next/image has nothing to optimise.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={`First page of ${name}`}
        className={pageClassName}
        decoding="async"
        src={drawnUrl}
      />
    );
  }

  return (
    <span className="relative flex h-full max-w-full items-center justify-center">
      {state === "loading" ? (
        <BlankPage className={cn("animate-pulse", className)} />
      ) : null}
      {/* Private, behind the session cookie: next/image would fetch it
          without that cookie. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`First page of ${name}`}
        className={
          state === "loading"
            ? "pointer-events-none absolute top-1/2 left-1/2 size-px opacity-0"
            : pageClassName
        }
        decoding="async"
        loading="lazy"
        onError={drawFromPdf}
        onLoad={() => setState("stored")}
        ref={imageRef}
        src={templateThumbnailUrl(templateId)}
      />
    </span>
  );
}

/** A plain white page, for while a picture loads or when there is none. */
export function BlankPage({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex aspect-[17/22] h-full flex-col gap-[6%] rounded-[0.375rem] bg-(--paper) px-[12%] py-[13%] shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.06),0_1px_2px_rgb(var(--fg-rgb)/0.06)]",
        className,
      )}
    >
      <span className="h-[3.5%] w-1/2 rounded-full bg-(--surface-strong)" />
      <span className="h-[2.5%] w-full rounded-full bg-(--surface)" />
      <span className="h-[2.5%] w-11/12 rounded-full bg-(--surface)" />
      <span className="h-[2.5%] w-4/5 rounded-full bg-(--surface)" />
      <span className="h-[2.5%] w-full rounded-full bg-(--surface)" />
    </span>
  );
}

/* The PDF, loaded once ------------------------------------------------- */

type PdfJsModule = Awaited<ReturnType<typeof loadPdfJsModule>>;
type PdfDocumentProxy = Awaited<
  ReturnType<PdfJsModule["getDocument"]>["promise"]
>;

export type TemplatePdf =
  | { state: "loading" }
  | { state: "error" }
  | { document: PdfDocumentProxy; state: "ready" };

export function useTemplatePdf(url: string | null): TemplatePdf {
  const [loaded, setLoaded] = useState<{
    pdf: TemplatePdf;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!url) {
      return;
    }

    let active = true;
    let document: PdfDocumentProxy | null = null;
    let task: ReturnType<PdfJsModule["getDocument"]> | null = null;

    loadPdfJsModule()
      .then((pdfjs) => {
        task = pdfjs.getDocument({
          standardFontDataUrl: PDF_JS_STANDARD_FONT_DATA_URL,
          url,
        });

        return task.promise;
      })
      .then((next) => {
        document = next;

        if (active) {
          setLoaded({ pdf: { document: next, state: "ready" }, url });
        } else {
          void next.destroy();
        }
      })
      .catch(() => {
        if (active) {
          setLoaded({ pdf: { state: "error" }, url });
        }
      });

    return () => {
      active = false;
      void task?.destroy();
      void document?.destroy();
    };
  }, [url]);

  return loaded && loaded.url === url ? loaded.pdf : { state: "loading" };
}

/**
 * One page at the full width of its box, with the fields over it. The box
 * takes the page's shape as soon as it is known (US Letter until then), so
 * nothing jumps when the page appears.
 */
export function TemplatePage({
  activeRole = null,
  className,
  fields = [],
  pageNumber,
  pdf,
  showFields = true,
  showLabels = true,
  children,
}: {
  /** Fields of other roles step back while one role is in focus. */
  activeRole?: number | null;
  children?: ReactNode;
  className?: string;
  fields?: readonly TemplateFieldPreview[];
  pageNumber: number;
  pdf: TemplatePdf;
  showFields?: boolean;
  /** Name each field ("Signature") where there is room. Off in thumbnails. */
  showLabels?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ratio, setRatio] = useState(11 / 8.5);
  const [width, setWidth] = useState(0);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const box = boxRef.current;

    if (!box) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry?.contentRect.width ?? 0);

      setWidth((current) => (Math.abs(current - next) > 2 ? next : current));
    });

    observer.observe(box);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (pdf.state !== "ready" || width === 0) {
      return;
    }

    let active = true;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null =
      null;

    void (async () => {
      try {
        const page = await pdf.document.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });

        if (!active) {
          return;
        }

        setRatio(base.height / base.width);

        const scale = width / base.width;
        const viewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const buffer = document.createElement("canvas");
        const context = buffer.getContext("2d");

        if (!context) {
          return;
        }

        buffer.width = Math.floor(viewport.width * outputScale);
        buffer.height = Math.floor(viewport.height * outputScale);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, buffer.width, buffer.height);
        const task = page.render({
          canvas: buffer,
          canvasContext: context,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
          viewport,
        });

        renderTask = task;
        await task.promise;

        const visible = canvasRef.current;
        const visibleContext = visible?.getContext("2d");

        if (!active || !visible || !visibleContext) {
          return;
        }

        visible.width = buffer.width;
        visible.height = buffer.height;
        visibleContext.drawImage(buffer, 0, 0);
        setPainted(true);
      } catch {
        // A page that cannot be drawn stays a blank sheet.
      }
    })();

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, width]);

  const pageFields = fields.filter((field) => field.page === pageNumber);

  return (
    <div
      className={cn(
        "@container relative w-full overflow-hidden rounded-[0.5rem] bg-(--paper) shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.06),0_2px_4px_rgb(var(--fg-rgb)/0.04),0_16px_40px_-20px_rgb(var(--fg-rgb)/0.25)]",
        className,
      )}
      ref={boxRef}
      style={{ aspectRatio: `1 / ${String(ratio)}` }}
    >
      <canvas
        aria-hidden="true"
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-(--dur-panel) ease-(--ease-out)",
          painted ? "opacity-100" : "opacity-0",
        )}
        ref={canvasRef}
      />
      {!painted ? (
        <div className="absolute inset-0 animate-pulse bg-(--paper)" />
      ) : null}
      {showFields
        ? pageFields.map((field, index) => {
            const palette = getSignerPalette(field.roleIndex);
            const dimmed =
              activeRole !== null && activeRole !== field.roleIndex;

            const label = showLabels ? FIELD_LABELS[field.type] : undefined;

            return (
              <span
                aria-hidden="true"
                className="absolute flex items-center overflow-hidden rounded-[0.25rem] px-[0.8cqw] text-[max(0.5rem,1.7cqw)] leading-none font-medium whitespace-nowrap transition-[opacity,box-shadow] duration-(--dur-move) ease-(--ease-out)"
                data-dimmed={dimmed ? "" : undefined}
                key={index}
                style={{
                  background: palette.tint,
                  boxShadow: `inset 0 0 0 1px ${palette.color}`,
                  color: palette.color,
                  height: `${String(field.height * 100)}%`,
                  left: `${String(field.x * 100)}%`,
                  opacity: dimmed ? 0.25 : 0.9,
                  top: `${String(field.y * 100)}%`,
                  width: `${String(field.width * 100)}%`,
                }}
              >
                {label ? <span className="truncate">{label}</span> : null}
              </span>
            );
          })
        : null}
      {children}
    </div>
  );
}
