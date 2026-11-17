"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { cn } from "@/lib/cn";
import { useBranding } from "@/components/layout/branding-provider";
import { SessionsPanel } from "@/components/settings/sessions-panel";
import {
  CardNotice,
  GENERIC_ERROR_MESSAGE,
  Notice,
  Reveal,
  SaveBar,
  SettingRow,
  SettingRows,
  SettingsAnchor,
  SettingsGroup,
  SettingsSection,
} from "@/components/settings/settings-ui";
import { TwoFactorPanel } from "@/components/settings/two-factor-panel";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
  TrayTrigger,
} from "@/components/ui/tray";

// The person's own account: profile, password, two-step sign-in, devices
// and closing the account. Shown to everyone.

const CLOSURE_CONFIRMATION_PHRASE = "close my account";
const MIN_PASSWORD_LENGTH = 15;

type SettingsShellProps = {
  initialProfile?: ProfileValues;
  twoFactor?: { enabled: boolean; required: boolean };
};

type ProfileValues = {
  email: string;
  fullName: string;
};

type PasswordValues = {
  currentPassword: string;
  newPassword: string;
};

type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;
type PasswordErrors = Partial<Record<keyof PasswordValues, string>>;

type PendingAction = "password" | "profile" | "reset" | null;

type ApiErrorPayload = {
  error?:
    | string
    | {
        message?: string;
      };
  fieldErrors?: Partial<Record<string, string>>;
  message?: string;
} | null;

const defaultProfileValues: ProfileValues = {
  email: "",
  fullName: "",
};

const defaultPasswordValues: PasswordValues = {
  currentPassword: "",
  newPassword: "",
};

function trimProfileValues(values: ProfileValues): ProfileValues {
  return {
    email: values.email.trim(),
    fullName: values.fullName.trim(),
  };
}

function validateProfileValues(values: ProfileValues): ProfileErrors {
  const errors: ProfileErrors = {};

  if (values.fullName.length === 0) {
    errors.fullName = "Enter your full name";
  }

  if (values.email.length === 0 || !values.email.includes("@")) {
    errors.email = "Enter a valid email address";
  }

  return errors;
}

function validatePasswordValues(values: PasswordValues): PasswordErrors {
  const errors: PasswordErrors = {};

  if (values.currentPassword.length === 0) {
    errors.currentPassword = "Enter your current password";
  }

  if (values.newPassword.trim().length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = "Password must be at least 15 characters";
  }

  return errors;
}

async function readApiPayload(response: Response): Promise<ApiErrorPayload> {
  return (await response.json().catch(() => null)) as ApiErrorPayload;
}

function extractApiErrorMessage(payload: ApiErrorPayload): string {
  if (!payload) {
    return GENERIC_ERROR_MESSAGE;
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (
    payload.error &&
    typeof payload.error === "object" &&
    typeof payload.error.message === "string" &&
    payload.error.message.trim()
  ) {
    return payload.error.message;
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return GENERIC_ERROR_MESSAGE;
}

function isDuplicateEmailMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already in use")
  );
}

function isInvalidPasswordMessage(message: string) {
  return message.toLowerCase().includes("invalid password");
}

function isPasswordTooShortMessage(message: string) {
  return message.toLowerCase().includes("password too short");
}

function isCompromisedPasswordMessage(message: string) {
  return message.toLowerCase().includes("compromised");
}

function isNoOpEmailChangeMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("email is the same") ||
    normalizedMessage.includes("already verified")
  );
}

export function SettingsShell({
  initialProfile = defaultProfileValues,
  twoFactor = { enabled: false, required: false },
}: SettingsShellProps) {
  return (
    <SettingsGroup label="Account">
      <ProfileSection initialProfile={initialProfile} />
      <SettingsSection id="sign-in" title="Sign-in">
        <PasswordSection email={initialProfile.email} />
        <TwoFactorPanel
          enabled={twoFactor.enabled}
          required={twoFactor.required}
          variant="rows"
        />
        <SessionsPanel />
      </SettingsSection>
      <CloseAccountSection />
    </SettingsGroup>
  );
}

