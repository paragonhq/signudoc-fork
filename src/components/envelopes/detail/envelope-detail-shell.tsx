"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { SaveTemplateDialog } from "@/components/templates/save-template-dialog";
import { toast } from "@/components/ui/toaster";
import type { EnvelopeDetailData } from "@/lib/envelopes";

import { useMediaQuery } from "@/components/ui/hooks";

import { Activity } from "./activity";
import { BackLink, DetailHeader } from "./detail-header";
import { DetailUnavailable } from "./detail-unavailable";
import { DocumentTray } from "./document-tray";
import { DocumentViewer, useEnvelopePdf } from "./document-viewer";
import { DetailsDisclosure, TemplateSuggestion, TimingCard } from "./facts";
import { buildDetailModel } from "./model";
import { People } from "./people";
import { StatusCard, ViewDocumentRow } from "./status-card";
import { CopyDraftTray } from "./trays/copy-draft-tray";
import {
  CorrectSignerTray,
  type CorrectableSigner,
} from "./trays/correct-signer-tray";
import {
  DeleteDraftTray,
  DeleteFinishedTray,
  VoidEnvelopeTray,
} from "./trays/danger-trays";
import { DeleteFinishedRow } from "./delete-finished-row";
import { DeadlineTray } from "./trays/deadline-tray";
import { RemindersTray } from "./trays/reminders-tray";
import type { TrayName } from "./trays/tray-name";
import { useEnvelopeActions } from "./use-envelope-actions";

type EnvelopeDetailShellProps = {
  /** An administrator may delete a finished envelope. */
  canDeleteFinished?: boolean;
  envelopeId: string;
  initialState?: "error" | "not-found";
  /** When the page was rendered (ms): one clock for server and browser. */
  now?: number;
  /**
   * Who sent it, when an administrator is looking at another member's
   * envelope. They can read it, download its files and delete it once it
   * is finished; the rest stays with its sender.
   */
  ownerLabel?: string;
  record?: EnvelopeDetailData;
};

/**
 * The envelope page. One job: where does this
 * stand, and what do I do next? With the document itself beside it.
 *
 *   header     the title and what it is in a few words
 *   document   the real pages, each field in its signer's colour, filled
 *              or not; a phone keeps it behind "View document"
 *   status     the status in a word and a sentence, how far the signing
 *              has got, the one next step and "More" for the rest
 *   signers    who signs, in order, as steps: whose turn it is, whether
 *              they have opened it, when they were reminded
 *   timing     while it is out: deadline and reminders, changeable
 *   activity   the latest three things that happened; the rest on request
 *   details    IDs and exact dates, folded away
 *
 * Every management action opens its own tray with one task.
 */
export function EnvelopeDetailShell({
  canDeleteFinished = false,
  envelopeId,
  initialState,
  now,
  ownerLabel,
  record,
}: EnvelopeDetailShellProps) {
  if (initialState === "not-found") {
    return <DetailUnavailable kind="not-found" />;
  }

  if (initialState === "error" || !record) {
    return <DetailUnavailable kind="error" />;
  }

  return (
    <EnvelopeDetail
      canDeleteFinished={canDeleteFinished}
      envelopeId={envelopeId}
      now={now}
      ownerLabel={ownerLabel}
      record={record}
    />
  );
}

