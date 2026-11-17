"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "@/components/ui/icons";

import { AuthNotice } from "@/components/auth/auth-parts";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TraySteps,
  TrayTitle,
} from "@/components/ui/tray";
import { authClient } from "@/lib/auth/client";
import { forgotPasswordSchema } from "@/lib/schemas/auth";

type ForgotState =
  { kind: "form" } | { kind: "sending" } | { kind: "sent"; email: string };

/**
 * "Forgot password?" as a tray. One decision: where to send the link. Once
 * it is sent, the same tray morphs into the sent state (height glides, the
 * title and body cross over) instead of closing and toasting.
 */
export function ForgotPasswordTray({
  initialEmail,
  onOpenChange,
  open,
}: {
  /** What was typed on the login form, carried over. */
  initialEmail: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [state, setState] = useState<ForgotState>({ kind: "form" });
  const isSubmitting = state.kind === "sending";

  function handleOpenChange(next: boolean) {
    if (isSubmitting) {
      return;
    }

    if (next) {
      // Fresh each time it opens, starting from what the form holds.
      setEmail(initialEmail);
      setEmailError(undefined);
      setBannerMessage(null);
      setState({ kind: "form" });
    }

    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const trimmed = String(
      formData.get("forgot-password-email") ?? email,
    ).trim();
    const validationResult = forgotPasswordSchema.safeParse({ email: trimmed });

    if (!validationResult.success) {
      setEmail(trimmed);
      setEmailError("Enter a valid email address");
      setBannerMessage(null);
      return;
    }

    setEmail(validationResult.data.email);
    setEmailError(undefined);
    setBannerMessage(null);
    setState({ kind: "sending" });

    const result = await authClient.requestPasswordReset({
      email: validationResult.data.email,
      redirectTo: `${window.location.origin}/login`,
    });

    if (result.error) {
      setBannerMessage("We couldn't send the reset link. Please try again.");
      setState({ kind: "form" });
      return;
    }

    setState({ email: validationResult.data.email, kind: "sent" });
  }

  return (
    <Tray
      dismissible={!isSubmitting}
      onOpenChange={handleOpenChange}
      open={open}
    >
      <TrayContent showCloseButton={!isSubmitting} size="sm">
        <TraySteps step={state.kind === "sent" ? 1 : 0}>
          {state.kind === "sent" ? (
            <>
              <TrayHeader
                icon={
                  <MailCheck aria-hidden="true" className="text-(--success)" />
                }
              >
                <TrayTitle>Check your email</TrayTitle>
                <TrayDescription>
                  Check your email for a reset link. If{" "}
                  <span className="font-medium text-(--fg)">{state.email}</span>{" "}
                  has an account here, the link arrives in a minute or two.
                </TrayDescription>
              </TrayHeader>
              <TrayFooter>
                <Button
                  onClick={() => setState({ kind: "form" })}
                  variant="outline"
                >
                  Use another email
                </Button>
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
              </TrayFooter>
            </>
          ) : (
            <form noValidate onSubmit={handleSubmit}>
              <TrayHeader>
                <TrayTitle>Reset your password</TrayTitle>
                <TrayDescription>
                  Enter the email address associated with your account and
                  we&apos;ll send you a reset link.
                </TrayDescription>
              </TrayHeader>
              <TrayBody className="space-y-4">
                <AuthNotice>{bannerMessage}</AuthNotice>
                <FormField
                  disabled={isSubmitting}
                  error={emailError}
                  label="Email"
                >
                  <Input
                    autoComplete="email"
                    autoFocus
                    inputMode="email"
                    name="forgot-password-email"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setEmailError(undefined);
                      setBannerMessage(null);
                    }}
                    placeholder="jane@acmecorp.com"
                    type="email"
                    value={email}
                  />
                </FormField>
              </TrayBody>
              <TrayFooter>
                <Button
                  disabled={isSubmitting}
                  onClick={() => handleOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button loading={isSubmitting} type="submit">
                  Send reset link
                </Button>
              </TrayFooter>
            </form>
          )}
        </TraySteps>
      </TrayContent>
    </Tray>
  );
}
