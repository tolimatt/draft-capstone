import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import PreKycDocument from "../models/PreKycDocument.js";
import { verifyPhilippinesDocument } from "../services/geminiDocument.service.js";
import { auditLog } from "../middleware/auditLogger.middleware.js";

const positiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const workerEnabled = () => String(process.env.KYC_DOCUMENT_QUEUE_ENABLED || "true").toLowerCase() !== "false";
const autoApprovalEnabled = () => String(process.env.KYC_ALLOW_GEMINI_AUTO_APPROVE || "false").toLowerCase() === "true";
const uploadRoot = () => path.resolve(process.env.KYC_UPLOAD_DIR || path.resolve("private_uploads", "kyc"));
const maxAttempts = () => Math.max(1, Math.floor(positiveNumber(process.env.KYC_GEMINI_MAX_ATTEMPTS, 3)));
const requestsPerMinute = () => Math.max(1, Math.floor(positiveNumber(process.env.KYC_GEMINI_REQUESTS_PER_MINUTE, 4)));
const retryDelayMs = (attempt) => Math.min(30_000 * (2 ** Math.max(attempt - 1, 0)), 5 * 60_000);

let timer = null;
let running = false;
let lastGeminiRequestAt = 0;

const safeFilePath = (fileKey) => {
  const root = uploadRoot();
  const key = String(fileKey || "").trim();
  if (!key || key !== path.basename(key) || /[\\/]/.test(key)) return "";
  const target = path.resolve(root, key);
  return path.dirname(target) === root ? target : "";
};

const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const throttleGemini = async () => {
  const minimumGap = Math.ceil(60_000 / requestsPerMinute());
  const remaining = minimumGap - (Date.now() - lastGeminiRequestAt);
  if (remaining > 0) await wait(remaining);
  lastGeminiRequestAt = Date.now();
};

const claimNextDocument = async () => {
  const now = new Date();
  const staleLock = new Date(Date.now() - positiveNumber(process.env.KYC_PROCESSING_LOCK_TIMEOUT_MS, 10 * 60_000));
  return PreKycDocument.findOneAndUpdate(
    {
      $or: [
        { status: "queued" },
        { status: "retry_wait", nextAttemptAt: { $lte: now } },
        { status: "processing", processingLockedAt: { $lte: staleLock } },
      ],
    },
    {
      $set: { status: "processing", processingLockedAt: now, processingError: "" },
      $inc: { processingAttempts: 1 },
    },
    { sort: { createdAt: 1 }, new: true },
  ).select("+profileSnapshot");
};

const processClaimedDocument = async (document) => {
  const filePath = safeFilePath(document.fileKey);
  if (!filePath) throw Object.assign(new Error("Private document file is unavailable."), { permanent: true });
  const buffer = await fs.readFile(filePath);
  const actualHash = crypto.createHash("sha256").update(buffer).digest("hex");
  if (document.fileHash && actualHash !== document.fileHash) {
    throw Object.assign(new Error("Private document integrity check failed."), { permanent: true });
  }

  await throttleGemini();
  const result = await verifyPhilippinesDocument({
    base64: buffer.toString("base64"),
    mimeType: document.mimeType || "image/jpeg",
    docType: document.docType,
    selectedDocType: document.selectedDocCategory,
    userProfile: document.profileSnapshot || {},
  });

  const allowAutomaticApproval = autoApprovalEnabled() && result.passed && !result.review_required;
  const status = allowAutomaticApproval ? "verified" : "pending_review";
  const now = new Date();
  await PreKycDocument.updateOne(
    { _id: document._id, status: "processing" },
    {
      $set: {
        status,
        country: result.country || "",
        docCategory: result.doc_type || "",
        detailsMatched: typeof result.details_match === "boolean" ? result.details_match : true,
        mismatchFields: Array.isArray(result.mismatch_fields) ? result.mismatch_fields.slice(0, 12) : [],
        suspectedTampering: Boolean(result.suspected_tampering),
        confidence: Number(result.confidence || 0),
        reason: allowAutomaticApproval
          ? result.reason || "Document passed automated checks."
          : result.reason || "Document is ready for Super Admin review.",
        verifiedAt: allowAutomaticApproval ? now : null,
        lastProcessedAt: now,
        processingLockedAt: null,
        nextAttemptAt: null,
        processingError: "",
      },
    },
  );
  auditLog.info("KYC", "Queued document screening completed", {
    reviewId: document._id.toString(),
    status,
    attempt: document.processingAttempts,
  });
};

const handleProcessingFailure = async (document, error) => {
  const attempt = Number(document.processingAttempts || 1);
  const retryable = !error?.permanent && [429, 500, 502, 503, 504].includes(Number(error?.status || 503));
  const shouldRetry = retryable && attempt < maxAttempts();
  const status = shouldRetry ? "retry_wait" : "pending_review";
  const safeMessage = shouldRetry
    ? "Automated screening is temporarily unavailable. The request will retry automatically."
    : "Automated screening was unavailable. A Super Admin must review this document manually.";
  await PreKycDocument.updateOne(
    { _id: document._id },
    {
      $set: {
        status,
        reason: safeMessage,
        processingError: String(error?.message || "Processing failed").slice(0, 240),
        processingLockedAt: null,
        lastProcessedAt: new Date(),
        nextAttemptAt: shouldRetry ? new Date(Date.now() + retryDelayMs(attempt)) : null,
      },
    },
  );
  auditLog.warn("KYC", "Queued document screening deferred", {
    reviewId: document._id.toString(),
    status,
    attempt,
    httpStatus: Number(error?.status || 0),
  });
};

export const processNextKycDocument = async () => {
  if (!workerEnabled() || running) return false;
  running = true;
  try {
    const document = await claimNextDocument();
    if (!document) return false;
    try {
      await processClaimedDocument(document);
    } catch (error) {
      await handleProcessingFailure(document, error);
    }
    return true;
  } finally {
    running = false;
  }
};

export const startKycDocumentProcessingJob = () => {
  if (timer || !workerEnabled()) return;
  const intervalMs = positiveNumber(process.env.KYC_DOCUMENT_QUEUE_POLL_MS, 5_000);
  void processNextKycDocument();
  timer = setInterval(() => void processNextKycDocument(), intervalMs);
  timer.unref?.();
};

export const stopKycDocumentProcessingJob = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
};
