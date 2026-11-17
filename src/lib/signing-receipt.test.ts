import assert from "node:assert/strict";
import { test } from "node:test";

import { firstNameOf, pickNextSigner } from "./signing-receipt.ts";

test("the next signer is named by their first name", () => {
  assert.equal(firstNameOf("Riley Recipient"), "Riley");
  assert.equal(firstNameOf("  Ada  "), "Ada");
  assert.equal(firstNameOf("casey@example.com"), "casey");
});

test("the next signer is the first in order who has not signed", () => {
  const signers = [
    { id: "c", signOrder: 3, status: "pending" },
    { id: "a", signOrder: 1, status: "signed" },
    { id: "b", signOrder: 2, status: "notified" },
    { id: "d", signOrder: 4, status: "pending" },
  ];

  assert.equal(pickNextSigner(signers, "b")?.id, "c");
  // The last signer has no one after them.
  assert.equal(
    pickNextSigner(
      signers.map((signer) =>
        signer.id === "b" ? signer : { ...signer, status: "signed" },
      ),
      "b",
    ),
    null,
  );
  // A declined signer is never next.
  assert.equal(
    pickNextSigner(
      [
        { id: "a", signOrder: 1, status: "notified" },
        { id: "b", signOrder: 2, status: "declined" },
      ],
      "a",
    ),
    null,
  );
});
