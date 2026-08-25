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
