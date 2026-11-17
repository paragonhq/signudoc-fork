"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAnimate } from "motion/react";

import { AuthNotice, textActionClassName } from "@/components/auth/auth-parts";
import { passwordHint } from "@/components/auth/signup-shell";
import { Envelope, type ObjectPose } from "@/components/objects";
import { AutoHeight } from "@/components/public/auto-height";
import { StepSwap } from "@/components/public/step-swap";
import { SetupBrandingStep } from "@/components/setup/setup-branding-step";
import {
  SetupDoneStep,
  type DoneItem,
} from "@/components/setup/setup-done-step";
import {
  PasswordInput,
  ProgressSegments,
  StepHeading,
  TopBarPreview,
  useSetupReducedMotion,
} from "@/components/setup/setup-parts";
import {
  addInvitees,
  findInviteeProblems,
  SetupTeamStep,
  type Invitee,
} from "@/components/setup/setup-team-step";
import {
  SenderFields,
  type SenderErrors,
} from "@/components/setup/sender-fields";
import type { SetupShellView } from "@/components/setup/setup-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { ArrowLeft } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TextMorph } from "@/components/ui/text-morph";
import { authClient } from "@/lib/auth/client";
import { buildBrandPalette, normalizeBrandColor } from "@/lib/brand-color";
import { cn } from "@/lib/cn";
import type { OrganizationSettingsView } from "@/lib/organization-settings";
import { newPasswordLengthError } from "@/lib/password-messages";
import {
  buildSenderAddress,
  DEFAULT_SENDER_LOCAL_PART,
  DEFAULT_SENDING_SUBDOMAIN,
  readResendEmailDomain,
  suggestSendingRootDomain,
  type SenderAddressParts,
} from "@/lib/sending-domain";
import type { SetupFieldName } from "@/lib/setup";
import {
  getEmailDomain,
  isPublicMailboxDomain,
  parseEmailDomainList,
  suggestSignupPolicy,
  type SignupMode,
} from "@/lib/signup-policy";

/*
 * First-run setup, one question at a time, like a Family onboarding: a
 * welcome, the organization, you, then support and email, and the site is
 * created. Two optional steps follow while the new administrator is signed
 * in (branding, inviting the team), then the one moment of delight: the
 * envelope seals. The card changes height between steps while the content
 * slides in the direction of travel; everything typed is kept when going
 * back. Enter moves on; a step that is not ready says why and shakes once.
 */

type SetupValues = Record<SetupFieldName, string>;
type SetupErrors = Partial<Record<SetupFieldName, string>>;

type StepId =
  "branding" | "done" | "email" | "organization" | "team" | "welcome" | "you";

type SetupResponse = {
  error?: string;
  fieldErrors?: SetupErrors;
  redirectTo?: string;
  settings?: OrganizationSettingsView | null;
  signedIn?: boolean;
} | null;

type SettingsResponse = {
  error?: string;
  fieldErrors?: Record<string, string>;
  settings?: OrganizationSettingsView;
} | null;

type InvitationsResponse = {
  alreadyMembers?: string[];
  error?: string;
  failed?: Array<{ email: string; message: string }>;
  notAllowed?: string[];
  sent?: string[];
} | null;

type Phase = "busy" | "done" | "idle";

const GENERIC_ERROR_MESSAGE = "Setup could not be completed. Please try again.";
const GENERIC_SAVE_MESSAGE = "That could not be saved. Please try again.";

const FIELD_MESSAGES = {
  email: "Enter a valid email address",
  fullName: "Enter your full name",
  organizationName: "Enter the name of your organization",
  setupToken: "Enter the setup token",
  supportAddress: "Enter an email address people can write to for help",
} as const;

const emptyValues: SetupValues = {
  email: "",
  fullName: "",
  organizationName: "",
  password: "",
  senderAddress: "",
  setupToken: "",
  supportAddress: "",
};

// Safari's hint for the passwords it suggests. Not in React's types.
const passwordRules = {
  passwordrules:
    "minlength: 20; maxlength: 64; required: lower; required: upper; required: digit; allowed: [-_.!@#$%^&*];",
};

const looksLikeEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

