import PreKycDocument from "../models/PreKycDocument.js";

export async function getMissingPreKycDocs(email, requiredDocs = [], sessionId = "") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || requiredDocs.length === 0) return requiredDocs;

  const query = {
    email: normalizedEmail,
    docType: { $in: requiredDocs },
    status: "verified",
  };
  if (sessionId) query.sessionId = String(sessionId).trim();

  const verifiedDocs = await PreKycDocument.find(query).select("docType");

  const verifiedSet = new Set(verifiedDocs.map((doc) => doc.docType));
  return requiredDocs.filter((docType) => !verifiedSet.has(docType));
}

export async function getPendingPreKycDocs(email, requiredDocs = [], sessionId = "") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || requiredDocs.length === 0) return [];
  const query = {
    email: normalizedEmail,
    docType: { $in: requiredDocs },
    status: "pending_review",
  };
  if (sessionId) query.sessionId = String(sessionId).trim();
  const pendingDocs = await PreKycDocument.find(query).select("docType");
  return pendingDocs.map((doc) => doc.docType);
}

export async function clearPreKycDocs(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;
  await PreKycDocument.deleteMany({ email: normalizedEmail });
}
