"use client";

import { Redo2Icon, Undo2Icon } from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { cn } from "@/lib/cn";
import { type PrepareEnvelopeData } from "@/lib/envelopes";
import {
  describeChoiceFieldProblem,
  findChoiceFieldProblem,
} from "@/lib/field-choices";
import { type ReplaceFieldsResponse } from "@/lib/schemas/field";
import { getCachedDraftPdfBlob } from "@/lib/draft-pdf-cache";
import { CanvasShell } from "@/components/layout/canvas-shell";
import { StatusPanel } from "@/components/shared/status-panel";
import { DEFAULT_DOCUMENT_ZOOM_LEVEL } from "@/components/shared/document-viewport";
import { Button } from "@/components/ui/button";
import { useIsApplePlatform, useMediaQuery } from "@/components/ui/hooks";
import { IconButton } from "@/components/ui/icon-button";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { toast } from "@/components/ui/toaster";
import { SimpleTooltip } from "@/components/ui/tooltip";

import { CoachMark } from "./coach-mark";
import { DocumentStage } from "./document-stage";
import { FieldInspector } from "./inspector";
import { MobileBar, PanelTray, ToolsTray } from "./mobile-controls";
import {
  addRadioButton,
  alignFields,
  autosaveDelayMs,
  buildFieldRequest,
  buildLiveFields,
  buildLiveSigners,
  clamp,
  createField,
  deleteFields,
  duplicateFields,
  fieldTools,
  getFieldTool,
  isSameChoice,
  isTextEntryTarget,
  moveFields,
  newLocalId,
  parseJsonResponse,
  patchField,
  reassignFields,
  resizeFieldTo,
  serializeFieldRequest,
  setFieldGeometry,
  setRequired,
  type Alignment,
  type PrepareField,
  type PrepareFieldType,
  type Rect,
  type SaveState,
} from "./model";
import { PagesRail } from "./pages-rail";
import { SaveStatus } from "./save-status";
import { SignersPanel } from "./signers-panel";
import { ToolDock } from "./tool-dock";
import { useFieldHistory } from "./use-field-history";

type PrepareLiveShellProps = {
  envelopeId: string;
  initialState?: "error";
  record?: PrepareEnvelopeData;
};

type PersistFieldsResult = { ok: boolean; redirectPath: string | null };

const COACH_STORAGE_KEY = "signudoc:builder-tip-dismissed";
const BLOCKER_ID = "builder-next-blocker";
/** The floating inspector's width, in px. */
const INSPECTOR_WIDTH = 304;

/** The field a choice problem is about, so the note can take you there. */
function findProblemFieldId(fields: readonly PrepareField[]) {
  const dropdown = fields.find(
    (field) => field.type === "dropdown" && (field.options?.length ?? 0) < 2,
  );

  if (dropdown) {
    return dropdown.id;
  }

  const groupCounts = new Map<string, number>();

  for (const field of fields) {
    if (field.type === "radio" && field.groupId) {
      groupCounts.set(field.groupId, (groupCounts.get(field.groupId) ?? 0) + 1);
    }
  }

  return (
    fields.find(
      (field) =>
        field.type === "radio" &&
        field.groupId &&
        (groupCounts.get(field.groupId) ?? 0) < 2,
    )?.id ?? null
  );
}

function envelopeSteps(envelopeId: string) {
  return [
    "Upload",
    { href: `/envelopes/${envelopeId}/signers`, label: "Signers" },
    "Fields",
    "Review",
  ];
}

export function PrepareLiveShell({
  envelopeId,
  initialState,
  record,
}: PrepareLiveShellProps) {
  if (initialState === "error" || !record) {
    return <PrepareBuilderError envelopeId={envelopeId} />;
  }

  return <PrepareBuilder envelopeId={envelopeId} record={record} />;
}

function PrepareBuilderError({ envelopeId }: { envelopeId: string }) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  return (
    <CanvasShell
      backHref={`/envelopes/${envelopeId}/signers`}
      backLabel="Back"
      currentStep={3}
      nextDisabled
      nextLabel="Next →"
      stepLabel="Step 3 of 4"
      steps={envelopeSteps(envelopeId)}
      title="Document"
    >
      <div className="flex flex-1 items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-8">
        <div className="w-full max-w-xl">
          <StatusPanel
            description="The document or its fields didn't load. Nothing you placed is lost; try again in a moment."
            footer={
              <Button
                loading={isRetrying}
                onClick={() => {
                  setIsRetrying(true);
                  router.refresh();
                  window.setTimeout(() => setIsRetrying(false), 1500);
                }}
              >
                Try again
              </Button>
            }
            title="Couldn't load this document"
            tone="error"
          />
        </div>
      </div>
    </CanvasShell>
  );
}

