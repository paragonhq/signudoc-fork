"use client";

import Link from "next/link";
import {
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type FormEvent,
} from "react";

import { Lock, MailCheck } from "@/components/ui/icons";

import {
  AuthFormFoot,
  AuthHeading,
  AuthNotice,
  IconTile,
  OrDivider,
  textActionClassName,
} from "@/components/auth/auth-parts";
import { SsoButton, type SsoOption } from "@/components/auth/sso-button";
import { AutoHeight } from "@/components/public/auto-height";
import { StepSwap } from "@/components/public/step-swap";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import {
  describePasswordRefusal,
  newPasswordLengthError,
  PASSWORD_TOO_SHORT_MESSAGE,
} from "@/lib/password-messages";
import { signUpSchema } from "@/lib/schemas/auth";

const defaultSuccessMessage = "Check your email to verify your sender account.";

type AuthErrorLike = {
  code?: string;
  message?: string;
};

// Codes the server answers with when this install's sign-up rule turns an
// address away. The message that comes with them says what the rule is.
const SIGNUP_RULE_ERROR_CODES = new Set([
  "setup_required",
  "signup_closed",
  "signup_domain_not_allowed",
]);

type SignupShellProps = {
  /** An address to start with, from an invitation's link (?email=). */
  initialEmail?: string;
  /** False when password sign-in is turned off, so accounts come from SSO. */
  passwordSignIn?: boolean;
  /** Single sign-on, when the install has it (lib/auth/sso.ts). */
  sso?: SsoOption | null;
  /** False when this install is not taking new accounts at all. */
  signupAvailable?: boolean;
  /** One sentence on who can create an account, or null when anyone can. */
  signupRule?: string | null;
};

type SignupFormValues = {
  email: string;
  fullName: string;
  password: string;
};

type SignupFormErrors = Partial<Record<keyof SignupFormValues, string>>;

function createSignupFormValues(email = ""): SignupFormValues {
  return {
    email,
    fullName: "",
    password: "",
  };
}

function trimFormValues(values: SignupFormValues): SignupFormValues {
  return {
    email: values.email.trim(),
    fullName: values.fullName.trim(),
    password: values.password,
  };
}

function normalizeAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
): string {
  return error?.message?.trim().toLowerCase() ?? "";
}

