import { useEffect, useState } from "react"

/* =====================
   SAMPLE DATA
===================== */

const statsData = {
  vehicles: 8,
  pendingBookings: 1,
  users: 1842,
}

const revenueData: Record<string, string> = {
  week: "$45,200",
  month: "$182,900",
  year: "$2,145,000",
}

const pendingVerifications = [
  { id: "v1", name: "Emily Davis", initials: "ED", type: "License & ID Verification" },
  { id: "v2", name: "James Davis", initials: "JD", type: "License & ID Verification" },
  { id: "v3", name: "Robert Brown", initials: "RB", type: "Valid ID Submission" },
]

const recentBookings = [
  { id: "b1", vehicle: "Toyota Camry 2024", days: 3, status: "Active" },
  { id: "b2", vehicle: "Honda CBR600RR", days: 1, status: "Pending" },
  { id: "b3", vehicle: "Mercedes Sprinter", days: 5, status: "Completed" },
]

/* =====================
   DASHBOARD
===================== */

export default function Dashboard() {
  const [revenueRange, setRevenueRange] =
    useState<"week" | "month" | "year">("week")

  useEffect(() => {}, [])

  return (
    <div className="space-y-10 bg-gray-50 min-h-full p-4 border border-black/40 rounded-3xl">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here’s what’s happening today.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Vehicles" value={statsData.vehicles} accent="blue" />
        <StatCard title="Pending Bookings" value={statsData.pendingBookings} accent="amber" />
        <StatCard title="Monthly Revenue" value={revenueData.month} accent="emerald" />
        <StatCard title="Total Users" value={statsData.users} accent="indigo" />
      </div>

      {/* MIDDLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* REVENUE */}
        <Panel className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-gray-800">
              Revenue Overview
            </h2>

            <select
              value={revenueRange}
              onChange={(e) => setRevenueRange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#017FE6]/40"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div className="h-48 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#017FE6]/15 to-transparent">
            <p className="text-sm text-gray-600 mb-2">
              Revenue ({revenueRange})
            </p>
            <p className="text-4xl font-bold text-[#017FE6] tracking-tight">
              {revenueData[revenueRange]}
            </p>
          </div>
        </Panel>

        {/* PENDING VERIFICATIONS */}
        <Panel>
          <h2 className="font-semibold text-gray-800 mb-4">
            Pending Verifications
          </h2>

          <div className="space-y-4">
            {pendingVerifications.map(v => (
              <div
                key={v.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-gray-200/60 hover:bg-white hover:shadow-sm transition"
              >
                <div className="w-10 h-10 rounded-full bg-[#017FE6] text-white flex items-center justify-center font-semibold">
                  {v.initials}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-gray-800">{v.name}</p>
                  <p className="text-sm text-gray-600">{v.type}</p>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 bg-green-200 text-green-800 rounded-lg hover:bg-green-300 transition">
                    ✓
                  </button>
                  <button className="p-2 bg-red-200 text-red-700 rounded-lg hover:bg-red-300 transition">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* BOTTOM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RECENT BOOKINGS */}
        <Panel className="lg:col-span-2">
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              Recent Bookings
            </h2>

            <button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("navigate", { detail: "Bookings" }))
              }
              className="text-sm text-[#017FE6] font-medium hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {recentBookings.map(b => (
              <div
                key={b.id}
                className="flex items-center justify-between bg-gray-200/60 rounded-xl p-4 hover:bg-white hover:shadow-sm transition"
              >
                <div>
                  <p className="font-medium text-gray-800">{b.vehicle}</p>
                  <p className="text-xs text-gray-600">{b.days} days</p>
                </div>

                <span
                  className={`px-3 py-1 text-xs rounded-full font-semibold
                    ${
                      b.status === "Pending"
                        ? "bg-amber-200 text-amber-800"
                        : b.status === "Active"
                        ? "bg-green-200 text-green-800"
                        : "bg-teal-200 text-teal-800"
                    }
                  `}
                >
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* SUMMARY */}
        <Panel>
          <h2 className="font-semibold text-gray-800 mb-4">
            System Summary
          </h2>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Vehicles Available</span>
              <span className="font-medium text-gray-800">{statsData.vehicles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Approvals</span>
              <span className="text-amber-700 font-semibold">
                {statsData.pendingBookings}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Users</span>
              <span className="text-green-700 font-semibold">Active</span>
            </div>
          </div>
        </Panel>
      </div>

    </div>
  )
}

/* =====================
   SHARED COMPONENTS
===================== */

function Panel({ children, className = "" }: any) {
  return (
    <div
      className={`bg-white rounded-3xl p-6 border border-gray-200/70 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  )
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string
  value: string | number
  accent: "blue" | "amber" | "emerald" | "indigo"
}) {
  const accentMap: any = {
    blue: "text-[#017FE6]",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
    indigo: "text-indigo-700",
  }

  return (
    <Panel>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${accentMap[accent]}`}>
        {value}
      </p>
    </Panel>
  )
}
