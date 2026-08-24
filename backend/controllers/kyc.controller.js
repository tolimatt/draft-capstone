// KYC controller
// Handles logged-in and pre-registration flows
import axios from "axios";
import crypto from "crypto";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import User from "../models/User.js";
import KycVerification from "../models/KycVerification.js";
import PreKycDocument from "../models/PreKycDocument.js";
import PreKycFace from "../models/PreKycFace.js";
import { auditLog } from "../middleware/auditLogger.middleware.js";
import { ensureFaceServiceReady, isFaceServiceConnectionError } from "../utils/faceServiceManager.js";
import { verifyPhilippinesDocument } from "../services/geminiDocument.service.js";
import { issuePreKycSession, renewPreKycSession } from "../utils/preKycSession.js";

const isProduction = process.env.NODE_ENV === "production";
const getFaceServiceUrl = () => {
  const configured = String(process.env.FACE_SERVICE_URL || "").trim();
  if (configured) return configured;
  return isProduction ? "" : "http://localhost:8010";
};
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "";
const PRE_KYC_DOC_TTL_HOURS = Number(process.env.PREKYC_DOC_TTL_HOURS || 3);
const PRE_KYC_FACE_TTL_HOURS = Number(process.env.PREKYC_FACE_TTL_HOURS || PRE_KYC_DOC_TTL_HOURS || 3);
const MIN_CHALLENGE_FRAMES = Number(process.env.KYC_MIN_FRAMES || 3);
const MAX_CHALLENGE_FRAMES = Math.max(MIN_CHALLENGE_FRAMES, Number(process.env.KYC_MAX_FRAMES || 5));
const MAX_KYC_IMAGE_BYTES = Number(process.env.KYC_IMAGE_MAX_BYTES || 4 * 1024 * 1024);
const KYC_UPLOAD_DIR = process.env.KYC_UPLOAD_DIR || path.resolve("private_uploads", "kyc");
const DEFAULT_KYC_ERROR_MESSAGE = "We couldn't complete verification right now. Please try again.";

const toErrorDetail = (err) => String(err?.stack || err?.message || err || "Unknown error");

const toClientMessage = (err, fallbackMessage = DEFAULT_KYC_ERROR_MESSAGE) => {
  const status = Number(err?.status) || 500;

  if (status < 500) {
    if (err?.expose === false) return "Request failed.";
    return String(err?.message || fallbackMessage);
  }

  return String(err?.publicMessage || fallbackMessage);
};

const sendKycError = (
  res,
  err,
  {
    logMessage = "KYC request failed",
    fallbackMessage = DEFAULT_KYC_ERROR_MESSAGE,
    includeSuccess = true,
  } = {}
) => {
  auditLog.error("KYC", logMessage, { detail: toErrorDetail(err) });
  const status = Number(err?.status) || 500;
  const message = toClientMessage(err, fallbackMessage);
  if (includeSuccess) return res.status(status).json({ success: false, message });
  return res.status(status).json({ message });
};

const safeKeyMatch = (provided, expected) => {
  const providedBuffer = Buffer.from(String(provided || ""), "utf8");
  const expectedBuffer = Buffer.from(String(expected || ""), "utf8");
  if (!providedBuffer.length || !expectedBuffer.length) return false;
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

const splitFirstLastName = (fullName = "") => {
  const tokens = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    first_name: tokens[0] || "",
    last_name: tokens.length > 1 ? tokens[tokens.length - 1] : "",
  };
};

