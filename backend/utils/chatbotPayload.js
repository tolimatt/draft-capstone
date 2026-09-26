import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getVehicleHourlyRate, roundCurrency } from "./pricing.js";
import { containsModeratedContent } from "./chatModeration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const chatbotServiceDir = path.resolve(repoRoot, "chatbot-service");
const CHATBOT_DATASET_PATH = path.resolve(chatbotServiceDir, "rentifypro_chatbot_dataset_v6.json");
const CHATBOT_CONFIG_PATH = path.resolve(chatbotServiceDir, "chatbot_config.json");
const CHATBOT_DATASET_SCHEMA_VERSION = "v6_intent_multilingual_conversational";

const chatbotConfig = JSON.parse(fs.readFileSync(CHATBOT_CONFIG_PATH, "utf-8"));
const CHATBOT_MAX_INPUT_LENGTH = Number(chatbotConfig.max_message_length || 500);
const TOP_RECOMMENDATIONS = Number(chatbotConfig.recommendation_limit || 3);
const CONFIGURED_VEHICLE_BRANDS = chatbotConfig.vehicle_brands;
if (!Array.isArray(CONFIGURED_VEHICLE_BRANDS) || CONFIGURED_VEHICLE_BRANDS.length === 0) {
  throw new Error("chatbot_config.json must define a non-empty vehicle_brands array");
}

const SUPPORTED_LANGUAGES = new Set(["english", "filipino", "taglish"]);
const SUPPORTED_REPLY_STYLES = new Set(["en", "fil", "taglish"]);
const DEFAULT_LANGUAGE = "english";
const LANGUAGE_CODE_BY_NAME = { english: "en", filipino: "fil", taglish: "taglish" };
const LANGUAGE_NAME_BY_CODE = { en: "english", fil: "filipino", tag: "taglish", taglish: "taglish" };

const RECOMMENDATION_INTENTS = new Set([
  "available_vehicles",
  "available_transmission",
  "passenger_capacity",
  "vehicle_brand_search",
]);
const CONVERSATIONAL_INTENTS = new Set([
  "chat_greeting",
  "chat_wellbeing",
  "chat_identity",
  "chat_gender_identity",
  "chat_language_support",
  "chat_gratitude",
  "chat_acknowledgement",
  "chat_goodbye",
  "chat_casual_conversation",
  "help_request",
  "unclear_message",
  "nonsense_message",
]);

const FALLBACK_REPLIES = {
  english: "Sorry, I couldn't identify the question safely. Please rephrase it with a little more detail.",
  filipino: "Paumanhin, hindi ko matukoy nang ligtas ang tanong. Pakisabi ulit ito nang may kaunting detalye.",
  taglish: "Sorry, hindi ko matukoy nang maayos ang question. Please rephrase with a little more detail.",
};
const REJECT_REPLIES = {
  english: {
    empty: "Please type a message so I can help you.",
    too_long: `Please keep your message within ${CHATBOT_MAX_INPUT_LENGTH} characters.`,
    invalid_characters: "Please remove unsupported control characters and try again.",
    profanity: "Please avoid offensive words. Rephrase your question politely, and I'll gladly help.",
  },
  filipino: {
    empty: "Pakilagay ang iyong mensahe para matulungan kita.",
    too_long: `Pakiikli ang mensahe sa loob ng ${CHATBOT_MAX_INPUT_LENGTH} na characters.`,
    invalid_characters: "Pakialis ang unsupported control characters at subukan ulit.",
    profanity: "Iwasan muna natin ang masasamang salita. I-type ulit nang maayos ang tanong at tutulungan kita.",
  },
  taglish: {
    empty: "Please type your message para matulungan kita.",
    too_long: `Please keep your message within ${CHATBOT_MAX_INPUT_LENGTH} characters.`,
    invalid_characters: "Please remove unsupported control characters and try again.",
    profanity: "Please avoid offensive words. Rephrase mo nang maayos and I'll gladly help.",
  },
};

const FILIPINO_LANGUAGE_MARKERS = [
  /\bano\b/i, /\banong\b/i, /\bpaano\b/i, /\bpano\b/i, /\bmagkano\b/i,
  /\bkailangan\b/i, /\bpwede\b/i, /\bmaaari\b/i, /\bilang\b/i, /\bpasahero\b/i,
  /\bsasakyan\b/i, /\brenta\b/i, /\bbayad\b/i, /\bdeposito\b/i, /\bhanap\b/i,
  /\bmeron\b/i, /\bmayroon\b/i, /\bmay\b.*\b(?:ba|bang)\b/i, /\bkamusta\b/i, /\bsalamat\b/i,
];
const ENGLISH_LANGUAGE_MARKERS = [
  /\bwhat\b/i, /\bhow\b/i, /\bwhere\b/i, /\bwhen\b/i, /\bwhich\b/i,
  /\bcan\b/i, /\bcould\b/i, /\bbooking\b/i, /\bvehicle\b/i, /\bprice\b/i,
  /\brate\b/i, /\bpayment\b/i, /\binsurance\b/i, /\brequirements?\b/i,
];

const TEXT_REPLACEMENTS = [
  [/\u2018|\u2019|\u02bc/g, "'"],
  [/\u201c|\u201d/g, '"'],
  [/\u2010|\u2011|\u2012|\u2013|\u2014|\u2212/g, "-"],
  [/\u00a0/g, " "],
];
const UNSUPPORTED_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

let datasetCache = null;