function describeSignupStart(email: string, hosted: boolean): string | null {
  if (hosted || !getEmailDomain(email)) {
    return null;
  }

  const policy = suggestSignupPolicy(email);

  if (policy.signupMode === "domains") {
    return `Other people with an @${policy.allowedEmailDomains[0]} address will be able to create accounts. You can change this later.`;
  }

  return "Only you will have an account to begin with. You can invite people next.";
}

const STEP_TITLES: Record<StepId, string> = {
  branding: "Make it yours",
  done: "All set",
  email: "Support and email",
  organization: "Your organization",
  team: "Invite your team",
  welcome: "Let's set up your site",
  you: "About you",
};

export function SetupForm({
  hosted,
  knownSupportAddress,
  resendDomain,
  siteHost,
  view,
}: {
  hosted: boolean;
  knownSupportAddress: string | null;
  resendDomain: string | null;
  siteHost: string | null;
  view: Extract<SetupShellView, { view: "claim" | "create" }>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [shakeScope, animateShake] = useAnimate<HTMLDivElement>();
  const reduceMotion = useSetupReducedMotion();
  const isCreate = view.view === "create";
  const requiresToken = isCreate ? view.requiresToken : true;
  const asksForSender = isCreate && !view.senderAddressFromEnv;
  const asksForSupport = view.asksForSupportAddress;

  const [values, setValues] = useState<SetupValues>(emptyValues);
  // The domain the Resend integration set up comes first. Without one,
  // until the administrator types a domain of their own, it follows what
  // setup can tell from the site's address and the emails typed.
  const [integrationSender] = useState(() =>
    readResendEmailDomain(resendDomain),
  );
  const [sender, setSender] = useState<SenderAddressParts>(
    () =>
      integrationSender ?? {
        localPart: DEFAULT_SENDER_LOCAL_PART,
        rootDomain: "",
        subdomain: DEFAULT_SENDING_SUBDOMAIN,
      },
  );
  const [rootDomainEdited, setRootDomainEdited] = useState(
    integrationSender !== null,
  );
  const [senderErrors, setSenderErrors] = useState<SenderErrors>({});
  const [errors, setErrors] = useState<SetupErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const [stepId, setStepId] = useState<StepId>(
    isCreate ? "welcome" : "organization",
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [created, setCreated] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [settings, setSettings] = useState<OrganizationSettingsView | null>(
    null,
  );

  // Optional steps, kept here so going back and forth keeps them.
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("");
  const [brandColorError, setBrandColorError] = useState<string>();
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [inviteDraft, setInviteDraft] = useState("");
  const [signupMode, setSignupMode] = useState<SignupMode>("closed");
  const [teamError, setTeamError] = useState<string | null>(null);
  const [invitedCount, setInvitedCount] = useState(0);
  const [inviteNotes, setInviteNotes] = useState<string[]>([]);

  const adminEmail = isCreate
    ? values.email.trim()
    : (view.signedInEmail ?? "");
  const suggestedRootDomain = asksForSender
    ? suggestSendingRootDomain({
        emails: [values.email, values.supportAddress, knownSupportAddress],
        siteHost,
      })
    : null;
  const senderParts: SenderAddressParts = {
    ...sender,
    rootDomain: rootDomainEdited
      ? sender.rootDomain
      : (suggestedRootDomain ?? ""),
  };

  // The steps, in order. Before the site exists, the optional ones are
  // assumed (for the progress segments); once it does, they are known.
  const hasEmailStep = isCreate
    ? asksForSupport || asksForSender || requiresToken
    : true;
  const preSteps: StepId[] = isCreate
    ? [
        "welcome",
        "organization",
        "you",
        ...(hasEmailStep ? ["email" as const] : []),
      ]
    : ["organization", "email"];
  const canBrand = created ? signedIn && settings !== null && !hosted : !hosted;
  const canInvite = created ? signedIn && settings !== null : true;
  const steps: StepId[] = [
    ...preSteps,
    ...(canBrand ? ["branding" as const] : []),
    ...(canInvite ? ["team" as const] : []),
    "done",
  ];
  const submitStep = preSteps[preSteps.length - 1];
  const stepIndex = steps.indexOf(stepId);
  const progressSteps: StepId[] = steps.filter(
    (step) => step !== "welcome" && step !== "done",
  );
  const progressIndex = progressSteps.indexOf(stepId);
  const busy = phase !== "idle";
  const locked = busy || (created && preSteps.includes(stepId));

  const domains = settings
    ? parseEmailDomainList(settings.allowedEmailDomains).domains
    : [];
  const adminDomain = getEmailDomain(adminEmail);
  const teamDomains =
    domains.length > 0
      ? domains
      : adminDomain && !isPublicMailboxDomain(adminDomain)
        ? [adminDomain]
        : [];

  // Focus follows the step: its first field, or its heading. A step change
  // also scrolls the card's top back into view on a phone.
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const frame = requestAnimationFrame(() => {
      const root = formRef.current?.querySelector<HTMLElement>(
        `[data-step="${stepId}"]`,
      );
      // The optional steps and the end start at their heading: their first
      // control is a choice, not a question to answer.
      const headingFirst = stepId === "branding" || stepId === "done";
      const target =
        (headingFirst
          ? null
          : root?.querySelector<HTMLElement>(
              "input:not([type=hidden]):not([type=file]):not([disabled]):not([tabindex='-1'])",
            )) ?? root?.querySelector<HTMLElement>("[data-step-heading]");
      const top = formRef.current?.getBoundingClientRect().top ?? 0;

      if (top < 0) {
        formRef.current?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }

      target?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, stepId]);

  function goTo(next: StepId) {
    const nextIndex = steps.indexOf(next);

    setDirection(nextIndex >= stepIndex ? 1 : -1);
    setBanner(null);
    setStepId(next);
  }

  function goNext() {
    // From the step actually showing, so two quick presses move twice.
    setDirection(1);
    setBanner(null);
    setStepId((current) => steps[steps.indexOf(current) + 1] ?? current);
  }

  function shake() {
    if (reduceMotion || !shakeScope.current) {
      return;
    }

    void animateShake(
      shakeScope.current,
      { x: [0, -6, 5, -3, 2, 0] },
      { duration: 0.36, ease: "easeOut" },
    );
  }

  /** What is wrong with a step's fields, or nothing. */
  function validate(step: StepId): {
    errors: SetupErrors;
    sender: SenderErrors;
  } {
    const found: SetupErrors = {};
    const foundSender: SenderErrors = {};

    if (step === "organization") {
      const name = values.organizationName.trim();

      if (!name || name.length > 120) {
        found.organizationName = FIELD_MESSAGES.organizationName;
      }

      if (
        !isCreate &&
        asksForSupport &&
        !looksLikeEmail(values.supportAddress)
      ) {
        found.supportAddress = FIELD_MESSAGES.supportAddress;
      }
    }

    if (step === "you") {
      if (!values.fullName.trim()) {
        found.fullName = FIELD_MESSAGES.fullName;
      }

      if (!looksLikeEmail(values.email)) {
        found.email = FIELD_MESSAGES.email;
      }

      const passwordError = newPasswordLengthError(values.password);

      if (passwordError) {
        found.password = passwordError;
      }
    }

    if (step === "email") {
      if (
        isCreate &&
        asksForSupport &&
        !looksLikeEmail(values.supportAddress)
      ) {
        found.supportAddress = FIELD_MESSAGES.supportAddress;
      }

      if (asksForSender) {
        const built = buildSenderAddress(senderParts);

        if (built.error) {
          foundSender[built.error.field] = built.error.message;
        }
      }

      if (requiresToken && !values.setupToken.trim()) {
        found.setupToken = FIELD_MESSAGES.setupToken;
      }
    }

    return { errors: found, sender: foundSender };
  }

  /** Shows a step's problems; true when there were none. */
  function check(step: StepId): boolean {
    const result = validate(step);
    const fields = Object.keys(result.errors) as SetupFieldName[];
    const senderFields = Object.keys(result.sender);

    if (fields.length === 0 && senderFields.length === 0) {
      return true;
    }

    // A field that turns invalid shakes on its own; one already marked
    // gets the card's shake instead, so a second try still answers.
    const alreadyShown =
      fields.every((field) => errors[field] !== undefined) &&
      senderFields.length === 0;

    setErrors((current) => ({ ...current, ...result.errors }));
    setSenderErrors(result.sender);

    if (alreadyShown) {
      shake();
    }

    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLElement>(
          `[data-step="${step}"] [aria-invalid='true']`,
        )
        ?.focus({ preventScroll: true });
    });

    return false;
  }

  /** On leaving a field with something in it, say straight away if it is wrong. */
  function handleBlur(field: SetupFieldName) {
    return (event: FocusEvent<HTMLInputElement>) => {
      if (!event.target.value.trim() && !errors[field]) {
        return;
      }

      const message = validate(stepId).errors[field];

      setErrors((current) => ({ ...current, [field]: message }));
    };
  }

  function handleChange(field: SetupFieldName) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setValues((current) => ({ ...current, [field]: nextValue }));
      setErrors((current) => ({ ...current, [field]: undefined }));
      setBanner(null);
    };
  }

  function handleSenderChange(field: keyof SenderAddressParts) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      if (field === "rootDomain") {
        setRootDomainEdited(true);
      }

      setSender((current) => ({ ...current, [field]: nextValue }));
      setSenderErrors((current) => ({ ...current, [field]: undefined }));
      setErrors((current) => ({ ...current, senderAddress: undefined }));
      setBanner(null);
    };
  }

  async function handleSwitchAccount() {
    if (isSwitchingAccount) {
      return;
    }

    setIsSwitchingAccount(true);

    // The login page sends anyone who is signed in on to the dashboard, so
    // the current session has to end before it will show its form.
    await authClient.signOut().catch(() => undefined);
    router.push("/login");
  }

  /** Which step asks for a field, to go back to it after a refusal. */
  function stepOfField(field: string): StepId | null {
    switch (field) {
      case "organizationName":
        return "organization";
      case "email":
      case "fullName":
      case "password":
        return "you";
      case "supportAddress":
        return isCreate ? "email" : "organization";
      case "senderAddress":
      case "setupToken":
        return "email";
      default:
        return null;
    }
  }

  async function createSite() {
    const builtSender = asksForSender
      ? buildSenderAddress(senderParts)
      : { address: null, error: null };

    setPhase("busy");
    setBanner(null);

    try {
      const response = await fetch("/api/setup", {
        body: JSON.stringify({
          organizationName: values.organizationName,
          setupToken: requiresToken ? values.setupToken : undefined,
          supportAddress: asksForSupport ? values.supportAddress : undefined,
          ...(isCreate
            ? {
                email: values.email,
                fullName: values.fullName,
                password: values.password,
                senderAddress: builtSender.address ?? undefined,
              }
            : {}),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as SetupResponse;

      if (!response.ok) {
        const fieldErrors = payload?.fieldErrors ?? {};
        const firstStep = steps.find((step) =>
          Object.keys(fieldErrors).some((field) => stepOfField(field) === step),
        );

        setErrors(fieldErrors);
        setPhase("idle");

        if (firstStep && firstStep !== stepId) {
          goTo(firstStep);
        } else {
          shake();
        }

        setBanner(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      const nextSettings = payload?.settings ?? null;
      const nextSignedIn = payload?.signedIn !== false;

      setSettings(nextSettings);
      setSignedIn(nextSignedIn);
      setLogoUrl(nextSettings?.logoUrl ?? null);
      setBrandColor(nextSettings?.brandColor ?? "");
      setSignupMode(nextSettings?.signupMode ?? "closed");
      setCreated(true);
      setPhase("done");

      // "Done" holds for a breath, then the next step.
      window.setTimeout(
        () => {
          setPhase("idle");
          setDirection(1);
          setStepId(
            nextSignedIn && nextSettings
              ? hosted
                ? "team"
                : "branding"
              : "done",
          );
        },
        reduceMotion ? 250 : 700,
      );
    } catch {
      setBanner(GENERIC_ERROR_MESSAGE);
      setPhase("idle");
      shake();
    }
  }

  async function saveSettings(
    patch: Partial<OrganizationSettingsView>,
  ): Promise<SettingsResponse & { ok: boolean }> {
    if (!settings) {
      return { error: GENERIC_SAVE_MESSAGE, ok: false };
    }

    const merged = { ...settings, ...patch };

    try {
      const response = await fetch("/api/admin/settings", {
        body: JSON.stringify({
          allowedEmailDomains: merged.allowedEmailDomains,
          brandColor: merged.brandColor,
          organizationName: merged.organizationName,
          privacyUrl: merged.privacyUrl,
          retentionDays: merged.retentionDays,
          senderAddress: merged.senderAddress,
          signupMode: merged.signupMode,
          supportAddress: merged.supportAddress,
          termsUrl: merged.termsUrl,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as SettingsResponse;

      if (!response.ok || !payload?.settings) {
        return { ...payload, ok: false };
      }

      setSettings(payload.settings);

      return { ...payload, ok: true };
    } catch {
      return { error: GENERIC_SAVE_MESSAGE, ok: false };
    }
  }

  const brandColorChanged =
    settings !== null && brandColor.trim() !== settings.brandColor;

  async function saveBranding() {
    if (!brandColorChanged) {
      goNext();
      return;
    }

    if (brandColor.trim() && !normalizeBrandColor(brandColor)) {
      setBrandColorError(
        "Enter a color as six letters and digits, such as #1a73e8",
      );
      shake();
      return;
    }

    setPhase("busy");

    const result = await saveSettings({
      brandColor: normalizeBrandColor(brandColor) ?? "",
    });

    if (!result.ok) {
      setPhase("idle");
      setBrandColorError(result.fieldErrors?.brandColor);
      setBanner(result.error ?? GENERIC_SAVE_MESSAGE);
      shake();
      return;
    }

    setBrandingSaved(true);
    setPhase("idle");
    goNext();
  }

  const invitable = invitees.filter(
    (invitee) =>
      findInviteeProblems([invitee], {
        allowedEmailDomains: teamDomains,
        signupMode,
      }).length === 0,
  );
  const policyChanged = settings !== null && signupMode !== settings.signupMode;

  async function sendInvitations() {
    const list = inviteDraft.trim()
      ? addInvitees(invitees, inviteDraft)
      : invitees;

    if (list !== invitees) {
      setInvitees(list);
      setInviteDraft("");
    }

    const problems = findInviteeProblems(list, {
      allowedEmailDomains: teamDomains,
      signupMode,
    });

    if (problems.length > 0 || list.length > 25) {
      shake();
      return;
    }

    setTeamError(null);
    setPhase("busy");

    if (policyChanged || (signupMode === "domains" && domains.length === 0)) {
      const result = await saveSettings({
        allowedEmailDomains: teamDomains.join(", "),
        signupMode,
      });

      if (!result.ok) {
        setPhase("idle");
        setTeamError(
          result.fieldErrors?.allowedEmailDomains ??
            result.error ??
            GENERIC_SAVE_MESSAGE,
        );
        shake();
        return;
      }
    }

    const emails = list.filter((invitee) => invitee.valid).map((i) => i.value);

    if (emails.length === 0) {
      setPhase("idle");
      goNext();
      return;
    }

    try {
      const response = await fetch("/api/admin/invitations", {
        body: JSON.stringify({ emails }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as InvitationsResponse;

      if (!response.ok || !payload?.sent) {
        setPhase("idle");
        setTeamError(
          payload?.notAllowed?.length
            ? `${payload.notAllowed.join(", ")} could not create an account under this rule.`
            : (payload?.error ?? "The invitations could not be sent."),
        );
        shake();
        return;
      }

      const notes: string[] = [];

      if (payload.alreadyMembers?.length) {
        notes.push(
          `${payload.alreadyMembers.join(", ")} already ${payload.alreadyMembers.length === 1 ? "has an account" : "have accounts"}`,
        );
      }

      if (payload.failed?.length) {
        notes.push(
          `Could not send to ${payload.failed.map((item) => item.email).join(", ")}`,
        );
      }

      setInvitedCount(payload.sent.length);
      setInviteNotes(notes);
      setPhase("done");
      window.setTimeout(
        () => {
          setPhase("idle");
          goNext();
        },
        reduceMotion ? 250 : 600,
      );
    } catch {
      setPhase("idle");
      setTeamError("The invitations could not be sent. Please try again.");
      shake();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (stepId === "branding") {
      await saveBranding();
      return;
    }

    if (stepId === "team") {
      await sendInvitations();
      return;
    }

    if (stepId === "done" || locked) {
      return;
    }

    if (stepId !== "welcome" && !check(stepId)) {
      return;
    }

    if (stepId === submitStep) {
      // Every step before this one must be in order too; the person may
      // have gone back and emptied a field.
      const broken = preSteps.find(
        (step) => step !== "welcome" && step !== stepId && !check(step),
      );

      if (broken) {
        goTo(broken);
        return;
      }

      await createSite();
      return;
    }

    goNext();
  }

  const organizationName = values.organizationName.trim();
  const primaryLabel = (() => {
    switch (stepId) {
      case "welcome":
        return "Get started";
      case "branding":
        return busy
          ? "Saving…"
          : brandColorChanged
            ? "Save and continue"
            : "Continue";
      case "team":
        if (phase === "done") {
          return "Sent";
        }

        if (busy) {
          return "Sending…";
        }

        return invitable.length > 0
          ? `Send ${String(invitable.length)} ${invitable.length === 1 ? "invitation" : "invitations"}`
          : policyChanged
            ? "Save and continue"
            : "Continue";
      case "done":
        return signedIn ? "Go to Documents" : "Log in";
      default:
        if (stepId !== submitStep) {
          return "Continue";
        }

        if (phase === "done") {
          return "Done";
        }

        if (busy) {
          return isCreate ? "Creating your site…" : "Saving…";
        }

        return isCreate ? "Finish setup" : "Become the administrator";
    }
  })();

  const doneItems: DoneItem[] = [
    {
      done: true,
      label: `Site set up for ${organizationName || "your organization"}`,
    },
    {
      done: true,
      label: isCreate
        ? `Administrator account for ${values.email.trim()}`
        : `${adminEmail} is the administrator`,
    },
    ...(settings?.supportAddress
      ? [{ done: true, label: `Questions go to ${settings.supportAddress}` }]
      : []),
    ...(canBrand && created
      ? [
          brandingSaved || logoUrl
            ? { done: true, label: "Your logo and colour are on" }
            : { done: false, label: "Add your logo and colour in Settings" },
        ]
      : []),
    ...(canInvite && created
      ? [
          invitedCount > 0
            ? {
                done: true,
                label: `${String(invitedCount)} ${invitedCount === 1 ? "invitation" : "invitations"} sent`,
              }
            : { done: false, label: "Invite your team from Settings" },
        ]
      : []),
    ...inviteNotes.map((note) => ({ done: false, label: note })),
  ];

  // Once the site exists, the card takes on the colour being chosen, so the
  // whole step previews it, and the end keeps it.
  const chosenPalette =
    created && !hosted ? buildBrandPalette(brandColor) : null;
  const showHeader = stepId !== "welcome" && stepId !== "done";
  const canGoBack =
    stepIndex > 0 &&
    !busy &&
    (created ? stepId === "team" && canBrand : preSteps.includes(stepId));
  const optional = stepId === "branding" || stepId === "team";

  return (
    <div className="flex flex-col gap-5">
      <p aria-live="polite" className="sr-only">
        {stepId === "welcome"
          ? ""
          : progressIndex >= 0
            ? `Step ${String(progressIndex + 1)} of ${String(progressSteps.length)}: ${STEP_TITLES[stepId]}`
            : STEP_TITLES[stepId]}
      </p>

      <form
        className="relative rounded-(--radius-tray) bg-(--paper) shadow-(--shadow-card)"
        noValidate
        onSubmit={handleSubmit}
        ref={formRef}
        style={
          chosenPalette
            ? ({
                // The fill colours only: the pale tints and the ink stay
                // the theme's own, so dark mode keeps its dark tints.
                "--accent": chosenPalette.accent,
                "--accent-hover": chosenPalette.accentHover,
                "--accent-rgb": chosenPalette.accentRgb,
              } as CSSProperties)
            : undefined
        }
      >
        <div className="px-5 pt-5 sm:px-8 sm:pt-7" ref={shakeScope}>
          <AutoHeight innerClassName="relative">
            {showHeader ? (
              <div className="mb-5 grid h-9 grid-cols-[2.25rem_1fr_2.25rem] items-center">
                {canGoBack ? (
                  <IconButton
                    aria-label="Back"
                    className="-ml-1.5"
                    onClick={() => goTo(steps[stepIndex - 1]!)}
                    size="sm"
                    tooltip={false}
                    type="button"
                  >
                    <ArrowLeft aria-hidden="true" />
                  </IconButton>
                ) : (
                  <span />
                )}
                <div className="flex justify-center">
                  <ProgressSegments
                    count={progressSteps.length}
                    current={progressIndex}
                  />
                </div>
                <span />
              </div>
            ) : null}
            <StepSwap direction={direction} stepKey={stepId}>
              <div className="flex flex-col gap-5 pb-1" data-step={stepId}>
                {renderStep()}
              </div>
            </StepSwap>
          </AutoHeight>
        </div>

        <div
          className={cn(
            "sticky bottom-0 z-10 flex flex-col gap-1 rounded-b-(--radius-tray) bg-(--paper) px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:static sm:px-8 sm:pt-6 sm:pb-7",
          )}
        >
          {stepId === "done" ? (
            <>
              <Button asChild className="w-full" size="lg">
                <Link href={signedIn ? "/dashboard" : "/login"}>
                  {primaryLabel}
                </Link>
              </Button>
              {signedIn ? (
                <Button asChild className="w-full" size="lg" variant="ghost">
                  <Link href="/settings#organization">Open Settings</Link>
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                aria-busy={busy || undefined}
                aria-disabled={busy || undefined}
                className="w-full"
                size="lg"
                type="submit"
              >
                {busy && phase === "busy" ? (
                  <Spinner aria-hidden="true" className="size-4" />
                ) : null}
                <TextMorph>{primaryLabel}</TextMorph>
              </Button>
              {optional ? (
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() => {
                    setBanner(null);
                    setTeamError(null);
                    goNext();
                  }}
                  size="lg"
                  type="button"
                  variant="ghost"
                >
                  Skip for now
                </Button>
              ) : null}
            </>
          )}
        </div>
      </form>

      {!isCreate && !created ? (
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-(--secondary)">
          Not the right account?
          <button
            className={textActionClassName}
            disabled={isSwitchingAccount}
            onClick={handleSwitchAccount}
            type="button"
          >
            Log in as someone else
          </button>
        </p>
      ) : null}
    </div>
  );

  function renderNotice(): ReactNode {
    return <AuthNotice>{banner}</AuthNotice>;
  }

  function renderStep(): ReactNode {
    switch (stepId) {
      case "welcome":
        return <WelcomeStep />;

      case "organization":
        return (
          <>
            <StepHeading
              description={
                isCreate
                  ? "The name people see when you send them something to sign."
                  : `You are signed in as ${view.view === "claim" ? (view.signedInEmail ?? "") : ""}. This account will become the administrator, who decides who may sign up and how email is sent.`
              }
              title={isCreate ? "Your organization" : "Choose an administrator"}
            />
            {renderNotice()}
            <FormField
              disabled={locked}
              error={errors.organizationName}
              label="Organization name"
            >
              <Input
                autoComplete="organization"
                maxLength={120}
                name="setup-organization-name"
                onBlur={handleBlur("organizationName")}
                onChange={handleChange("organizationName")}
                placeholder="Acme Corp"
                value={values.organizationName}
              />
            </FormField>
            {!isCreate && asksForSupport ? renderSupportField() : null}
            <TopBarPreview name={values.organizationName} />
          </>
        );

      case "you":
        return (
          <>
            <StepHeading
              description="The administrator account. You log in with it."
              title="About you"
            />
            {renderNotice()}
            <FormField
              disabled={locked}
              error={errors.fullName}
              label="Your name"
            >
              <Input
                autoComplete="name"
                name="setup-full-name"
                onBlur={handleBlur("fullName")}
                onChange={handleChange("fullName")}
                placeholder="Jane Smith"
                value={values.fullName}
              />
            </FormField>
            <FormField
              disabled={locked}
              error={errors.email}
              hint={describeSignupStart(values.email, hosted) ?? undefined}
              label="Your email"
            >
              <Input
                // "username" tells password managers this is the login the
                // new password belongs to, so they save the two together.
                autoComplete="username"
                inputMode="email"
                name="setup-email"
                onBlur={handleBlur("email")}
                onChange={handleChange("email")}
                placeholder="jane@acmecorp.com"
                type="email"
                value={values.email}
              />
            </FormField>
            <FormField
              disabled={locked}
              error={errors.password}
              hint={passwordHint(values.password.length)}
              label="Password"
            >
              <PasswordInput
                autoComplete="new-password"
                // No maxLength: the browser would cut a longer password
                // short without a word. Setup refuses one over 128.
                name="setup-password"
                onBlur={handleBlur("password")}
                onChange={handleChange("password")}
                {...passwordRules}
                value={values.password}
              />
            </FormField>
          </>
        );

      case "email":
        return (
          <>
            <StepHeading
              description={
                isCreate && (asksForSupport || asksForSender)
                  ? "Where people write for help, and where this site's email comes from."
                  : "The setup token proves you run this site."
              }
              title={
                isCreate && (asksForSupport || asksForSender)
                  ? "Support and email"
                  : "Confirm it's you"
              }
            />
            {renderNotice()}
            {isCreate && asksForSupport ? renderSupportField() : null}
            {asksForSender ? (
              <SenderFields
                disabled={locked}
                errors={senderErrors}
                onChange={handleSenderChange}
                parts={senderParts}
                serverError={errors.senderAddress}
                source={
                  integrationSender &&
                  sender.rootDomain === integrationSender.rootDomain
                    ? "integration"
                    : !rootDomainEdited && suggestedRootDomain !== null
                      ? "guess"
                      : null
                }
              />
            ) : null}
            {requiresToken ? (
              <FormField
                disabled={locked}
                error={errors.setupToken}
                hint="The value of the SETUP_TOKEN environment variable on this deployment."
                label="Setup token"
              >
                <Input
                  autoComplete="off"
                  // Not a password of the account being made, so a password
                  // manager should neither fill nor save it.
                  data-1p-ignore="true"
                  data-lpignore="true"
                  name="setup-token"
                  onBlur={handleBlur("setupToken")}
                  onChange={handleChange("setupToken")}
                  type="password"
                  value={values.setupToken}
                />
              </FormField>
            ) : null}
          </>
        );

      case "branding":
        return (
          <>
            {renderNotice()}
            <SetupBrandingStep
              brandColor={brandColor}
              brandColorError={brandColorError}
              disabled={busy}
              logoUrl={logoUrl}
              onBrandColorChange={(value) => {
                setBrandColor(value);
                setBrandColorError(undefined);
                setBanner(null);
              }}
              onLogoChange={(next) => {
                setLogoUrl(next);
                setBrandingSaved(next !== null);
              }}
              organizationName={organizationName}
            />
          </>
        );

      case "team":
        return (
          <SetupTeamStep
            disabled={busy}
            domains={teamDomains}
            draft={inviteDraft}
            error={teamError}
            hosted={hosted}
            invitees={invitees}
            onDraftChange={(value) => {
              setInviteDraft(value);
              setTeamError(null);
            }}
            onInviteesChange={(next) => {
              setInvitees(next);
              setTeamError(null);
            }}
            onSignupModeChange={(mode) => {
              setSignupMode(mode);
              setTeamError(null);
            }}
            signupMode={signupMode}
          />
        );

      case "done":
        return (
          <SetupDoneStep
            items={doneItems}
            organizationName={organizationName}
            signedIn={signedIn}
          />
        );
    }
  }

  function renderSupportField(): ReactNode {
    return (
      <FormField
        disabled={locked}
        error={errors.supportAddress}
        hint="Signers are told to write here for help, and replies to this site's emails arrive here."
        label="Support email"
      >
        <Input
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          inputMode="email"
          name="setup-support-address"
          onBlur={handleBlur("supportAddress")}
          onChange={handleChange("supportAddress")}
          placeholder="help@acmecorp.com"
          type="email"
          value={values.supportAddress}
        />
      </FormField>
    );
  }
}

/**
 * The first thing a new install shows: an envelope whose letter rises to
 * say hello, the title and one line. The only object before the end.
 */
function WelcomeStep() {
  const [pose, setPose] = useState<ObjectPose>("rest");

  useEffect(() => {
    const timer = window.setTimeout(() => setPose("hover"), 450);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 pt-2">
      <div aria-hidden="true" className="flex justify-center pt-8 pb-1">
        <Envelope interactive pose={pose} scale={0.72} />
      </div>
      <StepHeading
        description="A few short steps: your organization, your account and where email goes. Everything can be changed later."
        title="Let's set up your site"
      />
    </div>
  );
}
