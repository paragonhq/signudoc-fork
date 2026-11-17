"use client";

import {
  ArrowUpRightIcon,
  LayoutTemplateIcon,
  PlusIcon,
  RotateCcwIcon,
} from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { DocumentStackIllustration } from "@/components/illustrations/illustrations";
import { DocumentStack } from "@/components/objects/document-stack";
import { Envelope } from "@/components/objects/envelope";
import { useHoverPose } from "@/components/objects/object-motion";
import { PageHeader } from "@/components/shared/page-header";
import { RoleChip } from "@/components/templates/template-parts";
import { TemplateThumb } from "@/components/templates/template-preview";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import { Segmented } from "@/components/ui/segmented";
import { SearchInput } from "@/components/ui/toolbar";
import { cn } from "@/lib/cn";
import type { TemplateLibraryItem } from "@/lib/templates";

type TemplatesShellProps = {
  initialState?: "error";
  templates?: readonly TemplateLibraryItem[];
};

type SortOrder = "recent" | "name";

/** Search appears once there are enough templates to need it. */
const SEARCH_FROM = 5;
const MAX_ROLES = 2;

function overview(count: number) {
  return count === 1
    ? "One document, ready to send again."
    : `${String(count)} documents, ready to send again.`;
}

/*
 * Templates, the library. A gallery of the
 * documents you send often: each card shows the template's pages as a
 * small stack of paper in a soft well (the real first page on top), the
 * name, what it holds in words and who signs as role pills. Under the
 * pointer the card lifts a little, the pages fan out and "Use template"
 * appears; the whole card opens the template's page. Sorting and search arrive when the
 * list is long enough to want them.
 */
export function TemplatesShell({
  initialState,
  templates = [],
}: TemplatesShellProps) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("recent");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? templates.filter(
          (template) =>
            template.name.toLowerCase().includes(needle) ||
            template.roleNames.some((role) =>
              role.toLowerCase().includes(needle),
            ),
        )
      : [...templates];

    return sort === "name"
      ? matching.sort((left, right) =>
          left.name.localeCompare(right.name, undefined, {
            sensitivity: "base",
          }),
        )
      : matching;
  }, [templates, query, sort]);

  if (initialState === "error") {
    return (
      <div className="section-stack">
        <PageHeader title="Templates" />
        <div role="alert">
          <EmptyState
            action={
              <Button
                loading={retrying}
                onClick={() => startRetry(() => router.refresh())}
                variant="outline"
              >
                <RotateCcwIcon aria-hidden="true" />
                Try again
              </Button>
            }
            description="Something went wrong on our side. Try again in a moment."
            icon={<LayoutTemplateIcon />}
            title="Couldn’t load your templates"
          />
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="section-stack">
        <PageHeader title="Templates" />
        <TemplatesFirstRun />
      </div>
    );
  }

  return (
    <div className="section-stack">
      <PageHeader
        actions={
          <>
            {templates.length >= SEARCH_FROM ? (
              <SearchInput
                aria-label="Search templates"
                className="max-sm:order-last max-sm:basis-full sm:w-60"
                onValueChange={setQuery}
                placeholder="Search by name or role"
                shortcut="/"
                value={query}
              />
            ) : null}
            <Button asChild>
              <Link href="/templates/new">
                <PlusIcon aria-hidden="true" />
                New template
              </Link>
            </Button>
          </>
        }
        description={overview(templates.length)}
        title="Templates"
      />

      <section aria-label="Your templates" className="flex flex-col gap-5">
        {templates.length > 1 ? (
          <Segmented
            aria-label="Sort by"
            className="self-start"
            items={[
              { label: "Recently saved", value: "recent" },
              { label: "Name", value: "name" },
            ]}
            onValueChange={(value) => setSort(value)}
            size="sm"
            value={sort}
          />
        ) : null}

        {visible.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={() => setQuery("")} variant="outline">
                Clear search
              </Button>
            }
            description="Try another name, or a role such as Client."
            title="No templates match"
          />
        ) : (
          <ul className="grid gap-x-5 gap-y-(--card-row-gap) sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((template) => (
                <motion.li
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  initial={{ opacity: 0, scale: 0.98 }}
                  key={template.id}
                  layout="position"
                  transition={{ duration: DUR.move, ease: EASE.out }}
                >
                  <TemplateCard template={template} />
                </motion.li>
              ))}
            </AnimatePresence>
            {!query ? (
              <li>
                <NewTemplateTile />
              </li>
            ) : null}
          </ul>
        )}
      </section>
    </div>
  );
}