function cleanText(value = "") {
  let text = String(value ?? "").normalize("NFKC");
  for (const [pattern, replacement] of TEXT_REPLACEMENTS) text = text.replace(pattern, replacement);
  return text.replace(/\s+/gu, " ").trim();
}

function normalizeText(value = "") {
  return cleanText(value)
    .toLocaleLowerCase("en")
    .replace(/\u20b1/gu, " php ")
    .replace(/([!?.,])\1+/gu, "$1")
    .replace(/[^\p{L}\p{N}%#'\-\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

const VEHICLE_BRAND_BY_NORMALIZED = new Map();
for (const value of CONFIGURED_VEHICLE_BRANDS) {
  const canonical = cleanText(value);
  const normalized = normalizeText(canonical);
  if (!canonical || !normalized || VEHICLE_BRAND_BY_NORMALIZED.has(normalized)) {
    throw new Error("chatbot_config.json contains an invalid or duplicate vehicle brand");
  }
  VEHICLE_BRAND_BY_NORMALIZED.set(normalized, canonical);
}

function normalizeLanguage(language) {
  const normalized = normalizeText(language);
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : DEFAULT_LANGUAGE;
}

function detectMessageLanguage(message = "") {
  const normalized = normalizeText(message);
  if (!normalized) return DEFAULT_LANGUAGE;
  const hasFilipino = FILIPINO_LANGUAGE_MARKERS.some((pattern) => pattern.test(normalized));
  const hasEnglish = ENGLISH_LANGUAGE_MARKERS.some((pattern) => pattern.test(normalized));
  if (hasFilipino && hasEnglish) return "taglish";
  if (hasFilipino) return "filipino";
  return "english";
}

function resolveSelectedLanguage(requestedLanguage = "", message = "") {
  const normalized = normalizeText(requestedLanguage);
  if (normalized && normalized !== "auto" && SUPPORTED_LANGUAGES.has(normalized)) return normalized;
  return detectMessageLanguage(message);
}

function getLanguageCode(language) {
  return LANGUAGE_CODE_BY_NAME[normalizeLanguage(language)] || "en";
}

function normalizeStringList(values = []) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = cleanText(value);
    const key = normalizeText(text);
    if (!text || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function loadDataset() {
  const datasetPath = CHATBOT_DATASET_PATH;
  const datasetMtimeMs = fs.existsSync(datasetPath) ? fs.statSync(datasetPath).mtimeMs : -1;
  if (datasetCache?.datasetPath === datasetPath && datasetCache.datasetMtimeMs === datasetMtimeMs) return datasetCache;
  if (!fs.existsSync(datasetPath)) throw new Error(`Required chatbot dataset v6 is missing: ${datasetPath}`);

  const raw = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
  if (raw?.schema_version !== CHATBOT_DATASET_SCHEMA_VERSION) {
    throw new Error(`Chatbot dataset must use schema ${CHATBOT_DATASET_SCHEMA_VERSION}: ${datasetPath}`);
  }

  const items = Array.isArray(raw.items) ? raw.items : [];
  const intentsById = {};
  for (const [index, item] of items.entries()) {
    const intentId = cleanText(item?.id);
    if (!intentId || intentsById[intentId]) {
      throw new Error(`Invalid or duplicate v6 chatbot intent at index ${index}: ${intentId || "missing id"}`);
    }
    const examples = normalizeStringList(item.examples);
    const aliases = normalizeStringList(item.aliases || []);
    const hardNegatives = normalizeStringList(item.hard_negatives || []);
    const responses = item?.responses && typeof item.responses === "object" ? item.responses : {};
    const normalizedResponses = {
      en: normalizeStringList(responses.en),
      fil: normalizeStringList(responses.fil),
      taglish: normalizeStringList(responses.taglish),
    };
    if (!examples.length || Object.values(normalizedResponses).some((answers) => !answers.length)) {
      throw new Error(`Invalid v6 chatbot intent '${intentId}': incomplete examples or responses`);
    }
    intentsById[intentId] = {
      ...item,
      id: intentId,
      description: cleanText(item.description),
      examples,
      aliases,
      hard_negatives: hardNegatives,
      responses: normalizedResponses,
      requires_live_data: Boolean(item.requires_live_data),
      live_source: cleanText(item.live_source),
      policy_source: cleanText(item.policy_source),
    };
  }
  if (!Object.keys(intentsById).length) throw new Error(`No valid intents loaded from dataset: ${datasetPath}`);
  datasetCache = { datasetPath, datasetMtimeMs, intentsById };
  return datasetCache;
}

function getIntent(intentId) {
  return loadDataset().intentsById[intentId] || null;
}

function getIntentAnswers(intentId, language) {
  const item = getIntent(intentId);
  if (!item) return [];
  const preferred = getLanguageCode(language);
  const order = preferred === "taglish" ? ["taglish", "en", "fil"] : [preferred, "en", "fil", "taglish"];
  for (const key of order) {
    const answers = item.responses[key];
    if (Array.isArray(answers) && answers.length) return answers;
  }
  return [];
}

function getCanonicalAnswer(intentId, language) {
  return getIntentAnswers(intentId, language)[0] || "";
}

function normalizeVehicleEntities(value) {
  if (value === undefined || value === null) {
    return { valid: true, value: { brand: null, model: null } };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, value: { brand: null, model: null } };
  }
  const allowedKeys = new Set(["brand", "model", "category", "max_budget", "currency", "rate_unit", "transmission"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return { valid: false, value: { brand: null, model: null } };
  }

  const rawBrand = cleanText(value.brand);
  const brand = rawBrand ? VEHICLE_BRAND_BY_NORMALIZED.get(normalizeText(rawBrand)) : null;
  const rawModel = cleanText(value.model);
  const model = rawModel && rawModel.length <= 80 ? rawModel : null;
  const category = value.category == null ? null : cleanText(value.category).toLowerCase();
  const maxBudget = value.max_budget == null ? null : Number(value.max_budget);
  const currency = value.currency == null ? null : cleanText(value.currency).toUpperCase();
  const rateUnit = value.rate_unit == null ? null : cleanText(value.rate_unit).toLowerCase();
  const transmission = value.transmission == null ? null : cleanText(value.transmission).toLowerCase();
  const valid = (!rawBrand || Boolean(brand)) && (!rawModel || Boolean(model))
    && (category === null || ["sedan", "suv", "van", "pickup", "motorcycle"].includes(category))
    && (maxBudget === null || (Number.isFinite(maxBudget) && maxBudget > 0 && maxBudget <= 10000000))
    && (currency === null || currency === "PHP")
    && (rateUnit === null || ["day", "hour"].includes(rateUnit))
    && (transmission === null || ["automatic", "manual"].includes(transmission))
    && (maxBudget === null || currency === "PHP");
  const normalized = { brand: brand || null, model };
  if (category !== null) normalized.category = category;
  if (maxBudget !== null) normalized.max_budget = maxBudget;
  if (currency !== null) normalized.currency = currency;
  if (rateUnit !== null) normalized.rate_unit = rateUnit;
  if (transmission !== null) normalized.transmission = transmission;
  return { valid, value: normalized };
}

export function normalizePendingVehicleSearch(value) {
  const normalized = normalizeVehicleEntities(value);
  if (!normalized.valid || !value || typeof value !== "object" || Array.isArray(value)) return null;
  const entities = normalized.value;
  if (!entities.max_budget || entities.currency !== "PHP" || (!entities.brand && !entities.category)
    || entities.rate_unit) return null;
  return {
    brand: entities.brand,
    model: entities.model,
    ...(entities.category ? { category: entities.category } : {}),
    max_budget: entities.max_budget,
    currency: "PHP",
    ...(entities.transmission ? { transmission: entities.transmission } : {}),
  };
}

function normalizeConditions(value) {
  if (value == null) return { valid: true, value: {} };
  if (typeof value !== "object" || Array.isArray(value)) return { valid: false, value: {} };
  const booleanKeys = new Set(["remaining_balance", "payment_after_due_date"]);
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "downpayment_percent") {
      if (!Number.isInteger(item) || item < 1 || item > 100) return { valid: false, value: {} };
    } else if (!booleanKeys.has(key) || item !== true) {
      return { valid: false, value: {} };
    }
    result[key] = item;
  }
  return { valid: true, value: result };
}

function normalizeClarification(value, required) {
  if (value == null) return { valid: true, value: { required, type: null, field: null } };
  if (typeof value !== "object" || Array.isArray(value)) return { valid: false, value: null };
  if (Object.keys(value).some((key) => !["required", "type", "field"].includes(key))) return { valid: false, value: null };
  const type = value.type ?? null;
  const field = value.field ?? null;
  const valid = value.required === required
    && (type === null || ["missing_entity", "ambiguous_entity", "ambiguous_intent", "unknown_intent", "spelling_confirmation"].includes(type))
    && (field === null || ["rate_unit", "booking", "brand", "model"].includes(field));
  return { valid, value: { required, type, field } };
}

function hasSignalSlots(slots = {}) {
  return Boolean(slots.type || slots.transmission || slots.pax || slots.budget || slots.brand || slots.model);
}

function extractSlots(message) {
  const amountAwareMessage = cleanText(message)
    .replace(/\u20b1/gu, " PHP ")
    .replace(/(?<=\d),(?=\d)/gu, "");
  const text = normalizeText(amountAwareMessage);
  let pax = null;
  const paxMatch = text.match(/\b(\d{1,2})\s*(pax|passengers?|persons?|people|katao|tao|seats?|seater)\b/u);
  if (paxMatch) pax = Number.parseInt(paxMatch[1], 10);

  let transmission = "";
  if (/\b(automatic|auto|matic)\b/u.test(text)) transmission = "automatic";
  else if (/\b(manual|stick)\b/u.test(text)) transmission = "manual";

  let type = "";
  if (/\b(sedan|car|kotse)\b/u.test(text)) type = "sedan";
  if (/\bsuv\b/u.test(text)) type = "suv";
  if (/\b(van|minivan)\b/u.test(text)) type = "van";
  if (/\b(pick[\s-]?up|truck)\b/u.test(text)) type = "pickup";
  if (/\b(motorcycle|motorbike|motor)\b/u.test(text)) type = "motorcycle";

  let budget = null;
  const budgetMatch =
    text.match(/(?:budget|under|below|max|maximum|hanggang|up to|less than)\s*(?:php|p)?\s*([0-9]+(?:\.[0-9]+)?k?)/u) ||
    text.match(/(?:php|p)\s*([0-9]+(?:\.[0-9]+)?k?)/u);
  if (budgetMatch?.[1]) {
    const raw = budgetMatch[1].toLowerCase();
    const multiplier = raw.endsWith("k") ? 1000 : 1;
    const value = Number.parseFloat(raw.replace(/k$/u, ""));
    if (Number.isFinite(value)) budget = Math.round(value * multiplier);
  }
  return { pax, transmission, type, budget };
}

function normalizeVehicleType(value = "") {
  const normalized = normalizeText(value).replace("pick up", "pickup");
  if (!normalized) return "";
  if (normalized.includes("sedan") || normalized.includes("car") || normalized.includes("kotse")) return "sedan";
  if (normalized.includes("suv")) return "suv";
  if (normalized.includes("van")) return "van";
  if (normalized.includes("pickup") || normalized.includes("truck")) return "pickup";
  if (normalized.includes("motor")) return "motorcycle";
  return normalized;
}

function normalizeTransmission(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized.includes("automatic") || normalized.includes("auto") || normalized.includes("matic")) return "automatic";
  if (normalized.includes("manual") || normalized.includes("stick")) return "manual";
  return normalized;
}

function toNonNegativeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function resolveVehicleHourlyRate(vehicle = {}) {
  const explicitHourlyRate = toNonNegativeNumber(vehicle.hourlyRate);
  if (explicitHourlyRate !== null) return roundCurrency(explicitHourlyRate);
  if (vehicle.dailyRentalRate !== undefined && vehicle.dailyRentalRate !== null) {
    const computed = getVehicleHourlyRate(vehicle, { rateField: "dailyRentalRate", unitField: "pricingUnit" });
    if (computed > 0) return computed;
  }
  const dailyRate = toNonNegativeNumber(vehicle.dailyRate);
  if (dailyRate !== null) return roundCurrency(dailyRate);
  const legacyPrice = toNonNegativeNumber(vehicle.price);
  return legacyPrice !== null ? roundCurrency(legacyPrice) : 0;
}

function findConfiguredBrand(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  for (const [brandKey, canonical] of VEHICLE_BRAND_BY_NORMALIZED) {
    if (` ${normalized} `.includes(` ${brandKey} `)) return canonical;
  }
  return null;
}

function deriveVehicleIdentity(vehicle = {}, name = "") {
  const explicitBrand = findConfiguredBrand(vehicle.brand || vehicle.make || vehicle.manufacturer || "");
  const brand = explicitBrand || findConfiguredBrand(name);
  const explicitModel = cleanText(vehicle.model);
  if (explicitModel) return { brand, model: explicitModel };
  if (!brand) return { brand: null, model: "" };

  const brandKey = normalizeText(brand);
  const nameTokens = cleanText(name).split(/\s+/u).filter(Boolean);
  const brandIndex = nameTokens.findIndex((token) => normalizeText(token) === brandKey);
  const model = brandIndex >= 0 ? cleanText(nameTokens.slice(brandIndex + 1).join(" ")) : "";
  return { brand, model };
}

function normalizeVehicleForChatbot(vehicle = {}) {
  const specs = vehicle.specs || {};
  const images = Array.isArray(vehicle.images) ? vehicle.images : [];
  const hourlyRate = resolveVehicleHourlyRate(vehicle);
  const listedRate = toNonNegativeNumber(vehicle.dailyRentalRate);
  const pricingUnit = vehicle.pricingUnit === "daily" ? "daily" : "hourly";
  const dailyRate = listedRate !== null && pricingUnit === "daily"
    ? roundCurrency(listedRate)
    : roundCurrency(hourlyRate * 24);
  const name = cleanText(vehicle.name) || "Unnamed vehicle";
  const identity = deriveVehicleIdentity(vehicle, name);
  return {
    _id: String(vehicle._id || ""),
    name,
    brand: identity.brand,
    model: identity.model,
    type: normalizeVehicleType(vehicle.type || specs.type || specs.subType || ""),
    transmission: normalizeTransmission(vehicle.transmission || specs.transmission || ""),
    seats: Number(vehicle.seats || specs.seats || 0) || 0,
    dailyRate,
    hourlyRate,
    pricingUnit,
    isAvailable: vehicle.isAvailable ?? vehicle.availabilityStatus === "available",
    location: cleanText(vehicle.location),
    imageUrl: cleanText(vehicle.imageUrl || images[0] || ""),
  };
}

function isUniqueOneEditMatch(leftValue, rightValue) {
  const left = normalizeText(leftValue);
  const right = normalizeText(rightValue);
  if (!left || !right || left === right || Math.abs(left.length - right.length) > 1) return false;

  if (left.length === right.length) {
    const mismatches = [];
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) mismatches.push(index);
      if (mismatches.length > 2) return false;
    }
    if (mismatches.length === 1) return true;
    return mismatches.length === 2
      && mismatches[1] === mismatches[0] + 1
      && left[mismatches[0]] === right[mismatches[1]]
      && left[mismatches[1]] === right[mismatches[0]];
  }

  const [shorter, longer] = left.length < right.length ? [left, right] : [right, left];
  let shortIndex = 0;
  let longIndex = 0;
  let skipped = false;
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1;
      longIndex += 1;
      continue;
    }
    if (skipped) return false;
    skipped = true;
    longIndex += 1;
  }
  return true;
}

