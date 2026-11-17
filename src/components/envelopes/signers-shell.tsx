"use client";

import { CircleAlertIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";
import { AnimatePresence, Reorder, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  rememberSendTo,
  useSendTo,
  type ContactSuggestion,
} from "@/components/contacts/contact-data";
import { PaperThumb } from "@/components/dashboard/paper-thumb";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { toast } from "@/components/ui/toaster";
import type { DraftSignerStepData } from "@/lib/envelopes";
import { type ReplaceSignersResponse } from "@/lib/schemas/signer";
import {
  MAX_COPY_RECIPIENTS_PER_ENVELOPE,
  MAX_SIGNERS_PER_ENVELOPE,
} from "@/lib/types/domain";

import { CopyRecipientRow } from "./flow/copy-recipient-row";
import { FlowDocument, type FlowDocumentField } from "./flow/flow-document";
import { FlowActions, FlowFrame, MetaDot, NextLabel } from "./flow/flow-frame";
import { SignerRow } from "./flow/signer-row";
import {
  buildCopyRecipientErrors,
  buildInitialModel,
  buildSignerErrors,
  buildSignerRequest,
  createSigner,
  hasSignerErrors,
  insertAt,
  parseJsonResponse,
  reorderSigners,
  type ShellCopyRecipient,
  type ShellSigner,
  type SignerChecks,
  type SignerField,
} from "./flow/signers-model";

/** The document being sent, shown beside the signers. */
export type SignersStepDocument = {
  /** Fields already placed (when coming back to this step). */
  fields: readonly (Omit<FlowDocumentField, "roleIndex"> & {
    signerId: string;
  })[];
  pageCount: number;
  title: string;
};

type SignersShellProps = {
  preview?: SignersStepDocument;
  envelopeId: string;
  initialState?: "error";
  record?: DraftSignerStepData;
};

const banner = {
  animate: { height: "auto", opacity: 1 },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: exitDuration(DUR.move), ease: EASE.exit },
  },
  initial: { height: 0, opacity: 0 },
  transition: { duration: DUR.move, ease: EASE.out },
} as const;

