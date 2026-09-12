const configuredApiUrl = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const apiBaseUrl = configuredApiUrl || "/api";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch {
    const error = new Error("Cannot connect to the admin server. Start the project from its root folder with npm run dev.");
    error.status = 0;
    error.code = "API_UNAVAILABLE";
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const proxyUnavailable = response.status >= 500 && !payload.message;
    const error = new Error(
      payload.message || (proxyUnavailable
        ? "Admin server is offline. Start the complete project from its root folder with npm run dev."
        : "The request could not be completed."),
    );
    error.status = response.status;
    error.code = payload.code || (proxyUnavailable ? "API_UNAVAILABLE" : "REQUEST_FAILED");
    error.errors = payload.errors || {};
    error.retryAfterSeconds = Number(payload.retryAfterSeconds) || 0;
    throw error;
  }

  return payload;
}

export const adminAuthApi = {
  login: (credentials) => request("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  }),
  verifyMfa: (challengeId, otp) => request("/admin/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify({ challengeId, otp }),
  }),
  sendMfaEmailCode: (challengeId) => request("/admin/auth/mfa/email/send", {
    method: "POST",
    body: JSON.stringify({ challengeId }),
  }),
  verifyPasskey: (challengeId, passkey) => request("/admin/auth/mfa/passkey/verify", {
    method: "POST",
    body: JSON.stringify({ challengeId, passkey }),
  }),
  getSessions: () => request("/admin/auth/sessions"),
  revokeSession: (sessionId) => request(`/admin/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
  revokeOtherSessions: () => request("/admin/auth/sessions/revoke-others", { method: "POST" }),
  getPasskeyStatus: () => request("/admin/auth/passkey/status"),
  savePasskey: (adminPassword, newPasskey, currentPasskey = "") => request("/admin/auth/passkey", {
    method: "PUT",
    body: JSON.stringify({ adminPassword, newPasskey, currentPasskey }),
  }),
  disablePasskey: (adminPassword, passkey) => request("/admin/auth/passkey", {
    method: "DELETE",
    body: JSON.stringify({ adminPassword, passkey }),
  }),
  getSession: () => request("/admin/auth/session"),
  logout: () => request("/admin/auth/logout", { method: "POST" }),
  requestPasswordReset: (email) => request("/admin/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  }),
  verifyPasswordResetOtp: (email, otp) => request("/admin/auth/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  }),
  resetPassword: (email, token, newPassword) => request("/admin/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, token, newPassword }),
  }),
};
