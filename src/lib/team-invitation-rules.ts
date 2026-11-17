import { z } from "zod";

import { emailSchema } from "./schemas/common.ts";
import { evaluateSignup, type SignupPolicy } from "./signup-policy.ts";

// The rules for inviting teammates that both the setup page and the
// server need: how a pasted list is read, how many fit in one request,
// and whether the install's sign-up rule would let each person in. No
// server-only imports, so the browser can use them too.

/** Enough for a team, few enough that one request cannot become a mailing. */
export const MAX_INVITATIONS_PER_REQUEST = 25;

export const invitationRequestSchema = z.object({
  emails: z
    .array(emailSchema)
    .min(1)
    .max(MAX_INVITATIONS_PER_REQUEST)
    .transform((emails) =>
      Array.from(new Set(emails.map((email) => email.toLowerCase()))),
    ),
});

const LOOKS_LIKE_EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

/**
 * Splits what was typed or pasted ("ana@acme.com, Bo <bo@acme.com>;
 * cy@acme.com") into addresses. "Name <address>" keeps the address.
 * Duplicates are dropped; anything that is not an address comes back in
 * `invalid`, as typed.
 */
export function parseInviteeList(value: string): {
  emails: string[];
  invalid: string[];
} {
  const emails = new Set<string>();
  const invalid: string[] = [];
  // Angle brackets first, so the name in front of an address is not split
  // into words that look like mistakes.
  const withoutNames = value.replace(
    /[^,;\n<>]*<([^<>]+)>/g,
    (_match, address: string) => ` ${address} `,
  );

  for (const entry of withoutNames.split(/[\s,;]+/)) {
    const candidate = entry.trim().replace(/^mailto:/i, "");

    if (!candidate) {
      continue;
    }

    if (LOOKS_LIKE_EMAIL.test(candidate) && candidate.length <= 320) {
      emails.add(candidate.toLowerCase());
    } else {
      invalid.push(candidate);
    }
  }

  return { emails: Array.from(emails), invalid };
}

/**
 * Why this person could not create an account under the rule given, in a
 * few words, or null when they could.
 */
export function inviteeSignupProblem(
  email: string,
  policy: SignupPolicy,
): string | null {
  const decision = evaluateSignup(email, policy);

  if (decision.allowed) {
    return null;
  }

  return decision.code === "signup_closed"
    ? "Nobody new can create an account right now"
    : "Not at a domain that can join";
}
