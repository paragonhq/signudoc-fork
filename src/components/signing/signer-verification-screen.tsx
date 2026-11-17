"use client";

import {
  KeyRoundIcon,
  MailIcon,
  UserRoundIcon,
  type IconComponent,
} from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SigningVerificationState } from "@/lib/schemas/signing";

import { CodeInput } from "./frame/code-input";
import { SigningFrame } from "./frame/signing-frame";

type Method = SigningVerificationState["required"][number];

/** How long the server waits before it sends another email code. */
const RESEND_SECONDS = 60;
const EMAIL_CODE_LENGTH = 6;

const METHODS: Record<
  Method,
  {
    icon: IconComponent;
    label: string;
    question: string;
  }
> = {
  access_code: {
    icon: KeyRoundIcon,
    label: "Access code",
    question: "Enter your code",
  },
  account: {
    icon: UserRoundIcon,
    label: "Password",
    question: "Sign in to your account",
  },
  email_code: {
    icon: MailIcon,
    label: "Code from your email",
    question: "Enter your code",
  },
};

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Seconds now, ticking once a second while `active`. Null before mount. */
function useNowSeconds(active: boolean) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));

    tick();

    if (!active) {
      return;
    }

    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, [active]);

  return now;
}

/**
 * The checks a sender can ask for before the document opens: an access
 * code, a code by email, or the signer's own account. One calm card per
 * question, one at a time; "Step 1 of 2" when there is more than one.
 */
