import "./VehicleCard.css";

function Block({ className = "" }) {
  return <span aria-hidden="true" className={`block rounded-lg bg-slate-200/75 motion-safe:animate-pulse ${className}`} />;
}

export function SkeletonRegion({ label, className = "", children }) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
    </div>
  );
}

export function VehicleCardSkeleton({ managed = false }) {
  return (
    <article className="rp-vehicle-card pointer-events-none select-none">
      <div className="rp-vehicle-card__preview">
        <Block className="aspect-[16/10] w-full !rounded-2xl" />
      </div>
      <div className="rp-vehicle-card__body gap-3">
        <Block className="h-3 w-1/3" />
        <Block className="h-5 w-3/4" />
        <Block className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Block className="h-6 w-1/4" />
          <Block className="h-6 w-1/4" />
          <Block className="h-6 w-1/4" />
        </div>
        {managed && <Block className="mt-2 h-10 w-full" />}
        <div className="mt-auto flex items-end justify-between gap-4 pt-3">
          <div className="space-y-2">
            <Block className="h-3 w-12" />
            <Block className="h-6 w-24" />
          </div>
          <Block className="h-11 w-28" />
        </div>
      </div>
    </article>
  );
}

export function VehicleGridSkeleton({ label = "Loading vehicles", count = 3, className = "rp-market-grid", managed = false }) {
  return (
    <SkeletonRegion label={label} className={className}>
      {Array.from({ length: count }, (_, index) => <VehicleCardSkeleton key={index} managed={managed} />)}
    </SkeletonRegion>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <Block className="h-5 w-40" />
          <Block className="h-3 w-56 max-w-full" />
        </div>
        <Block className="h-7 w-24 !rounded-full" />
      </div>
      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
        <Block className="h-10 w-full" />
        <Block className="h-10 w-full" />
        <Block className="h-10 w-full" />
      </div>
      <Block className="mt-5 h-10 w-32" />
    </div>
  );
}

export function BookingListSkeleton({ label = "Loading bookings", count = 2 }) {
  return (
    <SkeletonRegion label={label} className="space-y-4">
      {Array.from({ length: count }, (_, index) => <BookingCardSkeleton key={index} />)}
    </SkeletonRegion>
  );
}

