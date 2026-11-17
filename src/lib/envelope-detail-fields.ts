import type { FieldRecord } from "./schemas/field.ts";

/**
 * Where each field sits on the envelope's pages, for the sender's document
 * viewer: its place (as fractions of the page), whose it is, and whether it
 * has been filled in. What was written is never included: the sender reads
 * that in the signed PDF.
 */
export type EnvelopeDetailFieldView = {
  filled: boolean;
  height: number;
  id: string;
  page: number;
  required: boolean;
  /** The signer's place in signing order, from 0: picks their colour. */
  signerIndex: number;
  type: FieldRecord["type"];
  width: number;
  x: number;
  y: number;
};

type FieldInput = Pick<
  FieldRecord,
  "height" | "page" | "submittedAt" | "type" | "width" | "x" | "y"
> & { id: string; required?: boolean; signerId: string };

type SignerInput = { id: string; signOrder: number };

/**
 * The fields of one envelope as the detail page shows them. Fields of a
 * signer that is no longer on the envelope are left out.
 */
export function buildEnvelopeDetailFieldViews(
  fields: readonly FieldInput[],
  signers: readonly SignerInput[],
): EnvelopeDetailFieldView[] {
  const indexBySigner = new Map(
    [...signers]
      .sort((left, right) => left.signOrder - right.signOrder)
      .map((signer, index) => [signer.id, index] as const),
  );

  return fields.flatMap((field) => {
    const signerIndex = indexBySigner.get(field.signerId);

    if (signerIndex === undefined) {
      return [];
    }

    return [
      {
        filled: typeof field.submittedAt === "number",
        height: field.height,
        id: field.id,
        page: field.page,
        required: field.required !== false,
        signerIndex,
        type: field.type,
        width: field.width,
        x: field.x,
        y: field.y,
      },
    ];
  });
}
