import assert from "node:assert/strict";
import { test } from "node:test";

import {
  describeAgo,
  describeContactActivity,
  describeStatusMix,
  listContactDocumentsForUser,
  listContactsForUser,
  MAX_LISTED_CONTACTS,
  normalizeContactLimit,
  normalizeContactSearch,
  toContactDocumentStatus,
} from "./contacts.ts";
import type { DbExecutor } from "./db/connection.ts";

// The address book's rules that need no database: what a search or a limit
// becomes, how a contact is put in words, and that every query is bound to
// the caller's own envelopes. contacts.dbtest.ts runs the SQL for real.

type Captured = { sql: string; values: unknown[] };

function fakeDatabase(rows: unknown[]): {
  calls: Captured[];
  database: DbExecutor;
} {
  const calls: Captured[] = [];
  const database = {
    query: (sql: string, values: unknown[]) => {
      calls.push({ sql, values });

      return Promise.resolve({ rows });
    },
  } as unknown as DbExecutor;

  return { calls, database };
}

test("a search is trimmed, lowercased and cut short", () => {
  assert.equal(normalizeContactSearch("  Riley R  "), "riley r");
  assert.equal(normalizeContactSearch("x".repeat(400)).length, 100);
  assert.equal(normalizeContactSearch(undefined), "");
  assert.equal(normalizeContactSearch(42), "");
});

test("a limit stays between one and the most listed", () => {
  assert.equal(normalizeContactLimit("8"), 8);
  assert.equal(normalizeContactLimit(0), 1);
  assert.equal(normalizeContactLimit("100000"), MAX_LISTED_CONTACTS);
  assert.equal(normalizeContactLimit("-3"), MAX_LISTED_CONTACTS);
  assert.equal(normalizeContactLimit("ten"), MAX_LISTED_CONTACTS);
  assert.equal(normalizeContactLimit(""), MAX_LISTED_CONTACTS);
});

test("contacts are read from the caller's own envelopes only", async () => {
  const { calls, database } = fakeDatabase([
    {
      completed: 2,
      declined: 0,
      documentCount: 3,
      draft: 0,
      email: "Riley@Example.com",
      ended: 0,
      lastActivityAt: 1_000,
      lastSentAt: 900,
      name: "  ",
      waiting: 1,
    },
  ]);

  const contacts = await listContactsForUser(
    "user-1",
    { limit: 5, now: 2_000, search: "  RIL " },
    database,
  );

  assert.equal(calls.length, 1);
  assert.match(calls[0]!.sql, /e\.user_id = \$1/);
  // Bound, never spliced into the SQL.
  assert.doesNotMatch(calls[0]!.sql, /ril/);
  assert.deepEqual(calls[0]!.values, [
    "user-1",
    "ril",
    5,
    "%@template-role.invalid",
    2_000,
  ]);
  // A contact with no name on file is called by their address.
  assert.equal(contacts[0]!.name, "Riley@Example.com");
  assert.deepEqual(contacts[0]!.statusMix, {
    completed: 2,
    declined: 0,
    draft: 0,
    ended: 0,
    waiting: 1,
  });
});

test("documents are grouped by address and keep their order", async () => {
  const { calls, database } = fakeDatabase([
    {
      createdAt: 10,
      emailKey: "riley@example.com",
      expiresAt: 50,
      id: "env-2",
      role: "signer",
      sentAt: 20,
      status: "sent",
      title: "Lease",
    },
    {
      createdAt: 5,
      emailKey: "riley@example.com",
      expiresAt: null,
      id: "env-1",
      role: "cc",
      sentAt: null,
      status: "draft",
      title: "NDA",
    },
  ]);

  const documents = await listContactDocumentsForUser(
    "user-1",
    ["Riley@example.com", "riley@EXAMPLE.com"],
    { now: 100 },
    database,
  );

  assert.match(calls[0]!.sql, /e\.user_id = \$1/);
  assert.deepEqual(calls[0]!.values[1], ["riley@example.com"]);
  assert.deepEqual(
    documents
      .get("riley@example.com")
      ?.map((document) => [document.id, document.status, document.role]),
    [
      ["env-2", "expired", "signer"],
      ["env-1", "draft", "cc"],
    ],
  );
});

test("no addresses, no query", async () => {
  const { calls, database } = fakeDatabase([]);
  const documents = await listContactDocumentsForUser(
    "user-1",
    [],
    {},
    database,
  );

  assert.equal(calls.length, 0);
  assert.equal(documents.size, 0);
});

test("a sent envelope past its deadline reads as expired", () => {
  assert.equal(toContactDocumentStatus("sent", 99, 100), "expired");
  assert.equal(toContactDocumentStatus("sent", 101, 100), "sent");
  assert.equal(toContactDocumentStatus("sent", null, 100), "sent");
  assert.equal(toContactDocumentStatus("completed", 1, 100), "completed");
});

test("activity is said in plain words", () => {
  const day = 24 * 60 * 60;
  const now = 400 * day;

  assert.equal(describeAgo(now - 60, now), "today");
  assert.equal(describeAgo(now - day, now), "yesterday");
  assert.equal(describeAgo(now - 2 * day, now), "2 days ago");
  assert.equal(describeAgo(now - 21 * day, now), "3 weeks ago");
  assert.equal(describeAgo(now - 90 * day, now), "3 months ago");
  assert.equal(
    describeContactActivity(
      { documentCount: 3, lastSentAt: now - 2 * day },
      now,
    ),
    "3 documents · last sent 2 days ago",
  );
  assert.equal(
    describeContactActivity({ documentCount: 1, lastSentAt: null }, now),
    "1 document · not sent yet",
  );
});

test("the status mix names only what there is", () => {
  assert.equal(
    describeStatusMix({
      completed: 2,
      declined: 0,
      draft: 1,
      ended: 0,
      waiting: 1,
    }),
    "2 completed, 1 waiting, 1 draft",
  );
  assert.equal(
    describeStatusMix({
      completed: 0,
      declined: 0,
      draft: 0,
      ended: 0,
      waiting: 0,
    }),
    "",
  );
});
