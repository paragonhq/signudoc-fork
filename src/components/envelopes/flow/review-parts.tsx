import { CircleAlertIcon, MailIcon } from "@/components/ui/icons";
import Link from "next/link";
import type { ReactNode } from "react";

import { PaperThumb } from "@/components/dashboard/paper-thumb";
import { getInitials } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

import { getSignerPalette } from "../signer-palette";

export type ReviewFieldSummaryLabel =
  | "Checkbox"
  | "Date"
  | "Dropdown"
  | "Initials"
  | "Name"
  | "Number"
  | "Radio group"
  | "Signature"
  | "Text";

export type ReviewSigner = {
  email: string;
  fieldSummaries: readonly ReviewFieldSummaryLabel[];
  id: string;
  name: string;
  order: number;
};

export function formatSignerFieldSummary(
  fields: readonly ReviewFieldSummaryLabel[],
) {
  const fieldCount = fields.length;

  if (fieldCount === 0) {
    return "No fields placed yet (0 fields)";
  }

  return `(${fieldCount} field${fieldCount === 1 ? "" : "s"})`;
}

/** "Signature, date and text": what a signer fills in, in words. */
export function describeFields(fields: readonly ReviewFieldSummaryLabel[]) {
  const kinds = [...new Set(fields)].sort((left, right) =>
    left === "Signature" ? -1 : right === "Signature" ? 1 : 0,
  );
  const words = kinds.map((kind, index) =>
    index === 0 ? kind : kind.toLowerCase(),
  );

  if (words.length <= 1) {
    return words[0] ?? "";
  }

  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/** Each kind of field once, with how many: [["Signature", 2], ["Date", 1]]. */
export function countFields(fields: readonly ReviewFieldSummaryLabel[]) {
  const counts = new Map<ReviewFieldSummaryLabel, number>();

  for (const field of fields) {
    counts.set(field, (counts.get(field) ?? 0) + 1);
  }

  return [...counts.entries()].sort(([left], [right]) =>
    left === "Signature" ? -1 : right === "Signature" ? 1 : 0,
  );
}

/** "2 people sign, one after another. One more gets a copy." */
export function describeRoute(
  signers: readonly Pick<ReviewSigner, "name">[],
  copyRecipients: readonly { name: string }[],
) {
  // Counts, not names: the people are listed right below, by name.
  const route =
    signers.length === 0
      ? ""
      : signers.length === 1
        ? "One person signs, then it's sealed."
        : `${signers.length} people sign, one after another.`;
  const copies =
    copyRecipients.length === 1
      ? " One more gets a copy."
      : copyRecipients.length > 1
        ? ` ${copyRecipients.length} more get a copy.`
        : "";

  return `${route}${copies}`;
}

/** "Riley" from "Riley Recipient", for friendly lines. */
export function firstName(name: string) {
  const trimmed = name.trim();

  return trimmed.includes("@") ? trimmed : (trimmed.split(/\s+/)[0] ?? trimmed);
}

/** A small label above or inside a card, like the documents list's groups. */
export function ReviewGroupLabel({
  action,
  children,
  id,
}: {
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-3 px-1">
      <h3
        className="text-[0.8125rem] leading-5 font-medium text-(--secondary)"
        id={id}
      >
        {children}
      </h3>
      {action}
    </div>
  );
}

/** A quiet link on a group label's line ("Edit"). */
export function ReviewEditLink({
  children,
  href,
  label,
}: {
  children: ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-label={label}
      className="-mr-1 rounded-full px-2 py-0.5 text-[0.8125rem] leading-5 font-medium text-(--accent-ink) outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--accent-softer) focus-visible:shadow-(--focus-ring)"
      href={href}
    >
      {children}
    </Link>
  );
}

/**
 * The document, as the head of the envelope: its title and size. On a
 * phone its first page sits beside it (on a desktop the whole document is
 * already in view beside the step).
 */
export function ReviewDocument({
  envelopeId,
  filename,
  pageCount,
  title,
}: {
  envelopeId: string;
  filename: string;
  pageCount: number;
  title: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5 lg:px-6 lg:pt-6 lg:pb-5">
      <span className="flex h-[5.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-(--radius-well) bg-(--surface) sm:h-28 sm:w-[5.75rem] lg:hidden">
        <PaperThumb
          className="h-[4.5rem] sm:h-[5.75rem]"
          envelopeId={envelopeId}
          title={title}
        />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-lg leading-6 font-semibold tracking-[-0.02em] text-balance break-words text-(--fg) sm:text-xl sm:leading-7">
          {title}
        </h2>
        <p className="flex min-w-0 items-center text-[0.8125rem] leading-5 text-(--secondary)">
          <span className="shrink-0 tabular-nums">
            {pageCount} {pageCount === 1 ? "page" : "pages"}
          </span>
          <span aria-hidden="true" className="px-1.5">
            ·
          </span>
          <span className="truncate">{filename}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * A signer colour made a touch deeper (lighter in dark mode) for small
 * text on its own tint, so it keeps 4.5:1 for every signer colour.
 */
export function legibleInk(color: string) {
  return `color-mix(in oklab, ${color} 78%, var(--fg))`;
}

/** A person's initials on their signer colour, with their place in line. */
function RouteAvatar({ index, name }: { index: number; name: string }) {
  const palette = getSignerPalette(index);

  return (
    <span
      aria-hidden="true"
      className="relative inline-flex size-9 shrink-0 self-start"
    >
      <span
        className="inline-flex size-9 items-center justify-center rounded-full text-[0.8125rem] font-semibold tracking-[0.01em] select-none"
        style={{
          backgroundColor: palette.tint,
          color: legibleInk(palette.color),
        }}
      >
        {getInitials(name)}
      </span>
      <span
        className="absolute -right-1.5 -bottom-1 inline-flex size-4 items-center justify-center rounded-full bg-(--paper) text-[0.5625rem] leading-none font-semibold tabular-nums shadow-[0_0_0_1.5px_var(--paper),0_1px_2px_rgb(var(--fg-rgb)/0.16)]"
        style={{ color: legibleInk(palette.color) }}
      >
        {index + 1}
      </span>
    </span>
  );
}

/** The line that joins one step of the route to the next. */
function RouteThread() {
  return (
    <span
      aria-hidden="true"
      className="absolute top-[3.625rem] bottom-[-0.375rem] left-[2.125rem] w-px bg-(--divider) sm:left-[2.375rem]"
    />
  );
}

/**
 * Who signs, in order, as a route: each person's initials on their
 * signer colour (the colour their fields wear on the page beside it),
 * joined by a thread to whoever comes next, with what they fill in as
 * small chips. Pointing at someone brings their fields forward.
 */
export function ReviewRoute({
  activeIndex = null,
  hasCopies = false,
  onHighlight,
  signers,
}: {
  activeIndex?: number | null;
  /** The thread carries on to the copy recipients below. */
  hasCopies?: boolean;
  onHighlight?: (index: number | null) => void;
  signers: readonly ReviewSigner[];
}) {
  return (
    <ol className="flex flex-col pb-2">
      {signers.map((signer, index) => {
        const palette = getSignerPalette(index);
        const hasSignature = signer.fieldSummaries.includes("Signature");
        const counts = countFields(signer.fieldSummaries);
        const isLast = index === signers.length - 1;

        return (
          <li
            className={cn(
              "relative flex gap-3 rounded-(--radius-well) px-4 py-3.5 sm:gap-4 sm:px-5",
              "transition-[background-color] duration-(--dur-hover) ease-(--ease-out)",
              activeIndex === index && "bg-[rgb(var(--fg-rgb)/0.025)]",
            )}
            data-active={activeIndex === index ? "" : undefined}
            key={signer.id}
            onPointerEnter={() => onHighlight?.(index)}
            onPointerLeave={() => onHighlight?.(null)}
          >
            {!isLast || hasCopies ? <RouteThread /> : null}
            <RouteAvatar index={index} name={signer.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-[0.9375rem] leading-5 font-medium tracking-[-0.01em] text-(--fg)">
                    <span className="sr-only">Signer {signer.order}: </span>
                    {signer.name}
                  </p>
                  <p className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
                    {signer.email}
                  </p>
                </div>
                <p className="shrink-0 text-[0.8125rem] leading-5 text-(--secondary) max-sm:hidden">
                  {`Signs ${ORDINAL_WORDS[index] ?? `${String(index + 1)}th`}`}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {counts.map(([kind, count]) => (
                  <span
                    className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium"
                    key={kind}
                    style={{
                      backgroundColor: palette.tint,
                      color: legibleInk(palette.color),
                    }}
                  >
                    {kind}
                    {count > 1 ? (
                      <span className="tabular-nums opacity-75">×{count}</span>
                    ) : null}
                  </span>
                ))}
                {!hasSignature ? (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-(--danger-soft) px-2 text-xs font-medium text-(--danger)">
                    <CircleAlertIcon aria-hidden="true" className="size-3.5" />
                    No signature
                  </span>
                ) : null}
                <span className="pl-0.5 text-xs leading-6 text-(--secondary) tabular-nums">
                  {formatSignerFieldSummary(signer.fieldSummaries)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const ORDINAL_WORDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
];

/** The people who get the finished document, at the end of the route. */
export function ReviewCopies({
  copyRecipients,
}: {
  copyRecipients: readonly { email: string; id: string; name: string }[];
}) {
  return (
    <ul className="flex flex-col pb-2">
      {copyRecipients.map((recipient, index) => (
        <li
          className="relative flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5"
          key={recipient.id}
        >
          {index < copyRecipients.length - 1 ? <RouteThread /> : null}
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-(--surface-strong) text-(--secondary)"
          >
            <MailIcon className="size-4" strokeWidth={1.75} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-[0.9375rem] leading-5 font-medium tracking-[-0.01em] text-(--fg)">
              {recipient.name}
            </p>
            <p className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
              {recipient.email}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
