import { GoogleGenerativeAI } from "@google/generative-ai";
import { auditLog } from "../middleware/auditLogger.middleware.js";

const ID_DOC_TYPES = [
  "PhilSys National ID",
  "Philippine Passport",
  "LTO Driver's License",
  "UMID",
  "PRC ID",
  "SSS ID",
  "GSIS ID",
  "PhilHealth ID",
  "Postal ID",
  "Voter's ID",
];

const SUPPORTING_DOC_TYPES = [
  "DTI Business Name Registration",
  "SEC Certificate of Registration",
  "Mayor's/Business Permit",
  "BIR Certificate of Registration (Form 2303)",
  "BIR Notice to Issue Receipt/Invoice",
  "Barangay Business Clearance",
  "CDA Certificate of Registration",
];

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toCleanString = (value, max = 200) => String(value || "").trim().slice(0, max);

const PERSON_NAME_MISMATCH_FIELDS = new Set([
  "full name",
  "name",
  "registered name",
  "owner name",
  "person name",
  "first name",
  "last name",
  "middle name",
  "middle initial",
  "given name",
  "surname",
]);

const NAME_SUFFIX_TOKENS = new Set(["jr", "sr", "ii", "iii", "iv", "v", "vi"]);
const NAME_CONNECTOR_TOKENS = new Set([
  "de",
  "del",
  "dela",
  "da",
  "di",
  "la",
  "las",
  "los",
  "dos",
  "van",
  "von",
  "bin",
  "ibn",
  "al",
]);

const removeDiacritics = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeNameToken = (value = "") =>
  removeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .trim();

const toNameTokens = (value = "") =>
  removeDiacritics(value)
    .toLowerCase()
    .replace(/['`]/g, "")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .map((token) => normalizeNameToken(token))
    .filter(Boolean);

const stripTrailingNameSuffixes = (tokens = []) => {
  const next = [...tokens];
  while (next.length && NAME_SUFFIX_TOKENS.has(next[next.length - 1])) next.pop();
  return next;
};

const isWithinEditDistance = (left = "", right = "", maxDistance = 1) => {
  const source = normalizeNameToken(left);
  const target = normalizeNameToken(right);
  if (!source || !target) return false;
  if (source === target) return true;
  if (Math.abs(source.length - target.length) > maxDistance) return false;

  let previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let row = 1; row <= source.length; row += 1) {
    const current = [row];
    let rowMin = current[0];
    for (let col = 1; col <= target.length; col += 1) {
      const substitutionCost = source[row - 1] === target[col - 1] ? 0 : 1;
      const distance = Math.min(
        previous[col] + 1,
        current[col - 1] + 1,
        previous[col - 1] + substitutionCost
      );
      current[col] = distance;
      if (distance < rowMin) rowMin = distance;
    }

    if (rowMin > maxDistance) return false;
    previous = current;
  }

  return previous[target.length] <= maxDistance;
};

const hasApproximateTokenMatch = (left = "", right = "") => {
  const source = normalizeNameToken(left);
  const target = normalizeNameToken(right);
  if (!source || !target) return false;
  if (source === target || source.startsWith(target) || target.startsWith(source)) return true;

  const maxLength = Math.max(source.length, target.length);
  if (maxLength < 6) return false;
  const maxDistance = maxLength >= 9 ? 2 : 1;
  return isWithinEditDistance(source, target, maxDistance);
};

const buildNameVariantSet = (tokens = []) => {
  const cleaned = stripTrailingNameSuffixes(
    tokens.map((token) => normalizeNameToken(token)).filter(Boolean)
  );
  const variants = new Set(cleaned);
  const collapsed = cleaned.join("");
  if (collapsed) variants.add(collapsed);

  for (let i = 0; i < cleaned.length; i += 1) {
    let joined = "";
    for (let j = i; j < cleaned.length && j < i + 3; j += 1) {
      joined += cleaned[j];
      if (joined) variants.add(joined);
    }
  }

  return variants;
};

const parseCommaOrderedNameParts = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || !raw.includes(",")) return null;

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const lastTokens = toNameTokens(parts[0]);
  const firstTokens = toNameTokens(parts.slice(1).join(" "));
  if (!lastTokens.length || !firstTokens.length) return null;

  return { firstTokens, lastTokens };
};

