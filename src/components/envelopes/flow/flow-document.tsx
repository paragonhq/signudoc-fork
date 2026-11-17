"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  TemplatePage,
  useTemplatePdf,
} from "@/components/templates/template-preview";
import { IconButton } from "@/components/ui/icon-button";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

/** A placed field, drawn over the page in its signer's colour. */
export type FlowDocumentField = {
  height: number;
  page: number;
  /** The signer's place in the order, 0-based: picks the colour. */
  roleIndex: number;
  type: string;
  width: number;
  x: number;
  y: number;
};

/** The pages the strip draws at most; arrows reach the rest. */
const MAX_STRIP_PAGES = 12;

type FlowDocumentProps = {
  /** Fields of other signers step back while one signer is in focus. */
  activeRole?: number | null;
  /** A line under the page: "2 pages · contract.pdf". */
  caption?: ReactNode;
  envelopeId: string;
  fields?: readonly FlowDocumentField[];
  pageCount: number;
};

export function envelopeDocumentUrl(envelopeId: string) {
  return `/api/envelopes/${encodeURIComponent(envelopeId)}/document`;
}

/**
 * The document beside the send flow, so you always see what you are
 * sending: the current page large, with each signer's fields in their
 * colour, and the pages as a strip beneath it. When a signer is in focus
 * on the left, their fields come forward and the others step back; if
 * none of theirs are on this page, it turns to the first page that has
 * one.
 */
export function FlowDocument({
  activeRole = null,
  caption,
  envelopeId,
  fields = [],
  pageCount,
}: FlowDocumentProps) {
  const reduceMotion = useReducedMotion();
  const pdf = useTemplatePdf(envelopeDocumentUrl(envelopeId));
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState(0);
  const stripRef = useRef<HTMLOListElement | null>(null);
  const total = Math.max(1, pageCount);
  // Someone with nothing placed yet does not dim everyone else's fields.
  const focusRole =
    activeRole !== null &&
    fields.some((field) => field.roleIndex === activeRole)
      ? activeRole
      : null;
  const stripPages = Math.min(total, MAX_STRIP_PAGES);

  function turnTo(next: number) {
    const clamped = Math.min(Math.max(next, 1), total);

    setDirection(clamped > page ? 1 : -1);
    setPage(clamped);
  }

  // Follow the signer in focus to a page with their fields, after a beat so
  // a pointer passing over the list does not flip pages.
  useEffect(() => {
    if (activeRole === null) {
      return;
    }

    const theirs = fields.filter((field) => field.roleIndex === activeRole);

    if (theirs.length === 0 || theirs.some((field) => field.page === page)) {
      return;
    }

    const first = Math.min(...theirs.map((field) => field.page));
    const timer = window.setTimeout(() => {
      setDirection(first > page ? 1 : -1);
      setPage(first);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [activeRole, fields, page]);

  // Keep the current page's thumbnail in view in the strip (sideways
  // only: the window itself never moves).
  useEffect(() => {
    const strip = stripRef.current;
    const item = strip?.querySelector<HTMLElement>(
      `[data-page="${String(page)}"]`,
    );

    if (!strip || !item) {
      return;
    }

    const left = item.offsetLeft - strip.offsetLeft;
    const right = left + item.offsetWidth;

    if (left < strip.scrollLeft) {
      strip.scrollTo({ behavior: "smooth", left: left - 4 });
    } else if (right > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({
        behavior: "smooth",
        left: right - strip.clientWidth + 4,
      });
    }
  }, [page]);

  const travel = reduceMotion ? 0 : 14 * direction;

  return (
    <section
      aria-label="Document preview"
      className="flex flex-col gap-4 rounded-(--radius-card) bg-(--paper) p-4 shadow-(--shadow-card) xl:p-5"
    >
      <div className="relative overflow-hidden rounded-(--radius-well) bg-(--surface) px-6 py-6 xl:px-8 xl:py-7">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              transition: {
                duration: exitDuration(DUR.move),
                ease: EASE.exit,
              },
              x: -travel,
            }}
            initial={{ opacity: 0, x: travel }}
            key={page}
            transition={{ duration: DUR.move, ease: EASE.out }}
          >
            <TemplatePage
              activeRole={focusRole}
              fields={fields}
              pageNumber={page}
              pdf={pdf}
            />
          </motion.div>
        </AnimatePresence>
        {pdf.state === "error" ? (
          <p className="absolute inset-x-0 bottom-3 text-center text-[0.8125rem] text-(--secondary)">
            The preview could not be drawn.
          </p>
        ) : null}
      </div>

      <div className="flex min-h-8 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[0.8125rem] leading-5 text-(--secondary)">
          {caption}
        </p>
        {total > 1 ? (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => turnTo(page - 1)}
              size="sm"
              tooltip="Previous page"
            >
              <ChevronLeftIcon />
            </IconButton>
            <span
              aria-live="polite"
              className="min-w-[3.25rem] text-center text-[0.8125rem] leading-5 font-medium text-(--fg) tabular-nums"
            >
              {page}
              <span className="text-(--secondary)"> / {total}</span>
            </span>
            <IconButton
              aria-label="Next page"
              disabled={page >= total}
              onClick={() => turnTo(page + 1)}
              size="sm"
              tooltip="Next page"
            >
              <ChevronRightIcon />
            </IconButton>
          </div>
        ) : null}
      </div>

      {total > 1 ? (
        <ol
          aria-label="Pages"
          className="-mx-1 -mb-1 flex gap-2 overflow-x-auto px-1 pt-0.5 pb-1 [scrollbar-width:none]"
          ref={stripRef}
        >
          {Array.from({ length: stripPages }, (_, index) => index + 1).map(
            (pageNumber) => {
              const current = pageNumber === page;

              return (
                <li
                  className="shrink-0"
                  data-page={pageNumber}
                  key={pageNumber}
                >
                  <button
                    aria-current={current ? "page" : undefined}
                    aria-label={`Page ${String(pageNumber)}`}
                    className={cn(
                      "group/page relative block w-12 rounded-[0.5rem] p-0.5 outline-none",
                      "transition-[box-shadow,opacity] duration-(--dur-hover) ease-(--ease-out)",
                      "focus-visible:shadow-(--focus-ring)",
                      current
                        ? "shadow-[0_0_0_2px_var(--accent)]"
                        : "opacity-70 hover:opacity-100",
                    )}
                    onClick={() => turnTo(pageNumber)}
                    type="button"
                  >
                    <TemplatePage
                      activeRole={focusRole}
                      className="rounded-[0.3125rem]"
                      fields={fields}
                      pageNumber={pageNumber}
                      pdf={pdf}
                      showLabels={false}
                    />
                  </button>
                </li>
              );
            },
          )}
        </ol>
      ) : null}
    </section>
  );
}
