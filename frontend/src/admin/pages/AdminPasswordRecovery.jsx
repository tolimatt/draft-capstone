import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { adminAuthApi } from "../adminAuthApi";
import { validateAdminEmail, validateAdminPassword } from "../adminValidation";

const maskEmail = (email) => {
  const [name = "", domain = ""] = String(email || "").split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
};

export default function AdminPasswordRecovery({ onBackToLogin }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (step !== "otp" || seconds <= 0) return undefined;
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds, step]);

  const requestCode = async (event) => {
    event?.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const validationError = validateAdminEmail(normalizedEmail);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = await adminAuthApi.requestPasswordReset(normalizedEmail);
      setEmail(normalizedEmail);
      setDevelopmentCode(payload.developmentCode || "");
      setOtp(["", "", "", "", "", ""]);
      setSeconds(60);
      setStep("otp");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (requestError) {
      if (requestError.status === 429 && requestError.retryAfterSeconds) setSeconds(requestError.retryAfterSeconds);
      setError(requestError.message || "The verification code could not be sent.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError("");
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (event, index) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((digit, index) => { next[index] = digit; });
    setOtp(next);
    setError("");
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    const joinedOtp = otp.join("");
    if (!/^\d{6}$/.test(joinedOtp)) {
      setError("Enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = await adminAuthApi.verifyPasswordResetOtp(email, joinedOtp);
      setResetToken(payload.resetToken);
      setStep("reset");
    } catch (requestError) {
      setError(requestError.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const resetAdminPassword = async (event) => {
    event.preventDefault();
    const passwordError = validateAdminPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await adminAuthApi.resetPassword(email, resetToken, password);
      setStep("success");
    } catch (requestError) {
      setError(requestError.message || "The password could not be reset.");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (seconds > 0 || loading) return;
    await requestCode();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef3f9] p-4">
      <section className="w-full max-w-[560px] rounded-[26px] border border-white bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-9">
        <div className="text-center">
          <img src="/rentifypro-logo.png" alt="RentifyPro logo" className="mx-auto h-20 w-20 object-contain" />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-blue-600">System Admin Recovery</p>
        </div>

        {step === "email" ? (
          <form onSubmit={requestCode} className="mt-6">
            <RecoveryHeader icon={Mail} title="Forgot your password?" description="Enter the system-admin email and we’ll send a six-digit verification code." step="Step 1 of 3" />
            <label className="mt-6 block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">Email Address</span>
              <span className="relative block"><Mail size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value.toLowerCase()); setError(""); }} onBlur={() => setError(validateAdminEmail(email))} disabled={loading} placeholder="admin@gmail.com" className={inputClass(Boolean(error))} /></span>
              <p className="mt-1.5 text-xs text-slate-400">Supported: Gmail, Yahoo, Outlook, and Hotmail</p>
            </label>
            <ErrorMessage message={error} />
            <PrimaryButton loading={loading} label="Send Verification Code" loadingLabel="Sending Code..." />
          </form>
        ) : null}

        {step === "otp" ? (
          <form onSubmit={verifyCode} className="mt-6">
            <RecoveryHeader icon={ShieldCheck} title="Verify your email" description={`Enter the code sent to ${maskEmail(email)}.`} step="Step 2 of 3" />
            {developmentCode ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">Local development code</p><p className="mt-1 font-mono text-2xl font-bold tracking-[0.25em] text-amber-900">{developmentCode}</p><p className="mt-1 text-xs text-amber-700">SMTP is unavailable locally. This code is only exposed for loopback development.</p></div> : null}
            <div className="mt-7 flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => <input key={index} ref={(element) => { otpRefs.current[index] = element; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(event) => handleOtpChange(index, event.target.value)} onKeyDown={(event) => handleOtpKeyDown(event, index)} disabled={loading} aria-label={`Verification code digit ${index + 1}`} className="h-12 w-11 rounded-xl border border-slate-300 text-center text-lg font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 sm:h-14 sm:w-12" />)}
            </div>
            <div className="mt-4 text-center text-xs text-slate-500">
              {seconds > 0 ? <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />Resend available in {seconds}s</span> : <button type="button" onClick={resendCode} disabled={loading} className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"><RefreshCw size={14} />Resend verification code</button>}
            </div>
            <ErrorMessage message={error} />
            <PrimaryButton loading={loading} label="Verify Code" loadingLabel="Verifying..." />
          </form>
        ) : null}

        {step === "reset" ? (
          <form onSubmit={resetAdminPassword} className="mt-6">
            <RecoveryHeader icon={KeyRound} title="Create a new password" description="Use at least eight characters with uppercase, lowercase, number, and special character." step="Step 3 of 3" />
            <PasswordField label="New Password" value={password} onChange={(value) => { setPassword(value); setError(""); }} onBlur={() => setError(validateAdminPassword(password))} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} disabled={loading} />
            <PasswordField label="Confirm New Password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setError(""); }} onBlur={() => confirmPassword && setError(password === confirmPassword ? "" : "Passwords do not match.")} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} disabled={loading} />
            <ErrorMessage message={error} />
            <PrimaryButton loading={loading} label="Update Password" loadingLabel="Updating Password..." />
          </form>
        ) : null}

        {step === "success" ? (
          <div className="mt-7 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={32} /></span>
            <h1 className="mt-5 text-2xl font-bold text-slate-950">Password updated</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Your new password is ready. Existing admin sessions were securely invalidated.</p>
            <button type="button" onClick={onBackToLogin} className="mt-6 h-12 w-full rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Return to Login</button>
          </div>
        ) : null}

        {step !== "success" ? <button type="button" onClick={onBackToLogin} disabled={loading} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><ArrowLeft size={17} />Back to Login</button> : null}
      </section>
    </main>
  );
}

function RecoveryHeader({ icon: Icon, title, description, step }) {
  return <div className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Icon size={23} /></span><p className="mt-4 text-xs font-semibold text-slate-400">{step}</p><h1 className="mt-1 text-2xl font-bold text-slate-950">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>;
}

function ErrorMessage({ message }) {
  return message ? <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{message}</div> : null;
}

function PrimaryButton({ loading, label, loadingLabel }) {
  return <button type="submit" disabled={loading} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <><LoaderCircle size={19} className="animate-spin" />{loadingLabel}</> : label}</button>;
}

function PasswordField({ label, value, onChange, onBlur, visible, onToggle, disabled }) {
  return <label className="mt-5 block"><span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span><span className="relative block"><KeyRound size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type={visible ? "text" : "password"} autoComplete="new-password" maxLength={128} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} disabled={disabled} placeholder={label} className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50" /><button type="button" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-50">{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>;
}

function inputClass(hasError) {
  return `h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:bg-slate-50 ${hasError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`;
}
