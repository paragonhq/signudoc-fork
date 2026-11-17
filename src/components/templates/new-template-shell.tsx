"use client";

import {
  ArrowLeftIcon,
  FileUpIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  XIcon,
} from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import {
  LazyDocumentComposer,
  type ComposerResult,
  type ComposerSource,
} from "@/components/composer/lazy-composer";
import { BackLink } from "@/components/envelopes/detail/detail-header";
import { AutoHeight } from "@/components/envelopes/flow/auto-height";
import { WriteDocumentRow } from "@/components/envelopes/flow/upload-drop-sheet";
import { getSignerPalette } from "@/components/envelopes/signer-palette";
import { PageHeader } from "@/components/shared/page-header";
import { BlankPage } from "@/components/templates/template-preview";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { TextMorph } from "@/components/ui/text-morph";
import { cn } from "@/lib/cn";
import { clearComposerDraft } from "@/lib/composer/drafts";
import {
  COMPOSER_IMPORT_ACCEPT,
  importDocumentFile,
  isComposerImportable,
} from "@/lib/composer/import";
import { defaultPageSetup } from "@/lib/composer/page";
import { cacheDraftPdfBlob } from "@/lib/draft-pdf-cache";
import { assertPdfPreviewRenderable } from "@/lib/pdfjs-client";
import { renderPdfThumbnail } from "@/lib/pdf-thumbnail";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_ROLES = 10;
const COMPOSER_DRAFT_KEY = "template-new";
const ROLE_SUGGESTIONS = [
  "Client",
  "Contractor",
  "Employee",
  "Manager",
  "Landlord",
  "Tenant",
  "Witness",
];

type Step = "document" | "roles";

type Role = { id: string; name: string };

let roleSeed = 0;

function newRole(name = ""): Role {
  roleSeed += 1;

  return { id: `role-${String(roleSeed)}`, name };
}

