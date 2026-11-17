/*
 * The builder's data model: field tools, the field and signer shapes the
 * screen works with, and pure operations on a list of fields. Nothing here
 * touches React or the DOM, so every edit (place, move, resize, duplicate,
 * align, undo) is a plain function from one list to the next.
 */
import { type PrepareEnvelopeData } from "@/lib/envelopes";
import { MAX_RADIO_GROUP_BUTTONS } from "@/lib/field-choices";
import { type FieldPlacement } from "@/lib/schemas/field";
import {
  moveFieldRect,
  placeFieldAtViewportPoint,
  resizeFieldRectFromHandle,
  type FieldResizeHandle,
} from "@/lib/utils/pdf-coords";

import { getSignerPalette } from "../signer-palette";

export type PrepareFieldType = FieldPlacement["type"];

export type PrepareField = FieldPlacement & {
  id: string;
};

export type PrepareShellSigner = {
  color: string;
  email: string;
  id: string;
  /** 0-based position in the signing order; picks --signer-1..4. */
  index: number;
  name: string;
  order: number;
  tint: string;
};

export type FieldTool = {
  defaultHeight: number;
  defaultWidth: number;
  /** The digit that arms it (1–9). */
  key: string;
  label: string;
  minHeight: number;
  minWidth: number;
  placeholderLabel: string;
  type: PrepareFieldType;
};

export type Rect = { height: number; width: number; x: number; y: number };

export type SaveState = "error" | "saved" | "saving";

export const fieldTools: readonly FieldTool[] = [
  {
    defaultHeight: 0.07,
    defaultWidth: 0.24,
    key: "1",
    label: "Signature",
    minHeight: 0.0045,
    minWidth: 0.006,
    placeholderLabel: "Sign",
    type: "signature",
  },
  {
    defaultHeight: 0.055,
    defaultWidth: 0.14,
    key: "2",
    label: "Initials",
    minHeight: 0.0045,
    minWidth: 0.006,
    placeholderLabel: "Initials",
    type: "initials",
  },
  {
    defaultHeight: 0.045,
    defaultWidth: 0.12,
    key: "3",
    label: "Date",
    minHeight: 0.0045,
    minWidth: 0.006,
    placeholderLabel: "Date",
    type: "date",
  },
  {
    // Filled in with the name the sender gave the signer, when they sign.
    defaultHeight: 0.045,
    defaultWidth: 0.2,
    key: "4",
    label: "Name",
    minHeight: 0.0045,
    minWidth: 0.006,
    placeholderLabel: "Name",
    type: "name",
  },
  {
    defaultHeight: 0.055,
    defaultWidth: 0.18,
    key: "5",
    label: "Text",
    minHeight: 0.0045,
    minWidth: 0.006,
    placeholderLabel: "Text",
    type: "text",
  },
  {
    defaultHeight: 0.023,
    defaultWidth: 0.03,
    key: "6",
    label: "Checkbox",
    minHeight: 0.0045,
    minWidth: 0.006,
    placeholderLabel: "Checkbox",
    type: "checkbox",
  },
  {
    defaultHeight: 0.045,
    defaultWidth: 0.16,
    key: "7",
    label: "Number",
    minHeight: 0.0045,
    minWidth: 0.006,
    placeholderLabel: "Number",
    type: "number",
  },
  {
    defaultHeight: 0.045,
    defaultWidth: 0.22,
    key: "8",
    label: "Dropdown",
    minHeight: 0.0045,
    minWidth: 0.006,
    placeholderLabel: "Dropdown",
    type: "dropdown",
  },
  {
    defaultHeight: 0.023,
    defaultWidth: 0.03,
    key: "9",
    label: "Radio button",
    minHeight: 0.0045,
    minWidth: 0.006,
    placeholderLabel: "Radio button",
    type: "radio",
  },
] as const;

export const genericSubmitError = "Something went wrong. Please try again.";
export const autosaveDelayMs = 450;

export function getFieldTool(type: PrepareFieldType) {
  return fieldTools.find((tool) => tool.type === type) ?? fieldTools[0];
}

/** Fields the sender may leave optional. Signature, initials, date and name never. */
export function canBeOptional(type: PrepareFieldType) {
  return (
    type === "text" ||
    type === "checkbox" ||
    type === "number" ||
    type === "dropdown" ||
    type === "radio"
  );
}

/** Field types whose label the signer sees as the prompt. */
export function canHaveLabel(type: PrepareFieldType) {
  return (
    type === "text" ||
    type === "number" ||
    type === "checkbox" ||
    type === "dropdown"
  );
}

/** The fields that change together with this one: its radio group, or itself. */
export function isSameChoice(field: PrepareField, other: PrepareField) {
  return (
    field.id === other.id ||
    (field.type === "radio" &&
      other.type === "radio" &&
      field.groupId !== undefined &&
      field.groupId === other.groupId)
  );
}