const deriveNameParts = (fullName = "") => {
  const commaOrdered = parseCommaOrderedNameParts(fullName);
  if (commaOrdered) {
    const firstTokens = stripTrailingNameSuffixes(commaOrdered.firstTokens);
    const lastTokens = stripTrailingNameSuffixes(commaOrdered.lastTokens);
    return {
      first_name: firstTokens[0] || "",
      last_name: lastTokens.join(" ") || "",
    };
  }

  const tokens = stripTrailingNameSuffixes(toNameTokens(fullName));
  return {
    first_name: tokens[0] || "",
    last_name: tokens.length > 1 ? tokens[tokens.length - 1] : "",
  };
};

const hasNameTokenMatch = (tokens = [], expected = "") => {
  const expectedTokens = stripTrailingNameSuffixes(toNameTokens(expected));
  if (!expectedTokens.length) return false;

  const expectedCollapsed = expectedTokens.join("");
  const documentVariants = buildNameVariantSet(tokens);
  const documentVariantList = Array.from(documentVariants);
  if (!documentVariantList.length) return false;
  if (expectedCollapsed && documentVariants.has(expectedCollapsed)) return true;

  const significantExpectedTokens = expectedTokens.filter(
    (token) => token.length > 2 && !NAME_CONNECTOR_TOKENS.has(token)
  );
  const expectedCandidates = significantExpectedTokens.length
    ? significantExpectedTokens
    : expectedTokens;

  return expectedCandidates.some((expectedToken) => {
    if (expectedToken.length <= 2) return documentVariants.has(expectedToken);
    return documentVariantList.some((token) => hasApproximateTokenMatch(token, expectedToken));
  });
};

const toNameCandidateString = (value, max = 160) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const cleaned = toCleanString(value, max);
  return /[a-z]/i.test(cleaned) ? cleaned : "";
};

const PRIORITY_PERSON_NAME_FIELDS = [
  "document_person_name",
  "person_name",
  "registered_name",
  "owner_name",
  "proprietor_name",
  "taxpayer_name",
  "individual_name",
  "full_name",
  "name",
];

const isLikelyBusinessNameField = (key = "") => {
  const normalizedKey = normalizeText(key);
  if (!normalizedKey) return false;
  return (
    normalizedKey.includes("business name") ||
    normalizedKey.includes("trade name") ||
    normalizedKey.includes("company name") ||
    normalizedKey.includes("establishment name") ||
    normalizedKey.includes("store name") ||
    normalizedKey.includes("branch name")
  );
};

const isLikelyPersonNameField = (key = "") => {
  const normalizedKey = normalizeText(key);
  if (!normalizedKey || isLikelyBusinessNameField(normalizedKey)) return false;
  return (
    normalizedKey === "name" ||
    normalizedKey.includes("person name") ||
    normalizedKey.includes("registered name") ||
    normalizedKey.includes("owner name") ||
    normalizedKey.includes("proprietor name") ||
    normalizedKey.includes("taxpayer name") ||
    normalizedKey.includes("applicant name") ||
    normalizedKey.includes("individual name") ||
    normalizedKey.includes("full name") ||
    normalizedKey.includes("legal name") ||
    normalizedKey.includes("given name") ||
    normalizedKey.includes("surname")
  );
};

