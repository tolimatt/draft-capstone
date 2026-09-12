import test from "node:test";
import assert from "node:assert/strict";

import { createAdminReportsRouter } from "../routes/adminReports.routes.js";

const router = createAdminReportsRouter({
  verifyCriticalAction: async () => ({ account: {} }),
  recordAdminAudit: async () => {},
  evidenceDirectory: "C:\\nonexistent-report-evidence",
});

const findRoute = (path, method) => router.stack.find(
  (layer) => layer.route?.path === path && layer.route.methods?.[method],
);

test("report review routes expose list, evidence, triage, and decision operations", () => {
  assert.ok(findRoute("/", "get"));
  assert.ok(findRoute("/:id/evidence/:evidenceId", "get"));
  assert.ok(findRoute("/:id", "patch"));
  assert.ok(findRoute("/:id/decision", "post"));
});

test("report management does not expose destructive delete routes", () => {
  assert.equal(findRoute("/:id", "delete"), undefined);
  assert.equal(findRoute("/", "delete"), undefined);
});
