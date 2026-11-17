"use client";

import {
  ArrowUpRightIcon,
  MailIcon,
  RotateCcwIcon,
} from "@/components/ui/icons";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import { useBranding } from "@/components/layout/branding-provider";
import { Button } from "@/components/ui/button";
import { SigningFrame } from "./frame/signing-frame";
import { StateIllustration, type StateBadge } from "./frame/state-illustration";
import type { SigningUnavailableState } from "./live/field-logic";

export type SigningStateScreenState =
  SigningUnavailableState | "declined-by-you";

type StateCopy = {
  badge: StateBadge;
  description: string;
  /** The page no longer counts: drawn faded. */
  muted?: boolean;
  title: string;
};

function getCopy(
  state: SigningStateScreenState,
  senderName: string | undefined,
): StateCopy {
  switch (state) {
    case "expired":
      return {
        description: "Ask the sender for a new signing link.",
        badge: "clock",
        title: "This link has expired",
      };
    case "already-signed":
      return {
        description:
          "You already signed this document. Your copy comes by email.",
        badge: "signed",
        title: "You've already signed",
      };
    case "voided":
      return {
        description:
          "The sender cancelled this document. Nothing else is needed from you.",
        badge: "void",
        muted: true,
        title: "This envelope has been voided",
      };
    case "declined":
      return {
        description:
          "Someone declined this document. Nothing else is needed from you.",
        badge: "declined",
        muted: true,
        title: "This envelope has been declined",
      };
    case "declined-by-you":
      return {
        description: `${senderName ?? "The sender"} has been told. Nothing was signed, and nothing else is needed from you.`,
        badge: "declined",
        muted: true,
        title: "You declined to sign",
      };
    default:
      return {
        description:
          "We couldn't load this document. Your link still works, so try again in a moment.",
        badge: "error",
        title: "Something went wrong. Please try again.",
      };
  }
}

/**
 * Where a signing link ends up when there is no document to sign: expired,
 * voided, declined, already signed, or an error. One calm card: a small
 * drawing of the page with a badge that says what happened, one sentence,
 * and at most one thing to do.
 */
export function SigningStateScreen({
  focusHeading,
  senderName,
  state,
}: {
  /**
   * Move focus to the heading when this screen replaces the document in
   * place (after a decline), so a screen reader reads the outcome out.
   */
  focusHeading?: boolean;
  senderName?: string;
  state: SigningStateScreenState;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocus = focusHeading ?? state === "declined-by-you";

  useEffect(() => {
    if (shouldFocus) {
      headingRef.current?.focus();
    }
  }, [shouldFocus]);

  const { organizationName, productName, supportAddress } = useBranding();
  const copy = getCopy(state, senderName);
  const contactName = organizationName ?? productName;
  let action: ReactNode = null;

  if (state === "error") {
    action = (
      <Button onClick={() => window.location.reload()} size="lg">
        <RotateCcwIcon aria-hidden="true" />
        Try again
      </Button>
    );
  } else if (state === "already-signed") {
    action = (
      <Button asChild size="lg" variant="outline">
        <Link href="/verify">
          Check a signed copy
          <ArrowUpRightIcon aria-hidden="true" />
        </Link>
      </Button>
    );
  } else if (supportAddress && state !== "declined-by-you") {
    action = (
      <Button asChild size="lg" variant="outline">
        <a href={`mailto:${supportAddress}`}>
          <MailIcon aria-hidden="true" />
          {state === "expired"
            ? "Ask for a new link"
            : `Contact ${contactName}`}
        </a>
      </Button>
    );
  }

  return (
    <SigningFrame mainClassName="pb-[12vh] sm:pb-[14vh]">
      <section
        aria-labelledby="signing-state-title"
        className="flex w-full max-w-[26rem] flex-col items-center rounded-(--radius-card) bg-(--paper) px-6 pt-8 pb-8 text-center shadow-(--shadow-card) sm:px-10"
        data-animate="enter"
      >
        <div className="flex w-full justify-center rounded-[calc(var(--radius-card)-0.5rem)] bg-(--page) pt-5 pb-3">
          <StateIllustration
            badge={copy.badge}
            className="w-44"
            muted={copy.muted}
          />
        </div>
        <h1
          className="mt-6 text-xl leading-7 font-semibold tracking-[-0.02em] text-balance text-(--fg) outline-none"
          id="signing-state-title"
          ref={headingRef}
          tabIndex={-1}
        >
          {copy.title}
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
          {copy.description}
        </p>
        {action ? (
          <div className="mt-7 flex w-full justify-center max-sm:*:w-full">
            {action}
          </div>
        ) : null}
      </section>
    </SigningFrame>
  );
}
