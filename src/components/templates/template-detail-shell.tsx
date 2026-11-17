"use client";

import {
  ArrowRightIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BackLink } from "@/components/envelopes/detail/detail-header";
import { getSignerPalette } from "@/components/envelopes/signer-palette";
import {
  TemplatePage,
  templateDocumentUrl,
  useTemplatePdf,
  type TemplatePdf,
} from "@/components/templates/template-preview";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import { cn } from "@/lib/cn";
import type { TemplateDetail, TemplateFieldPreview } from "@/lib/templates";

/*
 * A template's own page. One job: see what
 * this template sends, then use it.
 *
 *   header    name, what it holds in words, "Use template"; Rename and
 *             Delete wait in the "More" menu
 *   preview   the real page on a soft desk with the fields in each role's
 *             colour, and a strip of pages when there is more than one
 *   aside     who signs, in order, with what each fills in (pointing at a
 *             role brings its fields forward on the page), and the details
 */
export function TemplateDetailShell({
  template,
}: {
  template: TemplateDetail;
}) {
  const router = useRouter();
  const pdf = useTemplatePdf(templateDocumentUrl(template.id));
  const [page, setPage] = useState(1);
  const [activeRole, setActiveRole] = useState<number | null>(null);
  const [name, setName] = useState(template.name);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const useHref = `/templates/${encodeURIComponent(template.id)}/use`;

  async function deleteTemplate() {
    setDeleteError(null);

    const response = await fetch(
      `/api/templates/${encodeURIComponent(template.id)}`,
      { method: "DELETE" },
    );

    if (!response.ok && response.status !== 404) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      const message = payload?.error ?? "Unable to delete this template.";

      setDeleteError(message);
      throw new Error(message);
    }

    toast.success(`Deleted “${name}”`);
    router.push("/templates");
    router.refresh();
  }

  return (
    <div className="section-stack">
      <div className="flex flex-col gap-5">
        <BackLink href="/templates" label="Templates" />
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl leading-tight font-semibold tracking-[-0.03em] text-balance text-(--fg) sm:text-[1.75rem]">
              {name}
            </h1>
            <p className="text-[0.9375rem] leading-6 text-(--secondary)">
              {template.pageCountLabel} · {template.fieldCountLabel} ·{" "}
              {template.roles.length === 1
                ? "1 person signs"
                : `${String(template.roles.length)} people sign`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  aria-label="More actions"
                  className="rounded-full"
                  tooltip="More"
                  variant="outline"
                >
                  <MoreHorizontalIcon />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                  <PencilIcon aria-hidden="true" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setDeleteError(null);
                    setDeleteOpen(true);
                  }}
                  variant="destructive"
                >
                  <Trash2Icon aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild className="max-sm:h-12 max-sm:flex-1">
              <Link href={useHref}>
                Use template
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </header>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <section aria-label="Preview" className="flex min-w-0 flex-col gap-4">
          <DocumentPreview
            activeRole={activeRole}
            fields={template.fields}
            onPageChange={setPage}
            page={page}
            pageCount={template.pageCount}
            pdf={pdf}
            title={name}
          />
        </section>

        <aside className="flex flex-col gap-6">
          <RolesCard
            activeRole={activeRole}
            onActiveRoleChange={setActiveRole}
            roles={template.roles}
          />

          <section
            aria-labelledby="template-details"
            className="rounded-(--radius-card) bg-(--paper) p-5 shadow-(--shadow-card)"
          >
            <h2
              className="text-base leading-6 font-semibold tracking-[-0.015em] text-(--fg)"
              id="template-details"
            >
              Details
            </h2>
            <dl className="mt-3 flex flex-col text-sm">
              {[
                ["Saved", template.createdAtLabel],
                ["Pages", String(template.pageCount)],
                ["Fields", String(template.fieldCount)],
                ["File", template.fileName],
              ].map(([label, value]) => (
                <div
                  className="flex items-baseline justify-between gap-4 border-(--divider) py-2.5 not-first:border-t"
                  key={label}
                >
                  <dt className="shrink-0 text-(--secondary)">{label}</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-(--fg) tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      <RenameTray
        name={name}
        onOpenChange={setRenameOpen}
        onRenamed={(next) => {
          setName(next);
          router.refresh();
        }}
        open={renameOpen}
        templateId={template.id}
      />

      <ConfirmTray
        confirmLabel="Delete template"
        description={
          <>
            &ldquo;{name}&rdquo; is removed for good. Documents you already made
            from it stay as they are.
          </>
        }
        error={deleteError ?? undefined}
        onConfirm={deleteTemplate}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete this template?"
      />
    </div>
  );
}

/**
 * The document as a viewer: the page on its desk, and its pages to move
 * between (a rail beside it on wide screens, a strip below on narrow ones).
 */
export function DocumentPreview({
  activeRole,
  fields,
  onPageChange,
  page,
  pageCount,
  pdf,
  title,
}: {
  activeRole: number | null;
  fields: readonly TemplateFieldPreview[];
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
  pdf: TemplatePdf;
  title: string;
}) {
  const many = pageCount > 1;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4",
        many &&
          "lg:grid lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:items-start lg:gap-5",
      )}
    >
      <PreviewDesk
        activeRole={activeRole}
        className={cn(many && "lg:col-start-2 lg:row-start-1")}
        fields={fields}
        page={page}
        pdf={pdf}
        title={title}
      />
      {many ? (
        <PageStrip
          fields={fields}
          onSelect={onPageChange}
          page={page}
          pageCount={pageCount}
          pdf={pdf}
        />
      ) : null}
    </div>
  );
}

