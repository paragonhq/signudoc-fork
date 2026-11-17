"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import {
  CardNotice,
  GENERIC_ERROR_MESSAGE,
  Notice,
  Reveal,
  SaveBar,
  SettingRow,
  SettingsAnchor,
  SettingsSection,
} from "@/components/settings/settings-ui";
import { SwitchButton } from "@/components/settings/switch-button";
import { Select } from "@/components/ui/select";
import { StatusFlag } from "@/components/ui/status-flag";
import { toast } from "@/components/ui/toaster";
import {
  SESSION_IDLE_CHOICES,
  SESSION_MAX_HOURS_CHOICES,
} from "@/lib/session-choices";

// Sign-in security and session limits. Administrators only. The install's
// audit trail is its own section, under Compliance.

function describeMinutes(minutes: number): string {
  return minutes < 60
    ? `${String(minutes)} minutes`
    : minutes === 60
      ? "1 hour"
      : `${String(minutes / 60)} hours`;
}

function describeHours(hours: number): string {
  return hours % 24 === 0
    ? hours === 24
      ? "1 day"
      : `${String(hours / 24)} days`
    : `${String(hours)} hours`;
}

type Limits = {
  sessionIdleMinutes: number | null;
  sessionMaxHours: number | null;
};

export function SecurityPanel({
  initialRequireTwoFactor,
  initialSessionIdleMinutes,
  initialSessionMaxHours,
  onChanged,
}: {
  initialRequireTwoFactor: boolean;
  initialSessionIdleMinutes: number | null;
  initialSessionMaxHours: number | null;
  /** Something was saved, so the audit trail has a new event. */
  onChanged?: () => void;
}) {
  // One card: the two-step requirement (saved the moment it is flipped)
  // and the session limits (saved with the bar).
  return (
    <SessionLimitsSection
      initialLimits={{
        sessionIdleMinutes: initialSessionIdleMinutes,
        sessionMaxHours: initialSessionMaxHours,
      }}
      onChanged={onChanged}
    >
      <TwoFactorRequirementRow
        initialRequireTwoFactor={initialRequireTwoFactor}
        onChanged={onChanged}
      />
    </SessionLimitsSection>
  );
}

function TwoFactorRequirementRow({
  initialRequireTwoFactor,
  onChanged,
}: {
  initialRequireTwoFactor: boolean;
  onChanged?: () => void;
}) {
  const [requireTwoFactor, setRequireTwoFactor] = useState(
    initialRequireTwoFactor,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function changeRequirement(next: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/security", {
        body: JSON.stringify({ requireTwoFactor: next }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        requireTwoFactor?: boolean;
      } | null;

      if (!response.ok || typeof payload?.requireTwoFactor !== "boolean") {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      setRequireTwoFactor(payload.requireTwoFactor);
      toast.success(
        payload.requireTwoFactor
          ? "Two-step sign-in is now required"
          : "Two-step sign-in is no longer required",
        {
          description: payload.requireTwoFactor
            ? "Anyone without it is asked to set it up the next time they open the app."
            : "People who use it keep it on.",
        },
      );
      onChanged?.();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Reveal show={error !== null}>
        <CardNotice>
          <Notice role="alert" tone="danger">
            {error}
          </Notice>
        </CardNotice>
      </Reveal>
      <SettingRow
        controlWidth="auto"
        layout="inline"
        description="A code from an authenticator app after the password. Anyone without it sets it up the next time they open the app."
        kind="group"
        label={
          <span className="flex flex-wrap items-center gap-2">
            Two-step sign-in
            {requireTwoFactor ? (
              <StatusFlag glyph="check" size="sm" tone="success">
                Required for everyone
              </StatusFlag>
            ) : (
              <StatusFlag glyph="ring" size="sm" tone="neutral">
                Optional
              </StatusFlag>
            )}
          </span>
        }
      >
        <SwitchButton
          loading={isSaving}
          on={requireTwoFactor}
          onClick={() => void changeRequirement(!requireTwoFactor)}
        >
          {requireTwoFactor
            ? "Stop requiring two-step sign-in"
            : "Require two-step sign-in"}
        </SwitchButton>
      </SettingRow>
    </>
  );
}

function SessionLimitsSection({
  children,
  initialLimits,
  onChanged,
}: {
  children: ReactNode;
  initialLimits: Limits;
  onChanged?: () => void;
}) {
  const [savedLimits, setSavedLimits] = useState(initialLimits);
  const [limits, setLimits] = useState(initialLimits);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const changes =
    Number(limits.sessionIdleMinutes !== savedLimits.sessionIdleMinutes) +
    Number(limits.sessionMaxHours !== savedLimits.sessionMaxHours);

  async function saveLimits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving || changes === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/security", {
        body: JSON.stringify(limits),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        sessionIdleMinutes?: number | null;
        sessionMaxHours?: number | null;
      } | null;

      if (!response.ok || payload?.sessionIdleMinutes === undefined) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      const saved = {
        sessionIdleMinutes: payload.sessionIdleMinutes,
        sessionMaxHours: payload.sessionMaxHours ?? null,
      };

      setSavedLimits(saved);
      setLimits(saved);
      onChanged?.();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={saveLimits}>
      <SettingsSection
        description="How people sign in, and how long they stay signed in."
        footer="Ten wrong passwords for one email address pause sign-in for it for 15 minutes. Session limits apply to everyone from their next click."
        id="security"
        title="Sign-in security"
      >
        {children}
        <SettingsAnchor id="session-limits">
          <Reveal show={error !== null}>
            <CardNotice>
              <Notice role="alert" tone="danger">
                {error}
              </Notice>
            </CardNotice>
          </Reveal>
          <SettingRow
            controlWidth="sm"
            description="A browser nobody has used for this long is signed out."
            disabled={isSaving}
            label="Sign out after no use for"
          >
            <Select
              onChange={(event) => {
                setError(null);
                setLimits((current) => ({
                  ...current,
                  sessionIdleMinutes:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                }));
              }}
              value={limits.sessionIdleMinutes ?? ""}
            >
              <option value="">Never</option>
              {SESSION_IDLE_CHOICES.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {describeMinutes(minutes)}
                </option>
              ))}
            </Select>
          </SettingRow>
          <SettingRow
            controlWidth="sm"
            description="However busy, everyone signs in again after this long."
            disabled={isSaving}
            label="Sign out at the latest after"
          >
            <Select
              onChange={(event) => {
                setError(null);
                setLimits((current) => ({
                  ...current,
                  sessionMaxHours:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                }));
              }}
              value={limits.sessionMaxHours ?? ""}
            >
              <option value="">7 days (the default)</option>
              {SESSION_MAX_HOURS_CHOICES.filter((hours) => hours !== 168).map(
                (hours) => (
                  <option key={hours} value={hours}>
                    {describeHours(hours)}
                  </option>
                ),
              )}
            </Select>
          </SettingRow>
        </SettingsAnchor>
      </SettingsSection>
      <SaveBar
        changes={changes}
        dirty={changes > 0}
        onDiscard={() => {
          setLimits(savedLimits);
          setError(null);
        }}
        saveLabel="Save session limits"
        savedMessage="Session limits saved."
        saving={isSaving}
      />
    </form>
  );
}
