"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Download } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { encode } from "uqr";

import { useBranding } from "@/components/layout/branding-provider";
import {
  GENERIC_ERROR_MESSAGE,
  SettingRow,
  SettingRows,
  SettingsAnchor,
  SettingsSection,
} from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SPRING_SNAPPY } from "@/components/ui/motion-tokens";
import { StatusFlag } from "@/components/ui/status-flag";
import { toast } from "@/components/ui/toaster";
import {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TraySteps,
  TrayTitle,
} from "@/components/ui/tray";

// Two-step sign-in for the signed-in person: set it up with an
// authenticator app, make new backup codes, or turn it off. The work is
// done by Better Auth's two-factor endpoints under /api/auth/two-factor.
//
// The flow runs in a tray: confirm the password, then scan, save the
// backup codes and enter a code, three numbered steps on one screen (so
// nothing has to be paged through to finish).

type Purpose = "disable" | "enable" | "codes";

type Step =
  | { kind: "idle" }
  | { kind: "confirm-password"; purpose: Purpose }
  | { backupCodes: string[]; kind: "scan"; totpURI: string }
  | { backupCodes: string[]; kind: "new-codes" };

type ApiPayload = {
  backupCodes?: string[];
  code?: string;
  message?: string;
  totpURI?: string;
} | null;

async function postAuth(path: string, body: unknown) {
  const response = await fetch(`/api/auth${path}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as ApiPayload;

  return { ok: response.ok, payload };
}

function describeAuthError(payload: ApiPayload): string {
  switch (payload?.code) {
    case "INVALID_PASSWORD":
      return "That password is not right.";
    case "INVALID_CODE":
      return "That code is not right. Check the time on your phone and try the newest code.";
    case "TWO_FACTOR_REQUIRED_BY_ADMINISTRATOR":
      return payload.message ?? GENERIC_ERROR_MESSAGE;
    default:
      return payload?.message ?? GENERIC_ERROR_MESSAGE;
  }
}

/** The key inside the otpauth:// link, for typing in by hand. */
function readSecret(totpURI: string): string {
  try {
    return new URL(totpURI).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

const STEP_INDEX: Record<Step["kind"], number> = {
  "confirm-password": 0,
  idle: 0,
  "new-codes": 1,
  scan: 1,
};

const PASSWORD_COPY: Record<
  Purpose,
  { description: string; submit: string; title: string }
> = {
  codes: {
    description:
      "Confirm it's you. The new codes replace the old ones, which stop working.",
    submit: "Make new codes",
    title: "Make new backup codes",
  },
  disable: {
    description:
      "Confirm it's you. Without the second step, your password alone signs you in.",
    submit: "Turn off",
    title: "Turn off two-step sign-in",
  },
  enable: {
    description:
      "Confirm it's you first. Then scan a code with your authenticator app.",
    submit: "Continue",
    title: "Set up two-step sign-in",
  },
};

function QrCode({ value }: { value: string }) {
  const path = useMemo(() => {
    const { data, size } = encode(value, { border: 2, ecc: "M" });
    const parts: string[] = [];

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (data[y]?.[x]) {
          parts.push(`M${String(x)} ${String(y)}h1v1h-1z`);
        }
      }
    }

    return { d: parts.join(""), size };
  }, [value]);

  return (
    <svg
      aria-label="QR code for your authenticator app"
      className="size-40 shrink-0 rounded-(--radius-well) bg-(--paper) p-1.5 shadow-(--ring-soft) sm:size-44"
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${String(path.size)} ${String(path.size)}`}
    >
      <rect fill="var(--paper)" height={path.size} width={path.size} />
      <path d={path.d} fill="var(--brand-carbon)" />
    </svg>
  );
}