function nameFromFile(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${String(Math.max(1, Math.round(bytes / 1024)))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/*
 * New template: a short flow in one
 * centred card under the standard step rail.
 *
 *   1 Document   drop or choose a PDF; its name becomes the template's
 *   2 Who signs  name the roles in signing order (Client, Contractor);
 *                common ones are one tap away
 *   3 Fields     the ordinary builder, then "Save template"
 *
 * Steps slide in the direction you go and the card's height glides
 * between them. Under the hood the PDF becomes a scratch draft whose
 * stand-in signers are the roles (api/templates/drafts); the builder
 * places the fields and the template is kept from it.
 */
export function NewTemplateShell({
  directUploadPrefix = null,
}: {
  /** Where this browser may upload directly, or null to go through the app. */
  directUploadPrefix?: string | null;
}) {
  const [step, setStep] = useState<Step>("document");
  const [direction, setDirection] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [pagePicture, setPagePicture] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<Role[]>(() => [newRole(), newRole()]);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "opening">("idle");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [composer, setComposer] = useState<{
    initial: ComposerSource | null;
    notes: string[];
  } | null>(null);
  const [composedSource, setComposedSource] = useState<ComposerSource | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const busy = phase !== "idle";

  useEffect(
    () => () => {
      if (pagePicture) {
        URL.revokeObjectURL(pagePicture);
      }
    },
    [pagePicture],
  );

  async function openImported(next: File) {
    setImporting(true);

    try {
      const imported = await importDocumentFile(next);

      setComposer({
        initial: {
          html: imported.html,
          page: imported.page ?? defaultPageSetup(),
          title: name.trim() || imported.title || "",
        },
        notes: imported.notes,
      });
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "That document couldn’t be opened.",
      );
    } finally {
      setImporting(false);
    }
  }

  function handleComposed(result: ComposerResult) {
    setComposer(null);
    chooseFile(result.file);
    setComposedSource(result.source);
    setName(result.source.title);
  }

  function chooseFile(next: File | null | undefined) {
    setError(null);

    if (!next) {
      return;
    }

    const isPdf =
      next.name.toLowerCase().endsWith(".pdf") &&
      (!next.type || next.type === "application/pdf");

    if (!isPdf && isComposerImportable(next)) {
      void openImported(next);
      return;
    }

    if (!isPdf) {
      setError(
        "Choose a PDF or a Word document (.docx), or write the document here.",
      );
      return;
    }

    setComposedSource(null);

    if (next.size > MAX_FILE_SIZE_BYTES) {
      setError("That PDF is larger than 20 MB. Choose a smaller one.");
      return;
    }

    setFile(next);
    setPagePicture(null);
    setName((current) => current || nameFromFile(next.name));

    void next
      .arrayBuffer()
      .then((buffer) => renderPdfThumbnail(new Uint8Array(buffer)))
      .then((blob) => setPagePicture(URL.createObjectURL(blob)))
      .catch(() => {
        setError(
          "This PDF couldn’t be opened. It may be damaged or protected with a password.",
        );
        setFile(null);
      });
  }

  function goTo(next: Step) {
    setDirection(next === "roles" ? 1 : -1);
    setShowErrors(false);
    setError(null);
    setStep(next);
  }

  const nameError = name.trim() ? undefined : "Give the template a name";
  const trimmedRoles = roles.map((role) => role.name.trim());
  const roleErrors = trimmedRoles.map((roleName, index) => {
    if (!roleName) {
      return "Name this role";
    }

    if (
      trimmedRoles.findIndex(
        (other) => other.toLowerCase() === roleName.toLowerCase(),
      ) !== index
    ) {
      return "Each role needs its own name";
    }

    return undefined;
  });

  function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);

    if (!file) {
      setError("Add the document this template is made from.");
      return;
    }

    if (nameError) {
      return;
    }

    goTo("roles");
  }

  function addRole(roleName = "") {
    setRoles((current) => {
      if (current.length >= MAX_ROLES) {
        return current;
      }

      // A suggestion fills the first empty role before adding one.
      if (roleName) {
        const empty = current.findIndex((role) => !role.name.trim());

        if (empty >= 0) {
          return current.map((role, index) =>
            index === empty ? { ...role, name: roleName } : role,
          );
        }
      }

      return [...current, newRole(roleName)];
    });
  }

  async function submitRoles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);

    if (!file || busy) {
      return;
    }

    if (roleErrors.some(Boolean)) {
      const form = event.currentTarget;

      requestAnimationFrame(() => {
        form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setError(null);
    setPhase("uploading");

    try {
      await assertPdfPreviewRenderable(file);
    } catch {
      setError(
        "This PDF couldn’t be opened. It may be damaged or protected with a password.",
      );
      setPhase("idle");
      return;
    }

    try {
      const response = directUploadPrefix
        ? await createDraftFromDirectUpload(
            file,
            name.trim(),
            directUploadPrefix,
          )
        : await createDraftFromForm(file, name.trim());
      const created = (await response.json().catch(() => null)) as {
        envelopeId?: string;
        error?: string;
      } | null;

      if (!response.ok || !created?.envelopeId) {
        setError(created?.error ?? "The upload did not go through. Try again.");
        setPhase("idle");
        return;
      }

      await cacheDraftPdfBlob(created.envelopeId, file).catch(() => undefined);

      if (composedSource) {
        clearComposerDraft(COMPOSER_DRAFT_KEY);
      }

      const started = await fetch("/api/templates/drafts", {
        body: JSON.stringify({
          envelopeId: created.envelopeId,
          roleNames: trimmedRoles,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await started.json().catch(() => null)) as {
        error?: string;
        redirectPath?: string;
      } | null;

      if (!started.ok || !payload?.redirectPath) {
        setError(payload?.error ?? "Something went wrong. Try again.");
        setPhase("idle");
        return;
      }

      setPhase("opening");
      window.location.assign(payload.redirectPath);
    } catch {
      setError(
        "The upload did not go through. Check your connection and try again.",
      );
      setPhase("idle");
    }
  }

  const stepNumber = step === "document" ? 1 : 2;
  const suggestions = ROLE_SUGGESTIONS.filter(
    (suggestion) =>
      !trimmedRoles.some(
        (roleName) => roleName.toLowerCase() === suggestion.toLowerCase(),
      ),
  ).slice(0, 5);

  return (
    <div className="section-stack mx-auto w-full max-w-[36rem]">
      <div className="flex flex-col gap-5">
        <BackLink href="/templates" label="Templates" />
        <PageHeader
          description="Set it up once. Next time, just name who signs."
          title="New template"
        />
      </div>

      <ProgressSteps
        current={stepNumber}
        label="New template steps"
        steps={["Document", "Signers", "Fields"]}
      />

      <section
        aria-labelledby="new-template-step"
        className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
      >
        <AutoHeight>
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            <motion.div
              animate="center"
              custom={direction}
              exit="exit"
              initial="enter"
              key={step}
              transition={{ duration: DUR.panel, ease: EASE.out }}
              variants={{
                center: { opacity: 1, x: 0 },
                enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
                exit: (dir: number) => ({
                  opacity: 0,
                  transition: {
                    duration: exitDuration(DUR.panel),
                    ease: EASE.exit,
                  },
                  x: dir * -28,
                }),
              }}
            >
              <div className="flex flex-col gap-1 px-5 pt-5 sm:px-6 sm:pt-6">
                <h2
                  className="text-base leading-6 font-semibold tracking-[-0.015em] text-(--fg)"
                  id="new-template-step"
                >
                  {step === "document"
                    ? "Add the document"
                    : "Who signs, in order"}
                </h2>
                {step === "roles" ? (
                  <p className="text-sm leading-5 text-pretty text-(--secondary)">
                    You’ll pick the actual people each time.
                  </p>
                ) : null}
              </div>

              {step === "document" ? (
                <form
                  className="flex flex-col gap-5 p-5 sm:p-6"
                  noValidate
                  onSubmit={submitDocument}
                >
                  <div className="flex flex-col">
                    <DropZone
                      dragging={dragging}
                      file={file}
                      importing={importing}
                      inputRef={fileInputRef}
                      onDragChange={setDragging}
                      onEdit={
                        composedSource
                          ? () =>
                              setComposer({
                                initial: composedSource,
                                notes: [],
                              })
                          : undefined
                      }
                      onFile={chooseFile}
                      pagePicture={pagePicture}
                    />
                    {file ? null : (
                      <WriteDocumentRow
                        className="px-0 sm:px-0"
                        onWriteDocument={() =>
                          setComposer({ initial: null, notes: [] })
                        }
                      />
                    )}
                  </div>
                  <FormField
                    error={showErrors ? nameError : undefined}
                    label="Template name"
                  >
                    <Input
                      maxLength={160}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Services agreement"
                      value={name}
                    />
                  </FormField>
                  <StepError message={error} />
                  <div className="flex justify-end">
                    <Button className="max-sm:h-12 max-sm:flex-1" type="submit">
                      Continue
                    </Button>
                  </div>
                </form>
              ) : (
                <form
                  className="flex flex-col gap-5 p-5 sm:p-6"
                  noValidate
                  onSubmit={submitRoles}
                >
                  <RolesEditor
                    busy={busy}
                    errors={showErrors ? roleErrors : []}
                    onAdd={() => addRole()}
                    onChange={(id, value) =>
                      setRoles((current) =>
                        current.map((role) =>
                          role.id === id ? { ...role, name: value } : role,
                        ),
                      )
                    }
                    onRemove={(id) =>
                      setRoles((current) =>
                        current.filter((role) => role.id !== id),
                      )
                    }
                    roles={roles}
                  />
                  {suggestions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {suggestions.map((suggestion) => (
                        <button
                          className="inline-flex h-7 items-center gap-1 rounded-full bg-(--surface) px-3 text-[0.8125rem] font-medium text-(--fg) outline-none transition-[background-color,scale] duration-(--dur-press) ease-(--ease-out) hover:bg-(--surface-strong) active:scale-[0.96] focus-visible:shadow-(--focus-ring) disabled:opacity-50"
                          disabled={
                            busy ||
                            (roles.length >= MAX_ROLES &&
                              roles.every((role) => role.name.trim()))
                          }
                          key={suggestion}
                          onClick={() => addRole(suggestion)}
                          type="button"
                        >
                          <PlusIcon
                            aria-hidden="true"
                            className="size-3.5 text-(--secondary)"
                          />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <StepError message={error} />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      className="max-sm:h-12"
                      disabled={busy}
                      onClick={() => goTo("document")}
                      type="button"
                      variant="ghost"
                    >
                      <ArrowLeftIcon aria-hidden="true" />
                      Back
                    </Button>
                    <Button
                      className="max-sm:h-12"
                      loading={busy}
                      type="submit"
                    >
                      <TextMorph>
                        {phase === "uploading"
                          ? "Uploading…"
                          : phase === "opening"
                            ? "Opening the builder…"
                            : "Place fields"}
                      </TextMorph>
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </AutoHeight>
      </section>

      {composer ? (
        <LazyDocumentComposer
          confirmLabel="Use this document"
          initial={composer.initial}
          notes={composer.notes}
          onClose={() => setComposer(null)}
          onConfirm={handleComposed}
          storageKey={COMPOSER_DRAFT_KEY}
        />
      ) : null}
    </div>
  );
}

function StepError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className="rounded-(--radius-well) bg-(--danger-soft) px-3.5 py-2.5 text-[0.8125rem] leading-5 font-medium text-(--danger)"
      role="alert"
    >
      {message}
    </p>
  );
}

function DropZone({
  dragging,
  file,
  importing,
  inputRef,
  onDragChange,
  onEdit,
  onFile,
  pagePicture,
}: {
  dragging: boolean;
  file: File | null;
  importing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onEdit?: () => void;
  onDragChange: (dragging: boolean) => void;
  onFile: (file: File | null | undefined) => void;
  pagePicture: string | null;
}) {
  const inputId = useId();
  const input = (
    <input
      accept={`application/pdf,.pdf,${COMPOSER_IMPORT_ACCEPT}`}
      className="sr-only"
      id={inputId}
      onChange={(event) => {
        onFile(event.target.files?.[0]);
        event.target.value = "";
      }}
      ref={inputRef}
      tabIndex={-1}
      type="file"
    />
  );

  if (file) {
    return (
      <div className="flex items-center gap-4 rounded-(--radius-well) bg-(--surface) p-3 pr-4">
        {input}
        <span className="flex h-20 w-[3.9rem] shrink-0 items-center justify-center">
          {pagePicture ? (
            // A blob: URL drawn here from the chosen file.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="h-full w-auto rounded-[0.375rem] bg-(--paper) shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.06),0_4px_12px_-6px_rgb(var(--fg-rgb)/0.25)]"
              src={pagePicture}
            />
          ) : (
            <BlankPage className="animate-pulse" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-(--fg)">
            {file.name}
          </span>
          <span className="text-[0.8125rem] text-(--secondary)">
            PDF · {formatSize(file.size)}
          </span>
        </span>
        {onEdit ? (
          <Button onClick={onEdit} size="sm" type="button" variant="outline">
            <PencilIcon aria-hidden="true" />
            Edit
          </Button>
        ) : null}
        <Button
          onClick={() => inputRef.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCwIcon aria-hidden="true" />
          Replace
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-3 rounded-(--radius-well) bg-(--surface) px-6 py-9 text-center transition-[background-color,box-shadow] duration-(--dur-hover) ease-(--ease-out)",
        dragging &&
          "bg-(--accent-softer) shadow-[inset_0_0_0_1.5px_var(--accent)]",
      )}
      onDragLeave={() => onDragChange(false)}
      onDragOver={(event) => {
        event.preventDefault();
        onDragChange(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDragChange(false);
        onFile(event.dataTransfer.files?.[0]);
      }}
    >
      {input}
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-full bg-(--paper) text-(--accent) shadow-(--shadow-thumb) transition-[translate] duration-(--dur-move) ease-(--ease-spring)",
          dragging && "-translate-y-1",
        )}
      >
        <FileUpIcon aria-hidden="true" className="size-5" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-(--fg)">
          {importing
            ? "Opening your document…"
            : dragging
              ? "Drop it here"
              : "Drop a PDF or Word file"}
        </span>
        <span className="text-[0.8125rem] text-(--secondary)">Up to 20 MB</span>
      </span>
      <Button
        onClick={() => inputRef.current?.click()}
        size="sm"
        type="button"
        variant="outline"
      >
        Choose a file
      </Button>
    </div>
  );
}

function RolesEditor({
  busy,
  errors,
  onAdd,
  onChange,
  onRemove,
  roles,
}: {
  busy: boolean;
  errors: readonly (string | undefined)[];
  onAdd: () => void;
  onChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  roles: readonly Role[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {roles.map((role, index) => {
            const palette = getSignerPalette(index);
            const error = errors[index];

            return (
              <motion.li
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    duration: exitDuration(DUR.move),
                    ease: EASE.exit,
                  },
                }}
                initial={{ height: 0, opacity: 0 }}
                key={role.id}
                transition={{ duration: DUR.move, ease: EASE.out }}
              >
                <div className="flex items-start gap-3 py-0.5">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                    style={{ background: palette.tint, color: palette.color }}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <FormField
                      error={error}
                      label={
                        <span className="sr-only">Role {index + 1} name</span>
                      }
                    >
                      <Input
                        aria-label={`Role ${String(index + 1)} name`}
                        autoComplete="off"
                        disabled={busy}
                        maxLength={60}
                        onChange={(event) =>
                          onChange(role.id, event.target.value)
                        }
                        placeholder={
                          index === 0
                            ? "Client"
                            : index === 1
                              ? "Contractor"
                              : "Witness"
                        }
                        value={role.name}
                      />
                    </FormField>
                  </div>
                  <IconButton
                    aria-label={`Remove role ${String(index + 1)}`}
                    className="mt-1"
                    disabled={busy || roles.length <= 1}
                    onClick={() => onRemove(role.id)}
                    size="sm"
                    tooltip="Remove"
                  >
                    <XIcon />
                  </IconButton>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      {roles.length < MAX_ROLES ? (
        <Button
          className="self-start"
          disabled={busy}
          onClick={onAdd}
          size="sm"
          type="button"
          variant="ghost"
        >
          <PlusIcon aria-hidden="true" />
          Add a role
        </Button>
      ) : null}
    </div>
  );
}

async function createDraftFromDirectUpload(
  file: File,
  title: string,
  uploadPrefix: string,
) {
  const { uploadPresigned } = await import("@vercel/blob/client");
  const uploadKey = `${uploadPrefix}${crypto.randomUUID()}.pdf`;

  await uploadPresigned(uploadKey, file, {
    access: "private",
    contentType: "application/pdf",
    handleUploadUrl: "/api/uploads",
  });

  return fetch("/api/envelopes", {
    body: JSON.stringify({ filename: file.name, title, uploadKey }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function createDraftFromForm(file: File, title: string) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("title", title);

  return fetch("/api/envelopes", { body: formData, method: "POST" });
}
