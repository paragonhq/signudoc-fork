"use client";

import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  ViewTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { documentThumbTransitionName } from "@/components/dashboard/paper-thumb";
import { getSignerPalette } from "@/components/envelopes/signer-palette";
import {
  useTemplatePdf,
  type TemplatePdf,
} from "@/components/templates/template-preview";
import { IconButton } from "@/components/ui/icon-button";
import { SPRING_SNAPPY } from "@/components/ui/motion-tokens";
import type { EnvelopeDetailFieldView } from "@/lib/envelope-detail-fields";
import { buildEnvelopeThumbnailUrl } from "@/lib/pdf-thumbnail";
import { cn } from "@/lib/cn";

import { CompletedSeal } from "./detail-header";
import { firstName, type RouteNode } from "./derive";
import type { DetailModel } from "./model";

/*
 * The document itself, as the sender's viewer: the real pages drawn in the
 * browser from the PDF, each field laid over its page in the colour of the
 * person who fills it in, and whether it is filled yet. A finished document
 * shows its signed copy instead, with the signatures in place.
 *
 *   useEnvelopePdf   which PDF to show, loaded once (signed copy first for a
 *                    completed document, the original if that fails)
 *   DocumentViewer   toolbar (who fills in what, page n of m, open), the
 *                    pages rail and the page itself
 */

const FIELD_LABELS: Record<EnvelopeDetailFieldView["type"], string | null> = {
  checkbox: null,
  date: "Date",
  dropdown: "Choice",
  initials: "Initials",
  name: "Name",
  number: "Number",
  radio: null,
  signature: "Signature",
  text: "Text",
};

export type EnvelopePdf = {
  pdf: TemplatePdf;
  /** The pages, once the PDF says; the stored count until then. */
  pageCount: number;
  /** Showing the signed copy (a completed document). */
  signedCopy: boolean;
};

export function envelopeDocumentUrl(envelopeId: string) {
  return `/api/envelopes/${encodeURIComponent(envelopeId)}/document`;
}

/**
 * The PDF to show. Nothing loads until `enabled` (a phone loads it when its
 * tray first opens). A completed document shows the signed copy; if that
 * cannot be read, the original.
 */
export function useEnvelopePdf(
  model: DetailModel,
  enabled: boolean,
): EnvelopePdf {
  const completed = model.record.status === "completed";
  const id = encodeURIComponent(model.envelopeId);
  const signed = useTemplatePdf(
    enabled && completed ? `/api/envelopes/${id}/download?type=signed` : null,
  );
  const useOriginal = !completed || signed.state === "error";
  const original = useTemplatePdf(
    enabled && useOriginal ? envelopeDocumentUrl(model.envelopeId) : null,
  );
  const pdf = useOriginal ? original : signed;

  return {
    pageCount: pdf.state === "ready" ? pdf.document.numPages : model.pageCount,
    pdf,
    signedCopy: !useOriginal,
  };
}

type ViewerProps = {
  /** The signer whose fields are in focus (pinned, or pointed at). */
  activeSigner: number | null;
  /** Share the dashboard row's view-transition name (page 1 only). */
  morph?: boolean;
  model: DetailModel;
  onActiveSignerChange: (signer: number | null) => void;
  onPageChange: (page: number) => void;
  page: number;
  /** The signer chosen in the legend (pressed), if any. */
  pinnedSigner: number | null;
  source: EnvelopePdf;
  variant: "desk" | "tray";
};

