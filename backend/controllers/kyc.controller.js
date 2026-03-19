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
const KYC_UPLOAD_DIR = process.env.KYC_UPLOAD_DIR || path.resolve("uploads", "kyc");
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

const recordPreKycDocument = async ({ email, role, docType, result }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !docType) return;

  const expiresAt = new Date(Date.now() + PRE_KYC_DOC_TTL_HOURS * 60 * 60 * 1000);

  await PreKycDocument.findOneAndUpdate(
    { email: normalizedEmail, docType },
    {
      $set: {
        email: normalizedEmail,
        role: role || "user",
        docType,
        status: result?.passed ? "verified" : "rejected",
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
        filePath: result?.filePath || "",
        mimeType: result?.mimeType || "",
        fileSize: result?.fileSize || 0,
        fileHash: result?.fileHash || "",
        verifiedAt: result?.passed ? new Date() : undefined,
        expiresAt,
      },
    },
    { upsert: true, new: true }
  );
};

const ensureUploadDir = async () => {
  await fs.mkdir(KYC_UPLOAD_DIR, { recursive: true });
};

const saveKycBase64File = async ({ base64, mimeType = "image/jpeg", prefix = "doc" }) => {
  const cleanBase64 = String(base64 || "").includes("base64,")
    ? String(base64).split("base64,")[1]
    : String(base64 || "");
  const buffer = Buffer.from(cleanBase64, "base64");
  if (!buffer.length) {
    throw new Error("Document file is empty.");
  }
  const safePrefix = String(prefix || "doc").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const ext = mimeType?.includes("pdf")
    ? "pdf"
    : mimeType?.includes("png")
    ? "png"
    : "jpg";
  const fileName = `${safePrefix}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  await ensureUploadDir();
  const filePath = path.join(KYC_UPLOAD_DIR, fileName);
  await fs.writeFile(filePath, buffer);
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  return {
    fileName,
    filePath,
    mimeType,
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

const recordPreKycFace = async ({ email, role, result }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  const expiresAt = new Date(Date.now() + PRE_KYC_FACE_TTL_HOURS * 60 * 60 * 1000);
  const verified = Boolean(result?.verified);

  await PreKycFace.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        email: normalizedEmail,
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

// Send a request to the face service
const proxyToFaceService = async (endpoint, body) => {
  const faceServiceUrl = getFaceServiceUrl();
  if (!faceServiceUrl) {
    throw new Error("FACE_SERVICE_URL is not configured in production.");
  }
  const url = `${faceServiceUrl}${endpoint}`;
  auditLog.info("KYC", `Proxying to Python: ${url}`);
  const doRequest = () =>
    axios.post(url, body, {
      headers: { "Content-Type": "application/json" },
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

    const docResult = await verifyPhilippinesDocument({
      base64: id_image_base64,
      mimeType: id_image_mime || "image/jpeg",
      docType: "id",
      selectedDocType: id_type || "",
      userProfile: profileContext,
    });
    if (!docResult.passed) {
      await recordPreKycDocument({
        email: req.user?.email,
        role: req.user?.role,
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
      const expiresAt = new Date(Date.now() + PRE_KYC_FACE_TTL_HOURS * 60 * 60 * 1000);
      await PreKycFace.findOneAndUpdate(
        { email: normalizedId.toLowerCase() },
        {
          $set: {
            email: normalizedId.toLowerCase(),
            status,
            confidence: confidence || 0,
            reason:
              status === "approved"
                ? `Face verified with ${confidence}% confidence.`
                : "Face did not match ID photo.",
            verifiedAt: status === "approved" ? new Date() : undefined,
            expiresAt,
          },
          $setOnInsert: { provider: "face-service" },
        },
        { upsert: true, new: true }
      );

      return res.json({ message: `Pre-KYC status updated to ${status} for ${normalizedId}` });
    }

    await User.findByIdAndUpdate(normalizedId, { kycStatus: status });

    await KycVerification.findOneAndUpdate(
      { user: normalizedId },
      {
        status,
        faceMatchScore: confidence || 0,
        verifiedAt: status === "approved" ? new Date() : undefined,
        remarks:
          status === "approved"
            ? `Face verified with ${confidence}% confidence.`
            : "Face did not match ID photo.",
      }
    );

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
    res.json(kyc || { status: "not_started" });
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
    const { email, full_name, role, id_image_base64, id_image_mime, id_type, user_profile } = req.body;

    if (!email || !id_image_base64) {
      return res.status(400).json({ success: false, message: "email and id_image_base64 are required" });
    }
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

    let fileMeta = {};
    try {
      fileMeta = await saveKycBase64File({
        base64: id_image_base64,
        mimeType: id_image_mime || "image/jpeg",
        prefix: "pre-id",
      });
    } catch (saveErr) {
      auditLog.warn("KYC", "Failed to store pre-reg ID image", { detail: saveErr.message });
    }

    if (!docResult.passed) {
      await recordPreKycDocument({
        email,
        role,
        docType: "id",
        result: { ...docResult, ...fileMeta },
      });
      return res.status(400).json(formatIdValidationFailure(docResult));
    }

    const payload = {
      user_id: email.toLowerCase().trim(),
      role: role || "user",
      full_name: full_name || "",
      id_image_base64,
    };

    auditLog.info("KYC", `Pre-registration ID register for: ${email}`);
    const result = await proxyToFaceService("/api/kyc/id/register", payload);
    await recordPreKycDocument({
      email,
      role,
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
    res.json(result);
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
    const { email, frames_base64 } = req.body;

    if (!email || !frames_base64 || !Array.isArray(frames_base64)) {
      return res.status(400).json({ success: false, message: "email and frames_base64 array are required" });
    }
    if (frames_base64.length < MIN_CHALLENGE_FRAMES) {
      return res.status(400).json({
        success: false,
        message: `Please capture at least ${MIN_CHALLENGE_FRAMES} selfie frames.`,
      });
    }

    const payload = {
      user_id: email.toLowerCase().trim(),
      frames_base64,
    };

    auditLog.info("KYC", `Pre-registration selfie challenge for: ${email}`);
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
    const { email, challenge_id, selfie_image_base64, role } = req.body;

    if (!email || !challenge_id || !selfie_image_base64) {
      return res.status(400).json({ success: false, message: "email, challenge_id, and selfie_image_base64 are required" });
    }

    const payload = {
      user_id: email.toLowerCase().trim(),
      challenge_id,
      selfie_image_base64,
    };

    auditLog.info("KYC", `Pre-registration selfie verify for: ${email}`);
    const result = await proxyToFaceService("/api/kyc/selfie/verify", payload);
    await recordPreKycFace({ email, role, result });
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
    const { email, role, doc_image_base64, doc_image_mime, supporting_doc_type, user_profile } = req.body;

    if (!email || !doc_image_base64) {
      return res.status(400).json({
        success: false,
        message: "email and doc_image_base64 are required",
      });
    }
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
          prefix: "pre-supporting",
        });
      } catch (saveErr) {
        auditLog.warn("KYC", "Failed to store pre-reg supporting document", { detail: saveErr.message });
      }
    }

    await recordPreKycDocument({
      email,
      role,
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
