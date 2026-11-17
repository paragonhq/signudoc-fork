"use client";

import { CircleAlertIcon } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PdfPageRenderState } from "@/components/envelopes/pdf-page-canvas";
import { PublicLegalFooter } from "@/components/layout/public-legal-links";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { countAnswerableFields } from "@/lib/field-choices";
import { FormField } from "@/components/ui/field";
import { useIsDesktop } from "@/components/ui/hooks";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import { Textarea } from "@/components/ui/textarea";
import type {
  SigningCurrentField,
  SigningPayload,
} from "@/lib/schemas/signing";
import type { SigningRouteAhead } from "@/lib/signing-receipt";

import { saveReceipt } from "../frame/receipt-storage";
import { formatSealDate } from "../frame/seal-date";
import {
  SigningStateScreen,
  type SigningStateScreenState,
} from "../signing-state-screen";
import { ActionBar, type ChecklistItem, type FinishPhase } from "./action-bar";
import { ConsentTray } from "./consent-tray";
import { DocumentPage } from "./document-page";
import {
  asUnavailableState,
  buildSigningSubmissionPayload,
  describeProviderProblem,
  getChecklistFields,
  getCompletionValue,
  getRadioGroup,
  getSignatureKind,
  getSignerInitials,
  hasInvalidNumber,
  isFieldComplete,
  isFieldTouched,
  orderFields,
  type EnteredValues,
  type ProviderSignatureProblem,
  type ReusableSignatureEntries,
  type SignatureEntry,
  isAutoFilledField,
} from "./field-logic";
import { FinishTray } from "./finish-tray";
import { SealMoment } from "./seal-moment";
import { SignHereFlag } from "./sign-here-flag";
import { FieldsRail, summarizeOtherSigners } from "./fields-rail";
import { FillTray, isTrayFillable } from "./fill-tray";
import {
  CurrentSignerField,
  LockedField,
  LockedFieldCaption,
} from "./signer-field";
import { SigningHeader } from "./signing-header";
import { SignatureTray, type SignatureTrayRequest } from "./signature-tray";

const defaultSubmitErrorMessage =
  "We couldn't finish signing right now. Try again, or request a fresh signing link from the sender.";
const defaultDeclineErrorMessage =
  "We couldn't record your decline right now. Try again, or request a fresh signing link from the sender.";
/** How long the seal rests before the done page. */
const SEAL_HOLD_MS = 1400;

function isInViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight;

  // Clear of the sticky header above and the floating action bar below.
  return rect.top >= 96 && rect.bottom <= height - 112;
}

/**
 * The signing view. The document is the hero: its pages run down the
 * screen, the signer's fields are washed in sign-here yellow and a small
 * flag travels to the next one. One floating bar in thumb reach says how
 * much is left and walks them through (Next field, then Finish). Consent,
 * signature, finish and decline are trays over the document; finishing
 * plays the one delight of the journey, the seal settling in.
 */