export function ActivityListSkeleton({ label = "Loading updates", count = 3 }) {
  return (
    <SkeletonRegion label={label} className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
          <Block className="h-4 w-2/5" />
          <Block className="mt-3 h-3 w-4/5" />
          <Block className="mt-2 h-3 w-3/5" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function ConversationListSkeleton({ label = "Loading conversations" }) {
  return (
    <SkeletonRegion label={label} className="space-y-2 p-3">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 rounded-xl p-2">
          <Block className="h-11 w-11 shrink-0 !rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Block className="h-4 w-2/3" />
            <Block className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function MessageThreadSkeleton({ label = "Loading messages" }) {
  return (
    <SkeletonRegion label={label} className="space-y-5 px-4 py-6">
      <div className="flex gap-2"><Block className="h-8 w-8 !rounded-full" /><Block className="h-16 w-2/3 max-w-72" /></div>
      <Block className="ml-auto h-12 w-1/2 max-w-64" />
      <div className="flex gap-2"><Block className="h-8 w-8 !rounded-full" /><Block className="h-20 w-3/5 max-w-64" /></div>
    </SkeletonRegion>
  );
}

export function OwnerDashboardSkeleton() {
  return (
    <SkeletonRegion label="Loading dashboard" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-4 rounded-2xl bg-white p-5">
            <Block className="h-3 w-2/3" />
            <Block className="h-8 w-1/2" />
            <Block className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.92fr)]">
        <div className="rounded-2xl bg-white p-5">
          <Block className="h-5 w-40" />
          <div className="mt-5 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, index) => <Block key={index} className="aspect-square w-full" />)}
          </div>
        </div>
        <div className="space-y-3 rounded-2xl bg-white p-5">
          <Block className="h-5 w-36" />
          {[0, 1, 2].map((item) => <Block key={item} className="h-20 w-full" />)}
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function AnalyticsContentSkeleton() {
  return (
    <SkeletonRegion label="Loading vehicle analytics" className="space-y-5">
      <div className="rounded-2xl bg-white p-5">
        <Block className="h-5 w-48" />
        <Block className="mt-3 h-3 w-3/4 max-w-lg" />
        <div className="mt-8 flex h-48 items-end gap-3 sm:h-64">
          {["h-[45%]", "h-[70%]", "h-[55%]", "h-[85%]", "h-[62%]", "h-[78%]"].map((height, index) => <Block key={index} className={`w-full !rounded-b-none ${height}`} />)}
        </div>
      </div>
      <div className="space-y-4 rounded-2xl bg-white p-5">
        <Block className="h-5 w-52" />
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-2 border-t border-slate-100 pt-4">
            <Block className="h-4 w-1/2" />
            <Block className="h-3 w-full" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function EarningsContentSkeleton() {
  return (
    <SkeletonRegion label="Loading earnings" className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="space-y-3 rounded-2xl bg-white p-5"><Block className="h-4 w-2/3" /><Block className="h-8 w-1/2" /></div>)}
      </div>
      <div className="space-y-4 rounded-2xl bg-white p-5"><Block className="h-5 w-48" /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((item) => <Block key={item} className="h-14 w-full" />)}</div></div>
      <div className="space-y-3 rounded-2xl bg-white p-5"><Block className="h-5 w-48" />{[0, 1, 2].map((item) => <Block key={item} className="h-10 w-full" />)}</div>
    </SkeletonRegion>
  );
}

export function AdminDataSkeleton({ view = "dashboard" }) {
  if (view === "dashboard") return (
    <SkeletonRegion label="Loading admin dashboard" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="space-y-3 rounded-2xl bg-white p-4"><Block className="h-3 w-2/3" /><Block className="h-8 w-1/2" /><Block className="h-3 w-3/4" /></div>)}
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,1fr)]">
        <div className="rounded-2xl bg-white p-5"><Block className="h-5 w-40" /><div className="mt-6 flex h-64 items-end gap-4">{[0, 1, 2, 3, 4].map((item) => <Block key={item} className={`w-full ${item % 2 ? "h-2/3" : "h-1/2"}`} />)}</div></div>
        <div className="rounded-2xl bg-white p-5"><Block className="h-5 w-40" /><Block className="mx-auto mt-8 aspect-square w-48 !rounded-full" /></div>
      </div>
    </SkeletonRegion>
  );
  if (view === "vehicles") return <VehicleGridSkeleton label="Loading vehicles" />;
  if (view === "bookings") return <BookingListSkeleton />;
  return (
    <SkeletonRegion label={`Loading ${view}`} className="space-y-4 rounded-2xl bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3"><Block className="h-6 w-44" /><Block className="h-10 w-48" /></div>
      {[0, 1, 2, 3, 4].map((item) => <div key={item} className="flex gap-4 border-t border-slate-100 pt-4"><Block className="h-10 w-10 shrink-0 !rounded-full" /><Block className="h-10 w-1/3" /><Block className="hidden h-10 flex-1 sm:block" /></div>)}
    </SkeletonRegion>
  );
}

function RenterHeaderSkeleton() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Block className="h-8 w-32 sm:w-40" />
        <div className="hidden items-center gap-7 md:flex"><Block className="h-3 w-14" /><Block className="h-3 w-20" /><Block className="h-3 w-16" /></div>
        <Block className="h-10 w-10 shrink-0 !rounded-full" />
      </div>
    </div>
  );
}

