"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  CircleAlertIcon,
  FileImportIcon,
  FileTextIcon,
  LinkIcon,
  SettingsIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  Trash2Icon,
  UnlinkIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/components/ui/icons";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import {
  readComposerDraft as readStored,
  writeComposerDraft as writeStored,
  type ComposerSource,
} from "@/lib/composer/drafts";
import {
  ComposerEditor,
  EMPTY_DOCUMENT,
  type FormatState,
} from "@/lib/composer/editor";
import {
  COMPOSER_IMPORT_ACCEPT,
  importDocumentFile,
  isComposerImportable,
  type ImportedDocument,
} from "@/lib/composer/import";
import {
  defaultPageSetup,
  MARGIN_PRESET_LABELS,
  MARGIN_PRESETS,
  matchMarginPreset,
  PAGE_SIZES,
  pageDimensions,
  type MarginPreset,
  type PageSetup,
  type PageSizeId,
} from "@/lib/composer/page";
import {
  ensureComposerStyles,
  measurePageStarts,
  renderDocumentPdf,
} from "@/lib/composer/pdf";
import { STARTERS } from "@/lib/composer/starters";

import { keepSelection } from "./composer-controls";
import { ComposerContextMenu } from "./composer-context-menu";
import { ComposerToolbar } from "./composer-toolbar";

export type { ComposerSource };

export type ComposerResult = {
  file: File;
  pageCount: number;
  source: ComposerSource;
};

export type DocumentComposerProps = {
  /** What the primary button says: "Continue", "Use this document". */
  confirmLabel: string;
  /** A document to open: an import, or the one being edited again. */
  initial?: ComposerSource | null;
  /** What an import couldn't bring across, said once at the top. */
  notes?: string[];
  onClose: () => void;
  onConfirm: (result: ComposerResult) => Promise<void> | void;
  /** Where the draft is kept on this device between visits. */
  storageKey: string;
};

const PX_PER_PT = 4 / 3;
const ZOOMS = [0.5, 0.75, 0.9, 1, 1.25, 1.5, 2];
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const EMPTY_STATE: FormatState = {
  align: "left",
  block: "p",
  bold: false,
  canRedo: false,
  canUndo: false,
  code: false,
  color: "#1f1f1f",
  fontFamily: "Arial",
  fontSizePt: 11,
  hasSelection: false,
  highlight: null,
  inTable: false,
  italic: false,
  lineHeight: 1.15,
  link: null,
  list: null,
  listStyle: null,
  spaceAfter: false,
  spaceBefore: false,
  strike: false,
  subscript: false,
  superscript: false,
  tableBorders: true,
  tableHeader: false,
  underline: false,
};

function fileSafeName(title: string) {
  return (title.trim() || "Document")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 120);
}

