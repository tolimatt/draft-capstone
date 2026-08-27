import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";

export function StatusBadge({ value }) {
  const status = String(value || "").toLowerCase();
  const tone =
    ["active", "available", "approved", "verified"].includes(status)
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
      : ["on rent", "rented", "confirmed", "paid"].includes(status)
        ? "bg-blue-50 text-blue-700 ring-blue-600/15"
        : ["pending", "pending review", "pending verification", "inactive"].includes(status)
          ? "bg-amber-50 text-amber-700 ring-amber-600/15"
          : ["maintenance", "under maintenance", "partial"].includes(status)
            ? "bg-orange-50 text-orange-700 ring-orange-600/15"
            : ["rejected", "suspended", "cancelled", "unavailable", "overdue"].includes(status)
              ? "bg-rose-50 text-rose-700 ring-rose-600/15"
              : "bg-slate-100 text-slate-700 ring-slate-500/15";

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {value}
    </span>
  );
}

export function StatCard({ label, value, description, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,0.045)]">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tones[tone] || tones.blue}`}>
          <Icon size={21} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
        </div>
      </div>
    </article>
  );
}

export function SearchField({ label, value, onChange, placeholder }) {
  return (
    <label className="block min-w-0">
      {label ? <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600">{label}</span> : null}
      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>
    </label>
  );
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      {label ? <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600">{label}</span> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function EmptyState({ icon: Icon = FileText, title, description }) {
  return (
    <div className="px-6 py-14 text-center">
      <Icon size={30} className="mx-auto text-slate-300" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function TableFooter({ visible, total, noun }) {
  return (
    <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
      Showing {visible} of {total} {noun}
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-2xl sm:bottom-auto sm:left-auto sm:right-5 sm:top-5 sm:translate-x-0">
      <CheckCircle2 size={18} className="text-emerald-400" aria-hidden="true" />
      {message}
    </div>
  );
}

export function ConfirmationDialog({ confirmation, loading, onCancel, onConfirm }) {
  if (!confirmation) return null;
  return <ConfirmationForm key={confirmation.key || confirmation.title} confirmation={confirmation} loading={loading} onCancel={onCancel} onConfirm={onConfirm} />;
}

function ConfirmationForm({ confirmation, loading, onCancel, onConfirm }) {
  const danger = confirmation.tone === "danger";
  const [reason, setReason] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const reasonValid = !confirmation.requireReason || (reason.trim().length >= 10 && reason.trim().length <= 500);
  const passwordValid = !confirmation.requirePassword || adminPassword.length > 0;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !loading && onCancel()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${danger ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
          {danger ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
        </div>
        <h3 id="confirmation-title" className="mt-5 text-xl font-bold text-slate-950">{confirmation.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{confirmation.description}</p>
        {confirmation.requireReason ? <label className="mt-5 block"><span className="mb-1.5 block text-sm font-semibold text-slate-800">Reason</span><textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value.slice(0, 500))} disabled={loading} rows={3} placeholder="Explain why this action is necessary (at least 10 characters)" className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50" /><span className={`mt-1 block text-xs ${reason.length && !reasonValid ? "text-rose-600" : "text-slate-500"}`}>{reason.trim().length}/500 characters</span></label> : null}
        {confirmation.requirePassword ? <label className="mt-4 block"><span className="mb-1.5 block text-sm font-semibold text-slate-800">Confirm Super Admin password</span><input type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} disabled={loading} placeholder="Enter your current password" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50" /></label> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={loading} onClick={onCancel} className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-50">Cancel</button>
          <button type="button" autoFocus={!confirmation.requireReason} disabled={loading || !reasonValid || !passwordValid} onClick={() => onConfirm({ reason: reason.trim(), adminPassword })} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${danger ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-100" : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-100"}`}>
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : null}
            {loading ? "Working..." : confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ViewerDialog({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="viewer-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">{item.type}</p>
            <h3 id="viewer-title" className="mt-2 text-xl font-bold text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><X size={19} /></button>
        </div>
        <PreviewPane item={item} className="mt-6 min-h-64" />
      </div>
    </div>
  );
}

export function DocumentReviewDialog({ document, onClose, onApprove, onReject }) {
  if (!document) return null;
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="review-title" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5 sm:p-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">Document review</p><h3 id="review-title" className="mt-1.5 text-xl font-bold text-slate-950">{document.fileName}</h3><p className="mt-1 text-sm text-slate-500">Review the verification details before making a decision.</p></div>
          <button type="button" aria-label="Close review" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><X size={19} /></button>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-[220px_1fr] sm:p-6">
          <PreviewPane item={document} className="min-h-56" />
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
            {[['Customer', document.customer], ['Role', document.role], ['Document type', document.document], ['Submitted', document.submitted], ['Current status', document.approval]].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_1fr] gap-3 py-3.5"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="text-sm font-medium text-slate-900">{value}</dd></div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onReject} className="h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100">Reject</button>
          <button type="button" onClick={onApprove} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Approve Document</button>
        </div>
      </div>
    </div>
  );
}

function PreviewPane({ item, className = "" }) {
  const previewUrl = item?.previewUrl;
  const mimeType = String(item?.mimeType || "").toLowerCase();
  const imagePreview = mimeType.startsWith("image/") || mimeType === "image/*";

  if (previewUrl && imagePreview) {
    return (
      <div className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${className}`}>
        <img src={previewUrl} alt={`Preview of ${item.title || item.fileName || "file"}`} className="h-full max-h-[480px] w-full object-contain" />
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${className}`}>
        <iframe src={previewUrl} title={`Preview of ${item.title || item.fileName || "document"}`} className="h-[420px] w-full bg-white" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center ${className}`}>
      <div>
        <FileText size={30} className="mx-auto text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-800">No stored preview</p>
        <p className="mt-1 text-xs text-slate-500">This database record does not have an uploaded file reference.</p>
      </div>
    </div>
  );
}