export function SignersShell({
  preview,
  envelopeId,
  initialState,
  record,
}: SignersShellProps) {
  const initialModel = buildInitialModel(record);
  const [signers, setSigners] = useState(initialModel.signers);
  const [copyRecipients, setCopyRecipients] = useState(
    initialModel.copyRecipients,
  );
  const nextCopyRecipientNumberRef = useRef(
    initialModel.copyRecipients.length + 1,
  );
  const [showAllErrors, setShowAllErrors] = useState(
    initialModel.showAllErrors,
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const nextSignerNumberRef = useRef(initialModel.signers.length + 1);
  const listRef = useRef<HTMLOListElement | null>(null);
  const copyListRef = useRef<HTMLOListElement | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const sendTo = useSendTo();

  // Coming from a contact's "Send them a document": they are the first
  // signer of a fresh envelope. Taken once (adjusted while rendering, as
  // the note only appears after hydration), then the note is forgotten.
  const [takenSendTo, setTakenSendTo] = useState<string | null>(null);

  if (sendTo && takenSendTo !== sendTo.email) {
    setTakenSendTo(sendTo.email);
    setSigners((current) => {
      const [first] = current;

      return current.length === 1 &&
        first &&
        !first.signerId &&
        !first.name.trim() &&
        !first.email.trim()
        ? [
            {
              ...first,
              email: sendTo.email,
              name: sendTo.name,
              touched: { email: true, name: true },
            },
          ]
        : current;
    });
  }

  useEffect(() => {
    if (sendTo) {
      rememberSendTo(null);
    }
  }, [sendTo]);

  const part11Mode = record?.part11Mode ?? false;
  const errorsBySignerId = buildSignerErrors(signers);
  const errorsByCopyRecipientId = buildCopyRecipientErrors(
    copyRecipients,
    signers,
  );
  const canAddSigner = signers.length < MAX_SIGNERS_PER_ENVELOPE;
  const canAddCopyRecipient =
    copyRecipients.length < MAX_COPY_RECIPIENTS_PER_ENVELOPE;
  const canContinue =
    signers.length > 0 &&
    signers.every(
      (signer) => !hasSignerErrors(errorsBySignerId[signer.localId] ?? {}),
    ) &&
    copyRecipients.every(
      (recipient) =>
        !hasSignerErrors(errorsByCopyRecipientId[recipient.localId] ?? {}),
    ) &&
    (!part11Mode ||
      signers.every((signer) => signer.signatureMeaning !== null));
  function clearSubmitError() {
    setSubmissionError(null);
  }

  /** Focus a row's first field after it mounts (add, undo). */
  function focusLater(list: HTMLOListElement | null, selector: string) {
    window.requestAnimationFrame(() => {
      list?.querySelector<HTMLInputElement>(selector)?.focus();
    });
  }

  function handleSignerChange(
    signerLocalId: string,
    field: SignerField,
    value: string,
  ) {
    clearSubmitError();
    setShowAllErrors(false);
    setSigners((currentSigners) =>
      currentSigners.map((signer) =>
        signer.localId === signerLocalId
          ? {
              ...signer,
              [field]: value,
            }
          : signer,
      ),
    );
  }

  /** Every address on the envelope except the one row's own. */
  function takenExcept(localId: string) {
    return [
      ...signers
        .filter((signer) => signer.localId !== localId)
        .map((signer) => signer.email),
      ...copyRecipients
        .filter((recipient) => recipient.localId !== localId)
        .map((recipient) => recipient.email),
    ].filter((email) => email.trim().length > 0);
  }

  function handleSignerPick(signerLocalId: string, contact: ContactSuggestion) {
    clearSubmitError();
    setSigners((currentSigners) =>
      currentSigners.map((signer) =>
        signer.localId === signerLocalId
          ? {
              ...signer,
              email: contact.email,
              name: contact.name,
              touched: { email: true, name: true },
            }
          : signer,
      ),
    );
    setAnnouncement(`${contact.name}, ${contact.email}, filled in.`);
  }

  function handleCopyRecipientPick(
    localId: string,
    contact: ContactSuggestion,
  ) {
    clearSubmitError();
    setCopyRecipients((current) =>
      current.map((recipient) =>
        recipient.localId === localId
          ? {
              ...recipient,
              email: contact.email,
              name: contact.name,
              touched: { email: true, name: true },
            }
          : recipient,
      ),
    );
    setAnnouncement(`${contact.name}, ${contact.email}, filled in.`);
  }

  function handleSignerChecksChange(
    signerLocalId: string,
    patch: Partial<SignerChecks>,
  ) {
    clearSubmitError();
    setSigners((currentSigners) =>
      currentSigners.map((signer) =>
        signer.localId === signerLocalId ? { ...signer, ...patch } : signer,
      ),
    );
  }

  function handleSignerBlur(signerLocalId: string, field: SignerField) {
    setSigners((currentSigners) =>
      currentSigners.map((signer) =>
        signer.localId === signerLocalId
          ? {
              ...signer,
              touched: {
                ...signer.touched,
                [field]: true,
              },
            }
          : signer,
      ),
    );
  }

  function handleAddCopyRecipient() {
    if (!canAddCopyRecipient || isSubmitting) {
      return;
    }

    clearSubmitError();
    const number = nextCopyRecipientNumberRef.current;
    nextCopyRecipientNumberRef.current += 1;
    setCopyRecipients((current) => [
      ...current,
      {
        email: "",
        localId: `copy-${number}`,
        name: "",
        touched: { email: false, name: false },
      },
    ]);
    focusLater(copyListRef.current, `#copy-copy-${number}-name`);
  }

  function handleCopyRecipientChange(
    localId: string,
    patch: Partial<Pick<ShellCopyRecipient, "email" | "name">>,
  ) {
    clearSubmitError();
    setShowAllErrors(false);
    setCopyRecipients((current) =>
      current.map((recipient) =>
        recipient.localId === localId ? { ...recipient, ...patch } : recipient,
      ),
    );
  }

  function handleCopyRecipientBlur(localId: string, field: SignerField) {
    setCopyRecipients((current) =>
      current.map((recipient) =>
        recipient.localId === localId
          ? { ...recipient, touched: { ...recipient.touched, [field]: true } }
          : recipient,
      ),
    );
  }

  function handleRemoveCopyRecipient(localId: string) {
    if (isSubmitting) {
      return;
    }

    clearSubmitError();
    setCopyRecipients((current) =>
      current.filter((recipient) => recipient.localId !== localId),
    );
  }

  function handleAddSigner() {
    if (!canAddSigner || isSubmitting) {
      return;
    }

    clearSubmitError();
    const nextSignerNumber = nextSignerNumberRef.current;
    nextSignerNumberRef.current += 1;
    setSigners((currentSigners) => [
      ...currentSigners,
      createSigner(`signer-${nextSignerNumber}`),
    ]);
    focusLater(listRef.current, `#signer-signer-${nextSignerNumber}-name`);
  }

  function handleRemoveSigner(signerLocalId: string) {
    if (isSubmitting || signers.length === 1) {
      return;
    }

    const index = signers.findIndex(
      (signer) => signer.localId === signerLocalId,
    );
    const removed = signers[index];

    if (!removed) {
      return;
    }

    clearSubmitError();
    setSigners((currentSigners) =>
      currentSigners.filter((signer) => signer.localId !== signerLocalId),
    );

    const label = removed.name.trim() || `Signer ${index + 1}`;

    setAnnouncement(`${label} removed.`);
    toast(`${label} removed`, {
      action: {
        label: "Undo",
        onClick: () => {
          setSigners((currentSigners) =>
            currentSigners.some((signer) => signer.localId === signerLocalId) ||
            currentSigners.length >= MAX_SIGNERS_PER_ENVELOPE
              ? currentSigners
              : insertAt(currentSigners, index, removed),
          );
          setAnnouncement(`${label} is back as signer ${index + 1}.`);
        },
      },
    });
  }

  function handleMoveSigner(
    signerLocalId: string,
    direction: "earlier" | "later",
  ) {
    if (isSubmitting) {
      return;
    }

    clearSubmitError();
    const nextSigners = reorderSigners(signers, signerLocalId, direction);
    const newIndex = nextSigners.findIndex(
      (signer) => signer.localId === signerLocalId,
    );

    setSigners(nextSigners);
    announcePosition(nextSigners, signerLocalId);

    // Keep focus on the same control as the row moves, unless that end
    // of the list was reached (then the other arrow takes it).
    window.requestAnimationFrame(() => {
      const order = newIndex + 1;
      const preferred = listRef.current?.querySelector<HTMLButtonElement>(
        `button[aria-label="Move signer ${order} ${direction}"]:not(:disabled)`,
      );
      const fallback = listRef.current?.querySelector<HTMLButtonElement>(
        `button[aria-label="Move signer ${order} ${direction === "earlier" ? "later" : "earlier"}"]`,
      );
      const target =
        preferred && preferred.offsetParent !== null
          ? preferred
          : (fallback ?? preferred);

      target?.focus();
    });
  }

  function announcePosition(list: readonly ShellSigner[], localId: string) {
    const index = list.findIndex((signer) => signer.localId === localId);
    const signer = list[index];

    if (signer) {
      setAnnouncement(
        `${signer.name.trim() || "Signer"} now signs ${index === 0 ? "first" : `in position ${index + 1}`}.`,
      );
    }
  }

  async function handleContinue() {
    setShowAllErrors(true);

    if (!canContinue || isSubmitting) {
      return;
    }

    clearSubmitError();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/envelopes/${envelopeId}/signers`, {
        body: JSON.stringify(buildSignerRequest(signers, copyRecipients)),
        headers: {
          "content-type": "application/json",
        },
        method: "PUT",
      });
      const payload = await parseJsonResponse<ReplaceSignersResponse>(response);

      if (payload.error) {
        setSubmissionError(payload.error);
        return;
      }

      window.location.assign(
        payload.data?.redirectPath ?? `/envelopes/${envelopeId}/prepare`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (initialState === "error") {
    return (
      <FlowFrame step={2} title="Who signs?">
        <EmptyState
          action={
            <Button asChild variant="outline">
              <a href={`/envelopes/${envelopeId}/signers`}>Retry</a>
            </Button>
          }
          description="We couldn't load this draft's signers. Try again in a moment."
          icon={<CircleAlertIcon />}
          role="alert"
          title="Couldn't load signer setup"
        />
      </FlowFrame>
    );
  }

  const hint = canContinue
    ? "Next, place their fields"
    : signers.some((signer) => errorsBySignerId[signer.localId]?.accessCode)
      ? "Add the access code to continue"
      : part11Mode && signers.some((signer) => signer.signatureMeaning === null)
        ? "Choose what each signature means"
        : "Add each signer's name and email";

  // Fields already placed follow their signer's place in the order (and
  // colour) as the list is rearranged here.
  const roleBySignerId = new Map(
    signers.map((signer, index) => [signer.signerId ?? signer.localId, index]),
  );
  const documentFields: FlowDocumentField[] = (preview?.fields ?? []).flatMap(
    ({ signerId, ...field }) => {
      const roleIndex = roleBySignerId.get(signerId);

      return roleIndex === undefined ? [] : [{ ...field, roleIndex }];
    },
  );
  const highlightedIndex = signers.findIndex(
    (signer) => signer.localId === highlighted,
  );

  return (
    <FlowFrame
      aside={
        preview ? (
          <FlowDocument
            activeRole={highlightedIndex >= 0 ? highlightedIndex : null}
            caption={
              <>
                <span className="font-medium text-(--fg)">{preview.title}</span>
                <MetaDot />
                <span className="tabular-nums">
                  {preview.pageCount}{" "}
                  {preview.pageCount === 1 ? "page" : "pages"}
                </span>
              </>
            }
            envelopeId={envelopeId}
            fields={documentFields}
            pageCount={preview.pageCount}
          />
        ) : undefined
      }
      description={
        signers.length > 1
          ? "They sign one after another, in this order. Drag to change it."
          : "Add everyone who needs to sign, in the order they sign."
      }
      footer={
        <FlowActions
          hint={hint}
          onShortcut={canContinue ? handleContinue : undefined}
          primary={
            <Button
              className="max-sm:min-h-12 max-sm:px-6"
              disabled={!canContinue}
              loading={isSubmitting}
              onClick={handleContinue}
              type="button"
            >
              <NextLabel arrow="→" />
            </Button>
          }
        />
      }
      step={2}
      title="Who signs?"
    >
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      {preview ? (
        <div className="flex items-center gap-3 lg:hidden">
          <PaperThumb
            className="h-12"
            envelopeId={envelopeId}
            morph={false}
            title={preview.title}
          />
          <p className="flex min-w-0 flex-col text-[0.8125rem] leading-5">
            <span className="truncate font-medium text-(--fg)">
              {preview.title}
            </span>
            <span className="text-(--secondary) tabular-nums">
              {preview.pageCount} {preview.pageCount === 1 ? "page" : "pages"}
            </span>
          </p>
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {submissionError ? (
          <motion.div className="overflow-hidden" key="error" {...banner}>
            <div
              className="flex items-start gap-3 rounded-(--radius-well) bg-(--danger-soft) px-4 py-3"
              role="alert"
            >
              <CircleAlertIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-(--danger)"
              />
              <p className="text-sm leading-5 text-(--danger)">
                {submissionError}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section
        aria-label="Signers"
        className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
      >
        <Reorder.Group
          as="ol"
          axis="y"
          className="flex flex-col"
          onReorder={(next: ShellSigner[]) => {
            clearSubmitError();
            setSigners(next);
          }}
          ref={listRef}
          values={signers}
        >
          <AnimatePresence initial={false}>
            {signers.map((signer, index) => {
              const signerErrors = errorsBySignerId[signer.localId] ?? {};

              return (
                <SignerRow
                  accessCodeError={signerErrors.accessCode}
                  canMoveEarlier={index > 0}
                  canMoveLater={index < signers.length - 1}
                  canRemove={signers.length > 1}
                  disabled={isSubmitting}
                  emailError={
                    showAllErrors || signer.touched.email
                      ? signerErrors.email
                      : undefined
                  }
                  exclude={takenExcept(signer.localId)}
                  index={index}
                  key={signer.localId}
                  nameError={
                    showAllErrors || signer.touched.name
                      ? signerErrors.name
                      : undefined
                  }
                  onBlur={(field) => handleSignerBlur(signer.localId, field)}
                  onChange={(field, value) =>
                    handleSignerChange(signer.localId, field, value)
                  }
                  onChecksChange={(patch) =>
                    handleSignerChecksChange(signer.localId, patch)
                  }
                  onDragEnd={() => announcePosition(signers, signer.localId)}
                  onHighlight={(on) =>
                    setHighlighted((current) =>
                      on
                        ? signer.localId
                        : current === signer.localId
                          ? null
                          : current,
                    )
                  }
                  onMove={(direction) =>
                    handleMoveSigner(signer.localId, direction)
                  }
                  onPick={(contact) =>
                    handleSignerPick(signer.localId, contact)
                  }
                  onRemove={() => handleRemoveSigner(signer.localId)}
                  part11Mode={part11Mode}
                  signer={signer}
                />
              );
            })}
          </AnimatePresence>
        </Reorder.Group>

        <div className="relative before:absolute before:top-0 before:right-4 before:left-4 before:h-px before:bg-(--divider) sm:before:right-5 sm:before:left-5">
          <button
            className="group/add flex min-h-14 w-full items-center gap-3 rounded-b-(--radius-card) px-4 text-left text-sm font-medium text-(--accent-ink) outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--accent-rgb)/0.45)] active:bg-(--press) disabled:cursor-not-allowed disabled:text-(--secondary) disabled:hover:bg-transparent sm:gap-4 sm:px-5"
            disabled={!canAddSigner || isSubmitting}
            onClick={handleAddSigner}
            type="button"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-(--accent-softer) transition-transform duration-(--dur-hover) ease-(--ease-out) group-active/add:scale-95 group-disabled/add:bg-(--surface)"
            >
              <PlusIcon className="size-4" strokeWidth={2} />
            </span>
            Add signer
            {!canAddSigner ? (
              <span className="ml-auto text-[0.8125rem] font-normal text-(--secondary)">
                Up to {MAX_SIGNERS_PER_ENVELOPE} per envelope
              </span>
            ) : null}
          </button>
        </div>
      </section>

      <section aria-label="Copies" className="flex flex-col gap-2.5 pt-2">
        <AnimatePresence initial={false}>
          {copyRecipients.length > 0 ? (
            <motion.div
              className="-m-1.5 flex flex-col gap-2.5 overflow-hidden p-1.5"
              key="copies"
              {...banner}
            >
              <h2 className="px-1 pt-2 text-[0.8125rem] leading-5 font-medium text-(--secondary)">
                Gets a copy when everyone has signed
              </h2>
              <ol
                className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
                ref={copyListRef}
              >
                <AnimatePresence initial={false}>
                  {copyRecipients.map((recipient, index) => {
                    const errors =
                      errorsByCopyRecipientId[recipient.localId] ?? {};

                    return (
                      <CopyRecipientRow
                        disabled={isSubmitting}
                        emailError={
                          showAllErrors || recipient.touched.email
                            ? errors.email
                            : undefined
                        }
                        exclude={takenExcept(recipient.localId)}
                        index={index}
                        key={recipient.localId}
                        nameError={
                          showAllErrors || recipient.touched.name
                            ? errors.name
                            : undefined
                        }
                        onBlur={(field) =>
                          handleCopyRecipientBlur(recipient.localId, field)
                        }
                        onChange={(field, value) =>
                          handleCopyRecipientChange(recipient.localId, {
                            [field]: value,
                          })
                        }
                        onPick={(contact) =>
                          handleCopyRecipientPick(recipient.localId, contact)
                        }
                        onRemove={() =>
                          handleRemoveCopyRecipient(recipient.localId)
                        }
                        recipient={recipient}
                      />
                    );
                  })}
                </AnimatePresence>
              </ol>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button
            className="-ml-1"
            disabled={!canAddCopyRecipient || isSubmitting}
            onClick={handleAddCopyRecipient}
            size="sm"
            type="button"
            variant="ghost"
          >
            <UsersIcon aria-hidden="true" />
            <span className="sr-only">+ </span>Add a copy recipient
          </Button>
          {!canAddCopyRecipient ? (
            <p className="text-[0.8125rem] text-(--secondary)">
              That’s the most one envelope can have.
            </p>
          ) : copyRecipients.length === 0 ? (
            <p className="text-[0.8125rem] text-(--secondary) max-sm:hidden">
              They get the finished document, without signing.
            </p>
          ) : null}
        </div>
      </section>
    </FlowFrame>
  );
}
