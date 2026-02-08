export default function AIInsights() {
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md">
            💡
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              AI-Powered Insights
            </h1>
            <p className="text-sm text-gray-600">
              Smart recommendations & predictive analysis
            </p>
          </div>
        </div>
      </div>

      {/* INSIGHT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* DEMAND FORECAST */}
        <InsightCard
          icon="📈"
          title="Demand Forecast"
          highlight="High Confidence"
          highlightColor="text-emerald-600"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            Expected <span className="font-semibold text-gray-900">23%</span>{" "}
            increase in SUV rentals next week based on seasonal and booking
            trends.
          </p>
        </InsightCard>

        {/* PRICE OPTIMIZATION */}
        <InsightCard
          icon="💰"
          title="Price Optimization"
          highlight="Market-Driven"
          highlightColor="text-blue-600"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            Recommended <span className="font-semibold">8%</span> price increase
            for luxury vehicles to maximize revenue without reducing demand.
          </p>
        </InsightCard>

        {/* RISK ASSESSMENT */}
        <InsightCard
          icon="🛡️"
          title="Risk Assessment"
          highlight="Action Required"
          highlightColor="text-amber-600"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">3 bookings</span> were
            flagged for additional verification due to unusual activity.
          </p>
        </InsightCard>
      </div>

      {/* EXTRA DEPTH SECTION */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          AI Recommendations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Recommendation
            title="Increase SUV Availability"
            description="Reallocate idle sedans to SUVs to meet predicted demand."
            badge="Revenue Boost"
          />

          <Recommendation
            title="Enable Extra Verification"
            description="Temporarily require ID re-checks for flagged users."
            badge="Risk Control"
          />
        </div>
      </div>
    </div>
  )
}

/* =====================
   SUB COMPONENTS
===================== */

function InsightCard({
  icon,
  title,
  children,
  highlight,
  highlightColor,
}: {
  icon: string
  title: string
  children: React.ReactNode
  highlight: string
  highlightColor: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_15px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.12)] transition">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg">
            {icon}
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>

        <span className={`text-xs font-semibold ${highlightColor}`}>
          {highlight}
        </span>
      </div>

      {children}
    </div>
  )
}

function Recommendation({
  title,
  description,
  badge,
}: {
  title: string
  description: string
  badge: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-white transition shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-gray-900">{title}</p>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
          {badge}
        </span>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}
