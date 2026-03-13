import { useMemo, useState } from "react";
import {
  Car,
  CheckSquare,
  Clock3,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const summaryCards = [
  { label: "Total Vehicles", value: "25", icon: Car },
  { label: "Active Customers", value: "18", icon: Users, note: "12 users, 6 operators" },
  { label: "Pending Bookings", value: "2", icon: Clock3 },
  { label: "Total Revenue", value: "PHP 48,500", icon: DollarSign },
];

const vehicleAvailabilityData = [
  { type: "Bus", available: 6, fill: "#1d4ed8" },
  { type: "Truck", available: 4, fill: "#2563eb" },
  { type: "Car", available: 10, fill: "#3b82f6" },
  { type: "Motorcycle", available: 5, fill: "#60a5fa" },
];

const bookingTrendData = [
  { day: "Fri", bookings: 2 },
  { day: "Sat", bookings: 5 },
  { day: "Sun", bookings: 4 },
  { day: "Mon", bookings: 6 },
  { day: "Tue", bookings: 3 },
  { day: "Wed", bookings: 7 },
  { day: "Thu", bookings: 5 },
];

const customerActivityData = [
  { name: "Users", active: 12, fill: "#0f766e" },
  { name: "Operators", active: 6, fill: "#0891b2" },
];

const initialCustomers = [
  {
    name: "Charles Toliao",
    email: "toliaochar23@gmail.com",
    phone: "0912 889 4401",
    role: "User",
    status: "Active",
    created: "2025-11-01",
  },
  {
    name: "Charles Mathew Toliao",
    email: "chde.toliao.up@phinmaed.com",
    phone: "0917 221 8831",
    role: "User",
    status: "Active",
    created: "2025-11-04",
  },
  {
    name: "Mark Napao",
    email: "mark.napao.up@phinmaed.com",
    phone: "0915 102 7732",
    role: "User",
    status: "Active",
    created: "2025-11-04",
  },
  {
    name: "Lexiee Perds",
    email: "alaq.perdigon.up@phinmaed.com",
    phone: "0918 300 1142",
    role: "Operator",
    status: "Active",
    created: "2025-12-19",
  },
];

const vehicles = [
  {
    name: "Toyota Vios 1.3 XLE",
    image: "/toyota-camry.png",
    plateNumber: "NCR-4821",
    type: "Car",
    category: "Sedan",
    seats: 5,
    transmission: "Automatic",
    fuel: "Gasoline",
    location: "Quezon City",
    operator: "Lexiee Perds",
    dailyRate: "PHP 1,800",
    driverOption: "Optional",
    status: "Available",
  },
  {
    name: "Mitsubishi L300",
    image: "/van.png",
    plateNumber: "TKU-1107",
    type: "Van",
    category: "Utility Van",
    seats: 12,
    transmission: "Manual",
    fuel: "Diesel",
    location: "Manila",
    operator: "Lexiee Perds",
    dailyRate: "PHP 3,200",
    driverOption: "Included",
    status: "Unavailable",
  },
  {
    name: "Honda Click 125i",
    image: "/yamaha-r3.png",
    plateNumber: "MCY-7742",
    type: "Motorcycle",
    category: "Scooter",
    seats: 2,
    transmission: "Automatic",
    fuel: "Gasoline",
    location: "Caloocan",
    operator: "Mark Napao",
    dailyRate: "PHP 700",
    driverOption: "None",
    status: "Available",
  },
  {
    name: "Isuzu Traviz",
    image: "/isuzu-truck.png",
    plateNumber: "TRK-9824",
    type: "Truck",
    category: "Light Truck",
    seats: 3,
    transmission: "Manual",
    fuel: "Diesel",
    location: "Pasig",
    operator: "Charles Toliao",
    dailyRate: "PHP 4,500",
    driverOption: "Optional",
    status: "Unavailable",
  },
  {
    name: "Toyota Hiace Commuter",
    image: "/toyota-hiAce.png",
    plateNumber: "VAN-5603",
    type: "Van",
    category: "Passenger Van",
    seats: 14,
    transmission: "Manual",
    fuel: "Diesel",
    location: "Makati",
    operator: "Charles Mathew Toliao",
    dailyRate: "PHP 5,800",
    driverOption: "Included",
    status: "Available",
  },
];

const initialCustomerDocuments = [
  {
    customer: "Lexiee Perds",
    role: "Operator",
    document: "DTI Permit",
    fileName: "lexiee-perds-dti.pdf",
    submitted: "2026-03-12",
    approval: "Approved",
  },
  {
    customer: "Charles Toliao",
    role: "Renter",
    document: "Government ID",
    fileName: "charles-toliao-id.jpg",
    submitted: "2026-03-11",
    approval: "Pending",
  },
  {
    customer: "Charles Mathew Toliao",
    role: "Renter",
    document: "Government ID",
    fileName: "charles-mathew-id.jpg",
    submitted: "2026-03-10",
    approval: "Approved",
  },
  {
    customer: "Mark Napao",
    role: "Operator",
    document: "DTI Permit",
    fileName: "mark-napao-dti.pdf",
    submitted: "2026-03-09",
    approval: "Pending",
  },
];

const initialBookingApprovals = [
  {
    bookingId: "690ede61a806a1abccba6828",
    user: "Charles Toliao",
    vehicle: "Toyota Hiace Commuter",
    start: "2025-11-08",
    end: "2025-11-09",
    status: "Pending",
    approval: "Pending",
    paymentLabel: "Xendit",
    paymentStatus: "Paid",
    paymentLink: "Open Invoice",
    validIdLabel: "View ID",
  },
  {
    bookingId: "690975c11745db80246d21c9",
    user: "Mark Napao",
    vehicle: "Toyota Vios 1.3 XLE",
    start: "2025-11-04",
    end: "2025-11-07",
    status: "Confirmed",
    approval: "Approved",
    paymentLabel: "Xendit",
    paymentStatus: "Paid",
    paymentLink: "Open Invoice",
    validIdLabel: "View ID",
  },
  {
    bookingId: "690964fc1745db80246d21bb",
    user: "Mark Napao",
    vehicle: "Isuzu Traviz",
    start: "2025-11-04",
    end: "2025-11-05",
    status: "Cancelled",
    approval: "Rejected",
    paymentLabel: "Cash",
    paymentStatus: "COD",
    paymentLink: "Open Details",
    validIdLabel: "View ID",
  },
  {
    bookingId: "690964dd1745db80246d21b9",
    user: "Charles Mathew Toliao",
    vehicle: "Honda Click 125i",
    start: "2025-11-04",
    end: "2025-11-05",
    status: "Pending",
    approval: "Pending",
    paymentLabel: "Xendit",
    paymentStatus: "Partial",
    paymentLink: "Open Invoice",
    validIdLabel: "View ID",
  },
];

const tooltipStyle = {
  borderRadius: 16,
  border: "1px solid #dbe4f0",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
};

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "vehicles", label: "Vehicle Management", icon: Car },
  { id: "customers", label: "Customer Management", icon: Users },
  { id: "documents", label: "Customer Documents", icon: ShieldCheck },
  { id: "bookings", label: "Booking Approval", icon: CheckSquare },
];

