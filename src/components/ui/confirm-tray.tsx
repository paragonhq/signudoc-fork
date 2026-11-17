"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TextMorph } from "@/components/ui/text-morph";
import {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
  TrayTrigger,
} from "@/components/ui/tray";

type HoldPhase = "idle" | "holding" | "early" | "armed" | "done";

type HoldToConfirmButtonProps = Omit<
  React.ComponentProps<"button">,
  "onClick" | "children"
> & {
  children: React.ReactNode;
  /** How long to hold, in ms. */
  duration?: number;
  loading?: boolean;
  onConfirm: () => void;
  onPhaseChange?: (phase: HoldPhase) => void;
  tone?: "danger" | "default";
};

/**
 * Press and hold to confirm. A fill sweeps across the button (clip-path,
 * linear, `duration`); let go early and it snaps back in 200ms. Keyboard:
 * hold Enter or Space. Assistive tech that clicks without holding (a click
 * with no pointer or key behind it) gets a two-step fallback: the first
 * activation arms the button and says so, a second within 4s confirms.
 */
function HoldToConfirmButton({
  children,
  className,
  disabled = false,
  duration = 1200,
  loading = false,
  onConfirm,
  onPhaseChange,
  tone = "danger",
  ...props
}: HoldToConfirmButtonProps) {
  const [phase, setPhaseState] = React.useState<HoldPhase>("idle");
  const holdTimer = React.useRef<number | undefined>(undefined);
  const armTimer = React.useRef<number | undefined>(undefined);
  const inactive = disabled || loading;

  const setPhase = React.useCallback(
    (next: HoldPhase) => {
      setPhaseState(next);
      onPhaseChange?.(next);
    },
    [onPhaseChange],
  );

  React.useEffect(
    () => () => {
      window.clearTimeout(holdTimer.current);
      window.clearTimeout(armTimer.current);
    },
    [],
  );

  function start() {
    if (inactive || phase === "holding" || phase === "done") {
      return;
    }

    window.clearTimeout(armTimer.current);
    setPhase("holding");
    holdTimer.current = window.setTimeout(() => {
      setPhase("done");
      onConfirm();
    }, duration);
  }

  function release() {
    if (phase !== "holding") {
      return;
    }

    window.clearTimeout(holdTimer.current);
    setPhase("early");
  }

  const filled = phase === "holding" || phase === "done" || loading;
  const filling = phase === "holding";

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={cn(
        "group/hold relative isolate inline-flex min-h-(--control-h) shrink-0 items-center justify-center overflow-hidden rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none select-none [-webkit-touch-callout:none] [touch-action:manipulation]",
        "focus-visible:shadow-(--focus-ring)",
        // Holding sinks it on the press spring; letting go settles it back.
        "[transition:background-color_var(--dur-hover)_var(--ease-out),box-shadow_var(--dur-hover)_var(--ease-out),scale_var(--spring-settle-dur)_var(--spring-settle)]",
        "disabled:pointer-events-none disabled:opacity-45",
        "data-[phase=holding]:scale-[0.97] data-[phase=holding]:[transition:scale_var(--spring-press-dur)_var(--spring-press)] motion-reduce:data-[phase=holding]:scale-100",
        // A tinted chip with a soft top highlight and a hairline of its tone.
        tone === "danger"
          ? "bg-(--danger-soft) text-(--danger) shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_0_0_1px_rgb(var(--danger-rgb)/0.1)] hover:bg-[rgb(var(--danger-rgb)/0.14)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.05),inset_0_0_0_1px_rgb(var(--danger-rgb)/0.2)]"
          : "bg-(--accent-softer) text-(--accent-ink) shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_0_0_1px_rgb(var(--accent-rgb)/0.08)] hover:bg-(--accent-soft) dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.05),inset_0_0_0_1px_rgb(var(--accent-rgb)/0.2)]",
        className,
      )}
      data-phase={phase}
      data-slot="hold-to-confirm"
      disabled={disabled}
      onBlur={(event) => {
        props.onBlur?.(event);
        release();
      }}
      onClick={(event) => {
        // Pointer and key presses are handled as holds. A click with
        // detail 0 and no hold behind it came from assistive tech.
        if (event.detail !== 0 || inactive) {
          return;
        }

        if (phase === "armed") {
          window.clearTimeout(armTimer.current);
          setPhase("done");
          onConfirm();
        } else {
          setPhase("armed");
          armTimer.current = window.setTimeout(() => setPhase("idle"), 4000);
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();

          if (!event.repeat) {
            start();
          }
        }
      }}
      onKeyUp={(event) => {
        props.onKeyUp?.(event);

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          release();
        }
      }}
      onPointerCancel={release}
      onPointerDown={(event) => {
        props.onPointerDown?.(event);

        if (event.button === 0) {
          start();
        }
      }}
      onPointerLeave={release}
      onPointerUp={release}
      type="button"
    >
      <span className="relative">{children}</span>
      {/* The fill: the same label in reverse, revealed left to right. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-[inherit] bg-(image:--surface-sheen) px-4 text-(--on-accent) shadow-[var(--surface-highlight-fill),inset_0_0_0_1px_rgb(0_0_0/0.1)]",
          tone === "danger" ? "bg-(--danger-solid)" : "bg-(--accent)",
        )}
        style={{
          clipPath: filled ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: filling
            ? `clip-path ${duration}ms linear`
            : "clip-path 200ms var(--ease-out)",
        }}
      >
        {loading ? <Spinner /> : children}
      </span>
    </button>
  );
}

const HOLD_HINTS: Record<HoldPhase, string> = {
  armed: "Press again to confirm",
  done: "Confirming…",
  early: "Hold a little longer",
  holding: "Keep holding",
  idle: "Press and hold to confirm",
};

type ConfirmTrayProps = {
  cancelLabel?: string;
  /** Extra content between the description and the actions. */
  children?: React.ReactNode;
  /** Close once onConfirm resolves (default true). */
  closeOnConfirm?: boolean;
  confirmLabel: string;
  /** Overrides the "Type X to confirm" label. */
  confirmationLabel?: React.ReactNode;
  /** A phrase to type before the action unlocks (case-insensitive). */
  confirmationText?: string;
  defaultOpen?: boolean;
  description?: React.ReactNode;
  /** An error to show above the actions (e.g. from the server). */
  error?: React.ReactNode;
  /** Require a press-and-hold (default true). */
  hold?: boolean;
  /** Tray width on desktop (default md, 480px). */
  size?: "sm" | "md" | "lg";
  holdDuration?: number;
  /**
   * Runs on confirm. Return a promise to show progress: the tray stays open
   * (and cannot be dismissed) until it settles, closes when it resolves,
   * and shows a retry message when it rejects.
   */
  onConfirm: () => void | Promise<unknown>;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  title: React.ReactNode;
  tone?: "danger" | "default";
  /** The element that opens it, e.g. <Button variant="destructive-ghost">Void</Button>. */
  trigger?: React.ReactElement;
};

