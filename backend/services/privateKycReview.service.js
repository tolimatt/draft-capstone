import { prepareManualDocumentComparison, hasCurrentManualDocumentComparison } from "../data/private-kyc/services/manualDocumentComparison.js";
import { readPrivateKycEvidence, refreshPrivateDocumentTypeEvidence } from "../data/private-kyc/services/privateKycReviewContext.js";

const fail = (message, status = 409) => Object.assign(new Error(message), { status });

export async function compareAdminKycDocument({ collection, document, input, reviewerId, directory }) {
  const bytes = await readPrivateKycEvidence(document, directory);
  const checked = await refreshPrivateDocumentTypeEvidence(document, bytes);
  const fields = prepareManualDocumentComparison(checked, input, reviewerId);
  if (checked !== document) fields.privateScreening = checked.privateScreening;
  if (fields.documentNumberFingerprint && await collection.findOne({
    _id: { $ne: document._id }, email: { $ne: document.email },
    documentNumberFingerprint: fields.documentNumberFingerprint,
    status: { $in: ["pending_review", "verified", "rejected"] },
  }, { projection: { _id: 1 } })) throw fail("This document identifier is linked to another registration. Investigate before approving.");
  const result = await collection.findOneAndUpdate({
    _id: document._id, status: "pending_review", fileHash: document.fileHash,
    ...(document.reviewVersion ? { reviewVersion: document.reviewVersion } : {}),
  }, { $set: fields }, { returnDocument: "after" });
  const updated = result?.value ?? result;
  if (!updated) throw fail("The document changed. Refresh and inspect the current file.");
  return updated;
}

export function validateAdminKycDecision(document, approval, reviewVersion) {
  if (!document) throw fail("This document is no longer available.");
  if (document.status !== "pending_review") throw fail("Wait for screening to finish and refresh before deciding.");
  if (!reviewVersion || reviewVersion !== (document.reviewVersion || document.fileHash)) {
    throw fail("The document changed. Refresh and inspect the current file.");
  }
  if (approval === "Approved") {
    if (document.docType === "id" && document.detailsMatched !== true) throw fail("Identity details have not passed comparison.");
    if (["private-ocr", "manual"].includes(document.provider) && !hasCurrentManualDocumentComparison(document)) {
      throw fail("Inspect and save the manual comparison, including its document type, before approving this document.");
    }
  }
}

export function canReconcileApprovedIdentity(document, kycCase) {
  return document.docType === "id" && document.detailsMatched === true && document.status === "verified"
    && kycCase?.status === "challenge_passed" && Boolean(kycCase.challengePassedAt)
    && (!kycCase.idDocumentHash || kycCase.idDocumentHash === document.fileHash);
}
