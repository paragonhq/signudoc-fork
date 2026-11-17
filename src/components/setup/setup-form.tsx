"use client";

import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "@/components/ui/icons";

import {
  AuthHeading,
  AuthNotice,
  textActionClassName,
} from "@/components/auth/auth-parts";
import { passwordHint } from "@/components/auth/signup-shell";
import { Seal } from "@/components/brand/marks";
import { AutoHeight } from "@/components/public/auto-height";
import { StepSwap } from "@/components/public/step-swap";
import {
  SenderFields,
  type SenderErrors,
} from "@/components/setup/sender-fields";
import type { SetupShellView } from "@/components/setup/setup-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DUR, EASE, SPRING_SNAPPY } from "@/components/ui/motion-tokens";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/cn";
import {
  buildSenderAddress,
  DEFAULT_SENDER_LOCAL_PART,
  DEFAULT_SENDING_SUBDOMAIN,
  readResendEmailDomain,
  suggestSendingRootDomain,
  type SenderAddressParts,
} from "@/lib/sending-domain";
import type { SetupFieldName } from "@/lib/setup";
import { getEmailDomain, suggestSignupPolicy } from "@/lib/signup-policy";

type SetupValues = Record<SetupFieldName, string>;
type SetupErrors = Partial<Record<SetupFieldName, string>>;

type SetupResponse = {
  error?: string;
  fieldErrors?: SetupErrors;
  redirectTo?: string;
} | null;

const GENERIC_ERROR_MESSAGE = "Setup could not be completed. Please try again.";

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
  if (hosted) {
    return null;
  }

  if (!getEmailDomain(email)) {
    return null;
  }

  const policy = suggestSignupPolicy(email);

  if (policy.signupMode === "domains") {
    return `Other people with an @${policy.allowedEmailDomains[0]} address will be able to create accounts. You can change this in Settings.`;
  }

  return "Only you will have an account to begin with. You can let other people in from Settings.";
}

type Section = {
  complete: boolean;
  id: string;
  label: string;
};

