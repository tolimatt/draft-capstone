import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";

const listen = async (app) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  return server;
};

const close = async (server) => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
};

test("chat route preserves a missing-unit clarification and fulfills its short follow-up", async () => {
  const seen = [];
  const classifier = express();
  classifier.use(express.json());
  classifier.get("/", (_req, res) => res.json({ status: "ok" }));
  classifier.post("/chat", (req, res) => {
    seen.push(req.body);
    const hasUnit = req.body.message === "per day";
    const entities = { brand: null, model: null, category: "suv", max_budget: 2000,
      currency: "PHP", ...(hasUnit ? { rate_unit: "day" } : {}) };
    res.json({ intent: "available_vehicles", confidence: 0.995, language: hasUnit ? "taglish" : "en",
      entities, conditions: {}, alternatives: [],
      requires_clarification: !hasUnit,
      clarification: { required: !hasUnit, type: hasUnit ? null : "missing_entity", field: hasUnit ? null : "rate_unit" },
      reply: hasUnit ? "" : "Is your PHP 2,000 budget per day or per hour?" });
  });
  const classifierServer = await listen(classifier);
  process.env.CHATBOT_URL = `http://127.0.0.1:${classifierServer.address().port}`;
  process.env.CHATBOT_SERVICE_AUTOSTART = "false";

  const previousFind = Vehicle.find;
  const previousDistinct = Booking.distinct;
  let vehicleQueries = 0;
  Vehicle.find = () => {
    vehicleQueries += 1;
    return { select: () => ({ lean: async () => [
      { _id: "everest", name: "Ford Everest", dailyRentalRate: 1800, pricingUnit: "daily", availabilityStatus: "available", specs: { type: "suv", seats: 7 } },
      { _id: "fortuner", name: "Toyota Fortuner", dailyRentalRate: 2500, pricingUnit: "daily", availabilityStatus: "available", specs: { type: "suv", seats: 7 } },
    ] }) };
  };
  Booking.distinct = async () => [];

  let apiServer;
  try {
    const { default: chatRoutes } = await import("../routes/chat.routes.js");
    const api = express();
    api.use(express.json());
    api.use("/api/chat", chatRoutes);
    apiServer = await listen(api);
    const url = `http://127.0.0.1:${apiServer.address().port}/api/chat`;
    const post = async (body) => {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(body) });
      assert.equal(response.status, 200);
      return response.json();
    };

    const first = await post({ message: "Are there SUVs under ₱2,000?", language: "auto" });
    assert.equal(first.intent, "available_vehicles");
    assert.equal(first.clarification.field, "rate_unit");
    assert.equal(vehicleQueries, 0, "missing rate unit must not trigger a listing query");
    assert.equal(seen[0].language, "auto");

    const second = await post({ message: "per day", language: "auto", previousLanguage: "taglish",
      pendingSearch: first.entities });
    assert.deepEqual(seen[1].previous_context, first.entities);
    assert.equal(seen[1].previous_language, "taglish");
    assert.equal(second.language, "taglish");
    assert.deepEqual(second.recommendations.map((vehicle) => vehicle._id), ["everest"]);
    assert.match(second.reply, /PHP 2,000 per day/);
    assert.equal(vehicleQueries, 1);
  } finally {
    Vehicle.find = previousFind;
    Booking.distinct = previousDistinct;
    if (apiServer) await close(apiServer);
    await close(classifierServer);
  }
});
