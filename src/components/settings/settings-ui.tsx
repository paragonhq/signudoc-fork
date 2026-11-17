"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckIcon,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type IconComponent,
} from "@/components/ui/icons";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  FieldControlContext,
  type FieldControlContextValue,
} from "@/components/ui/field-context";
import { usePrefersReducedMotion } from "@/components/ui/hooks";
import { Label } from "@/components/ui/label";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { TextMorph } from "@/components/ui/text-morph";

/*
 * The parts every settings section is built from, calm and grouped like
 * iOS settings brought to the web:
 *
 *   <SettingsGroup label="Account">                    a quiet chapter title
 *     <SettingsSection id="profile" title="Profile" description="…">
 *       <SettingRows>                                  one white card
 *         <SettingRow label="Full name" description="…"><Input … /></SettingRow>
 *       </SettingRows>
 *     </SettingsSection>
 *   </SettingsGroup>
 *
 * A section is a 16px title (and at most one line of description) over a
 * white card (radius 20, soft elevation, no borders). Inside the card,
 * rows: the label and a short description on the left, the control on the
 * right (stacked on phones), light inset dividers between them. Anything
 * long or rare opens in a tray from a row instead of living inline.
 */

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** The scroll margin under the sticky header and jump bar, per breakpoint. */
export const SECTION_SCROLL_MARGIN =
  "scroll-mt-32 lg:scroll-mt-24 xl:scroll-mt-10";

/**
 * Light dividers between the direct children of a card, inset from both
 * edges like the rows in Documents. Works for anything stacked in the card
 * (rows, a revealed row, a notice), and a child that is not rendered
 * leaves no stray line.
 */
export const CARD_DIVIDERS =
  "[&>*+*]:relative [&>*+*]:before:pointer-events-none [&>*+*]:before:absolute [&>*+*]:before:inset-x-4 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-(--divider) sm:[&>*+*]:before:inset-x-5";

