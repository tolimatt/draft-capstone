import { useCallback, useEffect, useState } from "react";
import { clearPreKycSessionToken, getPreKycStatus } from "../utils/kycApi";
import { documentStatusLabel } from "../utils/workflowStatus";
import RequestFeedback from "./RequestFeedback";

const STATUS_POLL_INTERVAL_MS = 45_000;
const REVIEW_IN_PROGRESS = new Set(["queued", "processing", "retry_wait", "pending_review"]);

const reviewGuidance = (status, label) => {
  if (status === "queued") return `${label} was uploaded and is waiting to be screened.`;
  if (status === "processing") return `${label} is being screened now.`;
  if (status === "retry_wait") return "Screening is taking longer than expected. We will retry automatically.";
  if (status === "pending_review") return "A reviewer is checking this document. Refresh the status before submitting your registration.";
  if (status === "verified") return "Approved. Continue once all verification steps are complete.";
  if (status === "rejected") return "This document needs to be uploaded again before you can continue.";
  return `Upload ${label.toLowerCase()} to start its review.`;
};

const statusTone = (status) => {
  if (status === "verified") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "bg-rose-50 text-rose-700";
  if (REVIEW_IN_PROGRESS.has(status)) return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-600";
};

const toReviewError = (failure) => {
  const status = Number(failure?.status);
  if (status === 401 || status === 403) {
    return {
      message: "Your secure document-review session has ended. Restart verification to upload your documents again. Your saved form details will remain available.",
      restart: true,
    };
  }
  if (status === 429) {
    return {
      message: "Document status checks are temporarily limited. Wait a moment, then try again.",
      restart: false,
    };
  }
  return {
    message: "We couldn't update your document status right now. This does not mean your document was rejected. Please try again.",
    restart: false,
  };
};

export default function PreKycReviewNotice({ email, role = "user", enabled, onResubmit, onIdStatus, onDocumentsChange }) {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const refresh = useCallback(() => {
    setError(null);
    setRefreshSignal((value) => value + 1);
  }, []);
  const restartVerification = useCallback(() => {
    clearPreKycSessionToken(email, role);
    window.location.reload();
  }, [email, role]);

  useEffect(() => {
    if (!enabled || !email) return;
    let active = true;
    let inFlight = false;
    let timer = null;
    const read = async () => {
      if (inFlight) return;
      inFlight = true;
      setLoading(true);
      let continuePolling = false;
      try {
        const result = await getPreKycStatus(email, role);
        if (!active) return;
        const nextDocuments = result.documents || [];
        setDocuments(nextDocuments);
        onDocumentsChange?.(nextDocuments);
        setError(null);
        const id = nextDocuments.find((document) => document.docType === "id");
        if (id) onIdStatus?.(id.status);
        continuePolling = nextDocuments.length === 0
          || nextDocuments.some((document) => REVIEW_IN_PROGRESS.has(document.status));
      } catch (failure) {
        if (active) setError(toReviewError(failure));
      } finally {
        inFlight = false;
        if (active) {
          setLoading(false);
          if (continuePolling) timer = window.setTimeout(read, STATUS_POLL_INTERVAL_MS);
        }
      }
    };
    void read();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [email, role, enabled, onIdStatus, onDocumentsChange, refreshSignal]);
  if (!enabled) return null;

  const expectedDocuments = role === "owner"
    ? [{ type: "supporting", label: "Supporting document" }, { type: "id", label: "Government ID" }]
    : [{ type: "id", label: "Government ID" }];
  const documentsByType = new Map(documents.map((document) => [document.docType, document]));
  const showInitialLoading = loading && documents.length === 0 && !error;

  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Document review</p>
        <p className="mt-0.5 text-sm text-slate-600">Registration unlocks after every required document is approved.</p>
      </div>
      {!error && <button type="button" onClick={refresh} disabled={loading} className="text-sm font-semibold text-blue-700 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        {loading ? "Checking status..." : "Refresh status"}
      </button>}
    </div>
    <RequestFeedback
      loading={showInitialLoading}
      label="Checking document status..."
      error={error?.message || ""}
      onRetry={error?.restart ? restartVerification : refresh}
      retryLabel={error?.restart ? "Restart verification" : "Try again"}
    />
    {!showInitialLoading && <div className="space-y-2" aria-live="polite">
      {expectedDocuments.map(({ type, label }) => {
        const document = documentsByType.get(type);
        const status = document?.status || "not_uploaded";
        return <div key={type} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{label}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}>{documentStatusLabel(status)}</span>
          </div>
          <p className="mt-2 text-slate-600">{reviewGuidance(status, label)}</p>
          {status === "rejected" && document?.reason && <p className="mt-1 text-rose-700">Reason: {document.reason}</p>}
          {status === "rejected" && <button type="button" onClick={() => onResubmit?.(type)} className="mt-2 font-semibold text-blue-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Upload a new document</button>}
        </div>;
      })}
    </div>}
  </div>;
}