function resolveRequestedModelFromLiveVehicles(model, brand, vehicles) {
  const original = cleanText(model);
  const requested = normalizeText(original);
  if (!requested) return { model: "", candidates: [] };

  const brandVehicles = brand
    ? vehicles.filter((vehicle) => vehicle.brand === brand)
    : vehicles;
  const exactMatch = brandVehicles.some((vehicle) => {
    const searchable = normalizeText(`${vehicle.model} ${vehicle.name}`);
    return ` ${searchable} `.includes(` ${requested} `);
  });
  if (exactMatch) return { model: original, candidates: [] };

  const requestedTokens = requested.split(/\s+/u).filter(Boolean);
  if (requestedTokens.length !== 1 || requested.length < 4) return { model: original, candidates: [] };

  const matches = new Map();
  for (const vehicle of brandVehicles) {
    for (const candidate of cleanText(vehicle.model).split(/\s+/u).filter(Boolean)) {
      const normalizedCandidate = normalizeText(candidate);
      if (normalizedCandidate.length < 4 || !isUniqueOneEditMatch(requested, normalizedCandidate)) continue;
      matches.set(normalizedCandidate, candidate);
    }
  }
  const candidates = [...matches.values()].sort((left, right) => left.localeCompare(right, "en"));
  return { model: candidates.length === 1 ? candidates[0] : original,
    candidates: candidates.length > 1 ? candidates : [] };
}

