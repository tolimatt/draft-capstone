export default function Analytics() {
  const earningsByMonth = [
    { month: "Jan", amount: 45000 },
    { month: "Feb", amount: 62000 },
    { month: "Mar", amount: 58000 },
    { month: "Apr", amount: 71000 },
  ];

  const bookingsByMonth = [
    { month: "Jan", count: 20 },
    { month: "Feb", count: 30 },
    { month: "Mar", count: 28 },
    { month: "Apr", count: 35 },
  ];

  const bookingStatus = [
    { name: "Pending", value: 12, color: "bg-yellow-400" },
    { name: "Active", value: 8, color: "bg-blue-500" },
    { name: "Completed", value: 45, color: "bg-green-500" },
    { name: "Cancelled", value: 5, color: "bg-red-500" },
  ];

  const maxEarnings = Math.max(...earningsByMonth.map(e => e.amount));
  const maxBookings = Math.max(...bookingsByMonth.map(b => b.count));
  const totalStatus = bookingStatus.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics Overview</h1>

      {/* METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric title="Total Bookings" value="70" />
        <Metric title="Active Rentals" value="8" />
        <Metric title="Monthly Earnings" value="₱71,000" />
        <Metric title="Utilization Rate" value="82%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BAR CHART */}
        <Card title="Monthly Earnings">
          <div className="flex items-end gap-4 h-48">
            {earningsByMonth.map((item) => (
              <div key={item.month} className="flex-1 text-center">
                <div
                  className="bg-blue-500 rounded-md mx-auto"
                  style={{
                    height: `${(item.amount / maxEarnings) * 100}%`,
                  }}
                />
                <p className="mt-2 text-sm">{item.month}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* STATUS */}
        <Card title="Booking Status">
          <div className="space-y-3">
            {bookingStatus.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{s.name}</span>
                  <span>{s.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${s.color} h-3 rounded-full`}
                    style={{
                      width: `${(s.value / totalStatus) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* LINE STYLE */}
        <Card title="Bookings Trend">
          <div className="space-y-3">
            {bookingsByMonth.map((b) => (
              <div key={b.month}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{b.month}</span>
                  <span>{b.count}</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(b.count / maxBookings) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="bg-white rounded-xl p-4 border">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl p-4 border">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
