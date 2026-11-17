import assert from "node:assert/strict";
import { test } from "node:test";

import { buildBranding } from "./branding.ts";
import type {
  EmailService,
  TransactionalEmailMessage,
} from "./services/email.ts";
import { resolveSettings } from "./settings.ts";
import {
  buildInvitationLink,
  buildTeamInvitationEmail,
  invitationRequestSchema,
  inviteeSignupProblem,
  MAX_INVITATIONS_PER_REQUEST,
  parseInviteeList,
  sendTeamInvitations,
} from "./team-invitations.ts";

const env = { APP_URL: "https://sign.acme.test" };

function acmeBranding() {
  return buildBranding(
    resolveSettings(
      {
        ...resolveSettings(null, env),
        organizationName: "Acme",
        supportAddress: "help@acme.test",
      },
      env,
    ),
  );
}

function captureService(fail: (to: string) => boolean = () => false) {
  const sent: TransactionalEmailMessage[] = [];
  const service: EmailService = {
    send(message) {
      if (fail(message.to)) {
        return Promise.reject(new Error("The mailbox is full."));
      }

      sent.push(message);

      return Promise.resolve({
        accepted: [message.to],
        messageId: "test",
        rejected: [],
      });
    },
    sendBatch() {
      return Promise.reject(new Error("not used"));
    },
  };

  return { sent, service };
}

function fakeDatabase(existing: string[]) {
  return {
    query: (_sql: string, params: unknown[]) =>
      Promise.resolve({
        rows: (params[0] as string[])
          .filter((email) => existing.includes(email))
          .map((email) => ({ email })),
      }),
  } as never;
}

test("a pasted list is split into addresses, names and duplicates dropped", () => {
  assert.deepEqual(
    parseInviteeList(
      "Ana@Acme.test, Bo Brown <bo@acme.test>;\n cy@acme.test ana@acme.test",
    ),
    { emails: ["ana@acme.test", "bo@acme.test", "cy@acme.test"], invalid: [] },
  );
  assert.deepEqual(parseInviteeList("dee@acme.test, not-an-address, @x"), {
    emails: ["dee@acme.test"],
    invalid: ["not-an-address", "@x"],
  });
  assert.deepEqual(parseInviteeList("  "), { emails: [], invalid: [] });
});

test("a request takes 1 to 25 addresses, lower-cased and de-duplicated", () => {
  assert.deepEqual(
    invitationRequestSchema.parse({ emails: ["A@acme.test", "a@acme.test"] }),
    { emails: ["a@acme.test"] },
  );
  assert.equal(
    invitationRequestSchema.safeParse({ emails: [] }).success,
    false,
  );
  assert.equal(
    invitationRequestSchema.safeParse({ emails: ["nope"] }).success,
    false,
  );
  assert.equal(
    invitationRequestSchema.safeParse({
      emails: Array.from(
        { length: MAX_INVITATIONS_PER_REQUEST + 1 },
        (_, index) => `p${String(index)}@acme.test`,
      ),
    }).success,
    false,
  );
});

test("an invitee the sign-up rule would turn away is named before sending", () => {
  const domains = {
    allowedEmailDomains: ["acme.test"],
    signupMode: "domains" as const,
  };

  assert.equal(inviteeSignupProblem("ana@acme.test", domains), null);
  assert.equal(
    inviteeSignupProblem("ana@elsewhere.test", domains),
    "Not at a domain that can join",
  );
  assert.equal(
    inviteeSignupProblem("ana@acme.test", {
      allowedEmailDomains: [],
      signupMode: "closed",
    }),
    "Nobody new can create an account right now",
  );
  assert.equal(
    inviteeSignupProblem("anyone@anywhere.test", {
      allowedEmailDomains: [],
      signupMode: "open",
    }),
    null,
  );
});

test("the invitation names who invited, where, and links to sign-up with the address", () => {
  const content = buildTeamInvitationEmail({
    appUrl: env.APP_URL,
    branding: acmeBranding(),
    env,
    inviterName: "Ada Admin",
    to: "bo+team@acme.test",
  });
  const link = "https://sign.acme.test/signup?email=bo%2Bteam%40acme.test";

  assert.equal(buildInvitationLink(env.APP_URL, "bo+team@acme.test"), link);
  assert.equal(content.subject, "Ada Admin invited you to Acme on SignuDoc");
  assert.match(content.textBody, /Create your account:\n/);
  assert.ok(content.textBody.includes(link));
  assert.ok(content.htmlBody.includes("Create your account"));
  assert.ok(content.htmlBody.includes(link.replaceAll("&", "&amp;")));
  // The shared layout's footer comes with it.
  assert.match(content.textBody, /Questions\? Contact help@acme\.test\./);
});

test("names in the invitation are escaped in the HTML", () => {
  const content = buildTeamInvitationEmail({
    appUrl: env.APP_URL,
    branding: acmeBranding(),
    env,
    inviterName: "<b>Mallory</b>",
    to: "bo@acme.test",
  });

  assert.ok(!content.htmlBody.includes("<b>Mallory</b>"));
  assert.ok(content.htmlBody.includes("&lt;b&gt;Mallory&lt;/b&gt;"));
});

test("each address gets its own email; members are skipped; one failure does not stop the rest", async () => {
  const { sent, service } = captureService((to) => to === "cy@acme.test");
  const outcome = await sendTeamInvitations({
    branding: acmeBranding(),
    database: fakeDatabase(["bo@acme.test"]),
    emailService: service,
    emails: ["ana@acme.test", "bo@acme.test", "cy@acme.test", "dee@acme.test"],
    env,
    inviter: { email: "ada@acme.test", name: "Ada Admin" },
  });

  assert.deepEqual(outcome, {
    alreadyMembers: ["bo@acme.test"],
    failed: [{ email: "cy@acme.test", message: "The mailbox is full." }],
    sent: ["ana@acme.test", "dee@acme.test"],
  });
  assert.deepEqual(
    sent.map((message) => [message.to, message.template, message.replyTo]),
    [
      ["ana@acme.test", "team_invitation", "ada@acme.test"],
      ["dee@acme.test", "team_invitation", "ada@acme.test"],
    ],
  );
});

test("without the site's address there is nothing to link to", async () => {
  await assert.rejects(
    sendTeamInvitations({
      branding: acmeBranding(),
      database: fakeDatabase([]),
      emailService: captureService().service,
      emails: ["ana@acme.test"],
      env: {},
      inviter: { email: "ada@acme.test", name: "Ada" },
    }),
    /APP_URL/,
  );
});
