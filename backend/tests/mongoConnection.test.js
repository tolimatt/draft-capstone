import test from "node:test";
import assert from "node:assert/strict";
import { getMongoConnectionConfig } from "../config/mongoConnection.js";

test("Atlas URIs without a database path use the shared application's database name", () => {
  const config = getMongoConnectionConfig({
    MONGODB_URI: "mongodb+srv://example.mongodb.net/?retryWrites=true",
    MONGO_DB_NAME: " rentifypro ",
  });
  assert.equal(config.options.dbName, "rentifypro");
});

test("the standard Atlas URI is preferred over the SRV URI", () => {
  const config = getMongoConnectionConfig({
    MONGO_URI_DIRECT: " mongodb://example.mongodb.net/?tls=true ",
    MONGODB_URI: "mongodb+srv://example.mongodb.net/",
    MONGO_URI: "mongodb+srv://website.mongodb.net/",
  });
  assert.equal(config.uri, "mongodb://example.mongodb.net/?tls=true");
});

test("admin URI takes precedence over the linked website URI when no direct URI is set", () => {
  assert.equal(getMongoConnectionConfig({
    MONGO_URI_DIRECT: " ",
    MONGODB_URI: "mongodb://127.0.0.1:27017/admin",
    MONGO_URI: "mongodb://127.0.0.1:27017/website",
  }).uri, "mongodb://127.0.0.1:27017/admin");
});

test("the linked website URI works without the legacy admin setting", () => {
  const config = getMongoConnectionConfig({ MONGO_URI: "mongodb://127.0.0.1:27017/rentifypro" });
  assert.equal(config.uri, "mongodb://127.0.0.1:27017/rentifypro");
  assert.equal(Object.hasOwn(config.options, "dbName"), false);
  assert.equal(getMongoConnectionConfig({}).uri, "");
});

test("shared timeout and automatic index settings are honored", () => {
  const config = getMongoConnectionConfig({
    MONGO_SERVER_SELECTION_TIMEOUT_MS: "20000",
    MONGO_AUTO_INDEX: "false",
  });
  assert.equal(config.options.serverSelectionTimeoutMS, 20000);
  assert.equal(config.options.autoIndex, false);
  assert.equal(getMongoConnectionConfig({ MONGO_AUTO_INDEX: "true" }).options.autoIndex, true);
  for (const value of [undefined, "", "invalid", "0", "-1"]) {
    assert.equal(getMongoConnectionConfig({ MONGO_SERVER_SELECTION_TIMEOUT_MS: value }).options.serverSelectionTimeoutMS, 15000);
  }
});
