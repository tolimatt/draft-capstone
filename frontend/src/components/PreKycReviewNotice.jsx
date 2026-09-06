import { useCallback, useEffect, useState } from "react";
import { getPreKycStatus } from "../utils/kycApi";
import { documentStatusLabel } from "../utils/workflowStatus";
import RequestFeedback from "./RequestFeedback";

export default function PreKycReviewNotice({ email, role = "user", enabled, onResubmit, onIdStatus }) {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const refresh = useCallback(() => setRefreshSignal((value) => value + 1), []);
  useEffect(() => {
    if (!enabled || !email) return;
    let active = true;
    let inFlight = false;
    const read = async () => {
      if (inFlight) return;
      inFlight = true;
      setLoading(true);
      try {
        const result = await getPreKycStatus(email, role);
        if (!active) return;
        setDocuments(result.documents || []);
        setError("");
        const id = result.documents?.find((document) => document.docType === "id");
        if (id) onIdStatus?.(id.status);
      } catch (failure) {
        if (active) setError(failure.message || "Could not refresh document review. Your entered details are still here; try again.");
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };
    void read();
    const timer = window.setInterval(read, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [email, role, enabled, onIdStatus, refreshSignal]);
  if (!enabled) return null;
  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-900">Document review</p><button type="button" onClick={refresh} disabled={loading} className="text-sm font-semibold text-blue-700 underline disabled:opacity-50">{loading ? "Checking..." : "Refresh status"}</button></div>
    <RequestFeedback error={error} onRetry={refresh} />
    <div aria-live="polite">{documents.map((document) => <div key={document.docType} className="mt-2 space-y-1 text-sm">
      <p className="font-semibold">{document.docType === "id" ? "Government ID" : "Supporting document"}: {documentStatusLabel(document.status)}</p>
      <p className="text-slate-600">{document.reason}</p>
      {document.status === "rejected" ? <button type="button" onClick={() => onResubmit(document.docType)} className="mt-2 font-semibold text-blue-700 underline">Resubmit document</button> : document.status === "verified" ? <p className="text-emerald-700">Approved. Continue once all verification steps are complete.</p> : <p className="text-slate-600">Your document is being checked. You can continue registration after approval.</p>}
    </div>)}</div>
  </div>;
}
