export default function Analytics() {
  return (
    <div className="space-y-6">
      {/* =====================
          TOP METRICS
      ====================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          label="Total Bookings"
          value="1,284"
          note="+12% this month"
        />
        <MetricCard
          label="Active Users"
          value="842"
          note="+6% growth"
        />
        <MetricCard
          label="Avg Booking Duration"
          value="3.6 days"
          note="Stable"
        />
        <MetricCard
          label="Revenue Growth"
          value="+18.4%"
          note="vs last month"
          highlight
        />
      </div>

      {/* =====================
          CHARTS
      ====================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* BOOKING TRENDS */}
        <Card title="Booking Trends">
          <BookingChart />
        </Card>

        {/* POPULAR VEHICLES */}
        <Card title="Popular Vehicles">
          <VehicleRow
            icon="🚗"
            name="Toyota Camry"
            value={156}
            max={180}
            color="from-indigo-500 to-blue-500"
          />
          <VehicleRow
            icon="🏍️"
            name="Honda CBR"
            value={124}
            max={180}
            color="from-emerald-500 to-green-500"
          />
          <VehicleRow
            icon="🚐"
            name="Mercedes Sprinter"
            value={98}
            max={180}
            color="from-amber-500 to-orange-500"
          />
        </Card>
      </div>

      {/* =====================
          PERFORMANCE INSIGHTS
      ====================== */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_25px_60px_rgba(0,0,0,0.12)] p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Performance Insights
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Insight label="Conversion Rate" value="62%" />
          <Insight label="Cancellation Rate" value="4.8%" />
          <Insight label="Repeat Customers" value="38%" />
          <Insight label="Fleet Utilization" value="71%" />
        </div>
      </div>
    </div>
  )
}

/* =====================
   REUSABLE UI
===================== */

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_25px_60px_rgba(0,0,0,0.12)] p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  note,
  highlight,
}: {
  label: string
  value: string
  note: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.12)] ${
        highlight ? "ring-2 ring-[#017FE6]/30" : ""
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </div>
  )
}

function BookingChart() {
  return (
    <div className="relative h-64">
      <div className="absolute inset-0 flex flex-col justify-between">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-t border-gray-200/70" />
        ))}
      </div>

      <svg viewBox="0 0 600 240" className="relative w-full h-full">
        <defs>
          <linearGradient id="analyticsLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#017FE6" />
            <stop offset="100%" stopColor="#4DA3FF" />
          </linearGradient>
        </defs>

        <polyline
          fill="none"
          stroke="url(#analyticsLine)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points="20,180 120,150 220,165 320,110 420,95 520,70"
        />

        {[20, 120, 220, 320, 420, 520].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={[180, 150, 165, 110, 95, 70][i]}
            r="5"
            fill="#017FE6"
          />
        ))}
      </svg>

      <div className="mt-3 grid grid-cols-6 text-xs text-gray-500">
        {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => (
          <div key={m} className="text-center">
            {m}
          </div>
        ))}
      </div>
    </div>
  )
}

function VehicleRow({
  icon,
  name,
  value,
  max,
  color,
}: {
  icon: string
  name: string
  value: number
  max: number
  color: string
}) {
  const percent = Math.round((value / max) * 100)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-medium text-gray-900">{name}</span>
        </div>
        <span className="text-sm text-gray-600">{value} rentals</span>
      </div>

      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-gray-900">{value}</p>
    </div>
  )
}
