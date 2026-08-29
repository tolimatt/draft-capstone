import test from "node:test";
import assert from "node:assert/strict";

import {
  REALTIME_CHAT_MAX_LENGTH,
  REALTIME_CHAT_MAX_WORDS,
  validateRealtimeChatText,
} from "../utils/chatMessageValidation.js";

test("accepts the same character set as the chatbot", () => {
  const result = validateRealtimeChatText("Hello,\nare you available?.");
  assert.equal(result.isValid, true);
  assert.equal(result.text, "Hello,\nare you available?.");
});

test("rejects disallowed real-time chat characters", () => {
  for (const character of ["@", "/", "-", "_", "!", "1", "🙂"]) {
    const result = validateRealtimeChatText(`Hello${character}`);
    assert.equal(result.isValid, false, character);
    assert.equal(result.reason, "invalid_characters", character);
  }
});

test("rejects empty and oversized messages", () => {
  assert.equal(validateRealtimeChatText("   ").reason, "empty");
  assert.equal(
    validateRealtimeChatText("a".repeat(REALTIME_CHAT_MAX_LENGTH + 1)).reason,
    "too_long"
  );
});

test("rejects messages above the real-time chat word limit", () => {
  const result = validateRealtimeChatText(
    Array.from({ length: REALTIME_CHAT_MAX_WORDS + 1 }, () => "word").join(" ")
  );

  assert.equal(result.isValid, false);
  assert.equal(result.reason, "too_many_words");
});
