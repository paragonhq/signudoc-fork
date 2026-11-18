"use client";

import { useState } from "react";

import { ConfirmTray } from "@/components/ui/confirm-tray";
import { FormField } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { errorMessage } from "../use-envelope-actions";

type DangerTrayProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

/** Delete a draft: danger tray, press and hold. */
export function DeleteDraftTray({
  onConfirm,
  onOpenChange,
  open,
}: DangerTrayProps & { onConfirm: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  // A fresh tray each time it opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(null);
  }

  return (
    <ConfirmTray
      confirmLabel="Delete draft"
      description="It was never sent. The draft and its placed fields are removed for good."
      error={error}
      onConfirm={async () => {
        setError(null);

        try {
          await onConfirm();
        } catch (caught) {
          setError(errorMessage(caught, "Unable to delete this draft."));
          throw caught;
        }
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Delete this draft?"
    />
  );
}

/**
 * Void a sent envelope. The reason goes to the audit trail; in Part 11 mode
 * it is required, so the hold is refused (with a message) until it is given.
 */
export function VoidEnvelopeTray({
  onConfirm,
  onOpenChange,
  open,
  reasonRequired,
}: DangerTrayProps & {
  onConfirm: (reason: string) => Promise<void>;
  reasonRequired: boolean;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  // A fresh tray each time it opens.
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setReason("");
      setError(null);
      setReasonError(null);
    }
  }

  return (
    <ConfirmTray
      confirmLabel="Void envelope"
      description="Signing stops at once, and anyone already asked is told. This can’t be undone."
      error={error}
      onConfirm={async () => {
        setError(null);

        if (reasonRequired && reason.trim().length === 0) {
          setReasonError("A reason is required in Part 11 mode.");
          setError("Add a reason above, then hold again.");
          throw new Error("reason required");
        }

        try {
          await onConfirm(reason);
        } catch (caught) {
          setError(errorMessage(caught, "Unable to void this envelope."));
          throw caught;
        }
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Void this envelope?"
    >
      <FormField
        error={reasonError}
        hint="Kept in the envelope's audit trail."
        label="Reason"
        labelAside={
          <span className="text-[0.8125rem] text-(--secondary)">
            {reasonRequired ? "Required" : "Optional"}
          </span>
        }
        required={reasonRequired}
      >
        <Textarea
          maxLength={1000}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(null);
          }}
          rows={3}
          value={reason}
        />
      </FormField>
    </ConfirmTray>
  );
}

/**
 * An administrator deletes a finished envelope: its signed PDF, certificate
 * and audit trail go; the install's own audit log keeps a record. A click,
 * not a hold: this tray is already the confirmation, behind its own button.
 * In Part 11 mode the reason is required.
 */
export function DeleteFinishedTray({
  onConfirm,
  onOpenChange,
  open,
  reasonRequired,
}: DangerTrayProps & {
  onConfirm: (reason: string) => Promise<void>;
  reasonRequired: boolean;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  // A fresh tray each time it opens.
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setReason("");
      setError(null);
      setReasonError(null);
    }
  }

  return (
    <ConfirmTray
      confirmLabel="Delete envelope"
      description="The envelope, its signed PDF, its certificate and its audit trail are deleted for good, and download links already sent stop working. This can’t be undone."
      error={error}
      hold={false}
      onConfirm={async () => {
        setError(null);

        if (reasonRequired && reason.trim().length === 0) {
          setReasonError("A reason is required in Part 11 mode.");
          throw new Error("reason required");
        }

        try {
          await onConfirm(reason);
        } catch (caught) {
          setError(errorMessage(caught, "Unable to delete this envelope."));
          throw caught;
        }
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Delete this envelope?"
    >
      <FormField
        error={reasonError}
        hint="Kept in the install's audit log, with the document's fingerprints."
        label={reasonRequired ? "Reason (required)" : "Reason (optional)"}
        required={reasonRequired}
      >
        <Textarea
          maxLength={1000}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(null);
          }}
          rows={3}
          value={reason}
        />
      </FormField>
    </ConfirmTray>
  );
}
