export function getMongoConnectionConfig(environment = process.env) {
  const uri = [environment.MONGO_URI_DIRECT, environment.MONGODB_URI, environment.MONGO_URI]
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
  const dbName = String(environment.MONGO_DB_NAME || "").trim();
  const timeout = Number(environment.MONGO_SERVER_SELECTION_TIMEOUT_MS);

  return {
    uri,
    options: {
      serverSelectionTimeoutMS: Number.isFinite(timeout) && timeout > 0 ? timeout : 15000,
      ...(dbName ? { dbName } : {}),
      ...(environment.MONGO_AUTO_INDEX !== undefined
        ? { autoIndex: String(environment.MONGO_AUTO_INDEX).toLowerCase() === "true" }
        : {}),
    },
  };
}