export function DocumentViewer({
  activeSigner,
  model,
  morph = false,
  onActiveSignerChange,
  onPageChange,
  page,
  pinnedSigner,
  source,
  variant,
}: ViewerProps) {
  const { pageCount } = source;
  const many = pageCount > 1;
  const desk = variant === "desk";
  const go = (next: number) =>
    onPageChange(Math.min(pageCount, Math.max(1, next)));

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("input, textarea, select, [role='menu']")) {
      return;
    }

    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      go(page + 1);
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      go(page - 1);
    }
  }

  const pager = (
    <>
      <IconButton
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        size="sm"
      >
        <ChevronLeftIcon />
      </IconButton>
      <span
        aria-live="polite"
        className="min-w-[4.5rem] text-center text-[0.8125rem] leading-5 text-(--secondary) tabular-nums"
      >
        {page} of {pageCount}
      </span>
      <IconButton
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => go(page + 1)}
        size="sm"
      >
        <ChevronRightIcon />
      </IconButton>
    </>
  );

  return (
    <section
      aria-label="Document"
      className={cn(
        "flex min-w-0 flex-col",
        desk &&
          "rounded-(--radius-card) bg-[rgb(var(--fg-rgb)/0.04)] shadow-[inset_0_0_0_1px_rgb(var(--fg-rgb)/0.03)]",
      )}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          desk ? "px-3 pt-3 sm:px-4" : "px-0 pb-1",
        )}
      >
        <SignerLegend
          activeSigner={activeSigner}
          fields={model.fields}
          pinnedSigner={pinnedSigner}
          model={model}
          onActiveSignerChange={(signer) => {
            onActiveSignerChange(signer);

            // Bring their first field into view if this page has none.
            if (
              signer !== null &&
              !model.fields.some(
                (field) => field.signerIndex === signer && field.page === page,
              )
            ) {
              const first = model.fields.find(
                (field) => field.signerIndex === signer,
              );

              if (first) {
                onPageChange(first.page);
              }
            }
          }}
          signedCopy={source.signedCopy}
        />
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {many && desk ? pager : null}
          {desk ? (
            <IconButton
              aria-label="Open the PDF in a new tab"
              asChild
              size="sm"
              tooltip="Open in a new tab"
            >
              <a
                href={envelopeDocumentUrl(model.envelopeId)}
                rel="noopener"
                target="_blank"
              >
                <ArrowUpRightIcon />
              </a>
            </IconButton>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-col gap-4",
          desk && "px-4 pt-3 pb-5 sm:px-6 sm:pb-6",
          desk &&
            many &&
            "lg:grid lg:grid-cols-[5rem_minmax(0,1fr)] lg:items-start lg:gap-4 lg:pl-3",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 justify-center",
            desk && many && "lg:col-start-2 lg:row-start-1",
          )}
        >
          <div
            className={cn(
              "relative w-full",
              desk
                ? "max-w-[38rem] lg:max-w-[min(38rem,calc((100dvh-13rem)*0.77))]"
                : "max-w-[30rem]",
            )}
          >
            <MorphName
              active={morph && page === 1}
              envelopeId={model.envelopeId}
            >
              <EnvelopePage
                activeSigner={activeSigner}
                fields={model.fields}
                pageNumber={page}
                placeholder={
                  page === 1
                    ? buildEnvelopeThumbnailUrl(model.envelopeId)
                    : undefined
                }
                route={model.route}
                signedCopy={source.signedCopy}
                source={source}
              />
            </MorphName>
            {desk && model.flagStatus === "completed" ? (
              // The seal, pressed into the corner of the page (once a
              // session); the status card shows none beside it on desktop.
              <span className="pointer-events-none absolute top-4 right-4 z-10 block [filter:drop-shadow(0_0.5px_0.5px_rgb(var(--fg-rgb)/0.3))_drop-shadow(0_2px_4px_rgb(var(--fg-rgb)/0.12))]">
                <CompletedSeal envelopeId={model.envelopeId} onPaper />
              </span>
            ) : null}
            <p className="sr-only">
              Page {page} of {pageCount}
            </p>
            {/* In the tray the pager sits under the page, by the thumb. */}
            {many && !desk ? (
              <div className="mt-2 flex items-center justify-center gap-0.5">
                {pager}
              </div>
            ) : null}
          </div>
        </div>
        {many ? (
          <PageRail
            activeSigner={activeSigner}
            fields={model.fields}
            onSelect={go}
            page={page}
            pageCount={pageCount}
            source={source}
            vertical={desk}
          />
        ) : null}
      </div>
    </section>
  );
}

