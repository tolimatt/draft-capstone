import { LogOut, X } from "lucide-react";
import ModalPortal from "./ModalPortal";

export default function LogoutModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="rp-modal-layer">
        <button type="button" className="rp-modal-backdrop" onClick={onCancel} aria-label="Cancel sign out" />

        <div role="dialog" aria-modal="true" aria-labelledby="admin-logout-title" aria-describedby="admin-logout-description" className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.25)]">
          <div className="border-b border-slate-200 bg-gradient-to-r from-[#0B75E7]/10 via-white to-white px-6 pb-4 pt-5 sm:px-7">
            <button type="button" onClick={onCancel} className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200" aria-label="Close">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                <LogOut size={20} className="text-[#0B75E7]" />
              </div>
              <div>
                <h3 id="admin-logout-title" className="text-xl font-bold text-slate-900">Sign Out?</h3>
                <p className="text-xs text-slate-500">You will need to sign in again.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 sm:px-7">
            <p id="admin-logout-description" className="mb-6 text-sm text-slate-600">
              Are you sure you want to sign out of your admin account? You&apos;ll need to sign in again to access the admin control panel.
            </p>

            <div className="flex items-center gap-3">
              <button type="button" onClick={onCancel} className="rp-btn-secondary w-full py-2.5 text-sm">
                Cancel
              </button>
              <button type="button" onClick={onConfirm} className="rp-btn-primary w-full py-2.5 text-sm">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