function ProfileSection({ initialProfile }: { initialProfile: ProfileValues }) {
  const [profileValues, setProfileValues] = useState(initialProfile);
  const [savedProfileValues, setSavedProfileValues] = useState(initialProfile);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [emailPending, setEmailPending] = useState<string | null>(null);

  const nameChanged = profileValues.fullName !== savedProfileValues.fullName;
  const emailChanged =
    profileValues.email.trim().toLowerCase() !==
    savedProfileValues.email.trim().toLowerCase();
  const changes = Number(nameChanged) + Number(emailChanged);

  function handleProfileChange(field: keyof ProfileValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setProfileValues((currentValues) => ({
        ...currentValues,
        [field]: nextValue,
      }));
      setProfileErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
      setError(null);
    };
  }

  function discard() {
    setProfileValues(savedProfileValues);
    setProfileErrors({});
    setError(null);
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const trimmedValues = trimProfileValues(profileValues);
    const nextErrors = validateProfileValues(trimmedValues);

    if (Object.keys(nextErrors).length > 0) {
      setProfileValues(trimmedValues);
      setProfileErrors(nextErrors);
      setError(null);
      return;
    }

    setProfileValues(trimmedValues);
    setProfileErrors({});
    setError(null);
    setPending(true);

    try {
      const willChangeName =
        trimmedValues.fullName !== savedProfileValues.fullName;
      const willChangeEmail =
        trimmedValues.email.trim().toLowerCase() !==
        savedProfileValues.email.trim().toLowerCase();
      let nextSavedProfile = savedProfileValues;

      if (willChangeName) {
        const response = await fetch("/api/account/profile", {
          body: JSON.stringify({
            email: savedProfileValues.email,
            fullName: trimmedValues.fullName,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "PATCH",
        });
        const payload = await readApiPayload(response);

        if (!response.ok) {
          const fieldErrors = payload?.fieldErrors ?? {};
          const errorMessage = extractApiErrorMessage(payload);

          setProfileErrors({
            email:
              typeof fieldErrors.email === "string"
                ? fieldErrors.email
                : isDuplicateEmailMessage(errorMessage)
                  ? "This email is already registered"
                  : undefined,
            fullName:
              typeof fieldErrors.fullName === "string"
                ? fieldErrors.fullName
                : undefined,
          });
          setError(
            typeof fieldErrors.email === "string" ||
              typeof fieldErrors.fullName === "string"
              ? "Please correct the highlighted fields."
              : errorMessage,
          );
          return;
        }

        nextSavedProfile = {
          email: savedProfileValues.email,
          fullName: trimmedValues.fullName,
        };
        setSavedProfileValues(nextSavedProfile);
      }

      if (willChangeEmail) {
        const response = await fetch("/api/auth/change-email", {
          body: JSON.stringify({
            callbackURL: `${window.location.origin}/settings`,
            newEmail: trimmedValues.email,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });
        const payload = await readApiPayload(response);

        if (!response.ok) {
          const errorMessage = extractApiErrorMessage(payload);

          setProfileErrors({
            email: isDuplicateEmailMessage(errorMessage)
              ? "This email is already registered"
              : isNoOpEmailChangeMessage(errorMessage)
                ? "Enter a different email address"
                : undefined,
            fullName: undefined,
          });
          setProfileValues({
            email: trimmedValues.email,
            fullName: nextSavedProfile.fullName,
          });
          setError(
            isDuplicateEmailMessage(errorMessage) ||
              isNoOpEmailChangeMessage(errorMessage)
              ? "Please correct the highlighted fields."
              : errorMessage,
          );
          return;
        }

        setProfileValues(nextSavedProfile);
        setProfileErrors({});
        setEmailPending(trimmedValues.email);
        toast("Check your inbox", {
          description:
            "If the email change can proceed, you'll receive the next steps by email.",
        });
        return;
      }

      setProfileValues(nextSavedProfile);
      setProfileErrors({});
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={handleProfileSubmit}>
      <SettingsSection
        description="How you appear to the people you send documents to."
        id="profile"
        title="Profile"
      >
        <Reveal show={error !== null}>
          <CardNotice>
            <Notice role="alert" tone="danger">
              {error}
            </Notice>
          </CardNotice>
        </Reveal>
        <SettingRows>
          <SettingRow
            description="Signers see it in their invitation and on the signing page."
            disabled={pending}
            error={profileErrors.fullName}
            label="Full name"
          >
            <Input
              autoComplete="name"
              name="fullName"
              onChange={handleProfileChange("fullName")}
              value={profileValues.fullName}
            />
          </SettingRow>
          <SettingRow
            description="A new address is confirmed by email before it changes."
            disabled={pending}
            error={profileErrors.email}
            label="Email"
          >
            <Input
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={handleProfileChange("email")}
              type="email"
              value={profileValues.email}
            />
          </SettingRow>
        </SettingRows>
        <Reveal show={emailPending !== null}>
          <CardNotice>
            <Notice role="status" tone="accent">
              We sent the next steps for{" "}
              <span className="font-medium text-(--fg)">{emailPending}</span> to
              your current inbox. Your email stays the same until you confirm
              both.
            </Notice>
          </CardNotice>
        </Reveal>
      </SettingsSection>
      <SaveBar
        changes={changes}
        dirty={changes > 0}
        onDiscard={discard}
        saveLabel="Save changes"
        savedMessage="Profile updated."
        saving={pending}
      />
    </form>
  );
}

/**
 * The password is one row; changing it happens in a tray, so the two
 * password fields are only on screen while someone is using them.
 */
function PasswordSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [passwordValues, setPasswordValues] = useState(defaultPasswordValues);
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const isBusy = pendingAction !== null;
  const newLength = passwordValues.newPassword.trim().length;

  function handlePasswordChange(field: keyof PasswordValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setPasswordValues((currentValues) => ({
        ...currentValues,
        [field]: nextValue,
      }));
      setPasswordErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
      setError(null);
    };
  }

  function changeOpen(next: boolean) {
    if (isBusy) {
      return;
    }

    setOpen(next);

    if (!next) {
      setPasswordValues(defaultPasswordValues);
      setPasswordErrors({});
      setError(null);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    const nextErrors = validatePasswordValues(passwordValues);

    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors);
      setError(null);
      return;
    }

    setPasswordErrors({});
    setError(null);
    setPendingAction("password");

    try {
      const response = await fetch("/api/auth/change-password", {
        body: JSON.stringify({
          ...passwordValues,
          revokeOtherSessions: true,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = await readApiPayload(response);

      if (!response.ok) {
        const errorMessage = extractApiErrorMessage(payload);

        setPasswordErrors({
          currentPassword: isInvalidPasswordMessage(errorMessage)
            ? "Current password is incorrect"
            : undefined,
          newPassword: isPasswordTooShortMessage(errorMessage)
            ? "Password must be at least 15 characters"
            : isCompromisedPasswordMessage(errorMessage)
              ? "Choose a password that hasn't appeared in a breach"
              : undefined,
        });
        setError(
          isInvalidPasswordMessage(errorMessage) ||
            isPasswordTooShortMessage(errorMessage) ||
            isCompromisedPasswordMessage(errorMessage)
            ? null
            : errorMessage,
        );
        return;
      }

      setPasswordValues(defaultPasswordValues);
      setPasswordErrors({});
      setOpen(false);
      toast.success("Password updated.", {
        description: "Your other devices were signed out.",
      });
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleResetPasswordLink() {
    if (isBusy) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail.includes("@")) {
      setError("Add a valid email address to your profile first.");
      return;
    }

    setError(null);
    setPendingAction("reset");

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        body: JSON.stringify({
          email: trimmedEmail,
          redirectTo: `${window.location.origin}/login`,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = await readApiPayload(response);

      if (!response.ok) {
        setError(extractApiErrorMessage(payload));
        return;
      }

      setOpen(false);
      toast.success("Password reset link sent.", {
        description: `Check ${trimmedEmail}.`,
      });
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <SettingsAnchor id="password">
      <SettingRow
        controlWidth="auto"
        description="Changing it signs you out on every other device."
        kind="group"
        label="Password"
      >
        <Tray dismissible={!isBusy} onOpenChange={changeOpen} open={open}>
          <TrayTrigger asChild>
            <Button className="max-md:w-full" variant="outline">
              Change password
            </Button>
          </TrayTrigger>
          <TrayContent showCloseButton={!isBusy} size="sm">
            <form
              className="flex min-h-0 flex-col"
              noValidate
              onSubmit={handlePasswordSubmit}
            >
              <TrayHeader>
                <TrayTitle>Change password</TrayTitle>
                <TrayDescription>
                  Your other devices are signed out when it changes.
                </TrayDescription>
              </TrayHeader>
              <TrayBody className="flex flex-col gap-4 pt-4">
                {error ? (
                  <Notice role="alert" tone="danger">
                    {error}
                  </Notice>
                ) : null}
                <FormField
                  disabled={isBusy}
                  error={passwordErrors.currentPassword}
                  label="Current password"
                >
                  <Input
                    autoComplete="current-password"
                    autoFocus
                    name="currentPassword"
                    onChange={handlePasswordChange("currentPassword")}
                    type="password"
                    value={passwordValues.currentPassword}
                  />
                </FormField>
                <FormField
                  disabled={isBusy}
                  error={passwordErrors.newPassword}
                  hint="At least 15 characters. A short sentence is easy to remember and hard to guess."
                  label="New password"
                >
                  <Input
                    autoComplete="new-password"
                    name="newPassword"
                    onChange={handlePasswordChange("newPassword")}
                    type="password"
                    value={passwordValues.newPassword}
                  />
                </FormField>
                <PasswordLengthMeter length={newLength} />
                <p className="text-[0.8125rem] leading-5 text-(--secondary)">
                  Forgot it?{" "}
                  <button
                    className="rounded-sm font-medium text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.35)] underline-offset-4 outline-none hover:decoration-(--accent-ink) focus-visible:shadow-(--focus-ring) disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => void handleResetPasswordLink()}
                    type="button"
                  >
                    {pendingAction === "reset"
                      ? "Sending a reset link…"
                      : "Email me a reset link"}
                  </button>
                </p>
              </TrayBody>
              <TrayFooter>
                <TrayClose asChild>
                  <Button disabled={isBusy} type="button" variant="outline">
                    Cancel
                  </Button>
                </TrayClose>
                <Button loading={pendingAction === "password"} type="submit">
                  Update password
                </Button>
              </TrayFooter>
            </form>
          </TrayContent>
        </Tray>
      </SettingRow>
    </SettingsAnchor>
  );
}

/** Fills toward the 15-character minimum; settles in success once met. */
function PasswordLengthMeter({ length }: { length: number }) {
  const ratio = Math.min(1, length / MIN_PASSWORD_LENGTH);
  const met = length >= MIN_PASSWORD_LENGTH;

  return (
    <div aria-hidden="true" className="-mt-1 flex items-center gap-2.5">
      <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-(--surface-strong)">
        <span
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full transition-[scale,background-color] duration-(--dur-move) ease-(--ease-out)"
          style={{
            backgroundColor: met ? "var(--success)" : "var(--accent)",
            scale: `${String(ratio)} 1`,
          }}
        />
      </span>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          met ? "text-(--success)" : "text-(--secondary)",
        )}
      >
        {Math.min(length, 99)}/{MIN_PASSWORD_LENGTH}
      </span>
    </div>
  );
}

function useClosureCopy(): string {
  const { hosted, productName } = useBranding();

  return hosted
    ? `Before closing your account, download any documents you want to keep. After closure, ${productName} keeps a 30-day export window and then deletes your stored documents, templates and envelope records. Signers keep the copies they were emailed.`
    : `Before closing your account, download any documents you want to keep. After 30 days your drafts, unfinished envelopes and templates are deleted. Finished documents and their audit trails stay with ${productName}: they move to an administrator, because they are the organization's records.`;
}

function CloseAccountSection() {
  const closureCopy = useClosureCopy();
  const [closureError, setClosureError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  async function requestClosure() {
    setClosureError(null);

    let response: Response;

    try {
      response = await fetch("/api/account/closure-request", {
        body: JSON.stringify({
          confirmation: CLOSURE_CONFIRMATION_PHRASE,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
    } catch {
      setClosureError(GENERIC_ERROR_MESSAGE);
      throw new Error("closure request failed");
    }

    if (!response.ok) {
      setClosureError(extractApiErrorMessage(await readApiPayload(response)));
      throw new Error("closure request failed");
    }

    setRequested(true);
    toast("Closure requested", {
      description: "Download any documents you want to keep within 30 days.",
    });
  }

  return (
    <SettingsSection hideTitle id="close-account" title="Close account">
      <SettingRow
        controlWidth="auto"
        description={
          requested
            ? "Requested. Download any documents you want to keep within 30 days."
            : "Removes your account and, after 30 days, your documents from this site."
        }
        kind="group"
        label="Close account"
      >
        <ConfirmTray
          confirmLabel="Request closure"
          confirmationText={CLOSURE_CONFIRMATION_PHRASE}
          description={closureCopy}
          error={closureError}
          onConfirm={requestClosure}
          onOpenChange={(open) => {
            if (!open) {
              setClosureError(null);
            }
          }}
          title="Request account closure?"
          trigger={
            <Button
              className="max-md:w-full"
              disabled={requested}
              variant="destructive-ghost"
            >
              Request account closure
            </Button>
          }
        />
      </SettingRow>
    </SettingsSection>
  );
}
