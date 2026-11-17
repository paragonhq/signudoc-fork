"use client";

import { RotateCwIcon } from "@/components/ui/icons";

import { StatusPanel } from "@/components/shared/status-panel";
import { Button } from "@/components/ui/button";

export default function EnvelopeDetailError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <StatusPanel
      action={{ href: "/dashboard", label: "Back to documents" }}
      description="Something went wrong while showing this envelope. Try again, or go back to your documents."
      footer={
        <Button onClick={() => retry()} variant="outline">
          <RotateCwIcon aria-hidden="true" />
          Try again
        </Button>
      }
      title="Couldn't show this envelope"
      tone="error"
    />
  );
}
