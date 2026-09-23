import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import AdminCredential from "../models/AdminCredential.js";
import AdminMfaChallenge from "../models/AdminMfaChallenge.js";
import AdminPasswordReset from "../models/AdminPasswordReset.js";
import AdminSession from "../models/AdminSession.js";
import { recordAdminAudit } from "../services/adminAudit.service.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(scriptDirectory, "..");
const allowedEmailDomains = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]);
const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{2028}\u{2029}]/u;
const specialCharacterPattern = /[!@#$%^&*()_+\-=[\]{}|;':\",.<>?/`~]/;
const bcryptHashPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const normalizePasskeyForHash = (value) => createHash("sha256")
  .update(String(value || ""), "utf8")
  .digest("base64");

const validateStrongSecret = (value, label, minimumLength) => {
  if (!value) return `${label} is required.`;
  if (/\s/.test(value)) return `${label} must not contain spaces.`;
  if (emojiPattern.test(value)) return `${label} must not contain emoji.`;
  if (value.length < minimumLength) return `${label} must be at least ${minimumLength} characters.`;
  if (value.length > 128) return `${label} is too long (max 128 characters).`;
  if (!/[A-Z]/.test(value)) return `${label} needs an uppercase letter.`;
  if (!/[a-z]/.test(value)) return `${label} needs a lowercase letter.`;
  if (!/[0-9]/.test(value)) return `${label} needs a number.`;
  if (!specialCharacterPattern.test(value)) return `${label} needs a special character.`;
  return "";
};

export function validateAdminCredentialConfig(environment = process.env) {
  const email = String(environment.ADMIN_EMAIL || "").trim().toLowerCase();
  const name = String(environment.ADMIN_NAME || "System Admin").trim();
  const password = String(environment.ADMIN_PASSWORD || "");
  const passwordHash = String(environment.ADMIN_PASSWORD_HASH || "").trim();
  const passkey = String(environment.ADMIN_SECRET_KEY || "");
  const errors = [];

  if (!email) errors.push("ADMIN_EMAIL is required.");
  else if (emojiPattern.test(email) || /\s/.test(email) || email.length > 254 || !emailPattern.test(email)) {
    errors.push("ADMIN_EMAIL must use a valid email format without spaces or emoji.");
  } else if (!allowedEmailDomains.has(email.split("@")[1])) {
    errors.push("ADMIN_EMAIL must use Gmail, Yahoo, Outlook, or Hotmail.");
  }

  if (!name) errors.push("ADMIN_NAME is required.");
  if (name.length > 100) errors.push("ADMIN_NAME is too long (max 100 characters).");

  if (passwordHash) {
    if (!bcryptHashPattern.test(passwordHash)) errors.push("ADMIN_PASSWORD_HASH must be a valid bcrypt hash.");
  } else {
    const passwordError = validateStrongSecret(password, "ADMIN_PASSWORD", 8);
    if (passwordError) errors.push(passwordError);
  }

  if (passkey) {
    const passkeyError = validateStrongSecret(passkey, "ADMIN_SECRET_KEY", 12);
    if (passkeyError) errors.push(passkeyError);
    if (password && passkey === password) {
      errors.push("ADMIN_SECRET_KEY must be different from ADMIN_PASSWORD.");
    }
  }

  return {
    config: { email, name, password, passwordHash, passkey },
    errors,
  };
}

const loadEnvironment = () => {
  dotenv.config({ path: path.join(backendDirectory, ".env"), quiet: true });
  const websiteBackendDirectory = path.resolve(
    process.env.WEBSITE_BACKEND_DIR || path.join(backendDirectory, "..", "..", "rentifypro", "backend"),
  );
  dotenv.config({ path: path.join(websiteBackendDirectory, ".env"), quiet: true });
};

const compareConfiguredPassword = async (config, account) => {
  if (!account?.passwordHash) return false;
  return config.passwordHash
    ? account.passwordHash === config.passwordHash
    : bcrypt.compare(config.password, account.passwordHash);
};

const compareConfiguredPasskey = async (config, account) => {
  if (!config.passkey) return null;
  if (!account?.passkeyHash || !account.passkeyEnabledAt) return false;
  return bcrypt.compare(normalizePasskeyForHash(config.passkey), account.passkeyHash);
};

const readCredentialStatus = async (config) => {
  const account = await AdminCredential.findOne({ key: "system-admin" })
    .select("+passwordHash +passkeyHash");

  if (!account) {
    return {
      account,
      emailMatches: false,
      nameMatches: false,
      passwordMatches: false,
      passkeyMatches: config.passkey ? false : null,
    };
  }

  const [passwordMatches, passkeyMatches] = await Promise.all([
    compareConfiguredPassword(config, account),
    compareConfiguredPasskey(config, account),
  ]);

  return {
    account,
    emailMatches: account.email === config.email,
    nameMatches: account.name === config.name,
    passwordMatches,
    passkeyMatches,
  };
};

const statusLabel = (matches, notConfiguredLabel = "not configured") => {
  if (matches === null) return notConfiguredLabel;
  return matches ? "matches" : "needs synchronization";
};

const printStatus = (status) => {
  console.log(status.account ? "System admin account found." : "System admin account has not been created yet.");
  console.log(`Email: ${statusLabel(status.emailMatches)}`);
  console.log(`Display name: ${statusLabel(status.nameMatches)}`);
  console.log(`Password: ${statusLabel(status.passwordMatches)}`);
  console.log(`Secret passkey: ${statusLabel(status.passkeyMatches, "not configured; existing passkey will be preserved")}`);
};

const synchronizeCredentials = async (config, status) => {
  const now = new Date();
  const creating = !status.account;
  const account = status.account || new AdminCredential({ key: "system-admin" });
  const previousEmail = account.email;
  const changedFields = [];

  if (!status.emailMatches) {
    account.email = config.email;
    changedFields.push("email");
  }
  if (!status.nameMatches) {
    account.name = config.name;
    changedFields.push("display_name");
  }
  if (!status.passwordMatches) {
    account.passwordHash = config.passwordHash || await bcrypt.hash(config.password, 12);
    changedFields.push("account_password");
  }
  if (status.passkeyMatches === false) {
    account.passkeyHash = await bcrypt.hash(normalizePasskeyForHash(config.passkey), 12);
    account.passkeyEnabledAt = now;
    changedFields.push("secret_passkey");
  }

  const authenticationChanged = creating || changedFields.some((field) => (
    field === "email" || field === "account_password" || field === "secret_passkey"
  ));

  if (authenticationChanged && !creating) account.sessionVersion += 1;
  if (changedFields.length) await account.save();

  if (authenticationChanged) {
    const affectedEmails = [...new Set([previousEmail, account.email].filter(Boolean))];
    await Promise.all([
      AdminSession.updateMany(
        { adminKey: account.key, revokedAt: null },
        { $set: { revokedAt: now } },
      ),
      AdminMfaChallenge.deleteMany({ email: { $in: affectedEmails } }),
      AdminPasswordReset.deleteMany({ email: { $in: affectedEmails } }),
    ]);
  }

  if (changedFields.length) {
    await recordAdminAudit({
      admin: account,
      action: creating ? "admin.credentials.created" : "admin.credentials.synchronized",
      targetType: "admin_account",
      targetId: account.key,
      targetLabel: account.email,
      summary: authenticationChanged
        ? "Environment-configured Super Admin credentials were synchronized and prior sessions were revoked."
        : "Environment-configured Super Admin profile details were synchronized.",
      metadata: { changedFields },
    });
  }

  return { creating, changedFields, authenticationChanged };
};

async function main() {
  loadEnvironment();
  const { config, errors } = validateAdminCredentialConfig();

  if (!process.env.MONGODB_URI) errors.push("MONGODB_URI is required.");
  if (config.passkey && config.passwordHash && await bcrypt.compare(config.passkey, config.passwordHash)) {
    errors.push("ADMIN_SECRET_KEY must be different from the configured admin password.");
  }
  if (errors.length) {
    console.error("Admin credential configuration is invalid:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const status = await readCredentialStatus(config);

    if (process.argv.includes("--check")) {
      printStatus(status);
      return;
    }

    const result = await synchronizeCredentials(config, status);
    if (!result.changedFields.length) {
      console.log("Super Admin credentials already match backend/.env.");
      return;
    }

    console.log(result.creating
      ? "Super Admin credentials created from backend/.env."
      : "Super Admin credentials synchronized from backend/.env.");
    if (result.authenticationChanged) {
      console.log("Previous sessions and pending verification attempts were invalidated.");
    }
  } catch (error) {
    console.error(`Unable to synchronize Super Admin credentials (${error?.name || "unknown error"}).`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedFile === fileURLToPath(import.meta.url)) {
  await main();
}
