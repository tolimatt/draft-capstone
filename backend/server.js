import path from "node:path";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import AdminCredential from "./models/AdminCredential.js";
import AdminPasswordReset from "./models/AdminPasswordReset.js";
import { createAdminDataRouter } from "./routes/adminData.routes.js";
import { sendAdminPasswordResetEmail } from "./services/adminEmail.service.js";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendDirectory, ".env"), quiet: true });
const websiteBackendDirectory = path.resolve(
  process.env.WEBSITE_BACKEND_DIR || path.join(backendDirectory, "..", "..", "rentifypro", "backend"),
);
dotenv.config({ path: path.join(websiteBackendDirectory, ".env"), quiet: true });

const app = express();
const port = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";
const bootstrapAdminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const bootstrapAdminName = String(process.env.ADMIN_NAME || "System Admin").trim();
const configuredPasswordHash = String(process.env.ADMIN_PASSWORD_HASH || "").trim();
const bootstrapAdminPassword = String(process.env.ADMIN_PASSWORD || "");
const jwtSecret = String(process.env.JWT_SECRET || "").trim();
const sessionCookieName = "rentifypro_admin_session";
const shortSessionSeconds = 8 * 60 * 60;
const rememberedSessionSeconds = 30 * 24 * 60 * 60;
const resetCodeLifetimeMs = 5 * 60 * 1000;
const resetCodeCooldownMs = 60 * 1000;
const resetTokenLifetime = "15m";
const developmentResetCodeEnabled = !isProduction && String(process.env.ADMIN_PASSWORD_RESET_DEV_MODE || "").toLowerCase() === "true";
const allowedEmailDomains = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]);
const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{2028}\u{2029}]/u;
let databaseConnectionAttempt = null;

app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(hpp());

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many password recovery attempts. Please wait 15 minutes and try again." },
});

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const isLoopbackRequest = (request) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(String(request.ip || ""));

const validateEmail = (value) => {
  const email = normalizeEmail(value);
  if (!email) return "Email is required.";
  if (emojiPattern.test(email)) return "Email must not contain emoji.";
  if (/\s/.test(email)) return "Email must not contain spaces.";
  if (email.length > 254) return "Email is too long (max 254 characters).";
  if (!emailPattern.test(email)) return "Enter a valid email format.";
  if (!allowedEmailDomains.has(email.split("@")[1])) return "Please use Gmail, Yahoo, Outlook, or Hotmail.";
  return "";
};

const validatePassword = (value) => {
  const password = typeof value === "string" ? value : "";
  if (!password) return "Password is required.";
  if (/\s/.test(password)) return "Password must not contain spaces.";
  if (emojiPattern.test(password)) return "Password must not contain emoji.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long (max 128 characters).";
  if (!/[A-Z]/.test(password)) return "Password needs an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password needs a lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password needs a number.";
  if (!/[!@#$%^&*()_+\-=[\]{}|;':\",.<>?/`~]/.test(password)) return "Password needs a special character.";
  return "";
};

const publicAdmin = (account) => ({
  id: account.key,
  name: account.name,
  email: account.email,
  role: "admin",
  isVerified: true,
});

const cookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  ...(rememberMe ? { maxAge: rememberedSessionSeconds * 1000 } : {}),
});

const clearSessionCookie = (response) => response.clearCookie(sessionCookieName, cookieOptions(false));

const readAdminSession = (request) => {
  const token = request.cookies?.[sessionCookieName];
  if (!token || !jwtSecret) return null;
  try {
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: "rentifypro-admin-api",
      audience: "rentifypro-admin",
    });
    return payload?.role === "admin" && payload?.sub === "system-admin" ? payload : null;
  } catch {
    return null;
  }
};

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured.");
  if (!databaseConnectionAttempt) {
    databaseConnectionAttempt = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
      .finally(() => { databaseConnectionAttempt = null; });
  }
  return databaseConnectionAttempt;
};

const getAdminAccount = (includePassword = false) => {
  const query = AdminCredential.findOne({ key: "system-admin" });
  return includePassword ? query.select("+passwordHash") : query;
};

const ensureAdminAccount = async () => {
  let account = await getAdminAccount(true);
  if (!account) {
    if (!bootstrapAdminEmail || (!configuredPasswordHash && !bootstrapAdminPassword)) {
      throw new Error("Admin bootstrap credentials are not configured.");
    }
    const passwordHash = configuredPasswordHash || await bcrypt.hash(bootstrapAdminPassword, 12);
    account = await AdminCredential.create({
      key: "system-admin",
      name: bootstrapAdminName,
      email: bootstrapAdminEmail,
      passwordHash,
    });
    return getAdminAccount(true);
  }

  let changed = false;
  if (bootstrapAdminEmail && account.email !== bootstrapAdminEmail) {
    account.email = bootstrapAdminEmail;
    changed = true;
  }
  if (bootstrapAdminName && account.name !== bootstrapAdminName) {
    account.name = bootstrapAdminName;
    changed = true;
  }
  if (changed) await account.save();
  return account;
};

