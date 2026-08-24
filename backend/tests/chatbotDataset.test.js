import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import datasetV6 from "../../chatbot-service/rentifypro_chatbot_dataset_v6.json" with { type: "json" };

import {
  applyChatbotGuardrails,
  buildChatbotPayload,
  getChatbotDatasetInfo,
} from "../utils/chatbotPayload.js";

test("uses chatbot dataset v6 by default", () => {
  const info = getChatbotDatasetInfo();

  assert.equal(
    path.basename(info.datasetPath),
    "rentifypro_chatbot_dataset_v6.json"
  );
  assert.ok(info.intentsCount > 20, "v6 should expose more intents than v5");
});

test("uses chatbot dataset v6 even when a legacy override is configured", () => {
  const previousDatasetPath = process.env.CHATBOT_DATASET_PATH;
  process.env.CHATBOT_DATASET_PATH = "rentifypro_chatbot_dataset_v5.json";

  try {
    const info = getChatbotDatasetInfo();
    assert.equal(path.basename(info.datasetPath), "rentifypro_chatbot_dataset_v6.json");
  } finally {
    if (previousDatasetPath === undefined) {
      delete process.env.CHATBOT_DATASET_PATH;
    } else {
      process.env.CHATBOT_DATASET_PATH = previousDatasetPath;
    }
  }
});

test("v6 contains unique intents with complete multilingual responses", () => {
  assert.equal(datasetV6.schema_version, "v6_intent_multilingual_conversational");

  const intentIds = new Set();
  const hasAnswers = (value) =>
    (typeof value === "string" && value.trim().length > 0) ||
    (Array.isArray(value) && value.some((answer) => typeof answer === "string" && answer.trim()));

  for (const item of datasetV6.items) {
    assert.ok(item.id, "every v6 intent must have an id");
    assert.equal(intentIds.has(item.id), false, `duplicate v6 intent id: ${item.id}`);
    assert.ok(Array.isArray(item.examples) && item.examples.length > 0, `${item.id} must have examples`);
    assert.ok(hasAnswers(item.responses?.en), `${item.id} must have an English response`);
    assert.ok(hasAnswers(item.responses?.fil), `${item.id} must have a Filipino response`);
    assert.ok(hasAnswers(item.responses?.taglish), `${item.id} must have a Taglish response`);
    intentIds.add(item.id);
  }
});

test("keeps v6 response variants as separate chatbot replies", () => {
  const greeting = datasetV6.items.find((item) => item.id === "chat_greeting");
  const payload = buildChatbotPayload("hello", "english");
  const result = applyChatbotGuardrails(
    { intent: "chat_greeting", score: 0.9, reply: "", reply_lang: "en" },
    payload
  );

  assert.ok(greeting.responses.en.includes(result.reply));
});
