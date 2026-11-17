"use client";

import { CheckIcon, CircleAlertIcon } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Envelope } from "@/components/objects/envelope";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { TextMorph } from "@/components/ui/text-morph";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import { PERMITTED_USE_PATH } from "@/lib/permitted-uses";

export type SendTrayPhase = "error" | "idle" | "sending" | "sent";

type SendTrayProps = {
  /** "Tue, 1 Dec 2026", or null before the browser knows today. */
  deadlineDate: string | null;
  deadlineDays: number;
  errorMessage: string | null;
  firstSignerName: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  phase: SendTrayPhase;
  /** Set when signers sign through the install's signing provider. */
  signatureType: string | null;
  signerCount: number;
};

/**
 * The last word before sending, as a Family tray: who gets it first and
 * until when, the one confirmation to tick, and Send now. Above it the
 * envelope waits open with the letter out; sending plays its send
 * sequence (the letter slides in and the flap closes while the request is
 * out, then a seal presses on and it lifts). The button morphs Send now →
 * Sending… → Sent (a small tick settles in), and while the envelope is
 * going out the tray cannot be dismissed.
 */
export function SendTray({
  deadlineDate,
  deadlineDays,
  errorMessage,
  firstSignerName,
  onConfirm,
  onOpenChange,
  open,
  phase,
  signatureType,
  signerCount,
}: SendTrayProps) {
  const reduceMotion = useReducedMotion();
  const [isPermittedUseConfirmed, setIsPermittedUseConfirmed] = useState(false);
  const isLocked = phase === "sending" || phase === "sent";

  function close() {
    if (isLocked) {
      return;
    }

    setIsPermittedUseConfirmed(false);
    onOpenChange(false);
  }

  return (
    <Tray
      dismissible={!isLocked}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      open={open}
    >
      <TrayContent showCloseButton={false} size="md">
        <TrayHeader>
          <TrayTitle>Send this envelope?</TrayTitle>
          <TrayDescription>
            {phase === "sent" ? (
              <>On its way. {firstSignerName} has it in their inbox now.</>
            ) : (
              <>
                {firstSignerName} gets it{signerCount > 1 ? " first" : ""}, by
                email, right away.{" "}
                {deadlineDate
                  ? `The link works until ${deadlineDate}.`
                  : `The link works for ${deadlineDays} days.`}
              </>
            )}
          </TrayDescription>
        </TrayHeader>

        <TrayBody className="flex flex-col gap-3">
          <div aria-hidden="true" className="flex justify-center pt-12 pb-3">
            <Envelope
              pose="active"
              scale={0.8}
              send={
                phase === "sent"
                  ? "sealed"
                  : phase === "sending"
                    ? "closing"
                    : "idle"
              }
            />
          </div>
          {signatureType ? (
            <p className="rounded-(--radius-well) bg-(--surface) px-4 py-3 text-[0.8125rem] leading-5 text-(--secondary)">
              Signature type: {signatureType}. It cannot be changed once the
              envelope is sent.
            </p>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-(--radius-well) bg-(--surface) px-4 py-3.5 transition-[background-color] duration-(--dur-hover) ease-(--ease-out) has-data-[state=checked]:bg-(--accent-softer)">
            <Checkbox
              checked={isPermittedUseConfirmed}
              className="mt-0.5"
              disabled={isLocked}
              onCheckedChange={(checked) =>
                setIsPermittedUseConfirmed(checked === true)
              }
            />
            <span className="text-[0.8125rem] leading-5 text-(--secondary-strong)">
              By sending, you confirm this document is an ordinary business
              agreement and not a will, court order, legally required consumer
              disclosure, or other{" "}
              <a
                className="font-medium text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.3)] underline-offset-4 hover:decoration-(--accent-ink)"
                href={PERMITTED_USE_PATH}
                rel="noreferrer"
                target="_blank"
              >
                document that cannot be signed electronically
              </a>
              .
            </span>
          </label>

          <AnimatePresence initial={false}>
            {errorMessage ? (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    duration: exitDuration(DUR.move),
                    ease: EASE.exit,
                  },
                }}
                initial={{ height: 0, opacity: 0 }}
                transition={{ duration: DUR.move, ease: EASE.out }}
              >
                <p
                  className="flex items-start gap-2.5 rounded-(--radius-well) bg-(--danger-soft) px-4 py-3 text-[0.8125rem] leading-5 text-(--danger)"
                  role="alert"
                >
                  <CircleAlertIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {errorMessage}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </TrayBody>

        <TrayFooter>
          <Button
            disabled={isLocked}
            onClick={close}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            aria-busy={phase === "sending" || undefined}
            className="min-w-[7.5rem]"
            disabled={!isPermittedUseConfirmed}
            onClick={() => {
              if (!isLocked) {
                onConfirm();
              }
            }}
            type="button"
          >
            <AnimatePresence initial={false}>
              {phase === "sent" ? (
                <motion.span
                  animate={{ opacity: 1, scale: 1, width: "auto" }}
                  className="inline-flex overflow-hidden"
                  initial={
                    reduceMotion
                      ? { opacity: 0, scale: 1, width: "auto" }
                      : { opacity: 0, scale: 0.5, width: 0 }
                  }
                  key="tick"
                  transition={{ duration: DUR.open, ease: EASE.pop }}
                >
                  <CheckIcon aria-hidden="true" strokeWidth={2.25} />
                </motion.span>
              ) : null}
            </AnimatePresence>
            <TextMorph>
              {phase === "sent"
                ? "Sent"
                : phase === "sending"
                  ? "Sending…"
                  : "Send now"}
            </TextMorph>
          </Button>
        </TrayFooter>
      </TrayContent>
    </Tray>
  );
}
