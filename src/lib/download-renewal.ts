import { type DbExecutor, getDb } from "./db/connection.ts";
import {
  renewRecipientDownloadLinks,
  type RenewedDownloadLinks,
} from "./downloads.ts";
import { getBranding } from "./settings.ts";
import { recordEmailSent } from "./services/audit.ts";
import { createEmailService, type EmailService } from "./services/email.ts";
import { withUserEmailLegalFooter } from "./services/email-legal-footer.ts";
import {
  emailButton,
  emailDocumentCard,
  emailHeading,
  emailParagraph,
  emailSecondaryLink,
  emailTheme,
} from "./services/email-layout.ts";
import { RECIPIENT_DOWNLOAD_LINK_TTL_SECONDS } from "./types/domain.ts";

const TTL_DAYS = RECIPIENT_DOWNLOAD_LINK_TTL_SECONDS / (24 * 60 * 60);

/** Sends fresh download links to the signer an expired link belonged to. */
export async function sendFreshDownloadLinks(
  token: string,
  {
    database = getDb(),
    emailService = createEmailService(),
  }: { database?: DbExecutor; emailService?: EmailService } = {},
): Promise<RenewedDownloadLinks> {
  const branding = await getBranding();

  return renewRecipientDownloadLinks(token, {
    database,
    async sendLinks({ envelope, evidenceUrl, signedUrl, signer }) {
      const subject = `New download links for "${envelope.title}"`;
      const textBody = [
        `Hi ${signer.name},`,
        "",
        `Here are new download links for "${envelope.title}" in ${branding.productName}. They work for ${String(TTL_DAYS)} days.`,
        "",
        ...(signedUrl ? [`Signed PDF: ${signedUrl}`] : []),
        `Certificate: ${evidenceUrl}`,
        "",
        "Download and keep the files: they are your copy of the record.",
      ].join("\n");
      const theme = emailTheme(branding);
      const htmlBody = [
        emailHeading("Your new download links"),
        emailParagraph(
          `Hi ${signer.name}, here are fresh links for your copy. Download the files and keep them: they are your copy of the record.`,
        ),
        emailDocumentCard({
          lines: [`Links work for ${String(TTL_DAYS)} days`],
          theme,
          title: envelope.title,
        }),
        signedUrl
          ? emailButton({ label: "Download signed PDF", theme, url: signedUrl })
          : "",
        signedUrl
          ? emailSecondaryLink({
              label: "Download certificate",
              theme,
              url: evidenceUrl,
            })
          : emailButton({
              label: "Download certificate",
              theme,
              url: evidenceUrl,
            }),
      ].join("");
      const body = withUserEmailLegalFooter(
        {
          htmlBody,
          preheader: `Fresh links for “${envelope.title}”. They work for ${String(TTL_DAYS)} days.`,
          textBody,
        },
        branding,
      );
      const delivery = await emailService.send({
        htmlBody: body.htmlBody,
        subject,
        template: "download_links",
        textBody: body.textBody,
        to: signer.email,
      });

      await recordEmailSent(
        {
          envelopeId: envelope.id,
          messageId: delivery.messageId,
          recipient: signer.email,
          signerId: signer.id,
          template: "download_links",
        },
        database,
      );
    },
  });
}