function compareVehicles(a, b, slots) {
  const rateField = slots.rateUnit === "day" ? "dailyRate" : "hourlyRate";
  const comparisons = [
    slots.brand ? Number(b.brand === slots.brand) - Number(a.brand === slots.brand) : 0,
    slots.model ? Number(normalizeText(b.model) === normalizeText(slots.model)) - Number(normalizeText(a.model) === normalizeText(slots.model)) : 0,
    slots.type ? Number(b.type === slots.type) - Number(a.type === slots.type) : 0,
    slots.transmission ? Number(b.transmission === slots.transmission) - Number(a.transmission === slots.transmission) : 0,
    slots.pax ? Math.abs(a.seats - slots.pax) - Math.abs(b.seats - slots.pax) : 0,
    a[rateField] - b[rateField],
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    a._id.localeCompare(b._id),
  ];
  return comparisons.find((value) => value !== 0) || 0;
}

function filterVehiclesForChatbot(vehicles, slots) {
  const normalized = (Array.isArray(vehicles) ? vehicles : [])
    .map((vehicle) => normalizeVehicleForChatbot(vehicle))
    .filter((vehicle) => vehicle.isAvailable);
  const modelResolution = resolveRequestedModelFromLiveVehicles(slots.model, slots.brand, normalized);
  const resolvedSlots = {
    ...slots,
    model: modelResolution.model,
  };
  const strict = normalized.filter((vehicle) => {
    if (resolvedSlots.brand && vehicle.brand !== resolvedSlots.brand) return false;
    if (resolvedSlots.model) {
      const requestedModel = normalizeText(resolvedSlots.model);
      const searchableModel = normalizeText(`${vehicle.model} ${vehicle.name}`);
      if (!` ${searchableModel} `.includes(` ${requestedModel} `)) return false;
    }
    if (resolvedSlots.type && vehicle.type !== resolvedSlots.type) return false;
    if (resolvedSlots.transmission && vehicle.transmission !== resolvedSlots.transmission) return false;
    if (resolvedSlots.pax && vehicle.seats < resolvedSlots.pax) return false;
    if (resolvedSlots.budget && vehicle[resolvedSlots.rateUnit === "day" ? "dailyRate" : "hourlyRate"] > resolvedSlots.budget) return false;
    return true;
  });
  const chosen = strict.length || !hasSignalSlots(resolvedSlots) ? (strict.length ? strict : normalized) : [];
  return {
    slots: resolvedSlots,
    vehicles: chosen.sort((a, b) => compareVehicles(a, b, resolvedSlots)),
    modelCandidates: modelResolution.candidates,
  };
}

