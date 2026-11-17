import { SignupShell } from "@/components/auth/signup-shell";
import { redirectIfSignedIn } from "@/lib/auth/server";
import { readPasswordSignInPolicy, readSsoConfig } from "@/lib/auth/sso";
import { buildBranding } from "@/lib/branding";
import { getSettings } from "@/lib/settings";
import { describeSignupPolicy } from "@/lib/signup-policy";

type SignupPageProps = {
  searchParams?: Promise<{ email?: string | string[] }>;
};

/** The address from an invitation's link, when it looks like one. */
function readInvitedEmail(value: string | string[] | undefined): string {
  const email = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : "";
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  await redirectIfSignedIn();

  const invitedEmail = readInvitedEmail((await searchParams)?.email);

  const settings = await getSettings();
  const sso = readSsoConfig();

  return (
    <SignupShell
      initialEmail={invitedEmail}
      passwordSignIn={readPasswordSignInPolicy().enabled}
      sso={sso ? { name: sso.name } : null}
      signupAvailable={buildBranding(settings).signupAvailable}
      // Says who can sign up before anyone fills the form in. Nothing to
      // say when anyone can.
      signupRule={
        settings.signupMode === "open" ? null : describeSignupPolicy(settings)
      }
    />
  );
}
