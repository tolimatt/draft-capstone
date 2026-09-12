import { CheckCircle2 } from "lucide-react";

const loginHighlights = [
  "Monitor bookings, transactions, and platform activity",
  "Oversee customers, vehicles, and document verification",
  "Maintain secure and accountable platform administration",
];

const verificationHighlights = [
  "Passkey-first identity verification",
  "Email verification available as a backup",
  "Secure, revocable administrator sessions",
];

export default function AdminAuthShell({ children, mode = "login" }) {
  const verifying = mode === "verification";
  const highlights = verifying ? verificationHighlights : loginHighlights;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 lg:hidden">
        <img src="/admin-login-porsche.png" alt="" className="h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#212121]/85 via-[#212121]/70 to-blue-900/55" />
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute -left-24 top-[-5.5rem] h-72 w-72 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="absolute right-[-5rem] top-[8%] h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[45%] h-96 w-96 -translate-x-1/2 rounded-full bg-blue-200/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] items-stretch gap-4 p-4 sm:gap-6 sm:p-6 lg:h-[100dvh] lg:gap-8 lg:p-8">
        <section className="hidden lg:flex lg:w-[44%] xl:w-[40%]">
          <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/60 bg-slate-900 shadow-[0_24px_65px_rgba(15,23,42,0.18)]">
            <img src="/admin-login-porsche.png" alt="Blue Porsche 911 on the road" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-br from-[#212121]/85 via-[#212121]/60 to-blue-700/45" />

            <div className="relative z-10 flex h-full flex-col justify-between p-9 xl:p-10">
              <div>
                <div className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur">
                  Rentify<span className="text-blue-200">Pro</span><span className="mx-2 h-4 w-px bg-white/25" /><span className="text-xs font-medium text-slate-200">Admin</span>
                </div>
              </div>

              <div className="max-w-md">
                <span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 ring-1 ring-white/25">{verifying ? "Secure identity check" : "Secure platform access"}</span>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white xl:text-5xl">{verifying ? "One final step before your dashboard." : "Manage RentifyPro with confidence."}</h1>
                <p className="mt-4 text-base leading-relaxed text-slate-200">{verifying ? "Confirm your identity using the Super Admin passkey or the email backup method." : "Sign in to oversee platform operations, monitor activity, and keep every workflow running securely."}</p>
                <div className="mt-7 space-y-3">
                  {highlights.map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-slate-100">
                      <CheckCircle2 size={16} className="shrink-0 text-blue-200" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="lg:hidden">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md">
              Rentify<span className="text-blue-300">Pro</span><span className="mx-2 h-4 w-px bg-white/25" /><span className="text-xs font-medium text-blue-100">Admin</span>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-y-auto py-4 sm:py-6 lg:py-0">
            <div className="w-full max-w-xl">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