function readCoachDismissed() {
  try {
    return window.localStorage.getItem(COACH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const subscribeNothing = () => () => {};

function PrepareBuilder({
  envelopeId,
  record,
}: {
  envelopeId: string;
  record: PrepareEnvelopeData;
}) {
  const signers = useMemo(
    () => buildLiveSigners(record.signers),
    [record.signers],
  );
  const [initialFields] = useState(() => buildLiveFields(record.fields));
  const {
    canRedo,
    canUndo,
    commit,
    fields,
    fieldsRef,
    redo,
    replaceFromServer,
    undo,
  } = useFieldHistory(initialFields);

  const [activePage, setActivePage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSignerId, setSelectedSignerId] = useState(
    signers[0]?.id ?? "",
  );
  const [armedTool, setArmedTool] = useState<PrepareFieldType | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedSignature, setSavedSignature] = useState(() =>
    serializeFieldRequest(initialFields),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_DOCUMENT_ZOOM_LEVEL);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isSignersOpen, setIsSignersOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isDockDragging, setIsDockDragging] = useState(false);
  // Remembered per browser; the server never shows the tip.
  const storedCoachDismissed = useSyncExternalStore(
    subscribeNothing,
    readCoachDismissed,
    () => true,
  );
  const [coachDismissedNow, setCoachDismissedNow] = useState(false);
  const coachDismissed = storedCoachDismissed || coachDismissedNow;

  const isLg = useMediaQuery("(min-width: 1024px)", true);
  const isMd = useMediaQuery("(min-width: 768px)", true);
  const mod = useIsApplePlatform() ? "⌘" : "Ctrl";

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const lastSavedSignatureRef = useRef(serializeFieldRequest(initialFields));
  const persistFieldsRef = useRef<
    (next: readonly PrepareField[]) => Promise<PersistFieldsResult>
  >(async () => ({ ok: false, redirectPath: null }));

  /* ---------------------------------------------------------------- */
  /* Derived                                                            */
  /* ---------------------------------------------------------------- */

  const pageCount = record.pages.length;
  const pageRecord =
    record.pages.find((page) => page.pageNumber === activePage) ??
    record.pages[0];
  const pageFields = useMemo(
    () => fields.filter((field) => field.page === activePage),
    [activePage, fields],
  );
  const selection = useMemo(
    () =>
      selectedIds
        .map((id) => pageFields.find((field) => field.id === id))
        .filter((field): field is PrepareField => field !== undefined),
    [pageFields, selectedIds],
  );
  const selectionIds = useMemo(
    () => selection.map((field) => field.id),
    [selection],
  );
  const primary = selection.at(-1) ?? null;
  const primaryGroup = useMemo(
    () =>
      primary ? fields.filter((field) => isSameChoice(primary, field)) : [],
    [fields, primary],
  );
  const selectedSigner =
    signers.find((signer) => signer.id === selectedSignerId) ?? signers[0];
  const missingSignatureSigner = signers.find(
    (signer) =>
      !fields.some(
        (field) => field.signerId === signer.id && field.type === "signature",
      ),
  );
  // A dropdown without choices, or a radio button on its own, can be saved
  // in a draft but not sent.
  const choiceProblem = findChoiceFieldProblem(fields);
  const canContinue = missingSignatureSigner == null && choiceProblem == null;
  const blocker = choiceProblem
    ? describeChoiceFieldProblem(
        choiceProblem,
        signers.find((signer) => signer.id === choiceProblem.signerId)?.name ??
          "a signer",
      )
    : missingSignatureSigner
      ? `${missingSignatureSigner.name} has nowhere to sign yet. Add a signature field for them.`
      : null;
  const showBlocker = blocker !== null && fields.length > 0;
  const problemFieldId = choiceProblem ? findProblemFieldId(fields) : null;
  const shortBlocker = choiceProblem
    ? choiceProblem.kind === "dropdown_options"
      ? "A dropdown needs choices"
      : "A radio button needs a second option"
    : missingSignatureSigner
      ? `${missingSignatureSigner.name.split(" ")[0]} needs a signature`
      : null;
  // Unsaved edits read as "Saving…" from the moment they are made.
  const shownSaveState: SaveState =
    saveState === "error"
      ? "error"
      : saveState === "saving" ||
          serializeFieldRequest(fields) !== savedSignature
        ? "saving"
        : "saved";
  const showCoach =
    !coachDismissed && fields.length === 0 && armedTool === null && isLg;

  /* ---------------------------------------------------------------- */
  /* Document, coach mark, autosave                                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let isActive = true;
    let localDocumentUrl: string | null = null;

    void (async () => {
      try {
        const cachedPdfBlob = await getCachedDraftPdfBlob(envelopeId);

        if (!isActive) {
          return;
        }

        if (cachedPdfBlob) {
          localDocumentUrl = URL.createObjectURL(cachedPdfBlob);
          setDocumentUrl(localDocumentUrl);
          return;
        }
      } catch (error) {
        console.error("Failed to restore the cached draft PDF preview.", error);
      }

      if (isActive) {
        setDocumentUrl(record.pdfUrl);
      }
    })();

    return () => {
      isActive = false;

      if (localDocumentUrl) {
        URL.revokeObjectURL(localDocumentUrl);
      }
    };
  }, [envelopeId, record.pdfUrl]);

  function dismissCoach() {
    setCoachDismissedNow(true);

    try {
      window.localStorage.setItem(COACH_STORAGE_KEY, "1");
    } catch {
      // Private windows: the tip comes back next time, which is fine.
    }
  }

  useEffect(
    () => () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    },
    [],
  );

  async function persistFields(nextFields: readonly PrepareField[]) {
    const requestedSignature = serializeFieldRequest(nextFields);

    setSaveError(null);
    setSaveState("saving");

    let payload: Awaited<
      ReturnType<typeof parseJsonResponse<ReplaceFieldsResponse>>
    >;

    try {
      const response = await fetch(`/api/envelopes/${envelopeId}/fields`, {
        body: JSON.stringify(buildFieldRequest(nextFields)),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });

      payload = await parseJsonResponse<ReplaceFieldsResponse>(response);
    } catch {
      payload = {
        data: null,
        error: "You seem to be offline. Your changes will save when you retry.",
      };
    }

    if (payload.error) {
      setSaveError(payload.error);
      setSaveState("error");
      return { ok: false, redirectPath: null };
    }

    if (serializeFieldRequest(fieldsRef.current) !== requestedSignature) {
      return { ok: false, redirectPath: payload.data?.redirectPath ?? null };
    }

    const savedFields = payload.data?.fields
      ? buildLiveFields(payload.data.fields)
      : [...nextFields];

    lastSavedSignatureRef.current = serializeFieldRequest(savedFields);
    setSavedSignature(lastSavedSignatureRef.current);
    replaceFromServer(savedFields);
    setSaveState("saved");
    setSavedAt(Date.now());

    return { ok: true, redirectPath: payload.data?.redirectPath ?? null };
  }

  useEffect(() => {
    persistFieldsRef.current = persistFields;
  });

  useEffect(() => {
    if (serializeFieldRequest(fields) === lastSavedSignatureRef.current) {
      return;
    }

    if (isInteracting) {
      return;
    }

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      autosaveTimeoutRef.current = null;
      void persistFieldsRef.current(fieldsRef.current);
    }, autosaveDelayMs);

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [fields, fieldsRef, isInteracting]);

  async function handleContinue() {
    if (!canContinue || isContinuing) {
      return;
    }

    setIsContinuing(true);

    try {
      let redirectPath = `/envelopes/${envelopeId}/review`;

      if (serializeFieldRequest(fields) !== lastSavedSignatureRef.current) {
        const saveResult = await persistFields(fields);

        if (!saveResult.ok) {
          return;
        }

        redirectPath = saveResult.redirectPath ?? redirectPath;
      }

      window.location.assign(redirectPath);
    } finally {
      setIsContinuing(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Actions                                                            */
  /* ---------------------------------------------------------------- */

  function armTool(type: PrepareFieldType) {
    setSelectedIds([]);
    setArmedTool((current) => (current === type ? null : type));
    setIsToolsOpen(false);
  }

  function addField(type: PrepareFieldType, pointX: number, pointY: number) {
    const field = createField({
      page: activePage,
      pointX,
      pointY,
      signerId: selectedSigner.id,
      type,
    });

    commit((current) => [...current, field]);
    setSelectedIds([field.id]);

    // On a phone, the fields that need answers open their settings.
    if (!isMd && (type === "dropdown" || type === "radio")) {
      setIsInspectorOpen(true);
    }
  }

  function placeArmed(pointX: number, pointY: number, keepArmed: boolean) {
    if (!armedTool) {
      return;
    }

    addField(armedTool, pointX, pointY);

    if (!keepArmed) {
      setArmedTool(null);
    }
  }

  function dropTool(type: PrepareFieldType, clientX: number, clientY: number) {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const pointX = (clientX - rect.left) / rect.width;
    const pointY = (clientY - rect.top) / rect.height;

    if (pointX < 0 || pointX > 1 || pointY < 0 || pointY > 1) {
      return;
    }

    setArmedTool(null);
    addField(type, pointX, pointY);
  }

  function toggleSelect(fieldId: string) {
    setArmedTool(null);
    setSelectedIds((current) =>
      current.includes(fieldId)
        ? current.filter((id) => id !== fieldId)
        : [...current, fieldId],
    );
  }

  function selectFields(ids: string[]) {
    setArmedTool(null);
    setSelectedIds(ids);

    const first = fieldsRef.current.find((field) => field.id === ids.at(-1));

    if (first) {
      setSelectedSignerId(first.signerId);
    }
  }

  function clearSelection() {
    setSelectedIds([]);
    setIsInspectorOpen(false);
  }

  function changePage(nextPage: number) {
    setActivePage(clamp(nextPage, 1, pageCount));
    setSelectedIds([]);
    setArmedTool(null);
    setIsInspectorOpen(false);
  }

  function deleteSelection() {
    if (selectionIds.length === 0) {
      return;
    }

    const count = selectionIds.length;

    commit((current) => deleteFields(current, selectionIds));
    setSelectedIds([]);
    setIsInspectorOpen(false);
    toast(count === 1 ? "Field deleted" : `${String(count)} fields deleted`, {
      action: { label: "Undo", onClick: () => undo() },
    });
  }

  function duplicateSelection() {
    if (selectionIds.length === 0) {
      return;
    }

    let created: string[] = [];

    commit((current) => {
      const result = duplicateFields(current, selectionIds, {
        x: 12 / pageRecord.widthPt,
        y: 12 / pageRecord.heightPt,
      });

      created = result.newIds;

      return result.fields;
    });

    if (created.length > 0) {
      setSelectedIds(created);
    }
  }

  function nudgeSelection(pointsX: number, pointsY: number) {
    commit(
      (current) =>
        moveFields(
          current,
          selectionIds,
          pointsX / pageRecord.widthPt,
          pointsY / pageRecord.heightPt,
        ),
      { coalesce: `nudge-${selectionIds.join(",")}` },
    );
  }

  function selectSigner(signerId: string) {
    setSelectedSignerId(signerId);
  }

  function handleUndo() {
    if (undo()) {
      setArmedTool(null);
    }
  }

  function handleRedo() {
    if (redo()) {
      setArmedTool(null);
    }
  }

  const inspectorActions = {
    onAddRadioButton: () => {
      if (!primary) {
        return;
      }

      const nextId = newLocalId();

      commit((current) => addRadioButton(current, primary.id, nextId));
      setSelectedIds([nextId]);
    },
    onAlign: (alignment: Alignment) =>
      commit((current) => alignFields(current, selectionIds, alignment)),
    onAssign: (signerId: string) => {
      setSelectedSignerId(signerId);
      commit((current) => reassignFields(current, selectionIds, signerId));
    },
    onDelete: deleteSelection,
    onDuplicate: duplicateSelection,
    onGeometry: (patch: Partial<Rect>) => {
      if (!primary) {
        return;
      }

      commit((current) => setFieldGeometry(current, primary.id, patch), {
        coalesce: `geometry-${primary.id}-${Object.keys(patch).join()}`,
      });
    },
    onScrubChange: setIsInteracting,
    onSelectField: (fieldId: string) => {
      const target = fieldsRef.current.find((field) => field.id === fieldId);

      if (target && target.page !== activePage) {
        setActivePage(target.page);
      }

      setSelectedIds([fieldId]);
    },
    onSetLabel: (label: string | undefined) => {
      if (!primary) {
        return;
      }

      commit((current) => patchField(current, primary.id, { label }), {
        coalesce: `label-${primary.id}`,
      });
    },
    onSetOptions: (options: string[]) => {
      if (!primary) {
        return;
      }

      commit((current) => patchField(current, primary.id, { options }), {
        coalesce: `options-${primary.id}`,
      });
    },
    onSetRequired: (required: boolean) =>
      commit((current) => setRequired(current, selectionIds, required)),
  };

  /* ---------------------------------------------------------------- */
  /* Keyboard                                                           */
  /* ---------------------------------------------------------------- */

  const keyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    keyHandlerRef.current = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isInteracting) {
        return;
      }

      const isTyping = isTextEntryTarget(event.target);
      const hasMod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (hasMod && !event.altKey && (key === "z" || key === "y")) {
        if (isTyping) {
          return;
        }

        event.preventDefault();

        if (key === "y" || event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }

        return;
      }

      // Trays and menus own their keys.
      if (
        isTyping ||
        document.querySelector(
          "[role='dialog'][data-state='open'], [role='menu'][data-state='open']",
        )
      ) {
        return;
      }

      if (hasMod && key === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }

      if (hasMod && key === "a") {
        event.preventDefault();
        setArmedTool(null);
        setSelectedIds(pageFields.map((field) => field.id));
        return;
      }

      if (hasMod || event.altKey) {
        return;
      }

      const tool = fieldTools.find((entry) => entry.key === event.key);

      if (tool) {
        event.preventDefault();
        armTool(tool.type);
        return;
      }

      switch (event.key) {
        case "Escape":
          if (armedTool) {
            setArmedTool(null);
          } else if (selectionIds.length > 0) {
            clearSelection();
          }

          return;
        case "Backspace":
        case "Delete":
          if (selectionIds.length > 0) {
            event.preventDefault();
            deleteSelection();
          }

          return;
        case "PageUp":
          event.preventDefault();
          changePage(activePage - 1);
          return;
        case "PageDown":
          event.preventDefault();
          changePage(activePage + 1);
          return;
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown": {
          if (selectionIds.length === 0) {
            return;
          }

          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          const dx =
            event.key === "ArrowLeft"
              ? -step
              : event.key === "ArrowRight"
                ? step
                : 0;
          const dy =
            event.key === "ArrowUp"
              ? -step
              : event.key === "ArrowDown"
                ? step
                : 0;

          nudgeSelection(dx, dy);
          return;
        }
      }
    };
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandlerRef.current(event);

    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */

  const isPanelOpen = isMd && primary !== null;
  const inspectorProps = primary
    ? {
        group: primaryGroup,
        mod,
        page: pageRecord,
        primary,
        selection,
        signers,
      }
    : null;

  function resolveBlocker() {
    if (problemFieldId) {
      const target = fieldsRef.current.find(
        (field) => field.id === problemFieldId,
      );

      if (target) {
        setArmedTool(null);
        setActivePage(target.page);
        setSelectedIds([target.id]);
        setSelectedSignerId(target.signerId);

        if (!isMd) {
          setIsInspectorOpen(true);
        }
      }

      return;
    }

    if (missingSignatureSigner) {
      setSelectedIds([]);
      setSelectedSignerId(missingSignatureSigner.id);
      setArmedTool("signature");
    }
  }

  const blockerNote =
    showBlocker && blocker ? (
      <BlockerNote
        full={blocker}
        onResolve={resolveBlocker}
        short={shortBlocker ?? blocker}
      />
    ) : null;

  return (
    <CanvasShell
      actions={
        <div className="hidden items-center lg:flex">
          <IconButton
            aria-label="Undo"
            className="rounded-full"
            disabled={!canUndo}
            onClick={handleUndo}
            shortcut={`${mod}Z`}
            size="sm"
            tooltipSide="bottom"
          >
            <Undo2Icon />
          </IconButton>
          <IconButton
            aria-label="Redo"
            className="rounded-full"
            disabled={!canRedo}
            onClick={handleRedo}
            shortcut={`⇧${mod}Z`}
            size="sm"
            tooltipSide="bottom"
          >
            <Redo2Icon />
          </IconButton>
        </div>
      }
      backHref={`/envelopes/${envelopeId}/signers`}
      backLabel="Back"
      currentStep={3}
      eyebrow={`${String(pageCount)} ${pageCount === 1 ? "page" : "pages"}`}
      nextDescribedBy={blocker ? BLOCKER_ID : undefined}
      nextDisabled={!canContinue}
      nextLabel="Next →"
      nextLoading={isContinuing}
      onNext={handleContinue}
      status={
        <>
          <SaveStatus
            onRetry={() => void persistFields(fieldsRef.current)}
            saveError={saveError}
            saveState={shownSaveState}
            savedAt={savedAt}
          />
          {isLg ? blockerNote : null}
        </>
      }
      stepLabel="Step 3 of 4"
      steps={envelopeSteps(envelopeId)}
      title={record.title}
    >
      {blocker ? (
        <p className="sr-only" id={BLOCKER_ID}>
          {blocker}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Left: the pages, only when there is more than one. */}
        {pageCount > 1 ? (
          <nav
            aria-label="Pages"
            className="hidden w-28 shrink-0 overflow-y-auto overscroll-contain lg:block"
          >
            <PagesRail
              activePage={activePage}
              documentUrl={documentUrl}
              fields={fields}
              onSelectPage={changePage}
              pages={record.pages}
              signers={signers}
            />
          </nav>
        ) : null}

        {/* The desk, with the dock at its foot and the inspector floating
            in from the right while a field is selected. */}
        <div
          className={cn(
            "relative flex min-w-0 flex-1 flex-col overflow-hidden",
            pageCount > 1 && "lg:rounded-tl-(--radius-card)",
          )}
        >
          <DocumentStage
            activePage={activePage}
            armedSigner={selectedSigner}
            armedTool={armedTool}
            bottomInset={isLg ? 96 : 92}
            bottomSlot={
              isLg ? (
                <>
                  <ToolDock
                    armedTool={armedTool}
                    fields={fields}
                    getDropTarget={() => viewportRef.current}
                    mod={mod}
                    onArm={armTool}
                    onDragStateChange={setIsDockDragging}
                    onDropTool={dropTool}
                    onSelectSigner={selectSigner}
                    selectedSigner={selectedSigner}
                    signers={signers}
                  />
                  <CoachMark
                    onDismiss={dismissCoach}
                    open={showCoach}
                    signerName={selectedSigner.name}
                  />
                </>
              ) : null
            }
            documentUrl={documentUrl}
            fields={pageFields}
            noticeSlot={
              isLg ? (
                <AnimatePresence initial={false}>
                  {armedTool ? (
                    <motion.p
                      animate={{ opacity: 1, y: 0 }}
                      aria-live="polite"
                      className="pointer-events-none"
                      exit={{
                        opacity: 0,
                        transition: { duration: exitDuration(DUR.hover) },
                      }}
                      initial={{ opacity: 0, y: -4 }}
                      key="armed-hint"
                      transition={{ duration: DUR.move, ease: EASE.out }}
                    >
                      <span className="inline-flex h-8 items-center rounded-full bg-(--paper) px-3.5 text-[0.8125rem] text-(--secondary) shadow-(--shadow-pop)">
                        <span className="font-medium text-(--fg)">
                          Click the page to place{" "}
                          {getFieldTool(armedTool).label.toLowerCase()}
                        </span>
                        <span aria-hidden="true">&nbsp;·&nbsp;</span>
                        Esc to cancel
                      </span>
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              ) : null
            }
            inspectorWidth={isMd ? INSPECTOR_WIDTH + 24 : 0}
            isDropTarget={isDockDragging}
            isInspectorOpen={isPanelOpen}
            onClearSelection={clearSelection}
            onCommitMove={(ids, deltaX, deltaY) =>
              commit((current) => moveFields(current, ids, deltaX, deltaY))
            }
            onCommitResize={(fieldId, rect) =>
              commit((current) => resizeFieldTo(current, fieldId, rect))
            }
            onInteractionChange={setIsInteracting}
            onPageChange={changePage}
            onPlace={placeArmed}
            onSelect={selectFields}
            onTapField={() => {
              if (!isMd) {
                setIsInspectorOpen(true);
              }
            }}
            onToggleSelect={toggleSelect}
            onZoomChange={setZoom}
            page={pageRecord}
            pageCount={pageCount}
            pageControls={isLg}
            primaryId={primary?.id ?? null}
            selectedIds={selectionIds}
            signers={signers}
            viewportRef={viewportRef}
            zoom={zoom}
          />

          <AnimatePresence initial={false}>
            {isPanelOpen && inspectorProps ? (
              <motion.aside
                animate={{ opacity: 1, x: 0 }}
                aria-label="Inspector"
                className="absolute top-3 right-3 z-30 flex max-h-[calc(100%-6.75rem)] flex-col overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-pop)"
                exit={{
                  opacity: 0,
                  transition: {
                    duration: exitDuration(DUR.open),
                    ease: EASE.exit,
                  },
                  x: 12,
                }}
                initial={{ opacity: 0, x: 16 }}
                key="inspector"
                style={{ width: INSPECTOR_WIDTH }}
                transition={{ duration: DUR.open, ease: EASE.out }}
              >
                <FieldInspector
                  {...inspectorActions}
                  {...inspectorProps}
                  onClose={clearSelection}
                />
              </motion.aside>
            ) : null}
          </AnimatePresence>

          <MobileBar
            activePage={activePage}
            armedTool={armedTool}
            blocker={isLg ? null : blockerNote}
            canUndo={canUndo}
            contextCount={selection.length}
            contextField={!isMd ? primary : null}
            onCancelArm={() => setArmedTool(null)}
            onDelete={deleteSelection}
            onDeselect={clearSelection}
            onDuplicate={duplicateSelection}
            onOpenInspector={() => setIsInspectorOpen(true)}
            onOpenSigners={() => setIsSignersOpen(true)}
            onOpenTools={() => setIsToolsOpen(true)}
            onPageChange={changePage}
            onUndo={handleUndo}
            pageCount={pageCount}
            selectedSigner={selectedSigner}
          />
        </div>
      </div>

      {!isLg ? (
        <>
          <ToolsTray
            armedTool={armedTool}
            onOpenChange={setIsToolsOpen}
            onPick={armTool}
            open={isToolsOpen}
            selectedSigner={selectedSigner}
          />
          <PanelTray
            description="New fields you place are theirs."
            onOpenChange={setIsSignersOpen}
            open={isSignersOpen}
            title="Who new fields are for"
          >
            <div className="px-3">
              <SignersPanel
                fields={fields}
                onSelect={(signerId) => {
                  selectSigner(signerId);
                  setIsSignersOpen(false);
                }}
                selectedSignerId={selectedSigner.id}
                signers={signers}
              />
            </div>
          </PanelTray>
        </>
      ) : null}

      {!isMd && inspectorProps ? (
        <PanelTray
          onOpenChange={setIsInspectorOpen}
          open={isInspectorOpen}
          title={
            selection.length > 1
              ? `${String(selection.length)} fields`
              : getFieldTool(inspectorProps.primary.type).label
          }
        >
          <FieldInspector
            {...inspectorActions}
            {...inspectorProps}
            showHeader={false}
          />
        </PanelTray>
      ) : null}
    </CanvasShell>
  );
}

/**
 * What still stands between the draft and Next, said gently beside Next
 * (or above the phone bar): a soft amber pill in a few words. Pressing it
 * takes you to the field (or arms a signature for the signer who needs
 * one); the whole sentence is its tooltip and describes Next.
 */
function BlockerNote({
  full,
  onResolve,
  short,
}: {
  full: string;
  onResolve: () => void;
  short: string;
}) {
  return (
    <SimpleTooltip label={full} side="bottom">
      <button
        aria-label={`${full} Show me`}
        className={cn(
          "inline-flex h-8 max-w-[18rem] items-center gap-2 rounded-full bg-(--warning-soft) px-3 text-[0.8125rem] font-medium text-(--warning) outline-none",
          "transition-[scale,background-color] duration-(--dur-hover) ease-(--ease-out) active:scale-[0.97] active:duration-(--dur-press)",
          "focus-visible:shadow-(--focus-ring) pointer-coarse:h-10",
        )}
        onClick={onResolve}
        type="button"
      >
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-(--warning-dot)"
        />
        <span className="truncate">{short}</span>
      </button>
    </SimpleTooltip>
  );
}
