import { useState } from "react";


const ownerStats = {
  myVehicles: 4,
  activeRentals: 2,
  pendingRequests: 1,
  completedRentals: 18,
};

const earningsData = {
  week: "₱6,500",
  month: "₱28,300",
  year: "₱312,900",
};

const bookingRequests = [
  {
    id: "r1",
    renter: "Juan Dela Cruz",
    vehicle: "Toyota Vios 2023",
    days: 2,
  },
];

const myRecentRentals = [
  {
    id: "m1",
    vehicle: "Honda Click 125",
    role: "As Owner",
    status: "Active",
  },
  {
    id: "m2",
    vehicle: "Mitsubishi Mirage",
    role: "As Renter",
    status: "Completed",
  },
];


export default function Dashboard() {
  const [earningsRange, setEarningsRange] = useState("week");

  return (
    <div className="space-y-10 bg-gray-50 min-h-full p-4 border border-black/40 rounded-3xl">

      {/* OWNER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="My Vehicles" value={ownerStats.myVehicles} accent="blue" />
        <StatCard title="Active Rentals" value={ownerStats.activeRentals} accent="emerald" />
        <StatCard title="Pending Requests" value={ownerStats.pendingRequests} accent="amber" />
        <StatCard title="Completed Rentals" value={ownerStats.completedRentals} accent="indigo" />
      </div>

      {/* EARNINGS + REQUESTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* EARNINGS */}
        <Panel className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-gray-800">My Earnings</h2>

            <select
              value={earningsRange}
              onChange={(e) => setEarningsRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div className="h-48 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#017FE6]/15 to-transparent">
            <p className="text-sm text-gray-600 mb-2">
              Earnings ({earningsRange})
            </p>
            <p className="text-4xl font-bold text-[#017FE6]">
              {earningsData[earningsRange]}
            </p>
          </div>
        </Panel>

        {/* BOOKING REQUESTS */}
        <Panel>
          <h2 className="font-semibold text-gray-800 mb-4">
            Booking Requests
          </h2>

          {bookingRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {bookingRequests.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-gray-200/60"
                >
                  <p className="font-medium text-gray-800">{r.renter}</p>
                  <p className="text-sm text-gray-600">
                    {r.vehicle} · {r.days} days
                  </p>

                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 bg-green-200 text-green-800 rounded-lg py-1 hover:bg-green-300">
                      Accept
                    </button>
                    <button className="flex-1 bg-red-200 text-red-700 rounded-lg py-1 hover:bg-red-300">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* RECENT ACTIVITY */}
      <Panel>
        <h2 className="font-semibold text-gray-800 mb-4">
          My Recent Activity
        </h2>

        <div className="space-y-3">
          {myRecentRentals.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between bg-gray-200/60 rounded-xl p-4"
            >
              <div>
                <p className="font-medium text-gray-800">{r.vehicle}</p>
                <p className="text-xs text-gray-600">{r.role}</p>
              </div>

              <span className="px-3 py-1 text-xs rounded-full font-semibold bg-blue-200 text-blue-800">
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}



function Panel({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-3xl p-6 border border-gray-200/70 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ title, value, accent }) {
  const accentMap = {
    blue: "text-[#017FE6]",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
    indigo: "text-indigo-700",
  };

  return (
    <Panel>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${accentMap[accent]}`}>
        {value}
      </p>
    </Panel>
  );
}
