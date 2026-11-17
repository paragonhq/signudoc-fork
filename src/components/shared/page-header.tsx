import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type PageHeaderProps = {
  /** The primary action (kept for older screens; prefer `actions`). */
  action?: ReactNode;
  /** Primary action last: e.g. <><Button variant="outline">Import</Button><Button>New envelope</Button></> */
  actions?: ReactNode;
  /**
   * Keep the actions beside the title on phones too (icon buttons, a
   * search that grows). By default they drop under the title and stretch.
   */
  actionsInline?: boolean;
  /** Optional row under the title block: a toolbar, tabs. */
  children?: ReactNode;
  className?: string;
  /** One quiet line under the title, in words. */
  description?: ReactNode;
  /** A small line above the title: 13px/500 secondary, sentence case. */
  eyebrow?: ReactNode;
  /** The heading level; h1 unless the page already has one. */
  headingLevel?: "h1" | "h2";
  /** Accepted for older callers; calm pages draw no microtext. */
  microtext?: string | boolean;
  /** Accepted for older callers; calm pages draw no rule. */
  rule?: boolean;
  /** Accepted for older callers; calm pages draw no sign lines. */
  signLinesSeed?: string;
  /** Accepted for older callers; calm pages draw no sign lines. */
  signLines?: boolean;
  title: ReactNode;
  /**
   * A word after the title in Ink violet, when it carries meaning. Use
   * rarely: the accent is for actions and selection.
   */
  titleAccent?: ReactNode;
};

/**
 * The top of a page, straight on the page ground (no card), calm: an optional small eyebrow, the title at
 * 28px/600 (24px on a phone), one quiet line of description, and the
 * actions on the right. No rules, marks, microtext or sign lines.
 *
 * On a phone the actions drop below the title and stretch, unless
 * `actionsInline` keeps them beside it.
 */
export function PageHeader({
  action,
  actions,
  actionsInline = false,
  children,
  className,
  description,
  eyebrow,
  headingLevel: Heading = "h1",
  title,
  titleAccent,
}: PageHeaderProps) {
  const resolvedActions = actions ?? action;

  return (
    <header
      className={cn("flex flex-col gap-6", className)}
      data-slot="page-header"
    >
      <div
        className={cn(
          "flex gap-4 sm:items-end sm:justify-between sm:gap-8",
          actionsInline
            ? "items-start justify-between"
            : "flex-col sm:flex-row",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow ? (
            <div className="min-w-0 truncate text-[0.8125rem] leading-5 font-medium text-(--secondary)">
              {eyebrow}
            </div>
          ) : null}
          <Heading className="text-2xl leading-tight font-semibold tracking-[-0.03em] text-balance text-(--fg) sm:text-[1.75rem]">
            {title}
            {titleAccent ? (
              <>
                {" "}
                <span className="text-(--accent)">{titleAccent}</span>
              </>
            ) : null}
          </Heading>
          {description ? (
            <p className="max-w-2xl text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
              {description}
            </p>
          ) : null}
        </div>
        {resolvedActions ? (
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-2",
              !actionsInline && "max-sm:*:flex-1",
            )}
          >
            {resolvedActions}
          </div>
        ) : null}
      </div>
      {children}
    </header>
  );
}