function SummaryCard({ label, value, note, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#017FE6]">
          <Icon size={21} />
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-900">{value}</p>
          {note ? <p className="mt-1 text-xs text-slate-600">{note}</p> : null}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-900">{title}</h3>
      <div className="mt-4 h-[280px]">{children}</div>
    </section>
  );
}

function StatusPill({ value }) {
  const normalizedValue = String(value || "").toLowerCase();
  const styles =
    normalizedValue === "available" || normalizedValue === "active" || normalizedValue === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : normalizedValue === "confirmed" || normalizedValue === "paid"
        ? "bg-blue-50 text-blue-700"
      : normalizedValue === "unavailable" || normalizedValue === "pending"
        ? "bg-amber-50 text-amber-700"
        : normalizedValue === "partial"
          ? "bg-orange-50 text-orange-700"
        : normalizedValue === "rejected"
          ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-3.5 py-1.5 text-sm font-semibold ${styles}`}>
      {value}
    </span>
  );
}

export default function AdminAccountPage({ user, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [customerSearch, setCustomerSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("All");
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState("All");
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState("All");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingApprovalFilter, setBookingApprovalFilter] = useState("All");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerDocuments, setCustomerDocuments] = useState(initialCustomerDocuments);
  const [bookingApprovals, setBookingApprovals] = useState(initialBookingApprovals);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [viewerItem, setViewerItem] = useState(null);

  const displayName = user?.name || "Admin";
  const displayEmail = user?.email || "adminsicharlie@gmail.com";

  const dashboardQueueData = useMemo(
    () => [
      {
        title: "Pending Bookings",
        value: String(bookingApprovals.filter((booking) => booking.status === "Pending").length),
        detail: "Bookings with status pending should be checked first so renters get a response quickly.",
      },
      {
        title: "Payment Verification",
        value: String(
          bookingApprovals.filter((booking) => ["Partial", "COD"].includes(booking.paymentStatus)).length
        ),
        detail: "Bookings with incomplete or offline payment handling still need admin attention.",
      },
      {
        title: "Pending Documents",
        value: String(customerDocuments.filter((document) => document.approval === "Pending").length),
        detail: "Renter IDs and operator DTI permits with pending approval still need admin review.",
      },
      {
        title: "Unavailable Fleet Units",
        value: String(vehicles.filter((vehicle) => vehicle.status === "Unavailable").length),
        detail: "Vehicles marked unavailable can affect booking fulfillment and should be checked by admin.",
      },
    ],
    [bookingApprovals, customerDocuments]
  );

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        !customerSearch ||
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email.toLowerCase().includes(customerSearch.toLowerCase());
      const matchesRole = roleFilter === "All" || customer.role === roleFilter;
      const matchesStatus = statusFilter === "All" || customer.status === statusFilter;
      const isAdminRecord =
        customer.role === "Admin" || customer.email.toLowerCase() === displayEmail.toLowerCase();
      return !isAdminRecord && matchesSearch && matchesRole && matchesStatus;
    });
  }, [customerSearch, displayEmail, roleFilter, statusFilter]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const query = vehicleSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        vehicle.name.toLowerCase().includes(query) ||
        vehicle.plateNumber.toLowerCase().includes(query) ||
        vehicle.type.toLowerCase().includes(query) ||
        vehicle.category.toLowerCase().includes(query) ||
        vehicle.location.toLowerCase().includes(query) ||
        vehicle.operator.toLowerCase().includes(query);
      const matchesType = vehicleTypeFilter === "All" || vehicle.type === vehicleTypeFilter;
      const matchesCategory =
        vehicleCategoryFilter === "All" || vehicle.category === vehicleCategoryFilter;
      const matchesStatus = vehicleStatusFilter === "All" || vehicle.status === vehicleStatusFilter;
      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });
  }, [vehicleCategoryFilter, vehicleSearch, vehicleStatusFilter, vehicleTypeFilter]);

  const filteredBookings = useMemo(() => {
    return bookingApprovals.filter((booking) => {
      const query = bookingSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        booking.bookingId.toLowerCase().includes(query) ||
        booking.user.toLowerCase().includes(query) ||
        booking.vehicle.toLowerCase().includes(query);
      const matchesApproval =
        bookingApprovalFilter === "All" || booking.approval === bookingApprovalFilter;
      const matchesStatus = bookingStatusFilter === "All" || booking.status === bookingStatusFilter;
      return matchesSearch && matchesApproval && matchesStatus;
    });
  }, [bookingApprovalFilter, bookingSearch, bookingStatusFilter]);

  const showFeedback = (message) => {
    setFeedbackMessage(message);
    window.setTimeout(() => {
      setFeedbackMessage((current) => (current === message ? "" : current));
    }, 2600);
  };

  const handleCustomerDelete = (email) => {
    setCustomers((current) => current.filter((customer) => customer.email !== email));
    showFeedback("Customer removed from the admin list.");
  };

  const handleDocumentApproval = (fileName, approval) => {
    setCustomerDocuments((current) =>
      current.map((document) =>
        document.fileName === fileName ? { ...document, approval } : document
      )
    );
    showFeedback(`Document marked as ${approval.toLowerCase()}.`);
  };

  const handleBookingApprovalAction = (bookingId, approval) => {
    setBookingApprovals((current) =>
      current.map((booking) =>
        booking.bookingId === bookingId
          ? {
              ...booking,
              approval,
              status:
                approval === "Approved"
                  ? booking.status === "Pending"
                    ? "Confirmed"
                    : booking.status
                  : "Cancelled",
            }
          : booking
      )
    );
    showFeedback(`Booking ${approval.toLowerCase()} successfully.`);
  };

  const openViewer = (type, title, subtitle) => {
    setViewerItem({ type, title, subtitle });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_28%,#f3f6fb_100%)] p-3 sm:p-4">
      {feedbackMessage ? (
        <div className="fixed right-4 top-4 z-50 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)]">
          {feedbackMessage}
        </div>
      ) : null}

      {viewerItem ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]" onClick={() => setViewerItem(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#017FE6]">
                    {viewerItem.type}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">{viewerItem.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{viewerItem.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewerItem(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-base font-semibold text-slate-900">Frontend preview only</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This modal confirms the clicked item and can be connected to a real file viewer later.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#f8fbff] shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="grid lg:min-h-[calc(100vh-1.5rem)] lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-[#0f172a] lg:border-b-0 lg:border-r">
            <div className="flex h-full flex-col">
              <div className="border-b border-white/10 px-6 py-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#017FE6] text-white shadow-[0_10px_24px_rgba(1,127,230,0.30)]">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-[-0.03em] text-white">RentifyPro</h1>
                    <p className="text-sm text-slate-300">Admin Control Panel</p>
                  </div>
                </div>
              </div>

              <div className="border-b border-white/10 px-6 py-5">
                <p className="text-base font-semibold text-white">{displayName}</p>
                <p className="mt-1 text-sm text-slate-300">{displayEmail}</p>
              </div>

              <nav className="flex-1 px-4 py-5">
                <div className="space-y-2">
                  {navigationItems.map(({ id, label, icon: Icon }) => {
                    const isActive = activeView === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveView(id)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-medium transition ${
                          isActive
                            ? "bg-[#017FE6] text-white shadow-[0_12px_24px_rgba(1,127,230,0.24)]"
                            : "text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        <Icon size={20} />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className="border-t border-white/10 px-4 py-4">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-medium text-slate-200 transition hover:bg-white/10"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <header className="border-b border-slate-200 bg-white/85 px-5 py-6 backdrop-blur sm:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#017FE6]">
                    RentifyPro Administration
                  </p>
                  <h2 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-slate-950">
                    {activeView === "customers"
                      ? "Customer Management"
                      : activeView === "vehicles"
                        ? "Vehicle Management"
                        : activeView === "documents"
                          ? "Customer Documents"
                        : activeView === "bookings"
                          ? "Booking Approval"
                          : "Dashboard Overview"}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600">
                    {activeView === "customers"
                      ? "Manage users and operators with clearer filters, larger text, and faster review actions."
                      : activeView === "vehicles"
                        ? "Review fleet listings, inspect vehicle details, and filter inventory by type and status."
                        : activeView === "documents"
                          ? "Review operator DTI permits, renter IDs, and approval status in one admin-only frontend view."
                        : activeView === "bookings"
                          ? "Monitor booking approvals and handle reservation issues before they affect customers."
                          : "Track vehicles, customer activity, pending bookings, and platform performance in one view."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Active Users
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">12</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Active Operators
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">6</p>
                  </div>
                </div>
              </div>
            </header>

            <div className="space-y-6 px-5 py-6 sm:px-8">
              {activeView === "dashboard" && (
                <>
                  <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    {summaryCards.map((card) => (
                      <SummaryCard key={card.label} {...card} />
                    ))}
                  </section>

                  <section className="grid gap-6 2xl:grid-cols-3">
                    <Panel title="Available Vehicles by Type">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={vehicleAvailabilityData} barCategoryGap={24}>
                          <CartesianGrid stroke="#e6eef7" vertical={false} />
                          <XAxis dataKey="type" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: "rgba(1,127,230,0.06)" }} contentStyle={tooltipStyle} />
                          <Bar dataKey="available" radius={[10, 10, 0, 0]}>
                            {vehicleAvailabilityData.map((entry) => (
                              <Cell key={entry.type} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Panel>

                    <Panel title="Booked Vehicles Per Day">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={bookingTrendData}>
                          <CartesianGrid stroke="#e6eef7" vertical={false} />
                          <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Line
                            type="monotone"
                            dataKey="bookings"
                            stroke="#017FE6"
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#017FE6" }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Panel>

                    <Panel title="Active Customers by Role">
                      <div className="flex h-full flex-col">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-emerald-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                              Active Users
                            </p>
                            <p className="mt-2 text-3xl font-bold text-slate-900">12</p>
                          </div>
                          <div className="rounded-2xl bg-cyan-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                              Active Operators
                            </p>
                            <p className="mt-2 text-3xl font-bold text-slate-900">6</p>
                          </div>
                        </div>

                        <div className="mt-4 min-h-0 flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={customerActivityData} layout="vertical" margin={{ top: 8, right: 12, left: 6, bottom: 0 }}>
                              <CartesianGrid stroke="#e6eef7" horizontal={false} />
                              <XAxis type="number" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fill: "#475569", fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip contentStyle={tooltipStyle} />
                              <Bar dataKey="active" radius={[0, 10, 10, 0]}>
                                {customerActivityData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </Panel>
                  </section>

                  <section className="grid gap-6 xl:grid-cols-1">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                        Admin Priority Queue
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        A focused list of items that usually need manual admin attention inside the system.
                      </p>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {dashboardQueueData.map((item) => (
                          <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {item.title}
                            </p>
                            <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                              {item.value}
                            </p>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  </section>
                </>
              )}

              {activeView === "customers" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <div className="grid gap-4 pb-6 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Visible Customers
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                        {filteredCustomers.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#017FE6]">
                        Registered Users
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                        {customers.filter((customer) => customer.role === "User").length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-cyan-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
                        Registered Operators
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                        {customers.filter((customer) => customer.role === "Operator").length}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,2fr)_220px_220px]">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Search
                        </span>
                        <div className="relative">
                          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            value={customerSearch}
                            onChange={(event) => setCustomerSearch(event.target.value)}
                            placeholder="Search by name or email..."
                            className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 pl-12 pr-4 text-base text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Role
                        </span>
                        <select
                          value={roleFilter}
                          onChange={(event) => setRoleFilter(event.target.value)}
                          className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                        >
                          <option>All</option>
                          <option>User</option>
                          <option>Operator</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Status
                        </span>
                        <select
                          value={statusFilter}
                          onChange={(event) => setStatusFilter(event.target.value)}
                          className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                        >
                          <option>All</option>
                          <option>Active</option>
                        </select>
                      </label>
                    </div>

                  </div>

                  <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Name</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Email</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Phone</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Role</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Created</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredCustomers.map((customer) => (
                          <tr key={`${customer.email}-${customer.created}`} className="hover:bg-slate-50">
                            <td className="px-5 py-5 text-base font-semibold text-slate-900">{customer.name}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{customer.email}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{customer.phone}</td>
                            <td className="px-5 py-5 text-base font-medium text-slate-700">{customer.role}</td>
                            <td className="px-5 py-5 text-base text-slate-700">
                              <StatusPill value={customer.status} />
                            </td>
                            <td className="px-5 py-5 text-base text-slate-700">{customer.created}</td>
                            <td className="px-5 py-5">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openViewer(
                                      "Customer Profile",
                                      customer.name,
                                      `${customer.role} account using ${customer.email} and ${customer.phone}. Created on ${customer.created}.`
                                    )
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCustomerDelete(customer.email)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeView === "vehicles" && (
                <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Total Fleet Records
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                        {vehicles.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Available Vehicles
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                        {vehicles.filter((vehicle) => vehicle.status === "Available").length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
                        Unavailable Vehicles
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                        {vehicles.filter((vehicle) => vehicle.status === "Unavailable").length}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_220px_220px_220px]">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Search
                      </span>
                      <div className="relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={vehicleSearch}
                          onChange={(event) => setVehicleSearch(event.target.value)}
                          placeholder="Search by vehicle, plate no, operator, or location..."
                          className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 pl-12 pr-4 text-base text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Type
                      </span>
                      <select
                        value={vehicleTypeFilter}
                        onChange={(event) => setVehicleTypeFilter(event.target.value)}
                        className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                      >
                        <option>All</option>
                        <option>Car</option>
                        <option>Van</option>
                        <option>Motorcycle</option>
                        <option>Truck</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Category
                      </span>
                      <select
                        value={vehicleCategoryFilter}
                        onChange={(event) => setVehicleCategoryFilter(event.target.value)}
                        className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                      >
                        <option>All</option>
                        <option>Sedan</option>
                        <option>Utility Van</option>
                        <option>Scooter</option>
                        <option>Light Truck</option>
                        <option>Passenger Van</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Status
                      </span>
                      <select
                        value={vehicleStatusFilter}
                        onChange={(event) => setVehicleStatusFilter(event.target.value)}
                        className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                      >
                        <option>All</option>
                        <option>Available</option>
                        <option>Unavailable</option>
                      </select>
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Image</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Vehicle</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Plate No.</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Type</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Category</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Details</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Location</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Operator</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Rate</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredVehicles.map((vehicle) => (
                          <tr key={vehicle.plateNumber} className="hover:bg-slate-50">
                            <td className="px-5 py-5">
                              <img
                                src={vehicle.image}
                                alt={vehicle.name}
                                className="h-20 w-28 rounded-2xl object-cover shadow-sm"
                              />
                            </td>
                            <td className="px-5 py-5">
                              <div>
                                <p className="text-base font-semibold text-slate-900">{vehicle.name}</p>
                                <p className="mt-1 text-sm text-slate-600">Driver option: {vehicle.driverOption}</p>
                              </div>
                            </td>
                            <td className="px-5 py-5 text-base text-slate-700">{vehicle.plateNumber}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{vehicle.type}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{vehicle.category}</td>
                            <td className="px-5 py-5">
                              <div className="text-sm leading-6 text-slate-700">
                                <p>{vehicle.seats} seats</p>
                                <p>{vehicle.transmission}</p>
                                <p>{vehicle.fuel}</p>
                              </div>
                            </td>
                            <td className="px-5 py-5 text-base text-slate-700">{vehicle.location}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{vehicle.operator}</td>
                            <td className="px-5 py-5 text-base font-medium text-slate-900">{vehicle.dailyRate}</td>
                            <td className="px-5 py-5">
                              <StatusPill value={vehicle.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeView === "documents" && (
                <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Total Documents
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                        {customerDocuments.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Approved
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                        {customerDocuments.filter((document) => document.approval === "Approved").length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
                        Pending Approval
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
                        {customerDocuments.filter((document) => document.approval === "Pending").length}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Customer</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Role</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Document</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">File</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Submitted</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Approval</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {customerDocuments.map((document) => (
                          <tr key={`${document.customer}-${document.document}`} className="hover:bg-slate-50">
                            <td className="px-5 py-5 text-base font-semibold text-slate-900">{document.customer}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{document.role}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{document.document}</td>
                            <td className="px-5 py-5">
                              <button
                                type="button"
                                onClick={() =>
                                  openViewer(
                                    document.document,
                                    document.fileName,
                                    `${document.customer} submitted this ${document.document.toLowerCase()} on ${document.submitted}.`
                                  )
                                }
                                className="text-base font-medium text-[#017FE6] underline-offset-4 hover:underline"
                              >
                                {document.fileName}
                              </button>
                            </td>
                            <td className="px-5 py-5 text-base text-slate-700">{document.submitted}</td>
                            <td className="px-5 py-5">
                              <StatusPill value={document.approval} />
                            </td>
                            <td className="px-5 py-5">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDocumentApproval(document.fileName, "Approved")}
                                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDocumentApproval(document.fileName, "Rejected")}
                                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeView === "bookings" && (
                <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Booking Approval</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Approve or reject recent bookings with status, payment, and ID visibility similar to your reference layout.
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Approve or reject recent bookings</p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_220px_220px]">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Search
                      </span>
                      <div className="relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={bookingSearch}
                          onChange={(event) => setBookingSearch(event.target.value)}
                          placeholder="Search by booking id, user or vehicle..."
                          className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 pl-12 pr-4 text-base text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Approval
                      </span>
                      <select
                        value={bookingApprovalFilter}
                        onChange={(event) => setBookingApprovalFilter(event.target.value)}
                        className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                      >
                        <option>All</option>
                        <option>Pending</option>
                        <option>Approved</option>
                        <option>Rejected</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Status
                      </span>
                      <select
                        value={bookingStatusFilter}
                        onChange={(event) => setBookingStatusFilter(event.target.value)}
                        className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                      >
                        <option>All</option>
                        <option>Pending</option>
                        <option>Confirmed</option>
                        <option>Cancelled</option>
                      </select>
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Booking ID</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">User</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Vehicle</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Start</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">End</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Approval</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Payment</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Valid ID</th>
                          <th className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredBookings.map((booking) => (
                          <tr key={booking.bookingId} className="hover:bg-slate-50">
                            <td className="px-5 py-5 text-base text-slate-800">{booking.bookingId}</td>
                            <td className="px-5 py-5 text-base font-medium text-slate-900">{booking.user}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{booking.vehicle}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{booking.start}</td>
                            <td className="px-5 py-5 text-base text-slate-700">{booking.end}</td>
                            <td className="px-5 py-5">
                              <StatusPill value={booking.status} />
                            </td>
                            <td className="px-5 py-5">
                              <StatusPill value={booking.approval} />
                            </td>
                            <td className="px-5 py-5">
                              <div className="space-y-1 text-sm text-slate-700">
                                <p>{booking.paymentLabel}</p>
                                <div className="flex items-center gap-2">
                                  <StatusPill value={booking.paymentStatus} />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openViewer(
                                        booking.paymentLabel,
                                        booking.paymentLink,
                                        `${booking.user} payment for ${booking.vehicle} is currently marked as ${booking.paymentStatus.toLowerCase()}.`
                                      )
                                    }
                                    className="font-medium text-[#017FE6] underline-offset-4 hover:underline"
                                  >
                                    {booking.paymentLink}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-5">
                              <button
                                type="button"
                                onClick={() =>
                                  openViewer(
                                    "Valid ID",
                                    booking.validIdLabel,
                                    `${booking.user} uploaded a valid ID for booking ${booking.bookingId}.`
                                  )
                                }
                                className="text-base font-medium text-[#017FE6] underline-offset-4 hover:underline"
                              >
                                {booking.validIdLabel}
                              </button>
                            </td>
                            <td className="px-5 py-5">
                              <div className="flex min-w-[130px] flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleBookingApprovalAction(booking.bookingId, "Approved")}
                                  className="inline-flex items-center justify-center rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBookingApprovalAction(booking.bookingId, "Rejected")}
                                  className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
