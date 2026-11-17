/*
 * The signer's fields, as data: labels, completeness, ordering and the
 * submission payload. No React here; the shell and its parts share it.
 */
import { isNumberEntry } from "@/lib/field-choices";
import type { SigningSubmission } from "@/lib/schemas/field";
import type {
  SigningCurrentField,
  SigningPayload,
  SigningVisibleField,
} from "@/lib/schemas/signing";

/** The typed-signature face. System script faces; the PDF stamps its own. */
export const TYPED_SIGNATURE_FONT =
  '"Snell Roundhand", "Brush Script MT", "Segoe Script", "Apple Chancery", cursive';

export type SignatureKind = "initials" | "signature";

export type SignatureEntry = {
  imageDataUrl?: string | null;
  inputMethod: "drawn" | "typed";
  value: string;
};

export type ReusableSignatureEntries = Record<
  SignatureKind,
  SignatureEntry | null
>;

/** The values the signer has entered so far, by field. */
export type EnteredValues = {
  /** Checkboxes and radio buttons. */
  checkboxValues: Record<string, boolean>;
  signatureValues: Record<string, SignatureEntry>;
  /** Text, number and dropdown fields. */
  textValues: Record<string, string>;
};

/** Why a signer came back from their signing provider without signing. */
export type ProviderSignatureProblem =
  "cancelled" | "expired" | "failed" | "name";

/** Where a signing link can end up instead of the document. */
export type SigningUnavailableState =
  "already-signed" | "declined" | "error" | "expired" | "voided";

export function getSignerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

export function getFieldFrame(
  field: Pick<SigningCurrentField, "height" | "width" | "x" | "y">,
) {
  return {
    height: `${field.height * 100}%`,
    left: `${field.x * 100}%`,
    top: `${field.y * 100}%`,
    width: `${field.width * 100}%`,
  };
}

/** Big enough on the page to carry a short label. */
export function hasRoomForLabel(
  field: Pick<SigningCurrentField, "height" | "width">,
) {
  return field.width >= 0.12 && field.height >= 0.045;
}

/** Big enough on the page to show the value entered. */
export function hasRoomForValue(
  field: Pick<SigningCurrentField, "height" | "width">,
) {
  return field.width >= 0.08 && field.height >= 0.03;
}

export function getSignatureKind(
  field: Pick<SigningCurrentField, "type">,
): SignatureKind | null {
  return field.type === "initials" || field.type === "signature"
    ? field.type
    : null;
}

/** The accessible name of a field on the page. */
export function getFieldLabel(
  field: Pick<SigningCurrentField, "label" | "type">,
): string {
  if (field.label?.trim()) {
    return field.label;
  }

  switch (field.type) {
    case "signature":
      return "Sign here";
    case "initials":
      return "Initial here";
    case "date":
      return "Date";
    case "name":
      return "Name";
    case "text":
      return "Enter text";
    case "checkbox":
      return "Checkbox";
    case "number":
      return "Enter a number";
    case "dropdown":
      return "Choose one";
    case "radio":
      return "Option";
    default:
      return "Field";
  }
}

/** The short label printed inside a field on the page. */
export function getCanvasFieldLabel(
  field: Pick<SigningCurrentField, "label" | "type">,
) {
  if (field.label?.trim()) {
    return field.label;
  }

  switch (field.type) {
    case "signature":
      return "Sign";
    case "initials":
      return "Initial";
    case "date":
      return "Date";
    case "name":
      return "Name";
    case "text":
      return "Text";
    case "checkbox":
      return "Check";
    case "number":
      return "Number";
    case "dropdown":
      return "Choose";
    case "radio":
      return "Option";
    default:
      return "Field";
  }
}

/** What the field is, for the checklist and the signature button's name. */
export function getFieldKindLabel(field: Pick<SigningCurrentField, "type">) {
  switch (field.type) {
    case "signature":
      return "Signature";
    case "initials":
      return "Initials";
    case "date":
      return "Date";
    case "name":
      return "Name";
    case "text":
      return "Text";
    case "checkbox":
      return "Checkbox";
    case "number":
      return "Number";
    case "dropdown":
      return "Dropdown";
    case "radio":
      return "Choice";
    default:
      return "Field";
  }
}

