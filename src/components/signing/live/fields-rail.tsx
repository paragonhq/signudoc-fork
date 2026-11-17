"use client";

import { motion } from "motion/react";

import { Avatar } from "@/components/ui/avatar";
import { LockIcon } from "@/components/ui/icons";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import type {
  SigningCurrentField,
  SigningVisibleField,
} from "@/lib/schemas/signing";

import { ChecklistRow, type ChecklistItem } from "./action-bar";

export type OtherSigner = {
  /** The fields they filled in, for the count. */
  fieldCount: number;
  name: string;
  /** Unix seconds of their last submission. */
  signedAt: number;
};

/** The earlier signers whose values sit locked on the page. */
export function summarizeOtherSigners(
  visibleFields: readonly SigningVisibleField[],
): OtherSigner[] {
  const byName = new Map<string, OtherSigner>();

  for (const field of visibleFields) {
    const current = byName.get(field.signerName);

    byName.set(field.signerName, {
      fieldCount: (current?.fieldCount ?? 0) + 1,
      name: field.signerName,
      signedAt: Math.max(current?.signedAt ?? 0, field.submittedAt),
    });
  }

  return [...byName.values()].sort((a, b) => a.signedAt - b.signedAt);
}

const shortDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

/**
 * "Your fields", always in view beside the document on a wide screen: how
 * far along the signer is, every field with its state (tap one to go to
 * it), and below, the people who signed before them with their values
 * locked on the page. Narrower screens get the same list from the
 * floating bar.
 */
export function FieldsRail({
  checklist,
  doneCount,
  onSelectField,
  others,
  pageCount,
}: {
  checklist: ChecklistItem[];
  doneCount: number;
  onSelectField: (field: SigningCurrentField) => void;
  others: OtherSigner[];
  pageCount: number;
}) {
  const total = checklist.length;
  const progress = total === 0 ? 1 : doneCount / total;

  return (
    <nav
      aria-label="Your fields"
      className="fixed top-24 left-[max(1rem,calc(50%-43rem))] z-20 hidden max-h-[calc(100dvh-9rem)] w-56 flex-col gap-6 overflow-y-auto overscroll-contain pb-4 min-[1400px]:flex"
      data-animate="enter"
    >
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 px-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm leading-5 font-semibold text-(--fg)">
              Your fields
            </h2>
            <p className="text-[0.8125rem] leading-5 text-(--secondary) tabular-nums">
              {doneCount} of {total} done
            </p>
          </div>
          <div
            aria-hidden="true"
            className="h-1 overflow-hidden rounded-full bg-[rgb(var(--fg-rgb)/0.07)]"
          >
            <motion.div
              animate={{ scaleX: progress }}
              className="h-full origin-left rounded-full bg-(--accent)"
              initial={false}
              transition={{ duration: DUR.panel, ease: EASE.out }}
            />
          </div>
        </div>
        <ol className="-mx-0.5 flex flex-col">
          {checklist.map((item) => (
            <li key={item.field.id}>
              <ChecklistRow
                item={item}
                onSelect={onSelectField}
                pageCount={pageCount}
              />
            </li>
          ))}
        </ol>
      </section>

      {others.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-2.5 text-sm leading-5 font-semibold text-(--fg)">
            Signed by others
          </h2>
          <ul className="flex flex-col">
            {others.map((other) => (
              <li
                className="flex min-h-12 items-center gap-3 px-2.5 py-1.5"
                key={other.name}
              >
                <Avatar name={other.name} size="sm" tone="neutral" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm leading-5 font-medium text-(--fg)">
                    {other.name}
                  </span>
                  <span
                    className="truncate text-[0.8125rem] leading-5 text-(--secondary)"
                    suppressHydrationWarning
                  >
                    Signed {shortDate.format(new Date(other.signedAt * 1000))}
                  </span>
                </span>
                <LockIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-(--secondary)"
                  strokeWidth={1.75}
                />
              </li>
            ))}
          </ul>
          <p className="px-2.5 text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
            Their entries are locked on the page.
          </p>
        </section>
      ) : null}
    </nav>
  );
}
