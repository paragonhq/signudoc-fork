"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "@/components/ui/icons";
import { Slot } from "radix-ui";

import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";

/*
 * Tables: light. 52px rows split by faint
 * dividers, quiet 13px sentence-case headers with no rule above them, a
 * soft hover wash and an accent wash on selected rows. Inside a `sheet`
 * the table sits on a white card with the soft elevation. Row actions are
 * revealed on hover (always visible on touch). Styles live in globals.css
 * (.data-table). Prefer list rows for documents; tables are for data that
 * really is columnar (audit logs, members, API keys).
 *
 * Responsive: below 768px each row becomes a stacked card instead of a
 * table that scrolls sideways. Tell each cell where it goes with `mobile`:
 *
 *   title    first line, takes the width (the document name)
 *   status   first line, right (a StatusFlag)
 *   actions  first line, far right (row menu)
 *   select   before the title (the checkbox)
 *   meta     second line, inline mono, joined with " · " (ID, date, count)
 *   block    its own line with the cell's `label` on the left
 *   hidden   not shown on phones
 *
 * A cell with a `label` defaults to `block`, otherwise to `meta`.
 *
 *   <Table>
 *     <TableHeader>
 *       <TableRow>
 *         <TableHead>Document</TableHead>
 *         <TableHead>Status</TableHead>
 *         <TableHead>Updated</TableHead>
 *         <TableHead><span className="sr-only">Actions</span></TableHead>
 *       </TableRow>
 *     </TableHeader>
 *     <TableBody>
 *       {rows.map((row) => (
 *         <TableRow key={row.id} selected={selectedIds.has(row.id)}>
 *           <TableCell mobile="title">
 *             <TableRowLink><Link href={`/envelopes/${row.id}`}>{row.name}</Link></TableRowLink>
 *           </TableCell>
 *           <TableCell mobile="status"><StatusFlag status={row.status} /></TableCell>
 *           <TableCell mobile="meta" mono>{row.updatedLabel}</TableCell>
 *           <TableCell mobile="actions" align="end">
 *             <TableActions><IconButton aria-label="More" …/></TableActions>
 *           </TableCell>
 *         </TableRow>
 *       ))}
 *       {rows.length === 0 ? <TableEmpty colSpan={4} title="Nothing matches" … /> : null}
 *     </TableBody>
 *   </Table>
 *
 * TableRowLink stretches a link over the whole row (the row is the target);
 * buttons and checkboxes in other cells stay clickable above it.
 */

type TableProps = Omit<React.ComponentProps<"table">, "frame"> & {
  /**
   * `sheet` (default) draws the paper sheet around the table. `bare` for a
   * table inside a Sheet or a Tray that already has an edge.
   */
  variant?: "sheet" | "bare";
  /** Scroll sideways inside the frame on narrow screens instead of clipping. Sticky headers then stick to the frame, not the page. */
  scroll?: boolean;
  /** Stack rows into cards below 768px (default true). */
  stack?: boolean;
  /** Offset for the sticky header, e.g. "4rem" under a sticky toolbar. */
  stickyTop?: string;
};

function Table({
  className,
  scroll = false,
  stack = true,
  stickyTop,
  style,
  variant = "sheet",
  ...props
}: TableProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0",
        variant === "sheet" &&
          "rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card) [&_th:first-child]:rounded-tl-(--radius-card) [&_th:last-child]:rounded-tr-(--radius-card)",
        scroll ? "overflow-x-auto overscroll-x-contain" : "[overflow:clip]",
      )}
      data-slot="table-container"
      data-variant={variant}
    >
      <table
        className={cn("data-table", className)}
        data-slot="table"
        data-stack={stack}
        style={
          stickyTop
            ? ({
                ...style,
                "--table-sticky-top": stickyTop,
              } as React.CSSProperties)
            : style
        }
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead className={cn(className)} data-slot="table-header" {...props} />
  );
}

/**
 * Rows appear at once: lists are opened many times a day, so they do not
 * stagger in. `animate` is still accepted for older callers and ignored.
 */
function TableBody({
  animate: _animate,
  className,
  ...props
}: React.ComponentProps<"tbody"> & { animate?: boolean }) {
  void _animate;

  return <tbody className={cn(className)} data-slot="table-body" {...props} />;
}

function TableRow({
  className,
  selected,
  ...props
}: React.ComponentProps<"tr"> & {
  /**
   * Selected rows take the accent wash and keep their actions visible. The
   * row's checkbox carries the state for assistive tech.
   */
  selected?: boolean;
}) {
  return (
    <tr
      className={cn(className)}
      data-selected={selected ? "true" : undefined}
      data-slot="table-row"
      {...props}
    />
  );
}

type SortDirection = "ascending" | "descending" | "none";