/**
 * A confirmation for actions with consequences: void an envelope, delete a
 * template, close an account. Danger tone by default (tinted header, warning
 * glyph), an optional typed phrase, and a hold-to-confirm button so a stray
 * click or Enter never does damage. Cancel takes focus first.
 *
 *   <ConfirmTray
 *     trigger={<Button variant="destructive-ghost">Void envelope</Button>}
 *     title="Void this envelope?"
 *     description="Signers can no longer open it. This cannot be undone."
 *     confirmLabel="Void envelope"
 *     onConfirm={() => voidEnvelope(id)}
 *   />
 */
function ConfirmTray({
  cancelLabel = "Cancel",
  children,
  closeOnConfirm = true,
  confirmLabel,
  confirmationLabel,
  confirmationText,
  defaultOpen = false,
  description,
  error,
  hold = true,
  holdDuration = 1200,
  onConfirm,
  onOpenChange,
  open: openProp,
  size = "md",
  title,
  tone = "danger",
  trigger,
}: ConfirmTrayProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const [pending, setPending] = React.useState(false);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) {
        setUncontrolledOpen(next);
      }

      onOpenChange?.(next);
    },
    [onOpenChange, openProp],
  );

  return (
    <Tray dismissible={!pending} onOpenChange={setOpen} open={open}>
      {trigger ? <TrayTrigger asChild>{trigger}</TrayTrigger> : null}
      <TrayContent showCloseButton={!pending} size={size} tone={tone}>
        <ConfirmTrayInner
          cancelLabel={cancelLabel}
          close={() => setOpen(false)}
          closeOnConfirm={closeOnConfirm}
          confirmLabel={confirmLabel}
          confirmationLabel={confirmationLabel}
          confirmationText={confirmationText}
          description={description}
          error={error}
          hold={hold}
          holdDuration={holdDuration}
          onConfirm={onConfirm}
          pending={pending}
          setPending={setPending}
          title={title}
          tone={tone}
        >
          {children}
        </ConfirmTrayInner>
      </TrayContent>
    </Tray>
  );
}

