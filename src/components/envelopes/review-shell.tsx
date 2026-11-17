"use client";

import {
  CircleAlertIcon,
  FileQuestionIcon,
  SendIcon,
} from "@/components/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { ReviewEnvelopeData } from "@/lib/envelopes";
import { formatReminderInterval } from "@/lib/services/reminders";
import {
  DEFAULT_ENVELOPE_DEADLINE_DAYS,
  DEFAULT_ENVELOPE_REMINDER_DAYS,
  ENVELOPE_DEADLINE_DAY_OPTIONS,
  ENVELOPE_REMINDER_DAY_OPTIONS,
} from "@/lib/types/domain";

import { FlowDocument, type FlowDocumentField } from "./flow/flow-document";
import { FlowActions, FlowFrame, MetaDot } from "./flow/flow-frame";
import {
  InvitationPreview,
  type InvitationPreviewData,
} from "./flow/invitation-preview";
import {
  ReviewCopies,
  ReviewDocument,
  ReviewEditLink,
  ReviewGroupLabel,
  ReviewRoute,
  describeRoute,
  firstName,
  type ReviewSigner,
} from "./flow/review-parts";
import { ReviewSchedule } from "./flow/review-schedule";
import { SendTray, type SendTrayPhase } from "./flow/send-tray";

export type ReviewInvitationPreview = InvitationPreviewData;

/** A placed field, with the signer it belongs to. */
export type ReviewPreviewField = Omit<FlowDocumentField, "roleIndex"> & {
  signerId: string;
};

// How long "Sent" shows in the tray before it closes, and the pause after
// it closes before the envelope's page opens.
// Long enough for the envelope to take its seal and lift (flow/send-tray).
const sentHoldMs = 640;
const closeHoldMs = 180;
const defaultSendErrorMessage = "Failed to send. Please try again.";
const DAY_MS = 24 * 60 * 60 * 1000;

type ReviewShellProps = {
  envelopeId: string;
  /** Every placed field, for the document beside the review. */
  fields?: readonly ReviewPreviewField[];
  initialState?: "error";
  /** The email the first signer will get, when it could be built. */
  invitation?: ReviewInvitationPreview | null;
  record?: ReviewEnvelopeData;
};

type SendPhase = SendTrayPhase;

type SignatureLevel = "advanced" | "qualified" | "simple";

function describeSignatureLevel(level: SignatureLevel, providerName: string) {
  switch (level) {
    case "advanced":
      return `Advanced electronic signatures through ${providerName}`;
    case "qualified":
      return `Qualified electronic signatures through ${providerName}`;
    default:
      return "SignuDoc signatures";
  }
}

function buildSuccessMessage(firstSignerName: string) {
  return `Sent to ${firstSignerName}`;
}

// Today, as a day number: stable through the day so it can be a snapshot,
// and null on the server so the date is only written in the browser's own
// time zone.
const subscribeToNothing = () => () => {};
const getToday = () => Math.floor(Date.now() / DAY_MS);
const getServerToday = () => null;

function formatDayFromNow(today: number | null, days: number) {
  if (today === null) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    weekday: "short",
    year: "numeric",
  }).format(new Date((today + days) * DAY_MS + DAY_MS / 2));
}

