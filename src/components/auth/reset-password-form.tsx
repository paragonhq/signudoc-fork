"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Check } from "@/components/ui/icons";

import {
  AuthFormFoot,
  AuthHeading,
  IconTile,
} from "@/components/auth/auth-parts";
import { AutoHeight } from "@/components/public/auto-height";
import { StepSwap } from "@/components/public/step-swap";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

function normalize(error: { message?: string } | null | undefined) {
  return error?.message?.trim().toLowerCase() ?? "";
}

/**
 * Opened from a password reset email. One field; once the password is
 * saved the card morphs into the done state with a way to log in.
 */
export function ResetPasswordForm({ resetToken }: { resetToken: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const trimmedPassword = String(
      formData.get("reset-password") ?? password,
    ).trim();

    if (trimmedPassword.length < 15) {
      setError("Password must be at least 15 characters");
      return;
    }

    setPassword(trimmedPassword);
    setError(null);
    setIsSubmitting(true);

    const result = await authClient.resetPassword({
      newPassword: trimmedPassword,
      token: resetToken,
    });

    if (result.error) {
      const message = normalize(result.error);

      setError(
        message.includes("invalid token")
          ? "This reset link is invalid or has expired."
          : message.includes("password too short")
            ? "Password must be at least 15 characters"
            : message.includes("compromised")
              ? "Choose a password that hasn't appeared in a breach"
              : "Something went wrong. Please try again.",
      );
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsDone(true);
  }

  return (
    <AutoHeight innerClassName="relative">
      <StepSwap stepKey={isDone ? "done" : "form"}>
        {isDone ? (
          <div className="flex flex-col gap-6" role="status">
            <AuthHeading
              description="Your password has been reset. Log in with your new password."
              icon={
                <IconTile tone="success">
                  <Check />
                </IconTile>
              }
              title="Password updated"
            />
            <Button asChild className="w-full" size="lg">
              <Link href="/login">Go to log in</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <AuthHeading
              description="Choose something long you haven't used before. A password manager can make one."
              title="Create a new password"
            />
            <form
              className="flex flex-col gap-5"
              noValidate
              onSubmit={handleSubmit}
            >
              <FormField
                disabled={isSubmitting}
                error={error ?? undefined}
                hint="Must be at least 15 characters"
                label="New password"
              >
                <Input
                  autoComplete="new-password"
                  autoFocus
                  name="reset-password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  type="password"
                  value={password}
                />
              </FormField>
              <AuthFormFoot>
                <Button
                  className="w-full"
                  loading={isSubmitting}
                  size="lg"
                  type="submit"
                >
                  Update password
                </Button>
              </AuthFormFoot>
            </form>
          </div>
        )}
      </StepSwap>
    </AutoHeight>
  );
}
