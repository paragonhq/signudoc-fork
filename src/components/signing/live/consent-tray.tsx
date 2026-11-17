"use client";

import {
  ChevronDownIcon,
  MailIcon,
  PenLineIcon,
  ScrollTextIcon,
} from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/layout/brand";
import { useBranding } from "@/components/layout/branding-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import { cn } from "@/lib/cn";
import type { SigningDisclosure } from "@/lib/schemas/signing";

/** "about 1 minute": a few seconds a field, and a moment to read. */
export function estimateSigningMinutes(fieldCount: number) {
  return Math.max(1, Math.round((30 + fieldCount * 10) / 60));
}

/**
 * The first thing a signer sees: a warm arrival and agreement to sign
 * electronically, in one tray. Who sent it and what it is (the title, the
 * pages, how many fields are theirs, about how long it takes), then the
 * plain-language summary, the full disclosure a tap away, one checkbox,
 * one button. It cannot be dismissed, only agreed to or declined.
 */
export function ConsentTray({
  disclosure,
  envelopeTitle,
  error,
  fieldCount,
  isSaving,
  onAgree,
  onDecline,
  open,
  pageCount,
  senderName,
  signerName,
}: {
  disclosure: SigningDisclosure;
  envelopeTitle: string;
  error: string | null;
  /** The fields this signer fills in (dates fill themselves). */
  fieldCount: number;
  isSaving: boolean;
  onAgree: () => void;
  onDecline: () => void;
  open: boolean;
  pageCount: number;
  senderName: string;
  signerName: string;
}) {
  const firstName = signerName.trim().split(/\s+/)[0] ?? "";
  const greeting =
    firstName && !firstName.includes("@") ? `Hi ${firstName}` : "Hi";
  const { logoUrl, organizationName } = useBranding();
  const minutes = estimateSigningMinutes(fieldCount);
  const facts = [
    `${pageCount} ${pageCount === 1 ? "page" : "pages"}`,
    fieldCount > 0
      ? `${fieldCount} ${fieldCount === 1 ? "field" : "fields"} for you`
      : null,
    `about ${minutes} ${minutes === 1 ? "minute" : "minutes"}`,
  ].filter(Boolean);
  const [checked, setChecked] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const reduceMotion = useReducedMotion();
  const disclosureId = useId();

  return (
    <Tray dismissible={false} open={open}>
      <TrayContent
        onOpenAutoFocus={(event) => {
          // Land on the tray itself, not on its first link: the summary
          // reads first, and no focus ring flashes on arrival.
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
        showCloseButton={false}
        size="md"
      >
        <TrayHeader className="pr-6 max-sm:pr-5">
          <TrayTitle>Before you sign</TrayTitle>
          <TrayDescription>
            {greeting}, here&apos;s what you&apos;re signing.
          </TrayDescription>
        </TrayHeader>

        <TrayBody className="flex flex-col gap-4 pt-2">
          <section
            aria-label="What you're signing"
            className="overflow-hidden rounded-(--radius-well) bg-(--surface)"
          >
            <div className="flex items-center gap-4 px-4 pt-4 pb-3.5">
              <DocumentGlyph />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[0.9375rem] leading-5 font-semibold tracking-[-0.01em] text-(--fg)">
                  {envelopeTitle}
                </p>
                <p className="mt-1 text-[0.8125rem] leading-5 text-(--secondary) tabular-nums">
                  {facts.join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 border-t border-[rgb(var(--fg-rgb)/0.06)] px-4 py-2.5">
              <Avatar name={senderName} size="sm" tone="accent" />
              <p className="min-w-0 flex-1 truncate text-[0.8125rem] leading-5 text-(--secondary)">
                From{" "}
                <span className="font-medium text-(--fg)">{senderName}</span>
                {organizationName && organizationName !== senderName
                  ? ` at ${organizationName}`
                  : null}
              </p>
              {logoUrl ? (
                <BrandLogo
                  className="h-5 max-w-20 shrink-0 object-right"
                  compact
                  src={logoUrl}
                />
              ) : null}
            </div>
          </section>

          <ul className="flex flex-col gap-2.5 px-0.5">
            <SummaryPoint icon={<PenLineIcon />}>
              Your electronic signature counts the same as one in ink.
            </SummaryPoint>
            <SummaryPoint icon={<ScrollTextIcon />}>
              You can ask for paper, or decline, any time before you sign.
            </SummaryPoint>
            <SummaryPoint icon={<MailIcon />}>
              Your signed copy comes by email, to keep as your record.
            </SummaryPoint>
          </ul>

          <div>
            <button
              aria-controls={disclosureId}
              aria-expanded={showFull}
              className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2 rounded-[0.625rem] px-2 text-left text-sm font-medium text-(--accent-ink) outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) focus-visible:shadow-(--focus-ring)"
              onClick={() => setShowFull((value) => !value)}
              type="button"
            >
              {showFull
                ? "Hide the full disclosure"
                : "Read the full disclosure"}
              <ChevronDownIcon
                aria-hidden="true"
                className={cn(
                  "size-4 transition-transform duration-(--dur-move) ease-(--ease-out)",
                  showFull && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {showFull ? (
                <motion.div
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: reduceMotion
                      ? { duration: 0 }
                      : { duration: DUR.panel, ease: EASE.out },
                  }}
                  className="overflow-hidden"
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: reduceMotion
                      ? { duration: 0 }
                      : { duration: exitDuration(DUR.panel), ease: EASE.exit },
                  }}
                  id={disclosureId}
                  initial={{ height: 0, opacity: 0 }}
                >
                  <div className="mt-1 flex max-h-[38dvh] flex-col gap-4 overflow-y-auto overscroll-contain rounded-(--radius-well) bg-(--surface) p-4 text-[0.8125rem] leading-6 text-(--secondary)">
                    {disclosure.sections.map((section) => (
                      <section key={section.heading}>
                        <h3 className="text-sm font-medium text-(--fg)">
                          {section.heading}
                        </h3>
                        <p className="mt-1">{section.text}</p>
                      </section>
                    ))}
                    <p className="text-xs text-(--secondary)">
                      Disclosure version {disclosure.version}
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-(--radius-well) px-4 py-3.5 text-sm leading-6 text-(--fg) transition-[background-color] duration-(--dur-hover) ease-(--ease-out)",
              checked
                ? "bg-(--accent-softer)"
                : "bg-(--surface) hover:bg-(--surface-strong)",
            )}
          >
            <Checkbox
              aria-label="I agree to use electronic records and signatures"
              checked={checked}
              className="mt-1"
              disabled={isSaving}
              onCheckedChange={(value) => setChecked(value === true)}
            />
            <span>{disclosure.statement}</span>
          </label>

          {error ? (
            <p
              className="rounded-(--radius-well) bg-(--danger-soft) px-4 py-3 text-[0.8125rem] leading-5 text-(--danger)"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </TrayBody>

        <TrayFooter>
          <Button disabled={isSaving} onClick={onDecline} variant="ghost">
            Decline
          </Button>
          <Button
            disabled={!checked}
            loading={isSaving}
            onClick={onAgree}
            size="lg"
          >
            Agree and continue
          </Button>
        </TrayFooter>
      </TrayContent>
    </Tray>
  );
}

/** A small page with a sign-here mark: the document, at a glance. */
function DocumentGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-[3.25rem] w-10 shrink-0 overflow-visible"
      fill="none"
      viewBox="0 0 40 52"
    >
      <rect
        fill="var(--paper)"
        height="52"
        rx="5"
        style={{
          filter:
            "drop-shadow(0 1px 1px rgb(var(--fg-rgb) / 0.08)) drop-shadow(0 4px 8px rgb(var(--fg-rgb) / 0.06))",
        }}
        width="40"
      />
      <rect
        fill="var(--fg)"
        height="2.5"
        opacity="0.7"
        rx="1.25"
        width="16"
        x="6"
        y="7"
      />
      {[0.9, 0.75, 0.85].map((fraction, index) => (
        <rect
          fill="var(--surface-strong)"
          height="2"
          key={index}
          rx="1"
          width={28 * fraction}
          x="6"
          y={14 + index * 5}
        />
      ))}
      <rect fill="var(--sign-here)" height="8" rx="2" width="20" x="6" y="36" />
    </svg>
  );
}

function SummaryPoint({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 text-sm leading-5 text-(--fg)">
      <span
        aria-hidden="true"
        className="inline-flex size-5 shrink-0 items-center justify-center text-(--secondary) [&_svg]:size-4 [&_svg]:stroke-[1.75]"
      >
        {icon}
      </span>
      <span className="text-pretty">{children}</span>
    </li>
  );
}
