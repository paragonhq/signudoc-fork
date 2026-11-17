// The look of every email SignuDoc sends.
//
// Email programs are not browsers: Outlook draws with Word, Gmail strips
// <style> blocks in many places, and pictures are often hidden until the
// reader asks. So everything here is tables and inline styles, sized for a
// 560px column that shrinks on a phone, in the system font when Geist is
// not installed. The one <style> block only tidies the phone width and dark
// mode; the message reads the same without it.
//
// Every helper that takes text escapes it. Helpers that take "Html" take
// markup built by these helpers, never text from a person.

import { buildBrandPalette, DEFAULT_BRAND_PALETTE } from "../brand-color.ts";
import { SIGNUDOC_NAME, type Branding } from "../branding.ts";
import { escapeHtml } from "../utils/html.ts";

const COLORS = {
  /** Bond: the page behind the card. */
  page: "#F3F2EE",
  card: "#FFFFFF",
  /** Carbon. */
  text: "#0D0B14",
  muted: "#6B6976",
  /** Inner wells: the document card, the code. */
  well: "#F6F5F2",
  rule: "#E9E7E1",
};

const FONT_STACK =
  "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO_STACK =
  "'Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/** The colours a message takes from the organization. */
export type EmailTheme = {
  /** Buttons and the wordmark tile. White text on it is readable. */
  accent: string;
  /** A pale tint of the accent, for the document tile. */
  tint: string;
};

export const DEFAULT_EMAIL_THEME: EmailTheme = {
  accent: DEFAULT_BRAND_PALETTE.accent,
  tint: DEFAULT_BRAND_PALETTE.accentSoft,
};

/**
 * The organization's own colour, darkened until white text on it is
 * readable, or Ink violet. The hosted service always uses its own.
 */
export function emailTheme(branding: Branding | null | undefined): EmailTheme {
  const palette =
    branding && !branding.hosted && branding.brandColor
      ? buildBrandPalette(branding.brandColor)
      : null;

  return palette
    ? { accent: palette.accent, tint: palette.accentSoft }
    : DEFAULT_EMAIL_THEME;
}

function textStyle(size: number, lineHeight: number, color: string): string {
  return `margin:0;font-family:${FONT_STACK};font-size:${String(size)}px;line-height:${String(lineHeight)}px;color:${color};`;
}

/** The page title. */
export function emailHeading(text: string): string {
  return `<h1 class="em-text em-h1" style="${textStyle(22, 30, COLORS.text)}font-weight:600;letter-spacing:-0.02em;padding:0 0 12px;">${escapeHtml(text)}</h1>`;
}

/** A paragraph of plain text. */
export function emailParagraph(text: string): string {
  return emailParagraphHtml(escapeHtml(text));
}

/** A paragraph of markup built from escaped parts (see emailStrong). */
export function emailParagraphHtml(html: string): string {
  return `<p class="em-text" style="${textStyle(15, 24, COLORS.text)}padding:0 0 16px;">${html}</p>`;
}

/** Small grey text: reassurance, fine print, what to ignore. */
export function emailNote(text: string): string {
  return `<p class="em-muted" style="${textStyle(13, 20, COLORS.muted)}padding:0 0 8px;">${escapeHtml(text)}</p>`;
}

/** Escaped text in the heavier weight, for use inside emailParagraphHtml. */
export function emailStrong(text: string): string {
  return `<strong style="font-weight:600;">${escapeHtml(text)}</strong>`;
}

/** Vertical space. */
export function emailSpacer(height: number): string {
  return `<div style="height:${String(height)}px;line-height:${String(height)}px;font-size:1px;">&nbsp;</div>`;
}

/**
 * The one thing to do. A table cell carries the colour so Outlook, which
 * ignores padding on links, still draws a button; the link fills the cell
 * so the whole pill can be tapped.
 */
export function emailButton(input: {
  label: string;
  theme?: EmailTheme;
  url: string;
}): string {
  const accent = (input.theme ?? DEFAULT_EMAIL_THEME).accent;
  const href = escapeHtml(input.url);

  return [
    '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-collapse:separate;">',
    "<tr>",
    `<td align="center" bgcolor="${accent}" style="border-radius:999px;background-color:${accent};">`,
    `<a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:15px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;">`,
    '<!--[if mso]><i style="mso-font-width:150%;mso-text-raise:28pt" hidden>&emsp;</i><![endif]-->',
    `<span style="mso-text-raise:14pt;color:#FFFFFF;">${escapeHtml(input.label)}</span>`,
    '<!--[if mso]><i style="mso-font-width:150%" hidden>&emsp;&#8203;</i><![endif]-->',
    "</a>",
    "</td>",
    "</tr>",
    "</table>",
  ].join("");
}

