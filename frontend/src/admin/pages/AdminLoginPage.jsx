import { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { adminAuthApi } from "../adminAuthApi";
import AdminAuthShell from "../components/AdminAuthShell";
import { validateAdminEmail, validateAdminPassword } from "../adminValidation";
import AdminPasswordRecovery from "./AdminPasswordRecovery";

const INVALID_CREDENTIALS_MESSAGE = "The email or password you entered is incorrect.";

export default function AdminLoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFieldError, setMfaFieldError] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("email");
  const [showMfaPasskey, setShowMfaPasskey] = useState(false);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const mfaInputRef = useRef(null);

  const focusFirstInvalidLoginField = (errors) => {
    const target = errors.email ? emailInputRef.current : errors.password ? passwordInputRef.current : null;
    window.requestAnimationFrame(() => target?.focus());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const email = form.email.trim().toLowerCase();
    const nextFieldErrors = {
      email: validateAdminEmail(email),
      password: validateAdminPassword(form.password),
    };
    setFieldErrors(nextFieldErrors);
    setError("");
    if (nextFieldErrors.email || nextFieldErrors.password) {
      focusFirstInvalidLoginField(nextFieldErrors);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await adminAuthApi.login({ ...form, email });
      if (response.requiresMfa) {
        setMfaChallenge(response);
        setMfaCode("");
        setMfaFieldError("");
        setVerificationMethod(response.defaultMethod || (response.passkeyAvailable ? "passkey" : "email"));
        setShowMfaPasskey(false);
        return;
      }
      onLogin(response.user);
    } catch (requestError) {
      const responseFieldErrors = {
        email: String(requestError.errors?.email || "").trim(),
        password: String(requestError.errors?.password || "").trim(),
      };
      if (responseFieldErrors.email || responseFieldErrors.password) {
        setFieldErrors(responseFieldErrors);
        setError("");
        focusFirstInvalidLoginField(responseFieldErrors);
      } else if (requestError.code === "INVALID_EMAIL") {
        const nextErrors = { email: requestError.message || "Enter a valid email address.", password: "" };
        setFieldErrors(nextErrors);
        setError("");
        focusFirstInvalidLoginField(nextErrors);
      } else if (requestError.code === "INVALID_PASSWORD" || /invalid email or password/i.test(requestError.message || "")) {
        const nextErrors = { email: "", password: INVALID_CREDENTIALS_MESSAGE };
        setFieldErrors(nextErrors);
        setError("");
        focusFirstInvalidLoginField(nextErrors);
      } else if (requestError.code === "API_UNAVAILABLE") setError("Admin server is offline. Open the project root folder and run npm run dev, then try again.");
      else if (requestError.status === 404) setError("The running backend does not contain the admin login route. Make sure this project's backend is running on port 5001.");
      else if (requestError.status === 429) setError("Too many attempts. Please wait 15 minutes and try again.");
      else if (requestError.status === 503) setError(requestError.message || "Admin login is temporarily unavailable.");
      else setError(requestError.message || "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    const usePasskey = verificationMethod === "passkey";
    const validCode = usePasskey ? mfaCode.length >= 12 && mfaCode.length <= 128 : /^\d{6}$/.test(mfaCode);
    if (loading || !validCode) {
      if (!validCode) {
        setMfaFieldError(usePasskey ? "Enter your complete secret passkey." : "Enter the complete 6-digit verification code.");
        window.requestAnimationFrame(() => mfaInputRef.current?.focus());
      }
      return;
    }

    setLoading(true);
    setError("");
    setMfaFieldError("");
    try {
      const response = usePasskey
        ? await adminAuthApi.verifyPasskey(mfaChallenge.challengeId, mfaCode)
        : await adminAuthApi.verifyMfa(mfaChallenge.challengeId, mfaCode);
      onLogin(response.user);
    } catch (requestError) {
      if (requestError.status === 429) setError("Too many verification attempts. Please log in again to request a new code.");
      else if (requestError.status >= 500 || requestError.code === "API_UNAVAILABLE") setError(requestError.message || "Verification is temporarily unavailable.");
      else {
        setMfaFieldError(requestError.message || "The verification value could not be confirmed.");
        window.requestAnimationFrame(() => mfaInputRef.current?.focus());
      }
    } finally {
      setLoading(false);
    }
  };

  const requestEmailCode = async (resend = false) => {
    if (loading) return;
    if (mfaChallenge.emailCodeSent && !resend) {
      setVerificationMethod("email");
      setMfaCode("");
      setMfaFieldError("");
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setMfaFieldError("");
    try {
      const payload = await adminAuthApi.sendMfaEmailCode(mfaChallenge.challengeId);
      setMfaChallenge((current) => ({ ...current, emailCodeSent: true, maskedEmail: payload.maskedEmail || current.maskedEmail }));
      setVerificationMethod("email");
      setMfaCode("");
    } catch (requestError) {
      setError(requestError.message || "The email verification code could not be sent.");
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setMfaChallenge(null);
    setMfaCode("");
    setMfaFieldError("");
    setVerificationMethod("email");
    setShowMfaPasskey(false);
    setError("");
    setForm((current) => ({ ...current, password: "" }));
  };

  if (recoveryOpen) {
    return <AdminPasswordRecovery onBackToLogin={() => { setRecoveryOpen(false); setError(""); setFieldErrors({ email: "", password: "" }); setForm((current) => ({ ...current, password: "" })); }} />;
  }

  if (mfaChallenge) {
    const usePasskey = verificationMethod === "passkey";
    const MethodIcon = usePasskey ? KeyRound : Mail;

    return (
      <AdminAuthShell mode="verification">
        <section className="rounded-3xl border border-white/70 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)] sm:p-8">
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100"><ShieldCheck size={14} />Security check</span>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Verify it&apos;s you</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">Choose a verification method and confirm your identity.</p>
          </header>

          {mfaChallenge.passkeyAvailable ? (
            <div role="group" aria-label="Verification method" className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <button type="button" disabled={loading} onClick={() => { setVerificationMethod("passkey"); setMfaCode(""); setMfaFieldError(""); setShowMfaPasskey(false); setError(""); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${usePasskey ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/60 hover:text-slate-700"}`}><KeyRound size={16} />Passkey</button>
              <button type="button" disabled={loading} onClick={() => { if (usePasskey) void requestEmailCode(false); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${!usePasskey ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/60 hover:text-slate-700"}`}><Mail size={16} />Email backup</button>
            </div>
          ) : null}

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-600"><MethodIcon size={17} /></span>
            <div><p className="text-sm font-semibold text-slate-800">{usePasskey ? "Enter your Super Admin passkey" : "Check your admin email"}</p><p className="mt-1 text-xs leading-5 text-slate-600">{usePasskey ? "Use the private passkey configured in Security settings." : <>We sent a six-digit code to <strong className="font-semibold text-slate-800">{mfaChallenge.maskedEmail}</strong>. It expires in five minutes.</>}</p></div>
          </div>

          <form onSubmit={handleMfaSubmit} className="mt-5 space-y-4">
            <AuthInput
              autoFocus
              name="verification"
              label={usePasskey ? "Secret passkey" : "Verification code"}
              icon={MethodIcon}
              inputRef={mfaInputRef}
              error={mfaFieldError}
              type={usePasskey && !showMfaPasskey ? "password" : "text"}
              inputMode={usePasskey ? "text" : "numeric"}
              autoComplete={usePasskey ? "off" : "one-time-code"}
              maxLength={usePasskey ? 128 : 6}
              value={mfaCode}
              onChange={(event) => { const value = usePasskey ? event.target.value.slice(0, 128) : event.target.value.replace(/\D/g, "").slice(0, 6); setMfaCode(value); setMfaFieldError(""); setError(""); }}
              disabled={loading}
              placeholder={usePasskey ? "Enter your secret passkey" : "000000"}
              inputClassName={usePasskey ? "font-sans tabular-nums" : "pr-12 text-center font-sans tabular-nums text-xl tracking-[0.35em]"}
              trailing={usePasskey ? <button type="button" onClick={() => setShowMfaPasskey((current) => !current)} disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" aria-label={showMfaPasskey ? "Hide secret passkey" : "Show secret passkey"}>{showMfaPasskey ? <EyeOff size={18} /> : <Eye size={18} />}</button> : null}
            />

            {error ? <ErrorMessage message={error} /> : null}

            <button type="submit" disabled={loading || (usePasskey ? mfaCode.length < 12 : mfaCode.length !== 6)} className="rp-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><LoaderCircle size={18} className="animate-spin" />Verifying...</> : <><ShieldCheck size={18} />Verify and continue</>}</button>

            {!usePasskey && mfaChallenge.emailCodeSent ? <button type="button" disabled={loading} onClick={() => void requestEmailCode(true)} className="mx-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-blue-700 disabled:opacity-50"><RefreshCw size={15} />Resend email code</button> : null}

            <button type="button" disabled={loading} onClick={backToLogin} className="flex w-full items-center justify-center gap-2 border-t border-slate-100 pt-4 text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:opacity-50"><ArrowLeft size={16} />Back to login</button>
          </form>
        </section>
      </AdminAuthShell>
    );
  }

  return (
    <AdminAuthShell>
      <section className="rounded-3xl border border-white/70 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)] sm:p-8">
        <header className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100"><LockKeyhole size={14} />Sign In</span>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Access the Admin Panel</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">Continue to your secure platform workspace.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error ? <ErrorMessage message={error} /> : null}

          <AuthInput
            name="email"
            label="Enter Email"
            icon={Mail}
            inputRef={emailInputRef}
            type="email"
            autoComplete="username"
            maxLength={254}
            error={fieldErrors.email}
            value={form.email}
            onChange={(event) => { setForm((current) => ({ ...current, email: event.target.value.toLowerCase() })); setFieldErrors((current) => ({ email: "", password: current.password === INVALID_CREDENTIALS_MESSAGE ? "" : current.password })); setError(""); }}
            onBlur={() => setFieldErrors((current) => ({ ...current, email: validateAdminEmail(form.email) }))}
            disabled={loading}
            placeholder="admin@gmail.com"
            hint="Use the authorized Super Admin email address."
          />

          <AuthInput
            name="password"
            label="Enter Password"
            icon={LockKeyhole}
            inputRef={passwordInputRef}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            maxLength={128}
            error={fieldErrors.password}
            value={form.password}
            onChange={(event) => { setForm((current) => ({ ...current, password: event.target.value })); setFieldErrors((current) => ({ ...current, password: "" })); setError(""); }}
            onBlur={() => setFieldErrors((current) => ({ ...current, password: validateAdminPassword(form.password) }))}
            disabled={loading}
            placeholder="Enter your password"
            trailing={<button type="button" onClick={() => setShowPassword((current) => !current)} disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
          />

          <div className="flex items-center justify-between gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-600"><input type="checkbox" checked={form.rememberMe} onChange={(event) => setForm((current) => ({ ...current, rememberMe: event.target.checked }))} disabled={loading} className="peer sr-only" /><span className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-transparent peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-blue-100"><Check size={14} strokeWidth={3} /></span>Remember me</label>
            <button type="button" onClick={() => setRecoveryOpen(true)} disabled={loading} className="text-sm font-medium text-slate-600 transition hover:text-blue-600 disabled:opacity-50">Forgot password?</button>
          </div>

          <button type="submit" disabled={loading} className="rp-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-70">{loading ? <><LoaderCircle size={18} className="animate-spin" />Signing In...</> : <><LogIn size={18} />Sign In</>}</button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-center text-xs text-slate-500"><ShieldCheck size={15} className="text-blue-600" />Authorized Super Admin access only</p>
      </section>
    </AdminAuthShell>
  );
}

function AuthInput({ name, label, icon: Icon, error = "", hint = "", trailing = null, inputClassName = "", inputRef = null, ...inputProps }) {
  const inputId = `admin-${name}`;
  const messageId = `${inputId}-${error ? "error" : "hint"}`;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded-lg border p-1.5 ${error ? "border-rose-200 bg-rose-50 text-rose-500" : "border-slate-200 bg-slate-50 text-slate-500"}`}><Icon size={16} /></span>
        <input {...inputProps} ref={inputRef} id={inputId} name={name} aria-invalid={Boolean(error)} aria-describedby={(error || hint) ? messageId : undefined} aria-errormessage={error ? messageId : undefined} className={`w-full rounded-xl border bg-white px-4 py-3 pl-12 text-[15px] text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 ${trailing ? "pr-12" : ""} ${error ? "border-rose-300 bg-rose-50/80 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" : "border-slate-200 hover:border-slate-300 focus:border-[#017FE6] focus:ring-4 focus:ring-blue-100"} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${inputClassName}`} />
        {trailing}
      </div>
      {error ? <p id={messageId} role="alert" className="flex items-center gap-1.5 text-sm font-medium text-rose-600"><AlertCircle size={14} className="shrink-0" />{error}</p> : hint ? <p id={messageId} className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function ErrorMessage({ message }) {
  return <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{message}</div>;
}