export function ReviewShell({
  envelopeId,
  fields = [],
  initialState,
  invitation = null,
  record,
}: ReviewShellProps) {
  const router = useRouter();
  const [deadlineDays, setDeadlineDays] = useState<number>(
    DEFAULT_ENVELOPE_DEADLINE_DAYS,
  );
  const [reminderDays, setReminderDays] = useState<number | null>(
    DEFAULT_ENVELOPE_REMINDER_DAYS,
  );
  const [signatureLevel, setSignatureLevel] =
    useState<SignatureLevel>("simple");
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [sendPhase, setSendPhase] = useState<SendPhase>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const sendTimeoutRef = useRef<number | null>(null);
  const today = useSyncExternalStore(
    subscribeToNothing,
    getToday,
    getServerToday,
  );

  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) {
        window.clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  if (initialState === "error") {
    return (
      <FlowFrame step={4} title="Ready to send?">
        <EmptyState
          action={
            <Button onClick={() => router.refresh()} variant="outline">
              Retry
            </Button>
          }
          description="We couldn't load this draft. Try again after checking the earlier steps."
          icon={<CircleAlertIcon />}
          role="alert"
          title="Couldn't load the review summary"
        />
      </FlowFrame>
    );
  }

  if (!record || record.isEmpty) {
    return (
      <FlowFrame step={4} title="Ready to send?">
        <EmptyState
          action={
            <Button asChild>
              <Link href={`/envelopes/${envelopeId}/prepare`}>
                Back to prepare
              </Link>
            </Button>
          }
          description="Add signers and place their fields first, then come back to send."
          icon={<FileQuestionIcon />}
          title="Nothing to review yet"
        />
      </FlowFrame>
    );
  }

  const signers: readonly ReviewSigner[] = record.signers;
  const copyRecipients = record.copyRecipients ?? [];
  const canSend = Boolean(record.canSend);
  const disabledReason = record.disabledReason ?? null;
  const firstSigner = signers[0];
  const firstSignerName = firstSigner?.name ?? "Signer 1";
  const isLocked = sendPhase === "sending" || sendPhase === "sent";
  const deadlineDate = formatDayFromNow(today, deadlineDays);
  const signingProvider = record.signingProvider;
  const roleBySignerId = new Map(
    signers.map((signer, index) => [signer.id, index]),
  );
  const documentFields: FlowDocumentField[] = fields.flatMap(
    ({ signerId, ...field }) => {
      const roleIndex = roleBySignerId.get(signerId);

      return roleIndex === undefined ? [] : [{ ...field, roleIndex }];
    },
  );

  function openConfirmation() {
    if (!canSend || isLocked) {
      return;
    }

    setSendError(null);
    setSendPhase("idle");
    setIsConfirmationOpen(true);
  }

  async function handleConfirmSend() {
    if (sendPhase === "sending") {
      return;
    }

    if (sendTimeoutRef.current) {
      window.clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = null;
    }

    setSendError(null);
    setSendPhase("sending");

    try {
      const response = await fetch(`/api/envelopes/${envelopeId}/send`, {
        body: JSON.stringify({
          expiresInDays: deadlineDays,
          permittedUseConfirmed: true,
          reminderIntervalDays: reminderDays,
          ...(signingProvider ? { signatureLevel } : {}),
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        notifiedSignerName?: string;
        redirectPath?: string;
      } | null;

      if (!response.ok) {
        setSendError(payload?.error ?? defaultSendErrorMessage);
        setSendPhase("error");
        return;
      }

      const notifiedSignerName =
        payload?.notifiedSignerName?.trim() || firstSigner?.name || "Signer 1";
      const redirectPath = payload?.redirectPath || `/envelopes/${envelopeId}`;

      // The button says Sent for a moment, the tray closes, then the
      // envelope's page opens (its first page travels there).
      setSendPhase("sent");
      toast.success(buildSuccessMessage(notifiedSignerName), {
        description: `${signers.length === 1 ? "They have" : "Signers have"} ${deadlineDays} days to sign.`,
      });
      sendTimeoutRef.current = window.setTimeout(() => {
        setIsConfirmationOpen(false);
        sendTimeoutRef.current = window.setTimeout(() => {
          startTransition(() => {
            router.push(redirectPath);
          });
        }, closeHoldMs);
      }, sentHoldMs);
    } catch {
      setSendError(defaultSendErrorMessage);
      setSendPhase("error");
    }
  }

  const hint = !canSend
    ? "Not ready to send yet"
    : "The first signer gets an email straight away";

  return (
    <FlowFrame
      aside={
        <FlowDocument
          activeRole={highlighted}
          caption={
            <>
              <span className="tabular-nums">
                {record.pageCount} {record.pageCount === 1 ? "page" : "pages"}
              </span>
              <MetaDot />
              <span>{record.sizeLabel}</span>
            </>
          }
          envelopeId={envelopeId}
          fields={documentFields}
          pageCount={record.pageCount}
        />
      }
      description={describeRoute(signers, copyRecipients)}
      footer={
        <FlowActions
          back={{ href: `/envelopes/${envelopeId}/prepare` }}
          hint={hint}
          onShortcut={canSend && !isLocked ? openConfirmation : undefined}
          primary={
            <Button
              className="max-sm:min-h-12 max-sm:px-6"
              disabled={!canSend || isLocked}
              onClick={openConfirmation}
              type="button"
            >
              <SendIcon aria-hidden="true" />
              Send envelope
            </Button>
          }
        />
      }
      step={4}
      title="Ready to send?"
    >
      {disabledReason ? (
        <div
          className="flex items-start gap-3 rounded-(--radius-well) bg-(--danger-soft) px-4 py-3"
          role="alert"
        >
          <CircleAlertIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-(--danger)"
          />
          <p className="text-sm leading-5 text-(--danger)">{disabledReason}</p>
        </div>
      ) : null}

      <section
        aria-label="The envelope"
        className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
      >
        <ReviewDocument
          envelopeId={envelopeId}
          filename={record.filename}
          pageCount={record.pageCount}
          title={record.title}
        />
        <div className="border-t border-(--divider) pt-3">
          <div className="px-3 sm:px-4">
            <ReviewGroupLabel
              action={
                <ReviewEditLink
                  href={`/envelopes/${envelopeId}/signers`}
                  label="Edit signers"
                >
                  Edit
                </ReviewEditLink>
              }
              id="review-signers"
            >
              {signers.length > 1 ? "Signs in this order" : "Signs it"}
            </ReviewGroupLabel>
          </div>
          <ReviewRoute
            activeIndex={highlighted}
            onHighlight={setHighlighted}
            signers={signers}
          />
        </div>
        {copyRecipients.length > 0 ? (
          <div className="border-t border-(--divider) pt-3">
            <div className="px-3 sm:px-4">
              <ReviewGroupLabel>Gets a copy at the end</ReviewGroupLabel>
            </div>
            <ReviewCopies copyRecipients={copyRecipients} />
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="review-timing"
        className="flex flex-col gap-2.5 pt-2"
      >
        <ReviewGroupLabel id="review-timing">
          Deadline and reminders
        </ReviewGroupLabel>
        <div className="flex flex-col gap-6 rounded-(--radius-card) bg-(--paper) p-4 shadow-(--shadow-card) sm:p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField disabled={isLocked} label="Signing deadline">
              <Select
                onChange={(event) =>
                  setDeadlineDays(Number(event.target.value))
                }
                value={deadlineDays}
              >
                {ENVELOPE_DEADLINE_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField disabled={isLocked} label="Automatic reminders">
              <Select
                onChange={(event) =>
                  setReminderDays(
                    event.target.value === "off"
                      ? null
                      : Number(event.target.value),
                  )
                }
                value={reminderDays ?? "off"}
              >
                <option value="off">{formatReminderInterval(null)}</option>
                {ENVELOPE_REMINDER_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {formatReminderInterval(days)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="rounded-(--radius-well) bg-(--surface) px-4 py-4 sm:px-5">
            <ReviewSchedule
              deadlineDate={deadlineDate}
              deadlineDays={deadlineDays}
              firstSignerName={firstName(firstSignerName)}
              reminderDays={reminderDays}
            />
          </div>

          {signingProvider ? (
            <FormField
              disabled={isLocked}
              hint={
                signatureLevel === "simple"
                  ? "Signers sign here, and the finished PDF is sealed by this install."
                  : `Each signer proves who they are at ${signingProvider.name} and signs with a certificate in their own name. ${signatureLevel === "qualified" ? "A qualified signature needs a qualified certificate, which not every signer has. " : ""}Which type a document needs is a legal question; this is not legal advice.`
              }
              label="Signature type"
            >
              <Select
                onChange={(event) =>
                  setSignatureLevel(event.target.value as SignatureLevel)
                }
                value={signatureLevel}
              >
                {(["simple", "advanced", "qualified"] as const).map((level) => (
                  <option key={level} value={level}>
                    {describeSignatureLevel(level, signingProvider.name)}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
        </div>
      </section>

      {invitation ? (
        <section
          aria-labelledby="review-email"
          className="flex flex-col gap-2.5 pt-2"
        >
          <ReviewGroupLabel id="review-email">
            The email they get
          </ReviewGroupLabel>
          <div className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
            <InvitationPreview
              deadlineDays={deadlineDays}
              invitation={invitation}
            />
          </div>
        </section>
      ) : null}

      <SendTray
        deadlineDate={deadlineDate}
        deadlineDays={deadlineDays}
        errorMessage={sendPhase === "error" ? sendError : null}
        firstSignerName={firstSignerName}
        onConfirm={handleConfirmSend}
        onOpenChange={(open) => {
          if (open) {
            openConfirmation();
            return;
          }

          if (sendPhase !== "sending" && sendPhase !== "sent") {
            setSendPhase("idle");
            setIsConfirmationOpen(false);
          }
        }}
        open={isConfirmationOpen}
        phase={sendPhase}
        signatureType={
          signingProvider && signatureLevel !== "simple"
            ? describeSignatureLevel(signatureLevel, signingProvider.name)
            : null
        }
        signerCount={signers.length}
      />
    </FlowFrame>
  );
}
