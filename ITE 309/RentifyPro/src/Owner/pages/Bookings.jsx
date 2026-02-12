import React, { useMemo, useState } from "react";


const initialBookings = [
  {
    id: "BKG-1001",
    renter: "Juan Dela Cruz",
    vehicle: "Toyota Camry 2024",
    pickupDate: "2026-03-01",
    returnDate: "2026-03-05",
    status: "Pending",
    paymentMethod: "Downpayment",
    rentalFee: 30000,
    paidOnline: 9000,
    deposit: 5000,
    insurance: 1500,
  },
  {
    id: "BKG-1002",
    renter: "Maria Santos",
    vehicle: "Honda Click 125",
    pickupDate: "2026-03-02",
    returnDate: "2026-03-04",
    status: "Active",
    paymentMethod: "Full",
    rentalFee: 12000,
    paidOnline: 12000,
    deposit: 3000,
    insurance: 1000,
  },
  {
    id: "BKG-1003",
    renter: "Pedro Reyes",
    vehicle: "Mitsubishi Mirage",
    pickupDate: "2026-02-20",
    returnDate: "2026-02-22",
    status: "Completed",
    paymentMethod: "Full",
    rentalFee: 10000,
    paidOnline: 10000,
    deposit: 3000,
    insurance: 1000,
  },
];


export default function Bookings() {
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  const filteredBookings = useMemo(() => {
    if (filter === "All") return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [filter, bookings]);

  const updateStatus = (id, status) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-600">
          Manage all bookings for your vehicles
        </p>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 flex-wrap">
        {["All", "Pending", "Active", "Cancelled", "Completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border ${
              filter === f
                ? "bg-[#017FE6] text-white border-[#017FE6]"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Booking ID</th>
              <th className="px-4 py-3 text-left">Renter</th>
              <th className="px-4 py-3 text-left">Vehicle</th>
              <th className="px-4 py-3 text-center">Payment</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredBookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-3 font-medium">{b.id}</td>
                <td className="px-4 py-3">{b.renter}</td>
                <td className="px-4 py-3">{b.vehicle}</td>
                <td className="px-4 py-3 text-center">
                  {b.paymentMethod}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={b.status} />
                </td>

                {/* ACTIONS */}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {/* LEFT ACTIONS */}
                    {b.status === "Pending" && (
                      <button
                        onClick={() => updateStatus(b.id, "Active")}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs"
                      >
                        Approve
                      </button>
                    )}

                    {b.status === "Active" && (
                      <button
                        onClick={() => updateStatus(b.id, "Completed")}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs"
                      >
                        Mark Complete
                      </button>
                    )}

                    {/* VIEW ALWAYS LAST */}
                    <button
                      onClick={() => setSelected(b)}
                      className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-100"
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAILS MODAL */}
      {selected && (
        <BookingDetails
          booking={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}


function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-yellow-100 text-yellow-700",
    Active: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function BookingDetails({ booking, onClose }) {
  const remaining =
    booking.rentalFee -
    booking.paidOnline +
    booking.deposit +
    booking.insurance;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white w-full max-w-xl rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Booking Details</h2>

          <Detail label="Renter" value={booking.renter} />
          <Detail label="Vehicle" value={booking.vehicle} />
          <Detail
            label="Dates"
            value={`${booking.pickupDate} → ${booking.returnDate}`}
          />
          <Detail label="Payment Method" value={booking.paymentMethod} />
          <Detail label="Rental Fee" value={`₱${booking.rentalFee}`} />
          <Detail label="Paid Online" value={`₱${booking.paidOnline}`} />
          <Detail label="Deposit" value={`₱${booking.deposit}`} />
          <Detail label="Insurance" value={`₱${booking.insurance}`} />

          {booking.paymentMethod === "Downpayment" && (
            <Detail
              label="To Collect on Pickup"
              value={`₱${remaining}`}
            />
          )}

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between text-sm border-b py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
