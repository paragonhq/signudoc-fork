"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  AuthFormFoot,
  AuthHeading,
  AuthNotice,
  OrDivider,
  textActionClassName,
} from "@/components/auth/auth-parts";
import { ForgotPasswordTray } from "@/components/auth/forgot-password-tray";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { SecondStepForm } from "@/components/auth/second-step-form";
import {
  describeSsoError,
  SsoButton,
  type SsoOption,
} from "@/components/auth/sso-button";
import { AutoHeight } from "@/components/public/auto-height";
import { StepSwap } from "@/components/public/step-swap";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { loginSchema } from "@/lib/schemas/auth";
import {
  describePasswordRefusal,
  PASSWORD_TOO_LONG_MESSAGE,
} from "@/lib/password-messages";

const verificationRequiredMessage =
  "Verify your email before logging in. Check your inbox for a fresh link.";

type AuthErrorLike = {
  code?: string;
  message?: string;
};

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

type Banner = { message: string; tone: "danger" | "success" } | null;

type LoginShellProps = {
  /** "on", "off", or "fallback": off, but a few addresses may still use one. */
  passwordSignIn?: "fallback" | "off" | "on";
  resetError?: string | null;
  resetToken?: string | null;
  sso?: SsoOption | null;
  /** The ?error= single sign-on came back with. */
  ssoError?: string | null;
};

function normalizeAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
): string {
  return error?.message?.trim().toLowerCase() ?? "";
}

function danger(message: string | null): Banner {
  return message ? { message, tone: "danger" } : null;
}

export function LoginShell(props: LoginShellProps) {
  if (props.resetToken) {
    return <ResetPasswordForm resetToken={props.resetToken} />;
  }

  return <LiveLoginShell {...props} />;
}

/*
 * Sign in. One card: email and password, then (for accounts with two-step
 * sign-in) the code, in the same place; the card changes height and the
 * steps cross over instead of a new page loading. Single sign-on comes
 * first when the install has it. "Forgot password?" opens a tray.
 */
