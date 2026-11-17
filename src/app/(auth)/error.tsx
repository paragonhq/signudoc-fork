"use client";

import { RotateCcw } from "@/components/ui/icons";

import { StatusPanel } from "@/components/shared/status-panel";
import { Button } from "@/components/ui/button";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusPanel
      description="This page hit an unexpected error. Try again, and if it keeps happening, reload the page."
      footer={
        <Button onClick={reset} variant="outline">
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
      }
      title="Something went wrong."
      tone="error"
    />
  );
}