function RouteContent({ page }) {
  if (page === "home") return (
    <>
      <div className="mx-auto max-w-7xl bg-slate-800 px-5 pb-28 pt-16 sm:rounded-b-3xl sm:pt-24">
        <div className="max-w-xl space-y-5"><Block className="h-6 w-40 !bg-white/20" /><Block className="h-12 w-4/5 !bg-white/20" /><Block className="h-12 w-3/5 !bg-white/20" /><Block className="h-5 w-4/5 !bg-white/20" /></div>
      </div>
      <div className="mx-auto -mt-12 max-w-6xl px-4"><div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-3"><Block className="h-12 w-full" /><Block className="h-12 w-full" /><Block className="h-12 w-full" /></div></div>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6"><Block className="h-8 w-52" /><VehicleGridSkeleton label="Loading featured vehicles" count={3} /></div>
    </>
  );

  if (page === "vehicles") return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-16 pt-8 sm:px-6">
      <Block className="h-9 w-72 max-w-full" /><Block className="h-4 w-4/5 max-w-xl" />
      <div className="flex flex-wrap items-center justify-between gap-4"><Block className="h-8 w-44" /><Block className="h-12 w-full sm:w-72" /></div>
      <div className="flex gap-2"><Block className="h-10 w-16" /><Block className="h-10 w-20" /><Block className="h-10 w-20" /></div>
      <VehicleGridSkeleton />
    </main>
  );

  if (page === "vehicle-details") return (
    <main className="mx-auto max-w-[1380px] space-y-5 px-4 pb-16 pt-8 sm:px-6">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-5"><div className="space-y-3"><Block className="h-8 w-52" /><Block className="h-3 w-36" /></div><Block className="h-10 w-28" /></div>
      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-5"><div className="rounded-2xl bg-white p-5"><Block className="aspect-[16/10] w-full sm:aspect-[16/9]" /><div className="mt-3 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((item) => <Block key={item} className="h-16 w-full" />)}</div></div><div className="rounded-2xl bg-white p-5"><Block className="h-6 w-44" /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <Block key={item} className="h-14 w-full" />)}</div></div></div>
        <div className="space-y-4 rounded-2xl bg-white p-5"><Block className="h-6 w-40" /><Block className="h-12 w-full" /><Block className="h-12 w-full" /><Block className="h-12 w-full" /><Block className="h-12 w-full" /></div>
      </div>
    </main>
  );

  if (page === "booking-history") return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-8 sm:px-6"><Block className="h-8 w-48" /><Block className="h-4 w-64" /><div className="grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((item) => <Block key={item} className="h-10 w-full" />)}</div><BookingListSkeleton /></main>
  );

  if (page === "realtime-chat") return (
    <main className="mx-auto max-w-[1380px] space-y-5 px-4 pb-12 pt-8 sm:px-6"><Block className="h-24 w-full" /><div className="grid min-h-[28rem] overflow-hidden rounded-2xl bg-white md:grid-cols-[minmax(260px,0.38fr)_1fr]"><div className="border-r border-slate-200"><Block className="m-4 h-11 w-[calc(100%-2rem)]" /><ConversationListSkeleton /></div><div className="hidden md:block"><Block className="m-4 h-10 w-40" /><MessageThreadSkeleton /></div></div></main>
  );

  if (page === "notifications") return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 pb-16 pt-8 sm:px-6"><Block className="h-8 w-48" /><Block className="h-4 w-72 max-w-full" /><ActivityListSkeleton label="Loading notifications" /></main>
  );

  if (page === "account-settings") return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[240px_1fr]">
      <div className="hidden space-y-3 rounded-2xl bg-white p-4 lg:block">{[0, 1, 2, 3, 4].map((item) => <Block key={item} className="h-11 w-full" />)}</div>
      <div className="space-y-5"><Block className="h-8 w-48" /><Block className="h-4 w-4/5 max-w-md" /><div className="space-y-4 rounded-2xl bg-white p-5"><div className="flex items-center gap-4"><Block className="h-20 w-20 !rounded-full" /><Block className="h-5 w-40" /></div><Block className="h-12 w-full" /><Block className="h-12 w-full" /></div></div>
    </main>
  );

  if (["signin", "register", "register-owner", "registerotp", "forgot-email", "forgot-otp", "reset-password", "vehicle-owner-proceed", "vehicle-owner-verification"].includes(page)) return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6"><div className="space-y-5 rounded-2xl bg-white p-6 sm:p-8"><Block className="h-8 w-3/5" /><Block className="h-4 w-4/5" /><Block className="h-12 w-full" /><Block className="h-12 w-full" /><Block className="h-12 w-full" /><Block className="h-12 w-full" /></div></main>
  );

  if (["about", "privacy-policy", "terms-and-conditions"].includes(page)) return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 pb-16 pt-10 sm:px-6"><Block className="h-9 w-2/3" /><Block className="h-4 w-full" /><Block className="h-4 w-5/6" /><div className="space-y-4 pt-5"><Block className="h-6 w-1/3" />{[0, 1, 2, 3, 4].map((item) => <Block key={item} className="h-4 w-full" />)}</div></main>
  );

  return <main className="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-8 sm:px-6"><Block className="h-8 w-56 max-w-full" /><Block className="h-4 w-4/5 max-w-md" /><div className="rounded-2xl bg-white p-5 sm:p-8"><Block className="h-5 w-1/3" /><Block className="mt-6 h-12 w-full" /><Block className="mt-4 h-12 w-full" /><Block className="mt-4 h-12 w-3/4" /></div></main>;
}

