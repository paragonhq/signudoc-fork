"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import {
  loadPdfJsModule,
  PDF_JS_STANDARD_FONT_DATA_URL,
} from "@/lib/pdfjs-client";
import { Skeleton } from "@/components/ui/skeleton";

import { type PrepareField, type PrepareShellSigner } from "./model";

type PdfJsModule = Awaited<ReturnType<typeof loadPdfJsModule>>;
type PdfDocumentProxy = Awaited<
  ReturnType<PdfJsModule["getDocument"]>["promise"]
>;

/** Loads the document once for all thumbnails. */
function usePdfDocument(url: string | null) {
  const [loaded, setLoaded] = useState<{
    proxy: PdfDocumentProxy;
    url: string;
  } | null>(null);

  useEffect(() => {
    let isActive = true;
    let loaded: PdfDocumentProxy | null = null;
    let task: ReturnType<PdfJsModule["getDocument"]> | null = null;

    if (!url) {
      return;
    }

    void (async () => {
      try {
        const pdfjs = await loadPdfJsModule();
        task = pdfjs.getDocument({
          standardFontDataUrl: PDF_JS_STANDARD_FONT_DATA_URL,
          url,
        });
        const next = await task.promise;

        if (!isActive) {
          await next.destroy();
          return;
        }

        loaded = next;
        setLoaded({ proxy: next, url });
      } catch {
        // Thumbnails are a convenience; the page itself reports errors.
      }
    })();

    return () => {
      isActive = false;
      void task?.destroy();
      void loaded?.destroy();
    };
  }, [url]);

  return loaded && loaded.url === url ? loaded.proxy : null;
}

const THUMB_WIDTH = 84;

/** One page, drawn small, once it scrolls near view. */
function PageThumbnail({
  documentProxy,
  pageNumber,
}: {
  documentProxy: PdfDocumentProxy | null;
  pageNumber: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isNear, setIsNear] = useState(false);
  const [isDrawn, setIsDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || typeof IntersectionObserver === "undefined") {
      setIsNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!documentProxy || !isNear || !canvasRef.current) {
      return;
    }

    let isActive = true;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null =
      null;

    void (async () => {
      try {
        const page = await documentProxy.getPage(pageNumber);

        if (!isActive) {
          return;
        }

        const base = page.getViewport({ scale: 1 });
        const ratio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({
          scale: (THUMB_WIDTH * ratio) / base.width,
        });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) {
          return;
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const task = page.render({ canvas, canvasContext: context, viewport });

        renderTask = task;
        await task.promise;

        if (isActive) {
          setIsDrawn(true);
        }
      } catch {
        // Leave the skeleton; the thumbnail is decorative.
      }
    })();

    return () => {
      isActive = false;
      renderTask?.cancel();
    };
  }, [documentProxy, isNear, pageNumber]);

  return (
    <>
      <canvas
        aria-hidden="true"
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-(--dur-open) ease-(--ease-out)",
          isDrawn ? "opacity-100" : "opacity-0",
        )}
        ref={canvasRef}
      />
      {isDrawn ? null : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex flex-col gap-1.5 p-2"
        >
          <Skeleton className="h-1 w-1/2 rounded-full" delay={150} />
          <Skeleton className="mt-1 h-1 w-full rounded-full" delay={150} />
          <Skeleton className="h-1 w-5/6 rounded-full" delay={150} />
          <Skeleton className="h-1 w-2/3 rounded-full" delay={150} />
        </span>
      )}
    </>
  );
}

type PagesRailProps = {
  activePage: number;
  documentUrl: string | null;
  fields: readonly PrepareField[];
  onSelectPage: (page: number) => void;
  pages: ReadonlyArray<{
    heightPt: number;
    pageNumber: number;
    widthPt: number;
  }>;
  signers: readonly PrepareShellSigner[];
};

/**
 * The document's pages, small, on the desk. Click one to go there. The
 * current page wears a soft accent ring; fields show as small marks in
 * their signer's colour.
 */
export function PagesRail({
  activePage,
  documentUrl,
  fields,
  onSelectPage,
  pages,
  signers,
}: PagesRailProps) {
  const documentProxy = usePdfDocument(documentUrl);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activePage]);

  return (
    <ol className="flex flex-col items-center gap-4 px-3 pt-3 pb-6">
      {pages.map((page) => {
        const pageFields = fields.filter(
          (field) => field.page === page.pageNumber,
        );
        const isActive = page.pageNumber === activePage;
        const fieldWord = pageFields.length === 1 ? "field" : "fields";

        return (
          <li key={page.pageNumber}>
            <button
              aria-current={isActive ? "page" : undefined}
              aria-label={`Page ${String(page.pageNumber)}, ${String(pageFields.length)} ${fieldWord}`}
              className="group/thumb flex w-full flex-col items-center gap-1.5 rounded-md outline-none focus-visible:[&>span:first-child]:shadow-(--focus-ring)"
              onClick={() => onSelectPage(page.pageNumber)}
              ref={isActive ? activeRef : undefined}
              type="button"
            >
              <span
                className={cn(
                  "relative block w-[5.25rem] overflow-hidden rounded-[3px] bg-(--paper)",
                  "transition-[box-shadow,scale,opacity] duration-(--dur-hover) ease-(--ease-out) group-active/thumb:scale-[0.97]",
                  isActive
                    ? "shadow-[0_0_0_2px_var(--paper),0_0_0_4px_rgb(var(--accent-rgb)/0.55)]"
                    : "opacity-80 shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.05),0_2px_8px_-4px_rgb(var(--fg-rgb)/0.16)] group-hover/thumb:opacity-100",
                )}
                style={{ aspectRatio: `${page.widthPt} / ${page.heightPt}` }}
              >
                <PageThumbnail
                  documentProxy={documentProxy}
                  pageNumber={page.pageNumber}
                />
                {pageFields.map((field) => {
                  const signer = signers.find(
                    (entry) => entry.id === field.signerId,
                  );

                  return (
                    <span
                      aria-hidden="true"
                      className="absolute rounded-[1px]"
                      key={field.id}
                      style={{
                        backgroundColor: signer?.color,
                        opacity: 0.5,
                        height: `${field.height * 100}%`,
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                      }}
                    />
                  );
                })}
              </span>
              <span
                className={cn(
                  "text-xs leading-4 font-medium tabular-nums",
                  isActive ? "text-(--fg)" : "text-(--secondary)",
                )}
              >
                {page.pageNumber}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