function BackupCodes({
  codes,
  productName,
}: {
  codes: string[];
  productName: string;
}) {
  const download = useMemo(() => {
    const text = [
      `${productName} backup codes`,
      "",
      "Each code works once, in place of a code from your authenticator app.",
      "",
      ...codes,
      "",
    ].join("\n");

    return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  }, [codes, productName]);

  return (
    <div className="flex flex-col gap-2.5">
      <ul
        aria-label="Backup codes"
        className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-(--radius-well) bg-(--surface) px-4 py-3 font-mono text-[0.8125rem] tracking-[0.04em] text-(--fg) tabular-nums sm:grid-cols-3"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <CopyButton
          aria-label="Copy backup codes"
          size="sm"
          toastMessage="Backup codes copied"
          value={codes.join("\n")}
          variant="outline"
        >
          Copy codes
        </CopyButton>
        <Button asChild size="sm" variant="outline">
          <a download="backup-codes.txt" href={download}>
            <Download aria-hidden="true" />
            Download codes
          </a>
        </Button>
      </div>
    </div>
  );
}

/** A numbered step inside the setup tray. */
function SetupStep({
  children,
  index,
  title,
}: {
  children: React.ReactNode;
  index: number;
  title: string;
}) {
  return (
    <li className="relative flex gap-3.5 pb-6 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute top-8 bottom-1.5 left-3 w-px bg-(--divider) [li:last-child>&]:hidden"
      />
      <span
        aria-hidden="true"
        className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-(--accent-softer) text-xs font-semibold text-(--accent-ink) tabular-nums"
      >
        {index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
        <p className="text-sm font-medium text-(--fg)">{title}</p>
        {children}
      </div>
    </li>
  );
}

export function TwoFactorPanel({
  enabled: initialEnabled,
  required,
  variant = "section",
}: {
  enabled: boolean;
  required: boolean;
  /**
   * `section` (default): its own titled card, as on the required-setup
   * page. `rows`: just its rows, for a card it shares in Settings.
   */
  variant?: "section" | "rows";
}) {
  const { productName } = useBranding();
  const router = useRouter();
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [justEnabled, setJustEnabled] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  function start(purpose: Purpose) {
    setPassword("");
    setCode("");
    setError(null);
    setStep({ kind: "confirm-password", purpose });
  }

  function close() {
    if (isBusy) {
      return;
    }

    setPassword("");
    setCode("");
    setError(null);
    setStep({ kind: "idle" });
  }

  /** The session was replaced: bring the rest of the page up to date. */
  function refreshAfterChange() {
    if (pathname?.startsWith("/settings")) {
      router.refresh();
    } else {
      // The required-setup page has nothing more to offer once it is done.
      router.replace("/dashboard");
    }
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy || step.kind !== "confirm-password") {
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      if (step.purpose === "enable") {
        const { ok, payload } = await postAuth("/two-factor/enable", {
          issuer: productName,
          password,
        });

        if (!ok || !payload?.totpURI || !payload.backupCodes) {
          setError(describeAuthError(payload));
          return;
        }

        setPassword("");
        setCode("");
        setStep({
          backupCodes: payload.backupCodes,
          kind: "scan",
          totpURI: payload.totpURI,
        });
        return;
      }

      if (step.purpose === "codes") {
        const { ok, payload } = await postAuth(
          "/two-factor/generate-backup-codes",
          { password },
        );

        if (!ok || !payload?.backupCodes) {
          setError(describeAuthError(payload));
          return;
        }

        setPassword("");
        setStep({ backupCodes: payload.backupCodes, kind: "new-codes" });
        return;
      }

      const { ok, payload } = await postAuth("/two-factor/disable", {
        password,
      });

      if (!ok) {
        setError(describeAuthError(payload));
        return;
      }

      setPassword("");
      setStep({ kind: "idle" });
      setEnabled(false);
      setJustEnabled(false);
      toast("Two-step sign-in is off", {
        description: "Your password alone now signs you in.",
      });
      refreshAfterChange();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy || step.kind !== "scan") {
      return;
    }

    const trimmed = code.replace(/\s+/g, "");

    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code your app shows.");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const { ok, payload } = await postAuth("/two-factor/verify-totp", {
        code: trimmed,
      });

      if (!ok) {
        setError(describeAuthError(payload));
        return;
      }

      setCode("");
      setStep({ kind: "idle" });
      setEnabled(true);
      setJustEnabled(true);
      toast.success("Two-step sign-in is on", {
        description: "Next time you sign in, have your phone ready.",
      });
      refreshAfterChange();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsBusy(false);
    }
  }

  const open = step.kind !== "idle";
  // What the tray shows: the current step, or while it closes, the last
  // one, so its content does not vanish mid-exit.
  const [shown, setShown] = useState<Step>(step);

  if (open && step !== shown) {
    setShown(step);
  }

  const inline = variant === "rows";
  const state = <TwoFactorState enabled={enabled} justEnabled={justEnabled} />;
  const mainLabel = inline ? (
    <span className="flex flex-wrap items-center gap-2">
      Two-step sign-in
      {state}
    </span>
  ) : (
    "Authenticator app"
  );

  const rows = (
    <>
      {enabled ? (
        <>
          <SettingRow
            controlWidth="auto"
            description={
              required
                ? "Your authenticator app gives the code. Your organization requires it, so it stays on."
                : "Your authenticator app gives the code."
            }
            kind="group"
            label={mainLabel}
          >
            {required ? null : (
              <Button
                className="max-md:w-full"
                onClick={() => start("disable")}
                variant="destructive-ghost"
              >
                Turn off two-step sign-in
              </Button>
            )}
          </SettingRow>
          <SettingRow
            controlWidth="auto"
            description="Each works once if you lose your phone. New ones replace the old."
            kind="group"
            label="Backup codes"
          >
            <Button
              className="max-md:w-full"
              onClick={() => start("codes")}
              variant="outline"
            >
              Make new backup codes
            </Button>
          </SettingRow>
        </>
      ) : (
        <SettingRow
          controlWidth="auto"
          description={
            required
              ? "Your organization requires it. It takes about a minute with an authenticator app such as 1Password or Google Authenticator."
              : inline
                ? "A code from an authenticator app on your phone after your password, so a stolen password is not enough."
                : "About a minute with an authenticator app such as 1Password, Google Authenticator or Microsoft Authenticator."
          }
          kind="group"
          label={mainLabel}
        >
          <Button
            className="max-md:w-full"
            onClick={() => start("enable")}
            variant={inline ? "secondary" : "default"}
          >
            Set up two-step sign-in
          </Button>
        </SettingRow>
      )}
    </>
  );

  const tray = (
    <Tray
      dismissible={!isBusy}
      handleOnly={shown.kind === "scan"}
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
      open={open}
    >
      <TrayContent showCloseButton={!isBusy} size="md">
        <TraySteps step={STEP_INDEX[shown.kind]}>
          {shown.kind === "confirm-password" ? (
            <form
              className="flex min-h-0 flex-col"
              noValidate
              onSubmit={handlePassword}
            >
              <TrayHeader>
                <TrayTitle>{PASSWORD_COPY[shown.purpose].title}</TrayTitle>
                <TrayDescription>
                  {PASSWORD_COPY[shown.purpose].description}
                </TrayDescription>
              </TrayHeader>
              <TrayBody className="flex flex-col gap-3 pt-4">
                <FormField
                  disabled={isBusy}
                  error={error ?? undefined}
                  label="Your password"
                >
                  <Input
                    autoComplete="current-password"
                    autoFocus
                    name="two-factor-password"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError(null);
                    }}
                    type="password"
                    value={password}
                  />
                </FormField>
              </TrayBody>
              <TrayFooter>
                <TrayClose asChild>
                  <Button disabled={isBusy} type="button" variant="outline">
                    Cancel
                  </Button>
                </TrayClose>
                <Button
                  loading={isBusy}
                  type="submit"
                  variant={
                    shown.purpose === "disable" ? "destructive" : "default"
                  }
                >
                  {PASSWORD_COPY[shown.purpose].submit}
                </Button>
              </TrayFooter>
            </form>
          ) : null}

          {shown.kind === "scan" ? (
            <form
              className="flex min-h-0 flex-col"
              noValidate
              onSubmit={handleCode}
            >
              <TrayHeader>
                <TrayTitle>Connect your authenticator app</TrayTitle>
                <TrayDescription>
                  Three steps. Your codes are shown once, so save them before
                  you finish.
                </TrayDescription>
              </TrayHeader>
              <TrayBody className="pt-5">
                <ol className="flex flex-col">
                  <SetupStep index={1} title="Scan this code with your app">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <QrCode value={shown.totpURI} />
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <p className="text-[0.8125rem] leading-5 text-(--secondary)">
                          Or type in this key:
                        </p>
                        <div className="flex items-center gap-1">
                          <p
                            className="font-mono text-[0.8125rem] tracking-[0.04em] break-all text-(--fg)"
                            data-testid="totp-secret"
                          >
                            {groupSecret(readSecret(shown.totpURI))}
                          </p>
                          <CopyButton
                            aria-label="Copy key"
                            size="icon-sm"
                            value={readSecret(shown.totpURI)}
                          />
                        </div>
                      </div>
                    </div>
                  </SetupStep>
                  <SetupStep index={2} title="Save your backup codes">
                    <p className="text-[0.8125rem] leading-5 text-(--secondary)">
                      Keep them somewhere safe, such as your password manager.
                      Each one works once, in place of a code from your app, if
                      you lose your phone. You will not see them again.
                    </p>
                    <BackupCodes
                      codes={shown.backupCodes}
                      productName={productName}
                    />
                  </SetupStep>
                  <SetupStep index={3} title="Enter the code your app shows">
                    <FormField
                      className="max-w-[12rem]"
                      disabled={isBusy}
                      error={error ?? undefined}
                      label="6-digit code"
                    >
                      <Input
                        autoComplete="one-time-code"
                        className="font-mono tracking-[0.2em] tabular-nums"
                        inputMode="numeric"
                        maxLength={7}
                        name="two-factor-setup-code"
                        onChange={(event) => {
                          setCode(event.target.value);
                          setError(null);
                        }}
                        value={code}
                      />
                    </FormField>
                  </SetupStep>
                </ol>
              </TrayBody>
              <TrayFooter divided>
                <TrayClose asChild>
                  <Button disabled={isBusy} type="button" variant="outline">
                    Cancel
                  </Button>
                </TrayClose>
                <Button loading={isBusy} type="submit">
                  Turn on two-step sign-in
                </Button>
              </TrayFooter>
            </form>
          ) : null}

          {shown.kind === "new-codes" ? (
            <div className="flex min-h-0 flex-col">
              <TrayHeader>
                <TrayTitle>Your new backup codes</TrayTitle>
                <TrayDescription>
                  The old ones no longer work. Save these now: you will not see
                  them again.
                </TrayDescription>
              </TrayHeader>
              <TrayBody className="pt-4">
                <BackupCodes
                  codes={shown.backupCodes}
                  productName={productName}
                />
              </TrayBody>
              <TrayFooter>
                <TrayClose asChild>
                  <Button type="button">Done</Button>
                </TrayClose>
              </TrayFooter>
            </div>
          ) : null}
        </TraySteps>
      </TrayContent>
    </Tray>
  );

  if (inline) {
    return (
      <SettingsAnchor id="two-step-sign-in">
        {rows}
        {tray}
      </SettingsAnchor>
    );
  }

  return (
    <SettingsSection
      description="A code from your phone after your password, so a stolen password is not enough."
      id="two-step-sign-in"
      status={state}
      title="Two-step sign-in"
    >
      <SettingRows>{rows}</SettingRows>
      {tray}
    </SettingsSection>
  );
}

/**
 * On or Off, as a soft pill. The moment it turns on (rare, and the end of
 * a setup) the pill settles in with a small spring: the one bit of delight
 * this section has.
 */
function TwoFactorState({
  enabled,
  justEnabled,
}: {
  enabled: boolean;
  justEnabled: boolean;
}) {
  const reduceMotion = useReducedMotion();

  if (!enabled) {
    return (
      <StatusFlag glyph="ring" size="sm" tone="neutral">
        Off
      </StatusFlag>
    );
  }

  return (
    <motion.span
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex"
      initial={
        justEnabled && !reduceMotion ? { opacity: 0, scale: 0.6 } : false
      }
      transition={SPRING_SNAPPY}
    >
      <StatusFlag glyph="check" size="sm" tone="success">
        On
      </StatusFlag>
    </motion.span>
  );
}
