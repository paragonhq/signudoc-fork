"use client";

import type { RefObject } from "react";

import {
  Tray,
  TrayBody,
  TrayContent,
  TrayDescription,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";

import { DocumentViewer, type EnvelopePdf } from "./document-viewer";
import type { DetailModel } from "./model";

/**
 * The document on a phone: the same viewer as the wide page, in a tray
 * that rises from the "View document" row and gives focus back to it.
 */
export function DocumentTray({
  activeSigner,
  model,
  onActiveSignerChange,
  onOpenChange,
  onPageChange,
  open,
  page,
  returnFocusRef,
  source,
}: {
  activeSigner: number | null;
  model: DetailModel;
  onActiveSignerChange: (signer: number | null) => void;
  onOpenChange: (open: boolean) => void;
  onPageChange: (page: number) => void;
  open: boolean;
  page: number;
  returnFocusRef: RefObject<HTMLElement | null>;
  source: EnvelopePdf;
}) {
  return (
    <Tray onOpenChange={onOpenChange} open={open}>
      <TrayContent
        onCloseAutoFocus={(event) => {
          if (returnFocusRef.current) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
        size="lg"
      >
        <TrayHeader>
          <TrayTitle className="truncate pr-10">{model.record.title}</TrayTitle>
          <TrayDescription>
            {source.signedCopy
              ? "The signed copy, as everyone received it."
              : "Each field in the colour of the person who fills it in."}
          </TrayDescription>
        </TrayHeader>
        <TrayBody className="pb-5">
          <DocumentViewer
            activeSigner={activeSigner}
            model={model}
            onActiveSignerChange={onActiveSignerChange}
            onPageChange={onPageChange}
            page={page}
            pinnedSigner={activeSigner}
            source={source}
            variant="tray"
          />
        </TrayBody>
      </TrayContent>
    </Tray>
  );
}
