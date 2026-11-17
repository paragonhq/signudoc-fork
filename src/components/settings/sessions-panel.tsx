"use client";

import { useState } from "react";
import { LogOut } from "@/components/ui/icons";

import {
  GENERIC_ERROR_MESSAGE,
  SettingRow,
  SettingsAnchor,
} from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";

// Ends every session this account has, on every device, this one included.
export function SessionsPanel() {
  const [error, setError] = useState<string | null>(null);

  async function signOutEverywhere() {
    setError(null);

    let response: Response;

    try {
      response = await fetch("/api/auth/revoke-sessions", {
        body: "{}",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
      throw new Error("sign out failed");
    }

    if (!response.ok) {
      setError(GENERIC_ERROR_MESSAGE);
      throw new Error("sign out failed");
    }

    // This browser was signed out too: the only place left is the login.
    window.location.assign("/login");
    // Keep the tray busy while the browser leaves.
    await new Promise(() => undefined);
  }

  return (
    <SettingsAnchor id="devices">
      <SettingRow
        controlWidth="auto"
        description="Signed in on a computer that is not yours, or lost a device? Sign out on every browser and phone, this one included."
        kind="group"
        label="Signed-in devices"
      >
        <ConfirmTray
          confirmLabel="Sign out everywhere"
          description="Every browser signed in to your account, including this one, has to sign in again."
          error={error}
          hold={false}
          onConfirm={signOutEverywhere}
          onOpenChange={(open) => {
            if (!open) {
              setError(null);
            }
          }}
          title="Sign out on every device?"
          tone="default"
          trigger={
            <Button className="max-md:w-full" variant="outline">
              <LogOut aria-hidden="true" />
              Sign out everywhere
            </Button>
          }
        />
      </SettingRow>
    </SettingsAnchor>
  );
}