export function SigningLiveShell({
  record,
  routeAhead = null,
  signatureProblem = null,
  token,
}: {
  record: SigningPayload;
  /** Who signs next, handed to the done page. */
  routeAhead?: SigningRouteAhead | null;
  signatureProblem?: ProviderSignatureProblem | null;
  token: string;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const orderedFields = useMemo(
    () => orderFields(record.currentSignerFields),
    [record.currentSignerFields],
  );
  const [pageStates, setPageStates] = useState<
    Record<number, PdfPageRenderState>
  >({});
  // Pages asked for (to reveal a field on them) draw straight away.
  const [eagerPages, setEagerPages] = useState<ReadonlySet<number>>(
    () => new Set([orderedFields[0]?.page ?? 1]),
  );
  const [checkboxValues, setCheckboxValues] = useState<Record<string, boolean>>(
    {},
  );
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [signatureValues, setSignatureValues] = useState<
    Record<string, SignatureEntry>
  >({});
  const [reusableSignatures, setReusableSignatures] =
    useState<ReusableSignatureEntries>({ initials: null, signature: null });
  const [signatureRequest, setSignatureRequest] =
    useState<SignatureTrayRequest | null>(null);
  const [justSignedId, setJustSignedId] = useState<string | null>(null);
  /** The field open in the phone's fill-in tray. */
  const [fillFieldId, setFillFieldId] = useState<string | null>(null);
  const isDesktop = useIsDesktop();
  const [cursorId, setCursorId] = useState<string | null>(null);

  const [consentedAt, setConsentedAt] = useState(record.consentedAt);
  const [isSavingConsent, setIsSavingConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState<string | null>(null);

  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [finishPhase, setFinishPhase] = useState<FinishPhase>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** "17 NOV 2026" for the seal's ring, set the moment the signature lands. */
  const [signedOn, setSignedOn] = useState<string | null>(null);
  // Part 11 envelopes: the signer's email address and password, given again
  // for this signature, and their confirmation of what it means.
  const [reauthEmail, setReauthEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [isMeaningConfirmed, setIsMeaningConfirmed] = useState(false);

  const [endState, setEndState] = useState<SigningStateScreenState | null>(
    null,
  );
  const [localDateLabel] = useState(() =>
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date()),
  );

  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const fieldRefs = useRef(new Map<string, HTMLElement>());
  const pendingRevealRef = useRef<{ focus: boolean; id: string } | null>(null);

  const part11 = record.part11 ?? null;
  const providerSignature = record.providerSignature ?? null;
  const isConsented = consentedAt !== null;
  const entered: EnteredValues = {
    checkboxValues,
    signatureValues,
    textValues,
  };
  const fields = record.currentSignerFields;
  const isComplete = (field: SigningCurrentField) =>
    isFieldComplete(field, fields, entered);

  // Dates fill themselves, so they are not counted as the signer's work.
  const requiredCount = countAnswerableFields(
    fields,
    (field) => field.required && !isAutoFilledField(field),
  );
  const remainingCount = countAnswerableFields(
    fields,
    (field) => field.required && !isComplete(field),
  );
  const invalidNumberCount = fields.filter((field) =>
    hasInvalidNumber(field, textValues),
  ).length;
  const canFinish = remainingCount === 0 && invalidNumberCount === 0;
  const completedCount = requiredCount - remainingCount;

  // The field the flag points at: the one the signer is on, while it still
  // needs them, else the next required field after it that is not done.
  const pendingRequired = orderedFields.filter(
    (field) =>
      field.required && !isAutoFilledField(field) && !isComplete(field),
  );
  const cursorIndex = cursorId
    ? orderedFields.findIndex((field) => field.id === cursorId)
    : -1;
  const target =
    pendingRequired.find(
      (field) => orderedFields.indexOf(field) >= cursorIndex,
    ) ??
    pendingRequired[0] ??
    null;

  const checklist: ChecklistItem[] = getChecklistFields(fields).map(
    (field) => ({
      field,
      isComplete: isComplete(field),
      isInvalid: hasInvalidNumber(field, textValues),
      isTarget:
        target !== null &&
        (target.id === field.id ||
          (field.type === "radio" &&
            getRadioGroup(field, fields).some(
              (button) => button.id === target.id,
            ))),
      value: isFieldTouched(field, fields, entered)
        ? getCompletionValue(field, fields, entered)
        : null,
    }),
  );
  const filledCount = checklist.filter((item) => item.value !== null).length;
  const doneCount = checklist.filter(
    (item) => item.value !== null && !item.isInvalid,
  ).length;
  const otherSigners = useMemo(
    () => summarizeOtherSigners(record.visibleFields),
    [record.visibleFields],
  );
  const fillField = fillFieldId
    ? (orderedFields.find((field) => field.id === fillFieldId) ?? null)
    : null;
  // The next required field still to do after the one in the fill tray.
  const nextAfterFill = fillField
    ? (pendingRequired.find(
        (field) =>
          field.id !== fillField.id &&
          orderedFields.indexOf(field) > orderedFields.indexOf(fillField),
      ) ??
      pendingRequired.find((field) => field.id !== fillField.id) ??
      null)
    : null;
  const pageNumbers = Array.from(
    { length: Math.max(record.pageCount, 1) },
    (_, index) => index + 1,
  );

  const registerField = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element) {
        fieldRefs.current.set(id, element);
      } else {
        fieldRefs.current.delete(id);
      }
    },
    [],
  );

  const scrollToField = useCallback(
    (id: string, focus: boolean) => {
      const element = fieldRefs.current.get(id);

      if (!element) {
        return false;
      }

      const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
      const rect = element.getBoundingClientRect();

      if (!isInViewport(element)) {
        window.scrollTo({
          behavior,
          top: window.scrollY + rect.top - window.innerHeight * 0.36,
        });
      }

      if (focus) {
        element.focus({ preventScroll: true });
      }

      return true;
    },
    [reduceMotion],
  );

  /** Bring a field into view (drawing its page first if needed). */
  const revealField = useCallback(
    (field: SigningCurrentField, focus = true) => {
      setCursorId(field.id);

      if (scrollToField(field.id, focus)) {
        return;
      }

      // Its page has not drawn yet: go to the page, and to the field once
      // the page is ready.
      pendingRevealRef.current = { focus, id: field.id };
      setEagerPages((current) =>
        current.has(field.page) ? current : new Set([...current, field.page]),
      );
      pageRefs.current.get(field.page)?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [reduceMotion, scrollToField],
  );

  // The write-on plays once; a later visit to the page shows it at rest.
  useEffect(() => {
    if (!justSignedId) {
      return;
    }

    const timer = window.setTimeout(() => setJustSignedId(null), 1200);

    return () => window.clearTimeout(timer);
  }, [justSignedId]);

  // The adopted signature and initials last for the browser session, so a
  // reload (or coming back from the PDF) does not ask for them again.
  const adoptedKey = `signudoc:adopted:${record.signer.id}`;

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(adoptedKey);
      const parsed = stored
        ? (JSON.parse(stored) as Partial<ReusableSignatureEntries>)
        : null;

      if (parsed && (parsed.signature || parsed.initials)) {
        // Browser storage is only there after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReusableSignatures({
          initials: parsed.initials ?? null,
          signature: parsed.signature ?? null,
        });
      }
    } catch {
      // Private mode or blocked storage: adopt again after a reload.
    }
  }, [adoptedKey]);

  useEffect(() => {
    if (!reusableSignatures.signature && !reusableSignatures.initials) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        adoptedKey,
        JSON.stringify(reusableSignatures),
      );
    } catch {
      // Too large or blocked: it still works for this page.
    }
  }, [adoptedKey, reusableSignatures]);

  // A field asked for on a page still drawing is revealed once it is drawn.
  useEffect(() => {
    const pending = pendingRevealRef.current;

    if (!pending) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (scrollToField(pending.id, pending.focus)) {
        pendingRevealRef.current = null;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pageStates, scrollToField]);

  function goToNextField() {
    if (!target) {
      return;
    }

    const element = fieldRefs.current.get(target.id);
    const isOnScreen = element && isInViewport(element);
    const isFocused = element && document.activeElement === element;

    // On a phone a field to type into opens its tray once it is in view.
    if (!isDesktop && isOnScreen && isTrayFillable(target)) {
      setCursorId(target.id);
      setFillFieldId(target.id);
      return;
    }

    if (!isOnScreen || !isFocused) {
      revealField(target);
      return;
    }

    // Already there: move on to the next one that still needs doing.
    const startIndex = orderedFields.indexOf(target);
    const next =
      pendingRequired.find(
        (field) =>
          orderedFields.indexOf(field) > startIndex &&
          !(
            field.type === "radio" &&
            target.type === "radio" &&
            field.groupId !== undefined &&
            field.groupId === target.groupId
          ),
      ) ??
      pendingRequired.find((field) => field.id !== target.id) ??
      target;

    revealField(next);
  }

  const onShortcutNext = useEffectEvent(() => goToNextField());

  // N moves to the next field, unless the signer is typing or in a tray.
  useEffect(() => {
    if (!isConsented) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() !== "n" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.defaultPrevented
      ) {
        return;
      }

      const active = event.target as HTMLElement | null;

      if (
        active?.closest(
          "input, textarea, select, [contenteditable='true'], [role='dialog']",
        )
      ) {
        return;
      }

      event.preventDefault();
      onShortcutNext();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isConsented]);

  function openSignature(field: SigningCurrentField) {
    const kind = getSignatureKind(field);

    if (!kind) {
      return;
    }

    const existing = signatureValues[field.id];
    const reusable = reusableSignatures[kind];

    setSubmitError(null);
    setCursorId(field.id);

    // One tap: a signature adopted earlier drops straight in.
    if (!existing && reusable) {
      setSignatureValues((current) => ({ ...current, [field.id]: reusable }));
      setJustSignedId(field.id);
      return;
    }

    setSignatureRequest({
      adoptsInitials:
        kind === "signature" &&
        reusableSignatures.initials === null &&
        fields.some((other) => other.type === "initials"),
      existingEntry: existing ?? reusable ?? undefined,
      fieldId: field.id,
      kind,
      mode: existing?.inputMethod ?? reusable?.inputMethod ?? "typed",
    });
  }

  function applySignature(entry: SignatureEntry) {
    const request = signatureRequest;

    if (!request) {
      return;
    }

    setReusableSignatures((current) => ({
      ...current,
      [request.kind]: entry,
      // A typed signature adopts matching initials too, the way a pen
      // signer would: the initials fields then take one tap each.
      ...(request.adoptsInitials &&
      entry.inputMethod === "typed" &&
      current.initials === null
        ? {
            initials: {
              imageDataUrl: null,
              inputMethod: "typed" as const,
              value: getSignerInitials(entry.value),
            },
          }
        : {}),
    }));
    setSignatureValues((current) => ({ ...current, [request.fieldId]: entry }));
    setJustSignedId(request.fieldId);
    setSubmitError(null);
    setSignatureRequest(null);
  }

  async function handleConsent() {
    setIsSavingConsent(true);
    setConsentError(null);

    try {
      const response = await fetch(record.consentUrl, {
        body: JSON.stringify({ disclosureVersion: record.disclosure.version }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        consentedAt?: number;
        error?: string;
        state?: string;
      } | null;
      const state = asUnavailableState(payload?.state);

      if (!response.ok && state) {
        setEndState(state);
        return;
      }

      if (!response.ok || typeof payload?.consentedAt !== "number") {
        setConsentError(
          payload?.error ?? "Your agreement could not be saved right now.",
        );
        return;
      }

      setConsentedAt(payload.consentedAt);

      // Once the document clears, bring the first field into view so the
      // signer starts where the work is.
      const first = pendingRequired[0];

      if (first) {
        window.setTimeout(
          () => revealField(first, false),
          reduceMotion ? 0 : 450,
        );
      }
    } catch {
      setConsentError("Your agreement could not be saved right now.");
    } finally {
      setIsSavingConsent(false);
    }
  }

  async function handleDecline() {
    setDeclineError(null);

    let response: Response;

    try {
      response = await fetch(record.declineUrl, {
        body: JSON.stringify({ reason: declineReason }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    } catch {
      setDeclineError(defaultDeclineErrorMessage);
      throw new Error("decline failed");
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      state?: string;
    } | null;

    if (!response.ok) {
      const state = asUnavailableState(payload?.state);

      if (state) {
        setEndState(state);
        return;
      }

      setDeclineError(payload?.error ?? defaultDeclineErrorMessage);
      throw new Error("decline failed");
    }

    setEndState("declined-by-you");
  }

  async function handleFinish() {
    if (!canFinish || finishPhase !== "idle") {
      return;
    }

    setFinishPhase("signing");
    setSubmitError(null);

    try {
      const response = await fetch(
        providerSignature?.startUrl ?? record.submitUrl,
        {
          body: JSON.stringify({
            ...buildSigningSubmissionPayload(record, entered),
            ...(part11
              ? {
                  reauthentication: {
                    email: reauthEmail,
                    meaningConfirmed: true,
                    password: reauthPassword,
                  },
                }
              : {}),
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        redirectPath?: string;
        redirectUrl?: string;
        state?: string;
        submittedAt?: number;
      } | null;

      if (!response.ok) {
        const state = asUnavailableState(payload?.state);

        if (state) {
          setEndState(state);
          return;
        }

        setSubmitError(payload?.error ?? defaultSubmitErrorMessage);
        setReauthPassword("");
        setFinishPhase("idle");
        return;
      }

      if (providerSignature) {
        if (!payload?.redirectUrl) {
          setSubmitError(defaultSubmitErrorMessage);
          setFinishPhase("idle");
          return;
        }

        saveReceipt(token, {
          isLastSigner: routeAhead?.isLastSigner ?? false,
          nextSignerName: routeAhead?.nextSignerName ?? null,
          signedAt: null,
          title: record.envelopeTitle,
        });
        window.location.assign(payload.redirectUrl);
        return;
      }

      const fallbackPath = `${window.location.pathname.replace(/\/$/, "")}/done?title=${encodeURIComponent(record.envelopeTitle)}`;
      const destination = payload?.redirectPath ?? fallbackPath;

      saveReceipt(token, {
        isLastSigner: routeAhead?.isLastSigner ?? false,
        nextSignerName: routeAhead?.nextSignerName ?? null,
        signedAt: (typeof payload?.submittedAt === "number"
          ? new Date(payload.submittedAt * 1000)
          : new Date()
        ).toISOString(),
        title: record.envelopeTitle,
      });

      // The seal lands, rests a moment, then the done page.
      setSignedOn(formatSealDate(new Date()));
      setFinishPhase("signed");
      setIsFinishOpen(false);
      window.setTimeout(
        () => router.push(destination),
        reduceMotion ? 300 : SEAL_HOLD_MS,
      );
    } catch {
      setSubmitError(defaultSubmitErrorMessage);
      setFinishPhase("idle");
    }
  }

  if (endState) {
    return (
      <SigningStateScreen senderName={record.senderName} state={endState} />
    );
  }

  const isBusy = finishPhase !== "idle";

  function renderPageFields(page: number) {
    const fieldsHere = orderedFields.filter((field) => field.page === page);

    return (
      <>
        {record.visibleFields
          .filter((field) => field.page === page)
          .map((field) => (
            <Fragment key={field.id}>
              <LockedField field={field} />
              <LockedFieldCaption field={field} />
            </Fragment>
          ))}
        {fieldsHere.map((field) => {
          const kind = getSignatureKind(field);

          return (
            <CurrentSignerField
              animateSignature={justSignedId === field.id}
              checkboxValue={Boolean(checkboxValues[field.id])}
              field={field}
              hasReusableSignature={
                kind ? reusableSignatures[kind] !== null : false
              }
              isComplete={isComplete(field)}
              isInvalid={hasInvalidNumber(field, textValues)}
              isTarget={isConsented && target?.id === field.id}
              key={field.id}
              localDateLabel={localDateLabel}
              signerName={record.signer.name}
              onCheckboxChange={(checked) => {
                setSubmitError(null);
                setCheckboxValues((current) => {
                  const next = { ...current, [field.id]: checked };

                  // Choosing one radio button lets go of the others in its
                  // group.
                  if (field.type === "radio" && checked) {
                    for (const button of getRadioGroup(field, fields)) {
                      if (button.id !== field.id) {
                        next[button.id] = false;
                      }
                    }
                  }

                  return next;
                });
              }}
              onFocusField={() => setCursorId(field.id)}
              onOpenFill={
                !isDesktop && isTrayFillable(field)
                  ? () => {
                      setCursorId(field.id);
                      setFillFieldId(field.id);
                    }
                  : undefined
              }
              onSignatureClick={() => openSignature(field)}
              onTextChange={(value) => {
                setSubmitError(null);
                setTextValues((current) => ({
                  ...current,
                  [field.id]: value,
                }));
              }}
              ref={registerField(field.id)}
              signatureEntry={signatureValues[field.id]}
              textValue={textValues[field.id] ?? ""}
            />
          );
        })}
        {isConsented && target && target.page === page ? (
          <SignHereFlag field={target} />
        ) : null}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col text-(--fg)">
      <SigningHeader
        disabled={isBusy}
        documentUrl={record.documentUrl}
        envelopeTitle={record.envelopeTitle}
        onDecline={() => {
          setDeclineError(null);
          setIsDeclineOpen(true);
        }}
        senderName={record.senderName}
      />

      {signatureProblem && providerSignature ? (
        <div className="mx-auto w-full max-w-[880px] px-4 pt-2 sm:px-6">
          <div
            className="flex items-start gap-3 rounded-(--radius-well) bg-(--danger-soft) px-4 py-3 text-sm leading-5 text-(--danger)"
            role="alert"
          >
            <CircleAlertIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={1.75}
            />
            <p className="text-pretty">
              {describeProviderProblem(
                signatureProblem,
                providerSignature.providerName,
              )}
            </p>
          </div>
        </div>
      ) : null}

      <main
        aria-label="Document"
        className="flex-1 px-3 pt-3 pb-32 sm:px-6 sm:pt-6 sm:pb-36"
      >
        <motion.div
          animate={
            isConsented
              ? { filter: "blur(0px)", opacity: 1, scale: 1 }
              : { filter: "blur(4px)", opacity: 0.6, scale: 0.985 }
          }
          className="mx-auto flex w-full max-w-[880px] origin-top flex-col gap-4 sm:gap-6"
          initial={false}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: DUR.morph, ease: EASE.out }
          }
        >
          {pageNumbers.map((page) => {
            const pageRecord = record.pages.find(
              (item) => item.pageNumber === page,
            );

            return (
              <section
                aria-label={`Page ${page} of ${record.pageCount}`}
                className="flex scroll-mt-20 flex-col gap-2"
                key={page}
              >
                <DocumentPage
                  aspectRatio={`${pageRecord?.widthPt ?? 8.5} / ${pageRecord?.heightPt ?? 11}`}
                  documentUrl={record.documentUrl}
                  eager={eagerPages.has(page)}
                  onRenderStateChange={(state) =>
                    setPageStates((current) =>
                      current[page] === state
                        ? current
                        : { ...current, [page]: state },
                    )
                  }
                  pageNumber={page}
                  ref={(element) => {
                    if (element) {
                      pageRefs.current.set(page, element);
                    } else {
                      pageRefs.current.delete(page);
                    }
                  }}
                  renderState={pageStates[page] ?? "loading"}
                >
                  {renderPageFields(page)}
                </DocumentPage>
                {record.pageCount > 1 ? (
                  <p
                    aria-hidden="true"
                    className="text-center text-[0.8125rem] leading-5 text-(--secondary) tabular-nums"
                  >
                    {page} of {record.pageCount}
                  </p>
                ) : null}
              </section>
            );
          })}
        </motion.div>
      </main>

      <PublicLegalFooter className="pb-28 sm:pb-32" />

      {isConsented ? (
        <FieldsRail
          checklist={checklist}
          doneCount={doneCount}
          onSelectField={(field) => revealField(field)}
          others={otherSigners}
          pageCount={record.pageCount}
        />
      ) : null}

      <FillTray
        field={fillField}
        hasNext={nextAfterFill !== null}
        isInvalid={fillField ? hasInvalidNumber(fillField, textValues) : false}
        onClose={() => setFillFieldId(null)}
        onNext={() => {
          const next = nextAfterFill;

          if (next && isTrayFillable(next)) {
            setFillFieldId(next.id);
            revealField(next, false);
            return;
          }

          setFillFieldId(null);

          if (next) {
            window.setTimeout(() => revealField(next), reduceMotion ? 0 : 260);
          }
        }}
        onValueChange={(value) => {
          if (!fillField) {
            return;
          }

          setSubmitError(null);
          setTextValues((current) => ({ ...current, [fillField.id]: value }));
        }}
        pageCount={record.pageCount}
        value={fillField ? (textValues[fillField.id] ?? "") : ""}
      />

      {isConsented ? (
        <ActionBar
          canFinish={canFinish}
          checklist={checklist}
          completedCount={completedCount}
          finishPhase={finishPhase}
          invalidNumberCount={invalidNumberCount}
          onFinish={() => {
            setSubmitError(null);
            setIsFinishOpen(true);
          }}
          onNext={goToNextField}
          onSelectField={(field) => revealField(field)}
          pageCount={record.pageCount}
          remainingCount={remainingCount}
          requiredCount={requiredCount}
          target={target}
        />
      ) : null}

      <ConsentTray
        disclosure={record.disclosure}
        envelopeTitle={record.envelopeTitle}
        error={consentError}
        fieldCount={countAnswerableFields(
          fields,
          (field) => !isAutoFilledField(field),
        )}
        isSaving={isSavingConsent}
        onAgree={handleConsent}
        onDecline={() => {
          setDeclineError(null);
          setIsDeclineOpen(true);
        }}
        open={!isConsented && !isDeclineOpen}
        pageCount={record.pageCount}
        senderName={record.senderName}
        signerName={record.signer.name}
      />

      <SignatureTray
        onApply={applySignature}
        onClose={() => setSignatureRequest(null)}
        request={signatureRequest}
        signerName={record.signer.name}
      />

      <FinishTray
        completedCount={filledCount}
        error={submitError}
        nextStep={
          routeAhead?.isLastSigner
            ? "Once you finish, everyone gets the signed copy by email."
            : routeAhead?.nextSignerName
              ? `${routeAhead.nextSignerName} signs next. Everyone gets the signed copy by email once all have signed.`
              : null
        }
        isMeaningConfirmed={isMeaningConfirmed}
        onConfirm={handleFinish}
        onMeaningConfirmedChange={setIsMeaningConfirmed}
        onOpenChange={(open) => {
          if (!open && finishPhase === "signing") {
            return;
          }

          setIsFinishOpen(open);

          if (!open) {
            setSubmitError(null);
          }
        }}
        onReauthEmailChange={setReauthEmail}
        onReauthPasswordChange={setReauthPassword}
        open={isFinishOpen}
        phase={finishPhase}
        reauthEmail={reauthEmail}
        reauthPassword={reauthPassword}
        record={record}
      />

      {/* A click, not a hold: the tray itself is the confirmation, and the
          signer may be on a phone with one hand (upstream e2e clicks it). */}
      <ConfirmTray
        confirmLabel="Decline to sign"
        hold={false}
        description={`${record.senderName} will be told that you declined. This cannot be undone.`}
        error={declineError}
        onConfirm={handleDecline}
        onOpenChange={(open) => {
          setIsDeclineOpen(open);

          if (!open) {
            setDeclineError(null);
          }
        }}
        open={isDeclineOpen}
        title="Decline to sign?"
      >
        <FormField
          hint="The sender sees this with your decline."
          label="Reason (optional)"
        >
          <Textarea
            className="min-h-24"
            maxLength={1000}
            name="signing-decline-reason"
            onChange={(event) => setDeclineReason(event.target.value)}
            placeholder="I'd like to discuss some terms first…"
            value={declineReason}
          />
        </FormField>
      </ConfirmTray>

      <SealMoment
        open={finishPhase === "signed"}
        signedOn={signedOn ?? ""}
        signerName={record.signer.name}
      />
    </div>
  );
}
