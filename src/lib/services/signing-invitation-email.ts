import { type Branding } from "../branding.ts";
import { formatDeadline } from "../envelope-deadline.ts";
import {
  emailButton,
  emailDocumentCard,
  emailHeading,
  emailNote,
  emailParagraph,
  emailTheme,
} from "./email-layout.ts";
import { withUserEmailLegalFooter } from "./email-legal-footer.ts";
import { type TransactionalEmailMessage } from "./email.ts";

type SigningInvitationEmailInput = {
  branding: Branding;
  envelopeTitle: string;
  /** The envelope's deadline, when it has one. */
  expiresAt?: number | null;
  senderName: string;
  signerEmail: string;
  signerName: string;
  signingUrl: string;
};

/** "This request expires on …", or nothing for an envelope with no deadline. */
export function buildDeadlineLine(
  expiresAt: number | null | undefined,
): string | null {
  return typeof expiresAt === "number"
    ? `This request expires on ${formatDeadline(expiresAt)}.`
    : null;
}

/** "Sign by January 15, 2027 at 8:00 AM UTC", or nothing without a deadline. */
function buildSignByLine(expiresAt: number | null | undefined): string | null {
  return typeof expiresAt === "number"
    ? `Sign by ${formatDeadline(expiresAt)}`
    : null;
}

/**
 * The body of a message that asks someone to sign: the invitation and both
 * kinds of reminder share it, so they read as one conversation.
 */
export function buildSigningRequestHtml(input: {
  branding: Branding;
  envelopeTitle: string;
  expiresAt?: number | null;
  heading: string;
  intro: string;
  senderName: string;
  signingUrl: string;
}): string {
  const theme = emailTheme(input.branding);
  const signBy = buildSignByLine(input.expiresAt);

  return [
    emailHeading(input.heading),
    emailParagraph(input.intro),
    emailDocumentCard({
      lines: [`From ${input.senderName}`, ...(signBy ? [signBy] : [])],
      theme,
      title: input.envelopeTitle,
    }),
    emailButton({ label: "Review and sign", theme, url: input.signingUrl }),
    emailNote("Takes about a minute. No account needed."),
    emailNote(
      "If you get a newer invitation or reminder for this document, use the link in the newest one.",
    ),
  ].join("");
}

export function buildSigningInvitationEmail(
  input: SigningInvitationEmailInput,
): TransactionalEmailMessage {
  const { productName } = input.branding;
  const subject = `${input.senderName} requested your signature on "${input.envelopeTitle}"`;
  const deadlineLine = buildDeadlineLine(input.expiresAt);
  const textBody = [
    `Hi ${input.signerName},`,
    "",
    `${input.senderName} sent you "${input.envelopeTitle}" through ${productName}.`,
    "",
    "Review and sign the document here:",
    input.signingUrl,
    ...(deadlineLine ? ["", deadlineLine] : []),
    "",
    "Takes about a minute. No account needed.",
    "If you get a newer invitation or reminder for this document, use the link in the newest one.",
  ].join("\n");
  const htmlBody = buildSigningRequestHtml({
    branding: input.branding,
    envelopeTitle: input.envelopeTitle,
    expiresAt: input.expiresAt,
    heading: `${input.senderName} sent you a document to sign`,
    intro: `Hi ${input.signerName}, open the document to review it and sign where it’s marked.`,
    senderName: input.senderName,
    signingUrl: input.signingUrl,
  });
  const legalFooter = withUserEmailLegalFooter(
    {
      htmlBody,
      preheader: `Review and sign “${input.envelopeTitle}”. It takes about a minute.`,
      textBody,
    },
    input.branding,
  );

  return {
    htmlBody: legalFooter.htmlBody,
    subject,
    template: "signing_invitation",
    textBody: legalFooter.textBody,
    to: input.signerEmail,
  };
}
