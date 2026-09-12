import nodemailer from "nodemailer";

let cachedTransporter = null;

const asText = (value) => String(value || "").trim();
const asBoolean = (value, fallback = false) => {
  const normalized = asText(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const createTransporter = () => {
  const user = asText(process.env.SMTP_USER || process.env.EMAIL_USER);
  const pass = asText(process.env.SMTP_PASS || process.env.EMAIL_PASS);
  if (!user || !pass) throw new Error("SMTP credentials are not configured.");

  const host = asText(process.env.SMTP_HOST);
  const secure = asBoolean(process.env.SMTP_SECURE, false);
  const parsedPort = Number.parseInt(asText(process.env.SMTP_PORT), 10);
  const common = { auth: { user, pass } };

  return nodemailer.createTransport(host
    ? { host, port: Number.isFinite(parsedPort) ? parsedPort : (secure ? 465 : 587), secure, family: 4, ...common }
    : {
        host: "smtp.gmail.com",
        port: Number.isFinite(parsedPort) ? parsedPort : 587,
        secure: false,
        family: 4,
        ...common,
      });
};

const getTransporter = () => {
  if (!cachedTransporter) cachedTransporter = createTransporter();
  return cachedTransporter;
};

export async function sendAdminPasswordResetEmail(to, otp) {
  const fromAddress = asText(process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER);
  const fromName = asText(process.env.EMAIL_FROM_NAME) || "RentifyPro";
  await getTransporter().sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject: "Your RentifyPro Admin Password Reset Code",
    text: `Your RentifyPro Admin password reset code is ${otp}. It expires in 5 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
        <h1 style="margin:0 0 22px;color:#017FE6;font-size:24px">RentifyPro Admin</h1>
        <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-radius:12px">
          <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px">Password Reset Code</h2>
          <p style="margin:0 0 22px;color:#64748b;font-size:14px">Use this code to reset your system-admin password. It expires in 5 minutes.</p>
          <div style="padding:16px;text-align:center;background:#eff6ff;border-radius:10px;color:#1d4ed8;font-size:32px;font-weight:700;letter-spacing:8px">${otp}</div>
          <p style="margin:22px 0 0;color:#94a3b8;font-size:12px">If you did not request this code, you can safely ignore this email.</p>
        </div>
      </div>`,
  });
}

export async function sendAdminMfaCodeEmail(to, otp, details = {}) {
  const fromAddress = asText(process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER);
  const fromName = asText(process.env.EMAIL_FROM_NAME) || "RentifyPro";
  const location = asText(details.location) || "an unrecognized location";
  const requestedAt = asText(details.requestedAt) || new Date().toISOString();
  await getTransporter().sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject: "Your RentifyPro Admin Sign-In Code",
    text: `Your RentifyPro Admin sign-in code is ${otp}. It expires in 5 minutes. Request: ${requestedAt}; source: ${location}.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
        <h1 style="margin:0 0 22px;color:#017FE6;font-size:24px">RentifyPro Admin</h1>
        <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-radius:12px">
          <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px">Confirm Your Sign-In</h2>
          <p style="margin:0 0 22px;color:#64748b;font-size:14px">Enter this code to finish signing in. It expires in 5 minutes.</p>
          <div style="padding:16px;text-align:center;background:#eff6ff;border-radius:10px;color:#1d4ed8;font-size:32px;font-weight:700;letter-spacing:8px">${otp}</div>
          <p style="margin:22px 0 0;color:#64748b;font-size:12px">Requested ${requestedAt} from ${location}.</p>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:12px">If this was not you, change the Super Admin password immediately.</p>
        </div>
      </div>`,
  });
}

export async function sendCustomerEmailVerificationCode(to, otp) {
  const fromAddress = asText(process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER);
  const fromName = asText(process.env.EMAIL_FROM_NAME) || "RentifyPro";
  await getTransporter().sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject: "Verify Your Updated RentifyPro Email",
    text: `A Super Admin updated your RentifyPro email address. Your verification code is ${otp}. It expires in 10 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px"><h1 style="color:#017FE6">RentifyPro</h1><h2>Verify your updated email</h2><p>A Super Admin corrected the email address on your account. Use this code to verify the new address:</p><div style="margin:22px 0;padding:16px;border-radius:10px;background:#eff6ff;text-align:center;color:#1d4ed8;font-size:30px;font-weight:700;letter-spacing:8px">${otp}</div><p>This code expires in 10 minutes. If you did not expect this change, contact RentifyPro support.</p></div>`,
  });
}

export async function sendCustomerAccountChangeAlert(to, changedFields = []) {
  const fromAddress = asText(process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER);
  const fromName = asText(process.env.EMAIL_FROM_NAME) || "RentifyPro";
  const fields = changedFields.map((field) => asText(field)).filter(Boolean).join(", ") || "account details";
  await getTransporter().sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject: "Your RentifyPro Account Was Updated",
    text: `A RentifyPro Super Admin updated the following account details: ${fields}. If you did not request this correction, contact RentifyPro support immediately.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px"><h1 style="color:#017FE6">RentifyPro</h1><h2>Account details updated</h2><p>A Super Admin updated: <strong>${fields}</strong>.</p><p>If you did not request this correction, contact RentifyPro support immediately.</p></div>`,
  });
}