const collectDocumentPersonNameCandidates = (parsed = {}) => {
  const candidates = [];

  for (const field of PRIORITY_PERSON_NAME_FIELDS) {
    const candidate = toNameCandidateString(parsed?.[field], 160);
    if (candidate) candidates.push(candidate);
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    for (const [key, value] of Object.entries(parsed)) {
      if (!isLikelyPersonNameField(key)) continue;
      const candidate = toNameCandidateString(value, 160);
      if (candidate) candidates.push(candidate);
    }
  }

  return Array.from(new Set(candidates)).slice(0, 10);
};

const evaluateExpectedNamesAgainstDocumentName = ({
  documentName = "",
  expectedFirst = "",
  expectedLast = "",
}) => {
  const commaOrderedName = parseCommaOrderedNameParts(documentName);
  if (commaOrderedName) {
    return {
      firstMatches: hasNameTokenMatch(commaOrderedName.firstTokens, expectedFirst),
      lastMatches: hasNameTokenMatch(commaOrderedName.lastTokens, expectedLast),
    };
  }

  const documentTokens = toNameTokens(documentName);
  return {
    firstMatches: hasNameTokenMatch(documentTokens, expectedFirst),
    lastMatches: hasNameTokenMatch(documentTokens, expectedLast),
  };
};

const isPersonNameMismatchField = (value = "") =>
  PERSON_NAME_MISMATCH_FIELDS.has(normalizeText(value));

const normalizeCountry = (value) => {
  const cleaned = normalizeText(value);
  if (cleaned.includes("philippines") || cleaned === "ph" || cleaned === "phl") return "PH";
  return cleaned ? cleaned.toUpperCase() : "";
};

const pickAllowedDocTypes = (docType) =>
  docType === "supporting" ? SUPPORTING_DOC_TYPES : ID_DOC_TYPES;

const resolveAllowedDocType = (docType, allowed) => {
  const normalized = normalizeText(docType);
  if (!normalized) return "";

  const exact = allowed.find((entry) => normalizeText(entry) === normalized);
  if (exact) return exact;

  const partial = allowed.find((entry) => {
    const normalizedEntry = normalizeText(entry);
    return normalizedEntry.includes(normalized) || normalized.includes(normalizedEntry);
  });
  return partial || "";
};

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(lowered)) return true;
    if (["false", "0", "no"].includes(lowered)) return false;
  }
  return fallback;
};

const toStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => toCleanString(entry, 80))
    .filter(Boolean)
    .slice(0, 12);
};

const sanitizeUserProfile = (profile = {}) => {
  const fullName = toCleanString(profile?.full_name || profile?.name, 120);
  const derivedName = deriveNameParts(fullName);
  return {
    full_name: fullName,
    first_name: toCleanString(profile?.first_name || profile?.firstName || derivedName.first_name, 80),
    last_name: toCleanString(profile?.last_name || profile?.lastName || derivedName.last_name, 80),
    date_of_birth: toCleanString(profile?.date_of_birth || profile?.birth_date, 40),
    gender: toCleanString(profile?.gender, 40),
    email: toCleanString(profile?.email, 120),
    owner_type: toCleanString(profile?.owner_type, 40),
    business_name: toCleanString(profile?.business_name, 160),
    permit_number: toCleanString(profile?.permit_number, 80),
    address: toCleanString(profile?.address, 200),
  };
};

const hasAnyProfileDetails = (profile = {}) =>
  Object.values(profile).some((entry) => Boolean(toCleanString(entry, 300)));

const formatProfileForPrompt = (profile = {}) => {
  const entries = [
    ["First name", profile.first_name],
    ["Last name", profile.last_name],
    ["Provided full name (may include middle name)", profile.full_name],
    ["Date of birth", profile.date_of_birth],
    ["Gender", profile.gender],
    ["Email", profile.email],
    ["Owner type", profile.owner_type],
    ["Business name", profile.business_name],
    ["Permit number", profile.permit_number],
    ["Address", profile.address],
  ].filter(([, value]) => Boolean(value));

  if (!entries.length) return "";
  return entries.map(([label, value]) => `- ${label}: ${value}`).join("\n");
};

