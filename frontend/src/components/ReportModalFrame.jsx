import { LoaderCircle, ShieldAlert, X } from "lucide-react";
import ModalPortal from "./ModalPortal";

export default function ReportModalFrame({
  titleId,
  title,
  subtitle,
  headerIcon,
  submitIcon,
  submitLabel,
  submittingLabel,
  submitting,
  onClose,
  onSubmit,
  children,
}) {
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
        onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose?.()}
      >
        <form
          onSubmit={onSubmit}
          className="my-auto w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          aria-labelledby={titleId}
        >
          <div className="flex items-start justify-between border-b border-slate-200 p-5 sm:p-6">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                {headerIcon || <ShieldAlert size={24} strokeWidth={2} aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="text-xl font-bold text-slate-950">{title}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close report form"
              disabled={submitting}
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="space-y-5 p-5 sm:p-6">{children}</div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? <LoaderCircle size={18} strokeWidth={2} className="animate-spin" aria-hidden="true" /> : submitIcon || <ShieldAlert size={18} strokeWidth={2} aria-hidden="true" />}
              {submitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
