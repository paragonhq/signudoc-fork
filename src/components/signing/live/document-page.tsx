"use client";

import { RotateCcwIcon } from "@/components/ui/icons";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";

import {
  PdfPageCanvas,
  type PdfPageRenderState,
} from "@/components/envelopes/pdf-page-canvas";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/**
 * One sheet of the document: the rendered PDF page at its own proportions,
 * white on the page ground with the soft card shadow, and the fields laid
 * over it once it has drawn. Pages draw when they come near the screen
 * (and stay drawn), so a long document opens fast. While a page draws, a
 * skeleton of a page; if it cannot, a plain way to try again.
 */
export function DocumentPage({
  aspectRatio,
  children,
  documentUrl,
  eager = false,
  onRenderStateChange,
  pageNumber,
  ref,
  renderState,
}: {
  aspectRatio: string;
  /** Fields and the flag. Shown only once the page is drawn. */
  children: ReactNode;
  documentUrl: string;
  /** Draw straight away (the first page, or a page asked for). */
  eager?: boolean;
  onRenderStateChange: (state: PdfPageRenderState) => void;
  pageNumber: number;
  ref?: Ref<HTMLDivElement>;
  renderState: PdfPageRenderState;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [isNear, setIsNear] = useState(eager);
  const shouldDraw = isNear || eager;

  useEffect(() => {
    const sheet = sheetRef.current;

    if (shouldDraw || !sheet) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150% 0px" },
    );

    observer.observe(sheet);

    return () => observer.disconnect();
  }, [shouldDraw]);

  return (
    <div
      className="relative w-full rounded-[0.375rem] bg-(--paper) shadow-(--shadow-card-flat)"
      ref={(element) => {
        sheetRef.current = element;

        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      }}
    >
      <div className="relative" data-field-viewport style={{ aspectRatio }}>
        <div className="absolute inset-0 overflow-hidden rounded-[0.375rem]">
          {shouldDraw ? (
            <PdfPageCanvas
              documentUrl={documentUrl}
              onRenderStateChange={onRenderStateChange}
              pageNumber={pageNumber}
            />
          ) : null}
        </div>

        {renderState === "ready" ? children : null}

        {renderState !== "ready" ? (
          <div
            aria-busy={renderState === "loading" || undefined}
            className={cn(
              "absolute inset-0 z-5 flex flex-col overflow-hidden rounded-[0.375rem] bg-(--paper)",
              renderState === "loading" ? "gap-3 p-[8%]" : "justify-center p-6",
            )}
          >
            {renderState === "loading" ? (
              <>
                <span className="sr-only">Loading page {pageNumber}</span>
                <Skeleton className="h-[2.4%] w-[46%]" delay={150} />
                <Skeleton className="mt-[4%] h-[1.6%] w-full" delay={150} />
                <Skeleton className="h-[1.6%] w-[94%]" delay={150} />
                <Skeleton className="h-[1.6%] w-[97%]" delay={150} />
                <Skeleton className="h-[1.6%] w-[62%]" delay={150} />
                <Skeleton className="mt-[5%] h-[1.6%] w-full" delay={150} />
                <Skeleton className="h-[1.6%] w-[91%]" delay={150} />
                <Skeleton className="h-[1.6%] w-[78%]" delay={150} />
              </>
            ) : (
              <div className="mx-auto flex max-w-[30ch] flex-col items-center gap-3 text-center">
                <p className="text-[0.9375rem] font-medium text-(--fg)">
                  Page {pageNumber} didn&apos;t load
                </p>
                <p className="text-[0.8125rem] leading-5 text-(--secondary)">
                  Check your connection, then try again.
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="outline"
                >
                  <RotateCcwIcon aria-hidden="true" />
                  Reload
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