function MorphName({
  active,
  children,
  envelopeId,
}: {
  active: boolean;
  children: ReactNode;
  envelopeId: string;
}) {
  if (!active) {
    return children;
  }

  return (
    <ViewTransition
      default="none"
      name={documentThumbTransitionName(envelopeId)}
      share="document-morph"
    >
      {/* ViewTransition names the one DOM node it wraps. */}
      <div>{children}</div>
    </ViewTransition>
  );
}

/**
 * Who fills in what: a chip per signer in their colour, with how many of
 * their fields are done. Pressing one brings their fields forward (and
 * turns to the first page that has one); pressing it again lets go.
 */
function SignerLegend({
  activeSigner,
  fields,
  model,
  onActiveSignerChange,
  pinnedSigner,
  signedCopy,
}: {
  activeSigner: number | null;
  fields: readonly EnvelopeDetailFieldView[];
  model: DetailModel;
  onActiveSignerChange: (signer: number | null) => void;
  pinnedSigner: number | null;
  signedCopy: boolean;
}) {
  // Nobody fills anything in until it is sent: no tallies on a draft.
  const tally = model.record.status !== "draft";
  const people = model.route.filter((node) =>
    fields.some((field) => field.signerIndex === node.index),
  );

  if (people.length === 0) {
    return (
      <p className="truncate px-1 text-[0.8125rem] leading-5 text-(--secondary)">
        {signedCopy ? "The signed copy" : "No fields placed yet"}
      </p>
    );
  }

  return (
    <div
      aria-label="Show a signer's fields"
      className="-my-1 flex min-w-0 items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none]"
      role="group"
    >
      {people.map((node) => {
        const theirs = fields.filter(
          (field) => field.signerIndex === node.index,
        );
        const done = theirs.filter((field) => field.filled).length;
        const palette = getSignerPalette(node.index);
        const pressed = pinnedSigner === node.index;
        const lit = activeSigner === node.index;
        const allDone = tally && done === theirs.length;

        return (
          <button
            aria-label={
              tally
                ? `${node.signer.name}: ${String(done)} of ${String(theirs.length)} fields filled in`
                : `${node.signer.name}: ${String(theirs.length)} ${theirs.length === 1 ? "field" : "fields"}`
            }
            aria-pressed={pressed}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full pr-3 pl-2 text-[0.8125rem] leading-5 font-medium outline-none transition-[background-color,box-shadow,scale] duration-(--dur-hover) ease-(--ease-out) focus-visible:shadow-(--focus-ring) active:scale-[0.97]",
              pressed || lit
                ? "bg-(--paper) text-(--fg) shadow-(--shadow-card-flat)"
                : "text-(--secondary) hover:bg-(--paper) hover:text-(--fg)",
            )}
            key={node.signer.id}
            onClick={() => onActiveSignerChange(pressed ? null : node.index)}
            type="button"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-4 items-center justify-center rounded-full"
              style={{ background: palette.color }}
            >
              {allDone ? (
                <CheckIcon className="size-2.5 text-white" strokeWidth={3} />
              ) : null}
            </span>
            <span className="max-w-[8rem] truncate">
              {firstName(node.signer.name)}
            </span>
            <span
              aria-hidden="true"
              className="text-(--secondary) tabular-nums opacity-80"
            >
              {tally
                ? `${String(done)}/${String(theirs.length)}`
                : theirs.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Small pages to move between; the ring slides to the one in view. */
function PageRail({
  activeSigner,
  fields,
  onSelect,
  page,
  pageCount,
  source,
  vertical,
}: {
  activeSigner: number | null;
  fields: readonly EnvelopeDetailFieldView[];
  onSelect: (page: number) => void;
  page: number;
  pageCount: number;
  source: EnvelopePdf;
  vertical: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const listRef = useRef<HTMLUListElement | null>(null);

  // Keep the current page's thumbnail in view on a long strip.
  useEffect(() => {
    const current = listRef.current?.querySelector<HTMLElement>(
      "[aria-current='page']",
    );

    current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [page, reduceMotion]);

  return (
    <nav
      aria-label="Pages"
      className={cn(
        "-mx-1 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]",
        vertical &&
          "lg:col-start-1 lg:row-start-1 lg:mx-0 lg:max-h-[calc(100dvh-13rem)] lg:overflow-x-hidden lg:overflow-y-auto lg:px-2 lg:pb-2",
      )}
    >
      <LayoutGroup id="envelope-pages">
        <ul
          className={cn("flex gap-3", vertical && "lg:flex-col lg:gap-4")}
          ref={listRef}
        >
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (number) => {
              const here = fields.filter((field) => field.page === number);
              const signers = [
                ...new Set(here.map((field) => field.signerIndex)),
              ].sort();
              const current = number === page;

              return (
                <li className="shrink-0" key={number}>
                  <button
                    aria-current={current ? "page" : undefined}
                    aria-label={`Page ${String(number)}${here.length ? `, ${String(here.length)} ${here.length === 1 ? "field" : "fields"}` : ""}`}
                    className="group/page flex w-14 flex-col items-center gap-1.5 rounded-[0.625rem] outline-none focus-visible:shadow-(--focus-ring) lg:w-16"
                    onClick={() => onSelect(number)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "relative block w-full rounded-[0.5rem] p-0.5 transition-[translate] duration-(--dur-move) ease-(--ease-out)",
                        !current && "group-hover/page:-translate-y-0.5",
                      )}
                    >
                      {current ? (
                        <motion.span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-[0.5rem] shadow-[0_0_0_2px_var(--accent)]"
                          layoutId="page-ring"
                          transition={SPRING_SNAPPY}
                        />
                      ) : null}
                      <EnvelopePage
                        activeSigner={activeSigner}
                        compact
                        fields={fields}
                        pageNumber={number}
                        signedCopy={source.signedCopy}
                        source={source}
                      />
                    </span>
                    <span className="flex h-4 items-center gap-1">
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          current
                            ? "font-medium text-(--fg)"
                            : "text-(--secondary)",
                        )}
                      >
                        {number}
                      </span>
                      {signers.map((signer) => (
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full"
                          key={signer}
                          style={{ background: getSignerPalette(signer).color }}
                        />
                      ))}
                    </span>
                  </button>
                </li>
              );
            },
          )}
        </ul>
      </LayoutGroup>
    </nav>
  );
}

/**
 * One page at the width of its box, with its fields over it. The box takes
 * the page's shape as soon as it is known (US Letter until then), and the
 * stored picture of the first page stands in while the page is drawn, so
 * nothing jumps and nothing flashes white.
 */
function EnvelopePage({
  activeSigner,
  compact = false,
  fields,
  pageNumber,
  placeholder,
  route = [],
  signedCopy = false,
  source,
}: {
  activeSigner: number | null;
  /** A thumbnail: no words on the fields. */
  compact?: boolean;
  fields: readonly EnvelopeDetailFieldView[];
  pageNumber: number;
  placeholder?: string;
  route?: readonly RouteNode[];
  signedCopy?: boolean;
  source: EnvelopePdf;
}) {
  const { pdf } = source;
  const boxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ratio, setRatio] = useState(11 / 8.5);
  const [width, setWidth] = useState(0);
  const [painted, setPainted] = useState(false);
  const [placeholderShown, setPlaceholderShown] = useState(true);

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

        const viewport = page.getViewport({ scale: width / base.width });
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

        // Drawn off screen first, then swapped in whole: turning a page
        // never shows a half-drawn one.
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
  const showMarks = !signedCopy || activeSigner !== null;

  return (
    <div
      className={cn(
        "@container relative w-full overflow-hidden bg-(--paper)",
        compact
          ? "rounded-[0.375rem] shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.08)]"
          : "rounded-[0.5rem] shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.06),0_2px_4px_rgb(var(--fg-rgb)/0.04),0_24px_48px_-24px_rgb(var(--fg-rgb)/0.3)]",
      )}
      ref={boxRef}
      style={{ aspectRatio: `1 / ${String(ratio)}` }}
    >
      {placeholder && placeholderShown && !painted ? (
        // The stored first-page picture, private behind the session cookie.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-top"
          decoding="async"
          onError={() => setPlaceholderShown(false)}
          src={placeholder}
        />
      ) : null}
      {!painted && !(placeholder && placeholderShown) ? (
        <div className="absolute inset-0 animate-pulse bg-(--paper)" />
      ) : null}
      <canvas
        aria-hidden="true"
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-(--dur-panel) ease-(--ease-out)",
          painted ? "opacity-100" : "opacity-0",
        )}
        ref={canvasRef}
      />
      {pdf.state === "error" && !compact ? (
        <p className="absolute inset-x-0 bottom-0 bg-(--paper) px-4 py-3 text-center text-[0.8125rem] text-(--secondary)">
          The page couldn&rsquo;t be drawn right now.
        </p>
      ) : null}
      {showMarks
        ? pageFields.map((field) => (
            <FieldMark
              active={activeSigner}
              compact={compact}
              field={field}
              key={field.id}
              outlineOnly={signedCopy}
              owner={route[field.signerIndex]?.signer.name}
            />
          ))
        : null}
    </div>
  );
}

