import React, { useMemo, useState } from "react";

type BookingStatus = "pending" | "active" | "completed" | "cancelled";
type PaymentStatus = "pending" | "downpayment" | "full";

type Booking = {
  id: string;
  bookingId: string;
  vehicleName: string;
  vehicleIcon?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerInitials: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  days: number;
  totalAmount: number;
  downpayment: number;
  balance: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  driver: boolean;
};

const seed: Booking[] = [
  {
    id: "bk1",
    bookingId: "#BK-2024-001",
    vehicleName: "Toyota Camry",
    vehicleIcon: "🚗",
    customerId: "u1",
    customerName: "John Smith",
    customerEmail: "john.smith@email.com",
    customerInitials: "JS",
    pickupDate: "Jan 15, 2024",
    pickupTime: "10:00 AM",
    returnDate: "Jan 18, 2024",
    returnTime: "10:00 AM",
    days: 3,
    totalAmount: 470,
    downpayment: 141,
    balance: 329,
    paymentStatus: "downpayment",
    status: "active",
    driver: false,
  },
  {
    id: "bk2",
    bookingId: "#BK-2024-002",
    vehicleName: "Honda CBR600RR",
    vehicleIcon: "🏍️",
    customerId: "u2",
    customerName: "Mike Johnson",
    customerEmail: "mike.johnson@email.com",
    customerInitials: "MJ",
    pickupDate: "Jan 16, 2024",
    pickupTime: "2:00 PM",
    returnDate: "Jan 17, 2024",
    returnTime: "2:00 PM",
    days: 1,
    totalAmount: 260,
    downpayment: 0,
    balance: 260,
    paymentStatus: "pending",
    status: "pending",
    driver: false,
  },
  {
    id: "bk3",
    bookingId: "#BK-2024-003",
    vehicleName: "Mercedes Sprinter",
    vehicleIcon: "🚐",
    customerId: "u3",
    customerName: "Sarah Wilson",
    customerEmail: "sarah.wilson@email.com",
    customerInitials: "SW",
    pickupDate: "Jan 10, 2024",
    pickupTime: "9:00 AM",
    returnDate: "Jan 15, 2024",
    returnTime: "9:00 AM",
    days: 5,
    totalAmount: 875,
    downpayment: 875,
    balance: 0,
    paymentStatus: "full",
    status: "completed",
    driver: true,
  },
  {
    id: "bk4",
    bookingId: "#BK-2024-004",
    vehicleName: "BMW X5",
    vehicleIcon: "🚙",
    customerId: "u4",
    customerName: "Emily Davis",
    customerEmail: "emily.davis@email.com",
    customerInitials: "ED",
    pickupDate: "Jan 20, 2024",
    pickupTime: "11:00 AM",
    returnDate: "Jan 22, 2024",
    returnTime: "11:00 AM",
    days: 2,
    totalAmount: 520,
    downpayment: 156,
    balance: 364,
    paymentStatus: "downpayment",
    status: "active",
    driver: true,
  },
];

function pill(status: BookingStatus) {
  if (status === "active") return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  if (status === "pending") return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  if (status === "completed") return "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200";
  return "bg-red-100 text-red-700 ring-1 ring-red-200";
}

