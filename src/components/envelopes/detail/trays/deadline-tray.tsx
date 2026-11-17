"use client";

import { CalendarClockIcon } from "@/components/ui/icons";
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
import {
  DEFAULT_ENVELOPE_DEADLINE_DAYS,
  ENVELOPE_DEADLINE_DAY_OPTIONS,
} from "@/lib/types/domain";

import { errorMessage } from "../use-envelope-actions";
import {
  ConfirmButton,
  DONE_HOLD_MS,
  TrayError,
  type ConfirmPhase,
  type ReturnFocusProps,
} from "./tray-parts";

type DeadlineTrayProps = ReturnFocusProps & {
  expired: boolean;
  onConfirm: (expiresInDays: number) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const previewFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
  year: "numeric",
});

function dayLabel(days: number) {
  if (days === 7) return "1 week";
  if (days === 14) return "2 weeks";
  return `${String(days)} days`;
}

/** Change (or, once expired, renew) the signing deadline. */
export function DeadlineTray({
  expired,
  onConfirm,
  onOpenChange,
  open,
  returnFocusRef,
}: DeadlineTrayProps) {
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
        <DeadlineForm
          expired={expired}
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

function DeadlineForm({
  expired,
  onClose,
  onConfirm,
  pending,
  phase,
  setPhase,
}: {
  expired: boolean;
  onClose: () => void;
  onConfirm: (expiresInDays: number) => Promise<void>;
  pending: boolean;
  phase: ConfirmPhase;
  setPhase: (phase: ConfirmPhase) => void;
}) {
  const labelId = useId();
  const [days, setDays] = useState<number>(DEFAULT_ENVELOPE_DEADLINE_DAYS);
  const [error, setError] = useState<string | null>(null);
  // Read once when the tray opens; the preview only needs the day.
  const [now] = useState(() => Date.now());
  const preview = previewFormatter.format(new Date(now + days * 86_400_000));

  async function submit() {
    setError(null);
    setPhase("pending");

    try {
      await onConfirm(days);
      setPhase("done");
      window.setTimeout(() => {
        onClose();
        setPhase("idle");
      }, DONE_HOLD_MS);
    } catch (caught) {
      setPhase("idle");
      setError(errorMessage(caught, "Unable to change the deadline."));
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
      <TrayHeader icon={<CalendarClockIcon aria-hidden="true" />}>
        <TrayTitle>
          {expired ? "Set a new deadline" : "Change the deadline"}
        </TrayTitle>
        <TrayDescription>
          {expired
            ? "Counted from now. The link already sent works again."
            : "Counted from now. The link already sent keeps working."}
        </TrayDescription>
      </TrayHeader>
      <TrayBody className="flex flex-col gap-4 pt-4">
        <div className="flex flex-col gap-2">
          <span
            className="text-sm leading-5 font-medium text-(--fg)"
            id={labelId}
          >
            Signing deadline
          </span>
          <Segmented
            aria-labelledby={labelId}
            className="w-full"
            fill
            items={ENVELOPE_DEADLINE_DAY_OPTIONS.map((option) => ({
              disabled: pending,
              label: (
                <>
                  <span aria-hidden="true" className="sm:hidden">
                    {option}d
                  </span>
                  <span className="max-sm:sr-only">{dayLabel(option)}</span>
                </>
              ),
              value: String(option),
            }))}
            onValueChange={(value) => setDays(Number(value))}
            size="sm"
            value={String(days)}
          />
        </div>
        <p
          aria-live="polite"
          className="rounded-(--radius-well) bg-(--surface) px-4 py-3 text-sm leading-5 text-(--secondary)"
        >
          People can sign until{" "}
          <span className="font-medium text-(--fg) tabular-nums">
            {preview}
          </span>
          .
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
          labels={{ done: "Saved", idle: "Save deadline", pending: "Saving…" }}
          phase={phase}
          type="submit"
        />
      </TrayFooter>
    </form>
  );
}
