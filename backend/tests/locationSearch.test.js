import test from "node:test";
import assert from "node:assert/strict";
import { buildVehicleLocationQuery, validateLocationSearch, normalizeLocationSearch } from "../utils/locationSearch.js";
import { matchesLocationSearch, sanitizeLocationInput, validateLocationSearch as validateFrontend } from "../../frontend/src/utils/locationSearch.js";
import { getVehicles, getVehicleLocationSuggestions } from "../controllers/vehicle.controller.js";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";

test("location validation accepts real address punctuation and rejects malformed searches on both sides", () => {
  for (const value of ["", "  ", "Dagupan City, Pangasinan", "Sta. Barbara", "Santo Niño", "O’Donnell", "Brgy. 12, San-Jose"]) {
    assert.equal(validateLocationSearch(value), "");
    assert.equal(validateFrontend(value), "");
  }
  for (const value of [",,,", "---", "12345", "a", "Dagupan<script>", "Dagupan.*", "😀", "a".repeat(181), "Dagupan  City", " Dagupan", "San--Jose"]) {
    assert.ok(validateLocationSearch(value));
    assert.equal(validateFrontend(value), validateLocationSearch(value));
  }
  assert.equal(normalizeLocationSearch("  Dagupan   City  "), "Dagupan City");
});

test("typing and paste remove emoji and symbols, collapse spaces, and cap length", () => {
  assert.equal(sanitizeLocationInput("  Dagupan   City@@@ 😀 🚗 !!!"), "Dagupan City ");
  assert.equal(sanitizeLocationInput("San---Jose"), "San-Jose");
  assert.equal(sanitizeLocationInput("Dagupan\n\tCity"), "Dagupan City");
  assert.equal(sanitizeLocationInput("Santo Niño"), "Santo Niño");
  assert.equal(sanitizeLocationInput("a".repeat(200)).length, 180);
  assert.equal(validateLocationSearch("D", { minLetters: 1 }), "");
  assert.equal(validateFrontend("D", { minLetters: 1 }), "");
});

test("suggestions accept the first letter and exclude unavailable and booking-blocked vehicles before grouping", async (t) => {
  t.mock.method(Vehicle, "aggregate", async (pipeline) => {
    const match = pipeline[0].$match;
    assert.equal(match.availabilityStatus, "available");
    assert.ok(match["specs.type"].test("van"));
    const prefix = new RegExp(match.$and[0].location.$regex, "iu");
    assert.ok(prefix.test("Dagupan City"));
    assert.equal(prefix.test("Urdaneta City"), false);
    assert.equal(pipeline[1].$lookup.from, Booking.collection.name);
    assert.deepEqual(pipeline[1].$lookup.pipeline[0].$match, {
      $expr: { $eq: ["$vehicle", "$$vehicleId"] },
      status: { $in: ["pending", "confirmed", "extended"] }, actualReturnAt: null,
    });
    assert.deepEqual(pipeline[2], { $match: { "blockingBookings.0": { $exists: false } } });
    assert.ok(pipeline[3].$group);
    assert.deepEqual(pipeline[5], { $limit: 6 });
    return [{ location: "Dagupan City", vehicleCount: 2 }];
  });
  const res = { setHeader() {}, json(body) { this.body = body; } };
  await getVehicleLocationSuggestions({ query: { search: "D", vehicleType: "van" } }, res, (error) => { throw error; });
  assert.deepEqual(res.body.locations, [{ location: "Dagupan City", vehicleCount: 2 }]);
});

test("empty suggestions do not fall back to a static list and malformed requests are rejected", async (t) => {
  t.mock.method(Vehicle, "aggregate", async () => []);
  const res = { status(code) { this.code = code; return this; }, setHeader() {}, json(body) { this.body = body; } };
  await getVehicleLocationSuggestions({ query: { search: "Unknown" } }, res, (error) => { throw error; });
  assert.deepEqual(res.body.locations, []);
  await getVehicleLocationSuggestions({ query: { search: "😀" } }, res, (error) => { throw error; });
  assert.equal(res.code, 400);
});

test("all location words must match, including words beyond the former eight-word limit", () => {
  const cases = [
    ["Dagupan City, Pangasinan", "Urdaneta City, Pangasinan", false],
    ["Dagupan City, Pangasinan", "dagupan", true],
    ["Sta. Barbara, Pangasinan", "Sta Barbara", true],
    ["Santo Niño", "Niño", true],
    ["San Carlos", "Car", false],
    ["One Two Three Four Five Six Seven Eight", "One Two Three Four Five Six Seven Eight Missing", false],
  ];
  for (const [listing, search, expected] of cases) {
    const query = buildVehicleLocationQuery(search);
    const matches = query.$and.every(({ location }) => new RegExp(location.$regex, "iu").test(listing));
    assert.equal(matches, expected);
    assert.equal(matchesLocationSearch(listing, search), expected);
  }
});

test("direct invalid API search returns 400 without querying vehicles", async (t) => {
  t.mock.method(Vehicle, "countDocuments", () => { throw Error("Must not query invalid input"); });
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await getVehicles({ query: { location: ",,," } }, res, (error) => { throw error; });
  assert.equal(res.code, 400);
  assert.equal(res.body.success, false);
});

test("unmatched API location returns an empty list without retrying an unfiltered query", async (t) => {
  let calls = 0;
  const expected = buildVehicleLocationQuery("Nowhere City");
  t.mock.method(Vehicle, "countDocuments", async (query) => { assert.deepEqual(query, expected); return 0; });
  t.mock.method(Vehicle, "find", (query) => {
    calls += 1;
    assert.deepEqual(query, expected);
    const chain = { populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => [] };
    return chain;
  });
  const res = { setHeader() {}, json(body) { this.body = body; } };
  await getVehicles({ query: { location: "Nowhere City" } }, res, (error) => { throw error; });
  assert.deepEqual(res.body.vehicles, []);
  assert.equal(res.body.pagination.total, 0);
  assert.equal(calls, 1);
});
