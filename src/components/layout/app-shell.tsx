"use client";

import { X } from "@/components/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { CommandMenuProvider } from "@/components/command/command-menu";
import { type ShellUser } from "@/components/layout/account-menu";
import { resolveSection } from "@/components/layout/nav-items";
import { PhoneBottomBar, PhoneTopBar } from "@/components/layout/shell-phone";
import { DesktopTopBar } from "@/components/layout/shell-top-bar";
import { TemplateDraftReturn } from "@/components/layout/template-draft-return";

type AppShellProps = {
  children: ReactNode;
  /** Administrators see the organization's places in search. */
  isAdmin?: boolean;
  /** Shown to the administrator until email can reach signers. */
  showEmailSetupNotice?: boolean;
  /**
   * The draft this browser is turning into a template, if any. The builder
   * finishes on the draft's review page; for this draft the shell brings
   * the person back to "Save template" instead.
   */
  templateDraftId?: string | null;
  user: ShellUser;
};

/** Pages that bring their own full-screen chrome inside the workspace. */
function isFullScreen(pathname: string) {
  return /^\/templates\/new\/[^/]+\/fields\/?$/.test(pathname);
}

/*
 * The workspace shell.
 *
 * Desktop: a 64px top bar on the Bond page. It sits flat on the page and
 * only gains a hairline and a soft blur once the page scrolls under it.
 * Left, the app icon and the organization; then the places as quiet text
 * tabs with one white pill that springs to the current one; right, search
 * (⌘K), a violet "New" with its small menu, Settings and the account.
 * Content sits below in one centred 1200px column with room to breathe.
 *
 * Phone: a compact top bar (icon, the place's name cross-fading as you
 * move, search, account) and the floating tab bar in thumb reach with a
 * violet + that opens the "New" tray.
 */
export function AppShell({
  children,
  isAdmin = false,
  showEmailSetupNotice = false,
  templateDraftId = null,
  user,
}: AppShellProps) {
  const pathname = usePathname() ?? "/dashboard";
  const currentSection = resolveSection(pathname);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const showNotice =
    showEmailSetupNotice && !noticeDismissed && currentSection !== "settings";
  const returningToTemplate =
    templateDraftId !== null &&
    new RegExp(`^/envelopes/${escapeRegExp(templateDraftId)}(/|$)`).test(
      pathname,
    );

  if (isFullScreen(pathname)) {
    return (
      <CommandMenuProvider isAdmin={isAdmin}>{children}</CommandMenuProvider>
    );
  }

  return (
    <CommandMenuProvider isAdmin={isAdmin}>
      <div className="flex min-h-dvh flex-col bg-(--page)">
        <DesktopTopBar pathname={pathname} user={user} />
        <PhoneTopBar pathname={pathname} user={user} />

        <main className="flex-1 px-5 pt-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-6 lg:px-10 lg:pt-10 lg:pb-24">
          <div className="mx-auto w-full max-w-[75rem]">
            {showNotice ? (
              <div
                className="mb-8 flex items-start gap-3 rounded-(--radius-well) bg-(--warning-soft) py-3 pr-2 pl-4"
                role="status"
              >
                <p className="flex-1 text-sm leading-6 text-(--fg)">
                  <span className="font-medium">Email is not set up yet.</span>{" "}
                  Signers and new people won&apos;t get messages until it is.{" "}
                  <Link
                    className="font-medium text-(--warning) underline decoration-[rgb(var(--warning-rgb)/0.35)] underline-offset-4 hover:decoration-(--warning)"
                    href="/settings#organization"
                  >
                    Finish email setup
                  </Link>
                </p>
                <button
                  aria-label="Hide this notice"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-(--warning) transition-[background-color,scale] duration-(--dur-hover) hover:bg-[rgb(var(--warning-rgb)/0.08)] active:scale-[0.94]"
                  onClick={() => setNoticeDismissed(true)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ) : null}
            {returningToTemplate && templateDraftId ? (
              <TemplateDraftReturn envelopeId={templateDraftId} />
            ) : (
              children
            )}
          </div>
        </main>

        <PhoneBottomBar currentSection={currentSection} pathname={pathname} />
      </div>
    </CommandMenuProvider>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