function TemplateCard({ template }: { template: TemplateLibraryItem }) {
  const detailHref = `/templates/${encodeURIComponent(template.id)}`;
  const useHref = `${detailHref}/use`;
  const roles = template.roleNames.slice(0, MAX_ROLES);
  const extra = template.roleNames.length - roles.length;
  const hover = useHoverPose();

  return (
    <article
      {...hover.bind}
      className={cn(
        "group/card relative flex h-full overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card) max-sm:flex-row sm:flex-col",
        "transition-[translate,box-shadow] duration-(--dur-move) ease-(--ease-out)",
        "hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) motion-reduce:hover:translate-y-0",
        "has-[a:focus-visible]:shadow-(--shadow-card-hover)",
      )}
    >
      {/* The pages, in a soft well, rising out of the bottom edge (on a
          phone, a small stack beside the words). One stack, drawn at the
          desktop size and scaled down on a phone. */}
      <div className="relative flex shrink-0 items-end justify-center overflow-hidden bg-(--surface) max-sm:w-[6.5rem] max-sm:px-3 max-sm:pt-4 sm:h-52 sm:px-6 sm:pt-6">
        <span className="relative block h-[6.5rem] w-20 translate-y-5 sm:h-[11.625rem] sm:w-36 sm:translate-y-8">
          <span className="absolute top-0 left-0 block origin-top-left max-sm:scale-[0.5556]">
            <DocumentStack
              count={Math.min(3, Math.max(1, template.pageCount))}
              pages={[
                <TemplateThumb
                  className="h-full w-full rounded-none object-cover object-top shadow-none"
                  key="first"
                  name={template.name}
                  templateId={template.id}
                />,
              ]}
              pose={hover.pose}
              scale={1.5}
            />
          </span>
        </span>

        <span
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 flex justify-center pb-3 max-sm:hidden",
            "transition-[opacity,translate] duration-(--dur-move) ease-(--ease-out)",
            "pointer-fine:translate-y-1 pointer-fine:opacity-0 pointer-fine:group-hover/card:translate-y-0 pointer-fine:group-hover/card:opacity-100",
            "pointer-fine:group-has-[a:focus-visible]/card:translate-y-0 pointer-fine:group-has-[a:focus-visible]/card:opacity-100",
          )}
        >
          <Button asChild className="shadow-(--shadow-pop)" size="sm">
            <Link href={useHref}>
              Use template
              <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 pt-3.5 pb-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="truncate text-[0.9375rem] leading-6 font-medium tracking-[-0.01em] text-(--fg)">
            <Link
              className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:decoration-(--accent) focus-visible:underline-offset-4"
              href={detailHref}
            >
              {template.name}
            </Link>
          </h2>
          <p className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
            {template.pageCountLabel} · {template.fieldCountLabel} · saved{" "}
            {template.createdAtLabel}
          </p>
        </div>
        <ul
          aria-label={`Who signs ${template.name}`}
          className="mt-auto flex min-w-0 flex-wrap items-center gap-1.5"
        >
          {roles.map((roleName, index) => (
            <li className="min-w-0" key={`${String(index)}-${roleName}`}>
              <RoleChip index={index} name={roleName} size="sm" />
            </li>
          ))}
          {extra > 0 ? (
            <li className="text-xs font-medium text-(--secondary)">
              +{extra} more
            </li>
          ) : null}
        </ul>
        {/* On a phone the action sits with the words, in thumb reach. */}
        <Button
          asChild
          className="relative z-10 self-start sm:hidden"
          size="sm"
          variant="secondary"
        >
          <Link href={useHref}>Use template</Link>
        </Button>
      </div>
    </article>
  );
}

/**
 * The last tile: make another. Quiet until reached for; then the envelope
 * on it opens (objects/Envelope, decorative).
 */
function NewTemplateTile() {
  const hover = useHoverPose();

  return (
    <Link
      {...hover.bind}
      className={cn(
        "group/new flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-(--radius-card) bg-[rgb(var(--fg-rgb)/0.035)] p-6 text-center outline-none",
        "transition-[background-color,scale] duration-(--dur-hover) ease-(--ease-out) hover:bg-[rgb(var(--fg-rgb)/0.055)] active:scale-[0.99] focus-visible:shadow-(--focus-ring)",
      )}
      href="/templates/new"
    >
      <span className="flex pt-6">
        <Envelope
          forSigning={false}
          pose={hover.hovered ? "active" : "rest"}
          size="sm"
          theme="paper"
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-(--fg)">New template</span>
        <span className="text-[0.8125rem] leading-5 text-(--secondary)">
          Upload a PDF, name who signs
        </span>
      </span>
    </Link>
  );
}

/** No templates yet: what one is, and the two ways to make one. */
function TemplatesFirstRun() {
  return (
    <section
      aria-labelledby="templates-first-run"
      className="flex flex-col items-center gap-8 rounded-(--radius-card) bg-(--paper) px-6 py-14 text-center shadow-(--shadow-card) sm:py-20"
    >
      <DocumentStackIllustration className="w-52 sm:w-60" />
      <div className="flex max-w-md flex-col gap-2">
        <h2
          className="text-xl leading-7 font-semibold tracking-[-0.02em] text-(--fg)"
          id="templates-first-run"
        >
          No templates yet
        </h2>
        <p className="text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
          Set a document up once: its fields and who signs in which order. Next
          time you only name the people.
        </p>
      </div>
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
        <Button asChild className="max-sm:h-12">
          <Link href="/templates/new">
            <PlusIcon aria-hidden="true" />
            Create a template
          </Link>
        </Button>
        <Button asChild className="max-sm:h-12" variant="outline">
          <Link href="/dashboard">Save one from any sent document</Link>
        </Button>
      </div>
    </section>
  );
}
