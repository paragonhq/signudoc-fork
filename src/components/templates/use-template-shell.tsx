"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { duplicateSignerEmailMessage } from "@/lib/schemas/signer";
import type { TemplateDetail, UseTemplateData } from "@/lib/templates";
import { BackLink } from "@/components/envelopes/detail/detail-header";
import { PageHeader } from "@/components/shared/page-header";
import { StatusPanel } from "@/components/shared/status-panel";
import { DocumentPreview } from "@/components/templates/template-detail-shell";
import { RoleChip, signsInOrder } from "@/components/templates/template-parts";
import {
  templateDocumentUrl,
  useTemplatePdf,
} from "@/components/templates/template-preview";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";
import { TextMorph } from "@/components/ui/text-morph";

type UseTemplateShellProps = {
  /** Shown in place of the form when the template cannot be used. */
  errorMessage?: string;
  /** The template's pages and fields, for the preview beside the form. */
  preview?: TemplateDetail | null;
  template?: UseTemplateData;
};

type Person = {
  email: string;
  name: string;
};

type PersonErrors = {
  email?: string;
  name?: string;
};

const validEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genericError = "Something went wrong. Please try again.";

function findErrors(people: readonly Person[]): PersonErrors[] {
  const emailCounts = new Map<string, number>();

  for (const person of people) {
    const email = person.email.trim().toLowerCase();

    if (email) {
      emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    }
  }

  return people.map((person) => {
    const errors: PersonErrors = {};
    const email = person.email.trim().toLowerCase();

    if (person.name.trim().length === 0) {
      errors.name = "Name is required";
    }

    if (!validEmailPattern.test(email)) {
      errors.email = "Enter a valid email address";
    } else if ((emailCounts.get(email) ?? 0) > 1) {
      errors.email = duplicateSignerEmailMessage;
    }

    return errors;
  });
}

/**
 * Use a template, in two columns: the document on the left, as it
 * will go out, and one question on the right, "Who signs this time?". A
 * row per role in signing order (its colour, when it signs, a name and an
 * email), then the title, prefilled. Filling in a role brings its fields
 * forward on the page (and turns to the first page they are on), so you
 * can see what that person will be asked to do. Nothing is sent from
 * here; the draft opens on the review step.
 */
