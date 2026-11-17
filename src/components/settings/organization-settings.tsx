"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { ExternalLink } from "@/components/ui/icons";

import { AuditTrailPanel } from "@/components/settings/audit-trail-panel";
import { BrandingPanel } from "@/components/settings/branding-panel";
import { EmailSetupPanel } from "@/components/settings/email-setup";
import { Part11Panel } from "@/components/settings/part11-panel";
import { PeoplePanel } from "@/components/settings/people-panel";
import { SecurityPanel } from "@/components/settings/security-panel";
import {
  CardNotice,
  GENERIC_ERROR_MESSAGE,
  Notice,
  Reveal,
  SaveBar,
  SettingRow,
  SettingRows,
  SettingsGroup,
  SettingsSection,
} from "@/components/settings/settings-ui";
import { SignerDataPanel } from "@/components/settings/signer-data-panel";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import type {
  OrganizationSettingsField,
  OrganizationSettingsView,
} from "@/lib/organization-settings";
import type { SignupMode } from "@/lib/signup-policy";

// The administrator's part of Settings: what the install is called, who can
// sign up, its look, where email comes from and whether it works yet, the
// legal links and how long records are kept (one form, one save bar); then
// people and access, and compliance.

type OrganizationSettingsProps = {
  initialSettings: OrganizationSettingsView;
};

type FormErrors = Partial<Record<OrganizationSettingsField, string>>;

type SettingsResponse = {
  error?: string;
  fieldErrors?: FormErrors;
  settings?: OrganizationSettingsView;
} | null;

/** The fields the save bar sends; the rest are saved on their own. */
const FORM_FIELDS = [
  "allowedEmailDomains",
  "brandColor",
  "organizationName",
  "privacyUrl",
  "retentionDays",
  "senderAddress",
  "signupMode",
  "supportAddress",
  "termsUrl",
] as const;

const signupModeOptions: Array<{
  description: string;
  label: string;
  value: SignupMode;
}> = [
  {
    description: "Anyone who finds this site can create an account.",
    label: "Anyone",
    value: "open",
  },
  {
    description:
      "Only people with an email address at one of your domains can create an account.",
    label: "My organization",
    value: "domains",
  },
  {
    description: "Nobody new can create an account.",
    label: "Nobody",
    value: "closed",
  },
];