/** What the travelling flag says when it points at this field. */
export function getFlagLabel(field: Pick<SigningCurrentField, "type">) {
  switch (field.type) {
    case "signature":
      return "Sign here";
    case "initials":
      return "Initial here";
    case "checkbox":
      return "Check";
    case "dropdown":
    case "radio":
      return "Choose";
    default:
      return "Fill in";
  }
}

/** The radio buttons that are answered together with this one. */
export function getRadioGroup(
  field: SigningCurrentField,
  fields: readonly SigningCurrentField[],
) {
  return fields.filter(
    (other) =>
      other.type === "radio" &&
      (other.id === field.id ||
        (field.groupId !== undefined && other.groupId === field.groupId)),
  );
}

/** A number field holding something that is not a number. */
export function hasInvalidNumber(
  field: SigningCurrentField,
  textValues: Record<string, string>,
) {
  const value = (textValues[field.id] ?? "").trim();

  return field.type === "number" && value.length > 0 && !isNumberEntry(value);
}

export function isFieldComplete(
  field: SigningCurrentField,
  fields: readonly SigningCurrentField[],
  { checkboxValues, signatureValues, textValues }: EnteredValues,
) {
  if (field.type === "signature" || field.type === "initials") {
    return Boolean(signatureValues[field.id]?.value);
  }

  if (field.type === "number" && hasInvalidNumber(field, textValues)) {
    return false;
  }

  if (
    field.type === "text" ||
    field.type === "number" ||
    field.type === "dropdown"
  ) {
    return !field.required || (textValues[field.id] ?? "").trim().length > 0;
  }

  if (field.type === "checkbox") {
    return !field.required || Boolean(checkboxValues[field.id]);
  }

  if (field.type === "radio") {
    // One chosen button answers for the whole group.
    return (
      !field.required ||
      getRadioGroup(field, fields).some((button) => checkboxValues[button.id])
    );
  }

  return true;
}

/** Has the signer put anything in it (for optional fields in the list). */
export function isFieldTouched(
  field: SigningCurrentField,
  fields: readonly SigningCurrentField[],
  { checkboxValues, signatureValues, textValues }: EnteredValues,
) {
  switch (field.type) {
    case "signature":
    case "initials":
      return Boolean(signatureValues[field.id]?.value);
    case "text":
    case "number":
    case "dropdown":
      return (textValues[field.id] ?? "").trim().length > 0;
    case "checkbox":
      return Boolean(checkboxValues[field.id]);
    case "radio":
      return getRadioGroup(field, fields).some(
        (button) => checkboxValues[button.id],
      );
    default:
      return true;
  }
}

/** The fields the signer acts on, in reading order: page, then top to bottom. */
export function orderFields<T extends SigningCurrentField>(
  fields: readonly T[],
): T[] {
  return [...fields].sort(
    (a, b) =>
      a.page - b.page ||
      Math.round(a.y * 200) - Math.round(b.y * 200) ||
      a.x - b.x,
  );
}

/**
 * The fields the progress list shows: everything the signer fills in
 * (dates fill themselves), with a group of radio buttons listed once.
 */
/**
 * Fields the signer never types: the date and their name are filled in
 * when they finish, so they are not counted as left to do.
 */
export function isAutoFilledField(field: Pick<SigningCurrentField, "type">) {
  return field.type === "date" || field.type === "name";
}

export function getChecklistFields(fields: readonly SigningCurrentField[]) {
  const seenGroups = new Set<string>();

  return orderFields(fields).filter((field) => {
    if (isAutoFilledField(field)) {
      return false;
    }

    if (field.type === "checkbox" || field.type === "radio") {
      if (!field.required) {
        return false;
      }
    }

    if (field.type !== "radio" || field.groupId === undefined) {
      return true;
    }

    if (seenGroups.has(field.groupId)) {
      return false;
    }

    seenGroups.add(field.groupId);

    return true;
  });
}

