import test from "node:test";
import assert from "node:assert/strict";

import { reportEvidenceSignatureMatches } from "../middleware/reportEvidence.middleware.js";
import { vehicleImageSignatureMatches } from "../middleware/upload.middleware.js";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const webp = Buffer.from("RIFF1234WEBP", "ascii");
const pdf = Buffer.from("%PDF-1.7", "ascii");

test("vehicle uploads require the contents to match the declared image MIME type", () => {
  assert.equal(vehicleImageSignatureMatches(jpeg, "image/jpeg"), true);
  assert.equal(vehicleImageSignatureMatches(png, "image/png"), true);
  assert.equal(vehicleImageSignatureMatches(webp, "image/webp"), true);
  assert.equal(vehicleImageSignatureMatches(png, "image/jpeg"), false);
  assert.equal(vehicleImageSignatureMatches(pdf, "image/png"), false);
});

test("report evidence accepts only matching supported file signatures", () => {
  assert.equal(reportEvidenceSignatureMatches(jpeg, "image/jpeg"), true);
  assert.equal(reportEvidenceSignatureMatches(png, "image/png"), true);
  assert.equal(reportEvidenceSignatureMatches(webp, "image/webp"), true);
  assert.equal(reportEvidenceSignatureMatches(pdf, "application/pdf"), true);
  assert.equal(reportEvidenceSignatureMatches(pdf, "image/jpeg"), false);
  assert.equal(reportEvidenceSignatureMatches(Buffer.from("plain text"), "application/pdf"), false);
});
