"use client";

import { useState } from "react";
import { ShieldCheck } from "@/components/ui/icons";

import { AuthHeading, IconTile } from "@/components/auth/auth-parts";
import { useBranding } from "@/components/layout/branding-provider";
import { TwoFactorPanel } from "@/components/settings/two-factor-panel";
import { Button } from "@/components/ui/button";

/*
 * Where someone lands when the install requires two-step sign-in and they
 * have not set it up. One job: turn it on. A short heading says why, the
 * settings panel itself does the work (so the flow is the one they will
 * see again in Settings), and a quiet way out sits underneath.
 */
export function TwoStepSetupRequired({ email }: { email: string }) {
  const { productName } = useBranding();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        body: "{}",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <AuthHeading
        className="items-center text-center"
        description={
          <>
            {productName} asks everyone to use a second step. Set it up for{" "}
            <span className="font-medium break-all text-(--fg)">{email}</span>{" "}
            to continue. It takes about a minute with an authenticator app.
          </>
        }
        icon={
          <IconTile size="lg" tone="accent">
            <ShieldCheck />
          </IconTile>
        }
        title="Set up two-step sign-in"
      />

      <TwoFactorPanel enabled={false} required />

      <p className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-(--secondary)">
        Not you, or not now?
        <Button
          className="-ml-1"
          loading={isSigningOut}
          onClick={() => void signOut()}
          size="sm"
          variant="link"
        >
          Sign out
        </Button>
      </p>
    </div>
  );
}
