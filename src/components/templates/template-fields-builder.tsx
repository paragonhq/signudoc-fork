"use client";

import { PrepareLiveShell } from "@/components/envelopes/prepare-live-shell";
import { CanvasShellOverridesProvider } from "@/components/layout/canvas-shell";
import type { PrepareEnvelopeData } from "@/lib/envelopes";

/**
 * The builder, reused for a template from scratch: the same canvas and
 * tools, but Back returns to the template, the bar says where you are in
 * this flow, and Next leads to "Save template" (the workspace brings the
 * person there when the builder finishes).
 */
export function TemplateFieldsBuilder({
  envelopeId,
  initialState,
  record,
}: {
  envelopeId: string;
  initialState?: "error";
  record?: PrepareEnvelopeData;
}) {
  return (
    <CanvasShellOverridesProvider
      value={{
        backHref: `/templates/new/${encodeURIComponent(envelopeId)}`,
        backLabel: "Back to the template",
        nextLabel: "Review template →",
        stepLabel: "New template · Step 3 of 3",
      }}
    >
      <PrepareLiveShell
        envelopeId={envelopeId}
        initialState={initialState}
        record={record}
      />
    </CanvasShellOverridesProvider>
  );
}