export function SettingsSection({
  actions,
  children,
  className,
  description,
  footer,
  hideTitle = false,
  id,
  status,
  title,
}: {
  /** Beside the title: a status pill, a download. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** One short line under the title. */
  description?: ReactNode;
  /** Accepted for older callers; calm sections draw no eyebrow. */
  eyebrow?: ReactNode;
  /** A small note under the card, like an iOS settings footer. */
  footer?: ReactNode;
  /**
   * For a card whose one row already says what it is (Close account): the
   * title stays for screen readers, the card stands on its own.
   */
  hideTitle?: boolean;
  id: string;
  /** A status pill set right after the title ("On", "Up to date"). */
  status?: ReactNode;
  title: ReactNode;
  /** Accepted for older callers; a danger section only tints its action. */
  tone?: "default" | "danger";
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        SECTION_SCROLL_MARGIN,
        "flex flex-col gap-3 rounded-(--radius-card) outline-none focus-visible:shadow-(--focus-ring)",
        className,
      )}
      data-settings-section=""
      id={id}
      tabIndex={-1}
    >
      <header
        className={cn(
          "flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
          hideTitle && "sr-only",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3
              className="text-base leading-6 font-semibold tracking-[-0.015em] text-balance text-(--fg)"
              id={`${id}-title`}
            >
              {title}
            </h3>
            {status}
          </div>
          {description ? (
            <div className="max-w-[62ch] text-sm leading-5 text-pretty text-(--secondary)">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
      <div
        className={cn(
          "flex flex-col rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)",
          CARD_DIVIDERS,
        )}
        data-slot="settings-card"
      >
        {children}
      </div>
      {footer ? (
        <div className="max-w-[62ch] px-1 text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/**
 * A group of sections (Account, Organization…): a quiet chapter title and
 * generous room around it. It is the h2; the sections are h3.
 */
export function SettingsGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <h2
        className="px-1 text-xl leading-7 font-semibold tracking-[-0.025em] text-(--fg)"
        id={headingId}
      >
        {label}
      </h2>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}

/**
 * A place inside a card the navigation can jump to (Password, Two-step
 * sign-in): rows that share a card with others but have their own entry
 * in the list.
 */
export function SettingsAnchor({
  children,
  id,
}: {
  children: ReactNode;
  id: string;
}) {
  return (
    <div
      className={cn(
        SECTION_SCROLL_MARGIN,
        "flex flex-col outline-none",
        CARD_DIVIDERS,
      )}
      data-settings-anchor=""
      id={id}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

/** Rows inside a card, with light inset dividers between them. */
export function SettingRows({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col", CARD_DIVIDERS, className)}
      data-slot="setting-rows"
    >
      {children}
    </div>
  );
}

type SettingRowProps = {
  /** Text under the label. Wired as the control's description. */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  error?: ReactNode;
  /** Use your own control id; one is generated otherwise. */
  id?: string;
  label: ReactNode;
  /**
   * `field` (default): the label is a <label> for the one control on the
   * right, which picks up id, description and invalid state.
   * `group`: the right side holds buttons or a status; the label is text.
   */
  kind?: "field" | "group";
  /**
   * `split` (default): label left, control right (stacked on phones).
   * `stack`: control below. `inline`: control right at every size, for a
   * switch.
   */
  layout?: "split" | "stack" | "inline";
  /** Width of the control column in split layout. */
  controlWidth?: "sm" | "md" | "lg" | "auto";
};

const CONTROL_WIDTH = {
  auto: "md:grid-cols-[minmax(0,1fr)_auto]",
  lg: "md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]",
  md: "md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]",
  sm: "md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]",
} as const;

export function SettingRow({
  children,
  className,
  controlWidth = "md",
  description,
  disabled,
  error,
  id,
  kind = "field",
  label,
  layout = "split",
}: SettingRowProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const invalid = Boolean(error);
  const context = useMemo<FieldControlContextValue>(
    () => ({
      describedBy:
        [description ? descriptionId : null, invalid ? errorId : null]
          .filter(Boolean)
          .join(" ") || undefined,
      disabled,
      id: controlId,
      invalid,
    }),
    [controlId, description, descriptionId, disabled, errorId, invalid],
  );

  return (
    <div
      className={cn(
        "grid gap-3 px-4 py-4 sm:px-5",
        layout === "split" &&
          cn("md:items-center md:gap-8", CONTROL_WIDTH[controlWidth]),
        layout === "inline" &&
          "grid-cols-[minmax(0,1fr)_auto] items-center gap-5 md:gap-8",
        className,
      )}
      data-disabled={disabled || undefined}
      data-slot="setting-row"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        {kind === "field" ? (
          <Label
            className="w-fit text-[0.9375rem] leading-5 font-medium tracking-[-0.01em]"
            htmlFor={controlId}
          >
            {label}
          </Label>
        ) : (
          <p className="text-[0.9375rem] leading-5 font-medium tracking-[-0.01em] text-(--fg)">
            {label}
          </p>
        )}
        {description ? (
          <div
            className="max-w-[56ch] text-[0.8125rem] leading-5 text-pretty text-(--secondary)"
            id={descriptionId}
          >
            {description}
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col">
        {kind === "field" ? (
          <FieldControlContext value={context}>{children}</FieldControlContext>
        ) : (
          children
        )}
        <FieldError id={errorId}>{error}</FieldError>
      </div>
    </div>
  );
}

/** Actions at the foot of a card: an optional note left, buttons right. */
export function SettingsFooter({
  children,
  className,
  hint,
}: {
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className,
      )}
    >
      <div className="min-w-0 text-[0.8125rem] leading-5 text-(--secondary)">
        {hint}
      </div>
      <div className="flex flex-wrap items-center gap-2 max-sm:*:flex-1">
        {children}
      </div>
    </div>
  );
}

/** Padding for a notice that sits in a card between rows. */
export function CardNotice({ children }: { children: ReactNode }) {
  return <div className="px-4 py-4 sm:px-5">{children}</div>;
}

const NOTICE_TONES = {
  accent: {
    className: "bg-(--accent-softer) [&_[data-icon]]:text-(--accent-ink)",
    icon: Info,
  },
  danger: {
    className: "bg-(--danger-soft) [&_[data-icon]]:text-(--danger)",
    icon: CircleAlert,
  },
  neutral: {
    className: "bg-(--surface) [&_[data-icon]]:text-(--secondary)",
    icon: Info,
  },
  success: {
    className: "bg-(--success-soft) [&_[data-icon]]:text-(--success)",
    icon: CircleCheck,
  },
  warning: {
    className: "bg-(--warning-soft) [&_[data-icon]]:text-(--warning)",
    icon: TriangleAlert,
  },
} satisfies Record<string, { className: string; icon: IconComponent }>;

export type NoticeTone = keyof typeof NOTICE_TONES;

/** An inline message in a soft tinted well: what happened, or what to do. */
export function Notice({
  action,
  children,
  className,
  icon,
  role,
  title,
  tone = "neutral",
}: {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: IconComponent;
  role?: "alert" | "status";
  title?: ReactNode;
  tone?: NoticeTone;
}) {
  const Icon = icon ?? NOTICE_TONES[tone].icon;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-2 rounded-(--radius-well) px-3.5 py-3 text-[0.8125rem] leading-5 text-(--fg)",
        NOTICE_TONES[tone].className,
        className,
      )}
      role={role ?? (tone === "danger" ? "alert" : undefined)}
    >
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0"
        data-icon=""
        strokeWidth={1.75}
      />
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
        {title ? <p className="font-medium text-(--fg)">{title}</p> : null}
        {children ? (
          <div className="text-pretty text-(--secondary-strong)">
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

/**
 * Appears with height and opacity, leaves faster. For inline notices and
 * rows that come and go (an error, the email domains field).
 */
export function Reveal({
  children,
  className,
  show,
}: {
  children: ReactNode;
  className?: string;
  show: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          animate={{
            height: "auto",
            opacity: 1,
            transition: { duration: DUR.move, ease: EASE.out },
          }}
          className={cn("overflow-hidden", className)}
          exit={{
            height: 0,
            opacity: 0,
            transition: { duration: exitDuration(DUR.move), ease: EASE.exit },
          }}
          initial={{ height: 0, opacity: 0 }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const SAVED_HOLD_MS = 2400;

/**
 * The unsaved-changes bar: a floating white pill that rises in only while
 * a form has changes, and rides the bottom of the screen while that form
 * is in view (above the phone's tab bar). Discard puts the saved values
 * back; Save morphs to Saving…. When the save lands, the buttons fold away
 * and the pill itself says so ("Organization settings saved.") before it
 * sinks: the confirmation appears where the person was looking, not in a
 * toast somewhere else. The Save button keeps its full name ("Save
 * organization settings") for screen readers and tests.
 */
export function SaveBar({
  changes,
  dirty,
  disabled,
  onDiscard,
  saveLabel,
  savedMessage = "Saved",
  saving,
}: {
  /** How many settings changed. */
  changes?: number;
  dirty: boolean;
  disabled?: boolean;
  onDiscard: () => void;
  saveLabel: string;
  /** What the pill says once the save has landed. */
  savedMessage?: string;
  saving: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [wasSaving, setWasSaving] = useState(saving);
  const [justSaved, setJustSaved] = useState(false);

  // Saving finished with nothing left to save: it worked. Say so.
  if (saving !== wasSaving) {
    setWasSaving(saving);
    setJustSaved(!saving && !dirty);
  }

  const showSaved = justSaved && !dirty && !saving;

  useEffect(() => {
    if (!showSaved) {
      return;
    }

    const timer = window.setTimeout(() => setJustSaved(false), SAVED_HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [showSaved]);

  const visible = dirty || saving || showSaved;
  const status = showSaved
    ? savedMessage
    : changes && changes > 1
      ? `${String(changes)} unsaved changes`
      : "Unsaved changes";
  const swap = {
    animate: { filter: "blur(0px)", opacity: 1, y: 0 },
    exit: { filter: "blur(2px)", opacity: 0, y: reducedMotion ? 0 : -6 },
    initial: { filter: "blur(2px)", opacity: 0, y: reducedMotion ? 0 : 6 },
    transition: { duration: DUR.move, ease: EASE.out },
  };

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          animate={{
            opacity: 1,
            scale: 1,
            transition: { duration: DUR.open, ease: EASE.out },
            y: 0,
          }}
          className="pointer-events-none sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 mt-4 flex justify-center lg:bottom-6"
          exit={{
            opacity: 0,
            scale: reducedMotion ? 1 : 0.98,
            transition: { duration: exitDuration(DUR.open), ease: EASE.exit },
            y: reducedMotion ? 0 : 12,
          }}
          initial={{
            opacity: 0,
            scale: reducedMotion ? 1 : 0.98,
            y: reducedMotion ? 0 : 16,
          }}
        >
          <div
            aria-label="Unsaved changes"
            className={cn(
              "pointer-events-auto flex max-w-full items-center rounded-full bg-(--paper) shadow-(--shadow-pop)",
              "transition-[padding] duration-(--dur-move) ease-(--ease-out)",
              showSaved ? "py-2.5 pr-5 pl-4" : "py-1.5 pr-1.5 pl-4",
            )}
            role="region"
          >
            <p
              aria-live="polite"
              className="flex min-w-0 items-center gap-2 text-sm leading-5 font-medium text-(--fg)"
            >
              {showSaved ? (
                <CheckIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-(--success)"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-(--warning-dot)"
                />
              )}
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span className="truncate" key={status} {...swap}>
                  {status}
                </motion.span>
              </AnimatePresence>
            </p>
            <AnimatePresence initial={false}>
              {showSaved ? null : (
                <motion.div
                  animate={{ opacity: 1, width: "auto" }}
                  className="flex shrink-0 items-center gap-1 overflow-hidden"
                  exit={{ opacity: 0, width: 0 }}
                  initial={{ opacity: 0, width: 0 }}
                  transition={{ duration: DUR.move, ease: EASE.out }}
                >
                  <span aria-hidden="true" className="w-2 shrink-0" />
                  <Button
                    disabled={saving || disabled}
                    onClick={onDiscard}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Discard
                  </Button>
                  <Button
                    aria-busy={saving || undefined}
                    aria-label={saving ? undefined : saveLabel}
                    disabled={disabled}
                    onClick={(event) => {
                      // Already saving: the press does nothing.
                      if (saving) {
                        event.preventDefault();
                      }
                    }}
                    size="sm"
                    type="submit"
                  >
                    <TextMorph>{saving ? "Saving…" : "Save"}</TextMorph>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Reads a JSON body without throwing on an empty or broken one. */
export async function readJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