function LiveLoginShell({
  passwordSignIn = "on",
  resetError = null,
  sso = null,
  ssoError = null,
}: LoginShellProps) {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [banner, setBanner] = useState<Banner>(
    danger(
      resetError === "INVALID_TOKEN"
        ? "This reset link is invalid or has expired."
        : ssoError
          ? describeSsoError(ssoError)
          : null,
    ),
  );
  // With password sign-in off, the form is only shown on request, for the
  // few addresses that keep a password for when single sign-on is down.
  const [showPasswordForm, setShowPasswordForm] = useState(
    passwordSignIn === "on",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  // The password was right and the account uses two-step sign-in.
  const [needsSecondStep, setNeedsSecondStep] = useState(false);

  function handleChange(field: keyof LoginFormValues) {
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
      setBanner(null);
      setShowResendVerification(false);
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isSignedIn) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const trimmedValues = {
      email: String(formData.get("login-email") ?? values.email).trim(),
      password: String(formData.get("login-password") ?? values.password),
    };
    const validationResult = loginSchema.safeParse(trimmedValues);

    if (!validationResult.success) {
      const nextErrors: LoginFormErrors = {};

      for (const issue of validationResult.error.issues) {
        const field = issue.path[0];

        if (field === "email") {
          nextErrors.email = "Enter a valid email address";
        }

        if (field === "password") {
          nextErrors.password = "Enter your password";
        }
      }

      setValues(trimmedValues);
      setErrors(nextErrors);
      setBanner(null);
      return;
    }

    setValues(validationResult.data);
    setErrors({});
    setBanner(null);
    setShowResendVerification(false);
    setIsSubmitting(true);

    const result = await authClient.signIn.email({
      email: validationResult.data.email,
      password: validationResult.data.password,
    });

    if (result.error) {
      const normalizedErrorMessage = normalizeAuthErrorMessage(result.error);
      const errorCode = (result.error as AuthErrorLike).code;

      if (
        errorCode === "SIGN_IN_LOCKED" ||
        errorCode === "PASSWORD_SIGN_IN_OFF"
      ) {
        setBanner(
          danger(
            result.error.message ??
              "Too many wrong passwords. Try again in 15 minutes.",
          ),
        );
      } else if (normalizedErrorMessage.includes("email not verified")) {
        setBanner(danger(verificationRequiredMessage));
        setShowResendVerification(true);
      } else if (
        describePasswordRefusal(result.error) === PASSWORD_TOO_LONG_MESSAGE
      ) {
        // No account has a password this long, so it cannot be right. Say
        // why instead of "Something went wrong" (issue #57).
        setErrors({ password: PASSWORD_TOO_LONG_MESSAGE });
      } else {
        setBanner(
          danger(
            normalizedErrorMessage.includes("invalid email or password")
              ? "Invalid email or password. Please try again."
              : "Something went wrong. Please try again.",
          ),
        );
      }
      setIsSubmitting(false);
      return;
    }

    if (
      result.data &&
      typeof result.data === "object" &&
      "twoFactorRedirect" in result.data
    ) {
      setNeedsSecondStep(true);
      setIsSubmitting(false);
      return;
    }

    // Keep the button busy while the dashboard loads.
    setIsSignedIn(true);
    router.replace("/dashboard");
  }

  async function handleResendVerification() {
    const email = values.email.trim();

    if (!email || isResendingVerification) {
      return;
    }

    setIsResendingVerification(true);

    try {
      const response = await fetch("/api/auth/send-verification-email", {
        body: JSON.stringify({
          callbackURL: `${window.location.origin}/dashboard`,
          email,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setBanner(danger("We couldn't resend the verification email."));
        return;
      }

      setBanner({
        message: "Verification email sent. Check your inbox.",
        tone: "success",
      });
      setShowResendVerification(false);
    } catch {
      setBanner(danger("We couldn't resend the verification email."));
    } finally {
      setIsResendingVerification(false);
    }
  }

  const formLocked = isSubmitting || isSignedIn;

  return (
    <>
      <AutoHeight innerClassName="relative">
        <StepSwap
          direction={needsSecondStep ? 1 : -1}
          stepKey={needsSecondStep ? "second-step" : "password"}
        >
          {needsSecondStep ? (
            <SecondStepForm
              onRestart={(message) => {
                setNeedsSecondStep(false);
                setValues((currentValues) => ({
                  ...currentValues,
                  password: "",
                }));
                setBanner(danger(message));
              }}
              onSignedIn={() => router.replace("/dashboard")}
            />
          ) : (
            <div className="flex flex-col gap-6">
              <AuthHeading title="Log in" />

              <AuthNotice tone={banner?.tone}>{banner?.message}</AuthNotice>

              {sso ? (
                <div className="flex flex-col gap-5">
                  <SsoButton
                    onError={(message) => setBanner(danger(message))}
                    sso={sso}
                    variant={showPasswordForm ? "secondary" : "primary"}
                  />
                  {showPasswordForm ? <OrDivider /> : null}
                </div>
              ) : null}

              {showPasswordForm ? (
                <form
                  className="flex flex-col gap-5"
                  noValidate
                  onSubmit={handleSubmit}
                >
                  <FormField
                    disabled={formLocked}
                    error={errors.email}
                    label="Email"
                  >
                    <Input
                      autoComplete="email"
                      inputMode="email"
                      name="login-email"
                      onChange={handleChange("email")}
                      placeholder="jane@acmecorp.com"
                      type="email"
                      value={values.email}
                    />
                  </FormField>
                  <FormField
                    disabled={formLocked}
                    error={errors.password}
                    label="Password"
                    labelAside={
                      <button
                        className={textActionClassName}
                        disabled={formLocked}
                        onClick={() => setForgotOpen(true)}
                        type="button"
                      >
                        Forgot password?
                      </button>
                    }
                  >
                    <Input
                      autoComplete="current-password"
                      name="login-password"
                      onChange={handleChange("password")}
                      type="password"
                      value={values.password}
                    />
                  </FormField>
                  <AuthFormFoot>
                    <Button
                      className="w-full"
                      loading={formLocked}
                      size="lg"
                      type="submit"
                    >
                      Log in
                    </Button>
                    {showResendVerification ? (
                      <Button
                        className="w-full"
                        loading={isResendingVerification}
                        onClick={handleResendVerification}
                        size="lg"
                        type="button"
                        variant="outline"
                      >
                        Resend verification email
                      </Button>
                    ) : null}
                  </AuthFormFoot>
                </form>
              ) : passwordSignIn === "fallback" ? (
                <button
                  className={textActionClassName}
                  onClick={() => setShowPasswordForm(true)}
                  type="button"
                >
                  Sign in with a password instead
                </button>
              ) : null}
            </div>
          )}
        </StepSwap>
      </AutoHeight>

      <ForgotPasswordTray
        initialEmail={values.email.trim()}
        onOpenChange={setForgotOpen}
        open={forgotOpen}
      />
    </>
  );
}