function normalizeClassifierLanguage(value, fallbackLanguage) {
  const normalized = cleanText(value).toLowerCase();
  if (SUPPORTED_REPLY_STYLES.has(normalized)) return normalized;
  const languageName = LANGUAGE_NAME_BY_CODE[normalized];
  return languageName ? getLanguageCode(languageName) : getLanguageCode(fallbackLanguage);
}

function normalizeAlternative(value) {
  if (!value || typeof value !== "object") return null;
  const intent = cleanText(value.intent || value.intent_id);
  const confidence = Number(value.confidence ?? value.score);
  if (!getIntent(intent) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  return { intent, confidence };
}

function mapVehicleTypeLabel(type, language) {
  const labels = {
    english: { sedan: "sedans", suv: "SUVs", van: "vans", pickup: "pickup trucks", motorcycle: "motorcycles" },
    filipino: { sedan: "sedan", suv: "SUV", van: "van", pickup: "pickup truck", motorcycle: "motorsiklo" },
    taglish: { sedan: "sedans", suv: "SUVs", van: "vans", pickup: "pickup trucks", motorcycle: "motorcycles" },
  };
  return labels[normalizeLanguage(language)]?.[type] || type;
}

function joinNaturalList(values, language) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  const conjunction = normalizeLanguage(language) === "filipino" ? "at" : "and";
  if (values.length === 2) return `${values[0]} ${conjunction} ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, ${conjunction} ${values.at(-1)}`;
}

function summarizeAvailableTypes(vehicles, language) {
  const seen = new Set();
  const labels = [];
  for (const vehicle of vehicles) {
    if (!vehicle.type || seen.has(vehicle.type)) continue;
    seen.add(vehicle.type);
    labels.push(mapVehicleTypeLabel(vehicle.type, language));
  }
  return joinNaturalList(labels, language);
}

