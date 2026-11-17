"use client";

import { BellRingIcon } from "@/components/ui/icons";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import { formatReminderInterval } from "@/lib/services/reminders";
import { ENVELOPE_REMINDER_DAY_OPTIONS } from "@/lib/types/domain";

import { errorMessage } from "../use-envelope-actions";
import {
  ConfirmButton,
  DONE_HOLD_MS,
  TrayError,
  type ConfirmPhase,
  type ReturnFocusProps,
} from "./tray-parts";

type RemindersTrayProps = ReturnFocusProps & {
  initialIntervalDays: number | null;
  onConfirm: (intervalDays: number | null) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const OFF = "off";

function shortLabel(days: number) {
  if (days === 1) return "Daily";
  if (days === 7) return "Weekly";
  return `${String(days)} days`;
}

/** Automatic reminders: off, or every N days. */
export function RemindersTray({
  initialIntervalDays,
  onConfirm,
  onOpenChange,
  open,
  returnFocusRef,
}: RemindersTrayProps) {
  const [phase, setPhase] = useState<ConfirmPhase>("idle");
  const pending = phase !== "idle";

  return (
    <Tray
      dismissible={!pending}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      open={open}
    >
      <TrayContent
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
        showCloseButton={!pending}
        size="md"
      >
        <RemindersForm
          initialIntervalDays={initialIntervalDays}
          onClose={() => onOpenChange(false)}
          onConfirm={onConfirm}
          pending={pending}
          phase={phase}
          setPhase={setPhase}
        />
      </TrayContent>
    </Tray>
  );
}

function RemindersForm({
  initialIntervalDays,
  onClose,
  onConfirm,
  pending,
  phase,
  setPhase,
}: {
  initialIntervalDays: number | null;
  onClose: () => void;
  onConfirm: (intervalDays: number | null) => Promise<void>;
  pending: boolean;
  phase: ConfirmPhase;
  setPhase: (phase: ConfirmPhase) => void;
}) {
  const labelId = useId();
  const [intervalDays, setIntervalDays] = useState<number | null>(
    initialIntervalDays,
  );
  const [error, setError] = useState<string | null>(null);
  // An interval set some other way than these choices is still offered.
  const options = [
    ...new Set([
      ...ENVELOPE_REMINDER_DAY_OPTIONS,
      ...(initialIntervalDays === null ? [] : [initialIntervalDays]),
    ]),
  ].sort((left, right) => left - right);
  const unchanged = intervalDays === initialIntervalDays;

  async function submit() {
    setError(null);
    setPhase("pending");

    try {
      await onConfirm(intervalDays);
      setPhase("done");
      window.setTimeout(() => {
        onClose();
        setPhase("idle");
      }, DONE_HOLD_MS);
    } catch (caught) {
      setPhase("idle");
      setError(errorMessage(caught, "Unable to change the reminders."));
    }
  }

  return (
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <TrayHeader icon={<BellRingIcon aria-hidden="true" />}>
        <TrayTitle>Automatic reminders</TrayTitle>
        <TrayDescription>
          A nudge for whoever&apos;s turn it is. They stop once everyone has
          signed or the deadline passes.
        </TrayDescription>
      </TrayHeader>
      <TrayBody className="flex flex-col gap-4 pt-4">
        <div className="flex flex-col gap-2">
          <span
            className="text-sm leading-5 font-medium text-(--fg)"
            id={labelId}
          >
            Send a reminder
          </span>
          <Segmented
            aria-labelledby={labelId}
            className="w-full"
            fill
            items={[
              { disabled: pending, label: "Off", value: OFF },
              ...options.map((option) => ({
                disabled: pending,
                label: shortLabel(option),
                value: String(option),
              })),
            ]}
            onValueChange={(value) =>
              setIntervalDays(value === OFF ? null : Number(value))
            }
            size="sm"
            value={intervalDays === null ? OFF : String(intervalDays)}
          />
        </div>
        <p
          aria-live="polite"
          className="rounded-(--radius-well) bg-(--surface) px-4 py-3 text-sm leading-5 text-(--secondary)"
        >
          {intervalDays === null
            ? "Nobody is reminded automatically."
            : `${formatReminderInterval(intervalDays)} until they sign.`}
        </p>
        <TrayError message={error} />
      </TrayBody>
      <TrayFooter>
        <TrayClose asChild>
          <Button disabled={pending} type="button" variant="outline">
            Cancel
          </Button>
        </TrayClose>
        <ConfirmButton
          disabled={unchanged && phase === "idle"}
          labels={{ done: "Saved", idle: "Save reminders", pending: "Saving…" }}
          phase={phase}
          type="submit"
        />
      </TrayFooter>
    </form>
  );
}