/** The page on a soft desk, centred, at a comfortable reading width. */
export function PreviewDesk({
  activeRole,
  className,
  fields,
  page,
  pdf,
  title,
}: {
  activeRole: number | null;
  className?: string;
  fields: readonly TemplateFieldPreview[];
  page: number;
  pdf: TemplatePdf;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex justify-center rounded-(--radius-card) bg-[rgb(var(--fg-rgb)/0.04)] px-5 py-6 sm:px-10 sm:py-10",
        className,
      )}
    >
      {/* On wide screens the whole page fits the window. */}
      <div className="w-full max-w-[32rem] lg:max-w-[min(32rem,calc((100dvh-14rem)*0.77))]">
        {pdf.state === "error" ? (
          <div className="flex aspect-[17/22] w-full items-center justify-center rounded-[0.5rem] bg-(--paper) p-8 text-center text-sm text-(--secondary)">
            The document couldn’t be shown right now.
          </div>
        ) : (
          <TemplatePage
            activeRole={activeRole}
            fields={fields}
            pageNumber={page}
            pdf={pdf}
          />
        )}
        <p className="sr-only">
          Page {page} of {title}
        </p>
      </div>
    </div>
  );
}

/** Small pages to move between, the current one ringed in the accent. */
export function PageStrip({
  fields,
  onSelect,
  page,
  pageCount,
  pdf,
}: {
  fields: readonly TemplateFieldPreview[];
  onSelect: (page: number) => void;
  page: number;
  pageCount: number;
  pdf: TemplatePdf;
}) {
  return (
    <nav
      aria-label="Pages"
      className="-mx-1 overflow-x-auto px-1 pt-1 pb-2 lg:col-start-1 lg:row-start-1 lg:mx-0 lg:overflow-visible lg:px-0 lg:pt-1"
    >
      <ul className="flex gap-3 lg:flex-col lg:gap-4">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map(
          (number) => {
            const fieldCount = fields.filter(
              (field) => field.page === number,
            ).length;

            return (
              <li className="shrink-0" key={number}>
                <button
                  aria-current={number === page ? "page" : undefined}
                  aria-label={`Page ${String(number)}${fieldCount ? `, ${String(fieldCount)} ${fieldCount === 1 ? "field" : "fields"}` : ""}`}
                  className="group/page flex w-[4.5rem] flex-col items-center gap-1.5 rounded-[0.625rem] outline-none focus-visible:shadow-(--focus-ring)"
                  onClick={() => onSelect(number)}
                  type="button"
                >
                  <span
                    className={cn(
                      "block w-full rounded-[0.5rem] p-0.5 transition-[box-shadow,translate] duration-(--dur-move) ease-(--ease-out)",
                      number === page
                        ? "shadow-[0_0_0_2px_var(--accent)]"
                        : "group-hover/page:-translate-y-0.5",
                    )}
                  >
                    <TemplatePage
                      className="rounded-[0.375rem]"
                      fields={fields}
                      pageNumber={number}
                      pdf={pdf}
                      showLabels={false}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      number === page
                        ? "font-medium text-(--fg)"
                        : "text-(--secondary)",
                    )}
                  >
                    {number}
                  </span>
                </button>
              </li>
            );
          },
        )}
      </ul>
    </nav>
  );
}

