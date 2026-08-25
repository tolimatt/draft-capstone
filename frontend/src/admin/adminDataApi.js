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
  if (!response.ok) {
    const error = new Error(payload.message || "The request could not be completed.");
    error.status = response.status;
    error.code = payload.code || "REQUEST_FAILED";
    throw error;
  }
  return payload;
}

export const adminDataApi = {
  getOverview: async () => normalizeOverview(await request("/admin/data")),
  updateDocument: async (id, approval) => {
    const payload = await request(`/admin/documents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ approval }),
    });
    return { ...payload, document: normalizeDocument(payload.document) };
  },
};
