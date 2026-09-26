// Run Vite on 4176 and isolated headless Chrome with CDP on 9236, then:
// node --experimental-websocket scripts/chatbot-focus-browser-check.mjs
import assert from "node:assert/strict";

const base = "http://127.0.0.1:4176";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const target = await (await fetch("http://127.0.0.1:9236/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let sequence = 0;
let chatRequests = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const respond = (requestId, status, data) => send("Fetch.fulfillRequest", {
  requestId,
  responseCode: status,
  responseHeaders: [
    { name: "Content-Type", value: "application/json" },
    { name: "Access-Control-Allow-Origin", value: base },
    { name: "Access-Control-Allow-Credentials", value: "true" },
    { name: "Access-Control-Allow-Headers", value: "content-type" },
    { name: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
  ],
  body: Buffer.from(JSON.stringify(data)).toString("base64"),
});
const handleRequest = async ({ requestId, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") return respond(requestId, 200, {});
    if (url.pathname === "/api/auth/me") return respond(requestId, 401, { message: "No session" });
    if (url.pathname === "/api/chat") {
      chatRequests += 1;
      await pause(650);
      return respond(requestId, 200, {
        intent: "chat_gender_identity", language: "en", reply: "I'm an AI assistant, so I don't have a gender or sexual orientation.",
        recommendations: [],
      });
    }
    return respond(requestId, 200, { vehicles: [], total: 0, notifications: [] });
  }
  if (url.origin !== base) return send("Fetch.failRequest", { requestId, errorReason: "Aborted" });
  return send("Fetch.continueRequest", { requestId });
};
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const call = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) call?.reject(new Error(message.error.message));
    else call?.resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown") {
    errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  } else if (message.method === "Fetch.requestPaused") {
    handleRequest(message.params).catch((error) => errors.push(error.message));
  }
};

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result?.value;
};
const wait = async (expression, timeout = 15000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (await evaluate(`Boolean(${expression})`)) return; } catch { /* navigation in progress */ }
    await pause(40);
  }
  throw new Error(`Timed out: ${expression}`);
};
const click = async (selector) => {
  await wait(`document.querySelector(${JSON.stringify(selector)})`);
  const rect = await evaluate(`(() => {
    const { x, y, width, height } = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: x + width / 2, y: y + height / 2 };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
};

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "http*" }] });
  await send("Page.navigate", { url: base });
  await click('button[aria-label="Open Rentify AI"]');

  const input = '[role="dialog"][aria-label="Rentify AI chatbot"] input';
  await wait(`document.querySelector(${JSON.stringify(input)})`);
  assert.equal(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(input)})`), true);
  await send("Input.insertText", { text: "are you a girl?" });
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(input)}).value`), "are you a girl?");

  await click('button[aria-label="Send message"]');
  await wait("document.body.innerText.includes('are you a girl?')");
  assert.equal(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(input)})`), true);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(input)}).disabled`), false);
  await send("Input.insertText", { text: "and you?" });
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(input)}).value`), "and you?");

  await wait("document.body.innerText.includes(\"don't have a gender\")");
  assert.equal(chatRequests, 1);
  assert.equal(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(input)})`), true);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(input)}).value`), "and you?");

  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await wait("document.body.innerText.includes('and you?')");
  await wait(`document.querySelector(${JSON.stringify(input)}).value === ''`);
  await wait("document.querySelectorAll('[role=\"dialog\"] .rp-ai-chat-body p').length >= 5");
  assert.equal(chatRequests, 2);
  assert.equal(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(input)})`), true);

  await click('button[aria-label="Close Rentify AI"]');
  await wait("!document.querySelector('[role=\"dialog\"][aria-label=\"Rentify AI chatbot\"]')");
  await click('button[aria-label="Open Rentify AI"]');
  await wait(`document.activeElement === document.querySelector(${JSON.stringify(input)})`);
  assert.deepEqual(errors, []);
  console.log("Chatbot input focus persists through send, pending reply, follow-up typing, and reopening.");
} finally {
  await send("Target.closeTarget", { targetId: target.id }).catch(() => {});
  ws.close();
}
