"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AuthBrand } from "@/components/auth/auth-brand";
import { useBranding } from "@/components/layout/branding-provider";
import { PublicLegalFooter } from "@/components/layout/public-legal-links";
import { PublicSessionMenu } from "@/components/layout/public-session-menu";
import { cn } from "@/lib/cn";

type AuthShellProps = {
  children: ReactNode;
};

type AuthNavAction = {
  href: string;
  label: string;
  prompt: string;
};

function getAuthNavAction(pathname: string): AuthNavAction | null {
  if (pathname === "/signup") {
    return { href: "/login", label: "Log in", prompt: "Have an account?" };
  }

  if (pathname === "/login") {
    return { href: "/signup", label: "Sign up", prompt: "New here?" };
  }

  return null;
}

/*
 * The auth layout: one calm white card in the
 * middle of the Bond page, the install's icon and name above it, the one
 * other way in ("New here? Sign up") under it, and the legal links at the
 * foot. Nothing else competes with the form.
 *
 * The forced two-step setup holds a whole settings panel (a card of its
 * own), so it gets a wider column and no card around it.
 */
export function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname() ?? "/login";
  const { signupAvailable } = useBranding();
  const navAction = getAuthNavAction(pathname);
  // No "Sign up" link to a page that would only say sign-up is closed.
  const showNavAction =
    navAction !== null && (navAction.href !== "/signup" || signupAvailable);
  const wide = pathname.startsWith("/two-step-setup");

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Only someone already signed in has anything up here. */}
      <div className="flex h-12 items-center justify-end px-4 sm:h-16 sm:px-6">
        <PublicSessionMenu />
      </div>

      <main className="flex flex-1 flex-col items-center px-4 pt-2 pb-16 sm:justify-center sm:px-6 sm:pt-0">
        <div
          className={cn("w-full", wide ? "max-w-[40rem]" : "max-w-[26.5rem]")}
          data-animate="enter"
        >
          <AuthBrand className="mb-7" />

          {wide ? (
            children
          ) : (
            <div className="rounded-(--radius-tray) bg-(--paper) px-6 pt-7 pb-6 shadow-(--shadow-card) sm:px-8 sm:pt-8 sm:pb-8">
              {children}
            </div>
          )}

          {showNavAction && navAction ? (
            <p className="mt-6 text-center text-sm text-(--secondary)">
              {navAction.prompt}{" "}
              <Link
                className="rounded-md px-0.5 font-medium text-(--accent-ink) underline-offset-4 outline-none hover:underline focus-visible:shadow-(--focus-ring)"
                href={navAction.href}
                prefetch
              >
                {navAction.label}
              </Link>
            </p>
          ) : null}
        </div>
      </main>

      <PublicLegalFooter centered contentClassName="px-4 sm:px-6" />
    </div>
  );
}