export function SignerVerificationScreen({
  state,
  token,
}: {
  state: SigningVerificationState;
  token: string;
}) {
  const router = useRouter();
  const method = state.pending[0]!;
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(
    method === "email_code" ? state.emailCodeSentAt : null,
  );
  const [maskedEmail, setMaskedEmail] = useState(state.maskedEmail);
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isOpening, startOpening] = useTransition();
  const base = `/api/signing/${encodeURIComponent(token)}`;
  const copy = METHODS[method];
  const stepIndex = state.required.indexOf(method);
  const hasSteps = state.required.length > 1;
  const now = useNowSeconds(sentAt !== null);
  const resendIn =
    sentAt === null || now === null
      ? 0
      : Math.max(0, sentAt + RESEND_SECONDS - now);
  const isBusy = isChecking || isOpening;

  async function sendCode() {
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`${base}/verify/email-code`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        emailCodeSentAt?: number;
        error?: string;
        maskedEmail?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error ?? "The code could not be sent right now.");
        return;
      }

      setSentAt(payload?.emailCodeSentAt ?? Math.floor(Date.now() / 1000));
      setMaskedEmail(payload?.maskedEmail ?? state.maskedEmail);
    } catch {
      setError("The code could not be sent right now.");
    } finally {
      setIsSending(false);
    }
  }

  async function check(value: string) {
    if (isBusy) {
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(`${base}/verify`, {
        body: JSON.stringify(
          method === "account"
            ? { email, method, password: value }
            : { code: value, method },
        ),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error ?? "The code could not be checked right now.");

        if (method === "email_code") {
          setCode("");
        }

        return;
      }

      // The server reads the new cookie and answers with the next check or
      // the document; this screen is replaced in place.
      startOpening(() => router.refresh());
    } catch {
      setError("The code could not be checked right now.");
    } finally {
      setIsChecking(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void check(code);
  }

  const canSubmit =
    method === "email_code"
      ? code.length === EMAIL_CODE_LENGTH
      : code.trim().length > 0 &&
        (method !== "account" || email.trim().length > 0);
  let codeField: ReactNode;

  if (method === "email_code") {
    codeField = (
      <FormField
        error={error}
        hint={
          sentAt === null
            ? undefined
            : `Sent to ${maskedEmail}. It works for 10 minutes.`
        }
        label={copy.label}
      >
        <CodeInput
          disabled={isBusy}
          name="signer-code"
          onChange={(value) => {
            setCode(value);
            setError(null);
          }}
          onComplete={(value) => void check(value)}
          value={code}
        />
      </FormField>
    );
  } else {
    codeField = (
      <FormField error={error} label={copy.label}>
        <Input
          autoComplete={
            method === "account" ? "current-password" : "one-time-code"
          }
          autoFocus={method === "access_code"}
          className="h-12 text-base"
          disabled={isBusy}
          name="signer-code"
          onChange={(event) => {
            setCode(event.target.value);
            setError(null);
          }}
          spellCheck={false}
          type={method === "account" ? "password" : "text"}
          value={code}
        />
      </FormField>
    );
  }

  const helper =
    method === "email_code"
      ? sentAt === null
        ? `We'll email a 6-digit code to ${maskedEmail}.`
        : "Type the 6-digit code from the email."
      : method === "account"
        ? `This document is signed with your own account. Use the address it was sent to (${state.maskedEmail}).`
        : "The sender gave you this code separately, for example by phone.";

  return (
    <SigningFrame mainClassName="pb-[10vh]">
      <div className="flex w-full max-w-[26rem] flex-col gap-6">
        <div className="px-2 text-center" data-animate="enter">
          <h1 className="text-[1.75rem] leading-9 font-semibold tracking-[-0.03em] text-balance text-(--fg) max-sm:text-2xl">
            Confirm it&apos;s you
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
            {state.senderName} asked for a quick check before you open &ldquo;
            {state.envelopeTitle}&rdquo;.
          </p>
        </div>

        <form
          aria-labelledby="signer-check-question"
          className="flex flex-col rounded-(--radius-card) bg-(--paper) p-5 shadow-(--shadow-card) sm:p-6"
          data-animate="enter"
          data-animate-delay="1"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--accent-softer) text-(--accent-ink) [&_svg]:size-5 [&_svg]:stroke-[1.75]"
            >
              <copy.icon />
            </span>
            <div className="min-w-0">
              {hasSteps ? (
                <p className="text-[0.8125rem] leading-5 font-medium text-(--secondary) tabular-nums">
                  Step {stepIndex + 1} of {state.required.length}
                </p>
              ) : null}
              <h2
                className="text-[1.0625rem] leading-6 font-semibold tracking-[-0.015em] text-(--fg)"
                id="signer-check-question"
              >
                {copy.question}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-5 text-pretty text-(--secondary)">
            {helper}
          </p>

          <div className="mt-5 flex flex-col gap-4">
            {method === "account" ? (
              <FormField label="Email address">
                <Input
                  autoComplete="username"
                  autoFocus
                  className="h-12 text-base"
                  disabled={isBusy}
                  inputMode="email"
                  name="signer-email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                  }}
                  type="email"
                  value={email}
                />
              </FormField>
            ) : null}
            {method === "email_code" && sentAt === null ? null : codeField}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {method === "email_code" && sentAt === null ? (
              <Button
                className="h-12 w-full"
                loading={isSending}
                onClick={sendCode}
                size="lg"
                type="button"
              >
                <MailIcon aria-hidden="true" />
                Email me a code
              </Button>
            ) : (
              <Button
                className="h-12 w-full"
                disabled={!canSubmit && !isBusy}
                loading={isBusy}
                size="lg"
                type="submit"
              >
                Continue
              </Button>
            )}
            {method === "email_code" && sentAt !== null ? (
              <Button
                className="w-full"
                disabled={resendIn > 0 || isBusy}
                loading={isSending}
                onClick={sendCode}
                type="button"
                variant="ghost"
              >
                {resendIn > 0 ? (
                  <span>
                    Send a new code in{" "}
                    <span className="tabular-nums">
                      {formatCountdown(resendIn)}
                    </span>
                  </span>
                ) : (
                  "Send a new code"
                )}
              </Button>
            ) : null}
            {method === "email_code" && sentAt === null && error ? (
              <p
                className="rounded-(--radius-well) bg-(--danger-soft) px-4 py-3 text-[0.8125rem] leading-5 text-(--danger)"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </SigningFrame>
  );
}
