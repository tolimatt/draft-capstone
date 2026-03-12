import { useMemo, useState } from "react";
import {
  Car,
  CheckSquare,
  Clock3,
  DollarSign,
  Download,
  LayoutDashboard,
  LogOut,
  Pencil,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
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
  { label: "Active Customers", value: "18", icon: Users, note: "12 users, 6 owners" },
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
  { name: "Owners", active: 6, fill: "#0891b2" },
];

const customers = [
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
    role: "Owner",
    status: "Active",
    created: "2025-12-19",
  },
  {
    name: "RentifyPro Admin",
    email: "adminsicharlie@gmail.com",
    phone: "0919 555 0101",
    role: "Admin",
    status: "Active",
    created: "2026-03-12",
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
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      {value}
    </span>
  );
}

export default function AdminAccountPage({ user, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const displayName = user?.name || "Admin";
  const displayEmail = user?.email || "adminsicharlie@gmail.com";

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        !search ||
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "All" || customer.role === roleFilter;
      const matchesStatus = statusFilter === "All" || customer.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [search, roleFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_28%,#f3f6fb_100%)] p-3 sm:p-4">
      <div className="min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[28px] border border-slate-200 bg-[#f8fbff] shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="grid min-h-[calc(100vh-1.5rem)] lg:grid-cols-[280px_minmax(0,1fr)]">
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
                    {activeView === "customers" ? "Customer Management" : "Dashboard Overview"}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600">
                    {activeView === "customers"
                      ? "Manage users, owners, and admin records with clearer filters and faster actions."
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
                      Active Owners
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
                              Active Owners
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
                </>
              )}

              {activeView === "customers" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,2fr)_220px_220px]">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Search
                        </span>
                        <div className="relative">
                          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by name or email..."
                            className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Role
                        </span>
                        <select
                          value={roleFilter}
                          onChange={(event) => setRoleFilter(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                        >
                          <option>All</option>
                          <option>User</option>
                          <option>Owner</option>
                          <option>Admin</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Status
                        </span>
                        <select
                          value={statusFilter}
                          onChange={(event) => setStatusFilter(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#017FE6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                        >
                          <option>All</option>
                          <option>Active</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#017FE6] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(1,127,230,0.24)] transition hover:bg-[#0165B8]">
                        <UserPlus size={18} />
                        Add Customer
                      </button>
                      <button className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        <Download size={18} />
                        Export
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Phone</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Created</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredCustomers.map((customer) => (
                          <tr key={`${customer.email}-${customer.created}`} className="hover:bg-slate-50">
                            <td className="px-5 py-4 text-sm font-semibold text-slate-900">{customer.name}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{customer.email}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{customer.phone}</td>
                            <td className="px-5 py-4 text-sm font-medium text-slate-700">{customer.role}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">
                              <StatusPill value={customer.status} />
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700">{customer.created}</td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-2">
                                <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                  <Pencil size={14} />
                                  Edit
                                </button>
                                <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                  <RotateCcw size={14} />
                                  Reset
                                </button>
                                <button className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                                  <Trash2 size={14} />
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
                <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <h3 className="text-2xl font-bold text-slate-900">Vehicle Management</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Placeholder admin panel section for vehicle management.
                  </p>
                </section>
              )}

              {activeView === "bookings" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <h3 className="text-2xl font-bold text-slate-900">Booking Approval</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Placeholder admin panel section for booking approval.
                  </p>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