/** Lives inside the tray content, so its state resets every time it opens. */
function ConfirmTrayInner({
  cancelLabel,
  children,
  close,
  closeOnConfirm,
  confirmLabel,
  confirmationLabel,
  confirmationText,
  description,
  error,
  hold,
  holdDuration,
  onConfirm,
  pending,
  setPending,
  title,
  tone,
}: Omit<
  ConfirmTrayProps,
  "defaultOpen" | "onOpenChange" | "open" | "size" | "trigger"
> & {
  close: () => void;
  pending: boolean;
  setPending: (pending: boolean) => void;
}) {
  const [typed, setTyped] = React.useState("");
  const [phase, setPhase] = React.useState<HoldPhase>("idle");
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const hintId = React.useId();
  const unlocked =
    !confirmationText ||
    typed.trim().toLowerCase() === confirmationText.trim().toLowerCase();

  async function confirm() {
    if (!unlocked || pending) {
      return;
    }

    setFailed(false);
    setPending(true);

    try {
      await onConfirm();
      setPending(false);

      if (closeOnConfirm) {
        close();
      }
    } catch {
      setPending(false);
      setFailed(true);
      setPhase("idle");
      // Remount the hold button so its fill resets for another try.
      setAttempt((value) => value + 1);
    }
  }

  const message =
    error ?? (failed ? "That didn't go through. Try again." : null);

  const body = (
    <>
      {children || confirmationText || message ? (
        <TrayBody className="flex flex-col gap-4 pt-4">
          {children}
          {confirmationText ? (
            <FormField
              label={
                confirmationLabel ?? (
                  <>
                    Type{" "}
                    <span className="rounded-md bg-(--surface) px-1.5 py-0.5 font-mono text-[0.8125rem]">
                      {confirmationText}
                    </span>{" "}
                    to confirm
                  </>
                )
              }
            >
              <Input
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                disabled={pending}
                onChange={(event) => setTyped(event.target.value)}
                spellCheck={false}
                value={typed}
              />
            </FormField>
          ) : null}
          {message ? (
            <p
              className="rounded-(--radius-well) bg-(--danger-soft) px-3.5 py-2.5 text-sm leading-5 font-medium text-(--danger)"
              role="alert"
            >
              {message}
            </p>
          ) : null}
        </TrayBody>
      ) : null}
      <TrayFooter className={cn(!children && !confirmationText && "pt-4")}>
        {hold ? (
          <span
            aria-live="polite"
            className="flex justify-center text-[0.8125rem] text-(--secondary) sm:mr-auto sm:justify-start"
            id={hintId}
          >
            <TextMorph>
              {unlocked ? HOLD_HINTS[phase] : "Type the phrase to unlock"}
            </TextMorph>
          </span>
        ) : null}
        <TrayClose asChild>
          <Button disabled={pending} variant="outline">
            {cancelLabel}
          </Button>
        </TrayClose>
        {hold ? (
          <HoldToConfirmButton
            aria-describedby={hintId}
            disabled={!unlocked}
            duration={holdDuration}
            key={attempt}
            loading={pending}
            onConfirm={() => void confirm()}
            onPhaseChange={setPhase}
            tone={tone}
          >
            {confirmLabel}
          </HoldToConfirmButton>
        ) : (
          <Button
            disabled={!unlocked}
            loading={pending}
            type="submit"
            variant={tone === "danger" ? "destructive" : "default"}
          >
            {confirmLabel}
          </Button>
        )}
      </TrayFooter>
    </>
  );

  return (
    <>
      <TrayHeader>
        <TrayTitle>{title}</TrayTitle>
        {description ? <TrayDescription>{description}</TrayDescription> : null}
      </TrayHeader>
      {hold ? (
        body
      ) : (
        // Without a hold, Enter in the typed phrase submits.
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          {body}
        </form>
      )}
    </>
  );
}

export { ConfirmTray, HoldToConfirmButton, type ConfirmTrayProps };