/** The value a field holds, in words, for the checklist. */
export function getCompletionValue(
  field: SigningCurrentField,
  fields: readonly SigningCurrentField[],
  { checkboxValues, signatureValues, textValues }: EnteredValues,
) {
  if (field.type === "signature" || field.type === "initials") {
    const entry = signatureValues[field.id];

    if (!entry) {
      return null;
    }

    return entry.inputMethod === "drawn"
      ? field.type === "initials"
        ? "Drawn initials"
        : "Drawn signature"
      : entry.value;
  }

  if (field.type === "number" && hasInvalidNumber(field, textValues)) {
    return "Not a number";
  }

  if (
    field.type === "text" ||
    field.type === "number" ||
    field.type === "dropdown"
  ) {
    return textValues[field.id]?.trim() || null;
  }

  if (field.type === "checkbox") {
    return checkboxValues[field.id] ? "Checked" : null;
  }

  if (field.type === "radio") {
    const chosen = getRadioGroup(field, fields).find(
      (button) => checkboxValues[button.id],
    );

    return chosen ? getFieldLabel(chosen) : null;
  }

  return null;
}

export function getVisibleFieldValue(field: SigningVisibleField) {
  if (field.type === "checkbox" || field.type === "radio") {
    return field.checked ? "Checked" : "Unchecked";
  }

  return field.value?.trim() || getFieldLabel(field);
}

export function buildSigningSubmissionPayload(
  record: SigningPayload,
  { checkboxValues, signatureValues, textValues }: EnteredValues,
): SigningSubmission {
  const fields: SigningSubmission["fields"] = [];

  for (const field of record.currentSignerFields) {
    if (field.type === "signature" || field.type === "initials") {
      const entry = signatureValues[field.id];

      if (!entry) {
        continue;
      }

      if (entry.inputMethod === "drawn" && entry.imageDataUrl) {
        fields.push({
          fieldId: field.id,
          imageDataUrl: entry.imageDataUrl,
          inputMethod: "drawn",
          type: field.type,
        });
        continue;
      }

      fields.push({
        fieldId: field.id,
        inputMethod: "typed",
        type: field.type,
        value: entry.value,
      });
      continue;
    }

    if (
      field.type === "text" ||
      field.type === "number" ||
      field.type === "dropdown"
    ) {
      const value = textValues[field.id]?.trim();

      if (value) {
        fields.push({ fieldId: field.id, type: field.type, value });
      }

      continue;
    }

    if (field.type === "checkbox" || field.type === "radio") {
      fields.push({
        checked: Boolean(checkboxValues[field.id]),
        fieldId: field.id,
        type: field.type,
      });
    }
  }

  return {
    clientTimezoneOffsetMinutes: new Date().getTimezoneOffset(),
    fields,
  };
}

export function describeProviderProblem(
  problem: ProviderSignatureProblem,
  providerName: string,
): string {
  switch (problem) {
    case "cancelled":
      return `You did not finish signing at ${providerName}. Nothing was signed, so you can try again.`;
    case "expired":
      return "Your earlier signing session ended before it finished. Nothing was signed, so you can try again.";
    case "name":
      return `The certificate you signed with at ${providerName} is not in the name this document was sent to. Nothing was signed. If the name is wrong, ask the sender to send the document again under the name on your certificate.`;
    default:
      return `${providerName} could not complete your signature. Nothing was signed. Try again, or ask the sender for help.`;
  }
}

const UNAVAILABLE_STATES: readonly SigningUnavailableState[] = [
  "already-signed",
  "declined",
  "error",
  "expired",
  "voided",
];

/** A state the server answered with, if it is one the shell can show. */
export function asUnavailableState(
  value: unknown,
): SigningUnavailableState | null {
  return UNAVAILABLE_STATES.find((state) => state === value) ?? null;
}
