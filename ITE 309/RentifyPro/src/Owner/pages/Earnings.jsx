import React, { useMemo } from "react";
const completedBookings = [
  {
    id: "BKG-1003",
    vehicle: "Mitsubishi Mirage",
    date: "2026-02-22",
    rentalFee: 10000,
    paymentMethod: "Full",
    blockchainTx: "0x8fa3...ab21",
  },
  {
    id: "BKG-1004",
    vehicle: "Toyota Camry 2024",
    date: "2026-03-05",
    rentalFee: 30000,
    paymentMethod: "Downpayment",
    blockchainTx: "0x91c2...ff09",
  },
];

const PLATFORM_FEE_RATE = 0.10; 

export default function Earnings() {
  const summary = useMemo(() => {
    const gross = completedBookings.reduce(
      (sum, b) => sum + b.rentalFee,
      0
    );
    const platformFee = gross * PLATFORM_FEE_RATE;
    const net = gross - platformFee;

    return { gross, platformFee, net };
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="text-sm text-gray-600">
          Track your revenue and platform deductions
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Gross Revenue" value={`₱${summary.gross}`} />
        <StatCard
          label="Platform Fee (10%)"
          value={`₱${summary.platformFee}`}
        />
        <StatCard
          label="Net Earnings"
          value={`₱${summary.net}`}
          highlight
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Booking ID</th>
              <th className="px-4 py-3 text-left">Vehicle</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Gross</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Blockchain</th>
            </tr>
          </thead>

          <tbody>
            {completedBookings.map((b) => {
              const fee = b.rentalFee * PLATFORM_FEE_RATE;
              const net = b.rentalFee - fee;

              return (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{b.id}</td>
                  <td className="px-4 py-3">{b.vehicle}</td>
                  <td className="px-4 py-3 text-center">
                    {b.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-center">
                    ₱{b.rentalFee}
                  </td>
                  <td className="px-4 py-3 text-center text-red-600">
                    ₱{fee}
                  </td>
                  <td className="px-4 py-3 text-center text-green-600 font-semibold">
                    ₱{net}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href="#"
                      className="text-blue-600 underline text-xs"
                    >
                      View Tx
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div
      className={`rounded-2xl p-5 border ${
        highlight
          ? "bg-green-50 border-green-200"
          : "bg-white"
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
