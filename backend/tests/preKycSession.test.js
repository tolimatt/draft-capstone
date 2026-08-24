import test from "node:test";
import assert from "node:assert/strict";

import {
  issuePreKycSession,
  renewPreKycSession,
  verifyPreKycSession,
} from "../utils/preKycSession.js";
import { requireKyc } from "../middleware/rbac.middleware.js";

const originalSecret = process.env.PRE_KYC_SESSION_SECRET;
const originalTtl = process.env.PRE_KYC_SESSION_TTL;

test.before(() => {
  process.env.PRE_KYC_SESSION_SECRET = "test-only-pre-kyc-secret-with-enough-entropy";
  process.env.PRE_KYC_SESSION_TTL = "20m";
});

test.after(() => {
  if (originalSecret === undefined) delete process.env.PRE_KYC_SESSION_SECRET;
  else process.env.PRE_KYC_SESSION_SECRET = originalSecret;
  if (originalTtl === undefined) delete process.env.PRE_KYC_SESSION_TTL;
  else process.env.PRE_KYC_SESSION_TTL = originalTtl;
});

test("pre-KYC tokens bind email, role, and one attempt id", () => {
  const issued = issuePreKycSession({ email: " Person@Example.com ", role: "owner" });
  const verified = verifyPreKycSession(issued.token, {
    email: "person@example.com",
    role: "owner",
  });

  assert.equal(verified.email, "person@example.com");
  assert.equal(verified.role, "owner");
  assert.equal(verified.sessionId, issued.sessionId);
  assert.throws(
    () => verifyPreKycSession(issued.token, { email: "other@example.com", role: "owner" }),
    /does not match this email/i
  );
  assert.throws(
    () => verifyPreKycSession(issued.token, { email: "person@example.com", role: "user" }),
    /does not match this account type/i
  );
});

test("renewing a signed attempt retains its attempt id", () => {
  const issued = issuePreKycSession({ email: "person@example.com", role: "user" });
  const renewed = renewPreKycSession(issued.token, {
    email: "person@example.com",
    role: "user",
  });
  assert.equal(renewed.sessionId, issued.sessionId);
  assert.equal(verifyPreKycSession(renewed.token).sessionId, issued.sessionId);
});

test("KYC middleware blocks unapproved users and lets approved users and admins through", () => {
  const response = {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  let nextCalls = 0;
  const next = () => { nextCalls += 1; };

  requireKyc({ user: { role: "user", kycStatus: "not_started" } }, response, next);
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalls, 0);

  requireKyc({ user: { role: "user", kycStatus: "approved" } }, response, next);
  requireKyc({ user: { role: "admin", kycStatus: "not_started" } }, response, next);
  assert.equal(nextCalls, 2);
});
