import test from "node:test";
import assert from "node:assert/strict";

import AdminCredential from "../models/AdminCredential.js";
import AdminMfaChallenge from "../models/AdminMfaChallenge.js";
import AdminSession from "../models/AdminSession.js";

test("admin sessions have revocation metadata and automatic expiry", () => {
  assert.ok(AdminSession.schema.path("revokedAt"));
  assert.ok(AdminSession.schema.path("lastSeenAt"));
  const ttlIndex = AdminSession.schema.indexes().find(
    ([fields, options]) => fields.expiresAt === 1 && options.expireAfterSeconds === 0
  );
  assert.ok(ttlIndex);
});

test("secret passkeys are hashed and email codes are issued only on demand", () => {
  assert.equal(AdminCredential.schema.path("passkeyHash").options.select, false);
  assert.ok(AdminCredential.schema.path("passkeyEnabledAt"));
  assert.equal(AdminMfaChallenge.schema.path("otpHash").options.required, undefined);
  assert.ok(AdminMfaChallenge.schema.path("emailCodeSentAt"));
  assert.ok(AdminMfaChallenge.schema.path("emailCodeExpiresAt"));
});