const evaluatePersonNameAlignment = ({ profile = {}, parsed = {}, mismatchFields = [] }) => {
  const expectedFirst = toCleanString(profile.first_name, 80);
  const expectedLast = toCleanString(profile.last_name, 80);
  if (!expectedFirst || !expectedLast) {
    return {
      resolvedMismatchFields: mismatchFields,
      forceDetailsMatch: false,
      forceDetailsMismatch: false,
    };
  }

  const documentPersonNameCandidates = collectDocumentPersonNameCandidates(parsed);
  if (!documentPersonNameCandidates.length) {
    return {
      resolvedMismatchFields: mismatchFields,
      forceDetailsMatch: false,
      forceDetailsMismatch: false,
    };
  }

  const nonNameMismatchFields = mismatchFields.filter((field) => !isPersonNameMismatchField(field));
  const hasOnlyNameMismatches = mismatchFields.length > 0 && nonNameMismatchFields.length === 0;
  let firstMatches = false;
  let lastMatches = false;

  for (const documentName of documentPersonNameCandidates) {
    const result = evaluateExpectedNamesAgainstDocumentName({
      documentName,
      expectedFirst,
      expectedLast,
    });
    firstMatches = firstMatches || result.firstMatches;
    lastMatches = lastMatches || result.lastMatches;
    if (firstMatches && lastMatches) break;
  }
  const nameMatches = firstMatches && lastMatches;

  if (nameMatches) {
    return {
      resolvedMismatchFields: nonNameMismatchFields,
      forceDetailsMatch: hasOnlyNameMismatches,
      forceDetailsMismatch: false,
    };
  }

  const nextMismatchFields = [...nonNameMismatchFields];
  if (!firstMatches) nextMismatchFields.push("First name");
  if (!lastMatches) nextMismatchFields.push("Last name");

  return {
    resolvedMismatchFields: Array.from(new Set(nextMismatchFields)).slice(0, 12),
    forceDetailsMatch: false,
    forceDetailsMismatch: true,
  };
};

const GEMINI_LIMIT_MESSAGE =
  "Document verification is temporarily busy due to high demand. Please try again in a few minutes.";
const GEMINI_UNAVAILABLE_MESSAGE =
  "Document verification is temporarily unavailable right now. Please try again later.";

export const normalizeDocumentConfidence = (value) => {
  const raw = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.max(0, Math.min(100, raw > 0 && raw <= 1 ? raw * 100 : raw));
};

export const requiresManualDocumentReview = (confidence, minimum = 70) =>
  normalizeDocumentConfidence(confidence) < Math.max(0, Math.min(100, Number(minimum) || 0));

const summarizeGeminiError = (error) => {
  const message = String(error?.message || "");
  const parts = [message];
  if (error?.status) parts.push(`status=${error.status}`);
  if (error?.code) parts.push(`code=${error.code}`);
  if (error?.response?.status) parts.push(`responseStatus=${error.response.status}`);
  if (error?.response?.data) parts.push(`responseData=${safeStringify(error.response.data)}`);
  if (error?.stack) parts.push(`stack=${String(error.stack)}`);
  return parts.filter(Boolean).join(" | ");
};

const toSafeGeminiError = (error) => {
  const raw = summarizeGeminiError(error);
  const isLimitError =
    /\b429\b/i.test(raw) ||
    /quota/i.test(raw) ||
    /rate[\s-]*limit/i.test(raw) ||
    /resource[\s-]*exhausted/i.test(raw) ||
    /too many requests/i.test(raw);

  auditLog.error("KYC", "Gemini document verification failed", { detail: raw });

  const safe = new Error(isLimitError ? GEMINI_LIMIT_MESSAGE : GEMINI_UNAVAILABLE_MESSAGE);
  safe.status = isLimitError ? 429 : 503;
  return safe;
};

