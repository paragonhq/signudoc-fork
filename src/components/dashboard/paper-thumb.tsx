import { ViewTransition } from "react";

import { PaperSheet } from "@/components/objects/paper-sheet";
import { DocumentThumbnail } from "@/components/shared/document-thumbnail";

/** The view-transition name a document's first page carries everywhere. */
export function documentThumbTransitionName(envelopeId: string) {
  return `document-page-${envelopeId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * A document's first page as a sheet of paper (objects/PaperSheet): the
 * real thumbnail with a hairline, an inner edge highlight and a soft
 * contact shadow. With `interactive` it leans 2–3° toward a mouse and
 * presses flat while held. (`stack`, `dogEar` and `fold` are accepted for
 * older callers and ignored.)
 *
 * With an `envelopeId` the page carries a shared view-transition name, so
 * opening a document from the list morphs its small page into the large
 * one on the detail page (and back). Pass `morph={false}` where the same
 * document can appear twice on one screen: names must be unique.
 *
 *   <PaperThumb className="h-10" envelopeId={id} title={title} />
 */
export function PaperThumb({
  className,
  dogEar: _dogEar,
  envelopeId,
  fold: _fold,
  interactive = false,
  morph = true,
  stack: _stack,
  title,
}: {
  className?: string;
  dogEar?: boolean;
  envelopeId?: string;
  fold?: string;
  /** Lean toward the pointer and press flat (fine pointers). */
  interactive?: boolean;
  /** Share a view-transition name with the same page elsewhere (default). */
  morph?: boolean;
  stack?: boolean;
  title: string;
}) {
  void _dogEar;
  void _fold;
  void _stack;

  const page = (
    <PaperSheet className={className} interactive={interactive}>
      <span className="contents" data-slot="paper-thumb">
        <DocumentThumbnail
          className="h-full rounded-none shadow-none ring-0"
          envelopeId={envelopeId}
          title={title}
        />
      </span>
    </PaperSheet>
  );

  if (!envelopeId || !morph) {
    return page;
  }

  return (
    <ViewTransition
      default="none"
      name={documentThumbTransitionName(envelopeId)}
      share="document-morph"
    >
      {page}
    </ViewTransition>
  );
}