function OwnerRouteContent() {
  let tab = "Dashboard";
  try {
    tab = new URLSearchParams(window.location.search).get("tab") || sessionStorage.getItem("rentifypro:owner-active-page") || tab;
  } catch {
    // A dashboard-shaped placeholder remains useful when storage is unavailable.
  }
  if (tab === "Analytics") return <AnalyticsContentSkeleton />;
  if (tab === "Earnings") return <EarningsContentSkeleton />;
  if (tab === "Vehicles") return <VehicleGridSkeleton label="Loading your vehicles" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" managed />;
  if (tab === "Bookings") return <BookingListSkeleton />;
  if (tab === "Notifications" || tab === "Reviews") return <ActivityListSkeleton label={`Loading ${tab.toLowerCase()}`} />;
  if (tab === "Messages") return <div className="grid min-h-[28rem] overflow-hidden rounded-2xl bg-white md:grid-cols-[minmax(260px,0.38fr)_1fr]"><ConversationListSkeleton /><div className="hidden md:block"><MessageThreadSkeleton /></div></div>;
  if (tab === "Settings" || tab === "Profile" || tab === "Reports") return <div className="space-y-4 rounded-2xl bg-white p-5"><Block className="h-7 w-48" /><Block className="h-12 w-full" /><Block className="h-12 w-full" /><Block className="h-12 w-3/4" /></div>;
  return <OwnerDashboardSkeleton />;
}

export function RouteSkeleton({ page = "home", label = "Loading page" }) {
  if (page === "owner-dashboard" || page === "admin-dashboard") return (
    <div role="status" aria-label={label} className="flex min-h-screen bg-[#f6f9fc]">
      <div aria-hidden="true" className="hidden w-64 shrink-0 space-y-5 border-r border-slate-200 bg-white p-5 lg:block"><Block className="h-8 w-36" />{[0, 1, 2, 3, 4, 5].map((item) => <Block key={item} className="h-10 w-full" />)}</div>
      <div aria-hidden="true" className="min-w-0 flex-1"><div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5"><Block className="h-6 w-36" /><Block className="h-9 w-9 !rounded-full" /></div><main className="p-4 sm:p-6">{page === "admin-dashboard" ? <AdminDataSkeleton /> : <OwnerRouteContent />}</main></div>
    </div>
  );
  return (
    <div role="status" aria-label={label} className="min-h-screen bg-[#f8fafc]">
      <div aria-hidden="true"><RenterHeaderSkeleton /><RouteContent page={page} /></div>
    </div>
  );
}

export function SignOutProgress() {
  return <main role="status" aria-label="Signing out" className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm"><div aria-hidden="true" className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[#017FE6] motion-reduce:animate-none" /><h1 className="text-xl font-bold text-slate-900">Signing out</h1><p className="mt-2 text-sm text-slate-600">Finishing your session securely...</p></div></main>;
}