/** A quieter second action: a plain link on its own line. */
export function emailSecondaryLink(input: {
  label: string;
  theme?: EmailTheme;
  url: string;
}): string {
  const accent = (input.theme ?? DEFAULT_EMAIL_THEME).accent;

  return `<p style="${textStyle(14, 22, COLORS.text)}padding:0 0 16px;"><a href="${escapeHtml(input.url)}" target="_blank" style="color:${accent};font-weight:500;text-decoration:underline;">${escapeHtml(input.label)}</a></p>`;
}

/**
 * The document the message is about: a small page icon, its title, and a
 * line or two about it ("From Riley Chen", "Sign by …").
 */
export function emailDocumentCard(input: {
  lines?: readonly string[];
  theme?: EmailTheme;
  title: string;
}): string {
  const tint = (input.theme ?? DEFAULT_EMAIL_THEME).tint;
  const lines = (input.lines ?? [])
    .map(
      (line) =>
        `<p class="em-muted" style="${textStyle(13, 20, COLORS.muted)}">${escapeHtml(line)}</p>`,
    )
    .join("");
  // A sheet of paper with two lines of writing, drawn with cells so it
  // needs no picture.
  const pageIcon = [
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="40" style="width:40px;border-collapse:separate;"><tr><td class="em-tile" width="40" height="48" align="center" valign="middle" bgcolor="${tint}" style="width:40px;height:48px;border-radius:10px;background-color:${tint};">`,
    '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="20" style="width:20px;border-collapse:separate;"><tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:3px;padding:6px 4px 9px;">',
    `<div style="height:2px;line-height:2px;font-size:1px;background-color:${tint};margin:0 0 3px;">&nbsp;</div>`,
    `<div style="height:2px;line-height:2px;font-size:1px;background-color:${tint};width:8px;">&nbsp;</div>`,
    "</td></tr></table>",
    "</td></tr></table>",
  ].join("");

  return [
    `<table role="presentation" class="em-well" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${COLORS.well}" style="width:100%;border-collapse:separate;background-color:${COLORS.well};border-radius:14px;margin:4px 0 24px;">`,
    "<tr>",
    `<td width="40" valign="top" style="width:40px;padding:16px 0 16px 16px;">${pageIcon}</td>`,
    `<td valign="middle" style="padding:16px 16px 16px 14px;">`,
    `<p class="em-text" style="${textStyle(15, 22, COLORS.text)}font-weight:600;word-break:break-word;">${escapeHtml(input.title)}</p>`,
    lines,
    "</td>",
    "</tr>",
    "</table>",
  ].join("");
}

/** Label and value pairs, one per row: who declined, and why. */
export function emailDetails(
  rows: ReadonlyArray<{ label: string; value: string }>,
): string {
  const body = rows
    .map(
      (row, index) =>
        `<tr><td class="em-muted" valign="top" style="${textStyle(14, 22, COLORS.muted)}padding:${index === 0 ? "0" : "10px"} 16px 0 0;width:120px;">${escapeHtml(row.label)}</td>` +
        `<td class="em-text" valign="top" style="${textStyle(14, 22, COLORS.text)}padding:${index === 0 ? "0" : "10px"} 0 0;word-break:break-word;white-space:pre-line;">${escapeHtml(row.value)}</td></tr>`,
    )
    .join("");

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:4px 0 24px;">${body}</table>`;
}

/** A longer piece of someone's own words, set apart (a contact message). */
export function emailQuote(text: string): string {
  return `<table role="presentation" class="em-well" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${COLORS.well}" style="width:100%;border-collapse:separate;background-color:${COLORS.well};border-radius:14px;margin:4px 0 24px;"><tr><td class="em-text" style="${textStyle(14, 22, COLORS.text)}padding:16px 18px;white-space:pre-line;word-break:break-word;">${escapeHtml(text)}</td></tr></table>`;
}

/** A one-time code, large and spaced so it can be read and typed. */
export function emailCode(code: string): string {
  return [
    `<table role="presentation" class="em-well" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${COLORS.well}" style="width:100%;border-collapse:separate;background-color:${COLORS.well};border-radius:14px;margin:8px 0 24px;">`,
    `<tr><td align="center" style="padding:22px 12px;">`,
    `<p class="em-text" style="margin:0;font-family:${MONO_STACK};font-size:34px;line-height:40px;font-weight:600;letter-spacing:10px;color:${COLORS.text};padding-left:10px;">${escapeHtml(code)}</p>`,
    "</td></tr></table>",
  ].join("");
}

/**
 * The top of the message: the organization's logo, or its name. The
 * hosted service shows the S tile beside its name.
 */
