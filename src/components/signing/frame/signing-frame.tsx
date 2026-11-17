"use client";

import type { ReactNode } from "react";

import { PublicLegalFooter } from "@/components/layout/public-legal-links";
import { cn } from "@/lib/cn";

import { OrgMark } from "./org-mark";

/**
 * The page a signer lands on when there is no document to work on: an
 * identity check, a link that no longer works, or the finish line. The
 * organization's mark on the page's own ground, the content centred, and
 * the footer with its own links. No rules, no decoration.
 */
export function SigningFrame({
  children,
  className,
  mainClassName,
}: {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
}) {
  return (
    <div className={cn("flex min-h-dvh flex-col text-(--fg)", className)}>
      <header className="pt-[env(safe-area-inset-top)]">
        <div className="page-width flex h-16 items-center">
          <OrgMark />
        </div>
      </header>
      <main
        className={cn(
          "mx-auto flex w-full max-w-[1080px] flex-1 flex-col items-center justify-center px-4 pt-6 pb-16 sm:px-10 sm:pb-24",
          mainClassName,
        )}
      >
        {children}
      </main>
      <PublicLegalFooter />
    </div>
  );
}
