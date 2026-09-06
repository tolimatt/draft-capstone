import { getSessionUser } from "../utils/sessionStore";
import { useEffect, useState } from "react";
import { Flag, MessageCircleWarning, TriangleAlert } from "lucide-react";
import API from "../utils/api";
import { MESSAGE_REPORT_CATEGORY_GROUPS } from "../data/reportCategories";
import ReportCategorySelect from "./ReportCategorySelect";
import ReportModalFrame from "./ReportModalFrame";

export default function MessageReportModal({ message, senderName = "this user", onClose, onReported }) {
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [existingReport, setExistingReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => event.key === "Escape" && !submitting && onClose?.();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  useEffect(() => {
    setCategory("");
    setError("");
    setExistingReport(null);
  }, [message?._id]);

  if (!message) return null;

  const submit = async (event) => {
    event.preventDefault();
    setExistingReport(null);
    if (!category) {
      setError("Select why you are reporting this message.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await API.reportChatMessage(message._id, category);
      onReported?.(response.report);
      onClose?.();
    } catch (requestError) {
      if (requestError.details?.code === "DUPLICATE_REPORT") setExistingReport(requestError.details.reportId || "");
      setError(requestError.message || "The message could not be reported.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ReportModalFrame
      titleId="message-report-title"
      title="Report this message"
      subtitle={`Report a message sent by ${senderName}.`}
      headerIcon={<MessageCircleWarning size={24} strokeWidth={2} aria-hidden="true" />}
      submitIcon={<Flag size={18} strokeWidth={2} aria-hidden="true" />}
      submitLabel="Report message"
      submittingLabel="Reporting..."
      submitting={submitting}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><span className="font-semibold">Please be factual.</span> The administrator will review the exact stored message. Reporting does not automatically punish the sender.</div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Message being reported</p>
        <blockquote className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">“{message.text}”</blockquote>
        <p className="mt-2 text-xs text-slate-500">Only this message will be attached to the report. The rest of the conversation is not included.</p>
      </div>
      <ReportCategorySelect label="Message violation" placeholder="Select a message-related category" groups={MESSAGE_REPORT_CATEGORY_GROUPS} value={category} onChange={setCategory} disabled={submitting} />
      {error ? <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"><TriangleAlert size={18} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</p> : null}
      {existingReport !== null && <a href={(getSessionUser()?.role === "owner" ? "/owner-dashboard?tab=Reports" : "/reports") + (existingReport ? "#report-" + encodeURIComponent(existingReport) : "")} className="inline-block text-sm font-semibold text-blue-700 underline">View existing report</a>}
    </ReportModalFrame>
  );
}
