"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, ShieldCheck } from "@/components/ui/icons";

import {
  AuthFormFoot,
  AuthHeading,
  AuthNotice,
  IconTile,
  textActionClassName,
} from "@/components/auth/auth-parts";
import { CodeInput } from "@/components/auth/code-input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type SecondStepFormProps = {
  /** Back to the password, with a reason to show there. */
  onRestart: (message: string | null) => void;
  onSignedIn: () => void;
};

/**
 * The second step of signing in, shown in the same card as the password
 * (the card changes height and the step slides in; it is not a new page).
 * Six boxes for the authenticator code, or a plain field for a backup code.
 * The round back button returns to the password, like a tray's back.
 */
export function SecondStepForm({ onRestart, onSignedIn }: SecondStepFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (isSubmitting || isDone) {
      return;
    }

    const trimmed = code.replace(/\s+/g, "");

    if (!useBackupCode && !/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code your authenticator app shows.");
      return;
    }

    if (useBackupCode && trimmed.length === 0) {
      setError("Enter one of your backup codes.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        useBackupCode
          ? "/api/auth/two-factor/verify-backup-code"
          : "/api/auth/two-factor/verify-totp",
        {
          body: JSON.stringify({ code: trimmed }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );

      if (response.ok) {
        setIsDone(true);
        onSignedIn();
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        code?: string;
        message?: string;
      } | null;

      switch (payload?.code) {
        case "INVALID_CODE":
          setError(
            "That code is not right. Check the time on your phone and try the newest code.",
          );
          setCode("");
          break;
        case "INVALID_BACKUP_CODE":
          setError("That backup code is not right, or it was used before.");
          break;
        case "ACCOUNT_TEMPORARILY_LOCKED":
          setError(
            "Too many wrong codes. Two-step sign-in is locked for 15 minutes.",
          );
          break;
        case "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE":
          onRestart("Too many wrong codes. Log in again to get a new try.");
          return;
        case "INVALID_TWO_FACTOR_COOKIE":
          onRestart("That took too long. Log in again.");
          return;
        default:
          setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <IconTile tone="accent">
          {useBackupCode ? <KeyRound /> : <ShieldCheck />}
        </IconTile>
        <Button
          aria-label="Use a different account"
          disabled={isSubmitting}
          onClick={() => onRestart(null)}
          className="bg-(--surface) hover:bg-(--surface-strong)"
          size="icon-sm"
          title="Use a different account"
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
      </div>

      <AuthHeading
        className="-mt-2"
        description={
          useBackupCode
            ? "Each backup code works once. You saved them when you turned two-step sign-in on."
            : "Open your authenticator app and enter the 6\u2011digit code it shows."
        }
        title={useBackupCode ? "Enter a backup code" : "Enter your code"}
      />

      <AuthNotice>{error}</AuthNotice>

      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        ref={formRef}
      >
        {useBackupCode ? (
          <FormField disabled={isSubmitting} key="backup" label="Backup code">
            <Input
              autoCapitalize="off"
              autoComplete="one-time-code"
              autoFocus
              className="font-mono tracking-[0.08em]"
              name="second-step-code"
              onChange={(event) => {
                setCode(event.target.value);
                setError(null);
              }}
              spellCheck={false}
              value={code}
            />
          </FormField>
        ) : (
          <FormField disabled={isSubmitting} key="totp" label="6-digit code">
            <CodeInput
              autoFocus
              name="second-step-code"
              onComplete={() => {
                // Typing the last digit sends it; no need to reach for the
                // button. Deferred so state holds the full code first.
                requestAnimationFrame(() => formRef.current?.requestSubmit());
              }}
              onValueChange={(next) => {
                setCode(next);
                setError(null);
              }}
              value={code}
            />
          </FormField>
        )}
        <AuthFormFoot>
          <Button
            className="w-full"
            loading={isSubmitting || isDone}
            size="lg"
            type="submit"
          >
            Continue
          </Button>
        </AuthFormFoot>
      </form>

      <div className="-mt-2 flex justify-center">
        <button
          className={textActionClassName}
          disabled={isSubmitting}
          onClick={() => {
            setUseBackupCode((current) => !current);
            setCode("");
            setError(null);
          }}
          type="button"
        >
          {useBackupCode
            ? "Use a code from your app instead"
            : "Lost your phone? Use a backup code"}
        </button>
      </div>
    </div>
  );
}