const getAuthenticatedAccount = async (session) => {
  if (!session) return null;
  const account = await getAdminAccount();
  return account && Number(session.sessionVersion) === Number(account.sessionVersion) ? account : null;
};

const requireAdminSession = async (request, response, next) => {
  const session = readAdminSession(request);
  if (!session) return response.status(401).json({ message: "Your admin session has expired. Please log in again." });
  try {
    await connectDatabase();
    const account = await getAuthenticatedAccount(session);
    if (!account) {
      clearSessionCookie(response);
      return response.status(401).json({ message: "Your admin session has expired. Please log in again." });
    }
    request.adminAccount = account;
    return next();
  } catch {
    return response.status(503).json({
      message: "The RentifyPro database is unavailable. Start MongoDB and verify MONGODB_URI in backend/.env.",
      code: "DATABASE_UNAVAILABLE",
    });
  }
};

app.post("/api/admin/auth/login", adminLoginLimiter, async (request, response) => {
  if (!jwtSecret) return response.status(503).json({ message: "Admin login is not configured on the server." });

  const email = normalizeEmail(request.body?.email);
  const password = String(request.body?.password || "");
  const errors = { email: validateEmail(email), password: validatePassword(password) };
  if (errors.email || errors.password) {
    return response.status(400).json({ message: "Check the highlighted login fields.", errors });
  }

  try {
    await connectDatabase();
    const account = await ensureAdminAccount();
    const passwordMatches = email === account.email && await bcrypt.compare(password, account.passwordHash);
    if (!passwordMatches) return response.status(401).json({ message: "Invalid email or password." });

    const rememberMe = request.body?.rememberMe === true;
    const token = jwt.sign(
      { role: "admin", email: account.email, name: account.name, sessionVersion: account.sessionVersion },
      jwtSecret,
      {
        algorithm: "HS256",
        subject: "system-admin",
        issuer: "rentifypro-admin-api",
        audience: "rentifypro-admin",
        expiresIn: rememberMe ? rememberedSessionSeconds : shortSessionSeconds,
      },
    );
    response.cookie(sessionCookieName, token, cookieOptions(rememberMe));
    return response.json({ message: "Login successful.", user: publicAdmin(account) });
  } catch (error) {
    console.error("Admin login failed:", error.message);
    return response.status(503).json({ message: "Admin authentication is temporarily unavailable." });
  }
});

app.get("/api/admin/auth/session", async (request, response) => {
  const session = readAdminSession(request);
  try {
    await connectDatabase();
    const account = await getAuthenticatedAccount(session);
    if (!account) {
      clearSessionCookie(response);
      return response.status(401).json({ message: "No active admin session." });
    }
    return response.json({ user: publicAdmin(account) });
  } catch {
    return response.status(503).json({ message: "Admin authentication is temporarily unavailable." });
  }
});

app.post("/api/admin/auth/logout", (_request, response) => {
  clearSessionCookie(response);
  return response.json({ message: "Logged out successfully." });
});