export function emailWordmark(
  name: string,
  theme: EmailTheme = DEFAULT_EMAIL_THEME,
): string {
  const label = `<span class="em-text" style="font-family:${FONT_STACK};font-size:16px;line-height:24px;font-weight:600;letter-spacing:-0.01em;color:${COLORS.text};">${escapeHtml(name)}</span>`;

  if (name !== SIGNUDOC_NAME) {
    return label;
  }

  return [
    '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>',
    `<td width="24" height="24" align="center" valign="middle" bgcolor="${theme.accent}" style="width:24px;height:24px;border-radius:7px;background-color:${theme.accent};font-family:${FONT_STACK};font-size:14px;line-height:24px;font-weight:700;color:#FFFFFF;">S</td>`,
    `<td style="padding-left:8px;">${label}</td>`,
    "</tr></table>",
  ].join("");
}

/** The organization's logo, fetched from this site. */
export function emailLogo(input: { alt: string; src: string }): string {
  return `<img src="${escapeHtml(input.src)}" alt="${escapeHtml(input.alt)}" height="32" style="display:block;height:32px;width:auto;max-width:200px;border:0;outline:none;text-decoration:none;font-family:${FONT_STACK};font-size:16px;font-weight:600;color:${COLORS.text};" />`;
}

/**
 * Lines under the card: legal links, the support address, who sent it.
 * Each entry is markup built from escaped parts.
 */
export function emailFooter(linesHtml: readonly string[]): string {
  return linesHtml
    .map(
      (line) =>
        `<p class="em-muted" style="${textStyle(12, 18, COLORS.muted)}padding:0 0 6px;">${line}</p>`,
    )
    .join("");
}

/** A quiet link for the footer. */
export function emailFooterLink(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" target="_blank" style="color:${COLORS.muted};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

const PREHEADER_PADDING = "&#847;&zwnj;&nbsp;".repeat(60);

/**
 * The whole message: the preview line, the header, a white card on Bond,
 * and the footer under it.
 */
export function renderEmailDocument(input: {
  contentHtml: string;
  footerHtml?: string;
  headerHtml?: string;
  /** What the inbox shows after the subject. Plain text. */
  preheader?: string;
}): string {
  const preheader = input.preheader?.trim()
    ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLORS.page};opacity:0;">${escapeHtml(input.preheader.trim())}${PREHEADER_PADDING}</div>`
    : "";
  const header = input.headerHtml
    ? `<tr><td class="em-pad-x" style="padding:0 8px 20px;">${input.headerHtml}</td></tr>`
    : "";
  const footer = input.footerHtml
    ? `<tr><td class="em-pad-x" style="padding:24px 8px 0;">${input.footerHtml}</td></tr>`
    : "";

  return [
    "<!DOCTYPE html>",
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<meta name="x-apple-disable-message-reformatting" />',
    '<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />',
    '<meta name="color-scheme" content="light dark" />',
    '<meta name="supported-color-schemes" content="light dark" />',
    "<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->",
    "<style>",
    "body{margin:0;padding:0;}",
    "a{text-decoration-thickness:1px;text-underline-offset:2px;}",
    "@media (max-width:600px){.em-card{padding:28px 22px !important;border-radius:16px !important;}.em-outer{padding:20px 12px 32px !important;}.em-h1{font-size:20px !important;line-height:28px !important;}}",
    "@media (prefers-color-scheme:dark){.em-bg{background-color:#0D0B14 !important;}.em-card{background-color:#1A1822 !important;}.em-well{background-color:#25222E !important;}.em-text{color:#F3F2EE !important;}.em-muted{color:#A9A6B4 !important;}.em-tile{background-color:#2F2A4A !important;}}",
    "</style>",
    "</head>",
    `<body class="em-bg" style="margin:0;padding:0;background-color:${COLORS.page};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">`,
    preheader,
    `<table role="presentation" class="em-bg" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${COLORS.page}" style="width:100%;background-color:${COLORS.page};">`,
    `<tr><td align="center" class="em-outer" style="padding:40px 16px 48px;">`,
    '<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560"><tr><td><![endif]-->',
    '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;max-width:560px;">',
    header,
    "<tr>",
    `<td class="em-card" bgcolor="${COLORS.card}" style="background-color:${COLORS.card};border-radius:20px;padding:40px;box-shadow:0 0 0 1px rgba(13,11,20,0.04),0 1px 2px rgba(13,11,20,0.04),0 6px 20px -8px rgba(13,11,20,0.08);">`,
    input.contentHtml,
    "</td>",
    "</tr>",
    footer,
    "</table>",
    "<!--[if mso]></td></tr></table><![endif]-->",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}

/**
 * For messages to the organization's own people that are built without
 * its branding at hand (expiry and retention notices, internal alerts):
 * the card alone, with a plain line underneath saying where it came from.
 */
export function renderPlainEmail(input: {
  contentHtml: string;
  footerText?: string;
  preheader?: string;
  productName?: string;
}): string {
  return renderEmailDocument({
    contentHtml: input.contentHtml,
    footerHtml: input.footerText
      ? emailFooter([escapeHtml(input.footerText)])
      : undefined,
    headerHtml: input.productName
      ? emailWordmark(input.productName)
      : undefined,
    preheader: input.preheader,
  });
}