export function UseTemplateShell({
  errorMessage,
  preview = null,
  template,
}: UseTemplateShellProps) {
  const pdf = useTemplatePdf(
    preview && template ? templateDocumentUrl(template.id) : null,
  );
  const [page, setPage] = useState(1);
  const [activeRole, setActiveRole] = useState<number | null>(null);
  const [title, setTitle] = useState(template?.name ?? "");
  const [people, setPeople] = useState<Person[]>(() =>
    (template?.roles ?? []).map(() => ({ email: "", name: "" })),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!template) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink href="/templates" label="Templates" />
        <StatusPanel
          action={{ href: "/templates", label: "Back to templates" }}
          description={
            errorMessage ??
            "We couldn't load this template. Try again in a moment."
          }
          title="This template can't be used"
          tone="error"
        />
      </div>
    );
  }

  const errors = findErrors(people);
  const titleError =
    title.trim().length === 0 ? "Give the envelope a title" : undefined;
  const canSubmit =
    !titleError && errors.every((error) => !error.name && !error.email);
  const roleCount = template.roles.length;

  function focusRole(index: number) {
    setActiveRole(index);

    const own = preview?.fields.filter((field) => field.roleIndex === index);

    if (!own?.length || own.some((field) => field.page === page)) {
      return;
    }

    // Turn to where they sign, or else to their first field.
    const target =
      own.find((field) => field.type === "signature") ??
      own.reduce((first, field) => (field.page < first.page ? field : first));

    setPage(target.page);
  }

  function updatePerson(index: number, patch: Partial<Person>) {
    setSubmitError(null);
    setPeople((current) =>
      current.map((person, personIndex) =>
        personIndex === index ? { ...person, ...patch } : person,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);

    if (!template || isSubmitting) {
      return;
    }

    if (!canSubmit) {
      // Take the person to the first thing that needs them.
      const form = event.currentTarget;

      requestAnimationFrame(() => {
        form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/templates/${template.id}/use`, {
        body: JSON.stringify({ signers: people, title }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        redirectPath?: string;
      } | null;

      if (!response.ok || !payload?.redirectPath) {
        setSubmitError(payload?.error ?? genericError);
        setIsSubmitting(false);
        return;
      }

      // The button stays busy until the next page takes over.
      window.location.assign(payload.redirectPath);
    } catch {
      setSubmitError(genericError);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="section-stack">
      <div className="flex flex-col gap-5">
        <BackLink
          href={`/templates/${encodeURIComponent(template.id)}`}
          label={template.name}
        />
        <PageHeader
          description={`${template.pageCountLabel} · ${template.fieldCountLabel} · ${String(roleCount)} ${roleCount === 1 ? "person signs" : "people sign"}`}
          title="Use template"
        />
      </div>

      <div
        className={cn(
          "grid items-start gap-6 lg:gap-10",
          preview && "lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]",
        )}
      >
        {preview ? (
          <section
            aria-label="Preview"
            className="flex min-w-0 flex-col gap-4 max-lg:order-last lg:sticky lg:top-24"
          >
            <DocumentPreview
              activeRole={activeRole}
              fields={preview.fields}
              onPageChange={setPage}
              page={page}
              pageCount={preview.pageCount}
              pdf={pdf}
              title={template.name}
            />
          </section>
        ) : null}

        <form
          className="flex min-w-0 flex-col rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-1 px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 className="text-base leading-6 font-semibold tracking-[-0.015em] text-(--fg)">
              Who signs this time?
            </h2>
            <p className="text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
              {roleCount === 1
                ? "Their fields are already placed."
                : "They get it in this order. Their fields are already placed."}
            </p>
          </div>

          <ol className="flex flex-col px-5 sm:px-6">
            {template.roles.map((role, index) => {
              const person = people[index] ?? { email: "", name: "" };
              const nameError = showErrors ? errors[index]?.name : undefined;
              const emailError = showErrors ? errors[index]?.email : undefined;

              return (
                <li
                  className="flex flex-col gap-3 border-(--divider) py-5 not-first:border-t"
                  key={role.id}
                  onFocus={() => focusRole(index)}
                  onPointerEnter={() => focusRole(index)}
                >
                  <div className="flex items-center gap-2.5">
                    <RoleChip
                      index={index}
                      name={role.name}
                      showOrder={false}
                    />
                    {roleCount > 1 ? (
                      <span className="text-[0.8125rem] leading-5 text-(--secondary)">
                        {signsInOrder(index)}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField error={nameError} label="Name">
                      <Input
                        aria-label={`${role.name} name`}
                        autoComplete="off"
                        disabled={isSubmitting}
                        maxLength={120}
                        onChange={(event) =>
                          updatePerson(index, { name: event.target.value })
                        }
                        placeholder="Jane Smith"
                        type="text"
                        value={person.name}
                      />
                    </FormField>
                    <FormField error={emailError} label="Email">
                      <Input
                        aria-label={`${role.name} email`}
                        autoComplete="off"
                        disabled={isSubmitting}
                        inputMode="email"
                        maxLength={320}
                        onChange={(event) =>
                          updatePerson(index, { email: event.target.value })
                        }
                        placeholder="jane@company.com"
                        type="email"
                        value={person.email}
                      />
                    </FormField>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="border-t border-(--divider) px-5 py-5 sm:px-6">
            <FormField
              error={showErrors ? titleError : undefined}
              hint="Signers see this title in their email."
              label="Envelope title"
            >
              <Input
                disabled={isSubmitting}
                maxLength={160}
                onChange={(event) => {
                  setSubmitError(null);
                  setTitle(event.target.value);
                }}
                type="text"
                value={title}
              />
            </FormField>
          </div>

          {submitError ? (
            <div className="px-5 pb-1 sm:px-6">
              <p
                className="rounded-(--radius-well) bg-(--danger-soft) px-3.5 py-2.5 text-[0.8125rem] leading-5 font-medium text-(--danger)"
                role="alert"
              >
                {submitError}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 px-5 pt-4 pb-5 sm:flex-row sm:items-center sm:px-6 sm:pb-6">
            <p className="text-[0.8125rem] leading-5 text-(--secondary) sm:mr-auto">
              Nothing is sent yet. You review everything next.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                asChild
                className="max-sm:h-12"
                disabled={isSubmitting}
                variant="ghost"
              >
                <Link href="/templates">Cancel</Link>
              </Button>
              <Button
                aria-busy={isSubmitting || undefined}
                className="max-sm:h-12"
                type="submit"
              >
                {isSubmitting ? <Spinner /> : null}
                <TextMorph>
                  {isSubmitting ? "Creating draft…" : "Create draft"}
                </TextMorph>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