function TableHead({
  align = "start",
  children,
  className,
  numeric = false,
  onSort,
  sort,
  ...props
}: Omit<React.ComponentProps<"th">, "align"> & {
  align?: "start" | "center" | "end";
  /** Right-aligned with tabular figures. */
  numeric?: boolean;
  /** Makes the header a sort button. */
  onSort?: () => void;
  /** The column's current sort. Shown without hovering. */
  sort?: SortDirection;
}) {
  const resolvedAlign = numeric ? "end" : align;
  const label = (
    <span className="table-head-label inline-flex items-center gap-1 whitespace-nowrap">
      {children}
      {onSort ? (
        sort === "ascending" ? (
          <ArrowUp aria-hidden="true" className="size-3 text-(--fg)" />
        ) : sort === "descending" ? (
          <ArrowDown aria-hidden="true" className="size-3 text-(--fg)" />
        ) : (
          <ChevronsUpDown
            aria-hidden="true"
            className="size-3 opacity-0 transition-opacity duration-(--dur-hover) group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60"
          />
        )
      ) : null}
    </span>
  );

  return (
    <th
      aria-sort={onSort ? (sort ?? "none") : undefined}
      className={cn(
        resolvedAlign === "end" && "text-right",
        resolvedAlign === "center" && "text-center",
        className,
      )}
      data-slot="table-head"
      scope="col"
      {...props}
    >
      {onSort ? (
        <button
          className={cn(
            "group/sort -mx-1.5 inline-flex h-7 items-center rounded-full px-1.5 outline-none transition-[background-color,color] duration-(--dur-hover) hover:bg-(--hover) focus-visible:shadow-(--focus-ring)",
            sort && sort !== "none" && "[&_.table-head-label]:text-(--fg)",
          )}
          onClick={onSort}
          type="button"
        >
          {label}
        </button>
      ) : (
        label
      )}
    </th>
  );
}

type MobileSlot =
  "title" | "status" | "actions" | "select" | "meta" | "block" | "hidden";

function TableCell({
  align = "start",
  children,
  className,
  label,
  mobile,
  mono = false,
  numeric = false,
  ...props
}: Omit<React.ComponentProps<"td">, "align"> & {
  align?: "start" | "center" | "end";
  /** Column name, shown beside the value when the row is stacked (block). */
  label?: string;
  /** Where this cell goes when rows stack below 768px. */
  mobile?: MobileSlot;
  /** Mono metadata: IDs, dates, hashes. */
  mono?: boolean;
  /** Right-aligned with tabular figures. */
  numeric?: boolean;
}) {
  const slot = mobile ?? (label ? "block" : "meta");
  const resolvedAlign = numeric ? "end" : align;

  return (
    <td
      className={cn(
        resolvedAlign === "end" && "text-right",
        resolvedAlign === "center" && "text-center",
        numeric && "tabular-nums",
        mono && "font-mono text-[0.8125rem] text-(--secondary) tabular-nums",
        className,
      )}
      data-mobile={slot}
      data-slot="table-cell"
      {...props}
    >
      {label ? (
        <span
          className="table-cell-label text-[0.8125rem] text-(--secondary)"
          aria-hidden="true"
        >
          {label}
        </span>
      ) : null}
      {children}
    </td>
  );
}

/** Row actions: hidden until the row is hovered or focused (with a mouse). */
function TableActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("table-actions", className)}
      data-slot="table-actions"
      {...props}
    />
  );
}

/**
 * Wrap the row's main link: it then covers the whole row.
 *   <TableRowLink><Link href="…">Lease agreement.pdf</Link></TableRowLink>
 */
function TableRowLink({
  className,
  ...props
}: React.ComponentProps<typeof Slot.Root>) {
  return (
    <Slot.Root
      className={cn("row-link font-medium text-(--fg)", className)}
      data-slot="table-row-link"
      {...props}
    />
  );
}

/** An empty table: keeps the header, says why, offers one action. */
function TableEmpty({
  action,
  children,
  className,
  colSpan,
  description,
  title,
}: {
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  colSpan: number;
  description?: React.ReactNode;
  title?: React.ReactNode;
}) {
  return (
    <tr data-empty="" data-slot="table-empty">
      <td className={cn("h-auto", className)} colSpan={colSpan}>
        {children ?? (
          <div className="flex flex-col items-center gap-4 px-1 py-12 text-center">
            <div className="flex flex-col gap-1">
              {title ? (
                <p className="text-base font-semibold tracking-[-0.01em] text-(--fg)">
                  {title}
                </p>
              ) : null}
              {description ? (
                <p className="max-w-md text-sm leading-6 text-(--secondary)">
                  {description}
                </p>
              ) : null}
            </div>
            {action}
          </div>
        )}
      </td>
    </tr>
  );
}

/** Skeleton rows while a table loads. Pair with aria-busy on the Table. */
function TableSkeletonRows({
  columns,
  delay = 150,
  rows = 5,
}: {
  columns: number;
  delay?: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr data-slot="table-skeleton-row" key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <td data-mobile={column === 0 ? "title" : "meta"} key={column}>
              <Skeleton
                className={cn(
                  "h-3 rounded-full",
                  column === 0 ? "w-40 max-w-full" : "w-16",
                )}
                delay={delay}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export {
  Table,
  TableActions,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableRowLink,
  TableSkeletonRows,
};
