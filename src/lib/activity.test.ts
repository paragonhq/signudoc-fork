import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ACTIVITY_MAX_PAGE_SIZE,
  ACTIVITY_PAGE_SIZE,
  decodeActivityCursor,
  encodeActivityCursor,
  listActivityForUser,
  parseActivityQuery,
  startOfMonthUtc,
  toActivityItem,
  weeklySeries,
  type ActivityRow,
} from "./activity.ts";

const ROW: ActivityRow = {
  actorEmail: "riley@example.test",
  actorType: "signer",
  createdAt: 1_800_000_000,
  envelopeId: "env-1",
  envelopeStatus: "sent",
  envelopeTitle: "Mutual NDA",
  event: "signed",
  id: "evt-1",
  reason: null,
  signerEmail: "riley@example.test",
  signerName: "Riley Chen",
};

test("a cursor survives the round trip and refuses anything else", () => {
  const cursor = { at: 1_800_000_000, id: "3f2a-b9_c" };

  assert.deepEqual(decodeActivityCursor(encodeActivityCursor(cursor)), cursor);

  for (const refused of [
    "",
    ".abc",
    "123.",
    "abc.def",
    "1.2.3",
    "123.<script>",
    `123.${"a".repeat(65)}`,
    "-5.abc",
  ]) {
    assert.equal(decodeActivityCursor(refused), null, refused);
  }
});

test("the query is read strictly", () => {
  const plain = parseActivityQuery(new URLSearchParams());

  assert.deepEqual(plain, {
    ok: true,
    query: {
      cursor: null,
      filter: "all",
      limit: ACTIVITY_PAGE_SIZE,
      since: null,
    },
  });

  const filtered = parseActivityQuery(
    new URLSearchParams("filter=signed&cursor=100.abc&limit=500"),
  );

  assert.ok(filtered.ok);
  assert.equal(filtered.query.filter, "signed");
  assert.deepEqual(filtered.query.cursor, { at: 100, id: "abc" });
  // Asking for more than a page's worth gets the most there is.
  assert.equal(filtered.query.limit, ACTIVITY_MAX_PAGE_SIZE);

  for (const refused of [
    "filter=everything",
    "cursor=nope",
    "since=yesterday",
    "since=-1",
    "limit=ten",
    "since=100&cursor=100.abc",
  ]) {
    assert.equal(
      parseActivityQuery(new URLSearchParams(refused)).ok,
      false,
      refused,
    );
  }
});

test("a signer's own event names the signer", () => {
  assert.deepEqual(toActivityItem(ROW), {
    actorEmail: "riley@example.test",
    actorName: "Riley Chen",
    at: 1_800_000_000,
    automatic: false,
    envelopeId: "env-1",
    envelopeStatus: "sent",
    envelopeTitle: "Mutual NDA",
    id: "evt-1",
    kind: "signed",
    reason: null,
  });
});

test("sent and reminders name who it went to, never the sender", () => {
  const sent = toActivityItem({
    ...ROW,
    actorEmail: "sender@acme.test",
    actorType: "sender",
    event: "sent",
  });

  assert.equal(sent?.kind, "sent");
  assert.equal(sent?.actorEmail, "riley@example.test");

  const automatic = toActivityItem({
    ...ROW,
    actorEmail: null,
    actorType: "system",
    event: "reminded_auto",
  });

  assert.equal(automatic?.kind, "reminded");
  assert.equal(automatic?.automatic, true);
});

test("events the feed does not show are left out", () => {
  for (const event of ["created", "consented", "email_sent", "copied"]) {
    assert.equal(toActivityItem({ ...ROW, event }), null, event);
  }
});

test("only a decline or a void carries its reason, kept short", () => {
  const declined = toActivityItem({
    ...ROW,
    event: "declined",
    reason: `  ${"x".repeat(400)}  `,
  });

  assert.equal(declined?.reason?.length, 280);
  assert.ok(declined?.reason?.endsWith("…"));
  assert.equal(
    toActivityItem({ ...ROW, event: "viewed", reason: "hidden" })?.reason,
    null,
  );
  assert.equal(
    toActivityItem({ ...ROW, event: "completed" })?.actorEmail,
    null,
    "a completion has no person",
  );
});

test("weeks are counted oldest first and out-of-range buckets ignored", () => {
  assert.deepEqual(
    weeklySeries([
      { count: 3, week: 0 },
      { count: 1, week: 2 },
      { count: 9, week: 8 },
      { count: 9, week: -1 },
    ]),
    [0, 0, 0, 0, 0, 1, 0, 3],
  );
});

test("the month starts at midnight UTC on the first", () => {
  const nov17 = Date.UTC(2026, 10, 17, 15, 30) / 1000;

  assert.equal(startOfMonthUtc(nov17), Date.UTC(2026, 10, 1) / 1000);
});

test("the feed is always scoped to the caller's envelopes", async () => {
  const calls: { text: string; values: unknown[] }[] = [];
  const database = {
    query: async (text: string, values: unknown[]) => {
      calls.push({ text, values });

      return {
        rows: [
          { ...ROW, createdAt: 30, id: "c" },
          { ...ROW, createdAt: 20, id: "b" },
          { ...ROW, createdAt: 10, id: "a" },
        ],
      };
    },
  } as unknown as Parameters<typeof listActivityForUser>[2];

  const page = await listActivityForUser(
    "user-1",
    { cursor: { at: 99, id: "z" }, filter: "signed", limit: 2 },
    database,
  );

  const [call] = calls;

  assert.ok(call);
  assert.match(call.text, /e\.user_id = \$1/);
  assert.equal(call.values[0], "user-1");
  assert.deepEqual(call.values[1], ["signed"]);
  // One more than asked for, to know whether there is another page.
  assert.equal(call.values.at(-1), 3);
  assert.deepEqual(
    page.items.map((item) => item.id),
    ["c", "b"],
  );
  assert.equal(page.nextCursor, "20.b");
});
