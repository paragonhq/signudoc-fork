"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { ChevronDown, Mail } from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";
import {
  buildSenderAddress,
  DEFAULT_SENDING_SUBDOMAIN,
  joinSendingDomain,
  normalizeSubdomain,
  type SenderAddressParts,
} from "@/lib/sending-domain";

export type SenderErrors = Partial<Record<keyof SenderAddressParts, string>>;

const passwordManagerIgnore = {
  "data-1p-ignore": "true",
  "data-lpignore": "true",
};

/*
 * The address this site sends from, asked for as its parts: the
 * organization's domain (filled in when setup can tell it), a subdomain in
 * front of it ("sign" unless changed) and the name before the @. Together
 * they read as notifications@sign.acmecorp.com.
 *
 * Optional, so it starts folded: one line says what will happen, and the
 * parts open on request (or by themselves when one of them has a problem).
 */
export function SenderFields({
  disabled,
  errors,
  onChange,
  parts,
  serverError,
  source,
}: {
  disabled: boolean;
  errors: SenderErrors;
  onChange: (
    field: keyof SenderAddressParts,
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  parts: SenderAddressParts;
  serverError?: string;
  /** Where the domain shown came from, if setup filled it in. */
  source: "guess" | "integration" | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const built = buildSenderAddress(parts);
  const rootDomain = parts.rootDomain.trim().toLowerCase();
  // The same tidying the saved address gets, so the preview matches it.
  const subdomain = normalizeSubdomain(parts.subdomain) ?? "";
  const sendingDomain = rootDomain
    ? joinSendingDomain(rootDomain, subdomain)
    : null;
  const rootError = errors.rootDomain ?? serverError;
  const hasError = Boolean(rootError || errors.subdomain || errors.localPart);
  const open = expanded || hasError;

  return (
    <div className="rounded-(--radius-well) bg-(--surface)">
      <div className="flex items-center gap-3 py-3 pr-2.5 pl-3.5">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[0.625rem] bg-(--paper) text-(--secondary) shadow-(--ring-faint)">
          <Mail aria-hidden="true" className="size-4 stroke-[1.75]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-(--fg)">Send email from</p>
          <p className="mt-0.5 truncate text-[0.8125rem] text-(--secondary)">
            {built.address ?? "Decide later in Settings"}
          </p>
        </div>
        <Button
          aria-controls="setup-sender-parts"
          aria-expanded={open}
          className="shrink-0"
          disabled={hasError}
          onClick={() => setExpanded((current) => !current)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {open ? "Done" : "Change"}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "transition-transform duration-(--dur-move) ease-(--ease-out)",
              open && "rotate-180",
            )}
          />
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            animate={{
              height: "auto",
              opacity: 1,
              transition: { duration: DUR.panel, ease: EASE.out },
            }}
            className="overflow-hidden"
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                duration: exitDuration(DUR.panel),
                ease: EASE.exit,
              },
            }}
            id="setup-sender-parts"
            initial={{ height: 0, opacity: 0 }}
          >
            <div className="flex flex-col gap-4 px-3.5 pt-1 pb-4">
              <p className="text-[0.8125rem] leading-5 text-(--secondary)">
                Email is sent through Resend from a domain your organization
                owns. Leave the domain empty to decide later in Settings.
              </p>

              <FormField
                disabled={disabled}
                error={rootError}
                hint={
                  source === "integration"
                    ? "The domain the Resend integration was set up with on Vercel."
                    : source === "guess"
                      ? "Filled in from this site's address and the emails above. Change it if your organization uses another domain."
                      : "The domain your organization's email uses, such as acmecorp.com."
                }
                id="setup-sender-domain"
                label="Your domain"
              >
                <Input
                  autoComplete="off"
                  inputMode="url"
                  name="setup-sender-domain"
                  onChange={onChange("rootDomain")}
                  placeholder="acmecorp.com"
                  spellCheck={false}
                  value={parts.rootDomain}
                  {...passwordManagerIgnore}
                />
              </FormField>

              <FormField
                disabled={disabled}
                error={errors.subdomain}
                hint={
                  subdomain
                    ? `Recommended. Mail comes from ${sendingDomain ?? `${subdomain}.acmecorp.com`}, so its DNS records and sending reputation stay apart from your everyday email. Clear it to send from ${rootDomain || "the domain"} itself.`
                    : `Mail will come from ${rootDomain || "the domain"} itself. A subdomain such as ${DEFAULT_SENDING_SUBDOMAIN} keeps it apart from your everyday email.`
                }
                id="setup-sender-subdomain"
                label="Subdomain"
              >
                <SuffixedInput suffix={`.${rootDomain || "acmecorp.com"}`}>
                  <Input
                    autoComplete="off"
                    className="w-36 flex-none"
                    name="setup-sender-subdomain"
                    onChange={onChange("subdomain")}
                    placeholder="none"
                    spellCheck={false}
                    value={parts.subdomain}
                    {...passwordManagerIgnore}
                  />
                </SuffixedInput>
              </FormField>

              <FormField
                disabled={disabled}
                error={errors.localPart}
                hint="Nobody needs to read this mailbox: replies go to the support email."
                id="setup-sender-local-part"
                label="Address"
              >
                <SuffixedInput suffix={`@${sendingDomain ?? "acmecorp.com"}`}>
                  <Input
                    autoComplete="off"
                    className="w-36 flex-none"
                    name="setup-sender-local-part"
                    onChange={onChange("localPart")}
                    spellCheck={false}
                    value={parts.localPart}
                    {...passwordManagerIgnore}
                  />
                </SuffixedInput>
              </FormField>

              {built.address ? (
                <p className="rounded-[0.625rem] bg-(--paper) px-3.5 py-3 text-[0.8125rem] leading-5 text-(--secondary)">
                  Emails will come from{" "}
                  <span className="font-medium break-all text-(--fg)">
                    {built.address}
                  </span>
                  . If Resend is connected, setup adds {built.sendingDomain} to
                  it, and the next screen lists the DNS records to add where
                  your domain is managed.
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SuffixedInput({
  children,
  suffix,
}: {
  children: ReactNode;
  suffix: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {children}
      <span className="min-w-0 truncate text-sm text-(--secondary)">
        {suffix}
      </span>
    </div>
  );
}