export function OrganizationSettings({
  initialSettings,
}: OrganizationSettingsProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialSettings);
  const [saved, setSaved] = useState(initialSettings);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Bumped after a save, so the email panel looks again: a new sender
  // address means a different domain to check.
  const [emailRevision, setEmailRevision] = useState(0);
  // Bumped after a security change, so the audit trail shows it.
  const [auditRevision, setAuditRevision] = useState(0);

  const changedFields = FORM_FIELDS.filter(
    (field) => values[field] !== saved[field],
  );
  const hosted = values.hosted;

  function handleChange(field: OrganizationSettingsField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setValues((currentValues) => ({ ...currentValues, [field]: nextValue }));
      setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
      setFormError(null);
    };
  }

  function handleBrandColorChange(brandColor: string) {
    setValues((currentValues) => ({ ...currentValues, brandColor }));
    setErrors((currentErrors) => ({ ...currentErrors, brandColor: undefined }));
    setFormError(null);
  }

  function handleSignupModeChange(signupMode: SignupMode) {
    setValues((currentValues) => ({ ...currentValues, signupMode }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      allowedEmailDomains: undefined,
      signupMode: undefined,
    }));
    setFormError(null);
  }

  function discard() {
    setValues((currentValues) => {
      const restored = { ...currentValues };

      for (const field of FORM_FIELDS) {
        Object.assign(restored, { [field]: saved[field] });
      }

      return restored;
    });
    setErrors({});
    setFormError(null);
  }

  /** Saved on their own (logo, Part 11): keep both copies in step. */
  function applySaved(patch: Partial<OrganizationSettingsView>) {
    setValues((currentValues) => ({ ...currentValues, ...patch }));
    setSaved((currentSaved) => ({ ...currentSaved, ...patch }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        body: JSON.stringify({
          allowedEmailDomains: values.allowedEmailDomains,
          brandColor: values.brandColor,
          organizationName: values.organizationName,
          privacyUrl: values.privacyUrl,
          retentionDays: values.retentionDays,
          senderAddress: values.senderAddress,
          signupMode: values.signupMode,
          supportAddress: values.supportAddress,
          termsUrl: values.termsUrl,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as SettingsResponse;

      if (!response.ok || !payload?.settings) {
        setErrors(payload?.fieldErrors ?? {});
        setFormError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      setValues(payload.settings);
      setSaved(payload.settings);
      setEmailRevision((revision) => revision + 1);
      setAuditRevision((revision) => revision + 1);
      // The header and the accent color come from the layout around this
      // page, which only looks them up again when asked to.
      router.refresh();
    } catch {
      setFormError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  const signupChoice =
    signupModeOptions.find((option) => option.value === values.signupMode) ??
    signupModeOptions[0];

  return (
    <>
      <form noValidate onSubmit={handleSubmit}>
        <SettingsGroup label="Organization">
          <SettingsSection
            description="These apply to everyone who uses this site."
            id="organization"
            title="General"
          >
            <Reveal show={formError !== null}>
              <CardNotice>
                <Notice role="alert" tone="danger">
                  {formError}
                </Notice>
              </CardNotice>
            </Reveal>
            <SettingRows>
              <SettingRow
                description="Shown in the header and in every email this site sends."
                disabled={isSaving}
                error={errors.organizationName}
                label="Organization name"
              >
                <Input
                  autoComplete="organization"
                  name="organization-name"
                  onChange={handleChange("organizationName")}
                  value={values.organizationName}
                />
              </SettingRow>
              <SettingRow
                controlWidth="lg"
                description={`${signupChoice.description} People you send documents to never need an account.`}
                error={errors.signupMode}
                kind="group"
                label="Who can create an account"
              >
                <Segmented
                  aria-label="Who can create an account"
                  fill
                  items={signupModeOptions.map((option) => ({
                    disabled: isSaving,
                    label: option.label,
                    value: option.value,
                  }))}
                  name="signup-mode"
                  onValueChange={handleSignupModeChange}
                  value={values.signupMode}
                />
              </SettingRow>
            </SettingRows>
            <Reveal
              show={
                values.signupMode === "domains" ||
                Boolean(errors.allowedEmailDomains)
              }
            >
              <SettingRow
                description="Separate several domains with commas."
                disabled={isSaving}
                error={errors.allowedEmailDomains}
                label="Email domains"
              >
                <Input
                  autoCapitalize="none"
                  name="allowed-email-domains"
                  onChange={handleChange("allowedEmailDomains")}
                  placeholder="yourcompany.com"
                  spellCheck={false}
                  value={values.allowedEmailDomains}
                />
              </SettingRow>
            </Reveal>
          </SettingsSection>

          {/* The hosted service runs under its own name, mark and color. */}
          {!hosted ? (
            <BrandingPanel
              brandColor={values.brandColor}
              brandColorError={errors.brandColor}
              disabled={isSaving}
              logoUrl={values.logoUrl}
              onBrandColorChange={handleBrandColorChange}
              onLogoChange={(logoUrl) => applySaved({ logoUrl })}
              organizationName={saved.organizationName}
            />
          ) : null}

          <SettingsSection
            description="Where emails come from, where replies go, and whether email works yet."
            id="email"
            title="Email"
          >
            <EmailSetupPanel key={emailRevision} />
            <SettingRows>
              <SettingRow
                description={
                  values.senderAddressFromEnv
                    ? "Set by the RESEND_FROM_EMAIL environment variable."
                    : "An address at a domain you own, such as sign@yourcompany.com."
                }
                disabled={isSaving || values.senderAddressFromEnv}
                error={errors.senderAddress}
                label="Send email from"
              >
                <Input
                  autoCapitalize="none"
                  inputMode="email"
                  name="sender-address"
                  onChange={handleChange("senderAddress")}
                  placeholder="sign@yourcompany.com"
                  readOnly={values.senderAddressFromEnv}
                  spellCheck={false}
                  type="email"
                  value={values.senderAddress}
                />
              </SettingRow>
              <SettingRow
                description={
                  values.supportAddressFromEnv
                    ? "Set by the SUPPORT_EMAIL environment variable."
                    : "Where replies and questions from signers go."
                }
                disabled={isSaving || values.supportAddressFromEnv}
                error={errors.supportAddress}
                label="Support address"
              >
                <Input
                  autoCapitalize="none"
                  inputMode="email"
                  name="support-address"
                  onChange={handleChange("supportAddress")}
                  placeholder="help@yourcompany.com"
                  readOnly={values.supportAddressFromEnv}
                  spellCheck={false}
                  type="email"
                  value={values.supportAddress}
                />
              </SettingRow>
            </SettingRows>
          </SettingsSection>

          {!hosted ? (
            <SettingsSection
              description="Pages on your own website, linked in the footer of this site and its emails. Both are optional."
              id="legal-links"
              title="Legal links"
            >
              <SettingRows>
                <SettingRow
                  disabled={isSaving}
                  error={errors.termsUrl}
                  label="Terms link"
                >
                  <Input
                    autoCapitalize="none"
                    inputMode="url"
                    name="terms-url"
                    onChange={handleChange("termsUrl")}
                    placeholder="https://yourcompany.com/terms"
                    spellCheck={false}
                    value={values.termsUrl}
                  />
                </SettingRow>
                <SettingRow
                  description={
                    <>
                      Without one, signers see{" "}
                      <a
                        className="inline-flex items-center gap-1 font-medium text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.35)] underline-offset-4 hover:decoration-(--accent-ink)"
                        href="/signer-privacy"
                        rel="noreferrer"
                        target="_blank"
                      >
                        a notice built from these settings
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                      .
                    </>
                  }
                  disabled={isSaving}
                  error={errors.privacyUrl}
                  label="Privacy policy link"
                >
                  <Input
                    autoCapitalize="none"
                    inputMode="url"
                    name="privacy-url"
                    onChange={handleChange("privacyUrl")}
                    placeholder="https://yourcompany.com/privacy"
                    spellCheck={false}
                    value={values.privacyUrl}
                  />
                </SettingRow>
              </SettingRows>
            </SettingsSection>
          ) : null}

          <SettingsSection
            description="How long finished documents are kept."
            footer="Many records must be kept for years. Check what applies to you before setting this."
            id="retention"
            title="Retention"
          >
            <SettingRow
              controlWidth="sm"
              description={
                values.part11Mode
                  ? "Off while Part 11 mode is on: those records are only deleted by hand."
                  : "After this many days, a finished envelope is deleted with its audit trail. Its sender hears 30 days before. Leave empty to keep them."
              }
              disabled={isSaving || values.part11Mode}
              error={errors.retentionDays}
              label="Days to keep"
            >
              <div className="relative">
                <Input
                  className="pr-14 tabular-nums"
                  inputMode="numeric"
                  name="retention-days"
                  onChange={handleChange("retentionDays")}
                  placeholder="Forever"
                  value={values.retentionDays}
                />
                {values.retentionDays.trim() ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-(--secondary)"
                  >
                    days
                  </span>
                ) : null}
              </div>
            </SettingRow>
          </SettingsSection>
        </SettingsGroup>

        <SaveBar
          changes={changedFields.length}
          dirty={changedFields.length > 0}
          onDiscard={discard}
          saveLabel="Save organization settings"
          savedMessage="Organization settings saved."
          saving={isSaving}
        />
      </form>

      {/* The hosted service's accounts are strangers to each other, not
          one organization, so it has no list of them here. */}
      {!hosted ? (
        <SettingsGroup label="People & access">
          <PeoplePanel part11Mode={values.part11Mode} />
          <SecurityPanel
            initialRequireTwoFactor={values.requireTwoFactor}
            initialSessionIdleMinutes={values.sessionIdleMinutes}
            initialSessionMaxHours={values.sessionMaxHours}
            onChanged={() => setAuditRevision((revision) => revision + 1)}
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup label="Compliance">
        {!hosted ? <AuditTrailPanel revision={auditRevision} /> : null}
        {!hosted ? (
          <Part11Panel
            initialEnabled={values.part11Mode}
            onChange={(part11Mode) => {
              applySaved({ part11Mode });
              setAuditRevision((revision) => revision + 1);
            }}
          />
        ) : null}
        <SignerDataPanel />
      </SettingsGroup>
    </>
  );
}
