import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import API from "../utils/api";
import { BOOKING_REPORT_CATEGORY_GROUPS } from "../data/reportCategories";
import ReportCategorySelect from "./ReportCategorySelect";
import ReportModalFrame from "./ReportModalFrame";
import EvidenceFilePicker from "./EvidenceFilePicker";
import { validateReportEvidenceFiles } from "../utils/fileValidation";

export default function ReportIssueModal({ booking, perspective = "renter", onClose, onSubmitted }) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => event.key === "Escape" && !submitting && onClose?.();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  useEffect(() => {
    setCategory("");
    setDescription("");
    setFiles([]);
    setError("");
  }, [booking?._id, perspective]);

  if (!booking) return null;
  const reportedRole = perspective === "owner" ? "renter" : "owner";
  const reportedName = perspective === "owner"
    ? booking.renter?.name || booking.renter?.email || "this renter"
    : booking.owner?.name || booking.owner?.email || "this owner";
  const categoryGroups = BOOKING_REPORT_CATEGORY_GROUPS[reportedRole] || [];

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!category) return setError("Select the issue that best describes what happened.");
    if (description.trim().length < 20) return setError("Please provide at least 20 characters of incident details.");
    try {
      validateReportEvidenceFiles(files);
    } catch (validationError) {
      return setError(validationError.message || "The selected evidence files are invalid.");
    }

    const formData = new FormData();
    formData.append("bookingId", booking._id);
    formData.append("category", category);
    formData.append("description", description.trim());
    files.forEach((file) => formData.append("evidence", file));
    setSubmitting(true);
    try {
      const response = await API.createReport(formData);
      onSubmitted?.(response.report);
      onClose?.();
    } catch (requestError) {
      setError(requestError.message || "The report could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ReportModalFrame
      titleId="report-title"
      title="Report a booking issue"
      subtitle={`Report ${reportedName} for booking #${String(booking._id).slice(-6).toUpperCase()}.`}
      submitLabel="Submit report"
      submittingLabel="Submitting..."
      submitting={submitting}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><span className="font-semibold">Please be factual.</span> Reports are reviewed by an administrator and do not automatically punish another user.</div>
      <ReportCategorySelect label="Booking issue" placeholder="Select a booking-related category" groups={categoryGroups} value={category} onChange={setCategory} disabled={submitting} />
      <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-800">Incident details</span><textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 3000))} rows={6} placeholder="Explain what happened, when it occurred, and any relevant booking details." className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /><span className="mt-1 block text-right text-xs text-slate-400">{description.length}/3000</span></label>
      <EvidenceFilePicker files={files} onChange={setFiles} onError={setError} disabled={submitting} />
      {error ? <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{error}</p> : null}
    </ReportModalFrame>
  );
}