type SignupFormCardProps = {
  bannerMessage: string | null;
  errors: SignupFormErrors;
  formLocked: boolean;
  isResendingVerification?: boolean;
  isSubmitting: boolean;
  onEmailChange: ChangeEventHandler<HTMLInputElement>;
  onFullNameChange: ChangeEventHandler<HTMLInputElement>;
  onPasswordChange: ChangeEventHandler<HTMLInputElement>;
  onResendVerification?: () => void | Promise<void>;
  onStartOver: () => void;
  onSsoError: (message: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  passwordSignIn: boolean;
  showSuccess: boolean;
  signupRule: string | null;
  sso: SsoOption | null;
  successEmail: string | null;
  successMessage: string | null;
  values: SignupFormValues;
};

function SignupFormCard({
  bannerMessage,
  errors,
  formLocked,
  isResendingVerification = false,
  isSubmitting,
  onEmailChange,
  onFullNameChange,
  onPasswordChange,
  onResendVerification,
  onStartOver,
  onSsoError,
  onSubmit,
  passwordSignIn,
  showSuccess,
  signupRule,
  sso,
  successEmail,
  successMessage,
  values,
}: SignupFormCardProps) {
  return (
    <AutoHeight innerClassName="relative">
      <StepSwap stepKey={showSuccess ? "sent" : "form"}>
        {showSuccess ? (
          <div className="flex flex-col gap-6">
            <AuthHeading
              icon={
                <IconTile tone="accent">
                  <MailCheck />
                </IconTile>
              }
              title="Check your inbox"
            >
              <div aria-live="polite" className="flex flex-col gap-1">
                <p className="text-[0.9375rem] leading-6 text-(--secondary)">
                  {successMessage ?? defaultSuccessMessage}
                </p>
                {successEmail ? (
                  <p className="text-[0.9375rem] leading-6 text-(--secondary)">
                    We sent it to{" "}
                    <span className="font-medium break-all text-(--fg)">
                      {successEmail}
                    </span>
                    .
                  </p>
                ) : null}
              </div>
            </AuthHeading>

            <AuthNotice>{bannerMessage}</AuthNotice>

            <div className="flex flex-col gap-2.5">
              <Button asChild className="w-full" size="lg">
                <Link href="/login">Go to log in</Link>
              </Button>
              {onResendVerification ? (
                <Button
                  className="w-full"
                  loading={isResendingVerification}
                  onClick={onResendVerification}
                  size="lg"
                  type="button"
                  variant="outline"
                >
                  Resend verification email
                </Button>
              ) : null}
            </div>
            <div className="-mt-1 flex justify-center">
              <button
                className={textActionClassName}
                disabled={formLocked}
                onClick={onStartOver}
                type="button"
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <AuthHeading
              description={
                signupRule ??
                "Send documents for signature and keep every signed copy. Signers never need an account."
              }
              title="Create your account"
            />

            <AuthNotice>{bannerMessage}</AuthNotice>

            {sso ? (
              <div className="flex flex-col gap-5">
                <SsoButton
                  onError={onSsoError}
                  sso={sso}
                  variant={passwordSignIn ? "secondary" : "primary"}
                />
                {passwordSignIn ? <OrDivider /> : null}
              </div>
            ) : null}

            {passwordSignIn ? (
              <form
                className="flex flex-col gap-5"
                noValidate
                onSubmit={onSubmit}
              >
                <FormField
                  disabled={formLocked}
                  error={errors.fullName}
                  label="Full name"
                >
                  <Input
                    autoComplete="name"
                    name="signup-full-name"
                    onChange={onFullNameChange}
                    placeholder="Jane Smith"
                    value={values.fullName}
                  />
                </FormField>
                <FormField
                  disabled={formLocked}
                  error={errors.email}
                  label="Email"
                >
                  <Input
                    autoComplete="email"
                    inputMode="email"
                    name="signup-email"
                    onChange={onEmailChange}
                    placeholder="jane@acmecorp.com"
                    type="email"
                    value={values.email}
                  />
                </FormField>
                <FormField
                  disabled={formLocked}
                  error={errors.password}
                  hint={passwordHint(values.password.length)}
                  label="Password"
                >
                  <Input
                    autoComplete="new-password"
                    name="signup-password"
                    onChange={onPasswordChange}
                    type="password"
                    value={values.password}
                  />
                </FormField>
                <AuthFormFoot>
                  <Button
                    className="w-full"
                    loading={isSubmitting}
                    size="lg"
                    type="submit"
                  >
                    Sign up
                  </Button>
                </AuthFormFoot>
              </form>
            ) : null}
          </div>
        )}
      </StepSwap>
    </AutoHeight>
  );
}

/**
 * The password rule in words, counting down as the password grows, so
 * nobody has to count characters or read a meter.
 */
export function passwordHint(length: number, minimum = 15) {
  if (length === 0) {
    return `At least ${minimum} characters. Let your password manager make one.`;
  }

  const left = minimum - length;

  if (left <= 0) {
    return "Long enough.";
  }

  return left === 1 ? "1 more character." : `${left} more characters.`;
}

export function SignupShell({
  initialEmail = "",
  passwordSignIn = true,
  signupAvailable = true,
  signupRule = null,
  sso = null,
}: SignupShellProps) {
  if (!signupAvailable) {
    return <SignupClosedCard />;
  }

  return (
    <LiveSignupShell
      initialEmail={initialEmail}
      passwordSignIn={passwordSignIn || !sso}
      signupRule={signupRule}
      sso={sso}
    />
  );
}

function SignupClosedCard() {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        description="New accounts are not being accepted on this site. If you were sent a document to sign, use the link in that email. You do not need an account."
        icon={
          <IconTile>
            <Lock />
          </IconTile>
        }
        title="Sign-up is closed"
      />
      <AuthFormFoot>
        <Button asChild className="w-full" size="lg">
          <Link href="/login">Go to log in</Link>
        </Button>
      </AuthFormFoot>
    </div>
  );
}

