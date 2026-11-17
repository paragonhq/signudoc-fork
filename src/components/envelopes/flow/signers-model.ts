import type { DraftSignerStepData } from "@/lib/envelopes";
import {
  duplicateCopyRecipientEmailMessage,
  duplicateSignerEmailMessage,
} from "@/lib/schemas/signer";
import type { SignatureMeaning } from "@/lib/types/domain";

/*
 * The signers step's model: rows as the sender edits them, validation and
 * the request sent to the API. No React here; the shell owns the state.
 */

export const validEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const genericSubmitError = "Something went wrong. Please try again.";

export type SignerField = "email" | "name";

export type SignerChecks = {
  /** A new code typed by the sender. Empty means "no change". */
  accessCode: string;
  /** A code is saved on the server. */
  hasAccessCode: boolean;
  removeAccessCode: boolean;
  requireEmailCode: boolean;
  /** The sender picked "access code" (a saved code or one being typed). */
  wantsAccessCode: boolean;
  /** Part 11 mode: what this signature means (21 CFR 11.50). */
  signatureMeaning: SignatureMeaning | null;
};

export type ShellSigner = SignerChecks & {
  email: string;
  localId: string;
  name: string;
  signerId?: string;
  touched: Record<SignerField, boolean>;
};

export type SignerErrors = {
  accessCode?: string;
  email?: string;
  name?: string;
};

/** Someone who gets the finished document without signing it. */
export type ShellCopyRecipient = {
  email: string;
  localId: string;
  name: string;
  recipientId?: string;
  touched: Record<SignerField, boolean>;
};

export type InitialModel = {
  copyRecipients: ShellCopyRecipient[];
  showAllErrors: boolean;
  signers: ShellSigner[];
};

export function createSigner(
  localId: string,
  overrides?: Partial<Omit<ShellSigner, "localId" | "touched">> & {
    touched?: Partial<Record<SignerField, boolean>>;
  },
): ShellSigner {
  return {
    accessCode: "",
    email: overrides?.email ?? "",
    hasAccessCode: overrides?.hasAccessCode ?? false,
    localId,
    removeAccessCode: false,
    requireEmailCode: overrides?.requireEmailCode ?? false,
    wantsAccessCode: overrides?.hasAccessCode ?? false,
    name: overrides?.name ?? "",
    signatureMeaning: overrides?.signatureMeaning ?? null,
    signerId: overrides?.signerId,
    touched: {
      email: overrides?.touched?.email ?? false,
      name: overrides?.touched?.name ?? false,
    },
  };
}

export type SignerCheckChoice = "access_code" | "email_code" | "none";

// One check per signer. The server still honours both at once (the signer
// must then pass both), which older envelopes and API callers may have set.
export const SIGNER_CHECK_CHOICES: readonly {
  /** What the choice does, shown once it is picked. */
  detail: string;
  /** The full label: the radio's accessible name (kept for tests). */
  label: string;
  /** What the chip says. */
  short: string;
  value: SignerCheckChoice;
}[] = [
  {
    detail: "Anyone holding the emailed link can sign.",
    label: "No extra check",
    short: "None",
    value: "none",
  },
  {
    detail:
      "We email a one-time code when they open the link. They type it before they see the document.",
    label: "Email them a one-time code when they open the link",
    short: "Email code",
    value: "email_code",
  },
  {
    detail:
      "They type a code you give them yourself, for example by phone, so a forwarded email is not enough.",
    label: "Ask for an access code you give them yourself",
    short: "Access code",
    value: "access_code",
  },
];

/** The checks to set when the sender picks a choice. */
export function checkChoicePatch(
  signer: Pick<SignerChecks, "hasAccessCode">,
  choice: SignerCheckChoice,
): Partial<SignerChecks> {
  return choice === "access_code"
    ? {
        removeAccessCode: false,
        requireEmailCode: false,
        wantsAccessCode: true,
      }
    : {
        accessCode: "",
        removeAccessCode: signer.hasAccessCode,
        requireEmailCode: choice === "email_code",
        wantsAccessCode: false,
      };
}

/** Inserts a row back where it was (for Undo after a removal). */
export function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const next = [...items];

  next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
  return next;
}

export function signerCheckChoice(
  signer: Pick<SignerChecks, "requireEmailCode" | "wantsAccessCode">,
): SignerCheckChoice | "both" {
  if (signer.requireEmailCode && signer.wantsAccessCode) {
    return "both";
  }

  return signer.requireEmailCode
    ? "email_code"
    : signer.wantsAccessCode
      ? "access_code"
      : "none";
}

export function buildInitialModel(record?: DraftSignerStepData): InitialModel {
  const signers =
    record?.signers
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((signer) =>
        createSigner(signer.id, {
          email: signer.email,
          hasAccessCode: signer.hasAccessCode,
          name: signer.name,
          requireEmailCode: signer.requireEmailCode,
          signatureMeaning: signer.signatureMeaning ?? null,
          signerId: signer.id,
          touched: { email: true, name: true },
        }),
      ) ?? [];

  return {
    copyRecipients: (record?.copyRecipients ?? []).map((recipient) => ({
      email: recipient.email,
      localId: recipient.id,
      name: recipient.name,
      recipientId: recipient.id,
      touched: { email: true, name: true },
    })),
    showAllErrors: false,
    signers: signers.length > 0 ? signers : [createSigner("signer-1")],
  };
}

