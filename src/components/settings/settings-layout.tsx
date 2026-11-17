"use client";

import { useMemo, type ReactNode } from "react";

import { PageHeader } from "@/components/shared/page-header";
import {
  buildSettingsNav,
  SettingsNav,
} from "@/components/settings/settings-nav";

/**
 * The settings page: its title, the navigation (a calm list beside the
 * content on wide screens, a sticky "you are here" pill on narrow ones)
 * and the groups of sections.
 */
export function SettingsLayout({
  children,
  hosted,
  isAdmin,
}: {
  children: ReactNode;
  /** Accepted for older callers; the header no longer repeats it. */
  email?: string;
  hosted: boolean;
  isAdmin: boolean;
}) {
  const groups = useMemo(
    () => buildSettingsNav({ hosted, isAdmin }),
    [hosted, isAdmin],
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        description={
          isAdmin
            ? "Your own account, and how this site works for everyone."
            : "Your profile, password and how you sign in."
        }
        title="Settings"
      />

      <div className="mt-6 sm:mt-8 xl:grid xl:grid-cols-[14rem_minmax(0,1fr)] xl:gap-12">
        <SettingsNav groups={groups} />
        <div className="flex max-w-[55rem] min-w-0 flex-col gap-16">
          {children}
        </div>
      </div>
    </div>
  );
}