function buildBrandSearchReply(intent, language, payload, recommendations) {
  const selectedLanguage = normalizeLanguage(language);
  const brand = payload.slots.brand || "";
  const model = payload.slots.model || "";
  const label = [brand, model].filter(Boolean).join(" ");
  const total = payload.vehicles.length;

  if (!recommendations.length) {
    if (selectedLanguage === "filipino") return `Wala akong nakitang kasalukuyang listahan ng ${label} na tugma sa paghahanap mo.`;
    if (selectedLanguage === "taglish") return `Wala akong nakitang currently listed na ${label} vehicle na match sa search mo.`;
    return `I couldn't find any currently listed ${label} vehicles matching your search.`;
  }

  if (intent === "rental_rate") {
    const requestedUnit = payload.slots.rateUnit === "day" ? "day" : "hour";
    const lowestRate = recommendations[0][requestedUnit === "day" ? "dailyRate" : "hourlyRate"];
    const formattedRate = Number(lowestRate || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 });
    const unitLabel = requestedUnit === "day" ? "day" : "hour";
    if (selectedLanguage === "filipino") return `May nakita akong ${total} kasalukuyang listahan ng ${label}. Nagsisimula sa PHP ${formattedRate} bawat ${requestedUnit === "day" ? "araw" : "oras"} ang rate; nakadepende pa rin sa iskedyul at mga detalye ng booking ang eksaktong kabuuan.`;
    if (selectedLanguage === "taglish") return `May nakita akong ${total} current ${label} listing${total === 1 ? "" : "s"}. The rate starts at PHP ${formattedRate} per ${unitLabel}; the exact total still depends on the schedule and booking details.`;
    return `I found ${total} current ${label} listing${total === 1 ? "" : "s"}. The rate starts at PHP ${formattedRate} per ${unitLabel}; the exact total still depends on the schedule and booking details.`;
  }

  if (selectedLanguage === "filipino") return `May nakita akong ${total} kasalukuyang listahan ng ${label} sa RentifyPro. Mga katugmang listahan pa lamang ito; ibigay ang petsa at oras ng pagkuha at pagbabalik upang makumpirma kung maaari itong rentahan sa iskedyul mo.`;
  if (selectedLanguage === "taglish") return `May nakita akong ${total} current RentifyPro ${label} listing${total === 1 ? "" : "s"}. Listing matches ito; provide your pickup and return schedule to confirm availability for your dates.`;
  return `I found ${total} current RentifyPro ${label} listing${total === 1 ? "" : "s"}. These are listing matches; provide your pickup and return schedule to confirm availability for your dates.`;
}

function buildRecommendationReply(intent, language, payload, recommendations) {
  const selectedLanguage = normalizeLanguage(language);
  if (payload.slots.brand && (intent === "vehicle_brand_search" || intent === "rental_rate")) {
    return buildBrandSearchReply(intent, selectedLanguage, payload, recommendations);
  }
  if (!recommendations.length) {
    if (selectedLanguage === "filipino") return "Wala akong mahanap na available na sasakyan na tugma sa request mo. Subukang baguhin ang passengers, budget, transmission, o uri ng sasakyan.";
    if (selectedLanguage === "taglish") return "Wala akong mahanap na available na sasakyan na match sa request mo. Try adjusting the passengers, budget, transmission, or vehicle type.";
    return "I couldn't find an available vehicle that matches your request. Try adjusting the passengers, budget, transmission, or vehicle type.";
  }
  if (intent === "available_vehicles" && payload.slots.budget && payload.slots.rateUnit) {
    const unit = payload.slots.rateUnit;
    const amount = Number(payload.slots.budget).toLocaleString("en-PH", { maximumFractionDigits: 2 });
    const criteria = [payload.slots.brand, payload.slots.model,
      payload.slots.type ? mapVehicleTypeLabel(payload.slots.type, selectedLanguage) : ""].filter(Boolean).join(" ");
    const matching = criteria ? ` matching ${criteria}` : "";
    if (selectedLanguage === "filipino") return `May ${payload.vehicles.length} kasalukuyang listing${matching} na hindi lalampas sa PHP ${amount} bawat ${unit === "day" ? "araw" : "oras"}. Ibigay ang pickup at return schedule para ma-check ang availability sa mga petsa mo.`;
    if (selectedLanguage === "taglish") return `May ${payload.vehicles.length} current listing${payload.vehicles.length === 1 ? "" : "s"}${matching} under PHP ${amount} per ${unit}. Provide your pickup and return schedule to check availability for your dates.`;
    return `I found ${payload.vehicles.length} current listing${payload.vehicles.length === 1 ? "" : "s"}${matching} under PHP ${amount} per ${unit}. Provide your pickup and return schedule to check availability for your dates.`;
  }
  if (intent !== "available_vehicles") {
    const base = getCanonicalAnswer(intent, selectedLanguage);
    const suffix = selectedLanguage === "filipino"
      ? "Narito ang mga pinakamalapit na available na sasakyan."
      : "Here are the closest available vehicles.";
    return `${base} ${suffix}`.trim();
  }

  const total = payload.vehicles.length;
  const typeSummary = summarizeAvailableTypes(payload.vehicles, selectedLanguage);
  const preview = total > recommendations.length
    ? selectedLanguage === "filipino"
      ? ` Ipinapakita ang unang ${recommendations.length} ayon sa tugma at presyo.`
      : ` Showing the first ${recommendations.length} by match and price.`
    : "";
  if (selectedLanguage === "filipino") return `May ${total} available na sasakyan ngayon.${typeSummary ? ` Mga uri: ${typeSummary}.` : ""}${preview}`.trim();
  if (selectedLanguage === "taglish") return `May ${total} available vehicle${total === 1 ? "" : "s"} right now.${typeSummary ? ` Available types: ${typeSummary}.` : ""}${preview}`.trim();
  return `There ${total === 1 ? "is" : "are"} ${total} available vehicle${total === 1 ? "" : "s"} right now.${typeSummary ? ` Available types: ${typeSummary}.` : ""}${preview}`.trim();
}