/** An id for a field, a radio group, or a button added to one. */
export function newLocalId() {
  return typeof window !== "undefined" &&
    "crypto" in window &&
    typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** "ENV-8F3A21": a short, readable handle for a UUID. */
export function shortEnvelopeId(envelopeId: string) {
  return `ENV-${envelopeId
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase()}`;
}

export function buildLiveSigners(
  signers: PrepareEnvelopeData["signers"],
): PrepareShellSigner[] {
  return signers
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((signer, index) => ({
      ...getSignerPalette(index),
      email: signer.email,
      id: signer.id,
      index,
      name: signer.name,
      order: signer.order,
    }));
}

type LiveFieldSource = ReadonlyArray<{
  groupId?: string;
  height: number;
  id?: string;
  label?: string;
  options?: readonly string[];
  page: number;
  required: boolean;
  signerId: string;
  type: PrepareFieldType;
  width: number;
  x: number;
  y: number;
}>;

export function buildLiveFields(fields: LiveFieldSource): PrepareField[] {
  return fields.map((field, index) => ({
    groupId: field.groupId,
    height: field.height,
    id: field.id ?? `field-${index + 1}`,
    label: field.label,
    options: field.options ? [...field.options] : undefined,
    page: field.page,
    required: field.required,
    signerId: field.signerId,
    type: field.type,
    width: field.width,
    x: field.x,
    y: field.y,
  }));
}

function roundNormalized(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function buildFieldRequest(fields: readonly PrepareField[]) {
  return {
    fields: fields.map((field) => ({
      groupId: field.type === "radio" ? field.groupId : undefined,
      height: roundNormalized(field.height),
      id: field.id,
      label: field.label,
      options: field.type === "dropdown" ? (field.options ?? []) : undefined,
      page: field.page,
      required: field.required,
      signerId: field.signerId,
      type: field.type,
      width: roundNormalized(field.width),
      x: roundNormalized(field.x),
      y: roundNormalized(field.y),
    })),
  };
}

export function serializeFieldRequest(fields: readonly PrepareField[]) {
  return JSON.stringify(buildFieldRequest(fields));
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

  return { data: payload as T | null, error: null };
}

export function isTextEntryTarget(target: EventTarget | null) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }

  return target instanceof HTMLElement && target.isContentEditable;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/* ------------------------------------------------------------------ */
/* Operations: (fields, …) => next fields                              */
/* ------------------------------------------------------------------ */

/** A new field of this tool, centred on a point given in page fractions. */
export function createField(input: {
  page: number;
  pointX: number;
  pointY: number;
  signerId: string;
  type: PrepareFieldType;
}): PrepareField {
  const tool = getFieldTool(input.type);
  const rect = placeFieldAtViewportPoint({
    clientX: input.pointX,
    clientY: input.pointY,
    fieldHeight: tool.defaultHeight,
    fieldWidth: tool.defaultWidth,
    viewportHeight: 1,
    viewportWidth: 1,
  });

  return {
    ...rect,
    // A radio button starts a group of its own; more are added from the
    // inspector.
    groupId: tool.type === "radio" ? newLocalId() : undefined,
    id: newLocalId(),
    label: tool.type === "radio" ? "Option 1" : undefined,
    options: tool.type === "dropdown" ? [] : undefined,
    page: input.page,
    // Text, number and checkbox fields start optional; a dropdown or a
    // group of radio buttons is usually a question that needs an answer.
    required: !(
      tool.type === "text" ||
      tool.type === "number" ||
      tool.type === "checkbox"
    ),
    signerId: input.signerId,
    type: tool.type,
  };
}

export function reassignFields(
  fields: readonly PrepareField[],
  ids: readonly string[],
  signerId: string,
) {
  const targets = fields.filter((field) => ids.includes(field.id));

  // The buttons of a radio group are answered by one person.
  return fields.map((field) =>
    targets.some((target) => isSameChoice(target, field))
      ? { ...field, signerId }
      : field,
  );
}

export function patchField(
  fields: readonly PrepareField[],
  fieldId: string,
  patch: Pick<Partial<PrepareField>, "label" | "options">,
) {
  return fields.map((field) =>
    field.id === fieldId ? { ...field, ...patch } : field,
  );
}

export function setRequired(
  fields: readonly PrepareField[],
  ids: readonly string[],
  required: boolean,
) {
  const targets = fields.filter(
    (field) => ids.includes(field.id) && canBeOptional(field.type),
  );

  // A radio group is required or optional as a whole.
  return fields.map((field) =>
    targets.some((target) => isSameChoice(target, field))
      ? { ...field, required }
      : field,
  );
}

/** Adds a radio button just below the group, in the same group. */
export function addRadioButton(
  fields: readonly PrepareField[],
  fieldId: string,
  nextId: string,
): PrepareField[] {
  const source = fields.find((field) => field.id === fieldId);

  if (!source || source.type !== "radio" || !source.groupId) {
    return [...fields];
  }

  const group = fields.filter((field) => isSameChoice(source, field));

  if (group.length >= MAX_RADIO_GROUP_BUTTONS) {
    return [...fields];
  }

  const lowest = group
    .filter((field) => field.page === source.page)
    .reduce((bottom, field) => Math.max(bottom, field.y), source.y);

  return [
    ...fields,
    {
      ...source,
      id: nextId,
      label: `Option ${String(group.length + 1)}`,
      y: Math.min(1 - source.height, lowest + source.height * 1.6),
    },
  ];
}

export function moveFields(
  fields: readonly PrepareField[],
  ids: readonly string[],
  deltaX: number,
  deltaY: number,
) {
  if (deltaX === 0 && deltaY === 0) {
    return [...fields];
  }

  return fields.map((field) =>
    ids.includes(field.id)
      ? { ...field, ...moveFieldRect({ deltaX, deltaY, rect: field }) }
      : field,
  );
}

export function resizeFieldTo(
  fields: readonly PrepareField[],
  fieldId: string,
  rect: Rect,
) {
  return fields.map((field) =>
    field.id === fieldId ? { ...field, ...rect } : field,
  );
}

export function resizeFieldFromHandle(
  field: PrepareField,
  corner: FieldResizeHandle,
  deltaX: number,
  deltaY: number,
): Rect {
  const tool = getFieldTool(field.type);

  return resizeFieldRectFromHandle({
    corner,
    deltaX,
    deltaY,
    minHeight: tool.minHeight,
    minWidth: tool.minWidth,
    rect: field,
  });
}

/** Sets one edge or size of a field from the inspector, kept on the page. */
export function setFieldGeometry(
  fields: readonly PrepareField[],
  fieldId: string,
  patch: Partial<Rect>,
) {
  return fields.map((field) => {
    if (field.id !== fieldId) {
      return field;
    }

    const tool = getFieldTool(field.type);
    const width = clamp(patch.width ?? field.width, tool.minWidth, 1);
    const height = clamp(patch.height ?? field.height, tool.minHeight, 1);
    const x = clamp(patch.x ?? field.x, 0, 1 - width);
    const y = clamp(patch.y ?? field.y, 0, 1 - height);

    return { ...field, height, width, x, y };
  });
}

export function deleteFields(
  fields: readonly PrepareField[],
  ids: readonly string[],
) {
  return fields.filter((field) => !ids.includes(field.id));
}

/**
 * Copies the fields a little down and to the right. A copied radio button
 * joins its group (as the next option) while the group has room.
 */
export function duplicateFields(
  fields: readonly PrepareField[],
  ids: readonly string[],
  offset: { x: number; y: number },
): { fields: PrepareField[]; newIds: string[] } {
  let next = [...fields];
  const newIds: string[] = [];

  for (const id of ids) {
    const source = next.find((field) => field.id === id);

    if (!source) {
      continue;
    }

    const copyId = newLocalId();
    const rect = moveFieldRect({
      deltaX: offset.x,
      deltaY: offset.y,
      rect: source,
    });

    if (source.type === "radio" && source.groupId) {
      const groupSize = next.filter((field) =>
        isSameChoice(source, field),
      ).length;

      if (groupSize >= MAX_RADIO_GROUP_BUTTONS) {
        continue;
      }

      next = [
        ...next,
        {
          ...source,
          ...rect,
          id: copyId,
          label: `Option ${String(groupSize + 1)}`,
        },
      ];
    } else {
      next = [
        ...next,
        {
          ...source,
          ...rect,
          id: copyId,
          options: source.options ? [...source.options] : undefined,
        },
      ];
    }

    newIds.push(copyId);
  }

  return { fields: next, newIds };
}

export type Alignment =
  "left" | "center-x" | "right" | "top" | "center-y" | "bottom";

/**
 * Aligns one field to the page, or several fields to the box around them,
 * the way design tools do.
 */
export function alignFields(
  fields: readonly PrepareField[],
  ids: readonly string[],
  alignment: Alignment,
) {
  const targets = fields.filter((field) => ids.includes(field.id));

  if (targets.length === 0) {
    return [...fields];
  }

  const box =
    targets.length === 1
      ? { bottom: 1, left: 0, right: 1, top: 0 }
      : {
          bottom: Math.max(...targets.map((field) => field.y + field.height)),
          left: Math.min(...targets.map((field) => field.x)),
          right: Math.max(...targets.map((field) => field.x + field.width)),
          top: Math.min(...targets.map((field) => field.y)),
        };

  return fields.map((field) => {
    if (!ids.includes(field.id)) {
      return field;
    }

    switch (alignment) {
      case "left":
        return { ...field, x: box.left };
      case "center-x":
        return {
          ...field,
          x: clamp(
            (box.left + box.right) / 2 - field.width / 2,
            0,
            1 - field.width,
          ),
        };
      case "right":
        return { ...field, x: clamp(box.right - field.width, 0, 1) };
      case "top":
        return { ...field, y: box.top };
      case "center-y":
        return {
          ...field,
          y: clamp(
            (box.top + box.bottom) / 2 - field.height / 2,
            0,
            1 - field.height,
          ),
        };
      case "bottom":
        return { ...field, y: clamp(box.bottom - field.height, 0, 1) };
    }
  });
}

/** The fields a signer answers, and whether one of them is a signature. */
export function summarizeSigner(
  fields: readonly PrepareField[],
  signerId: string,
) {
  const own = fields.filter((field) => field.signerId === signerId);

  return {
    count: own.length,
    hasSignature: own.some((field) => field.type === "signature"),
  };
}