/*
 * First-run setup as a short sequence of calm steps: Organization, You,
 * Email, then Finish. Every field stays on the page (nothing hides behind
 * a "Next"), so the form can be filled top to bottom and finished in one
 * go. The step being filled is the lifted card; steps still to come sit
 * quieter; a finished step's number turns into a check. The optional part
 * (where email is sent from) starts folded. Finishing is the one moment of
 * delight: the card becomes the seal settling in, then Settings.
 */
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
  const formRef = useRef<HTMLFormElement>(null);
  const reduceMotion = useReducedMotion();
  const [values, setValues] = useState<SetupValues>(emptyValues);
  // The domain the Resend integration set up comes first. Without one,
  // until the administrator types a domain of their own, it follows what
  // setup can tell from the site's address and the emails typed above.
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
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const router = useRouter();
  const isCreate = view.view === "create";
  const requiresToken = isCreate ? view.requiresToken : true;
  const asksForSender = isCreate && !view.senderAddressFromEnv;
  const asksForSupport = view.asksForSupportAddress;
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
  const locked = isSubmitting || isFinished;

  const sections: Section[] = [
    {
      complete: values.organizationName.trim().length > 0,
      id: "setup-section-organization",
      label: "Organization",
    },
    ...(isCreate
      ? [
          {
            complete:
              values.fullName.trim().length > 0 &&
              looksLikeEmail(values.email) &&
              values.password.trim().length >= 15,
            id: "setup-section-you",
            label: "You",
          },
        ]
      : []),
    ...(asksForSupport || asksForSender
      ? [
          {
            complete: !asksForSupport || looksLikeEmail(values.supportAddress),
            id: "setup-section-email",
            label: "Email",
          },
        ]
      : []),
  ];
  const firstIncomplete = sections.findIndex((section) => !section.complete);
  // The step being filled: the first one not done, or Finish when all are.
  const currentIndex =
    firstIncomplete === -1 ? sections.length : firstIncomplete;

  function stepState(index: number): StepState {
    if (sections[index]?.complete) {
      return "done";
    }

    return index === currentIndex ? "current" : "upcoming";
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
      setBannerMessage(null);
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

  function handleChange(field: SetupFieldName) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setValues((currentValues) => ({ ...currentValues, [field]: nextValue }));
      setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
      setBannerMessage(null);
    };
  }

  /** After a refusal, take the person to the first field that needs them. */
  function focusFirstInvalid() {
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector<HTMLElement>(
        "[aria-invalid='true']",
      );

      target?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      target?.focus({ preventScroll: true });
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (locked) {
      return;
    }

    setBannerMessage(null);
    setErrors({});
    setSenderErrors({});

    const builtSender = asksForSender
      ? buildSenderAddress(senderParts)
      : { address: null, error: null };

    if (builtSender.error) {
      setSenderErrors({ [builtSender.error.field]: builtSender.error.message });
      setBannerMessage("Check the address this site sends email from.");
      focusFirstInvalid();
      return;
    }

    setIsSubmitting(true);

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
        setErrors(payload?.fieldErrors ?? {});
        setBannerMessage(payload?.error ?? GENERIC_ERROR_MESSAGE);
        setIsSubmitting(false);
        focusFirstInvalid();
        return;
      }

      // The seal lands and the rosette draws on, then a full page load, so
      // the app starts again with the new session and the organization's
      // name.
      setIsSubmitting(false);
      setIsFinished(true);
      window.setTimeout(
        () => window.location.assign(payload?.redirectTo ?? "/dashboard"),
        reduceMotion ? 300 : 1200,
      );
    } catch {
      setBannerMessage(GENERIC_ERROR_MESSAGE);
      setIsSubmitting(false);
    }
  }

  const signupStart = isCreate
    ? describeSignupStart(values.email, hosted)
    : null;
  const submitLabel = isCreate ? "Finish setup" : "Become the administrator";
  const organizationName = values.organizationName.trim();

  return (
    <AutoHeight innerClassName="relative">
      <StepSwap stepKey={isFinished ? "done" : "form"}>
        {isFinished ? (
          <div
            className="flex flex-col items-center gap-5 rounded-(--radius-tray) bg-(--paper) px-6 pt-10 pb-9 text-center shadow-(--shadow-card) sm:px-10"
            role="status"
          >
            {/* The one moment of delight: the seal settles in. */}
            <Seal className="size-24 [animation-delay:120ms]!" stamped />
            <AuthHeading
              className="items-center"
              title={
                organizationName
                  ? `${organizationName} is ready.`
                  : "Your site is ready."
              }
            />
            <p className="-mt-3 flex items-center gap-2 text-[0.9375rem] text-(--secondary)">
              <Spinner className="size-4" />
              Taking you to Settings…
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <AuthHeading
              className="items-center px-2 text-center"
              description={
                isCreate
                  ? "Three short steps. The account you make here is the administrator, and everything can be changed later in Settings."
                  : `You are signed in as ${view.signedInEmail ?? ""}. This account will become the administrator, who decides who may sign up and how email is sent.`
              }
              title={isCreate ? "Set up your site" : "Choose an administrator"}
            />

            <AuthNotice>{bannerMessage}</AuthNotice>

            <form
              className="flex flex-col gap-3"
              noValidate
              onSubmit={handleSubmit}
              ref={formRef}
            >
              <SetupStep
                description="Shown at the top of every page and in every email this site sends."
                id="setup-section-organization"
                number={1}
                state={stepState(0)}
                title="Organization"
              >
                <FormField
                  disabled={locked}
                  error={errors.organizationName}
                  label="Organization name"
                >
                  <Input
                    autoComplete="organization"
                    name="setup-organization-name"
                    onChange={handleChange("organizationName")}
                    placeholder="Acme Corp"
                    value={values.organizationName}
                  />
                </FormField>
              </SetupStep>

              {isCreate ? (
                <SetupStep
                  description="The administrator account. You will log in with it."
                  id="setup-section-you"
                  number={2}
                  state={stepState(1)}
                  title="You"
                >
                  <FormField
                    disabled={locked}
                    error={errors.fullName}
                    label="Your name"
                  >
                    <Input
                      autoComplete="name"
                      name="setup-full-name"
                      onChange={handleChange("fullName")}
                      placeholder="Jane Smith"
                      value={values.fullName}
                    />
                  </FormField>
                  <FormField
                    disabled={locked}
                    error={errors.email}
                    hint={signupStart ?? undefined}
                    label="Your email"
                  >
                    <Input
                      // "username" tells password managers this is the login
                      // the new password belongs to, so they save the two
                      // together.
                      autoComplete="username"
                      inputMode="email"
                      name="setup-email"
                      onChange={handleChange("email")}
                      placeholder="jane@acmecorp.com"
                      type="email"
                      value={values.email}
                    />
                  </FormField>
                  <FormField
                    disabled={locked}
                    error={errors.password}
                    hint={passwordHint(values.password.trim().length)}
                    label="Password"
                  >
                    <Input
                      autoComplete="new-password"
                      maxLength={128}
                      minLength={15}
                      name="setup-password"
                      onChange={handleChange("password")}
                      {...passwordRules}
                      type="password"
                      value={values.password}
                    />
                  </FormField>
                </SetupStep>
              ) : null}

              {asksForSupport || asksForSender ? (
                <SetupStep
                  description="Where people write for help, and where this site's email comes from."
                  id="setup-section-email"
                  number={sections.length}
                  state={stepState(sections.length - 1)}
                  title="Email"
                >
                  {asksForSupport ? (
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
                        onChange={handleChange("supportAddress")}
                        placeholder="help@acmecorp.com"
                        type="email"
                        value={values.supportAddress}
                      />
                    </FormField>
                  ) : null}

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
                </SetupStep>
              ) : null}

              <div
                className={cn(
                  "flex flex-col gap-5",
                  requiresToken &&
                    "rounded-(--radius-card) bg-(--paper) p-5 shadow-(--shadow-card) sm:p-6",
                  !requiresToken && "pt-3",
                )}
              >
                {requiresToken ? (
                  <FormField
                    disabled={locked}
                    error={errors.setupToken}
                    hint="The value of the SETUP_TOKEN environment variable on this deployment. It proves you run this site."
                    label="Setup token"
                  >
                    <Input
                      autoComplete="off"
                      // Not a password of the account being made, so a
                      // password manager should neither fill nor save it.
                      data-1p-ignore="true"
                      data-lpignore="true"
                      name="setup-token"
                      onChange={handleChange("setupToken")}
                      type="password"
                      value={values.setupToken}
                    />
                  </FormField>
                ) : null}

                <Button
                  className="w-full"
                  loading={isSubmitting}
                  size="lg"
                  type="submit"
                >
                  {submitLabel}
                </Button>
              </div>
            </form>

            {!isCreate ? (
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
        )}
      </StepSwap>
    </AutoHeight>
  );
}

type StepState = "current" | "done" | "upcoming";

/**
 * One step of setup as a card: a marker (its number, or a check once the
 * step is done), the title and one line, then the fields. The step being
 * filled is lifted; the ones still to come sit quieter on the page.
 */
function SetupStep({
  children,
  description,
  id,
  number,
  state,
  title,
}: {
  children: ReactNode;
  description: string;
  id: string;
  number: number;
  state: StepState;
  title: string;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "scroll-mt-8 rounded-(--radius-card) p-5 transition-[background-color,box-shadow] duration-(--dur-open) ease-(--ease-out) sm:p-6",
        state === "upcoming"
          ? "bg-[rgb(var(--paper-rgb)/0.55)] shadow-(--ring-faint)"
          : "bg-(--paper) shadow-(--shadow-card)",
      )}
      id={id}
    >
      <div className="mb-5 flex items-start gap-3.5">
        <StepMarker number={number} state={state} />
        <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
          <h2
            className="text-base leading-6 font-semibold tracking-[-0.015em] text-(--fg)"
            id={`${id}-title`}
          >
            {title}
            {state === "done" ? <span className="sr-only"> (done)</span> : null}
          </h2>
          <p className="text-sm leading-5 text-pretty text-(--secondary)">
            {description}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </section>
  );
}

/** A 32px circle: the step's number, morphing to a check when it is done. */
function StepMarker({ number, state }: { number: number; state: StepState }) {
  const reduceMotion = useReducedMotion();
  const done = state === "done";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold tabular-nums transition-colors duration-(--dur-move) ease-(--ease-out)",
        done
          ? "bg-(--success-soft) text-(--success)"
          : state === "current"
            ? "bg-(--accent) text-(--on-accent)"
            : "bg-(--surface-strong) text-(--secondary-strong)",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex"
          exit={{
            opacity: 0,
            scale: reduceMotion ? 1 : 0.6,
            transition: { duration: DUR.hover, ease: EASE.exit },
          }}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
          key={done ? "done" : "number"}
          transition={reduceMotion ? { duration: DUR.hover } : SPRING_SNAPPY}
        >
          {done ? (
            <Check className="size-4" strokeWidth={2.25} />
          ) : (
            String(number)
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