export function validateChatbotInput(message = "") {
  const rawMessage = String(message ?? "");
  const trimmedMessage = rawMessage.trim();
  if (!trimmedMessage) return { isValid: false, reason: "empty", message: "", maxLength: CHATBOT_MAX_INPUT_LENGTH };
  if (rawMessage.length > CHATBOT_MAX_INPUT_LENGTH) return { isValid: false, reason: "too_long", message: trimmedMessage, maxLength: CHATBOT_MAX_INPUT_LENGTH };
  if (containsModeratedContent(trimmedMessage)) return { isValid: false, reason: "profanity", message: trimmedMessage, maxLength: CHATBOT_MAX_INPUT_LENGTH };
  if (UNSUPPORTED_CONTROL_CHARACTERS.test(rawMessage)) return { isValid: false, reason: "invalid_characters", message: trimmedMessage, maxLength: CHATBOT_MAX_INPUT_LENGTH };
  return {
    isValid: true,
    reason: "",
    message: cleanText(trimmedMessage),
    normalizedMessage: normalizeText(trimmedMessage),
    maxLength: CHATBOT_MAX_INPUT_LENGTH,
  };
}

export function buildChatbotPayload(message, language, vehicles = [], entities = null) {
  const originalMessage = cleanText(message);
  const selectedLanguage = resolveSelectedLanguage(language, originalMessage);
  const normalizedEntities = normalizeVehicleEntities(entities);
  const extracted = extractSlots(originalMessage);
  const classifierEntities = normalizedEntities.valid ? normalizedEntities.value : { brand: null, model: null };
  const initialSlots = {
    ...extracted,
    ...classifierEntities,
    type: classifierEntities.category || extracted.type,
    budget: Object.hasOwn(classifierEntities, "max_budget") ? classifierEntities.max_budget : entities ? null : extracted.budget,
    rateUnit: classifierEntities.rate_unit || null,
    transmission: classifierEntities.transmission || extracted.transmission,
  };
  const liveVehiclePayload = filterVehiclesForChatbot(vehicles, initialSlots);
  return {
    selectedLanguage,
    originalMessage,
    normalizedMessage: normalizeText(originalMessage),
    slots: liveVehiclePayload.slots,
    vehicles: liveVehiclePayload.vehicles,
    modelCandidates: liveVehiclePayload.modelCandidates,
  };
}

export function normalizeChatbotResponse(response, fallbackLanguage = DEFAULT_LANGUAGE) {
  if (!response || typeof response !== "object") {
    return { valid: false, intent: "REJECT", score: 0, reply: "", alternatives: [], recommendations: [] };
  }
  if (response.valid === false) {
    return { ...response, valid: false };
  }
  const intent = cleanText(response.intent || response.intent_id || "REJECT");
  const score = Number(response.confidence ?? response.score);
  const language = normalizeClassifierLanguage(response.language || response.reply_style || response.reply_lang, fallbackLanguage);
  const rawAlternatives = Array.isArray(response.alternatives) ? response.alternatives : [];
  const alternatives = rawAlternatives.map(normalizeAlternative);
  const alternativesValid = alternatives.every(Boolean);
  const normalizedEntities = normalizeVehicleEntities(response.entities);
  const normalizedConditions = normalizeConditions(response.conditions);
  const clarification = normalizeClarification(response.clarification, Boolean(response.requires_clarification));
  const intentValid = intent === "REJECT" || Boolean(getIntent(intent));
  const scoreValid = Number.isFinite(score) && score >= 0 && score <= 1;
  const languageValid = SUPPORTED_REPLY_STYLES.has(language);
  const valid = intentValid && scoreValid && languageValid && alternativesValid
    && normalizedEntities.valid && normalizedConditions.valid && clarification.valid;
  return {
    ...response,
    valid,
    intent: valid ? intent : "REJECT",
    intent_id: valid ? intent : "REJECT",
    score: scoreValid ? score : 0,
    confidence: scoreValid ? score : 0,
    language,
    reply_lang: language,
    reply: cleanText(response.reply),
    alternatives: alternatives.filter(Boolean),
    top_preds: Array.isArray(response.top_preds) ? response.top_preds : [],
    recommendations: [],
    requires_clarification: Boolean(response.requires_clarification),
    reason_code: cleanText(response.reason_code || response.decision_reason),
    entities: normalizedEntities.value,
    conditions: normalizedConditions.value,
    clarification: clarification.value,
  };
}

