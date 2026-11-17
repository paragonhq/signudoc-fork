"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Database, KeyRound, UserRoundCheck } from "@/components/ui/icons";

import { AuthBrand } from "@/components/auth/auth-brand";
import { AuthHeading, IconTile } from "@/components/auth/auth-parts";
import { PublicLegalFooter } from "@/components/layout/public-legal-links";
import { SetupForm } from "@/components/setup/setup-form";
import { Button } from "@/components/ui/button";
import type { SetupView } from "@/lib/setup";

export type SetupShellView =
  | Exclude<SetupView, { view: "complete" }>
  | { view: "complete" }
  | { view: "no_database" };

type SetupShellProps = {
  hosted: boolean;
  onVercel: boolean;
  /**
   * A support address setup does not ask for, because SUPPORT_EMAIL sets it
   * or one is saved already. Its domain helps guess the sending domain.
   */
  knownSupportAddress: string | null;
  /** RESEND_EMAIL_DOMAIN, set by the Resend integration on Vercel. */
  resendDomain: string | null;
  /** The host this site answers on, used to guess the sending domain. */
  siteHost: string | null;
  view: SetupShellView;
};

/*
 * First-run setup: the onboarding moment. The same
 * calm column as the auth pages: the app icon on top, then one card that
 * asks one thing at a time (setup-form.tsx). When something has to happen outside the app
 * first (a database, a token), one card says what, in words.
 */
export function SetupShell(props: SetupShellProps) {
  const { view } = props;
  const formView =
    view.view === "create" ||
    (view.view === "claim" && view.tokenConfigured && view.signedInEmail)
      ? view
      : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <main
        className={
          formView
            ? "flex flex-1 flex-col items-center px-2 pt-8 pb-10 sm:px-6 sm:pt-14 sm:pb-16"
            : "flex flex-1 flex-col items-center px-4 pt-12 pb-16 sm:px-6 sm:pt-16"
        }
      >
        <div
          className={
            formView ? "w-full max-w-[30rem]" : "w-full max-w-[26.5rem]"
          }
          data-animate="enter"
        >
          <AuthBrand className={formView ? "mb-6" : "mb-7"} href="/setup" />
          {formView ? (
            <SetupForm
              hosted={props.hosted}
              knownSupportAddress={props.knownSupportAddress}
              resendDomain={props.resendDomain}
              siteHost={props.siteHost}
              view={formView}
            />
          ) : (
            <div className="rounded-(--radius-tray) bg-(--paper) px-6 pt-7 pb-7 shadow-(--shadow-card) sm:px-8 sm:pt-8">
              <SetupNoticeContent {...props} />
            </div>
          )}
        </div>
      </main>

      <PublicLegalFooter centered contentClassName="px-4 sm:px-6" />
    </div>
  );
}

function SetupNoticeContent({ onVercel, view }: SetupShellProps) {
  if (view.view === "no_database") {
    return (
      <SetupNotice icon={<Database />} title="Connect a database">
        <p>
          This site does not have a database yet, so there is nowhere to keep
          accounts or documents.
        </p>
        {onVercel ? (
          <p>
            In Vercel, open this project&apos;s Storage tab, add a Neon Postgres
            database and connect it to the project. Then deploy again and reload
            this page.
          </p>
        ) : (
          <p>
            Set the <code>DATABASE_URL</code> environment variable to a Postgres
            database, run <code>npm run db:migrate</code>, restart the app and
            reload this page.
          </p>
        )}
      </SetupNotice>
    );
  }

  if (view.view === "unmigrated") {
    return (
      <SetupNotice icon={<Database />} title="The database is not ready">
        <p>
          The database is connected, but its tables have not been created or are
          from an older version.
        </p>
        {onVercel ? (
          <p>
            Deploy this project again. Tables are created during a production
            deployment. Then reload this page.
          </p>
        ) : (
          <p>
            Run <code>npm run db:migrate</code>, restart the app and reload this
            page.
          </p>
        )}
      </SetupNotice>
    );
  }

  if (view.view === "claim" && !view.tokenConfigured) {
    return (
      <SetupNotice icon={<KeyRound />} title="Choose an administrator">
        <p>
          This site already has accounts but no administrator. To choose one,
          set the <code>SETUP_TOKEN</code> environment variable to a secret of
          your own, deploy again, and come back to this page.
        </p>
        <p>
          The token is asked for here, so that only someone who controls the
          deployment can become the administrator.
        </p>
      </SetupNotice>
    );
  }

  if (view.view === "claim") {
    return (
      <SetupNotice
        action={
          <Button asChild className="w-full" size="lg">
            <Link href="/login">Go to log in</Link>
          </Button>
        }
        icon={<UserRoundCheck />}
        title="Choose an administrator"
      >
        <p>
          This site already has accounts but no administrator. Sign in with the
          account that should become the administrator, then open this page
          again.
        </p>
      </SetupNotice>
    );
  }

  return null;
}

function SetupNotice({
  action,
  children,
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        icon={<IconTile tone="warning">{icon}</IconTile>}
        title={title}
      />
      <div className="-mt-3 flex flex-col gap-3 text-[0.9375rem] leading-6 text-(--secondary) [&_code]:rounded-md [&_code]:bg-(--surface-strong) [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-(--fg)">
        {children}
      </div>
      {action}
    </div>
  );
}
