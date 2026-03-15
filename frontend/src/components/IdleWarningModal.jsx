import React from "react";
import { AlertTriangle, Clock4 } from "lucide-react";

const formatCountdown = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

export default function IdleWarningModal({
  isOpen,
  countdownSeconds = 0,
  idleMinutes = 15,
  onStaySignedIn,
  onSignOut,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.25)]">
        <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-white px-6 pb-4 pt-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-amber-200">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Still there?</h3>
              <p className="text-xs text-slate-500">You have been idle for {idleMinutes} minutes.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 sm:px-7">
          <p className="mb-4 text-sm text-slate-600">
            Click anywhere on the screen or press any key to stay signed in.
          </p>

          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock4 size={16} className="text-amber-700" />
            <p className="text-sm font-semibold text-amber-800">
              Auto sign-out in {formatCountdown(countdownSeconds)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onSignOut} className="rp-btn-secondary w-full py-2.5 text-sm">
              Sign Out
            </button>
            <button onClick={onStaySignedIn} className="rp-btn-primary w-full py-2.5 text-sm">
              Stay Signed In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
