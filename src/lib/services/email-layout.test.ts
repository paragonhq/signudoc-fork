import assert from "node:assert/strict";
import { test } from "node:test";

import { HOSTED_BRANDING, type Branding } from "../branding.ts";
import {
  DEFAULT_EMAIL_THEME,
  emailButton,
  emailCode,
  emailDetails,
  emailDocumentCard,
  emailHeading,
  emailParagraph,
  emailQuote,
  emailSecondaryLink,
  emailTheme,
  renderEmailDocument,
} from "./email-layout.ts";

const hostile = `"><script>alert(1)</script>&`;

test("every helper escapes the text it is given", () => {
  const html = [
    emailHeading(hostile),
    emailParagraph(hostile),
    emailDocumentCard({ lines: [hostile], title: hostile }),
    emailDetails([{ label: hostile, value: hostile }]),
    emailQuote(hostile),
    emailCode(hostile),
    emailButton({ label: hostile, url: `https://x.test/?a=1&b="2"` }),
    emailSecondaryLink({ label: hostile, url: `https://x.test/?a=1&b="2"` }),
    renderEmailDocument({ contentHtml: "", preheader: hostile }),
  ].join("");

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /b="2"/);
  assert.match(html, /&quot;&gt;&lt;script&gt;/);
  assert.match(html, /href="https:\/\/x\.test\/\?a=1&amp;b=&quot;2&quot;"/);
});

test("the button is a link people can tap, with its words", () => {
  const html = emailButton({
    label: "Review and sign",
    url: "https://x.test/sign/abc",
  });

  assert.match(html, /<a href="https:\/\/x\.test\/sign\/abc"[^>]*>/);
  assert.match(html, />Review and sign</);
  assert.match(html, new RegExp(DEFAULT_EMAIL_THEME.accent));
});

test("the organization's colour is used only on its own install", () => {
  const neutral: Branding = {
    ...HOSTED_BRANDING,
    brandColor: "#ffd400",
    hosted: false,
  };

  // A pale yellow is darkened until white text on it is readable.
  assert.notEqual(emailTheme(neutral).accent, "#ffd400");
  assert.notEqual(emailTheme(neutral), DEFAULT_EMAIL_THEME);
  assert.equal(emailTheme({ ...neutral, hosted: true }), DEFAULT_EMAIL_THEME);
  assert.equal(
    emailTheme({ ...neutral, brandColor: "red" }),
    DEFAULT_EMAIL_THEME,
  );
});
