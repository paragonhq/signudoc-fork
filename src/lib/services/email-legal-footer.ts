import { SIGNUDOC_NAME, type Branding } from "../branding.ts";
import { getEnv, type EnvSource } from "../utils/env.ts";
import { escapeHtml } from "../utils/html.ts";
import {
  emailFooter,
  emailFooterLink,
  emailLogo,
  emailTheme,
  emailWordmark,
  renderEmailDocument,
} from "./email-layout.ts";
import { requireConfigValue } from "./service-config.ts";

type EmailBodyContent = {
  /** The message's own content, built with the helpers in email-layout.ts. */
  htmlBody: string;
  /** What the inbox shows after the subject. Plain text. */
  preheader?: string;
  textBody: string;
};

type FooterLink = {
  label: string;
  url: string;
};

// Links may be pages on this site ("/terms") or the organization's own
// absolute URLs. Either way the email gets an absolute URL.
function buildFooterLinks(branding: Branding, env: EnvSource): FooterLink[] {
  const candidates: Array<[label: string, url: string | null]> = [
    ["Terms of Service", branding.termsUrl],
    // Without the organization's own policy, the notice built from the
    // install's settings.
    branding.privacyUrl || branding.hosted
      ? ["Privacy Policy", branding.privacyUrl]
      : ["Privacy notice", getEnv(env).appUrl ? "/signer-privacy" : null],
    ["Contact", branding.contactUrl],
  ];
  const links = candidates.filter((candidate): candidate is [string, string] =>
    Boolean(candidate[1]),
  );

  if (links.length === 0) {
    return [];
  }

  const appUrl = requireConfigValue("app", "APP_URL", getEnv(env).appUrl);

  return links.map(([label, url]) => ({
    label,
    url: new URL(url, appUrl).toString(),
  }));
}

/**
 * The top of an email: the install's logo, or its name when it has none.
 * Email programs fetch the logo from this site, so it needs the site's
 * address; many hide pictures until asked, which is why the name is the
 * alt text.
 */
function buildHeader(branding: Branding, env: EnvSource): string {
  const appUrl = getEnv(env).appUrl;
  const theme = emailTheme(branding);

  if (!branding.logoUrl || !appUrl) {
    return emailWordmark(branding.productName, theme);
  }

  return emailLogo({
    alt: branding.productName,
    src: new URL(branding.logoUrl, appUrl).toString(),
  });
}

/**
 * Puts a message in the shared email layout (see email-layout.ts) and adds
 * the footer every email to a person carries: the install's terms, privacy
 * and contact links, where it has them. On a neutral install the footer
 * also names the organization's support address and says the message was
 * sent with SignuDoc. The organization's logo, when it has one, goes at
 * the top; otherwise its name does.
 */
export function withUserEmailLegalFooter(
  input: EmailBodyContent,
  branding: Branding,
  env: EnvSource = process.env,
): EmailBodyContent {
  const links = buildFooterLinks(branding, env);
  const textLines: string[] = [];
  const htmlLines: string[] = [];

  for (const link of links) {
    textLines.push("", `${link.label}:`, link.url);
  }

  if (links.length > 0) {
    htmlLines.push(
      links
        .map((link) => emailFooterLink(link.label, link.url))
        .join("&nbsp;&nbsp;&middot;&nbsp;&nbsp;"),
    );
  }

  if (!branding.hosted) {
    if (branding.supportAddress) {
      textLines.push("", `Questions? Contact ${branding.supportAddress}.`);
      htmlLines.push(
        `Questions? Contact ${emailFooterLink(branding.supportAddress, `mailto:${branding.supportAddress}`)}.`,
      );
    }

    const sentBy = branding.organizationName
      ? `Sent by ${branding.organizationName} using ${SIGNUDOC_NAME}.`
      : `Sent using ${SIGNUDOC_NAME}.`;

    textLines.push("", sentBy);
    htmlLines.push(escapeHtml(sentBy));
  }

  return {
    htmlBody: renderEmailDocument({
      contentHtml: input.htmlBody,
      footerHtml: htmlLines.length > 0 ? emailFooter(htmlLines) : undefined,
      headerHtml: buildHeader(branding, env),
      preheader: input.preheader,
    }),
    // Each entry starts with an empty line; one more newline puts that
    // empty line between the message and the footer.
    textBody:
      textLines.length > 0
        ? `${input.textBody}\n${textLines.join("\n")}`
        : input.textBody,
  };
}