app.post("/api/admin/auth/forgot-password", passwordRecoveryLimiter, async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const emailError = validateEmail(email);
  if (emailError) return response.status(400).json({ message: emailError, errors: { email: emailError } });

  try {
    await connectDatabase();
    const account = await getAdminAccount();
    const genericMessage = "If this email is registered, a password reset code has been sent.";
    if (!account || email !== account.email) return response.json({ message: genericMessage });

    const existing = await AdminPasswordReset.findOne({ email }).select("lastSentAt");
    const elapsed = existing?.lastSentAt ? Date.now() - new Date(existing.lastSentAt).getTime() : resetCodeCooldownMs;
    if (elapsed < resetCodeCooldownMs) {
      const retryAfterSeconds = Math.ceil((resetCodeCooldownMs - elapsed) / 1000);
      response.setHeader("Retry-After", String(retryAfterSeconds));
      return response.status(429).json({ message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`, retryAfterSeconds });
    }

    const otp = String(randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);
    await AdminPasswordReset.findOneAndUpdate(
      { email },
      { email, otpHash, expiresAt: new Date(Date.now() + resetCodeLifetimeMs), attempts: 0, maxAttempts: 5, lastSentAt: new Date() },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    try {
      await sendAdminPasswordResetEmail(email, otp);
    } catch (error) {
      console.error("Admin reset email failed:", error.message);
      if (developmentResetCodeEnabled && isLoopbackRequest(request)) {
        return response.json({
          message: "Email delivery is unavailable locally. Use the development verification code shown on screen.",
          delivery: "development",
          developmentCode: otp,
        });
      }
      await AdminPasswordReset.deleteOne({ email });
      return response.status(503).json({ message: "The reset email could not be sent. Check the SMTP configuration and try again." });
    }
    return response.json({ message: genericMessage });
  } catch (error) {
    console.error("Admin forgot password failed:", error.message);
    return response.status(503).json({ message: "Password recovery is temporarily unavailable." });
  }
});

app.post("/api/admin/auth/forgot-password/verify-otp", passwordRecoveryLimiter, async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const otp = String(request.body?.otp || "").trim();
  const emailError = validateEmail(email);
  if (emailError) return response.status(400).json({ message: emailError });
  if (!/^\d{6}$/.test(otp)) return response.status(400).json({ message: "Enter the complete 6-digit verification code." });

  try {
    await connectDatabase();
    const [account, record] = await Promise.all([
      getAdminAccount(),
      AdminPasswordReset.findOne({ email }),
    ]);
    if (!account || account.email !== email || !record || record.expiresAt.getTime() <= Date.now()) {
      if (record) await AdminPasswordReset.deleteOne({ _id: record._id });
      return response.status(400).json({ message: "Invalid or expired code." });
    }
    if (record.attempts >= record.maxAttempts) {
      await AdminPasswordReset.deleteOne({ _id: record._id });
      return response.status(429).json({ message: "Too many incorrect codes. Request a new verification code." });
    }

    const matches = await bcrypt.compare(otp, record.otpHash);
    if (!matches) {
      record.attempts += 1;
      await record.save();
      return response.status(400).json({ message: "Invalid or expired code." });
    }

    await AdminPasswordReset.deleteOne({ _id: record._id });
    const resetToken = jwt.sign(
      { email, purpose: "admin_password_reset", sessionVersion: account.sessionVersion },
      jwtSecret,
      {
        algorithm: "HS256",
        subject: "system-admin",
        issuer: "rentifypro-admin-api",
        audience: "rentifypro-admin-password-reset",
        expiresIn: resetTokenLifetime,
      },
    );
    return response.json({ message: "Password reset code verified.", resetToken });
  } catch (error) {
    console.error("Admin reset verification failed:", error.message);
    return response.status(503).json({ message: "Password recovery is temporarily unavailable." });
  }
});

app.post("/api/admin/auth/reset-password", passwordRecoveryLimiter, async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const resetToken = String(request.body?.token || "").trim();
  const newPassword = String(request.body?.newPassword || "");
  const emailError = validateEmail(email);
  const passwordError = validatePassword(newPassword);
  if (emailError || passwordError) {
    return response.status(400).json({ message: emailError || passwordError, errors: { email: emailError, password: passwordError } });
  }
  if (!resetToken) return response.status(400).json({ message: "Your password reset session has expired. Request a new code." });

  let payload;
  try {
    payload = jwt.verify(resetToken, jwtSecret, {
      algorithms: ["HS256"],
      subject: "system-admin",
      issuer: "rentifypro-admin-api",
      audience: "rentifypro-admin-password-reset",
    });
  } catch {
    return response.status(400).json({ message: "Your password reset session is invalid or expired." });
  }

  try {
    await connectDatabase();
    const account = await getAdminAccount(true);
    if (
      !account || payload?.purpose !== "admin_password_reset" || payload?.email !== email ||
      Number(payload?.sessionVersion) !== Number(account.sessionVersion)
    ) {
      return response.status(400).json({ message: "Your password reset session is invalid or expired." });
    }

    account.passwordHash = await bcrypt.hash(newPassword, 12);
    account.sessionVersion += 1;
    await account.save();
    await AdminPasswordReset.deleteMany({ email });
    clearSessionCookie(response);
    return response.json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (error) {
    console.error("Admin password reset failed:", error.message);
    return response.status(503).json({ message: "Password recovery is temporarily unavailable." });
  }
});

app.use("/api/admin", createAdminDataRouter({ requireAdminSession }));

app.get("/api/health", (_request, response) => {
  const databaseStates = ["disconnected", "connected", "connecting", "disconnecting"];
  response.json({
    status: "ok",
    database: databaseStates[mongoose.connection.readyState] ?? "unknown",
    timestamp: new Date().toISOString(),
  });
});

app.use((_request, response) => response.status(404).json({ message: "Route not found" }));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    message: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
  });
});

async function startServer() {
  if (!bootstrapAdminEmail || (!configuredPasswordHash && !bootstrapAdminPassword) || !jwtSecret) {
    console.warn("Admin authentication is not fully configured in backend/.env.");
  }

  app.listen(port, () => console.log(`RentifyPro API listening on http://localhost:${port}`));

  if (process.env.MONGODB_URI) {
    connectDatabase()
      .then(async () => {
        await ensureAdminAccount();
        console.log("Connected to the shared RentifyPro MongoDB database");
      })
      .catch((error) => console.error("MongoDB connection failed:", error.message));
  } else {
    console.warn("MONGODB_URI is not set; starting without a database connection");
  }
}

startServer().catch((error) => {
  console.error("Unable to start the API:", error);
  process.exitCode = 1;
});
