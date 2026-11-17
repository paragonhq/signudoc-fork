import assert from "node:assert/strict";
import { test } from "node:test";

import { buildEnvelopeDetailFieldViews } from "./envelope-detail-fields.ts";

const place = { height: 0.05, page: 1, width: 0.2, x: 0.1, y: 0.7 };

test("each field takes its signer's place in signing order", () => {
  const views = buildEnvelopeDetailFieldViews(
    [
      { ...place, id: "f1", required: true, signerId: "b", type: "signature" },
      { ...place, id: "f2", required: false, signerId: "a", type: "date" },
    ],
    [
      { id: "b", signOrder: 2 },
      { id: "a", signOrder: 1 },
    ],
  );

  assert.deepEqual(
    views.map((view) => [view.id, view.signerIndex, view.required]),
    [
      ["f1", 1, true],
      ["f2", 0, false],
    ],
  );
});

test("a field is filled once it was submitted, and says nothing of what", () => {
  const [open, done] = buildEnvelopeDetailFieldViews(
    [
      { ...place, id: "f1", signerId: "a", submittedAt: null, type: "text" },
      {
        ...place,
        id: "f2",
        signerId: "a",
        submittedAt: 1_800_000_000,
        type: "text",
      },
    ],
    [{ id: "a", signOrder: 1 }],
  );

  assert.equal(open?.filled, false);
  assert.equal(done?.filled, true);
  assert.equal("value" in (done ?? {}), false);
});

test("fields of a signer who is no longer on the envelope are left out", () => {
  const views = buildEnvelopeDetailFieldViews(
    [{ ...place, id: "f1", signerId: "gone", type: "signature" }],
    [{ id: "a", signOrder: 1 }],
  );

  assert.deepEqual(views, []);
});
