"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { MailCheck } from "@/components/ui/icons";

import { AuthNotice, IconTile } from "@/components/auth/auth-parts";
import { AutoHeight } from "@/components/public/auto-height";
import { StepSwap } from "@/components/public/step-swap";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactFormSchema } from "@/lib/schemas/contact";

type ContactFormValues = {
  company: string;
  email: string;
  message: string;
  name: string;
};

type ContactFormErrors = Partial<
  Record<Exclude<keyof ContactFormValues, "company">, string>
>;

type ContactApiPayload = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
} | null;

const defaultValues: ContactFormValues = {
  company: "",
  email: "",
  message: "",
  name: "",
};

function readApiErrorMessage(payload: ContactApiPayload): string {
  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  return "Something went wrong. Please try again.";
}

export function ContactForm() {
  const [values, setValues] = useState<ContactFormValues>(defaultValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleChange(field: keyof ContactFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value;

      setValues((currentValues) => ({
        ...currentValues,
        [field]: nextValue,
      }));

      if (field !== "company") {
        setErrors((currentErrors) => ({
          ...currentErrors,
          [field]: undefined,
        }));
      }

      setSubmitError(null);
      setSuccessMessage(null);
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const submittedValues = {
      company: String(formData.get("company") ?? values.company),
      email: String(formData.get("contact-email") ?? values.email),
      message: String(formData.get("contact-message") ?? values.message),
      name: String(formData.get("contact-name") ?? values.name),
    };
    const validationResult = contactFormSchema.safeParse(submittedValues);

    if (!validationResult.success) {
      const nextErrors: ContactFormErrors = {};

      for (const issue of validationResult.error.issues) {
        const field = issue.path[0];

        if (field === "name") {
          nextErrors.name = "Enter your name";
        }

        if (field === "email") {
          nextErrors.email = "Enter a valid email address";
        }

        if (field === "message") {
          nextErrors.message =
            issue.code === "too_big"
              ? "Message must be 5000 characters or fewer"
              : "Enter a message";
        }
      }

      setValues(submittedValues);
      setErrors(nextErrors);
      setSubmitError(null);
      setSuccessMessage(null);
      return;
    }

    setValues(validationResult.data);
    setErrors({});
    setSubmitError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        body: JSON.stringify(validationResult.data),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as ContactApiPayload;

      if (!response.ok) {
        setErrors({
          email:
            typeof payload?.fieldErrors?.email === "string"
              ? payload.fieldErrors.email
              : undefined,
          message:
            typeof payload?.fieldErrors?.message === "string"
              ? payload.fieldErrors.message
              : undefined,
          name:
            typeof payload?.fieldErrors?.name === "string"
              ? payload.fieldErrors.name
              : undefined,
        });
        setSubmitError(readApiErrorMessage(payload));
        return;
      }

      setValues(defaultValues);
      setErrors({});
      setSuccessMessage(
        `Your message was sent. We’ll follow up at ${validationResult.data.email} if we need more detail.`,
      );
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AutoHeight innerClassName="relative">
      <StepSwap stepKey={successMessage ? "sent" : "form"}>
        {successMessage ? (
          <div
            aria-label="Message sent"
            className="flex flex-col items-center gap-5 rounded-(--radius-card) bg-(--paper) px-6 pt-9 pb-7 text-center shadow-(--shadow-card) sm:px-10"
            role="region"
          >
            <IconTile size="lg" tone="success">
              <MailCheck />
            </IconTile>
            <div className="flex flex-col gap-1.5" role="status">
              <p className="text-xl leading-7 font-semibold tracking-[-0.025em] text-(--fg)">
                Message sent
              </p>
              <p className="max-w-[44ch] text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
                {successMessage}
              </p>
            </div>
            <Button onClick={() => setSuccessMessage(null)} variant="outline">
              Send another message
            </Button>
          </div>
        ) : (
          <form
            className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
            noValidate
            onSubmit={handleSubmit}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
            >
              <label htmlFor="company">Company</label>
              <input
                autoComplete="off"
                id="company"
                name="company"
                onChange={handleChange("company")}
                tabIndex={-1}
                value={values.company}
              />
            </div>

            <div className="flex flex-col gap-5 p-5 sm:p-7">
              <AuthNotice>{submitError}</AuthNotice>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  disabled={isSubmitting}
                  error={errors.name}
                  label="Name"
                >
                  <Input
                    autoComplete="name"
                    name="contact-name"
                    onChange={handleChange("name")}
                    placeholder="Your name"
                    value={values.name}
                  />
                </FormField>
                <FormField
                  disabled={isSubmitting}
                  error={errors.email}
                  hint="We reply here."
                  label="Email"
                >
                  <Input
                    autoComplete="email"
                    inputMode="email"
                    name="contact-email"
                    onChange={handleChange("email")}
                    placeholder="you@example.com"
                    type="email"
                    value={values.email}
                  />
                </FormField>
              </div>

              <FormField
                disabled={isSubmitting}
                error={errors.message}
                id="contact-message"
                label="Message"
                labelAside={
                  values.message.length > 4000 ? (
                    <span className="text-[0.8125rem] text-(--secondary) tabular-nums">
                      {(5000 - values.message.length).toLocaleString("en-US")}{" "}
                      left
                    </span>
                  ) : undefined
                }
              >
                <Textarea
                  className="min-h-40"
                  name="contact-message"
                  onChange={handleChange("message")}
                  placeholder="Tell us what you need, and include any account email, sender name, document title, or link that helps us identify the request."
                  value={values.message}
                />
              </FormField>
            </div>

            <div className="flex flex-col-reverse gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:pb-7">
              <p className="text-[0.8125rem] text-(--secondary)">
                Goes to the SignuDoc team.
              </p>
              <Button loading={isSubmitting} size="lg" type="submit">
                Send message
              </Button>
            </div>
          </form>
        )}
      </StepSwap>
    </AutoHeight>
  );
}
