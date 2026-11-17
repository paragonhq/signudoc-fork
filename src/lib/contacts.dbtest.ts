import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import type pg from "pg";

import { listContactBookForUser, listContactsForUser } from "./contacts.ts";
import { openTestDatabase } from "./db/test-database.ts";

// The address book against a real Postgres: one contact per address, the
// latest name, the status mix, and nobody else's envelopes. Run with
// `npm run test:db`.

let database: pg.Pool;
const createdUsers: string[] = [];
const NOW = 2_000_000_000;

before(async () => {
  database = await openTestDatabase();
});

after(async () => {
  await database.query(`delete from public."user" where id = any($1)`, [
    createdUsers,
  ]);
  await database.end();
});

async function createUser(): Promise<string> {
  const userId = randomUUID();

  createdUsers.push(userId);
  await database.query(
    `insert into public."user" (id, name, email, role) values ($1, 'Sam Sender', $2, 'user')`,
    [userId, `${userId}@example.test`],
  );

  return userId;
}

async function createEnvelope(
  userId: string,
  input: {
    createdAt: number;
    expiresAt?: number | null;
    people: { email: string; name: string; role?: "cc" | "signer" }[];
    sentAt?: number | null;
    status: "completed" | "declined" | "draft" | "sent" | "voided";
    title: string;
  },
): Promise<string> {
  const envelopeId = randomUUID();

  await database.query(
    `
      insert into envelopes (
        id, user_id, title, status, source_pdf_key, source_pdf_filename,
        source_pdf_size_bytes, page_count, source_pdf_hash, sent_at,
        expires_at, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, 'file.pdf', 100, 1, $6, $7, $8, $9, $9)
    `,
    [
      envelopeId,
      userId,
      input.title,
      input.status,
      `envelopes/${envelopeId}/original.pdf`,
      "a".repeat(64),
      input.sentAt ?? null,
      input.expiresAt ?? null,
      input.createdAt,
    ],
  );

  let order = 1;

  for (const person of input.people) {
    const role = person.role ?? "signer";

    await database.query(
      `
        insert into signers (id, envelope_id, name, email, sign_order, role)
        values ($1, $2, $3, $4, $5, $6)
      `,
      [randomUUID(), envelopeId, person.name, person.email, order, role],
    );
    order += 1;
  }

  return envelopeId;
}

test("one contact per address, with the latest name and the mix", async () => {
  const sender = await createUser();
  const someoneElse = await createUser();

  await createEnvelope(sender, {
    createdAt: NOW - 500,
    people: [
      { email: "riley@example.com", name: "Riley R" },
      { email: "casey@example.com", name: "Casey Copy", role: "cc" },
    ],
    sentAt: NOW - 400,
    status: "completed",
    title: "Lease",
  });
  const waiting = await createEnvelope(sender, {
    createdAt: NOW - 300,
    expiresAt: NOW + 1_000,
    people: [{ email: "Riley@Example.com", name: "Riley Recipient" }],
    sentAt: NOW - 200,
    status: "sent",
    title: "NDA",
  });
  await createEnvelope(sender, {
    createdAt: NOW - 100,
    expiresAt: NOW - 10,
    people: [{ email: "morgan@example.com", name: "Morgan Lee" }],
    sentAt: NOW - 90,
    status: "sent",
    title: "Expired offer",
  });
  // A template's stand-in role is not a person.
  await createEnvelope(sender, {
    createdAt: NOW - 50,
    people: [{ email: "client@template-role.invalid", name: "Client" }],
    status: "draft",
    title: "Template draft",
  });
  // Someone else's envelope never shows.
  await createEnvelope(someoneElse, {
    createdAt: NOW,
    people: [{ email: "secret@example.com", name: "Secret Person" }],
    sentAt: NOW,
    status: "sent",
    title: "Theirs",
  });

  const contacts = await listContactBookForUser(sender, { now: NOW }, database);

  assert.deepEqual(
    contacts.map((contact) => contact.email.toLowerCase()),
    ["morgan@example.com", "riley@example.com", "casey@example.com"],
  );

  const riley = contacts[1]!;

  assert.equal(riley.name, "Riley Recipient");
  assert.equal(riley.documentCount, 2);
  assert.equal(riley.lastSentAt, NOW - 200);
  assert.deepEqual(riley.statusMix, {
    completed: 1,
    declined: 0,
    draft: 0,
    ended: 0,
    waiting: 1,
  });
  assert.deepEqual(
    riley.documents.map((document) => document.id).at(0),
    waiting,
  );
  assert.equal(contacts[0]!.statusMix.ended, 1);
  assert.equal(contacts[0]!.documents[0]!.status, "expired");
  assert.equal(contacts[2]!.documents[0]!.role, "cc");

  const found = await listContactsForUser(
    sender,
    { now: NOW, search: "RECIP" },
    database,
  );

  assert.deepEqual(
    found.map((contact) => contact.name),
    ["Riley Recipient"],
  );

  const foundByAddress = await listContactsForUser(
    sender,
    { now: NOW, search: "casey@" },
    database,
  );

  assert.deepEqual(
    foundByAddress.map((contact) => contact.name),
    ["Casey Copy"],
  );

  const nobody = await listContactsForUser(
    someoneElse,
    { now: NOW, search: "riley" },
    database,
  );

  assert.equal(nobody.length, 0);
});
