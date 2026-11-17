import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import type pg from "pg";

import { buildBranding } from "./branding.ts";
import { openTestDatabase } from "./db/test-database.ts";
import type {
  EmailService,
  TransactionalEmailMessage,
} from "./services/email.ts";
import { resolveSettings } from "./settings.ts";
import {
  findExistingAccounts,
  sendTeamInvitations,
} from "./team-invitations.ts";

// Inviting teammates against a real Postgres: someone who already has an
// account here, whatever case their address was typed in, is not invited
// again. Run with `npm run test:db`.

let database: pg.Pool;
const createdUsers: string[] = [];
const memberEmail = `Member-${randomUUID().slice(0, 8)}@Invite.Test`;

before(async () => {
  database = await openTestDatabase();

  const id = randomUUID();

  createdUsers.push(id);
  await database.query(
    `
      insert into public."user" (id, name, email, role, "emailVerified")
      values ($1, 'Mia Member', $2, 'user', true)
    `,
    [id, memberEmail],
  );
});

after(async () => {
  await database.query(`delete from public."user" where id = any($1)`, [
    createdUsers,
  ]);
  await database.end();
});

test("existing accounts are found whatever the case of the address", async () => {
  const found = await findExistingAccounts(
    [memberEmail.toLowerCase(), "nobody-here@invite.test"],
    database,
  );

  assert.deepEqual([...found], [memberEmail.toLowerCase()]);
  assert.equal((await findExistingAccounts([], database)).size, 0);
});

test("a member is skipped and a newcomer is invited", async () => {
  const sent: TransactionalEmailMessage[] = [];
  const emailService: EmailService = {
    send(message) {
      sent.push(message);

      return Promise.resolve({ accepted: [message.to], rejected: [] });
    },
    sendBatch: () => Promise.reject(new Error("not used")),
  };
  const env = { APP_URL: "https://sign.invite.test" };
  const outcome = await sendTeamInvitations({
    branding: buildBranding(resolveSettings(null, env)),
    database,
    emailService,
    emails: [memberEmail.toLowerCase(), "new-person@invite.test"],
    env,
    inviter: { email: "ada@invite.test", name: "Ada" },
  });

  assert.deepEqual(outcome.alreadyMembers, [memberEmail.toLowerCase()]);
  assert.deepEqual(outcome.sent, ["new-person@invite.test"]);
  assert.deepEqual(
    sent.map((message) => message.to),
    ["new-person@invite.test"],
  );
});