/**
 * A field over the page in its signer's colour. Waiting: tinted with a
 * fine edge and its name ("Signature"); optional ones take a dashed edge.
 * Filled: a tick, and "Signed" on signatures. On the signed copy only the
 * chosen signer's fields are traced, so the signatures stay readable.
 */
function FieldMark({
  active,
  compact,
  field,
  outlineOnly,
  owner,
}: {
  active: number | null;
  compact: boolean;
  field: EnvelopeDetailFieldView;
  outlineOnly: boolean;
  owner?: string;
}) {
  const palette = getSignerPalette(field.signerIndex);
  const focused = active === field.signerIndex;
  const dimmed = active !== null && !focused;

  if (outlineOnly && !focused) {
    return null;
  }

  const signs = field.type === "signature" || field.type === "initials";
  const label = compact
    ? null
    : field.filled
      ? signs
        ? "Signed"
        : null
      : FIELD_LABELS[field.type];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute flex items-center gap-[0.6cqw] overflow-hidden rounded-[0.25rem] px-[0.8cqw] text-[max(0.625rem,1.75cqw)] leading-none font-medium whitespace-nowrap transition-[opacity,box-shadow,background-color] duration-(--dur-move) ease-(--ease-out)",
        !field.required && !field.filled && "border border-dashed",
      )}
      data-filled={field.filled || undefined}
      style={{
        // The tint over white, so the words underneath step back the way
        // they do under a placed field in the builder.
        background: outlineOnly
          ? "transparent"
          : `linear-gradient(${palette.tint}, ${palette.tint}), rgb(255 255 255 / ${field.filled ? "0.7" : "0.92"})`,
        borderColor: palette.color,
        boxShadow: [
          field.required || field.filled
            ? `inset 0 0 0 1px ${palette.color}`
            : null,
          focused ? `0 0 0 3px ${palette.tint}` : null,
        ]
          .filter(Boolean)
          .join(", "),
        // Deepened a little: the page is white in either theme.
        color: `color-mix(in srgb, ${palette.color} 78%, black)`,
        height: `${String(field.height * 100)}%`,
        left: `${String(field.x * 100)}%`,
        opacity: dimmed ? 0.2 : field.filled && !focused ? 0.75 : 0.95,
        top: `${String(field.y * 100)}%`,
        width: `${String(field.width * 100)}%`,
      }}
      title={owner}
    >
      {field.filled && !outlineOnly ? (
        <CheckIcon
          className="size-[max(0.625rem,1.8cqw)] shrink-0"
          strokeWidth={2.5}
        />
      ) : null}
      {label && !outlineOnly ? <span className="truncate">{label}</span> : null}
    </span>
  );
}
