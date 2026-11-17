"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { rememberSendTo, useSendTo } from "@/components/contacts/contact-data";
import { ContactAvatar } from "@/components/contacts/contact-parts";
import {
  LazyDocumentComposer,
  type ComposerResult,
  type ComposerSource,
} from "@/components/composer/lazy-composer";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { XIcon } from "@/components/ui/icons";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { clearComposerDraft } from "@/lib/composer/drafts";
import {
  COMPOSER_IMPORT_ACCEPT,
  importDocumentFile,
  isComposerImportable,
} from "@/lib/composer/import";
import { defaultPageSetup } from "@/lib/composer/page";
import { cacheDraftPdfBlob } from "@/lib/draft-pdf-cache";
import {
  renderPdfThumbnail,
  uploadEnvelopeThumbnail,
} from "@/lib/pdf-thumbnail";
import {
  describePdfPreviewFailure,
  PREVIEW_UNAVAILABLE_MESSAGE,
} from "@/lib/pdf-preview-error";
import { assertPdfPreviewRenderable } from "@/lib/pdfjs-client";
import { type CreateEnvelopeResponse } from "@/lib/schemas/envelope";

import { FlowActions, FlowFrame, NextLabel } from "./flow/flow-frame";
import {
  InlineTitle,
  UploadDropSheet,
  type DropSheetPhase,
  type UploadSummary,
} from "./flow/upload-drop-sheet";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const COMPOSER_DRAFT_KEY = "envelope-new";

type UploadErrorCode = "invalid-type" | "preview-unavailable" | "too-large";

const errorMessageMap: Record<UploadErrorCode, string> = {
  "invalid-type":
    "That kind of file can't be used. Add a PDF or a Word document (.docx), or write the document here.",
  "preview-unavailable": PREVIEW_UNAVAILABLE_MESSAGE,
  "too-large":
    "That file is over the 20 MB limit. Compress it or split it into smaller PDFs, then try again.",
};

const knownTitleSuggestions: Record<string, string> = {
  "nda-clientbravo-2026.pdf": "NDA - Client Bravo",
  "nda-client-bravo-2026.pdf": "NDA - Client Bravo",
  "vendor-agreement-two-signer.pdf": "Vendor agreement - two signer flow",
};

