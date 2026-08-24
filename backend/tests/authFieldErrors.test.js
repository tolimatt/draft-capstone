import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";

import { loginUser } from "../controllers/auth.controller.js";
import { validateLogin } from "../middleware/validate.middleware.js";
import LoginChallenge from "../models/LoginChallenge.js";
import User from "../models/User.js";

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  cookie() {},
  clearCookie() {},
});

test("login validation returns errors for the exact invalid fields", () => {
  const req = { body: { email: "not-an-email", password: "" } };
  const res = createResponse();
  let calledNext = false;

  validateLogin(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.errors, {
    email: "Enter a valid email address.",
    password: "Password is required.",
  });
});

test("login distinguishes an invalid email from an invalid password", async () => {
  const originalFindChallenge = LoginChallenge.findOne;
  const originalFindUser = User.findOne;
  const answerHash = await bcrypt.hash("7", 4);

  const useChallenge = () => {
    LoginChallenge.findOne = () => ({
      select: async () => ({
        answerHash,
        attempts: 0,
        maxAttempts: 5,
        usedAt: null,
        save: async () => {},
      }),
    });
  };

  const request = {
    body: {
      email: "someone@gmail.com",
      password: "WrongPass1!",
      captchaId: "challenge-id",
      captchaAnswer: "7",
    },
    ip: "127.0.0.1",
  };

  try {
    useChallenge();
    User.findOne = () => ({ select: async () => null });
    const invalidEmailResponse = createResponse();
    await loginUser(request, invalidEmailResponse);

    assert.equal(invalidEmailResponse.statusCode, 401);
    assert.equal(invalidEmailResponse.body.code, "INVALID_EMAIL");
    assert.deepEqual(invalidEmailResponse.body.errors, { email: "Invalid email." });

    useChallenge();
    User.findOne = () => ({
      select: async () => ({
        matchPassword: async () => false,
        password: "stored-password",
      }),
    });
    const invalidPasswordResponse = createResponse();
    await loginUser(request, invalidPasswordResponse);

    assert.equal(invalidPasswordResponse.statusCode, 401);
    assert.equal(invalidPasswordResponse.body.code, "INVALID_PASSWORD");
    assert.deepEqual(invalidPasswordResponse.body.errors, { password: "Invalid password." });
  } finally {
    LoginChallenge.findOne = originalFindChallenge;
    User.findOne = originalFindUser;
  }
});
