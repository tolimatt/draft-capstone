import test from "node:test";
import assert from "node:assert/strict";
import { validateAdminCredentialConfig } from "../scripts/syncAdminCredentials.js";

const validEnvironment = {
  ADMIN_NAME: "System Admin",
  ADMIN_EMAIL: "admin@gmail.com",
  ADMIN_PASSWORD: "StrongPassword1!",
  ADMIN_SECRET_KEY: "DifferentPasskey2!",
};

test("credential sync accepts a valid environment configuration", () => {
  const result = validateAdminCredentialConfig(validEnvironment);
  assert.deepEqual(result.errors, []);
  assert.equal(result.config.email, "admin@gmail.com");
});

test("credential sync enforces the login password and passkey requirements", () => {
  const result = validateAdminCredentialConfig({
    ...validEnvironment,
    ADMIN_PASSWORD: "weak",
    ADMIN_SECRET_KEY: "short",
  });

  assert.ok(result.errors.includes("ADMIN_PASSWORD must be at least 8 characters."));
  assert.ok(result.errors.includes("ADMIN_SECRET_KEY must be at least 12 characters."));
});

test("credential sync rejects a passkey that repeats the account password", () => {
  const result = validateAdminCredentialConfig({
    ...validEnvironment,
    ADMIN_SECRET_KEY: validEnvironment.ADMIN_PASSWORD,
  });

  assert.ok(result.errors.includes("ADMIN_SECRET_KEY must be different from ADMIN_PASSWORD."));
});

test("credential sync preserves an existing passkey when ADMIN_SECRET_KEY is empty", () => {
  const result = validateAdminCredentialConfig({
    ...validEnvironment,
    ADMIN_SECRET_KEY: "",
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.config.passkey, "");
});
