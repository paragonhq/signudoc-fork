"use client";

import {
  ArrowUpRightIcon,
  CircleAlertIcon,
  FileSignatureIcon,
  UsersIcon,
} from "@/components/ui/icons";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TextMorph } from "@/components/ui/text-morph";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import { cn } from "@/lib/cn";
import type { SigningPayload } from "@/lib/schemas/signing";

import type { FinishPhase } from "./action-bar";

/**
 * The last check before the signature counts: what is being signed, by
 * whom, and what it means. Part 11 envelopes ask for the account password
 * again and a confirmation of the signature's meaning; provider envelopes
 * hand over to the signing provider instead.
 */
export function FinishTray({
  completedCount,
  error,
  nextStep = null,
  isMeaningConfirmed,
  onConfirm,
  onMeaningConfirmedChange,
  onOpenChange,
  onReauthEmailChange,
  onReauthPasswordChange,
  open,
  phase,
  reauthEmail,
  reauthPassword,
  record,
}: {
  completedCount: number;
  error: string | null;
  /** What happens after this signature, in a sentence. */
  nextStep?: string | null;
  isMeaningConfirmed: boolean;
  onConfirm: () => void;
  onMeaningConfirmedChange: (value: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onReauthEmailChange: (value: string) => void;
  onReauthPasswordChange: (value: string) => void;
  open: boolean;
  phase: FinishPhase;
  reauthEmail: string;
  reauthPassword: string;
  record: SigningPayload;
}) {
  const part11 = record.part11 ?? null;
  const provider = record.providerSignature ?? null;
  const isBusy = phase !== "idle";
  const isReauthReady =
    part11 === null ||
    (isMeaningConfirmed &&
      reauthEmail.trim().length > 0 &&
      reauthPassword.length > 0);
  const confirmLabel = provider
    ? phase === "signing"
      ? "Preparing…"
      : `Continue to ${provider.providerName}`
    : phase === "signed"
      ? "Signed"
      : phase === "signing"
        ? "Signing…"
        : "Finish signing";

  return (
    <Tray dismissible={!isBusy} onOpenChange={onOpenChange} open={open}>
      <TrayContent showCloseButton={!isBusy} size="md">
        <TrayHeader icon={<FileSignatureIcon />}>
          <TrayTitle>Finish signing?</TrayTitle>
          <TrayDescription>
            You are signing &ldquo;{record.envelopeTitle}&rdquo; from{" "}
            {record.senderName}.
          </TrayDescription>
        </TrayHeader>

        <TrayBody className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-3 rounded-(--radius-well) bg-(--surface) px-4 py-3">
            <Avatar name={record.signer.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] leading-5 font-medium text-(--fg)">
                {record.signer.name}
              </p>
              <p className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
                {record.signer.email} · {completedCount}{" "}
                {completedCount === 1 ? "field" : "fields"} filled in
              </p>
            </div>
          </div>

          {provider ? (
            <div className="flex flex-col gap-3 text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
              <p>
                This document asks for{" "}
                {provider.level === "qualified"
                  ? "a qualified electronic signature"
                  : "an advanced electronic signature"}
                , made with a certificate in your own name.
              </p>
              <p>
                Next, {provider.providerName} asks you to confirm who you are
                and to approve the signature. When it is done, you come back
                here. By continuing, you confirm that your signature is intended
                to be binding for this document.
              </p>
            </div>
          ) : (
            <p className="text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
              By finishing, you confirm that your electronic signature is
              intended to be binding for this document.
            </p>
          )}

          {nextStep ? (
            <p className="flex items-start gap-2.5 text-sm leading-5 text-pretty text-(--secondary)">
              <UsersIcon
                aria-hidden="true"
                className="mt-px size-4 shrink-0"
                strokeWidth={1.75}
              />
              <span>{nextStep}</span>
            </p>
          ) : null}

          {part11 ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-(--radius-well) bg-(--accent-softer) px-4 py-3">
                <p className="text-[0.8125rem] leading-5 font-medium text-(--secondary-strong)">
                  Meaning of your signature
                </p>
                <p className="mt-0.5 text-[0.9375rem] font-medium text-(--fg)">
                  {part11.meaningLabel}: {part11.meaningStatement}
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-(--secondary)">
                <Checkbox
                  aria-label="I confirm the meaning of my signature"
                  checked={isMeaningConfirmed}
                  className="mt-1"
                  disabled={isBusy}
                  onCheckedChange={(checked) =>
                    onMeaningConfirmedChange(checked === true)
                  }
                />
                <span>
                  I confirm this meaning. My name, the date and time, and this
                  meaning will be printed with my signature.
                </span>
              </label>
              <p className="text-sm leading-6 text-(--secondary)">
                Enter your account&apos;s email address and password to sign.
              </p>
              <FormField label="Email address">
                <Input
                  autoComplete="username"
                  className="h-11"
                  disabled={isBusy}
                  inputMode="email"
                  name="reauth-email"
                  onChange={(event) => onReauthEmailChange(event.target.value)}
                  type="email"
                  value={reauthEmail}
                />
              </FormField>
              <FormField label="Password">
                <Input
                  autoComplete="current-password"
                  className="h-11"
                  disabled={isBusy}
                  name="reauth-password"
                  onChange={(event) =>
                    onReauthPasswordChange(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && isReauthReady) {
                      event.preventDefault();
                      onConfirm();
                    }
                  }}
                  type="password"
                  value={reauthPassword}
                />
              </FormField>
            </div>
          ) : null}

          {error ? (
            <p
              className="flex gap-2 rounded-(--radius-well) bg-(--danger-soft) px-4 py-3 text-[0.8125rem] leading-5 text-(--danger)"
              role="alert"
            >
              <CircleAlertIcon
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              <span>{error}</span>
            </p>
          ) : null}
        </TrayBody>

        <TrayFooter>
          <Button
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
            variant="ghost"
          >
            Back
          </Button>
          <Button
            aria-busy={isBusy || undefined}
            className={cn(
              "sm:min-w-40",
              phase === "signed" && "bg-(--success) hover:bg-(--success)",
            )}
            disabled={!isReauthReady}
            onClick={() => {
              if (!isBusy) {
                onConfirm();
              }
            }}
            size="lg"
          >
            <TextMorph>{confirmLabel}</TextMorph>
            {provider && phase === "idle" ? (
              <ArrowUpRightIcon aria-hidden="true" />
            ) : null}
          </Button>
        </TrayFooter>
      </TrayContent>
    </Tray>
  );
}
