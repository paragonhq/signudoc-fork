"use client";

import { ArrowLeftIcon, PencilRulerIcon } from "@/components/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getSignerPalette } from "@/components/envelopes/signer-palette";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentPreview } from "@/components/templates/template-detail-shell";
import { useTemplatePdf } from "@/components/templates/template-preview";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TextMorph } from "@/components/ui/text-morph";
import { toast } from "@/components/ui/toaster";
import type { TemplateDraftSummary } from "@/lib/templates";

/*
 * The last step of a new template: check it, name it, keep it. The page
 * with its fields on the left, as the template will hold it; on the right
 * the name, who signs (with what each fills in) and "Save template". The
 * fields are one click away if something is missing, and the whole thing
 * can be thrown away.
 */
export function SaveTemplateDraftShell({
  draft,
}: {
  draft: TemplateDraftSummary;
}) {
  const router = useRouter();
  const pdf = useTemplatePdf(
    `/api/envelopes/${encodeURIComponent(draft.envelopeId)}/document`,
  );
  const [page, setPage] = useState(1);
  const [activeRole, setActiveRole] = useState<number | null>(null);
  const [name, setName] = useState(draft.title);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "saving" | "saved">("idle");
  const [discardError, setDiscardError] = useState<string | null>(null);
  const fieldsHref = `/templates/new/${encodeURIComponent(draft.envelopeId)}/fields`;
  const nameError = name.trim() ? undefined : "Give the template a name";
  const hasFields = draft.fieldCount > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);

    if (nameError || !hasFields || phase !== "idle") {
      return;
    }

    setError(null);
    setPhase("saving");

    try {
      const response = await fetch(
        `/api/templates/drafts/${encodeURIComponent(draft.envelopeId)}`,
        {
          body: JSON.stringify({ name: name.trim() }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        redirectPath?: string;
      } | null;

      if (!response.ok || !payload?.redirectPath) {
        setError(
          payload?.error ?? "The template couldn’t be saved. Try again.",
        );
        setPhase("idle");
        return;
      }

      setPhase("saved");
      toast.success(`Saved “${name.trim()}”`);
      window.location.assign(payload.redirectPath);
    } catch {
      setError("The template couldn’t be saved. Check your connection.");
      setPhase("idle");
    }
  }

  async function discard() {
    setDiscardError(null);

    const response = await fetch(
      `/api/templates/drafts/${encodeURIComponent(draft.envelopeId)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      const message = payload?.error ?? "Unable to discard this draft.";

      setDiscardError(message);
      throw new Error(message);
    }

    router.push("/templates");
    router.refresh();
  }

  return (
    <div className="section-stack">
      <div className="flex flex-col gap-5">
        <Link
          className="group/back -ml-1 inline-flex w-fit items-center gap-1.5 rounded-full px-1 py-0.5 text-sm font-medium text-(--secondary) outline-none transition-colors duration-(--dur-hover) ease-(--ease-out) hover:text-(--fg) focus-visible:shadow-(--focus-ring)"
          href={fieldsHref}
        >
          <ArrowLeftIcon
            aria-hidden="true"
            className="size-4 transition-transform duration-(--dur-hover) ease-(--ease-out) group-hover/back:-translate-x-0.5"
          />
          Back to fields
        </Link>
        <PageHeader
          description="Check the fields, give it a name, and keep it for next time."
          eyebrow="New template · Step 3 of 3"
          title="Save your template"
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-10">
        <section
          aria-label="Preview"
          className="flex min-w-0 flex-col gap-4 max-lg:order-last lg:sticky lg:top-24"
        >
          <DocumentPreview
            activeRole={activeRole}
            fields={draft.fields}
            onPageChange={setPage}
            page={page}
            pageCount={draft.pageCount}
            pdf={pdf}
            title={name}
          />
        </section>

        <form
          className="flex flex-col rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <FormField
              error={showErrors ? nameError : undefined}
              label="Template name"
            >
              <Input
                disabled={phase !== "idle"}
                maxLength={160}
                onChange={(event) => {
                  setError(null);
                  setName(event.target.value);
                }}
                value={name}
              />
            </FormField>
          </div>

          <div className="px-5 pt-6 sm:px-6">
            <h2 className="text-sm font-medium text-(--fg)">Who signs</h2>
            <ol
              className="mt-2 flex flex-col"
              onPointerLeave={() => setActiveRole(null)}
            >
              {draft.roles.map((role, index) => {
                const palette = getSignerPalette(index);

                return (
                  <li
                    className="-mx-2 flex items-center gap-3 rounded-(--radius-well) px-2 py-2 transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover)"
                    key={role.id}
                    onPointerEnter={() => setActiveRole(index)}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                      style={{ background: palette.tint, color: palette.color }}
                    >
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-(--fg)">
                        <span className="sr-only">{index + 1}. </span>
                        {role.name}
                      </span>
                      <span className="text-[0.8125rem] leading-5 text-(--secondary)">
                        {role.summary}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {!hasFields ? (
            <div className="px-5 pt-4 sm:px-6">
              <p
                className="rounded-(--radius-well) bg-(--warning-soft) px-3.5 py-2.5 text-[0.8125rem] leading-5 text-(--fg)"
                role="status"
              >
                No fields yet. Place at least one, such as a signature, before
                saving.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="px-5 pt-4 sm:px-6">
              <p
                className="rounded-(--radius-well) bg-(--danger-soft) px-3.5 py-2.5 text-[0.8125rem] leading-5 font-medium text-(--danger)"
                role="alert"
              >
                {error}
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 border-t border-(--divider) px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <ConfirmTray
              confirmLabel="Discard"
              description="The document and the fields you placed are thrown away. Nothing was sent to anyone."
              error={discardError ?? undefined}
              hold={false}
              onConfirm={discard}
              title="Discard this template?"
              trigger={
                <Button
                  className="max-sm:h-12 sm:mr-auto"
                  disabled={phase !== "idle"}
                  type="button"
                  variant="ghost"
                >
                  Discard
                </Button>
              }
            />
            <Button asChild className="max-sm:h-12" variant="outline">
              <Link href={fieldsHref}>
                <PencilRulerIcon aria-hidden="true" />
                Edit fields
              </Link>
            </Button>
            <Button
              className="max-sm:order-first max-sm:h-12"
              disabled={!hasFields}
              loading={phase === "saving"}
              type="submit"
            >
              <TextMorph>
                {phase === "saved" ? "Saved" : "Save template"}
              </TextMorph>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