function EnvelopeDetail({
  canDeleteFinished,
  envelopeId,
  now: providedNow,
  ownerLabel,
  record,
}: {
  canDeleteFinished: boolean;
  envelopeId: string;
  now?: number;
  ownerLabel?: string;
  record: EnvelopeDetailData;
}) {
  const router = useRouter();
  const isOwn = ownerLabel === undefined;
  // Back to the list it came from.
  const listHref = isOwn ? "/dashboard" : "/dashboard?view=all";
  const actions = useEnvelopeActions(envelopeId, isOwn ? undefined : listHref);
  // One clock for the whole render: the server's when given.
  const [firstNow] = useState(() => providedNow ?? Date.now());
  const now = providedNow ?? firstNow;
  const model = useMemo(
    () => buildDetailModel(envelopeId, record, now, ownerLabel),
    [envelopeId, record, now, ownerLabel],
  );
  const [openTray, setOpenTray] = useState<TrayName>(null);
  const [correcting, setCorrecting] = useState<CorrectableSigner | null>(null);
  const [savedTemplateName, setSavedTemplateName] = useState<string | null>(
    null,
  );
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const documentTriggerRef = useRef<HTMLButtonElement | null>(null);
  const isLarge = useMediaQuery("(min-width: 1024px)");
  const [documentOpen, setDocumentOpen] = useState(false);
  const [hasOpenedDocument, setHasOpenedDocument] = useState(false);
  const [page, setPage] = useState(1);
  const [pinnedSigner, setPinnedSigner] = useState<number | null>(null);
  const [hoverSigner, setHoverSigner] = useState<number | null>(null);
  const activeSigner = hoverSigner ?? pinnedSigner;

  // The PDF loads where the document is on screen: always on a wide
  // screen, on a phone once its tray has been opened.
  const source = useEnvelopePdf(model, isLarge || hasOpenedDocument);
  const status = record.status;
  const suggestTemplate =
    isOwn && status === "completed" && record.signers.length > 0;
  const showDeleteFinished =
    canDeleteFinished &&
    (status === "completed" || status === "declined" || status === "voided");

  const trayProps = (name: Exclude<TrayName, null>) => ({
    onOpenChange: (open: boolean) => setOpenTray(open ? name : null),
    open: openTray === name,
  });

  return (
    <div className="section-stack">
      <div className="flex flex-col gap-4 sm:gap-5">
        <BackLink
          href={listHref}
          label={isOwn ? "Documents" : "All envelopes"}
        />
        <DetailHeader model={model} />
      </div>

      {/*
       * From 1024px: the document on the left (it stays in view while the
       * story scrolls) and the story on the right. Below that the story
       * comes first and the document waits behind "View document".
       */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_25rem] xl:gap-10">
        <div className="hidden min-w-0 lg:sticky lg:top-6 lg:block">
          <DocumentViewer
            activeSigner={activeSigner}
            model={model}
            morph={isLarge}
            onActiveSignerChange={setPinnedSigner}
            onPageChange={setPage}
            page={page}
            pinnedSigner={pinnedSigner}
            source={source}
            variant="desk"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-4">
            <StatusCard
              actions={actions}
              model={model}
              moreRef={moreRef}
              onOpenTray={setOpenTray}
            />
            <div className="lg:hidden">
              <ViewDocumentRow
                model={model}
                morph={!isLarge}
                onOpen={() => {
                  setHasOpenedDocument(true);
                  setDocumentOpen(true);
                }}
                triggerRef={documentTriggerRef}
              />
            </div>
          </div>

          <People
            activeSigner={activeSigner}
            model={model}
            onCorrect={(node) => {
              setCorrecting({
                email: node.signer.email,
                id: node.signer.id,
                name: node.signer.name,
                order: node.signer.order,
              });
              setOpenTray("correct");
            }}
            onHoverSigner={isLarge ? setHoverSigner : undefined}
          />

          {status === "sent" ? (
            <TimingCard model={model} onOpenTray={setOpenTray} />
          ) : null}

          {suggestTemplate ? (
            <TemplateSuggestion
              onSave={() => setOpenTray("template")}
              savedTemplateName={savedTemplateName}
            />
          ) : null}

          <Activity now={now} timeline={record.timeline} />

          <DetailsDisclosure
            model={model}
            onExport={actions.exportAuditTrail}
          />

          {showDeleteFinished ? (
            <DeleteFinishedRow
              onDelete={() => setOpenTray("delete-finished")}
            />
          ) : null}
        </div>
      </div>

      <DocumentTray
        activeSigner={pinnedSigner}
        model={model}
        onActiveSignerChange={setPinnedSigner}
        onOpenChange={setDocumentOpen}
        onPageChange={setPage}
        open={documentOpen && !isLarge}
        page={page}
        returnFocusRef={documentTriggerRef}
        source={source}
      />

      {status === "sent" ? (
        <>
          <DeadlineTray
            {...trayProps("deadline")}
            expired={model.isExpired}
            onConfirm={actions.changeDeadline}
            returnFocusRef={moreRef}
          />
          <RemindersTray
            {...trayProps("reminders")}
            initialIntervalDays={record.reminderIntervalDays ?? null}
            onConfirm={actions.changeReminders}
            returnFocusRef={moreRef}
          />
          <CorrectSignerTray
            {...trayProps("correct")}
            onConfirm={actions.correctSigner}
            signer={correcting}
          />
          <VoidEnvelopeTray
            {...trayProps("void")}
            onConfirm={actions.voidEnvelope}
            reasonRequired={record.part11}
          />
        </>
      ) : null}

      {showDeleteFinished ? (
        <DeleteFinishedTray
          {...trayProps("delete-finished")}
          onConfirm={actions.deleteFinished}
          reasonRequired={record.part11}
        />
      ) : null}

      {status === "draft" ? (
        <DeleteDraftTray
          {...trayProps("delete")}
          onConfirm={actions.deleteDraft}
        />
      ) : (
        <CopyDraftTray
          {...trayProps("copy")}
          onConfirm={actions.copyToDraft}
          returnFocusRef={moreRef}
        />
      )}

      {record.signers.length > 0 ? (
        <SaveTemplateDialog
          {...trayProps("template")}
          envelopeId={envelopeId}
          initialName={record.title}
          onSaved={(templateName) => {
            setOpenTray(null);

            if (suggestTemplate) {
              // The suggestion card turns into the confirmation in place.
              setSavedTemplateName(templateName);
              return;
            }

            toast.success(`Saved as the template “${templateName}”`, {
              action: {
                label: "View",
                onClick: () => router.push("/templates"),
              },
            });
          }}
          returnFocusRef={suggestTemplate ? undefined : moreRef}
          signers={[...record.signers]
            .sort((left, right) => left.order - right.order)
            .map((signer) => ({ id: signer.id, name: signer.name }))}
        />
      ) : null}
    </div>
  );
}
