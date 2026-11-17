import { SIGNUDOC_NAME, type Branding } from "./branding.ts";
import { getDb, type DbExecutor } from "./db/connection.ts";
import { createEmailService, type EmailService } from "./services/email.ts";
import { withUserEmailLegalFooter } from "./services/email-legal-footer.ts";
import {
  emailButton,
  emailHeading,
  emailNote,
  emailParagraph,
  emailTheme,
} from "./services/email-layout.ts";
import {
  MAX_INVITATIONS_PER_REQUEST,
  invitationRequestSchema,
  inviteeSignupProblem,
  parseInviteeList,
} from "./team-invitation-rules.ts";
import { getEnv, type EnvSource } from "./utils/env.ts";

export {
  MAX_INVITATIONS_PER_REQUEST,
  invitationRequestSchema,
  inviteeSignupProblem,
  parseInviteeList,
};

// Inviting teammates: an email that says who invited them and where, with
// one button to the sign-up page, their address already filled in. Nothing
// is stored. Whether they may create an account is still decided by the
// install's sign-up rule when they do, so an invitation never lets in
// anyone the rule would not.

/** The sign-up page, with the address filled in. */
export function buildInvitationLink(appUrl: string, email: string): string {
  const url = new URL("/signup", appUrl);

  url.searchParams.set("email", email);

  return url.toString();
}

export type TeamInvitationContent = {
  htmlBody: string;
  subject: string;
  textBody: string;
};

export function buildTeamInvitationEmail({
  appUrl,
  branding,
  env = process.env,
  inviterName,
  to,
}: {
  appUrl: string;
  branding: Branding;
  env?: EnvSource;
  inviterName: string;
  to: string;
}): TeamInvitationContent {
  const organization = branding.organizationName?.trim() || SIGNUDOC_NAME;
  const inviter = inviterName.trim() || "Your administrator";
  const link = buildInvitationLink(appUrl, to);
  const where =
    organization === SIGNUDOC_NAME
      ? SIGNUDOC_NAME
      : `${organization} on ${SIGNUDOC_NAME}`;
  const subject = `${inviter} invited you to ${where}`;
  const lead = `${inviter} invited you to send and sign documents with ${organization}. Create your account with this email address (${to}) to join.`;
  const content = withUserEmailLegalFooter(
    {
      htmlBody: [
        emailHeading(subject),
        emailParagraph(lead),
        emailButton({
          label: "Create your account",
          theme: emailTheme(branding),
          url: link,
        }),
        emailNote(
          "Not expecting this? You can ignore it. Nothing happens until you create an account.",
        ),
      ].join(""),
      preheader: `Create your account to join ${organization}.`,
      textBody: [
        subject,
        "",
        lead,
        "",
        "Create your account:",
        link,
        "",
        "Not expecting this? You can ignore it. Nothing happens until you create an account.",
      ].join("\n"),
    },
    branding,
    env,
  );

  return { htmlBody: content.htmlBody, subject, textBody: content.textBody };
}

/** Which of these addresses already belong to an account here. */
export async function findExistingAccounts(
  emails: readonly string[],
  database: DbExecutor = getDb(),
): Promise<Set<string>> {
  if (emails.length === 0) {
    return new Set();
  }

  const result = await database.query<{ email: string }>(
    `select lower(email) as email from public."user" where lower(email) = any($1::text[])`,
    [emails.map((email) => email.toLowerCase())],
  );

  return new Set(result.rows.map((row) => row.email));
}

export type InvitationOutcome = {
  /** Already have an account, so nothing was sent. */
  alreadyMembers: string[];
  failed: Array<{ email: string; message: string }>;
  sent: string[];
};

/**
 * Sends one invitation to each address, skipping people who already have
 * an account. One failed delivery does not stop the rest.
 */
export async function sendTeamInvitations({
  branding,
  database,
  emailService,
  emails,
  env = process.env,
  inviter,
}: {
  branding: Branding;
  database?: DbExecutor;
  emailService?: EmailService;
  emails: readonly string[];
  env?: EnvSource;
  inviter: { email: string; name: string };
}): Promise<InvitationOutcome> {
  const appUrl = getEnv(env).appUrl;

  if (!appUrl) {
    throw new Error("APP_URL is needed to link to the sign-up page.");
  }

  const existing = await findExistingAccounts(emails, database);
  const outcome: InvitationOutcome = {
    alreadyMembers: [],
    failed: [],
    sent: [],
  };
  const service = emailService ?? createEmailService({ env });

  for (const email of emails) {
    if (existing.has(email.toLowerCase())) {
      outcome.alreadyMembers.push(email);
      continue;
    }

    const content = buildTeamInvitationEmail({
      appUrl,
      branding,
      env,
      inviterName: inviter.name,
      to: email,
    });

    try {
      await service.send({
        htmlBody: content.htmlBody,
        replyTo: inviter.email,
        subject: content.subject,
        template: "team_invitation",
        textBody: content.textBody,
        to: email,
      });
      outcome.sent.push(email);
    } catch (error) {
      outcome.failed.push({
        email,
        message:
          error instanceof Error && error.message
            ? error.message
            : "The invitation could not be sent.",
      });
    }
  }

  return outcome;
}
