import test from "node:test";
import assert from "node:assert/strict";

import {
  identityProfileMatchesSnapshot,
  isIdentityReadyForSelfie,
  isVerifiedPreKycDocument,
} from "../utils/preKycDocs.js";

test("selfie verification unlocks only after an active ID has matched registration details", () => {
  assert.equal(isIdentityReadyForSelfie({ docType: "id", status: "pending_review", detailsMatched: true }), true);
  assert.equal(isIdentityReadyForSelfie({ docType: "id", status: "verified", detailsMatched: true }), true);
  assert.equal(isIdentityReadyForSelfie({ docType: "id", status: "processing", detailsMatched: true }), false);
  assert.equal(isIdentityReadyForSelfie({ docType: "id", status: "pending_review", detailsMatched: false }), false);
  assert.equal(isIdentityReadyForSelfie({ docType: "id", status: "reupload_required", detailsMatched: true }), false);
  assert.equal(isIdentityReadyForSelfie({ docType: "supporting", status: "verified", detailsMatched: true }), false);
});

test("registration accepts only identity documents with a passed data comparison", () => {
  assert.equal(isVerifiedPreKycDocument({ docType: "id", status: "verified", detailsMatched: true }), true);
  assert.equal(isVerifiedPreKycDocument({ docType: "id", status: "verified", detailsMatched: false }), false);
  assert.equal(isVerifiedPreKycDocument({ docType: "id", status: "verified" }), false);
  assert.equal(isVerifiedPreKycDocument({ docType: "id", status: "pending_review", detailsMatched: true }), false);
});

test("verified supporting documents retain their existing registration behavior", () => {
  assert.equal(isVerifiedPreKycDocument({ docType: "supporting", status: "verified" }), true);
  assert.equal(isVerifiedPreKycDocument({ docType: "supporting", status: "pending_review" }), false);
});

test("final registration details must match the profile used to screen the ID", () => {
  const snapshot = { full_name: "Maria Dela Cruz", date_of_birth: "1995-04-12" };
  assert.equal(identityProfileMatchesSnapshot(snapshot, {
    full_name: "  MARIA   DELA CRUZ ",
    date_of_birth: "1995-04-12",
  }), true);
  assert.equal(identityProfileMatchesSnapshot(snapshot, {
    full_name: "Maria Dela Santos",
    date_of_birth: "1995-04-12",
  }), false);
  assert.equal(identityProfileMatchesSnapshot(snapshot, {
    full_name: "Maria Dela Cruz",
    date_of_birth: "1996-04-12",
  }), false);
  assert.equal(identityProfileMatchesSnapshot({ full_name: "Owner Example" }, {
    full_name: "owner example",
  }, { requireBirthDate: false }), true);
});
