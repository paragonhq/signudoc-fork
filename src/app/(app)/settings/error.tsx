"use client";

import { StatusPanel } from "@/components/shared/status-panel";
import { Button } from "@/components/ui/button";

export default function SettingsError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <StatusPanel
      description="Your settings could not be loaded. Nothing was changed. Try again, or come back in a minute."
      eyebrow="Settings"
      footer={
        <Button onClick={() => retry()} variant="outline">
          Try again
        </Button>
      }
      title="We couldn't load your settings."
      tone="error"
    />
  );
}
