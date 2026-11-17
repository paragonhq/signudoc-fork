import * as React from "react";

import { cn } from "@/lib/cn";

/*
 * Ledger, calm: a simple key/value list. Label on
 * the left in secondary, value on the right, light dividers between rows.
 * In a white card by default (`variant="bare"` for no frame). The mono
 * option is for IDs and hashes only (detail views), never uppercase.
 *
 *   <Ledger title="Details">
 *     <LedgerRow label="Created">17 Nov 2026, 14:02</LedgerRow>
 *     <LedgerRow label="Envelope ID" mono>env_8f3a21c9</LedgerRow>
 *     <LedgerTotal label="Status">Completed</LedgerTotal>
 *   </Ledger>
 *
 * Semantics: a <dl>; each row is a <div> holding a <dt> and a <dd>.
 */

type LedgerProps = Omit<React.ComponentProps<"section">, "title"> & {
  /** Right side of the title row: a CopyButton, a small action. */
  actions?: React.ReactNode;
  /** A small secondary line above the title. */
  eyebrow?: React.ReactNode;
  /** Heading level of the title. */
  headingLevel?: "h2" | "h3" | "h4";
  /** `card`: a white card (default). `bare`: no frame. */
  variant?: "card" | "bare";
  title?: React.ReactNode;
};

function Ledger({
  actions,
  children,
  className,
  eyebrow,
  headingLevel: Heading = "h2",
  title,
  variant = "card",
  ...props
}: LedgerProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col",
        variant === "card" &&
          "rounded-(--radius-card) bg-(--paper) px-5 pt-5 pb-2 shadow-(--shadow-card) sm:px-6",
        className,
      )}
      data-slot="ledger"
      data-variant={variant}
      {...props}
    >
      {title || eyebrow || actions ? (
        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            {eyebrow ? (
              <p className="text-[0.8125rem] font-medium text-(--secondary)">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <Heading className="text-base leading-6 font-semibold tracking-[-0.015em] text-balance text-(--fg)">
                {title}
              </Heading>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <dl className="flex flex-col" data-slot="ledger-list">
        {children}
      </dl>
    </section>
  );
}

type LedgerRowProps = Omit<React.ComponentProps<"div">, "children"> & {
  children: React.ReactNode;
  label: React.ReactNode;
  /** Mono value: IDs, dates, hashes, counts. */
  mono?: boolean;
  /** Let a long value wrap under the label on phones (hashes, emails). */
  wrap?: boolean;
};

function LedgerRow({
  children,
  className,
  label,
  mono = false,
  wrap = false,
  ...props
}: LedgerRowProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-baseline justify-between gap-x-6 gap-y-1 border-b border-(--divider) py-3 last:border-b-0",
        wrap && "flex-wrap",
        className,
      )}
      data-slot="ledger-row"
      {...props}
    >
      <dt className="shrink-0 text-sm text-(--secondary)">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-sm font-medium text-(--fg)",
          mono && "font-mono text-[0.8125rem] font-normal tabular-nums",
          wrap ? "break-all" : "truncate",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/** The last, summarising line: the value in 600. */
function LedgerTotal({
  children,
  className,
  label,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  children: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-baseline justify-between gap-6 py-3",
        className,
      )}
      data-slot="ledger-total"
      {...props}
    >
      <dt className="text-sm font-medium text-(--fg)">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-semibold text-(--fg)">
        {children}
      </dd>
    </div>
  );
}

export { Ledger, LedgerRow, LedgerTotal };