const recordPreKycDocument = async ({ email, role, sessionId, docType, result }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedEmail || !normalizedSessionId || !docType) return;

  const requestedRetentionHours = result?.review_required
    ? Number(process.env.KYC_PENDING_REVIEW_RETENTION_HOURS || 72)
    : PRE_KYC_DOC_TTL_HOURS;
  const retentionHours = Number.isFinite(requestedRetentionHours) && requestedRetentionHours > 0
    ? requestedRetentionHours
    : result?.review_required
    ? 72
    : 3;
  const expiresAt = new Date(Date.now() + retentionHours * 60 * 60 * 1000);

  await PreKycDocument.findOneAndUpdate(
    { email: normalizedEmail, docType },
    {
      $set: {
        email: normalizedEmail,
        sessionId: normalizedSessionId,
        role: role || "user",
        docType,
        status: result?.review_required
          ? "pending_review"
          : result?.passed
          ? "verified"
          : "rejected",
        country: result?.country || "",
        docCategory: result?.doc_type || "",
        selectedDocCategory: result?.selected_doc_type || "",
        detailsMatched:
          typeof result?.details_match === "boolean" ? result.details_match : true,
        mismatchFields: Array.isArray(result?.mismatch_fields)
          ? result.mismatch_fields
              .map((entry) => String(entry || "").trim())
              .filter(Boolean)
              .slice(0, 12)
          : [],
        suspectedTampering: Boolean(result?.suspected_tampering),
        confidence: result?.confidence || 0,
        reason: result?.reason || "",
        fileName: result?.fileName || "",
        fileKey: result?.fileKey || "",
        filePath: "",
        mimeType: result?.mimeType || "",
        fileSize: result?.fileSize || 0,
        fileHash: result?.fileHash || "",
        verifiedAt: result?.passed && !result?.review_required ? new Date() : undefined,
        expiresAt,
      },
    },
    { upsert: true, new: true }
  );
};

const ensureUploadDir = async () => {
  await fs.mkdir(KYC_UPLOAD_DIR, { recursive: true });
};

