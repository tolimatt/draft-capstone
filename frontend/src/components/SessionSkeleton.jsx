function Placeholder({ className = "" }) {
  return <div className={`rounded-lg bg-slate-200/70 ${className}`} />;
}

export default function SessionSkeleton({ label = "Loading your account" }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="min-h-screen bg-[#f8fafc]"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="border-b border-slate-200/70 bg-white">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
            <Placeholder className="h-8 w-32 sm:w-40" />
            <div className="hidden items-center gap-7 md:flex">
              <Placeholder className="h-3 w-14" />
              <Placeholder className="h-3 w-20" />
              <Placeholder className="h-3 w-16" />
            </div>
            <Placeholder className="h-10 w-10 shrink-0 !rounded-full" />
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="space-y-3">
            <Placeholder className="h-7 w-3/5 max-w-sm sm:h-9" />
            <Placeholder className="h-3 w-4/5 max-w-lg" />
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-8">
            <Placeholder className="h-36 w-full sm:h-52" />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Placeholder className="h-11" />
              <Placeholder className="h-11" />
              <Placeholder className="h-11" />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="space-y-4 rounded-2xl border border-slate-200/70 bg-white p-5"
              >
                <Placeholder className="h-24 sm:h-28" />
                <Placeholder className="h-4 w-2/3" />
                <Placeholder className="h-3 w-5/6" />
                <Placeholder className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
