// Run with Node 20: node --experimental-websocket scripts/readiness-browser-check.mjs
// Requires a frontend preview on 4175 and an isolated headless Chrome on CDP 9235.
// All API traffic is intercepted. No real accounts, payments, or records are used.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const base = "http://127.0.0.1:4175";
const target = await (await fetch("http://127.0.0.1:9235/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let role = "user", mode = "hold", bookingStatus = "pending", paymentCaptured = false;
let statusUpdates = 0, verifyRequests = 0;
const held = [];
const booking = () => ({
  _id: "507f1f77bcf86cd799439012", status: bookingStatus, paymentStatus: "unpaid",
  pickupAt: new Date(Date.now() + 86400000).toISOString(), returnAt: new Date(Date.now() + 172800000).toISOString(),
  vehicle: { _id: "507f1f77bcf86cd799439014", name: "Test rental vehicle", location: "Manila", dailyRentalRate: 100 },
  renter: { _id: "507f1f77bcf86cd799439011", name: "Test Renter", email: "renter@example.test" },
  owner: { _id: "507f1f77bcf86cd799439013", name: "Test Vehicle Owner", email: "owner@example.test" },
  durationMinutes: 1440, totalAmount: 2400, vehicleHourlyRate: 100, paymentAmountDue: 2400,
});
const document = { id: "507f1f77bcf86cd799439015", customer: "Test Renter", email: "renter@example.test", role: "Renter", document: "Government ID", fileName: "test-id.jpg", approval: "Pending", reviewVersion: "test-hash", submitted: "2026-09-06", reason: "Ready for manual review." };
async function fulfill(event, body, status = 200) {
  await send("Fetch.fulfillRequest", { requestId: event.requestId, responseCode: status, responseHeaders: [
    { name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: base },
    { name: "Access-Control-Allow-Credentials", value: "true" }, { name: "Access-Control-Allow-Headers", value: "content-type,x-pre-kyc-token" },
    { name: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,PUT,DELETE,OPTIONS" },
  ], body: Buffer.from(JSON.stringify(body)).toString("base64") });
}
async function route(event) {
  const url = new URL(event.request.url), method = event.request.method;
  if (url.pathname.includes("/api/")) {
    if (method === "OPTIONS") return fulfill(event, {});
    const endpoint = url.pathname.slice(url.pathname.indexOf("/api/") + 4);
    if (endpoint === "/auth/me") return fulfill(event, { user: { _id: role === "owner" ? "507f1f77bcf86cd799439013" : "507f1f77bcf86cd799439011", name: "Readiness Tester", email: "tester@example.test", role, isVerified: true, kycStatus: "approved" } });
    if (endpoint === "/bookings/me" || endpoint === "/owner/bookings") {
      if (mode === "hold") { held.push(event); return; }
      return fulfill(event, mode === "error" ? { message: "Could not load bookings. Please retry." } : { bookings: mode === "empty" ? [] : [booking()], page: { hasMore: false } }, mode === "error" ? 503 : 200);
    }
    if (endpoint.includes("/owner/bookings/") && endpoint.endsWith("/status")) {
      statusUpdates += 1;
      await sleep(700);
      bookingStatus = JSON.parse(event.request.postData).status;
      return fulfill(event, { booking: booking(), message: "Booking confirmed." });
    }
    if (endpoint.includes("/bookings/") && endpoint.includes("verify")) {
      verifyRequests += 1;
      return fulfill(event, { booking: { ...booking(), paymentStatus: paymentCaptured ? "paid" : "partial" }, paymentCaptured, paymentStatus: paymentCaptured ? "paid" : "partial" });
    }
    if (endpoint === "/admin/data") return fulfill(event, { customers: [], vehicles: [], documents: [document], bookings: [], syncedAt: new Date().toISOString() });
    if (endpoint.startsWith("/admin/documents/") && method === "PATCH") {
      const body = JSON.parse(event.request.postData);
      assert.ok(body.remarks.length >= 10);
      document.approval = "Rejected"; document.reason = body.remarks;
      return fulfill(event, { document });
    }
    if (endpoint === "/vehicles") return fulfill(event, mode === "error" ? { message: "Could not load vehicles. Try again." } : { vehicles: [] }, mode === "error" ? 503 : 200);
    return fulfill(event, { success: true, notifications: [], reports: [], unreadCount: 0, counts: {}, summary: {}, messages: [], users: [] });
  }
  if (url.origin !== base && ["http:", "https:"].includes(url.protocol)) return send("Fetch.failRequest", { requestId: event.requestId, errorReason: "Aborted" });
  return send("Fetch.continueRequest", { requestId: event.requestId });
}
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const call = pending.get(message.id); pending.delete(message.id);
    if (message.error) call?.reject(new Error(message.error.message)); else call?.resolve(message.result);
  } else if (message.method === "Fetch.requestPaused") route(message.params).catch((error) => errors.push(error.message));
  else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
};
await send("Page.enable"); await send("Runtime.enable"); await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
await send("Emulation.setDeviceMetricsOverride", { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
};
const text = () => evaluate("document.body.innerText");
async function waitFor(fragment) {
  for (let i = 0; i < 80; i++) { if ((await text()).includes(fragment)) return; await sleep(100); }
  throw new Error(`Missing UI text: ${fragment}\n${(await text()).slice(-1400)}`);
}
async function click(label) {
  const clicked = await evaluate(`(() => { const button = [...document.querySelectorAll('button,a')].find(e => e.textContent.trim() === ${JSON.stringify(label)}); if (!button) return false; button.click(); return true; })()`);
  assert.equal(clicked, true, `Control exists: ${label}`);
}
const navigate = (route) => send("Page.navigate", { url: base + route });
const checks = [];
try {
  await navigate("/bookings"); await waitFor("Loading bookings...");
  mode = "error";
  while (held.length) await fulfill(held.shift(), { message: "Could not load bookings. Please retry." }, 503);
  await waitFor("Retry"); assert.ok(!(await text()).includes("No current bookings yet"));
  mode = "empty"; await click("Retry"); await waitFor("Browse vehicles");
  checks.push("Renter loading, failure, retry, and true empty states");
  mode = "bookings"; bookingStatus = "rejected"; await click("All"); await waitFor("Rejected");
  assert.ok(!(await text()).includes("Cancelled / declined"));
  checks.push("Rejected bookings retain their distinct status and recovery action");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
  await fs.writeFile(path.join(os.tmpdir(), "rentifypro-readiness-mobile.png"), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
  checks.push("Renter mobile layout fits the viewport");
  await send("Emulation.setDeviceMetricsOverride", { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
  role = "owner"; mode = "hold"; bookingStatus = "pending";
  await navigate("/owner-dashboard?tab=Bookings"); await waitFor("Loading bookings...");
  mode = "error"; while (held.length) await fulfill(held.shift(), { message: "Could not load bookings. Please retry." }, 503);
  await waitFor("Retry"); assert.ok(!(await text()).includes("Your queue is clear"));
  mode = "bookings"; await click("Retry"); await waitFor("Approve");
  await click("Approve"); await waitFor("Approving booking...");
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Reject').disabled"), true);
  await waitFor("Booking confirmed."); assert.equal(statusUpdates, 1);
  checks.push("Owner retry, approval success, and disabled competing decisions");
  role = "user"; bookingStatus = "confirmed";
  await navigate("/bookings?bookingId=507f1f77bcf86cd799439012&payment=success&checkoutId=checkout_test");
  await waitFor("Payment is still processing.");
  assert.ok((await evaluate("location.search")).includes("checkout_test"));
  assert.equal(verifyRequests, 4);
  paymentCaptured = true; await click("Check payment status"); await waitFor("Payment successful.");
  assert.equal(await evaluate("location.search"), "");
  checks.push("Pending second payment is rechecked instead of mistaken for the previous downpayment");
  mode = "error"; await navigate("/vehicles"); await waitFor("Could not load vehicles");
  mode = "empty"; await click("Retry"); await waitFor("No vehicles match your search");
  checks.push("Vehicle search recovers from a failed request");
  role = "admin"; await navigate("/admin-dashboard"); await waitFor("Documents"); await click("Documents"); await waitFor("test-id.jpg"); await click("Review");
  await click("Reject"); await waitFor("Explain what is wrong");
  await evaluate(`(() => { const e = document.querySelector('#document-rejection-reason'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(e, 'The name is unreadable. Upload a clearer photo.'); e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click("Reject"); await waitFor("Reject this document?"); await click("Reject document"); await waitFor("Document marked as rejected.");
  checks.push("Admin rejection requires and submits applicant correction instructions");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks.length, checks, screenshot: path.join(os.tmpdir(), "rentifypro-readiness-mobile.png") }, null, 2));
} finally {
  await send("Page.close"); ws.close();
}