export function buildCopyRecipientErrors(
  copyRecipients: readonly ShellCopyRecipient[],
  signers: readonly ShellSigner[],
) {
  const errorsByLocalId: Record<string, SignerErrors> = {};
  const taken = new Set(
    signers
      .map((signer) => signer.email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );

  for (const recipient of copyRecipients) {
    const errors: SignerErrors = {};
    const normalizedEmail = recipient.email.trim().toLowerCase();

    if (recipient.name.trim().length === 0) {
      errors.name = "Name is required";
    }

    if (
      normalizedEmail.length === 0 ||
      !validEmailPattern.test(normalizedEmail)
    ) {
      errors.email = "Enter a valid email address";
    } else if (taken.has(normalizedEmail)) {
      errors.email = duplicateCopyRecipientEmailMessage;
    }

    taken.add(normalizedEmail);
    errorsByLocalId[recipient.localId] = errors;
  }

  return errorsByLocalId;
}

export function buildSignerErrors(signers: readonly ShellSigner[]) {
  const errorsBySignerId: Record<string, SignerErrors> = {};
  const emailCounts = signers.reduce<Record<string, number>>(
    (counts, signer) => {
      const normalizedEmail = signer.email.trim().toLowerCase();

      if (normalizedEmail.length > 0) {
        counts[normalizedEmail] = (counts[normalizedEmail] ?? 0) + 1;
      }

      return counts;
    },
    {},
  );

  for (const signer of signers) {
    const signerErrors: SignerErrors = {};
    const normalizedName = signer.name.trim();
    const normalizedEmail = signer.email.trim().toLowerCase();

    if (normalizedName.length === 0) {
      signerErrors.name = "Name is required";
    }

    if (
      normalizedEmail.length === 0 ||
      !validEmailPattern.test(normalizedEmail)
    ) {
      signerErrors.email = "Enter a valid email address";
    } else if (emailCounts[normalizedEmail] > 1) {
      signerErrors.email = duplicateSignerEmailMessage;
    }

    const accessCode = signer.accessCode.trim();
    const keepsSavedCode = signer.hasAccessCode && !signer.removeAccessCode;

    if (signer.wantsAccessCode && accessCode.length === 0 && !keepsSavedCode) {
      signerErrors.accessCode = "Type the code you will give them";
    } else if (
      accessCode.length > 0 &&
      (accessCode.length < 4 || accessCode.length > 64)
    ) {
      signerErrors.accessCode = "Use 4 to 64 characters";
    }

    errorsBySignerId[signer.localId] = signerErrors;
  }

  return errorsBySignerId;
}

export function hasSignerErrors(errors: SignerErrors) {
  return Boolean(errors.name || errors.email || errors.accessCode);
}

export function reorderSigners(
  signers: ShellSigner[],
  signerLocalId: string,
  direction: "earlier" | "later",
) {
  const signerIndex = signers.findIndex(
    (signer) => signer.localId === signerLocalId,
  );

  if (signerIndex === -1) {
    return signers;
  }

  const targetIndex =
    direction === "earlier" ? signerIndex - 1 : signerIndex + 1;

  if (targetIndex < 0 || targetIndex >= signers.length) {
    return signers;
  }

  const nextSigners = [...signers];
  const [movedSigner] = nextSigners.splice(signerIndex, 1);
  nextSigners.splice(targetIndex, 0, movedSigner);
  return nextSigners;
}

export function buildSignerRequest(
  signers: readonly ShellSigner[],
  copyRecipients: readonly ShellCopyRecipient[],
) {
  return {
    copyRecipients: copyRecipients.map((recipient) => ({
      email: recipient.email,
      id: recipient.recipientId,
      name: recipient.name,
    })),
    signers: signers.map((signer, index) => ({
      accessCode:
        signer.wantsAccessCode && signer.accessCode.trim().length > 0
          ? signer.accessCode.trim()
          : signer.hasAccessCode &&
              (signer.removeAccessCode || !signer.wantsAccessCode)
            ? null
            : undefined,
      email: signer.email,
      id: signer.signerId,
      name: signer.name,
      requireEmailCode: signer.requireEmailCode,
      signatureMeaning: signer.signatureMeaning,
      signOrder: index + 1,
    })),
  };
}

export async function parseJsonResponse<T>(
  response: Response,
): Promise<{ data: T | null; error: string | null }> {
  const payload = (await response.json().catch(() => null)) as
    { error?: string } | T | null;

  if (!response.ok) {
    return {
      data: null,
      error:
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : genericSubmitError,
    };
  }

  return {
    data: payload as T | null,
    error: null,
  };
}
