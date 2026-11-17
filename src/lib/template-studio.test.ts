import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildRoleStandInEmail,
  buildTemplateThumbnailEtag,
  buildTemplateThumbnailKey,
  isRoleStandInEmail,
  readTemplateDraftCookie,
  summarizeFieldKinds,
} from "./templates.ts";

// The small pure pieces behind the template library, the template page and
// "New template". The database side is in template-studio.dbtest.ts.

test("a role's fields read as words, signatures first, radio groups once", () => {
  assert.equal(summarizeFieldKinds([]), "No fields yet");
  assert.equal(
    summarizeFieldKinds([
      { type: "date" },
      { type: "signature" },
      { type: "text" },
      { type: "text" },
      { groupId: "g", type: "radio" },
      { groupId: "g", type: "radio" },
    ]),
    "1 signature · 1 date · 2 text fields · 1 choice",
  );
  assert.equal(summarizeFieldKinds([{ type: "initials" }]), "1 initials");
});

test("a template's picture sits beside its document", () => {
  assert.equal(
    buildTemplateThumbnailKey({
      sourcePdfKey: "users/u1/templates/t1/original.pdf",
      templateId: "t1",
      userId: "u1",
    }),
    "users/u1/templates/t1/thumbnail.jpg",
  );
  // A document stored somewhere unexpected: the picture goes under the
  // owner's own template folder, never beside a stranger's file.
  assert.equal(
    buildTemplateThumbnailKey({
      sourcePdfKey: "shared/original.pdf",
      templateId: "t1",
      userId: "u1",
    }),
    "users/u1/templates/t1/thumbnail.jpg",
  );
});

test("template pictures are named apart from envelope pictures", () => {
  assert.notEqual(
    buildTemplateThumbnailEtag("same-id"),
    `"thumbnail-v1-same-id"`,
  );
});

test("role stand-ins can never be real addresses", () => {
  const email = buildRoleStandInEmail(0);

  assert.equal(email, "role-1@template-role.invalid");
  assert.ok(isRoleStandInEmail(email));
  assert.ok(isRoleStandInEmail("ROLE-2@TEMPLATE-ROLE.INVALID"));
  assert.ok(!isRoleStandInEmail("riley@example.test"));
  assert.ok(!isRoleStandInEmail("role-1@template-role.invalid.example.com"));
});

test("only a plausible id is taken from the template-draft cookie", () => {
  assert.equal(readTemplateDraftCookie("0f7c2b1e-1234"), "0f7c2b1e-1234");
  assert.equal(readTemplateDraftCookie(undefined), null);
  assert.equal(readTemplateDraftCookie(""), null);
  assert.equal(readTemplateDraftCookie("../etc/passwd"), null);
  assert.equal(readTemplateDraftCookie("a".repeat(65)), null);
});
