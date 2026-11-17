import type { IconComponent } from "@/components/ui/icons";
import Link from "next/link";
import { Check, PenLine, ShieldCheck, Upload } from "@/components/ui/icons";

import { IconTile, type IconTileTone } from "@/components/auth/auth-parts";
import { PublicLegalFooter } from "@/components/layout/public-legal-links";
import { HeroDocument } from "@/components/landing/landing-parts";
import {
  LandingSessionLoginAction,
  LandingSessionPrimaryAction,
} from "@/components/landing/landing-session-actions";
import { PublicHeader } from "@/components/public/public-header";
import { Button } from "@/components/ui/button";

/*
 * The hosted service's landing page: calm and
 * premium in the product's own language. A big plain hero, one product
 * visual, three steps, the price in facts, one closing ask. White cards on
 * the Bond page, nothing shouting.
 */

type Step = {
  body: string;
  icon: IconComponent;
  title: string;
  tone: IconTileTone;
};

const steps: readonly Step[] = [
  {
    body: "Upload the PDF you already have. Add who signs and in what order, then place signature, initials, date, text and checkbox fields.",
    icon: Upload,
    title: "Send",
    tone: "accent",
  },
  {
    body: "Each signer gets a link of their own and signs in the browser. No account, no app. Nudge the slow ones with a reminder.",
    icon: PenLine,
    title: "Sign",
    tone: "warning",
  },
  {
    body: "The finished PDF comes back sealed, with a certificate of every view and signature. Anyone can check a copy against it.",
    icon: ShieldCheck,
    title: "Seal",
    tone: "success",
  },
];

const facts = [
  "Unlimited envelopes",
  "Up to 10 signers per document",
  "Signers never need an account",
  "Reminders included",
  "Audit certificate with every document",
  "Encrypted at rest and in transit",
  "Open source, so you can run it yourself",
] as const;

const sectionTitle =
  "text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.035em] text-balance text-(--fg) sm:text-[2.5rem] sm:leading-[1.1]";

export function LandingShell() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip text-(--fg)">
      <PublicHeader>
        <nav aria-label="Public navigation" className="flex items-center gap-1">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login" prefetch>
              Log in
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup" prefetch>
              Start free
            </Link>
          </Button>
        </nav>
      </PublicHeader>

      <main className="flex-1">
        {/* Hero */}
        <section className="page-width flex flex-col items-center pt-16 pb-24 text-center sm:pt-24 sm:pb-32">
          <div
            className="flex flex-col items-center gap-6"
            data-animate="enter"
          >
            <h1 className="max-w-[14ch] text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-[4.5rem] sm:leading-[1]">
              E-signatures you actually own.
            </h1>
            <p className="max-w-[44ch] text-[1.0625rem] leading-7 text-pretty text-(--secondary) sm:text-lg">
              Upload a PDF, place the fields, send. Free and open source, and
              every finished document is sealed so anyone can check it.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <LandingSessionPrimaryAction />
              <LandingSessionLoginAction />
            </div>
          </div>

          <div
            className="mt-16 w-full sm:mt-20"
            data-animate="enter"
            data-animate-delay="2"
          >
            <HeroDocument />
          </div>
        </section>

        {/* Three steps */}
        <section
          aria-labelledby="steps-title"
          className="page-width pb-24 sm:pb-32"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className={sectionTitle} id="steps-title">
              Three steps. One signed document.
            </h2>
            <p className="max-w-[40ch] text-[1.0625rem] leading-7 text-(--secondary)">
              Your signers don&apos;t need an account. You don&apos;t need a
              template. Nobody needs a sales call.
            </p>
          </div>

          <ol className="mt-12 grid gap-x-5 gap-y-(--card-row-gap) md:grid-cols-3">
            {steps.map((step) => (
              <li
                className="flex flex-col gap-4 rounded-(--radius-card) bg-(--paper) p-6 shadow-(--shadow-card) sm:p-7"
                key={step.title}
              >
                <IconTile tone={step.tone}>
                  <step.icon />
                </IconTile>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg leading-7 font-semibold tracking-[-0.02em] text-(--fg)">
                    {step.title}
                  </h3>
                  <p className="text-[0.9375rem] leading-6 text-(--secondary)">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Price */}
        <section
          aria-labelledby="price-title"
          className="page-width pb-24 sm:pb-32"
        >
          <div className="grid gap-8 rounded-(--radius-tray) bg-(--paper) p-7 shadow-(--shadow-card) sm:p-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-14">
            <div className="flex flex-col items-start gap-4">
              <h2 className={sectionTitle} id="price-title">
                Free. Not a trial.
              </h2>
              <p className="flex items-baseline gap-2">
                <span className="text-[3.5rem] leading-none font-semibold tracking-[-0.045em] tabular-nums">
                  $0
                </span>
                <span className="text-[0.9375rem] text-(--secondary)">
                  a month, for every envelope
                </span>
              </p>
              <p className="max-w-[38ch] text-[0.9375rem] leading-6 text-(--secondary)">
                No credit card and no per-envelope fees. The code is public, so
                you can check all of it, or run it on your own servers.
              </p>
              <div className="pt-2">
                <LandingSessionPrimaryAction />
              </div>
            </div>

            <ul className="flex flex-col divide-y divide-(--divider) self-center">
              {facts.map((fact) => (
                <li
                  className="flex items-center gap-3 py-3 text-[0.9375rem] text-(--fg)"
                  key={fact}
                >
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-(--success-soft) text-(--success)">
                    <Check
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={2.25}
                    />
                  </span>
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing */}
        <section
          aria-labelledby="cta-title"
          className="page-width flex flex-col items-center gap-6 pb-24 text-center sm:pb-32"
        >
          <h2 className={sectionTitle} id="cta-title">
            Put your name on it.
          </h2>
          <p className="max-w-[36ch] text-[1.0625rem] leading-7 text-(--secondary)">
            Your first envelope is a few minutes away.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <LandingSessionPrimaryAction />
            <LandingSessionLoginAction />
          </div>
        </section>
      </main>

      <PublicLegalFooter />
    </div>
  );
}
