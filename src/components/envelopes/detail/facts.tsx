"use client";

import {
  ArrowRightIcon,
  BellRingIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  LayoutTemplateIcon,
} from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

import { timeLeft } from "./derive";
import type { DetailModel } from "./model";
import { Section } from "./section";
import type { TrayName } from "./trays/tray-name";

const card =
  "overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)";

/**
 * While it is out: when it expires and how often people are nudged, each
 * in one sentence with a way to change it. Only shown while it is out.
 */
export function TimingCard({
  model,
  onOpenTray,
}: {
  model: DetailModel;
  onOpenTray: (tray: TrayName) => void;
}) {
  const left = useTimeLeft(model);

  return (
    <Section title="Deadline and reminders">
      <div className={card}>
        <FactRow
          action={
            model.isOwn ? (
              <ChangeButton
                label={
                  model.isExpired ? "Set a new deadline" : "Change deadline"
                }
                onClick={() => onOpenTray("deadline")}
              >
                {model.isExpired ? "Renew" : "Change"}
              </ChangeButton>
            ) : undefined
          }
          icon={<CalendarClockIcon />}
          note={
            model.isExpired ? null : left ? (
              <span className={cn(left.soon && "text-(--warning)")}>
                {left.label}
              </span>
            ) : null
          }
          tone={model.isExpired ? "warning" : undefined}
        >
          {model.deadlineText}
        </FactRow>
        <div className="mx-4 h-px bg-(--divider) sm:mx-5" />
        <FactRow
          action={
            model.isOwn ? (
              <ChangeButton
                label="Change reminders"
                onClick={() => onOpenTray("reminders")}
              >
                Change
              </ChangeButton>
            ) : undefined
          }
          icon={<BellRingIcon />}
          note={
            model.reminderHelperText ??
            (model.record.reminderIntervalDays == null
              ? null
              : "Sent to whoever’s turn it is.")
          }
        >
          {model.remindersText}
        </FactRow>
      </div>
    </Section>
  );
}

/** "29 days left", read in the browser once mounted and once a minute. */
function useTimeLeft(model: DetailModel) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (model.deadlineAt === null || model.isExpired) {
      return;
    }

    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 60_000);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [model.deadlineAt, model.isExpired]);

  return model.deadlineAt !== null && now !== null
    ? timeLeft(model.deadlineAt - now)
    : null;
}

function FactRow({
  action,
  children,
  icon,
  note,
  tone,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  note?: ReactNode;
  tone?: "warning";
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-[0.625rem] [&_svg]:size-4 [&_svg]:stroke-[1.75]",
          tone === "warning"
            ? "bg-(--warning-soft) text-(--warning)"
            : "bg-(--surface) text-(--fg)",
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
        <p className="text-sm leading-5 font-medium text-pretty text-(--fg)">
          {children}
        </p>
        {note ? (
          <p className="text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
            {note}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function ChangeButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="-mr-2 shrink-0"
      onClick={onClick}
      size="xs"
      variant="ghost"
    >
      {children}
    </Button>
  );
}

/**
 * The facts people rarely need (the envelope's ID, exact dates, Part 11,
 * the audit file) behind one small "Details" disclosure.
 */
export function DetailsDisclosure({
  model,
  onExport,
}: {
  model: DetailModel;
  onExport: () => void;
}) {
  const panelId = useId();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { record } = model;

  return (
    <section aria-label="Details" className={card}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm font-medium text-(--fg) outline-none transition-colors duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--accent-rgb)/0.45)] sm:px-5"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Details
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            "size-4 text-(--secondary) transition-transform duration-(--dur-move) ease-(--ease-out)",
            open && "rotate-180",
          )}
          strokeWidth={1.75}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{
              height: 0,
              opacity: 0,
              transition: { duration: exitDuration(DUR.move), ease: EASE.exit },
            }}
            id={panelId}
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: DUR.move, ease: EASE.out }}
          >
            <dl className="flex flex-col gap-3 border-t border-(--divider) px-4 pt-4 pb-4 sm:px-5">
              <DetailRow label="Envelope ID">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs text-(--fg)">
                    {model.envelopeId}
                  </span>
                  <CopyButton
                    aria-label="Copy envelope ID"
                    className="-my-1 size-6 shrink-0"
                    size="icon-xs"
                    toastMessage="Envelope ID copied"
                    value={model.envelopeId}
                  />
                </span>
              </DetailRow>
              <DetailRow label="Created">{record.createdAtLabel}</DetailRow>
              {model.sentAt ? (
                <DetailRow label="Sent">{model.sentAt} UTC</DetailRow>
              ) : null}
              {record.part11 ? (
                <DetailRow label="Part 11">
                  On: signers give their password again to sign
                </DetailRow>
              ) : null}
            </dl>
            {record.status !== "draft" ? (
              <div className="px-2.5 pb-3 sm:px-3.5">
                <Button onClick={onExport} size="sm" variant="ghost">
                  <DownloadIcon aria-hidden="true" />
                  Export audit trail
                </Button>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function DetailRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[0.8125rem] leading-5 text-(--secondary)">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 text-(--fg)">{children}</dd>
    </div>
  );
}

/**
 * Offered once a document is done: keep it as a template. After saving it
 * becomes the confirmation in place, with the way to the templates.
 */
export function TemplateSuggestion({
  onSave,
  savedTemplateName,
}: {
  onSave: () => void;
  savedTemplateName: string | null;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-label="Template" className={cn(card, "p-4 sm:p-5")}>
      <AnimatePresence initial={false} mode="popLayout">
        {savedTemplateName ? (
          <motion.div
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            className="flex flex-col items-start gap-3"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { filter: "blur(2px)", opacity: 0, y: 6 }
            }
            key="saved"
            role="status"
            transition={{ duration: DUR.open, ease: EASE.out }}
          >
            <span
              aria-hidden="true"
              className="inline-flex size-8 items-center justify-center rounded-[0.625rem] bg-(--success-soft) text-(--success)"
            >
              <CheckIcon className="size-4" strokeWidth={2} />
            </span>
            <p className="text-sm leading-5 text-pretty text-(--fg)">
              Saved as the template &ldquo;{savedTemplateName}&rdquo;.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/templates">
                View templates
                <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
              </Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col items-start gap-3"
            exit={{
              filter: "blur(2px)",
              opacity: 0,
              transition: { duration: exitDuration(DUR.open), ease: EASE.exit },
            }}
            key="invite"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-8 items-center justify-center rounded-[0.625rem] bg-(--accent-softer) text-(--accent-ink)"
            >
              <LayoutTemplateIcon className="size-4" strokeWidth={1.75} />
            </span>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-sm leading-5 font-semibold text-(--fg)">
                Send this often?
              </h2>
              <p className="text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
                Keep its fields and signing order, and only name the people next
                time.
              </p>
            </div>
            <Button onClick={onSave} size="sm" variant="outline">
              Save as template
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
