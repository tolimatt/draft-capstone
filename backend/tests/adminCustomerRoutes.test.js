import test from "node:test";
import assert from "node:assert/strict";

import { createAdminDataRouter } from "../routes/adminData.routes.js";
import { ADMIN_API_CONTRACT_VERSION } from "../../shared/adminApiContract.js";

const requireAdminSession = (_request, _response, next) => next();
const router = createAdminDataRouter({ requireAdminSession });

const findRoute = (path, method) => router.stack.find(
  (layer) => layer.route?.path === path && layer.route.methods?.[method],
);

test("customer management routes are registered behind admin session middleware", () => {
  const middlewareIndex = router.stack.findIndex((layer) => !layer.route);
  const editIndex = router.stack.indexOf(findRoute("/customers/:id", "patch"));
  const statusIndex = router.stack.indexOf(findRoute("/customers/:id/status", "patch"));
  const archiveIndex = router.stack.indexOf(findRoute("/customers/:id/archive", "patch"));

  assert.ok(middlewareIndex >= 0);
  assert.ok(editIndex > middlewareIndex);
  assert.ok(statusIndex > middlewareIndex);
  assert.ok(archiveIndex > middlewareIndex);
});

test("customer management does not expose create or bulk-delete routes", () => {
  assert.equal(findRoute("/customers", "post"), undefined);
  assert.equal(findRoute("/customers", "delete"), undefined);
  assert.equal(findRoute("/customers/:id", "delete"), undefined);
});

test("governance and API contract routes are registered", () => {
  assert.ok(findRoute("/audit-logs", "get"));
  assert.ok(findRoute("/contract", "get"));
});

test("admin data responses advertise the shared contract before authentication", () => {
  const headers = {};
  let nextCalled = false;
  router.stack[0].handle({}, { setHeader: (name, value) => { headers[name] = value; } }, () => { nextCalled = true; });
  assert.equal(headers["X-RentifyPro-Admin-Contract"], ADMIN_API_CONTRACT_VERSION);
  assert.equal(nextCalled, true);
});