export async function verifyPhilippinesDocument({
  base64,
  mimeType = "image/jpeg",
  docType = "id",
  selectedDocType = "",
  userProfile = {},
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing in backend .env");
  if (!base64) throw new Error("Document image missing");

  const cleanBase64 = String(base64).includes("base64,")
    ? String(base64).split("base64,")[1]
    : String(base64);
  const approxBytes = Math.floor(cleanBase64.length * 0.75);
  const maxBytes = Number(process.env.KYC_DOC_MAX_BYTES || 4 * 1024 * 1024);

  const baseFailure = {
    passed: false,
    confidence: 0,
    country: "",
    doc_type: "Unknown",
    selected_doc_type: "",
    details_match: true,
    mismatch_fields: [],
    suspected_tampering: false,
    reason: "Document verification failed.",
  };

  if (approxBytes > maxBytes) {
    return {
      ...baseFailure,
      reason: "Document file is too large. Please upload a smaller image.",
    };
  }

  const isIdCheck = docType === "id";
  const allowedDocTypes = pickAllowedDocTypes(docType);
  const allowedList = allowedDocTypes.map((entry) => `- ${entry}`).join("\n");
  const selectedTypeRaw = toCleanString(selectedDocType, 140);
  const selectedTypeCanonical = resolveAllowedDocType(selectedTypeRaw, allowedDocTypes);
  const fullProfile = sanitizeUserProfile(userProfile);
  // Send only fields needed for the particular comparison. Email and unrelated
  // registration data are intentionally excluded from the external vision request.
  const sanitizedProfile = isIdCheck
    ? {
        full_name: fullProfile.full_name,
        first_name: fullProfile.first_name,
        last_name: fullProfile.last_name,
        date_of_birth: fullProfile.date_of_birth,
        gender: fullProfile.gender,
      }
    : {
        full_name: fullProfile.full_name,
        first_name: fullProfile.first_name,
        last_name: fullProfile.last_name,
        owner_type: fullProfile.owner_type,
        business_name: fullProfile.business_name,
        permit_number: fullProfile.permit_number,
        address: fullProfile.address,
      };
  const hasProfileDetails = hasAnyProfileDetails(sanitizedProfile);
  const profilePrompt = formatProfileForPrompt(sanitizedProfile);

  if (selectedTypeRaw && !selectedTypeCanonical) {
    return {
      ...baseFailure,
      selected_doc_type: selectedTypeRaw,
      reason: "Please select a valid document type and try again.",
    };
  }

  const selectedTypeInstruction = selectedTypeCanonical
    ? `User selected document type: "${selectedTypeCanonical}". The detected document type must match this exactly.`
    : "No selected document type was provided.";
  const profileInstruction = hasProfileDetails
    ? `Cross-check document details against this user profile:
${profilePrompt}
For person-name matching, compare ONLY first name and last name. Ignore middle names/initials, suffixes, punctuation, spacing, and order differences like "LAST, FIRST M." or "LASTNAME FIRSTNAME".
When a name is comma-separated (e.g., "DELA CRUZ, JUAN P."), treat the text before the comma as last name and the text after the comma as first/given names.
For BIR Notice to Issue Receipt/Invoice and similar forms, extract the "Registered Name" line into document_person_name.
Do not fail if first and last names match but middle names differ or are missing.
If a clearly readable field conflicts, fail and list the mismatched fields.
When person names mismatch, use "First name" and/or "Last name" in mismatch_fields (do not use "Full name").`
    : "No user profile details were provided for cross-checking.";

  const instruction = isIdCheck
    ? `
You are a strict identity document verification system for RentifyPro.

You will receive one uploaded ID image.

Task:
1) Decide whether this is a real, original ID document image (not synthetic, AI-generated, edited, or screen-captured).
2) Confirm the ID contains at least one real human face photo.
3) Identify document type from this allowed list:
${allowedList}
4) ${selectedTypeInstruction}
5) ${profileInstruction}
6) Be conservative. If uncertain, fail.

Return ONLY JSON:
{
  "passed": boolean,
  "confidence": number,
  "country": string,
  "doc_type": string,
  "document_person_name": string,
  "has_face": boolean,
  "face_count": number,
  "suspected_tampering": boolean,
  "details_match": boolean,
  "mismatch_fields": string[],
  "reason": string
}
`.trim()
    : `
You are a strict business document verification system for RentifyPro.

You will receive one uploaded supporting business document (photo or scan).

Task:
1) Decide whether the document is real/original and not synthetic, AI-generated, or edited.
2) Confirm the document is a Philippine business document.
3) Identify document type from this allowed list:
${allowedList}
4) ${selectedTypeInstruction}
5) ${profileInstruction}
6) If the document is unclear, mismatched, or suspicious, fail.

Return ONLY JSON:
{
  "passed": boolean,
  "confidence": number,
  "country": "PH" | "Unknown" | string,
  "doc_type": string,
  "document_person_name": string,
  "suspected_tampering": boolean,
  "details_match": boolean,
  "mismatch_fields": string[],
  "reason": string
}
`.trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash-lite";
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: instruction,
  });

  let result;
  try {
    result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Document image:" },
            { inlineData: { data: cleanBase64, mimeType } },
            {
              text: selectedTypeCanonical
                ? `Selected document type: ${selectedTypeCanonical}`
                : "Selected document type: not provided",
            },
            {
              text: hasProfileDetails
                ? `Profile details for cross-check:\n${profilePrompt}`
                : "Profile details for cross-check: not provided",
            },
            { text: "Analyze and return JSON only." },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
  } catch (error) {
    throw toSafeGeminiError(error);
  }

  const text = result?.response?.text?.() ?? "";
  const parsed = safeJsonParse(text.trim());
  if (!parsed || typeof parsed.passed !== "boolean") {
    return {
      ...baseFailure,
      selected_doc_type: selectedTypeCanonical || selectedTypeRaw,
      reason: "AI returned an invalid response. Please upload a clearer document image.",
    };
  }

  const confidence = normalizeDocumentConfidence(parsed.confidence);
  const configuredMinConfidence = Number(process.env.KYC_DOCUMENT_AUTO_APPROVE_MIN_CONFIDENCE || 70);
  const autoApproveMinConfidence = Number.isFinite(configuredMinConfidence)
    ? Math.max(0, Math.min(100, configuredMinConfidence))
    : 70;
  const country = normalizeCountry(parsed.country) || "Unknown";
  const rawDocType = toCleanString(parsed.doc_type, 140);
  const detectedDocType = resolveAllowedDocType(rawDocType, allowedDocTypes);
  const docTypeValue = detectedDocType || rawDocType || "Unknown";
  const selectedTypeMatch = selectedTypeCanonical
    ? Boolean(detectedDocType && normalizeText(detectedDocType) === normalizeText(selectedTypeCanonical))
    : true;
  const suspectedTampering =
    parseBoolean(parsed.suspected_tampering, false) ||
    parseBoolean(parsed.synthetic_or_edited, false) ||
    parseBoolean(parsed.fake_document, false);
  const mismatchFields = toStringArray(parsed.mismatch_fields);
  const {
    resolvedMismatchFields,
    forceDetailsMatch,
    forceDetailsMismatch,
  } = evaluatePersonNameAlignment({
    profile: sanitizedProfile,
    parsed,
    mismatchFields,
  });
  const effectiveMismatchFields = resolvedMismatchFields.slice(0, 12);
  const detailsMatchFlag = parseBoolean(parsed.details_match, true);
  const effectiveDetailsFlag = forceDetailsMismatch
    ? false
    : forceDetailsMatch
    ? true
    : detailsMatchFlag;
  const detailsAligned = hasProfileDetails ? effectiveDetailsFlag && effectiveMismatchFields.length === 0 : true;

  const withBaseDetails = {
    confidence,
    country,
    doc_type: docTypeValue,
    selected_doc_type: selectedTypeCanonical || selectedTypeRaw,
    details_match: detailsAligned,
    mismatch_fields: effectiveMismatchFields,
    suspected_tampering: suspectedTampering,
  };

  if (isIdCheck) {
    const rawFaceCount = Number(parsed.face_count);
    const faceCount = Number.isFinite(rawFaceCount) ? Math.max(0, Math.floor(rawFaceCount)) : 0;
    const hasFace = typeof parsed.has_face === "boolean" ? parsed.has_face : faceCount >= 1;
    const requiresAllowedType = Boolean(selectedTypeCanonical);
    const docTypeAllowed = requiresAllowedType ? Boolean(detectedDocType) : true;

    if (
      !parsed.passed ||
      !hasFace ||
      !docTypeAllowed ||
      !selectedTypeMatch ||
      !detailsAligned ||
      suspectedTampering
    ) {
      let reason = toCleanString(parsed.reason, 220) || "Please upload a valid ID image.";
      if (suspectedTampering) {
        reason =
          "Document appears manipulated or AI-generated. Please upload the original unedited ID photo.";
      } else if (selectedTypeCanonical && !selectedTypeMatch) {
        reason = `Selected ID type (${selectedTypeCanonical}) does not match the uploaded document.`;
      } else if (!detailsAligned) {
        reason = effectiveMismatchFields.length
          ? `Document details do not match your profile: ${effectiveMismatchFields.join(", ")}.`
          : "Document details do not match the personal details you entered.";
      } else if (!hasFace) {
        reason = "Please upload a valid ID image that clearly shows at least one face photo.";
      } else if (!parsed.passed) {
        reason = toCleanString(parsed.reason, 220) || "Please upload a clearer government ID image.";
      }

      return {
        ...baseFailure,
        ...withBaseDetails,
        has_face: hasFace,
        face_count: faceCount,
        reason,
      };
    }

    return {
      passed: true,
      ...withBaseDetails,
      review_required: requiresManualDocumentReview(confidence, autoApproveMinConfidence),
      has_face: true,
      face_count: faceCount,
      reason:
        requiresManualDocumentReview(confidence, autoApproveMinConfidence)
          ? "The ID passed initial checks but requires manual review before registration can finish."
          : toCleanString(parsed.reason, 220) || "ID verified.",
    };
  }

  const docTypeAllowed = Boolean(detectedDocType);
  if (
    !parsed.passed ||
    country !== "PH" ||
    !docTypeAllowed ||
    !selectedTypeMatch ||
    !detailsAligned ||
    suspectedTampering
  ) {
    let reason =
      toCleanString(parsed.reason, 220) ||
      "Only valid Philippine business documents are accepted. Please upload a supported Philippine document.";
    if (suspectedTampering) {
      reason =
        "Document appears manipulated or AI-generated. Please upload the original unedited business document.";
    } else if (selectedTypeCanonical && !selectedTypeMatch) {
      reason = `Selected document type (${selectedTypeCanonical}) does not match the uploaded document.`;
    } else if (country !== "PH") {
      reason = "Only Philippine business documents are accepted.";
    } else if (!detailsAligned) {
      reason = effectiveMismatchFields.length
        ? `Document details do not match your profile: ${effectiveMismatchFields.join(", ")}.`
        : "Document details do not match the details you entered.";
    }

    return {
      ...baseFailure,
      ...withBaseDetails,
      reason,
    };
  }

  return {
    passed: true,
    ...withBaseDetails,
    review_required: requiresManualDocumentReview(confidence, autoApproveMinConfidence),
    country: "PH",
    reason:
      requiresManualDocumentReview(confidence, autoApproveMinConfidence)
        ? "The document passed initial checks but requires manual review before registration can finish."
        : toCleanString(parsed.reason, 220) || "Document verified.",
  };
}
