// Starting points offered on an empty page. Structure only: bracketed
// placeholders to replace, nothing that reads as legal advice.

export type Starter = {
  description: string;
  html: string;
  id: string;
  label: string;
};

const signatureBlock = (role: string) =>
  `<p><br></p><p><strong>${role}</strong></p><p><br></p><p>Signature: ____________________</p><p>Name: [Full name]</p><p>Date: ______________</p>`;

export const STARTERS: readonly Starter[] = [
  {
    description: "Letterhead, date, greeting and sign-off",
    html: `<p><strong>[Your organisation]</strong></p><p>[Street address]</p><p>[City, region, postal code]</p><p><br></p><p>[Date]</p><p><br></p><p>[Recipient name]</p><p>[Recipient address]</p><p><br></p><p>Dear [Recipient name],</p><p><br></p><p>[Write your letter here.]</p><p><br></p><p>Sincerely,</p>${signatureBlock("[Your name]")}`,
    id: "letter",
    label: "Letter",
  },
  {
    description: "Parties, numbered terms and two signature blocks",
    html: `<p data-style="title" style="text-align: center">[Agreement title]</p><p style="text-align: center">Effective date: [Date]</p><p><br></p><p>This agreement is made between <strong>[Party A]</strong> (“[Short name A]”) and <strong>[Party B]</strong> (“[Short name B]”).</p><h2>1. [First section]</h2><p>[Describe the terms.]</p><h2>2. [Second section]</h2><p>[Describe the terms.]</p><h2>3. [Third section]</h2><p>[Describe the terms.]</p><p><br></p><p>Signed by the parties on the dates below.</p><table data-borders="none"><tbody><tr><td>${signatureBlock("[Party A]")}</td><td>${signatureBlock("[Party B]")}</td></tr></tbody></table>`,
    id: "agreement",
    label: "Agreement",
  },
  {
    description: "A short form with checkboxes and an acknowledgement",
    html: `<h1>[Form title]</h1><p>Please read and confirm each item below.</p><p><br></p><ul data-type="checklist"><li data-checked="false">[First item to confirm]</li><li data-checked="false">[Second item to confirm]</li><li data-checked="false">[Third item to confirm]</li></ul><p><br></p><p>By signing, I confirm the information above is accurate.</p>${signatureBlock("Signed")}`,
    id: "form",
    label: "Acknowledgement form",
  },
];