function payMeta(ps: PaymentStatus) {
  if (ps === "pending") return { label: "Pending Payment", cls: "text-amber-400" };
  if (ps === "downpayment") return { label: "Downpayment Paid", cls: "text-emerald-400" };
  return { label: "Fully Paid", cls: "text-emerald-400" };
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "amber" | "emerald" | "indigo" | "red";
}) {
  const iconWrap =
    tone === "amber"
      ? "bg-amber-500/15 border-amber-500/25 text-amber-300"
      : tone === "emerald"
      ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-300"
      : tone === "indigo"
      ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-300"
      : "bg-red-500/15 border-red-500/25 text-red-300";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition">
      <div className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl border ${iconWrap} flex items-center justify-center`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
{value}</p>
          <p className="text-sm text-gray-500 -mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

/** ✅ Custom dropdown so options ALWAYS show like HTML */
function StatusDropdown({
  value,
  onChange,
}: {
  value: "" | BookingStatus;
  onChange: (v: "" | BookingStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  const label =
    value === ""
      ? "All Status"
      : value === "pending"
      ? "Pending"
      : value === "active"
      ? "Active"
      : value === "completed"
      ? "Completed"
      : "Cancelled";

  const items: { key: "" | BookingStatus; label: string }[] = [
    { key: "", label: "All Status" },
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="h-10 px-4 pr-10 rounded-xl 
bg-gray-50 
border border-gray-300 
text-gray-700 text-sm 
shadow-[0_2px_6px_rgba(0,0,0,0.06)] 
hover:bg-gray-100 
focus:ring-2 focus:ring-indigo-500/20 
focus:border-indigo-400"

      >
        {label}
        <svg className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
         <div className="absolute right-0 mt-2 z-40 w-44 rounded-xl 
bg-gray-50 
border border-gray-300 
shadow-[0_12px_30px_rgba(0,0,0,0.15)] 
overflow-hidden">

            {items.map((it) => {
              const active = it.key === value;
              return (
                <button
                  key={it.label}
                  onClick={() => {
                    onChange(it.key);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    active
  ? "bg-indigo-100 text-indigo-700"
  : "text-gray-700 hover:bg-gray-100"

                  }`}
                >
                  {it.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>(seed);
  const [statusFilter, setStatusFilter] = useState<"" | BookingStatus>("");
  const [dateText, setDateText] = useState("03/23/32313"); // matches your screenshot style

  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = useMemo(() => bookings.find((b) => b.id === detailId) || null, [bookings, detailId]);

  const counts = useMemo(() => {
    const base = { pending: 0, active: 0, completed: 0, cancelled: 0 } as Record<BookingStatus, number>;
    bookings.forEach((b) => base[b.status]++);
    return base;
  }, [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const okStatus = statusFilter ? b.status === statusFilter : true;
      const okDate = dateText ? true : true; // keep same behavior as HTML (display-only)
      return okStatus && okDate;
    });
  }, [bookings, statusFilter, dateText]);

  // ✅ actions like html
  const approveBooking = (id: string) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "active" } : b)));
  };
  const completeBooking = (id: string) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "completed" } : b)));
    setDetailId(null);
  };
  const cancelBooking = (id: string) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
    setDetailId(null);
  };

  return (
    <div className="p-6 bg-gradient-to-b from-gray-50 to-gray-100 min-h-full">
      {/* STAT CARDS (like screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Pending"
          value={counts.pending}
          tone="amber"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />
        <StatCard
          label="Active"
          value={counts.active}
          tone="emerald"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M20 12a8 8 0 11-16 0 8 8 0 0116 0z" stroke="currentColor" strokeWidth="2" />
              <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={counts.completed}
          tone="indigo"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />
        <StatCard
          label="Cancelled"
          value={counts.cancelled}
          tone="red"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* TABLE CARD */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">All Bookings</h2>

          <div className="flex items-center gap-3">
            {/* ✅ dropdown like html */}
            <StatusDropdown value={statusFilter} onChange={setStatusFilter} />

            {/* date field like screenshot */}
            <div className="relative">
              <input
                value={dateText}
                onChange={(e) => setDateText(e.target.value)}
                className="h-10 w-[160px] rounded-xl bg-gray-50 
border border-gray-300 
text-gray-700 
shadow-[0_2px_6px_rgba(0,0,0,0.08)] 
focus:ring-2 focus:ring-indigo-500/20
 text-sm px-4 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M7 3v2M17 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6 5h12a2 2 0 012 2v13a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full">
            <thead>
<tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                <Th>Booking ID</Th>
                <Th>Customer</Th>
                <Th>Vehicle</Th>
                <Th>Pickup</Th>
                <Th>Return</Th>
                <Th>Payment</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((b) => {
                const pay = payMeta(b.paymentStatus);
                return (
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition">
                    <Td>
                      <span className="font-mono text-indigo-300">{b.bookingId}</span>
                    </Td>

                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                          {b.customerInitials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{b.customerName}</p>
                          <p className="text-xs text-gray-500">{b.customerEmail}</p>
                        </div>
                      </div>
                    </Td>

                    <Td className="text-sm text-gray-900">{b.vehicleName}</Td>

                    <Td>
                      <div>
                        <p className="text-sm text-gray-900">{b.pickupDate}</p>
                        <p className="text-xs text-gray-500">{b.pickupTime}</p>
                      </div>
                    </Td>

                    <Td>
                      <div>
                        <p className="text-sm text-gray-900">{b.returnDate}</p>
                        <p className="text-xs text-gray-500">{b.returnTime}</p>
                      </div>
                    </Td>

                    <Td>
                      <div>
                        <p className="text-sm font-medium text-gray-900">${b.totalAmount.toFixed(2)}</p>
                        <p className={`text-xs ${pay.cls}`}>{pay.label}</p>
                      </div>
                    </Td>

                    <Td>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${pill(b.status)}`}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </Td>

                    <Td>
                      <div className="flex items-center gap-2">
                        {/* ✅ Eye icon opens modal */}
                        <button
                          onClick={() => setDetailId(b.id)}
                          className="w-9 h-9 
  flex items-center justify-center 
  rounded-xl 
  border border-gray-300 
  bg-gray-50 
  hover:bg-gray-100 
  shadow-[0_2px_6px_rgba(0,0,0,0.1)] 
  transition"

                          title="View Details"
                        >
                          <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </button>

                        {/* ✅ approve only pending */}
                        {b.status === "pending" && (
                          <button
                            onClick={() => approveBooking(b.id)}
                            className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition flex items-center justify-center"
                            title="Approve"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}

                        {/* ✅ complete only active */}
                        {b.status === "active" && (
                          <button
                            onClick={() => completeBooking(b.id)}
                            className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition flex items-center justify-center"
                            title="Complete"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}

                        {/* ✅ cancel not completed/cancelled */}
                        {b.status !== "completed" && b.status !== "cancelled" && (
                          <button
                            onClick={() => cancelBooking(b.id)}
                            className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/20 text-red-300 hover:bg-red-500/30 transition flex items-center justify-center"
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4" />
      </div>

      {/* ✅ Floating modal like HTML */}
      {detail && (
        <>
          <button className="fixed inset-0 z-40 bg-black/50" onClick={() => setDetailId(null)} />
          <div className="fixed z-50 inset-0 flex items-center justify-center px-4">
            <div
  className="w-full max-w-2xl rounded-2xl 
  border border-gray-200 
  bg-gradient-to-b from-white to-gray-50 
  shadow-[0_25px_60px_rgba(0,0,0,0.18)] 
  overflow-hidden"
>

              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
  <p className="font-semibold text-gray-900 tracking-tight">
    Booking Details
  </p>


                {/* ✅ X works */}
                <button
                  onClick={() => setDetailId(null)}
                  className="w-9 h-9 rounded-xl 
bg-gray-100 
border border-gray-300 
hover:bg-gray-200 
text-gray-600 
transition 
flex items-center justify-center"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl 
bg-gradient-to-r from-indigo-50 to-purple-50 
border border-gray-200">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-3xl">
                    {detail.vehicleIcon || "🚗"}
                  </div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">{detail.vehicleName}</p>
                    <p className="text-gray-500">Booking ID: {detail.bookingId}</p>
                  </div>
                  <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${pill(detail.status)}`}>
                    {detail.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InfoBox title="Customer" lines={[detail.customerName, detail.customerEmail]} />
                  <InfoBox title="Pickup" lines={[detail.pickupDate, detail.pickupTime]} />
                  <InfoBox title="Return" lines={[detail.returnDate, detail.returnTime]} />
                  <InfoBox
                    title="Payment"
                    lines={[
                      `$${detail.totalAmount.toFixed(2)}`,
                      payMeta(detail.paymentStatus).label,
                      `Downpayment: $${detail.downpayment.toFixed(2)}`,
                      `Balance: $${detail.balance.toFixed(2)}`,
                    ]}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  {detail.status === "active" && (
                    <button
                      onClick={() => completeBooking(detail.id)}
                      className="flex-1 py-3 bg-green-50 text-green-600 border border-green-200 hover:bg-red-100 rounded-xl font-medium transition"

                    >
                      Mark Complete
                    </button>
                  )}
                  {detail.status !== "completed" && detail.status !== "cancelled" && (
                    <button
                      onClick={() => cancelBooking(detail.id)}
                      className="flex-1 py-3 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-xl font-medium transition"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-xs font-medium text-gray-500 px-6 py-4">
{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-4 align-middle">{children}</td>;
}

function InfoBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="p-4 rounded-xl 
bg-white 
border border-gray-200 
shadow-sm">

      <p className="text-sm text-gray-500 mb-1">{title}</p>
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? "font-medium text-gray-900" : "text-sm text-gray-400"}>
          {l}
        </p>
      ))}
    </div>
  );
}