export default function DocumentComposer({
  confirmLabel,
  initial = null,
  notes = [],
  onClose,
  onConfirm,
  storageKey,
}: DocumentComposerProps) {
  const start = useMemo<ComposerSource>(() => {
    if (initial) return initial;
    const stored =
      typeof window === "undefined" ? null : readStored(storageKey);
    return (
      stored ?? { html: EMPTY_DOCUMENT, page: defaultPageSetup(), title: "" }
    );
    // Read once, when the composer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [title, setTitle] = useState(start.title);
  const [page, setPage] = useState<PageSetup>(start.page);
  // On a narrow screen the page opens scaled to fit, like a phone's
  // word processor; elsewhere at 100%.
  const [zoom, setZoom] = useState(() => {
    const pageWidthPx = pageDimensions(start.page).width * PX_PER_PT;
    const available =
      typeof window === "undefined" ? pageWidthPx : window.innerWidth - 32;
    return available < pageWidthPx
      ? Math.max(0.3, Math.floor((available / pageWidthPx) * 100) / 100)
      : 1;
  });
  const [state, setState] = useState<FormatState>(EMPTY_STATE);
  const [editor, setEditor] = useState<ComposerEditor | null>(null);
  const [empty, setEmpty] = useState(true);
  const [counts, setCounts] = useState({ characters: 0, words: 0 });
  const [pages, setPages] = useState<{ count: number; starts: number[] }>({
    count: 1,
    starts: [],
  });
  const [saved, setSaved] = useState<"idle" | "saved" | "failed">("idle");
  const [visibleNotes, setVisibleNotes] = useState(notes);
  const [busy, setBusy] = useState<null | "import" | "render">(null);
  const [linkEditor, setLinkEditor] = useState<{
    href: string;
    rect: DOMRect;
    text: string;
  } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const editorInstance = useRef<ComposerEditor | null>(null);
  const saveTimer = useRef<number | null>(null);
  const measureTimer = useRef<number | null>(null);
  const latest = useRef({ page, storageKey, title, zoom });

  useLayoutEffect(() => {
    latest.current = { page, storageKey, title, zoom };
  });

  const { height: pageHeightPt, width: pageWidthPt } = pageDimensions(page);
  const contentHeightPx =
    (pageHeightPt - page.margins.top - page.margins.bottom) * PX_PER_PT;

  useLayoutEffect(() => {
    ensureComposerStyles();
  }, []);

  // Keep the page under the composer from scrolling.
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const instance = editorInstance.current;
      if (!instance) return;
      const {
        page: currentPage,
        storageKey: key,
        title: currentTitle,
      } = latest.current;
      setSaved(
        writeStored(key, {
          html: instance.getHtml(),
          page: currentPage,
          title: currentTitle,
        })
          ? "saved"
          : "failed",
      );
    }, 600);
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (measureTimer.current) window.clearTimeout(measureTimer.current);
    measureTimer.current = window.setTimeout(() => {
      const root = editorRef.current;
      if (!root) return;
      const { page: currentPage, zoom: currentZoom } = latest.current;
      const result = measurePageStarts(root, currentPage, currentZoom);
      setPages({ count: result.pageCount, starts: result.pageStarts });
    }, 220);
  }, []);

  const refreshCounts = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;
    const text = root.innerText ?? "";
    setCounts({
      characters: text.replace(/\n/g, "").length,
      words: (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length,
    });
  }, []);

  const openLinkEditor = useCallback(() => {
    const instance = editorInstance.current;
    if (!instance) return;
    instance.focus();
    const rect =
      instance.selectionRect() ?? instance.root.getBoundingClientRect();
    const link = instance.currentLink();
    setLinkEditor({
      href: link?.getAttribute("href") ?? "",
      rect,
      text: link?.textContent ?? instance.selectedText(),
    });
  }, []);

  // Create the editor once the page element exists.
  useLayoutEffect(() => {
    if (!editorRef.current) return;

    const instance = new ComposerEditor(editorRef.current, start.html, {
      onChange: () => {
        setEmpty(instance.isEmpty());
        refreshCounts();
        scheduleSave();
        scheduleMeasure();
      },
      onFilesDropped: (files) => {
        const images = files.filter((file) => file.type.startsWith("image/"));
        const documents = files.filter((file) => isComposerImportable(file));
        if (images.length) void instance.insertImageFiles(images);
        for (const file of documents) {
          void importDocumentFile(file)
            .then((imported) => instance.insertContent(imported.html))
            .catch((error: Error) => toast.error(error.message));
        }
        if (!images.length && !documents.length) {
          toast.error(
            "Drop pictures or documents (.docx, .html, .md, .txt) here.",
          );
        }
      },
      onImageSelect: setImage,
      onLinkShortcut: openLinkEditor,
      onNotice: (message) => toast(message),
      onSelectionChange: () => setState(instance.getState()),
    });

    editorInstance.current = instance;
    setEditor(instance);
    setEmpty(instance.isEmpty());
    setState(instance.getState());
    refreshCounts();
    scheduleMeasure();

    if (instance.isEmpty()) {
      instance.focusEnd();
    }

    return () => {
      instance.destroy();
      editorInstance.current = null;
      setEditor(null);
    };
  }, [
    openLinkEditor,
    refreshCounts,
    scheduleMeasure,
    scheduleSave,
    start.html,
  ]);

  // Fonts arriving late move lines: measure again when they land.
  useEffect(() => {
    const fonts = document.fonts;
    const onDone = () => scheduleMeasure();
    fonts.addEventListener("loadingdone", onDone);
    return () => fonts.removeEventListener("loadingdone", onDone);
  }, [scheduleMeasure]);

  useEffect(() => {
    scheduleMeasure();
    scheduleSave();
  }, [page, zoom, scheduleMeasure, scheduleSave]);

  useEffect(() => {
    scheduleSave();
  }, [title, scheduleSave]);

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (measureTimer.current) window.clearTimeout(measureTimer.current);
    },
    [],
  );

  // Escape lets go of a selected picture.
  useEffect(() => {
    if (!image) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") editorInstance.current?.selectImage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [image]);

  async function handleImport(file: File | null | undefined) {
    if (!file || !editorInstance.current) return;
    setBusy("import");
    try {
      const imported: ImportedDocument = await importDocumentFile(file);
      const instance = editorInstance.current;
      if (instance.isEmpty()) {
        instance.setHtml(imported.html);
        if (imported.page) setPage(imported.page);
        if (!title.trim() && imported.title) setTitle(imported.title);
      } else {
        instance.insertContent(imported.html);
      }
      setVisibleNotes(imported.notes);
      toast.success(`Imported ${file.name}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "That file couldn't be imported.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirm() {
    const instance = editorInstance.current;
    if (!instance || busy) return;

    if (instance.isEmpty()) {
      toast.error("Write or import something first.");
      instance.focusEnd();
      return;
    }

    const finalTitle = title.trim() || "Untitled document";
    if (!title.trim()) setTitle(finalTitle);
    setBusy("render");

    try {
      const html = instance.getHtml();
      const rendered = await renderDocumentPdf({
        html,
        page,
        title: finalTitle,
      });

      if (rendered.bytes.byteLength > MAX_PDF_BYTES) {
        toast.error(
          "This document makes a PDF over 20 MB, usually because of large pictures. Use smaller pictures and try again.",
        );
        return;
      }

      const file = new File(
        [rendered.bytes as BlobPart],
        `${fileSafeName(finalTitle)}.pdf`,
        {
          lastModified: Date.now(),
          type: "application/pdf",
        },
      );
      const source = { html, page, title: finalTitle };
      writeStored(storageKey, source);
      await onConfirm({ file, pageCount: rendered.pageCount, source });
    } catch (error) {
      console.error("The document could not be turned into a PDF.", error);
      toast.error(
        "The PDF couldn't be made. Try again; if it keeps failing, remove pictures one at a time to find the cause.",
      );
    } finally {
      setBusy(null);
    }
  }

  function applyStarter(html: string) {
    editorInstance.current?.setHtml(html);
    editorInstance.current?.focusEnd();
  }

  const zoomOut = [...ZOOMS].reverse().find((step) => step < zoom - 0.001);
  const zoomIn = ZOOMS.find((step) => step > zoom + 0.001);
  const sheetStyle = {
    "--composer-zoom": zoom,
    paddingBottom: page.margins.bottom * PX_PER_PT,
    paddingLeft: page.margins.left * PX_PER_PT,
    paddingRight: page.margins.right * PX_PER_PT,
    paddingTop: page.margins.top * PX_PER_PT,
    width: pageWidthPt * PX_PER_PT,
    minHeight: Math.max(pageHeightPt, pageHeightPt * pages.count) * PX_PER_PT,
    zoom,
  } as CSSProperties;

  return createPortal(
    <div
      aria-label="Document editor"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-(--desk) text-(--fg)"
      role="dialog"
    >
      <input
        accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
        className="sr-only"
        multiple
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length)
            void editorInstance.current?.insertImageFiles(files);
        }}
        ref={imageInputRef}
        tabIndex={-1}
        type="file"
      />
      <input
        accept={COMPOSER_IMPORT_ACCEPT}
        className="sr-only"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void handleImport(file);
        }}
        ref={importInputRef}
        tabIndex={-1}
        type="file"
      />

      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-(--divider) bg-(--paper) px-2 sm:gap-3 sm:px-4">
        <IconButton
          aria-label="Close editor (your draft is kept)"
          onClick={onClose}
          size="sm"
          tooltip="Close · draft is kept on this device"
        >
          <XIcon />
        </IconButton>
        <span
          aria-hidden="true"
          className="hidden size-8 shrink-0 items-center justify-center rounded-[0.5rem] bg-(--accent-soft) text-(--accent-ink) sm:flex"
        >
          <FileTextIcon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            aria-label="Document title"
            className="h-7 w-full max-w-md min-w-0 truncate rounded-[0.375rem] bg-transparent px-1.5 text-[0.9375rem] font-semibold tracking-[-0.01em] text-(--fg) outline-none placeholder:text-(--placeholder) hover:bg-(--hover) focus:bg-(--surface) focus:shadow-(--focus-ring-input)"
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                editorInstance.current?.focus();
              }
            }}
            placeholder="Untitled document"
            ref={titleRef}
            value={title}
          />
          <span
            aria-live="polite"
            className="truncate px-1.5 text-[0.75rem] leading-4 text-(--tertiary)"
          >
            {saved === "failed"
              ? "Couldn’t save a copy on this device"
              : saved === "saved"
                ? "Draft saved on this device"
                : "Drafts are kept on this device"}
          </span>
        </div>

        <Button
          className="max-sm:hidden"
          disabled={busy !== null}
          loading={busy === "import"}
          onClick={() => importInputRef.current?.click()}
          size="sm"
          variant="ghost"
        >
          <FileImportIcon aria-hidden="true" />
          Import
        </Button>
        <IconButton
          aria-label="Import a document"
          className="sm:hidden"
          disabled={busy !== null}
          onClick={() => importInputRef.current?.click()}
          size="sm"
        >
          <FileImportIcon />
        </IconButton>
        <PageSetupButton onChange={setPage} value={page} />
        <Button
          disabled={busy !== null}
          loading={busy === "render"}
          onClick={() => void handleConfirm()}
          size="sm"
        >
          {busy === "render" ? "Making the PDF…" : confirmLabel}
        </Button>
      </header>

      <ComposerToolbar
        actions={{
          onImage: () => imageInputRef.current?.click(),
          onLink: openLinkEditor,
        }}
        editor={editor}
        state={state}
      />

      {visibleNotes.length ? (
        <div
          className="flex items-start gap-3 border-b border-(--divider) bg-(--warning-soft) px-4 py-2.5 text-[0.8125rem] leading-5 text-(--fg)"
          role="status"
        >
          <CircleAlertIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-(--warning)"
          />
          <p className="flex-1">
            <span className="font-medium">
              Imported, with a few things left out.{" "}
            </span>
            {visibleNotes.join(" ")}
          </p>
          <button
            className="rounded-[0.375rem] px-2 py-0.5 text-[0.8125rem] font-medium text-(--secondary-strong) outline-none hover:bg-(--hover) focus-visible:shadow-(--focus-ring)"
            onClick={() => setVisibleNotes([])}
            type="button"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* The page */}
      <ComposerContextMenu
        editor={editor}
        onImage={() => imageInputRef.current?.click()}
        onLink={openLinkEditor}
        readState={() => editorInstance.current?.getState() ?? null}
      >
        <div
          className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files"))
              event.preventDefault();
          }}
          onDrop={(event) => {
            // Drops outside the sheet land at the end of the document.
            if (
              !editorRef.current?.contains(event.target as Node) &&
              event.dataTransfer.files.length
            ) {
              event.preventDefault();
              editorInstance.current?.focusEnd();
              const files = Array.from(event.dataTransfer.files);
              const images = files.filter((file) =>
                file.type.startsWith("image/"),
              );
              if (images.length)
                void editorInstance.current?.insertImageFiles(images);
              const documents = files.filter((file) =>
                isComposerImportable(file),
              );
              for (const file of documents) void handleImport(file);
            }
          }}
          onMouseDown={(event) => {
            // A click on the desk puts the caret at the end, like a page.
            if (event.target === event.currentTarget) {
              event.preventDefault();
              editorInstance.current?.focusEnd();
            }
          }}
          onScroll={() => {
            if (linkEditor) setLinkEditor(null);
          }}
          ref={scrollRef}
        >
          <div className="flex min-w-fit justify-center px-4 py-4 sm:px-10 sm:py-10">
            <div
              className="relative shrink-0 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_3px_rgb(0_0_0/0.08),0_12px_32px_-12px_rgb(0_0_0/0.25)]"
              style={sheetStyle}
            >
              {/* Page boundaries, measured from the real layout. */}
              {pages.starts.map((startY, index) => (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                  key={`${index}-${startY}`}
                  style={{ top: page.margins.top * PX_PER_PT + startY - 1 }}
                >
                  <div className="h-0 flex-1 border-t border-dashed border-[#c4c7cc]" />
                  <span className="absolute -right-2 translate-x-full rounded-full bg-(--paper) px-2 py-0.5 text-[0.6875rem] font-medium tabular-nums text-(--secondary) shadow-(--shadow-xs) max-sm:hidden">
                    {index + 2}
                  </span>
                </div>
              ))}
              <span
                aria-hidden="true"
                className="absolute top-3 -right-2 translate-x-full rounded-full bg-(--paper) px-2 py-0.5 text-[0.6875rem] font-medium tabular-nums text-(--secondary) shadow-(--shadow-xs) max-sm:hidden"
              >
                1
              </span>

              <div
                aria-label="Document"
                className="composer-doc composer-editing relative"
                ref={editorRef}
                style={{ minHeight: contentHeightPx }}
                suppressContentEditableWarning
              />

              {empty && editor ? (
                <div
                  className="pointer-events-none absolute right-0 left-0"
                  style={{
                    top: page.margins.top * PX_PER_PT,
                    paddingLeft: page.margins.left * PX_PER_PT,
                    paddingRight: page.margins.right * PX_PER_PT,
                  }}
                >
                  <p
                    className="text-[11pt] text-[#9aa0a6]"
                    style={{ fontFamily: "Arial, sans-serif" }}
                  >
                    Start typing, paste from anywhere, or drop in a document…
                  </p>
                  <div
                    className="pointer-events-auto mt-8 flex flex-col gap-2"
                    style={{ zoom: 1 / zoom }}
                  >
                    <p className="text-[0.75rem] font-medium tracking-wide text-[#80868b] uppercase">
                      Or start from
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {STARTERS.map((starter) => (
                        <button
                          className="flex w-48 flex-col items-start gap-0.5 rounded-(--radius-well) border border-[#dadce0] bg-white p-3 text-left outline-none transition-[border-color,box-shadow,translate] duration-(--dur-hover) ease-(--ease-out) hover:-translate-y-0.5 hover:border-[#bdc1c6] hover:shadow-[0_4px_14px_-6px_rgb(0_0_0/0.25)] focus-visible:shadow-(--focus-ring)"
                          key={starter.id}
                          onClick={() => applyStarter(starter.html)}
                          onMouseDown={keepSelection}
                          type="button"
                        >
                          <span className="text-[0.8125rem] font-semibold text-[#1f1f1f]">
                            {starter.label}
                          </span>
                          <span className="text-[0.75rem] leading-4 text-[#5f6368]">
                            {starter.description}
                          </span>
                        </button>
                      ))}
                      <button
                        className="flex w-48 flex-col items-start gap-0.5 rounded-(--radius-well) border border-dashed border-[#bdc1c6] bg-white p-3 text-left outline-none transition-[border-color] duration-(--dur-hover) hover:border-(--accent) focus-visible:shadow-(--focus-ring)"
                        onClick={() => importInputRef.current?.click()}
                        onMouseDown={keepSelection}
                        type="button"
                      >
                        <span className="text-[0.8125rem] font-semibold text-[#1f1f1f]">
                          Import a document
                        </span>
                        <span className="text-[0.75rem] leading-4 text-[#5f6368]">
                          Word (.docx), HTML, Markdown or text
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </ComposerContextMenu>

      {/* Status bar */}
      <footer className="flex h-10 shrink-0 items-center gap-3 border-t border-(--divider) bg-(--paper) px-3 text-[0.75rem] text-(--secondary) sm:px-4">
        <span className="tabular-nums">
          {pages.count} {pages.count === 1 ? "page" : "pages"}
        </span>
        <span aria-hidden="true">·</span>
        <span className="tabular-nums">
          {counts.words.toLocaleString()}{" "}
          {counts.words === 1 ? "word" : "words"}
        </span>
        <span aria-hidden="true" className="max-sm:hidden">
          ·
        </span>
        <span className="tabular-nums max-sm:hidden">
          {counts.characters.toLocaleString()} characters
        </span>
        <span className="flex-1" />
        <span className="max-md:hidden">
          Signature fields are placed in the next step
        </span>
        <div className="flex items-center gap-0.5">
          <IconButton
            aria-label="Zoom out"
            disabled={!zoomOut}
            onClick={() => zoomOut && setZoom(zoomOut)}
            size="xs"
          >
            <ZoomOutIcon />
          </IconButton>
          <button
            aria-label="Reset zoom"
            className="w-11 rounded-[0.375rem] py-0.5 text-center font-medium tabular-nums text-(--fg) outline-none hover:bg-(--hover) focus-visible:shadow-(--focus-ring)"
            onClick={() => setZoom(1)}
            type="button"
          >
            {Math.round(zoom * 100)}%
          </button>
          <IconButton
            aria-label="Zoom in"
            disabled={!zoomIn}
            onClick={() => zoomIn && setZoom(zoomIn)}
            size="xs"
          >
            <ZoomInIcon />
          </IconButton>
        </div>
      </footer>

      {linkEditor && editor ? (
        <LinkEditor
          editor={editor}
          initial={linkEditor}
          onClose={() => {
            setLinkEditor(null);
            editor.focus();
          }}
        />
      ) : null}

      {image && editor && image.isConnected ? (
        <ImageControls editor={editor} image={image} zoom={zoom} />
      ) : null}
    </div>,
    document.body,
  );
}

function PageSetupButton({
  onChange,
  value,
}: {
  onChange: (page: PageSetup) => void;
  value: PageSetup;
}) {
  const preset = matchMarginPreset(value.margins);
  const toInches = (pt: number) => Math.round((pt / 72) * 100) / 100;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <SettingsIcon aria-hidden="true" />
          <span className="max-md:hidden">Page setup</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-80 flex-col gap-4"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          <p className="text-[0.8125rem] font-semibold text-(--fg)">
            Paper size
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(PAGE_SIZES) as PageSizeId[]).map((id) => (
              <button
                aria-pressed={value.size === id}
                className={cn(
                  "flex flex-col items-start rounded-[0.625rem] border px-2.5 py-2 text-left outline-none transition-colors duration-(--dur-hover) focus-visible:shadow-(--focus-ring)",
                  value.size === id
                    ? "border-(--accent) bg-(--accent-softer)"
                    : "border-(--border) hover:border-(--border-hover)",
                )}
                key={id}
                onClick={() => onChange({ ...value, size: id })}
                type="button"
              >
                <span className="text-[0.8125rem] font-medium">
                  {PAGE_SIZES[id].label}
                </span>
                <span className="text-[0.6875rem] text-(--secondary)">
                  {PAGE_SIZES[id].detail}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[0.8125rem] font-semibold text-(--fg)">
            Orientation
          </p>
          <Segmented
            aria-label="Orientation"
            items={[
              { label: "Portrait", value: "portrait" },
              { label: "Landscape", value: "landscape" },
            ]}
            onValueChange={(orientation) =>
              onChange({
                ...value,
                orientation: orientation as PageSetup["orientation"],
              })
            }
            value={value.orientation}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[0.8125rem] font-semibold text-(--fg)">Margins</p>
          <div className="flex flex-col gap-1">
            {(Object.keys(MARGIN_PRESETS) as MarginPreset[]).map((name) => (
              <button
                aria-pressed={preset === name}
                className={cn(
                  "flex h-8 items-center justify-between rounded-[0.5rem] px-2.5 text-[0.8125rem] outline-none transition-colors duration-(--dur-hover) focus-visible:shadow-(--focus-ring)",
                  preset === name
                    ? "bg-(--accent-softer) font-medium text-(--accent-ink)"
                    : "hover:bg-(--hover)",
                )}
                key={name}
                onClick={() =>
                  onChange({ ...value, margins: { ...MARGIN_PRESETS[name] } })
                }
                type="button"
              >
                {MARGIN_PRESET_LABELS[name]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {(["top", "bottom", "left", "right"] as const).map((side) => (
              <label
                className="flex flex-col gap-1 text-[0.6875rem] font-medium text-(--secondary) capitalize"
                key={side}
              >
                {side}
                <input
                  className="h-8 w-full rounded-[0.4375rem] border border-(--border) bg-(--paper) px-1.5 text-center text-[0.8125rem] tabular-nums text-(--fg) outline-none focus:border-(--accent) focus:shadow-(--focus-ring-input)"
                  inputMode="decimal"
                  max={4}
                  min={0}
                  onChange={(event) => {
                    const inches = Number.parseFloat(event.target.value);
                    if (Number.isFinite(inches) && inches >= 0 && inches <= 4) {
                      onChange({
                        ...value,
                        margins: {
                          ...value.margins,
                          [side]: Math.round(inches * 72),
                        },
                      });
                    }
                  }}
                  step={0.25}
                  type="number"
                  value={toInches(value.margins[side])}
                />
              </label>
            ))}
          </div>
          <p className="text-[0.6875rem] text-(--tertiary)">
            Margins in inches.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LinkEditor({
  editor,
  initial,
  onClose,
}: {
  editor: ComposerEditor;
  initial: { href: string; rect: DOMRect; text: string };
  onClose: () => void;
}) {
  const [href, setHref] = useState(initial.href);
  const [text, setText] = useState(initial.text);
  const anchor = useRef({ getBoundingClientRect: () => initial.rect });
  const existing = Boolean(initial.href);

  return (
    <Popover onOpenChange={(open) => !open && onClose()} open>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        align="start"
        className="w-80"
        onCloseAutoFocus={(event) => event.preventDefault()}
        side="bottom"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!href.trim()) return;
            onClose();
            editor.setLink(href.trim(), text.trim() || undefined);
          }}
        >
          <label className="flex flex-col gap-1 text-[0.75rem] font-medium text-(--secondary)">
            Text
            <input
              className="h-9 rounded-[0.5rem] border border-(--border) bg-(--paper) px-2.5 text-sm text-(--fg) outline-none focus:border-(--accent) focus:shadow-(--focus-ring-input)"
              onChange={(event) => setText(event.target.value)}
              placeholder="Text to show"
              value={text}
            />
          </label>
          <label className="flex flex-col gap-1 text-[0.75rem] font-medium text-(--secondary)">
            Link
            <input
              autoFocus
              className="h-9 rounded-[0.5rem] border border-(--border) bg-(--paper) px-2.5 text-sm text-(--fg) outline-none focus:border-(--accent) focus:shadow-(--focus-ring-input)"
              inputMode="url"
              onChange={(event) => setHref(event.target.value)}
              placeholder="example.com or name@example.com"
              value={href}
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            {existing ? (
              <Button
                onClick={() => {
                  onClose();
                  editor.removeLink();
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <UnlinkIcon aria-hidden="true" />
                Remove
              </Button>
            ) : (
              <span />
            )}
            <Button disabled={!href.trim()} size="sm" type="submit">
              <LinkIcon aria-hidden="true" />
              {existing ? "Update" : "Apply"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** Resize handle and a small bar for the selected picture. */
function ImageControls({
  editor,
  image,
  zoom,
}: {
  editor: ComposerEditor;
  image: HTMLImageElement;
  zoom: number;
}) {
  const [rect, setRect] = useState(() => image.getBoundingClientRect());
  const drag = useRef<{ startWidth: number; startX: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      setRect(image.getBoundingClientRect());
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [image]);

  const contentWidthPt =
    (editor.root.getBoundingClientRect().width / zoom) * 0.75;
  const align = image.getAttribute("data-align") ?? "inline";
  const setAlign = (value: "left" | "center" | "right") => {
    editor.run(() => {
      image.setAttribute("data-align", value);
    });
  };

  return (
    <>
      <div
        className="fixed z-[65] flex items-center gap-0.5 rounded-[0.625rem] bg-(--paper) p-1 shadow-(--shadow-pop)"
        onMouseDown={keepSelection}
        style={{
          left: Math.max(8, rect.left),
          top: Math.max(64, rect.top - 44),
        }}
      >
        {(
          [
            ["S", 0.25],
            ["M", 0.5],
            ["L", 0.75],
            ["Full", 1],
          ] as const
        ).map(([label, share]) => (
          <button
            aria-label={`${label === "Full" ? "Full width" : `${Math.round(share * 100)}% width`}`}
            className="h-7 min-w-7 rounded-[0.4375rem] px-1.5 text-[0.75rem] font-medium text-(--secondary-strong) outline-none hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring)"
            key={label}
            onClick={() => editor.setImageWidth(image, contentWidthPt * share)}
            type="button"
          >
            {label}
          </button>
        ))}
        <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-(--divider)" />
        {(
          [
            ["left", <TextAlignLeftIcon key="l" />],
            ["center", <TextAlignCenterIcon key="c" />],
            ["right", <TextAlignRightIcon key="r" />],
          ] as const
        ).map(([value, icon]) => (
          <IconButton
            aria-label={`Align picture ${value}`}
            aria-pressed={align === value}
            className={cn(
              align === value && "bg-(--accent-soft) text-(--accent-ink)",
            )}
            key={value}
            onClick={() => setAlign(value)}
            size="xs"
            tooltipSide="top"
          >
            {icon}
          </IconButton>
        ))}
        <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-(--divider)" />
        <IconButton
          aria-label="Delete picture"
          onClick={() => editor.removeImage(image)}
          size="xs"
          tooltipSide="top"
        >
          <Trash2Icon />
        </IconButton>
      </div>
      <div
        aria-label="Resize picture"
        className="fixed z-[65] size-3.5 cursor-nwse-resize rounded-[3px] border-2 border-white bg-(--accent) shadow-(--shadow-sm)"
        onPointerDown={(event) => {
          event.preventDefault();
          (event.target as HTMLElement).setPointerCapture(event.pointerId);
          drag.current = {
            startWidth: image.getBoundingClientRect().width / zoom,
            startX: event.clientX,
          };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const width = Math.max(
            24,
            drag.current.startWidth +
              (event.clientX - drag.current.startX) / zoom,
          );
          editor.previewImageWidth(
            image,
            Math.min(width * 0.75, contentWidthPt),
          );
        }}
        onPointerUp={() => {
          if (!drag.current) return;
          drag.current = null;
          editor.setImageWidth(image, Number.parseFloat(image.style.width));
        }}
        role="slider"
        aria-valuenow={Math.round(rect.width)}
        style={{ left: rect.right - 7, top: rect.bottom - 7 }}
      />
    </>
  );
}