function LiveSignupShell({
  initialEmail,
  passwordSignIn,
  signupRule,
  sso,
}: {
  initialEmail: string;
  passwordSignIn: boolean;
  signupRule: string | null;
  sso: SsoOption | null;
}) {
  const [values, setValues] = useState<SignupFormValues>(
    createSignupFormValues(initialEmail),
  );
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleChange(field: keyof SignupFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setValues((currentValues) => ({
        ...currentValues,
        [field]: nextValue,
      }));

      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
      setBannerMessage(null);
      setShowSuccess(false);
      setSuccessMessage(null);
    };
  }

  async function handleResendVerification() {
    if (!successEmail || isResendingVerification) {
      return;
    }

    setBannerMessage(null);
    setIsResendingVerification(true);

    try {
      const response = await fetch("/api/auth/send-verification-email", {
        body: JSON.stringify({
          callbackURL: `${window.location.origin}/dashboard`,
          email: successEmail,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setBannerMessage("We couldn't resend the verification email.");
        return;
      }

      setSuccessMessage("Verification email sent. Check your inbox.");
    } catch {
      setBannerMessage("We couldn't resend the verification email.");
    } finally {
      setIsResendingVerification(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isResendingVerification) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const trimmedValues = trimFormValues({
      email: String(formData.get("signup-email") ?? values.email),
      fullName: String(formData.get("signup-full-name") ?? values.fullName),
      password: String(formData.get("signup-password") ?? values.password),
    });
    const validationResult = signUpSchema.safeParse(trimmedValues);

    if (!validationResult.success) {
      const nextErrors: SignupFormErrors = {};

      for (const issue of validationResult.error.issues) {
        const field = issue.path[0];

        if (field === "email") {
          nextErrors.email = "Enter a valid email address";
        }

        if (field === "fullName") {
          nextErrors.fullName = "Enter your full name";
        }

        if (field === "password") {
          nextErrors.password =
            newPasswordLengthError(trimmedValues.password) ??
            PASSWORD_TOO_SHORT_MESSAGE;
        }
      }

      setValues(trimmedValues);
      setErrors(nextErrors);
      setBannerMessage(null);
      setShowSuccess(false);
      setSuccessMessage(null);
      return;
    }

    setValues(validationResult.data);
    setErrors({});
    setBannerMessage(null);
    setShowSuccess(false);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await authClient.signUp.email({
      callbackURL: `${window.location.origin}/dashboard`,
      email: validationResult.data.email,
      name: validationResult.data.fullName,
      password: validationResult.data.password,
    });

    if (result.error) {
      const normalizedErrorMessage = normalizeAuthErrorMessage(result.error);

      if (SIGNUP_RULE_ERROR_CODES.has(result.error.code ?? "")) {
        setBannerMessage(
          result.error.message ?? "New accounts are not being accepted.",
        );
      } else if (
        normalizedErrorMessage.includes("user already exists") ||
        normalizedErrorMessage.includes("use another email")
      ) {
        setErrors({
          email: "This email is already registered",
        });
      } else if (describePasswordRefusal(result.error)) {
        setErrors({
          password: describePasswordRefusal(result.error)!,
        });
      } else {
        setBannerMessage("Something went wrong. Please try again.");
      }

      setIsSubmitting(false);
      return;
    }

    setSuccessEmail(validationResult.data.email);
    setSuccessMessage(defaultSuccessMessage);
    setShowSuccess(true);
    setIsSubmitting(false);
  }

  return (
    <SignupFormCard
      bannerMessage={bannerMessage}
      errors={errors}
      formLocked={isSubmitting || isResendingVerification}
      isResendingVerification={isResendingVerification}
      isSubmitting={isSubmitting}
      onEmailChange={handleChange("email")}
      onFullNameChange={handleChange("fullName")}
      onPasswordChange={handleChange("password")}
      onResendVerification={handleResendVerification}
      onStartOver={() => {
        setShowSuccess(false);
        setSuccessMessage(null);
        setBannerMessage(null);
        setValues((current) => ({ ...current, email: "", password: "" }));
      }}
      onSsoError={setBannerMessage}
      onSubmit={handleSubmit}
      passwordSignIn={passwordSignIn}
      showSuccess={showSuccess}
      signupRule={signupRule}
      sso={sso}
      successEmail={successEmail}
      successMessage={successMessage}
      values={values}
    />
  );
}
