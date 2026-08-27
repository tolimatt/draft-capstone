import { useState } from "react";
import {
  BarChart3,
  Car,
  Check,
  Eye,
  EyeOff,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ArrowLeft,
  ShieldCheck,
  Users,
} from "lucide-react";
import { adminAuthApi } from "../adminAuthApi";
import { validateAdminEmail, validateAdminPassword } from "../adminValidation";
import AdminPasswordRecovery from "./AdminPasswordRecovery";

const features = [
  { icon: Car, label: "Fleet Management" },
  { icon: Users, label: "Customer Oversight" },
  { icon: FileCheck2, label: "Document Verification" },
  { icon: BarChart3, label: "Analytics & Reports" },
];

export default function AdminLoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const email = form.email.trim().toLowerCase();
    const nextFieldErrors = {
      email: validateAdminEmail(email),
      password: validateAdminPassword(form.password),
    };
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      setError("Please fix the highlighted fields before logging in.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await adminAuthApi.login({ ...form, email });
      if (response.requiresMfa) {
        setMfaChallenge(response);
        setMfaCode("");
        return;
      }
      onLogin(response.user);
    } catch (requestError) {
      if (requestError.errors && Object.keys(requestError.errors).length) {
        setFieldErrors((current) => ({ ...current, ...requestError.errors }));
      }
      if (requestError.code === "API_UNAVAILABLE") setError("Admin server is offline. Open the project root folder and run npm run dev, then try again.");
      else if (requestError.status === 404) setError("The running backend does not contain the admin login route. Make sure this project's backend is running on port 5000.");
      else if (requestError.status === 429) setError("Too many attempts. Please wait 15 minutes and try again.");
      else if (requestError.status === 503) setError("Admin login has not been configured on the server.");
      else setError(requestError.message || "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    if (loading || !/^\d{6}$/.test(mfaCode)) {
      if (!/^\d{6}$/.test(mfaCode)) setError("Enter the complete 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await adminAuthApi.verifyMfa(mfaChallenge.challengeId, mfaCode);
      onLogin(response.user);
    } catch (requestError) {
      if (requestError.status === 429) setError("Too many verification attempts. Please log in again to request a new code.");
      else setError(requestError.message || "The verification code could not be confirmed.");
    } finally {
      setLoading(false);
    }
  };

  if (recoveryOpen) {
    return <AdminPasswordRecovery onBackToLogin={() => { setRecoveryOpen(false); setError(""); setFieldErrors({ email: "", password: "" }); setForm((current) => ({ ...current, password: "" })); }} />;
  }

  if (mfaChallenge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f9] p-4">
        <section className="w-full max-w-md rounded-[26px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ShieldCheck size={28} /></div>
          <h1 className="mt-6 text-2xl font-bold text-slate-950">Verify it’s you</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Enter the six-digit security code sent to <span className="font-semibold text-slate-800">{mfaChallenge.maskedEmail}</span>. The code expires in five minutes.</p>
          {mfaChallenge.developmentCode ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Development code: <span className="font-mono font-bold tracking-widest">{mfaChallenge.developmentCode}</span></div> : null}
          <form onSubmit={handleMfaSubmit} className="mt-6">
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Verification code</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(event) => { setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} disabled={loading} placeholder="000000" className="h-14 w-full rounded-xl border border-slate-300 text-center font-mono text-2xl font-bold tracking-[0.45em] text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50" /></label>
            {error ? <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
            <button type="submit" disabled={loading || mfaCode.length !== 6} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><LoaderCircle size={19} className="animate-spin" />Verifying...</> : <><ShieldCheck size={19} />Verify and continue</>}</button>
            <button type="button" disabled={loading} onClick={() => { setMfaChallenge(null); setMfaCode(""); setError(""); setForm((current) => ({ ...current, password: "" })); }} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeft size={17} />Back to login</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef3f9] p-3 sm:p-4 lg:flex lg:h-screen lg:items-center lg:overflow-hidden">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1280px] overflow-hidden rounded-[26px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0 lg:max-h-[900px] lg:grid-cols-[1fr_1fr]">
        <section className="relative hidden overflow-hidden bg-[#061a36] px-10 py-9 text-white lg:flex lg:flex-col xl:px-14 xl:py-10">
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-blue-500/10" />
          <div aria-hidden="true" className="absolute -right-12 -top-12 h-56 w-56 rounded-full border border-blue-500/10" />
          <div className="relative flex items-center gap-4">
            <img src="/rentifypro-logo.png" alt="RentifyPro logo" className="h-14 w-14 shrink-0 object-contain" />
            <div><p className="text-2xl font-bold">Rentify<span className="text-blue-500">Pro</span></p><p className="text-sm text-slate-300">Admin Control Panel</p></div>
          </div>

          <div className="relative mt-8 max-w-xl">
            <h1 className="text-3xl font-bold leading-tight xl:text-4xl">Manage your platform.<br />Drive better operations.</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300 xl:text-base">Securely access and manage vehicles, customers, documents, and platform activity in one place.</p>
          </div>

          <div className="admin-login-hero-graphic relative my-auto flex justify-center py-5">
            <div className="relative flex h-44 w-full max-w-md items-center justify-center rounded-[28px] border border-blue-400/20 bg-blue-500/[0.04]">
              <div className="absolute left-7 top-7 h-24 w-32 rounded-2xl border border-blue-400/30 bg-blue-500/[0.05] p-4"><div className="h-2.5 w-20 rounded bg-blue-400/25" /><div className="mt-4 h-12 rounded-lg border border-blue-400/20" /></div>
              <Car size={112} strokeWidth={1.05} className="relative mt-12 text-blue-400" />
              <div className="absolute bottom-6 right-7 flex h-24 w-20 items-center justify-center rounded-2xl border border-blue-400/30 bg-[#082044]"><ShieldCheck size={37} strokeWidth={1.3} className="text-blue-400" /></div>
            </div>
          </div>

          <div className="relative grid grid-cols-4 gap-3">
            {features.map(({ icon: Icon, label }) => <div key={label} className="text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/[0.07] text-blue-400"><Icon size={21} /></div><p className="mt-2 text-[10px] font-medium leading-4 text-slate-200 xl:text-xs">{label}</p></div>)}
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-[460px]">
            <div className="text-center">
              <img src="/rentifypro-logo.png" alt="RentifyPro logo" className="mx-auto h-20 w-20 object-contain" />
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-slate-950">Welcome Back!</h2>
              <p className="mt-2 text-sm text-slate-500">Log in to access your admin dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-800">Email Address</span><span className="relative block"><Mail aria-hidden="true" size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" autoComplete="username" maxLength={254} aria-invalid={Boolean(fieldErrors.email)} value={form.email} onChange={(event) => { setForm((current) => ({ ...current, email: event.target.value.toLowerCase() })); setFieldErrors((current) => ({ ...current, email: "" })); setError(""); }} onBlur={() => setFieldErrors((current) => ({ ...current, email: validateAdminEmail(form.email) }))} disabled={loading} placeholder="admin@gmail.com" className={`h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:bg-slate-50 ${fieldErrors.email ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`} /></span>{fieldErrors.email ? <span className="mt-1.5 block text-xs font-semibold text-rose-600">{fieldErrors.email}</span> : <span className="mt-1.5 block text-xs text-slate-400">Supported: Gmail, Yahoo, Outlook, and Hotmail</span>}</label>

              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-800">Password</span><span className="relative block"><LockKeyhole aria-hidden="true" size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type={showPassword ? "text" : "password"} autoComplete="current-password" maxLength={128} aria-invalid={Boolean(fieldErrors.password)} value={form.password} onChange={(event) => { setForm((current) => ({ ...current, password: event.target.value })); setFieldErrors((current) => ({ ...current, password: "" })); setError(""); }} onBlur={() => setFieldErrors((current) => ({ ...current, password: validateAdminPassword(form.password) }))} disabled={loading} placeholder="Enter your password" className={`h-12 w-full rounded-xl border bg-white pl-12 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:bg-slate-50 ${fieldErrors.password ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`} /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span>{fieldErrors.password ? <span className="mt-1.5 block text-xs font-semibold text-rose-600">{fieldErrors.password}</span> : null}</label>

              <div className="flex items-center justify-between gap-4"><label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-600"><input type="checkbox" checked={form.rememberMe} onChange={(event) => setForm((current) => ({ ...current, rememberMe: event.target.checked }))} disabled={loading} className="peer sr-only" /><span className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-transparent peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-blue-100"><Check size={14} strokeWidth={3} /></span>Remember me</label><button type="button" onClick={() => setRecoveryOpen(true)} disabled={loading} className="text-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-50">Forgot password?</button></div>

              {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

              <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <><LoaderCircle size={20} className="animate-spin" />Logging In...</> : <><LockKeyhole size={19} />Log In</>}</button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-500"><p>RentifyPro Admin Control Panel</p><p>Secure. Reliable. Efficient.</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
