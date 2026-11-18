"use client";

import dynamic from "next/dynamic";

// The composer (editor, importers, PDF writer) loads only when opened.
export const LazyDocumentComposer = dynamic(
  () => import("./document-composer"),
  {
    ssr: false,
  },
);

export type {
  ComposerResult,
  DocumentComposerProps,
} from "./document-composer";
export type { ComposerSource } from "@/lib/composer/drafts";
