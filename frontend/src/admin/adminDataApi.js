import { ADMIN_API_CONTRACT_VERSION, ADMIN_API_ROUTES } from "../../../shared/adminApiContract.js";

const configuredApiUrl = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const apiBaseUrl = configuredApiUrl || "/api";

const resolveMediaUrl = (value) => {
  const url = String(value || "").trim();
  if (!url || /^https?:\/\//i.test(url)) return url;
  return `${apiBaseUrl}${url.replace(/^\/api/, "")}`;
};

const normalizeDocument = (document) => ({
  ...document,
  previewUrl: resolveMediaUrl(document?.previewUrl),
});

const normalizeOverview = (payload) => ({
  ...payload,
  vehicles: Array.isArray(payload?.vehicles)
    ? payload.vehicles.map((vehicle) => ({ ...vehicle, image: resolveMediaUrl(vehicle.image) }))
    : [],
  documents: Array.isArray(payload?.documents) ? payload.documents.map(normalizeDocument) : [],
});

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
  const serverContractVersion = response.headers.get("X-RentifyPro-Admin-Contract");
  if (serverContractVersion !== ADMIN_API_CONTRACT_VERSION) {
    const error = new Error("The admin interface and server API versions do not match. Restart both applications from the same project checkout.");
    error.status = 409;
    error.code = "ADMIN_API_CONTRACT_MISMATCH";
    throw error;
  }
  if (!response.ok) {
    const error = new Error(payload.message || "The request could not be completed.");
    error.status = response.status;
    error.code = payload.code || "REQUEST_FAILED";
    error.errors = payload.errors || {};
    throw error;
  }
  return payload;
}

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const adminDataApi = {
  getOverview: async () => normalizeOverview(await request(ADMIN_API_ROUTES.overview)),
  getTransactions: (params = {}) => request(`${ADMIN_API_ROUTES.transactions}${buildQueryString(params)}`),
  getAuditLogs: (params = {}) => request(`${ADMIN_API_ROUTES.auditLogs}${buildQueryString(params)}`),
  updateCustomer: (id, changes) => request(`/admin/customers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  }),
  setCustomerDisabled: (id, details) => request(`/admin/customers/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify(details),
  }),
  archiveCustomer: (id, details) => request(`/admin/customers/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify(details),
  }),
  updateDocument: async (id, approval) => {
    const payload = await request(`/admin/documents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ approval }),
    });
    return { ...payload, document: normalizeDocument(payload.document) };
  },
};