/**
 * Who signs, in order: a numbered avatar in each role's colour on a quiet
 * line that joins them, the role and what it fills in.
 */
function RolesCard({
  activeRole,
  onActiveRoleChange,
  roles,
}: {
  activeRole: number | null;
  onActiveRoleChange: (role: number | null) => void;
  roles: TemplateDetail["roles"];
}) {
  return (
    <section
      aria-labelledby="template-roles"
      className="rounded-(--radius-card) bg-(--paper) p-5 shadow-(--shadow-card)"
    >
      <h2
        className="text-base leading-6 font-semibold tracking-[-0.015em] text-(--fg)"
        id="template-roles"
      >
        Who signs
      </h2>
      <p className="mt-0.5 text-[0.8125rem] leading-5 text-(--secondary)">
        {roles.length === 1
          ? "Named each time you use it."
          : "In this order. Named each time you use it."}
      </p>
      <ol
        className="mt-4 flex flex-col"
        onPointerLeave={() => onActiveRoleChange(null)}
      >
        {roles.map((role, index) => {
          const palette = getSignerPalette(index);

          return (
            <li
              className={cn(
                "relative -mx-2 flex gap-3 rounded-(--radius-well) px-2 py-2.5 transition-[background-color] duration-(--dur-hover) ease-(--ease-out)",
                activeRole === index && "bg-(--hover)",
              )}
              key={role.id}
              onPointerEnter={() => onActiveRoleChange(index)}
            >
              {index < roles.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-11 bottom-[-0.375rem] left-[1.5625rem] w-px bg-(--divider)"
                />
              ) : null}
              <span
                aria-hidden="true"
                className="relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
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
    </section>
  );
}

function RenameTray({
  name,
  onOpenChange,
  onRenamed,
  open,
  templateId,
}: {
  name: string;
  onOpenChange: (open: boolean) => void;
  onRenamed: (name: string) => void;
  open: boolean;
  templateId: string;
}) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Each time it opens, start from the current name.
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setValue(name);
      setError(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next = value.trim();

    if (!next) {
      setError("Give the template a name.");
      return;
    }

    if (next === name) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/templates/${encodeURIComponent(templateId)}`,
        {
          body: JSON.stringify({ name: next }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        name?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to rename this template.");
        return;
      }

      onRenamed(payload?.name ?? next);
      onOpenChange(false);
      toast.success("Renamed");
    } catch {
      setError("Unable to rename this template. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Tray onOpenChange={onOpenChange} open={open}>
      <TrayContent size="sm">
        <form noValidate onSubmit={handleSubmit}>
          <TrayHeader>
            <TrayTitle>Rename template</TrayTitle>
          </TrayHeader>
          <TrayBody className="pt-2">
            <FormField error={error ?? undefined} label="Template name">
              <Input
                autoFocus
                maxLength={160}
                onChange={(event) => setValue(event.target.value)}
                value={value}
              />
            </FormField>
          </TrayBody>
          <TrayFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button loading={saving} type="submit">
              Save
            </Button>
          </TrayFooter>
        </form>
      </TrayContent>
    </Tray>
  );
}