function formatFileSize(sizeInBytes: number) {
  const sizeInMegabytes = sizeInBytes / (1024 * 1024);

  if (sizeInMegabytes >= 1) {
    return `${sizeInMegabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
}

function makeTitleSuggestion(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTitleSuggestion(fileName: string): string {
  const normalizedName = fileName.toLowerCase();
  const knownTitleSuggestion = knownTitleSuggestions[normalizedName];

  if (knownTitleSuggestion) {
    return knownTitleSuggestion;
  }

  return makeTitleSuggestion(fileName);
}

function isClientVisiblePdf(file: File): boolean {
  const normalizedName = file.name.toLowerCase();

  return (
    normalizedName.endsWith(".pdf") &&
    (file.type.length === 0 || file.type === "application/pdf")
  );
}

// Sends the PDF straight to Vercel Blob with a signed URL from /api/uploads,
// then tells the app where it is. The Blob SDK is loaded only when used.
async function createDraftFromDirectUpload(input: {
  file: File;
  title: string;
  uploadPrefix: string;
}) {
  const { uploadPresigned } = await import("@vercel/blob/client");
  const uploadKey = `${input.uploadPrefix}${crypto.randomUUID()}.pdf`;

  await uploadPresigned(uploadKey, input.file, {
    access: "private",
    contentType: "application/pdf",
    handleUploadUrl: "/api/uploads",
  });

  return fetch("/api/envelopes", {
    body: JSON.stringify({
      filename: input.file.name,
      title: input.title,
      uploadKey,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function createDraftFromForm(input: { file: File; title: string }) {
  const formData = new FormData();

  formData.append("file", input.file);
  formData.append("title", input.title);

  return fetch("/api/envelopes", {
    body: formData,
    method: "POST",
  });
}

type UploadShellProps = {
  /**
   * Where this user's browser may upload directly, ending in a slash, or
   * null when uploads go through the app.
   */
  directUploadPrefix?: string | null;
};

export function UploadShell({ directUploadPrefix = null }: UploadShellProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [autoFilledTitle, setAutoFilledTitle] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<DropSheetPhase>("idle");
  const [refusals, setRefusals] = useState(0);
  // Started from a contact's "Send them a document".
  const sendTo = useSendTo();
  // dragenter and dragleave fire for every child the pointer crosses; count
  // them so the sheet only lets go when the file really leaves the page.
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // The title field moves beside the page once there is a file; if it had
  // focus, the inline one takes it so typing carries on.
  const titleFieldRef = useRef<HTMLInputElement | null>(null);
  const inlineTitleRef = useRef<HTMLInputElement | null>(null);
  const titleHadFocusRef = useRef(false);
  // The first page of the chosen file as a small picture: shown beside the
  // file name here, then saved as the envelope's dashboard thumbnail.
  const thumbnailRef = useRef<Promise<Blob | null> | null>(null);
  // The document editor: open with what it should show, and the document
  // behind the chosen PDF when it was written here (so it can be edited).
  const [composer, setComposer] = useState<{
    initial: ComposerSource | null;
    notes: string[];
  } | null>(null);
  const [composedSource, setComposedSource] = useState<ComposerSource | null>(
    null,
  );
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function startThumbnail(file: File | null) {
    setPreviewUrl(null);

    if (!file) {
      thumbnailRef.current = null;
      return;
    }

    const thumbnail = file
      .arrayBuffer()
      .then((buffer) => renderPdfThumbnail(new Uint8Array(buffer)))
      .catch(() => null);

    thumbnailRef.current = thumbnail;

    void thumbnail.then((blob) => {
      if (blob && thumbnailRef.current === thumbnail) {
        setPreviewUrl(URL.createObjectURL(blob));
      }
    });
  }

  function resetSelection(clearTitle: boolean) {
    startThumbnail(null);
    setComposedSource(null);
    setSummary(null);
    setErrorMessage(null);
    setIsCreatingDraft(false);
    setPhase("idle");

    if (clearTitle) {
      setTitle((currentTitle) =>
        autoFilledTitle && currentTitle === autoFilledTitle ? "" : currentTitle,
      );
    }

    setAutoFilledTitle(null);
  }

  async function parseResponse<T>(
    response: Response,
  ): Promise<{ data: T | null; error: string | null }> {
    const payload = (await response.json().catch(() => null)) as
      { error?: string } | T | null;

    if (!response.ok) {
      return {
        data: null,
        error:
          payload && typeof payload === "object" && "error" in payload
            ? (payload.error ?? "Something went wrong. Please try again.")
            : "Something went wrong. Please try again.",
      };
    }

    return {
      data: payload as T,
      error: null,
    };
  }

  async function openImported(file: File) {
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const imported = await importDocumentFile(file);

      setComposer({
        initial: {
          html: imported.html,
          page: imported.page ?? defaultPageSetup(),
          title: title.trim() || imported.title || "",
        },
        notes: imported.notes,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : errorMessageMap["invalid-type"],
      );
      setRefusals((count) => count + 1);
    } finally {
      setIsImporting(false);
    }
  }

  function handleComposed(result: ComposerResult) {
    setComposer(null);
    beginUpload(result.file);
    setComposedSource(result.source);
    setTitle(result.source.title);
    setAutoFilledTitle(null);
  }

  function beginUpload(file: File) {
    if (!isClientVisiblePdf(file) && isComposerImportable(file)) {
      void openImported(file);
      return;
    }

    if (!isClientVisiblePdf(file)) {
      setErrorMessage(errorMessageMap["invalid-type"]);
      setRefusals((count) => count + 1);
      setSummary(null);
      startThumbnail(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(errorMessageMap["too-large"]);
      setRefusals((count) => count + 1);
      setSummary(null);
      startThumbnail(null);
      return;
    }

    setComposedSource(null);
    titleHadFocusRef.current =
      document.activeElement !== null &&
      document.activeElement === titleFieldRef.current;
    startThumbnail(file);

    const titleSuggestion = getTitleSuggestion(file.name);

    setSummary({
      file,
      fileName: file.name,
      sizeLabel: formatFileSize(file.size),
    });
    setErrorMessage(null);

    if (title.trim().length === 0) {
      setTitle(titleSuggestion);
      setAutoFilledTitle(titleSuggestion);
    }
  }

  function handleFileSelection(file: File | null) {
    dragDepthRef.current = 0;
    setIsDragActive(false);

    if (!file) {
      return;
    }

    beginUpload(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    handleFileSelection(selectedFile);
    event.target.value = "";
  }

  function handleRemoveFile() {
    resetSelection(true);
  }

  useEffect(() => {
    if (summary && titleHadFocusRef.current) {
      titleHadFocusRef.current = false;
      inlineTitleRef.current?.focus();
    }
  }, [summary]);

  function handleTitleChange(nextTitle: string) {
    setTitle(nextTitle);

    if (autoFilledTitle && nextTitle !== autoFilledTitle) {
      setAutoFilledTitle(null);
    }
  }

  function openFilePicker() {
    if (isCreatingDraft) {
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleContinue() {
    if (isCreatingDraft || !summary || title.trim().length === 0) {
      return;
    }

    setIsCreatingDraft(true);
    setPhase("uploading");
    setErrorMessage(null);

    // Taken now, with the file. The file can still be removed and another
    // chosen while the draft is being created, and that one's picture must
    // not end up on this draft.
    const thumbnailForDraft = thumbnailRef.current;

    try {
      try {
        await assertPdfPreviewRenderable(summary.file);
      } catch (error) {
        console.error(
          "Failed to validate the PDF preview before draft creation.",
          error,
        );
        setErrorMessage(describePdfPreviewFailure(error));
        setRefusals((count) => count + 1);
        setIsCreatingDraft(false);
        setPhase("idle");
        return;
      }

      const draftInput = { file: summary.file, title: title.trim() };
      const response = directUploadPrefix
        ? await createDraftFromDirectUpload({
            ...draftInput,
            uploadPrefix: directUploadPrefix,
          })
        : await createDraftFromForm(draftInput);
      const payload = await parseResponse<CreateEnvelopeResponse>(response);

      if (!payload.data || payload.error) {
        setErrorMessage(
          payload.error ?? "Something went wrong. Please try again.",
        );

        if (response.status === 400) {
          setSummary(null);
          startThumbnail(null);
          setRefusals((count) => count + 1);
        }

        setIsCreatingDraft(false);
        setPhase("idle");
        return;
      }

      if (composedSource) {
        clearComposerDraft(COMPOSER_DRAFT_KEY);
      }

      try {
        await cacheDraftPdfBlob(payload.data.envelopeId, summary.file);
      } catch (error) {
        console.error(
          "Failed to cache the uploaded PDF for local preview.",
          error,
        );
      }

      // Not waited for: the dashboard draws one later if this is lost.
      const createdEnvelopeId = payload.data.envelopeId;

      void thumbnailForDraft?.then((thumbnail) =>
        thumbnail
          ? uploadEnvelopeThumbnail(createdEnvelopeId, thumbnail)
          : false,
      );

      const redirectPath = payload.data.redirectPath;

      setPhase("done");

      startTransition(() => {
        router.push(redirectPath);
      });
    } catch {
      setErrorMessage(
        "The upload did not go through. Check your connection and try again.",
      );
      setIsCreatingDraft(false);
      setPhase("idle");
    }
  }

  const canContinue =
    !isCreatingDraft && summary != null && title.trim().length > 0;
  const hint = !summary
    ? "Add a document to continue"
    : title.trim().length === 0
      ? "Give it a title to continue"
      : phase === "idle"
        ? "Next, choose who signs"
        : null;

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepthRef.current += 1;

        if (!isCreatingDraft) {
          setIsDragActive(true);
        }
      }}
      onDragLeave={() => {
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

        if (dragDepthRef.current === 0) {
          setIsDragActive(false);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        if (isCreatingDraft) {
          dragDepthRef.current = 0;
          setIsDragActive(false);
          return;
        }

        handleFileSelection(event.dataTransfer.files?.[0] ?? null);
      }}
    >
      <input
        accept={`.pdf,application/pdf,${COMPOSER_IMPORT_ACCEPT}`}
        aria-label="Upload PDF or Word document"
        className="sr-only"
        onChange={handleInputChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />
      <FlowFrame
        description="Add a PDF or Word document, or write one here. You'll choose who signs it next."
        footer={
          <FlowActions
            back={{ href: "/dashboard", label: "Cancel" }}
            hint={hint}
            onShortcut={canContinue ? handleContinue : undefined}
            primary={
              <Button
                className="max-sm:min-h-12 max-sm:px-6"
                disabled={!canContinue && !isCreatingDraft}
                loading={isCreatingDraft}
                onClick={handleContinue}
                type="button"
              >
                <NextLabel arrow="->" />
              </Button>
            }
          />
        }
        step={1}
        title="What needs signing?"
      >
        <AnimatePresence initial={false}>
          {sendTo ? (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="-mt-1 overflow-hidden"
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  duration: exitDuration(DUR.move),
                  ease: EASE.exit,
                },
              }}
              initial={{ height: 0, opacity: 0 }}
              key="send-to"
              transition={{ duration: DUR.panel, ease: EASE.out }}
            >
              <div className="mb-1 flex items-center gap-3 rounded-(--radius-well) bg-(--paper) py-2 pr-2 pl-2.5 shadow-(--shadow-card-flat)">
                <ContactAvatar
                  email={sendTo.email}
                  name={sendTo.name}
                  size="md"
                />
                <p className="min-w-0 flex-1 truncate text-sm leading-5 text-(--secondary)">
                  For{" "}
                  <span className="font-medium text-(--fg)">{sendTo.name}</span>
                  <span className="max-sm:hidden">
                    , who will be the first to sign
                  </span>
                </p>
                <IconButton
                  aria-label={`Don’t send this to ${sendTo.name}`}
                  onClick={() => rememberSendTo(null)}
                  size="sm"
                  tooltip="Not for them"
                >
                  <XIcon />
                </IconButton>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <UploadDropSheet
          errorMessage={errorMessage}
          isDragActive={isDragActive}
          isImporting={isImporting}
          onEditDocument={
            composedSource
              ? () => setComposer({ initial: composedSource, notes: [] })
              : undefined
          }
          onOpenFilePicker={openFilePicker}
          onWriteDocument={() => setComposer({ initial: null, notes: [] })}
          onRemoveFile={handleRemoveFile}
          phase={phase}
          previewUrl={previewUrl}
          refusals={refusals}
          summary={summary}
          titleField={
            <FormField
              hint="Signers see it in their email. Leave it empty to use the file name."
              label="Envelope title"
            >
              <Input
                autoComplete="off"
                disabled={isCreatingDraft}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleTitleChange(event.target.value)
                }
                placeholder="e.g., NDA - Client Bravo"
                ref={titleFieldRef}
                value={title}
              />
            </FormField>
          }
          titleInline={
            <InlineTitle
              disabled={isCreatingDraft}
              inputRef={inlineTitleRef}
              onChange={handleTitleChange}
              onEnter={() => void handleContinue()}
              value={title}
            />
          }
        />
        {composer ? (
          <LazyDocumentComposer
            confirmLabel="Continue"
            initial={composer.initial}
            notes={composer.notes}
            onClose={() => setComposer(null)}
            onConfirm={handleComposed}
            storageKey={COMPOSER_DRAFT_KEY}
          />
        ) : null}
        <p className="text-center text-[0.8125rem] leading-5 text-(--secondary)">
          Sending the same document again?{" "}
          <Link
            className="rounded-sm font-medium text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.3)] underline-offset-4 outline-none transition-[text-decoration-color] duration-(--dur-hover) hover:decoration-(--accent-ink) focus-visible:shadow-(--focus-ring)"
            href="/templates"
          >
            Start from a template
          </Link>
        </p>
      </FlowFrame>
    </div>
  );
}