const decodeKycBase64 = (base64, { maxBytes = MAX_KYC_IMAGE_BYTES } = {}) => {
  const raw = String(base64 || "").trim();
  const cleanBase64 = raw.includes("base64,") ? raw.slice(raw.indexOf("base64,") + 7) : raw;
  if (!cleanBase64 || !/^[A-Za-z0-9+/=\s]+$/.test(cleanBase64)) {
    const error = new Error("Document must be a valid base64 image.");
    error.status = 400;
    throw error;
  }
  const buffer = Buffer.from(cleanBase64.replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > maxBytes) {
    const error = new Error(`Image must be no larger than ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
    error.status = 413;
    throw error;
  }
  return buffer;
};

const getKycFileType = (buffer, suppliedMime = "") => {
  const mimeType = String(suppliedMime || "").toLowerCase().split(";")[0].trim();
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isPdf = buffer.length > 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
  if (isJpeg && ["", "image/jpeg", "image/jpg"].includes(mimeType)) return { mimeType: "image/jpeg", ext: "jpg" };
  if (isPng && ["", "image/png"].includes(mimeType)) return { mimeType: "image/png", ext: "png" };
  if (isPdf && mimeType === "application/pdf") return { mimeType: "application/pdf", ext: "pdf" };
  const error = new Error("Unsupported or invalid document format.");
  error.status = 400;
  throw error;
};

const validateKycDocument = (base64, mimeType = "") => {
  const buffer = decodeKycBase64(base64);
  return getKycFileType(buffer, mimeType);
};

const validateKycImage = (base64) => validateKycDocument(base64, "");

const saveKycBase64File = async ({ base64, mimeType = "image/jpeg", prefix = "doc" }) => {
  const buffer = decodeKycBase64(base64);
  const fileType = getKycFileType(buffer, mimeType);
  const safePrefix = String(prefix || "doc").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const fileName = `${safePrefix}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${fileType.ext}`;
  await ensureUploadDir();
  const filePath = path.join(KYC_UPLOAD_DIR, fileName);
  await fs.writeFile(filePath, buffer);
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  return {
    fileName,
    fileKey: fileName,
    mimeType: fileType.mimeType,
    fileSize: buffer.length,
    fileHash,
  };
};

const formatIdValidationFailure = (docResult = {}) => ({
  success: false,
  message: docResult.reason || "Please upload a valid ID image that clearly shows at least one face photo.",
  docType: docResult.doc_type || "Unknown",
  selectedDocType: docResult.selected_doc_type || "",
  country: docResult.country || "Unknown",
  confidence: Number(docResult.confidence || 0),
});

const recordPreKycFace = async ({ email, role, sessionId, result }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedEmail || !normalizedSessionId) return;

  const expiresAt = new Date(Date.now() + PRE_KYC_FACE_TTL_HOURS * 60 * 60 * 1000);
  const verified = Boolean(result?.verified);

  await PreKycFace.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        email: normalizedEmail,
        sessionId: normalizedSessionId,
        role: role || "user",
        status: verified ? "approved" : "rejected",
        confidence: Number(result?.confidence || 0),
        reason: result?.message || "",
        verifiedAt: verified ? new Date() : undefined,
        expiresAt,
      },
      $setOnInsert: {
        provider: "face-service",
      },
    },
    { upsert: true, new: true }
  );
};

export const createPreKycSession = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const role = req.body?.role === "owner" ? "owner" : "user";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }
    const previousToken = String(req.body?.previousToken || "").trim();
    const session = previousToken
      ? renewPreKycSession(previousToken, { email, role })
      : issuePreKycSession({ email, role });
    return res.status(201).json({
      success: true,
      preKycToken: session.token,
      email: session.email,
      role: session.role,
    });
  } catch (error) {
    return sendKycError(res, error, {
      logMessage: "Pre-KYC session creation failed",
      fallbackMessage: "We couldn't start document verification right now.",
    });
  }
};

// Send a request to the face service
const proxyToFaceService = async (endpoint, body) => {
  const faceServiceUrl = getFaceServiceUrl();
  if (!faceServiceUrl) {
    throw new Error("FACE_SERVICE_URL is not configured in production.");
  }
  if (!INTERNAL_KEY) {
    throw new Error("INTERNAL_API_KEY is required to communicate with the face service.");
  }
  const url = `${faceServiceUrl}${endpoint}`;
  auditLog.info("KYC", `Proxying to Python: ${url}`);
  const doRequest = () =>
    axios.post(url, body, {
      headers: { "Content-Type": "application/json", "x-internal-key": INTERNAL_KEY },
      timeout: 60000, // Face checks can take a while
    });

  try {
    const response = await doRequest();
    return response.data;
  } catch (err) {
    if (isFaceServiceConnectionError(err)) {
      try {
        const started = await ensureFaceServiceReady();
        if (started) {
          auditLog.warn("KYC", `Face service unreachable, retrying once: ${url}`);
          const retryResponse = await doRequest();
          return retryResponse.data;
        }
      } catch (bootErr) {
        auditLog.error("KYC", "Face service startup/retry failed", { detail: bootErr.message, url });
      }
    }

    // Log the face service error for debugging
    const status = err.response?.status || "no response";
    const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
    auditLog.error("KYC", `Python service error: status=${status}`, { detail, url });

    if (isFaceServiceConnectionError(err)) {
      throw new Error(`Python face service is not running at ${faceServiceUrl}. Start it with: python face-service/main.py`);
    }
    if (err.code === "ETIMEDOUT" || err.code === "ECONNABORTED") {
      throw new Error("Face service timed out. The image may be too large or the service is overloaded.");
    }
    throw new Error(detail || "Face service error.");
  }
};

// Step 1: face quality check
// POST /api/kyc/face/detect
export const faceDetect = async (req, res) => {
  try {
    const { image_base64 } = req.body;
    if (!image_base64) return res.status(400).json({ message: "image_base64 is required" });
    validateKycImage(image_base64);

    const result = await proxyToFaceService("/api/kyc/face/detect", { image_base64 });
    res.json(result);
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "Face detect failed",
      fallbackMessage: "We couldn't check your face right now. Please try again.",
    });
  }
};

// Step 2: save ID face data
// POST /api/kyc/id-register
export const registerIdFace = async (req, res) => {
  try {
    const { id_image_base64, id_image_mime, id_type, user_profile } = req.body;
    if (!id_image_base64) return res.status(400).json({ message: "id_image_base64 is required" });
    validateKycImage(id_image_base64);
    if (!id_type) return res.status(400).json({ message: "Please select the ID type before verifying." });

    const sessionId = `user:${req.user._id.toString()}`;
    const imageBuffer = decodeKycBase64(id_image_base64);
    const imageHash = crypto.createHash("sha256").update(imageBuffer).digest("hex");

    const fallbackName = splitFirstLastName(req.user?.name || user_profile?.full_name);
    const profileContext = {
      full_name: req.user?.name || user_profile?.full_name,
      first_name: req.user?.firstName || user_profile?.first_name || fallbackName.first_name,
      last_name: req.user?.lastName || user_profile?.last_name || fallbackName.last_name,
      email: req.user?.email || user_profile?.email,
      date_of_birth: req.user?.dateOfBirth || user_profile?.date_of_birth,
      gender: req.user?.gender || user_profile?.gender,
      owner_type: req.user?.ownerType || user_profile?.owner_type,
      business_name: req.user?.businessName || user_profile?.business_name,
      permit_number: req.user?.permitNumber || user_profile?.permit_number,
      address: req.user?.address || user_profile?.address,
    };

    const manuallyApproved = await PreKycDocument.findOne({
      email: req.user.email,
      sessionId,
      docType: "id",
      status: "verified",
      fileHash: imageHash,
    }).select("_id");
    const docResult = manuallyApproved
      ? {
          passed: true,
          confidence: 100,
          reason: "ID approved through manual review.",
          selected_doc_type: id_type,
          doc_type: id_type,
        }
      : await verifyPhilippinesDocument({
          base64: id_image_base64,
          mimeType: id_image_mime || "image/jpeg",
          docType: "id",
          selectedDocType: id_type,
          userProfile: profileContext,
        });
    if (docResult.review_required) {
      const fileMeta = await saveKycBase64File({
        base64: id_image_base64,
        mimeType: id_image_mime || "image/jpeg",
        prefix: "review-user-id",
      });
      await recordPreKycDocument({
        email: req.user.email,
        role: req.user.role,
        sessionId,
        docType: "id",
        result: { ...docResult, ...fileMeta, fileHash: imageHash },
      });
      return res.status(202).json({
        success: false,
        reviewRequired: true,
        message: docResult.reason,
      });
    }
    if (!docResult.passed) {
      await recordPreKycDocument({
        email: req.user?.email,
        role: req.user?.role,
        sessionId,
        docType: "id",
        result: docResult,
      });
      return res.status(400).json(formatIdValidationFailure(docResult));
    }

    const payload = {
      user_id: req.user._id.toString(),
      role: req.user.role,
      full_name: req.user.name,
      id_image_base64,
    };

    const result = await proxyToFaceService("/api/kyc/id/register", payload);
    await recordPreKycDocument({
      email: req.user?.email,
      role: req.user?.role,
      sessionId,
      docType: "id",
      result: result?.success
        ? {
            ...docResult,
            passed: true,
            reason: docResult.reason || "ID accepted for face verification.",
          }
        : docResult,
    });

    if (result.success) {
      await KycVerification.findOneAndUpdate(
        { user: req.user._id },
        {
          user: req.user._id,
          status: "id_uploaded",
          remarks: "ID face registered. Awaiting selfie verification.",
          idRegisteredAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    res.json(result);
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "ID registration failed",
      fallbackMessage: "We couldn't verify your ID right now. Please try again.",
    });
  }
};

// Step 3: run the selfie challenge
// POST /api/kyc/selfie/challenge
export const selfieChallenge = async (req, res) => {
  try {
    const { frames_base64 } = req.body;
    if (!frames_base64 || !Array.isArray(frames_base64))
      return res.status(400).json({ message: "frames_base64 array is required" });
    if (frames_base64.length < MIN_CHALLENGE_FRAMES) {
      return res.status(400).json({
        message: `Please capture at least ${MIN_CHALLENGE_FRAMES} selfie frames.`,
      });
    }
    if (frames_base64.length > MAX_CHALLENGE_FRAMES) {
      return res.status(400).json({ message: `Please submit no more than ${MAX_CHALLENGE_FRAMES} selfie frames.` });
    }
    frames_base64.forEach(validateKycImage);

    const payload = {
      user_id: req.user._id.toString(),
      frames_base64,
    };

    const result = await proxyToFaceService("/api/kyc/selfie/challenge", payload);

    if (result.passed) {
      await KycVerification.findOneAndUpdate(
        { user: req.user._id },
        { status: "challenge_passed", challengePassedAt: new Date() }
      );
    }

    res.json(result);
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "Selfie challenge failed",
      fallbackMessage: "We couldn't process the selfie challenge right now. Please try again.",
    });
  }
};

// Step 4: match selfie with ID
// POST /api/kyc/selfie/verify
export const selfieVerify = async (req, res) => {
  try {
    const { challenge_id, selfie_image_base64 } = req.body;
    if (!challenge_id || !selfie_image_base64)
      return res.status(400).json({ message: "challenge_id and selfie_image_base64 are required" });
    validateKycImage(selfie_image_base64);

    const payload = {
      user_id: req.user._id.toString(),
      challenge_id,
      selfie_image_base64,
    };

    const result = await proxyToFaceService("/api/kyc/selfie/verify", payload);
    res.json(result);
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "Selfie verify failed",
      fallbackMessage: "We couldn't verify your selfie right now. Please try again.",
    });
  }
};

// Internal callback from the Python service
// PATCH /api/kyc/internal/update-status
export const internalUpdateStatus = async (req, res) => {
  try {
    const internalKey = req.headers["x-internal-key"];
    if (!safeKeyMatch(internalKey, INTERNAL_KEY))
      return res.status(403).json({ message: "Forbidden" });

    const { user_id, status, confidence } = req.body;
    if (!user_id || !status) return res.status(400).json({ message: "user_id and status required" });

    const normalizedId = String(user_id).trim();
    const looksLikeEmail = normalizedId.includes("@");
    const isObjectId = mongoose.Types.ObjectId.isValid(normalizedId);

    if (!looksLikeEmail && !isObjectId) {
      return res.status(400).json({ message: "user_id must be an email or a valid ObjectId." });
    }

    if (looksLikeEmail && !isObjectId) {
      // Pre-registration status is written by the originating Node request with its
      // signed session id. An email-only callback cannot safely identify that attempt.
      return res.status(202).json({ message: "Pre-KYC callback acknowledged." });
    }

    // kyc_cases is the durable record; User.kycStatus is its denormalized summary for authorization/UI.
    await KycVerification.findOneAndUpdate(
      { user: normalizedId },
      {
        user: normalizedId,
        status,
        faceMatchScore: confidence || 0,
        verifiedAt: status === "approved" ? new Date() : undefined,
        remarks:
          status === "approved"
            ? `Face verified with ${confidence}% confidence.`
            : "Face did not match ID photo.",
      },
      { upsert: true }
    );
    await User.findByIdAndUpdate(normalizedId, { kycStatus: status });

    res.json({ message: `KYC status updated to ${status} for user ${normalizedId}` });
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "Internal update failed",
      fallbackMessage: "Internal KYC update failed.",
      includeSuccess: false,
    });
  }
};

// Get the current user's KYC status
// GET /api/kyc/me
export const getMyKyc = async (req, res) => {
  try {
    const kyc = await KycVerification.findOne({ user: req.user._id });
    // During the collection-split rollout, User.kycStatus preserves the existing status
    // until the explicit migration has copied legacy kycverifications records.
    res.json(kyc || { status: req.user.kycStatus || "not_started" });
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "Get KYC status failed",
      fallbackMessage: "Could not fetch verification status. Please try again.",
      includeSuccess: false,
    });
  }
};

// Pre-registration KYC
// Uses email as user_id before the account exists

// Pre-registration ID upload
export const preRegisterIdFace = async (req, res) => {
  try {
    const { full_name, id_image_base64, id_image_mime, id_type, user_profile } = req.body;
    const { email, role, sessionId } = req.preKyc;

    if (!email || !id_image_base64) {
      return res.status(400).json({ success: false, message: "email and id_image_base64 are required" });
    }
    validateKycImage(id_image_base64);
    if (!id_type) {
      return res.status(400).json({ success: false, message: "Please select the ID type before verifying." });
    }

    const fallbackName = splitFirstLastName(full_name || user_profile?.full_name);
    const profileContext = {
      full_name: full_name || user_profile?.full_name,
      first_name: user_profile?.first_name || fallbackName.first_name,
      last_name: user_profile?.last_name || fallbackName.last_name,
      email,
      date_of_birth: user_profile?.date_of_birth,
      gender: user_profile?.gender,
      owner_type: user_profile?.owner_type || role,
      business_name: user_profile?.business_name,
      permit_number: user_profile?.permit_number,
      address: user_profile?.address,
    };

    const docResult = await verifyPhilippinesDocument({
      base64: id_image_base64,
      mimeType: id_image_mime || "image/jpeg",
      docType: "id",
      selectedDocType: id_type,
      userProfile: profileContext,
    });

    if (!docResult.passed) {
      await recordPreKycDocument({
        email,
        role,
        sessionId,
        docType: "id",
        result: docResult,
      });
      return res.status(400).json(formatIdValidationFailure(docResult));
    }

    const payload = {
      user_id: `pre:${sessionId}`,
      role,
      full_name: full_name || "",
      id_image_base64,
    };

    let fileMeta = {};
    try {
      fileMeta = await saveKycBase64File({
        base64: id_image_base64,
        mimeType: id_image_mime || "image/jpeg",
        prefix: docResult.review_required ? "review-pre-id" : "pre-id",
      });
    } catch (saveErr) {
      return sendKycError(res, saveErr, {
        logMessage: "Pre-reg ID private storage rejected",
        fallbackMessage: "Please upload a valid ID image.",
      });
    }
    auditLog.info("KYC", "Pre-registration ID register requested");
    const result = await proxyToFaceService("/api/kyc/id/register", payload);
    await recordPreKycDocument({
      email,
      role,
      sessionId,
      docType: "id",
      result: result?.success
        ? {
            ...docResult,
            ...fileMeta,
            passed: true,
            reason: docResult.reason || "ID accepted for face verification.",
          }
        : { ...docResult, ...fileMeta },
    });
    res.json({
      ...result,
      reviewRequired: Boolean(docResult.review_required),
      message: docResult.review_required ? docResult.reason : result?.message,
    });
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "Pre-reg ID registration failed",
      fallbackMessage: "We couldn't verify your ID right now. Please try again.",
    });
  }
};

// Pre-registration selfie challenge
export const preSelfieChallenge = async (req, res) => {
  try {
    const { frames_base64 } = req.body;
    const { email, sessionId } = req.preKyc;

    if (!email || !frames_base64 || !Array.isArray(frames_base64)) {
      return res.status(400).json({ success: false, message: "email and frames_base64 array are required" });
    }
    if (frames_base64.length < MIN_CHALLENGE_FRAMES) {
      return res.status(400).json({
        success: false,
        message: `Please capture at least ${MIN_CHALLENGE_FRAMES} selfie frames.`,
      });
    }
    if (frames_base64.length > MAX_CHALLENGE_FRAMES) {
      return res.status(400).json({ success: false, message: `Please submit no more than ${MAX_CHALLENGE_FRAMES} selfie frames.` });
    }
    frames_base64.forEach(validateKycImage);

    const payload = {
      user_id: `pre:${sessionId}`,
      frames_base64,
    };

    auditLog.info("KYC", "Pre-registration selfie challenge requested");
    const result = await proxyToFaceService("/api/kyc/selfie/challenge", payload);
    res.json(result);
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "Pre-reg selfie challenge failed",
      fallbackMessage: "We couldn't process the selfie challenge right now. Please try again.",
    });
  }
};

// Pre-registration selfie check
export const preSelfieVerify = async (req, res) => {
  try {
    const { challenge_id, selfie_image_base64 } = req.body;
    const { email, role, sessionId } = req.preKyc;

    if (!email || !challenge_id || !selfie_image_base64) {
      return res.status(400).json({ success: false, message: "email, challenge_id, and selfie_image_base64 are required" });
    }
    validateKycImage(selfie_image_base64);

    const payload = {
      user_id: `pre:${sessionId}`,
      challenge_id,
      selfie_image_base64,
    };

    auditLog.info("KYC", "Pre-registration selfie verify requested");
    const result = await proxyToFaceService("/api/kyc/selfie/verify", payload);
    await recordPreKycFace({ email, role, sessionId, result });
    res.json(result);
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "Pre-reg selfie verify failed",
      fallbackMessage: "We couldn't verify your selfie right now. Please try again.",
    });
  }
};

// Pre-registration supporting document verification (owner)
export const preVerifySupportingDocument = async (req, res) => {
  try {
    const { doc_image_base64, doc_image_mime, supporting_doc_type, user_profile } = req.body;
    const { email, role, sessionId } = req.preKyc;

    if (!email || !doc_image_base64) {
      return res.status(400).json({
        success: false,
        message: "email and doc_image_base64 are required",
      });
    }
    validateKycDocument(doc_image_base64, doc_image_mime || "");
    if (!supporting_doc_type) {
      return res.status(400).json({
        success: false,
        message: "Please select the supporting document type before verifying.",
      });
    }

    const fallbackName = splitFirstLastName(user_profile?.full_name);
    const profileContext = {
      full_name: user_profile?.full_name,
      first_name: user_profile?.first_name || fallbackName.first_name,
      last_name: user_profile?.last_name || fallbackName.last_name,
      email,
      owner_type: user_profile?.owner_type || role,
      business_name: user_profile?.business_name,
      permit_number: user_profile?.permit_number,
      address: user_profile?.address,
    };

    const docResult = await verifyPhilippinesDocument({
      base64: doc_image_base64,
      mimeType: doc_image_mime || "image/jpeg",
      docType: "supporting",
      selectedDocType: supporting_doc_type,
      userProfile: profileContext,
    });
    let fileMeta = {};
    if (docResult.passed) {
      try {
        fileMeta = await saveKycBase64File({
          base64: doc_image_base64,
          mimeType: doc_image_mime || "image/jpeg",
          prefix: docResult.review_required ? "review-pre-supporting" : "pre-supporting",
        });
      } catch (saveErr) {
        auditLog.warn("KYC", "Failed to store pre-reg supporting document", { detail: saveErr.message });
      }
    }

    await recordPreKycDocument({
      email,
      role,
      sessionId,
      docType: "supporting",
      result: { ...docResult, ...fileMeta },
    });

    if (!docResult.passed) {
      return res.json({
        success: false,
        message:
          docResult.reason ||
          "Only valid Philippine business documents are accepted. Please upload a supported Philippine document.",
        docType: docResult.doc_type,
        selectedDocType: docResult.selected_doc_type,
        country: docResult.country,
        confidence: docResult.confidence,
      });
    }

    return res.json({
      success: true,
      message: docResult.reason || "Supporting document verified.",
      reviewRequired: Boolean(docResult.review_required),
      docType: docResult.doc_type,
      selectedDocType: docResult.selected_doc_type,
      country: docResult.country,
      confidence: docResult.confidence,
    });
  } catch (err) {
    return sendKycError(res, err, {
      logMessage: "Pre-reg supporting doc verify failed",
      fallbackMessage: "We couldn't verify your document right now. Please try again.",
    });
  }
};

export const listPendingKycReviews = async (_req, res) => {
  try {
    const reviews = await PreKycDocument.find({ status: "pending_review" })
      .select("email role sessionId docType docCategory selectedDocCategory detailsMatched mismatchFields suspectedTampering confidence reason fileName mimeType fileSize fileHash createdAt expiresAt")
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    return res.json({ success: true, reviews });
  } catch (error) {
    return sendKycError(res, error, {
      logMessage: "List pending KYC reviews failed",
      fallbackMessage: "Could not load pending KYC reviews.",
    });
  }
};

export const getKycReviewFile = async (req, res) => {
  try {
    const review = await PreKycDocument.findById(req.params.id).select("fileKey mimeType fileName");
    if (!review?.fileKey) return res.status(404).json({ success: false, message: "Review file not found." });

    const root = path.resolve(KYC_UPLOAD_DIR);
    const filePath = path.resolve(root, review.fileKey);
    if (path.dirname(filePath) !== root) {
      return res.status(400).json({ success: false, message: "Invalid review file." });
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.type(review.mimeType || "application/octet-stream");
    return res.sendFile(filePath);
  } catch (error) {
    return sendKycError(res, error, {
      logMessage: "Get KYC review file failed",
      fallbackMessage: "Could not load the review file.",
    });
  }
};

export const decideKycReview = async (req, res) => {
  try {
    const action = String(req.body?.action || "").trim().toLowerCase();
    const remarks = String(req.body?.remarks || "").trim().slice(0, 500);
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be approve or reject." });
    }

    const review = await PreKycDocument.findOne({ _id: req.params.id, status: "pending_review" });
    if (!review) {
      return res.status(404).json({ success: false, message: "Pending review not found." });
    }

    review.status = action === "approve" ? "verified" : "rejected";
    review.reason = remarks || (action === "approve" ? "Approved by an administrator." : "Rejected by an administrator.");
    review.reviewedAt = new Date();
    review.reviewedBy = req.user._id;
    review.verifiedAt = action === "approve" ? new Date() : undefined;
    await review.save();

    auditLog.info("KYC", `Manual document review ${action}d`, {
      userId: req.user._id.toString(),
      reviewId: review._id.toString(),
      docType: review.docType,
    });
    return res.json({ success: true, review });
  } catch (error) {
    return sendKycError(res, error, {
      logMessage: "KYC review decision failed",
      fallbackMessage: "Could not save the KYC review decision.",
    });
  }
};
