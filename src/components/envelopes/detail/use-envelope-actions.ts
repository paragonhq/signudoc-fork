"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { toast } from "@/components/ui/toaster";
import { formatReminderInterval } from "@/lib/services/reminders";

/**
 * An action the server refused. Trays show the message where the person is
 * looking; the header's own actions toast it.
 */
export class ActionError extends Error {}

type Payload = {
  error?: string;
  id?: string;
  name?: string;
  redirectPath?: string;
} | null;

async function readPayload(response: Response): Promise<Payload> {
  return (await response.json().catch(() => null)) as Payload;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method,
  };
}

/**
 * Every management action on the envelope detail page, against the same
 * endpoints as before. After a change the route is refreshed in place
 * (router.refresh) and a toast says what happened; no full page reloads.
 */
export function useEnvelopeActions(
  envelopeId: string,
  /** Where to go once it is deleted, when not the server's choice. */
  afterDeleteHref?: string,
) {
  const router = useRouter();
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const base = `/api/envelopes/${encodeURIComponent(envelopeId)}`;

  const refresh = useCallback(() => router.refresh(), [router]);

  const download = useCallback(
    (fileType: "evidence" | "signed") => {
      // A file download from an API route, not a page navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`${base}/download?type=${fileType}`);
    },
    [base],
  );

  const exportAuditTrail = useCallback(() => {
    // A file download from an API route, not a page navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${base}/audit`);
  }, [base]);

  const sendReminder = useCallback(
    async (signerName?: string) => {
      setIsSendingReminder(true);

      try {
        const response = await fetch(`${base}/nudge`, { method: "POST" });
        const payload = await readPayload(response);

        if (response.ok) {
          toast.success(
            signerName ? `Reminder sent to ${signerName}` : "Reminder sent",
          );
          refresh();
          return true;
        }

        if (
          response.status === 404 ||
          response.status === 409 ||
          response.status === 429
        ) {
          toast(payload?.error ?? "This envelope changed. Showing the latest.");
          refresh();
          return false;
        }

        toast.error(payload?.error ?? "Unable to send a reminder right now.");
        return false;
      } catch {
        toast.error("Unable to send a reminder right now.");
        return false;
      } finally {
        setIsSendingReminder(false);
      }
    },
    [base, refresh],
  );

  const changeDeadline = useCallback(
    async (expiresInDays: number) => {
      let response: Response;

      try {
        response = await fetch(
          `${base}/deadline`,
          jsonInit("POST", { expiresInDays }),
        );
      } catch {
        throw new ActionError("Unable to change the deadline.");
      }

      const payload = await readPayload(response);

      if (response.ok) {
        toast.success("Deadline updated", {
          description: `${String(expiresInDays)} days from now.`,
        });
        refresh();
        return;
      }

      if (response.status === 404 || response.status === 409) {
        toast(payload?.error ?? "This envelope changed. Showing the latest.");
        refresh();
        return;
      }

      throw new ActionError(payload?.error ?? "Unable to change the deadline.");
    },
    [base, refresh],
  );

  const changeReminders = useCallback(
    async (intervalDays: number | null) => {
      let response: Response;

      try {
        response = await fetch(
          `${base}/reminders`,
          jsonInit("POST", { reminderIntervalDays: intervalDays }),
        );
      } catch {
        throw new ActionError("Unable to change the reminders.");
      }

      const payload = await readPayload(response);

      if (response.ok) {
        toast.success(
          intervalDays === null
            ? "Automatic reminders turned off"
            : `Reminders: ${formatReminderInterval(intervalDays).toLowerCase()}`,
        );
        refresh();
        return;
      }

      if (response.status === 404 || response.status === 409) {
        toast(payload?.error ?? "This envelope changed. Showing the latest.");
        refresh();
        return;
      }

      throw new ActionError(
        payload?.error ?? "Unable to change the reminders.",
      );
    },
    [base, refresh],
  );

  const correctSigner = useCallback(
    async (signerId: string, next: { email: string; name: string }) => {
      let response: Response;

      try {
        response = await fetch(
          `${base}/signers/${encodeURIComponent(signerId)}`,
          jsonInit("PATCH", next),
        );
      } catch {
        throw new ActionError("Unable to correct this signer.");
      }

      const payload = await readPayload(response);

      if (response.ok) {
        toast.success(`${next.name.trim() || "Signer"} corrected`, {
          description: "The link sent before no longer works.",
        });
        refresh();
        return;
      }

      throw new ActionError(payload?.error ?? "Unable to correct this signer.");
    },
    [base, refresh],
  );

  const copyToDraft = useCallback(async () => {
    let response: Response;

    try {
      response = await fetch(`${base}/copy`, { method: "POST" });
    } catch {
      throw new ActionError("Unable to copy this envelope.");
    }

    const payload = await readPayload(response);

    if (response.ok && typeof payload?.id === "string") {
      toast.success("Copied to a new draft", {
        description: "Nobody was emailed. The original is unchanged.",
      });
      router.push(`/envelopes/${encodeURIComponent(payload.id)}`);
      return;
    }

    if (response.status === 404) {
      refresh();
      throw new ActionError(payload?.error ?? "This envelope is unavailable.");
    }

    throw new ActionError(payload?.error ?? "Unable to copy this envelope.");
  }, [base, refresh, router]);

  const deleteDraft = useCallback(async () => {
    let response: Response;

    try {
      response = await fetch(base, { method: "DELETE" });
    } catch {
      throw new ActionError("Unable to delete this draft.");
    }

    const payload = await readPayload(response);

    if (!response.ok) {
      throw new ActionError(payload?.error ?? "Unable to delete this draft.");
    }

    toast.success("Draft deleted");
    router.push(payload?.redirectPath ?? "/dashboard");
  }, [base, router]);

  /** An administrator deletes a finished envelope for good. */
  const deleteFinished = useCallback(
    async (reason: string) => {
      let response: Response;

      try {
        response = await fetch(`${base}/delete`, jsonInit("POST", { reason }));
      } catch {
        // The request may or may not have reached the server.
        throw new ActionError(
          "Could not reach the server. Reload the page to see whether the envelope was deleted.",
        );
      }

      const payload = await readPayload(response);

      if (!response.ok) {
        throw new ActionError(
          payload?.error ?? "Unable to delete this envelope.",
        );
      }

      toast.success("Envelope deleted", {
        description: "The deletion is kept in the install's audit log.",
      });
      router.push(afterDeleteHref ?? payload?.redirectPath ?? "/dashboard");
    },
    [afterDeleteHref, base, router],
  );

  const voidEnvelope = useCallback(
    async (reason: string) => {
      let response: Response;

      try {
        response = await fetch(`${base}/void`, jsonInit("POST", { reason }));
      } catch {
        throw new ActionError("Unable to void this envelope.");
      }

      const payload = await readPayload(response);
      const here = `/envelopes/${encodeURIComponent(envelopeId)}`;

      if (response.ok) {
        toast.success("Envelope voided", {
          description: "Signing has stopped. Notified signers are told.",
        });

        if (payload?.redirectPath && payload.redirectPath !== here) {
          router.push(payload.redirectPath);
        } else {
          refresh();
        }

        return;
      }

      if (response.status === 404 || response.status === 409) {
        toast(payload?.error ?? "This envelope changed. Showing the latest.");
        refresh();
        return;
      }

      throw new ActionError(payload?.error ?? "Unable to void this envelope.");
    },
    [base, envelopeId, refresh, router],
  );

  return useMemo(
    () => ({
      changeDeadline,
      changeReminders,
      copyToDraft,
      correctSigner,
      deleteDraft,
      deleteFinished,
      download,
      exportAuditTrail,
      isSendingReminder,
      refresh,
      sendReminder,
      voidEnvelope,
    }),
    [
      changeDeadline,
      changeReminders,
      copyToDraft,
      correctSigner,
      deleteDraft,
      deleteFinished,
      download,
      exportAuditTrail,
      isSendingReminder,
      refresh,
      sendReminder,
      voidEnvelope,
    ],
  );
}

export type EnvelopeActions = ReturnType<typeof useEnvelopeActions>;

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof ActionError ? error.message : fallback;
}
