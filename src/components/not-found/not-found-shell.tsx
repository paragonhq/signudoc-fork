"use client";

import Link from "next/link";
import { MailQuestionMark } from "@/components/ui/icons";

import { AppIcon } from "@/components/brand/marks";
import { resolveShellState } from "@/components/shared/shell-state";
import { Button } from "@/components/ui/button";

export const notFoundShellStates = ["default", "authenticated"] as const;

export type NotFoundShellState = (typeof notFoundShellStates)[number];

type NotFoundShellProps = {
  initialState?: NotFoundShellState | string | string[] | null;
};

export function resolveNotFoundShellState(
  value?: string | string[] | null,
): NotFoundShellState {
  return resolveShellState(value, notFoundShellStates, "default");
}

/*
 * 404: a friendly icon tile, "No envelope here",
 * one sentence and one way home. Nothing else.
 */
export function NotFoundShell({
  initialState = "default",
}: NotFoundShellProps) {
  const resolvedInitialState = resolveNotFoundShellState(initialState);
  const authenticated = resolvedInitialState === "authenticated";
  const ctaHref = authenticated ? "/dashboard" : "/";
  const ctaLabel = authenticated ? "Go to Dashboard" : "Go to Home";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Link
          aria-label="SignuDoc home"
          className="rounded-lg outline-none transition-opacity duration-(--dur-hover) ease-(--ease-out) hover:opacity-80 focus-visible:shadow-(--focus-ring)"
          href="/"
        >
          <AppIcon className="size-8 rounded-[0.5rem]" />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-24">
        <div
          className="flex max-w-[26rem] flex-col items-center gap-6 text-center"
          data-animate="enter"
        >
          <span
            aria-hidden="true"
            className="inline-flex size-16 items-center justify-center rounded-[1.25rem] bg-(--paper) text-(--secondary) shadow-(--shadow-card-flat)"
          >
            <MailQuestionMark className="size-7 stroke-[1.75]" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-[1.75rem] leading-9 font-semibold tracking-[-0.03em] text-(--fg)">
              No envelope here
            </h1>
            <p className="text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
              The link may be old or mistyped, or what it pointed to was
              removed. If someone sent it to you, ask them for a fresh one.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
