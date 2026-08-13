// Security middleware
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import hpp from "hpp";
import helmet from "helmet";
import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";
const rateLimitingEnabled =
  isProduction || String(process.env.ENABLE_RATE_LIMIT || "").trim().toLowerCase() === "true";
const keyByUserOrIp = (req) => (req.user?._id ? `user:${req.user._id}` : `ip:${ipKeyGenerator(req.ip)}`);
const keyByEmailOrIp = (req) => {
  const email =
    String(req.body?.email || "").trim().toLowerCase() ||
    String(req.query?.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;
  return `ip:${ipKeyGenerator(req.ip)}`;
};
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

const hasValidSessionToken = (req) => {
  const token = String(req.cookies?.token || "").trim();
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
};

const skipForSignedIn = (req) => hasValidSessionToken(req);

const skipForAuthLimiter = async (req) => {
  const path = String(req.path || "").trim().toLowerCase();
  if (path === "/login-challenge") return true;
  return skipForSignedIn(req);
};

const formatCountdown = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getRetryAfterSeconds = (resetTime, fallbackWindowMs = RATE_LIMIT_WINDOW_MS) => {
  if (resetTime) {
    const resetMs = new Date(resetTime).getTime();
    if (Number.isFinite(resetMs)) {
      const remaining = Math.ceil((resetMs - Date.now()) / 1000);
      if (remaining > 0) return remaining;
    }
  }
  return Math.max(1, Math.ceil(fallbackWindowMs / 1000));
};

const buildRateLimitHandler = (messagePrefix) => (req, res, _next, options) => {
  const windowMs = Number(options?.windowMs) > 0 ? Number(options.windowMs) : RATE_LIMIT_WINDOW_MS;
  const retryAfterSeconds = getRetryAfterSeconds(req.rateLimit?.resetTime, windowMs);
  const retryAfterMs = retryAfterSeconds * 1000;
  const retryAfterAt = new Date(Date.now() + retryAfterMs).toISOString();
  const countdown = formatCountdown(retryAfterSeconds);

  res.setHeader("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    success: false,
    message: `${messagePrefix} Try again in ${countdown}.`,
    retryAfterSeconds,
    retryAfterMs,
    retryAfterAt,
    countdown,
    serverTime: new Date().toISOString(),
  });
};

const createLimiter = ({
  max,
  messagePrefix,
  skipSuccessfulRequests = false,
  keyGenerator,
  skipCondition,
} = {}) =>
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator,
    skip: async (req, res) => {
      if (!rateLimitingEnabled) return true;
      if (typeof skipCondition !== "function") return false;
      try {
        return Boolean(await skipCondition(req, res));
      } catch {
        return false;
      }
    },
    handler: buildRateLimitHandler(messagePrefix),
  });

// General API limit
export const generalLimiter = createLimiter({
  max: 100,
  messagePrefix: "Too many requests.",
  skipCondition: skipForSignedIn,
});

// Auth limit
export const authLimiter = createLimiter({
  max: 10,
  messagePrefix: "Too many attempts.",
  skipSuccessfulRequests: true,
  keyGenerator: keyByEmailOrIp,
  skipCondition: skipForAuthLimiter,
});

// Login challenge limit
export const loginChallengeLimiter = createLimiter({
  max: 30,
  messagePrefix: "Too many security check requests.",
});

// Stricter login limit
export const loginLimiter = createLimiter({
  max: 3,
  messagePrefix: "Too many login attempts.",
  skipSuccessfulRequests: true,
  keyGenerator: keyByEmailOrIp,
  skipCondition: skipForSignedIn,
});

// Register limit
export const registerLimiter = createLimiter({
  max: 5,
  messagePrefix: "Too many registration attempts.",
  skipSuccessfulRequests: true,
  keyGenerator: keyByEmailOrIp,
  skipCondition: skipForSignedIn,
});

// OTP limit
export const otpLimiter = createLimiter({
  max: 10,
  messagePrefix: "Too many OTP attempts.",
  skipSuccessfulRequests: true,
  keyGenerator: keyByEmailOrIp,
  skipCondition: skipForSignedIn,
});

// Logged-in KYC limit
export const kycLimiter = createLimiter({
  max: 20,
  messagePrefix: "Too many KYC attempts.",
  keyGenerator: keyByUserOrIp,
});

// Pre-registration KYC limit
export const preKycLimiter = createLimiter({
  max: 15,
  messagePrefix: "Too many verification attempts.",
  skipCondition: skipForSignedIn,
});

// Booking create limit
export const bookingCreateLimiter = createLimiter({
  max: 10,
  messagePrefix: "Too many booking requests.",
  keyGenerator: keyByUserOrIp,
});

// Payment verify limit
export const paymentVerifyLimiter = createLimiter({
  max: 20,
  messagePrefix: "Too many payment verification requests.",
  keyGenerator: keyByUserOrIp,
});

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "http://localhost:5000", "http://localhost:8000", "https://psgc.gitlab.io"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Remove unsafe Mongo-style keys
function stripDollarKeys(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripDollarKeys);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    if (key.includes(".")) continue;
    clean[key] = stripDollarKeys(value);
  }
  return clean;
}

export const noSqlSanitize = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = stripDollarKeys(req.body);
  }
  next();
};

// Basic XSS cleanup
function stripXss(value) {
  if (typeof value === "string") {
    if (value.startsWith("data:image") || value.length > 10000) return value;
    return value
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  }
  if (Array.isArray(value)) return value.map(stripXss);
  if (value !== null && typeof value === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      clean[k] = stripXss(v);
    }
    return clean;
  }
  return value;
}

export const xssProtection = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = stripXss(req.body);
  }
  next();
};

// Block duplicate query params
export const parameterPollution = hpp({
  whitelist: ["tags", "features", "status"],
});