export function buildRejectedChatbotResponse(language, reason = "fallback", reply = "") {
  const selectedLanguage = resolveSelectedLanguage(language, language);
  return {
    reply: cleanText(reply) || REJECT_REPLIES[selectedLanguage]?.[reason] || FALLBACK_REPLIES[selectedLanguage],
    intent: "REJECT",
    intent_id: "REJECT",
    language: getLanguageCode(selectedLanguage),
    reply_lang: getLanguageCode(selectedLanguage),
    score: 0,
    confidence: 0,
    alternatives: [],
    top_preds: [],
    recommendations: [],
    requires_clarification: reason === "clarification",
    reason_code: reason,
    entities: { brand: null, model: null },
    conditions: {},
    clarification: { required: reason === "clarification", type: reason === "clarification" ? "unknown_intent" : null, field: null },
  };
}

export function applyChatbotGuardrails(response, payload) {
  const normalized = normalizeChatbotResponse(response, payload.selectedLanguage);
  if (!normalized.valid) return buildRejectedChatbotResponse(payload.selectedLanguage, "malformed_classifier");
  if (normalized.intent !== "REJECT" && normalized.clarification?.type === "missing_entity") {
    return { ...normalized, reply: normalized.reply, recommendations: [], requires_live_data: false };
  }
  if (normalized.intent === "REJECT" || normalized.requires_clarification) {
    const rejected = buildRejectedChatbotResponse(
      LANGUAGE_NAME_BY_CODE[normalized.language] || payload.selectedLanguage,
      "clarification",
      normalized.reply
    );
    return {
      ...rejected,
      score: normalized.score,
      confidence: normalized.confidence,
      alternatives: normalized.alternatives,
      top_preds: normalized.top_preds,
      reason_code: normalized.reason_code || rejected.reason_code,
      entities: normalized.entities,
      conditions: normalized.conditions,
      clarification: normalized.clarification,
    };
  }

  const datasetIntent = getIntent(normalized.intent);
  const selectedLanguage = LANGUAGE_NAME_BY_CODE[normalized.language] || payload.selectedLanguage;
  if ((RECOMMENDATION_INTENTS.has(normalized.intent) || normalized.intent === "rental_rate")
    && payload.modelCandidates?.length > 1) {
    const models = joinNaturalList(payload.modelCandidates, selectedLanguage);
    const questions = {
      english: `I found similar current models: ${models}. Which model did you mean?`,
      filipino: `May magkahawig na kasalukuyang modelo: ${models}. Aling modelo ang tinutukoy mo?`,
      taglish: `May similar current models: ${models}. Which model did you mean?`,
    };
    return { ...normalized, reply: questions[selectedLanguage], recommendations: [],
      requires_clarification: true,
      clarification: { required: true, type: "ambiguous_entity", field: "model" },
      requires_live_data: false };
  }
  const canonicalReply = getCanonicalAnswer(normalized.intent, selectedLanguage);
  let reply = CONVERSATIONAL_INTENTS.has(normalized.intent) ? normalized.reply || canonicalReply : canonicalReply || normalized.reply;
  let recommendations = [];
  if (RECOMMENDATION_INTENTS.has(normalized.intent) || (normalized.intent === "rental_rate" && payload.slots.brand)) {
    recommendations = payload.vehicles.slice(0, TOP_RECOMMENDATIONS);
    reply = buildRecommendationReply(normalized.intent, selectedLanguage, payload, recommendations);
  }
  if (["payment_downpayment", "unpaid_balance"].includes(normalized.intent)
    && normalized.conditions?.payment_after_due_date) {
    const mentionsDownpayment = normalized.intent === "payment_downpayment"
      && normalized.conditions?.downpayment_percent === 30;
    const dueReplies = {
      english: `${mentionsDownpayment ? "You can choose the 30% down payment when that booking offers it. " : ""}The remaining balance becomes due when the vehicle is returned or its scheduled return time passes. Paying after that leaves a due balance, which can block another booking until settled. Check your booking's payment details for the amount and status; I can't confirm your specific balance here.`,
      filipino: `${mentionsDownpayment ? "Puwede ang 30% down payment kung available ito sa booking mo. " : ""}Nagiging due ang natitirang balanse kapag naibalik ang sasakyan o lumampas ang nakatakdang oras ng pagbabalik. Kung babayaran ito pagkatapos noon, may due balance na maaaring humarang sa panibagong booking hanggang mabayaran. Tingnan ang payment details ng booking mo para sa eksaktong halaga at status.`,
      taglish: `${mentionsDownpayment ? "Puwede ang 30% down payment kung offered sa booking mo. " : ""}Due ang remaining balance kapag naibalik ang vehicle o lumampas ang scheduled return time. Paying after that leaves a due balance that can block another booking until settled. Check your booking payment details for the exact amount and status.`,
    };
    reply = dueReplies[selectedLanguage];
  }
  return {
    ...normalized,
    reply,
    recommendations: recommendations.map((vehicle) => ({
      ...vehicle,
      displayRate: payload.slots.rateUnit === "day" ? vehicle.dailyRate : vehicle.hourlyRate,
      displayRateUnit: payload.slots.rateUnit === "day" ? "day" : "hour",
    })),
    entities: {
      ...normalized.entities,
      model: payload.slots.model || normalized.entities?.model || null,
    },
    requires_live_data: Boolean(datasetIntent?.requires_live_data),
    live_source: cleanText(datasetIntent?.live_source),
  };
}

export function getChatbotDatasetInfo() {
  const { datasetPath, intentsById } = loadDataset();
  return {
    datasetPath,
    configPath: CHATBOT_CONFIG_PATH,
    intentsCount: Object.keys(intentsById).length,
    liveDataIntents: Object.values(intentsById).filter((item) => item.requires_live_data).map((item) => item.id),
  };
}
