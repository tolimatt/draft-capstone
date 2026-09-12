import { useMemo, useState } from "react";
import {
  Activity,
  CalendarCheck2,
  CalendarDays,
  Car,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Gauge,
  ScrollText,
  UserRound,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, StatusBadge } from "../components/AdminUI";

const bookingColors = ["#f59e0b", "#0b75e7", "#16a34a", "#e11d48", "#64748b"];
const tooltipStyle = {
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  boxShadow: "0 18px 40px rgba(15,23,42,.12)",
};

export default function DashboardView({ vehicles, customers, documents, bookings = [], alerts = [], period, onSelect }) {
  const platformCustomers = customers.filter((customer) => customer.role !== "Admin");
  const renters = platformCustomers.filter((customer) => customer.role === "Renter").length;
  const operators = platformCustomers.filter((customer) => customer.role === "Operator").length;
  const available = vehicles.filter((vehicle) => vehicle.status === "Available").length;
  const unavailable = vehicles.length - available;
  const activeRentals = bookings.filter((booking) => booking.isActive).length;
  const overdueRentals = bookings.filter((booking) => booking.isOverdue).length;
  const pendingDocuments = documents.filter((document) => document.approval === "Pending").length;
  const periodBookings = bookings.filter((booking) => dateMonthKey(booking.pickupAt || booking.createdAt) === period);
  const calendarBookings = bookings.filter((booking) => [booking.pickupAt, booking.returnAt].some((value) => dateMonthKey(value) === period));

  const bookingData = ["Pending", "Confirmed", "Completed", "Cancelled", "Rejected"].map((status) => ({
    status,
    count: periodBookings.filter((booking) => booking.status === status).length,
  }));
  const activityData = buildActivityData(period, bookings);
  const recentBookings = [...bookings]
    .sort((first, second) => dateTime(second.createdAt) - dateTime(first.createdAt))
    .slice(0, 7);
  const fleetReadiness = percentage(available, vehicles.length);
  const activeShare = percentage(activeRentals, bookings.length);
  const reviewShare = percentage(pendingDocuments, documents.length);
  const overdueShare = percentage(overdueRentals, activeRentals || bookings.length);

  return (
    <div className="space-y-5">
      <section aria-label="Priority platform statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard label="Active rentals" value={activeRentals} helper={`${activeRentals} of ${bookings.length} total bookings are currently active`} status={activeRentals ? "In progress" : "No active rentals"} progress={activeShare} progressLabel="Share of all bookings" actionLabel="View active rentals" onAction={() => onSelect("bookings", { status: "Active" })} icon={CalendarCheck2} tone="green" />
        <DashboardKpiCard label="Overdue returns" value={overdueRentals} helper={overdueRentals ? "These returns require immediate follow-up" : "Every active rental is within its return window"} status={overdueRentals ? "Action required" : "All clear"} progress={overdueShare} progressLabel="Share of active rentals" actionLabel="Inspect overdue returns" onAction={() => onSelect("bookings", { status: "Overdue" })} icon={Clock3} tone={overdueRentals ? "red" : "green"} />
        <DashboardKpiCard label="Pending reviews" value={pendingDocuments} helper={`${documents.length - pendingDocuments} of ${documents.length} documents are already resolved`} status={pendingDocuments ? "Review queue" : "Queue cleared"} progress={reviewShare} progressLabel="Share awaiting review" actionLabel="Review documents" onAction={() => onSelect("documents", { status: "Pending Review" })} icon={FileCheck2} tone={pendingDocuments ? "amber" : "blue"} />
        <DashboardKpiCard label="Fleet readiness" value={`${fleetReadiness}%`} helper={`${available} available and ${unavailable} unavailable vehicles`} status={fleetReadiness >= 75 ? "Healthy capacity" : "Capacity check"} progress={fleetReadiness} progressLabel="Vehicles ready to rent" actionLabel="Manage fleet" onAction={() => onSelect("vehicles")} icon={Gauge} tone={fleetReadiness >= 75 ? "blue" : "amber"} />
      </section>

      <PlatformSnapshot renters={renters} operators={operators} vehicles={vehicles.length} onSelect={onSelect} />

      <section aria-label="Platform operational overview" className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,.7fr)]">
        <BookingActivityCard activityData={activityData} bookingData={bookingData} period={period} scheduledCount={periodBookings.length} onViewBookings={() => onSelect("bookings")} />
        <ActionCenter alerts={alerts} pendingDocuments={pendingDocuments} overdueRentals={overdueRentals} unavailable={unavailable} onSelect={onSelect} />
      </section>

      <OperationsWorkspace bookings={bookings} calendarBookings={calendarBookings} period={period} recentBookings={recentBookings} onSelect={onSelect} />
    </div>
  );
}

function PlatformSnapshot({ renters, operators, vehicles, onSelect }) {
  const stats = [
    { label: "Renters", value: renters, icon: Users, view: "customers", context: { role: "Renter" } },
    { label: "Operators", value: operators, icon: UserRound, view: "customers", context: { role: "Operator" } },
    { label: "Registered vehicles", value: vehicles, icon: Car, view: "vehicles", context: {} },
  ];

  return (
    <section aria-label="Platform network snapshot" className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_20px_rgba(33,33,33,0.035)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(230px,.7fr)_minmax(0,1.3fr)] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-blue-600"><Activity size={16} /><span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Platform network</span></div>
          <h2 className="mt-2 text-lg font-bold tracking-[-0.025em] text-slate-900">Your marketplace at a glance</h2>
          <p className="mt-1.5 max-w-lg text-xs leading-5 text-slate-500">Jump directly to the people and fleet records that keep RentifyPro operating.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, view, context }) => (
            <button key={label} type="button" onClick={() => onSelect(view, context)} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-inset ring-slate-200"><Icon size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[28px] font-extrabold tracking-[-0.04em] text-slate-900">{value}</span><span className="block truncate text-[11px] font-medium text-slate-500">{label}</span></span>
              <ChevronRight size={15} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingActivityCard({ activityData, bookingData, period, scheduledCount, onViewBookings }) {
  const totalPickups = activityData.reduce((total, day) => total + day.pickups, 0);
  const totalReturns = activityData.reduce((total, day) => total + day.returns, 0);

  return (
    <DashboardCard title="Rental activity" description={`${periodLabel(period)} pickup and return schedule across the platform.`} headerActionLabel="View bookings" onHeaderAction={onViewBookings}>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <ChartSummary label="Scheduled" value={scheduledCount} tone="blue" />
        <ChartSummary label="Pickups" value={totalPickups} tone="blue" />
        <ChartSummary label="Returns" value={totalReturns} tone="emerald" />
      </div>
      <div className="mt-3 h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activityData} margin={{ top: 16, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="pickupGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0b75e7" stopOpacity={0.24} /><stop offset="95%" stopColor="#0b75e7" stopOpacity={0} /></linearGradient>
              <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid stroke="#e9eef5" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="day" interval="preserveStartEnd" minTickGap={28} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `${periodLabel(period)} · day ${label}`} formatter={(value, name) => [value, name === "pickups" ? "Pickups" : "Returns"]} />
            <Area type="monotone" dataKey="pickups" stroke="#0b75e7" strokeWidth={2.25} fill="url(#pickupGradient)" activeDot={{ r: 4, strokeWidth: 2 }} isAnimationActive={false} />
            <Area type="monotone" dataKey="returns" stroke="#10b981" strokeWidth={2.25} fill="url(#returnGradient)" activeDot={{ r: 4, strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Status distribution</p><p className="text-[11px] text-slate-400">Selected pickup month</p></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {bookingData.map((item, index) => (
            <div key={item.status} className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: bookingColors[index] }} /><span className="truncate text-[10px] font-semibold text-slate-500">{item.status}</span></div>
              <p className="mt-1 text-lg font-bold text-slate-900">{item.count}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

function ChartSummary({ label, value, tone }) {
  const dots = { blue: "bg-blue-500", emerald: "bg-emerald-500" };
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 sm:px-4">
      <p className="flex items-center gap-2 text-[10px] font-semibold text-slate-500"><span className={`h-2 w-2 rounded-full ${dots[tone]}`} />{label}</p>
      <p className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950">{value}</p>
    </div>
  );
}

function ActionCenter({ alerts, pendingDocuments, overdueRentals, unavailable, onSelect }) {
  const [filter, setFilter] = useState("all");
  const filters = [
    { id: "all", label: "All" },
    { id: "critical", label: "Urgent" },
    { id: "warning", label: "Attention" },
    { id: "info", label: "Routine" },
  ];
  const visibleAlerts = filter === "all" ? alerts : alerts.filter((alert) => alert.severity === filter);
  const countFor = (id) => id === "all" ? alerts.length : alerts.filter((alert) => alert.severity === id).length;
  const quickActions = [
    { label: "Review documents", detail: `${pendingDocuments} pending`, icon: FileCheck2, view: "documents", context: { status: "Pending Review" }, tone: "bg-amber-50 text-amber-700" },
    { label: "Overdue returns", detail: `${overdueRentals} overdue`, icon: Clock3, view: "bookings", context: { status: "Overdue" }, tone: "bg-rose-50 text-rose-700" },
    { label: "Fleet availability", detail: `${unavailable} unavailable`, icon: Car, view: "vehicles", context: {}, tone: "bg-blue-50 text-blue-700" },
    { label: "Audit activity", detail: "Open logs", icon: ScrollText, view: "audit", context: {}, tone: "bg-blue-50 text-blue-700" },
  ];

  return (
    <DashboardCard title="Action center" description="Prioritized work generated from live platform conditions." className="xl:sticky xl:top-[116px]">
      <div role="tablist" aria-label="Filter operational alerts" className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
        {filters.map((item) => {
          const selected = filter === item.id;
          return <button key={item.id} type="button" role="tab" aria-selected={selected} onClick={() => setFilter(item.id)} className={`rounded-lg px-1 py-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><span>{item.label}</span><span className={`ml-1 rounded-full px-1.5 py-0.5 ${selected ? "bg-blue-50 text-blue-700" : "bg-slate-200/80 text-slate-500"}`}>{countFor(item.id)}</span></button>;
        })}
      </div>
      <div className="mt-3 min-h-[212px] overflow-hidden rounded-xl border border-slate-200">
        {visibleAlerts.length ? <div className="divide-y divide-slate-100">{visibleAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} onSelect={onSelect} />)}</div> : (
          <div className="flex min-h-[212px] flex-col items-center justify-center px-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={21} /></span>
            <p className="mt-3 text-sm font-bold text-slate-900">Nothing in this queue</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">No {filter === "all" ? "operational alerts" : `${filter} alerts`} require attention.</p>
          </div>
        )}
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">Quick actions</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {quickActions.map(({ label, detail, icon: Icon, view, context, tone }) => (
            <button key={label} type="button" onClick={() => onSelect(view, context)} className="group rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon size={16} /></span><span className="mt-2.5 block text-xs font-bold text-slate-900 group-hover:text-blue-700">{label}</span><span className="mt-0.5 block text-[10px] text-slate-500">{detail}</span>
            </button>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

function AlertRow({ alert, onSelect }) {
  const critical = alert.severity === "critical";
  const warning = alert.severity === "warning";
  const theme = critical
    ? { icon: "bg-rose-50 text-rose-600", badge: "bg-rose-100 text-rose-700", label: "Urgent" }
    : warning
      ? { icon: "bg-amber-50 text-amber-600", badge: "bg-amber-100 text-amber-700", label: "Attention" }
      : { icon: "bg-blue-50 text-blue-600", badge: "bg-blue-100 text-blue-700", label: "Routine" };

  return (
    <button type="button" onClick={() => onSelect(alert.view, alert.context || {})} className="group flex w-full items-start gap-3 px-3.5 py-3.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-100">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}><AlertTriangle size={17} /></span>
      <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-xs font-bold text-slate-900">{alert.title}</span><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${theme.badge}`}>{theme.label}</span></span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{alert.description}</span></span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-700"><span>{alert.count}</span><ChevronRight size={14} className="text-slate-400 transition group-hover:translate-x-0.5" /></span>
    </button>
  );
}

function OperationsWorkspace({ bookings, calendarBookings, period, recentBookings, onSelect }) {
  const [activeTab, setActiveTab] = useState("today");
  const tabs = [
    { id: "today", label: "Today", icon: Clock3 },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "recent", label: "Recent bookings", icon: CalendarCheck2 },
  ];

  return (
    <section aria-label="Operations workspace">
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist" aria-label="Operations workspace views">
        {tabs.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={selected} onClick={() => setActiveTab(id)} className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${selected ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>
              <Icon size={16} />{label}
            </button>
          );
        })}
      </div>
      <div className="mt-3" role="tabpanel">
        {activeTab === "today" ? <TodayOperations bookings={bookings} onSelect={onSelect} /> : null}
        {activeTab === "calendar" ? <OperationsCalendar bookings={calendarBookings} period={period} /> : null}
        {activeTab === "recent" ? <RecentBookings bookings={recentBookings} onSelect={onSelect} /> : null}
      </div>
    </section>
  );
}

function TodayOperations({ bookings, onSelect }) {
  const schedule = buildSchedule(bookings, dateKey(new Date()));
  const pickups = schedule.filter((item) => item.event === "Pickup").length;
  const returns = schedule.filter((item) => item.event !== "Pickup").length;
  const overdue = bookings.filter((booking) => booking.isOverdue).length;

  return (
    <DashboardCard title="Today's operations" description="Live pickup, return, and overdue workload for the current day." headerActionLabel="View all bookings" onHeaderAction={() => onSelect("bookings")}>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <TodaySummary label="Pickups today" value={pickups} tone="bg-blue-50 text-blue-700" />
        <TodaySummary label="Returns today" value={returns} tone="bg-emerald-50 text-emerald-700" />
        <TodaySummary label="Overdue now" value={overdue} tone={overdue ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-700"} />
      </div>
      {schedule.length ? (
        <ul className="mt-4 grid gap-2 lg:grid-cols-2">
          {schedule.slice(0, 8).map(({ booking, event, tone }, index) => (
            <li key={`${booking.id}-${event}-${index}`}>
              <button type="button" onClick={() => onSelect("bookings", booking.isOverdue ? { status: "Overdue" } : {})} className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{event}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900">{booking.vehicle}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{booking.renter} · #{booking.reference}</span></span><ChevronRight size={15} className="text-slate-400 transition group-hover:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60"><EmptyState icon={CalendarCheck2} title="No pickups or returns today" description="Use the Calendar tab to review activity for another date." /></div>}
    </DashboardCard>
  );
}

function TodaySummary({ label, value, tone }) {
  return <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${tone}`}><span className="text-xs font-semibold">{label}</span><strong className="text-xl tracking-[-0.03em]">{value}</strong></div>;
}

function RecentBookings({ bookings, onSelect }) {
  return (
    <DashboardCard title="Recent bookings" description="The seven most recently created platform bookings." headerActionLabel="View all bookings" onHeaderAction={() => onSelect("bookings")}>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[820px] border-collapse">
          <caption className="sr-only">Recent RentifyPro booking operations</caption>
          <thead className="bg-slate-50"><tr>{["Booking", "Renter", "Vehicle", "Operator", "Pickup", "Return", "Status"].map((heading) => <th key={heading} scope="col" className="border-b border-slate-200 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {bookings.map((booking) => (
              <tr key={booking.id} className="transition hover:bg-blue-50/30">
                <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-blue-700">#{booking.reference}</td><td className="px-4 py-3 text-xs font-semibold text-slate-900">{booking.renter}</td><td className="px-4 py-3 text-xs text-slate-600">{booking.vehicle}</td><td className="px-4 py-3 text-xs text-slate-600">{booking.operator}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600"><time dateTime={booking.pickupAt}>{formatShortDate(booking.pickupAt)}</time></td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600"><time dateTime={booking.returnAt}>{formatShortDate(booking.returnAt)}</time></td><td className="px-4 py-3"><StatusBadge value={booking.isOverdue ? "Overdue" : booking.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!bookings.length ? <EmptyState icon={CalendarCheck2} title="No bookings found" description="New platform bookings will appear here." /> : null}
      </div>
    </DashboardCard>
  );
}

function OperationsCalendar({ bookings, period }) {
  const defaultDate = period === dateMonthKey(new Date()) ? dateKey(new Date()) : `${period}-01`;
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const visibleSelectedDate = selectedDate.startsWith(`${period}-`) ? selectedDate : defaultDate;
  const days = useMemo(() => buildCalendarDays(period), [period]);

  const schedule = buildSchedule(bookings, visibleSelectedDate);

  return (
    <DashboardCard title="Platform Rental Calendar" description={`${periodLabel(period)} pickups, returns, and overdue activity.`}>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 pb-3 text-xs font-medium text-slate-600">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Pickup</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Return</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Overdue</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-7 bg-slate-50">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="border-b border-slate-200 px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{day}</div>)}</div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const pickupCount = bookings.filter((booking) => dateKey(booking.pickupAt) === day.key).length;
            const returnBookings = bookings.filter((booking) => dateKey(booking.returnAt) === day.key);
            const overdueCount = returnBookings.filter((booking) => booking.isOverdue).length;
            const returnCount = returnBookings.length - overdueCount;
            const selected = visibleSelectedDate === day.key;
            return (
              <button key={day.key} type="button" onClick={() => setSelectedDate(day.key)} className={`relative min-h-14 border-b border-r border-slate-100 p-2 text-left transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-100 sm:min-h-16 ${day.inPeriod ? "bg-white" : "bg-slate-50/70"} ${selected ? "ring-2 ring-inset ring-blue-500" : "hover:bg-blue-50/30"}`}>
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${selected ? "bg-blue-600 text-white" : day.inPeriod ? "text-slate-800" : "text-slate-400"}`}>{day.day}</span>
                <span className="mt-1 flex flex-wrap gap-1" aria-label={`${pickupCount} pickups, ${returnCount} returns, ${overdueCount} overdue returns`}>
                  {pickupCount ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : null}
                  {returnCount ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : null}
                  {overdueCount ? <span className="h-2 w-2 rounded-full bg-rose-500" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">Schedule for {formatLongDate(visibleSelectedDate)}</p>
          <span className="text-xs font-semibold text-slate-500">{schedule.length} {schedule.length === 1 ? "event" : "events"}</span>
        </div>
        {schedule.length ? (
          <ul className="mt-2 space-y-2">
            {schedule.slice(0, 4).map(({ booking, event, tone }, index) => (
              <li key={`${booking.id}-${event}-${index}`} className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-xs ring-1 ring-inset ring-slate-200">
                <span className={`rounded-full px-2.5 py-1 font-semibold ${tone}`}>{event}</span>
                <strong className="text-slate-900">{booking.vehicle}</strong>
                <span className="text-slate-500">{booking.renter}</span>
                <span className="ml-auto text-slate-500">#{booking.reference}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-xs text-slate-500">No pickups or returns are scheduled for this date.</p>}
      </div>
    </DashboardCard>
  );
}

export function DashboardKpiCard({ label, value, helper, status, progress, progressLabel, actionLabel, onAction, icon: Icon, tone }) {
  const tones = {
    blue: { icon: "bg-blue-50 text-blue-700", badge: "bg-blue-50 text-blue-700" },
    green: { icon: "bg-emerald-50 text-emerald-700", badge: "bg-emerald-50 text-emerald-700" },
    amber: { icon: "bg-amber-50 text-amber-700", badge: "bg-amber-50 text-amber-700" },
    red: { icon: "bg-rose-50 text-rose-700", badge: "bg-rose-50 text-rose-700" },
  };
  const theme = tones[tone] || tones.blue;

  return (
    <button type="button" onClick={onAction} aria-label={`${actionLabel}. ${label}: ${value}. ${status}.`} className="group min-h-[128px] min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_6px_20px_rgba(33,33,33,0.035)] transition duration-200 hover:border-blue-200 hover:shadow-[0_10px_26px_rgba(33,33,33,0.055)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${theme.icon}`}><Icon size={16} strokeWidth={1.9} aria-hidden="true" /></span>
          <span className="truncate text-[11px] font-semibold text-slate-600">{label}</span>
        </span>
        <ChevronRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true" />
      </span>
      <span className="mt-3 flex items-center gap-2.5">
        <strong className="truncate text-[30px] font-extrabold leading-none tracking-[-0.045em] text-slate-900">{value}</strong>
        <span title={progressLabel} className={`shrink-0 rounded-md px-1.5 py-1 text-[9px] font-semibold tabular-nums ${theme.badge}`}>{progress}%</span>
      </span>
      <span className="mt-2 block truncate text-[9px] font-normal text-slate-400" title={helper}>{helper}</span>
    </button>
  );
}

function DashboardCard({ title, description, children, footerLabel, onFooterClick, headerActionLabel, onHeaderAction, className = "" }) {
  return (
    <article className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_20px_rgba(33,33,33,0.035)] sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-bold tracking-[-0.01em] text-slate-900">{title}</h2>{description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}</div>
        {headerActionLabel ? <button type="button" onClick={onHeaderAction} className="group mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><span>{headerActionLabel}</span><ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></button> : null}
      </div>
      {children}
      {footerLabel ? <button type="button" onClick={onFooterClick} className="mt-4 flex w-full items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><span>{footerLabel}</span><ChevronRight size={17} /></button> : null}
    </article>
  );
}

function buildActivityData(period, bookings) {
  const [year, month] = String(period).split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  if (!year || !month || Number.isNaN(daysInMonth)) return [];

  const data = Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, pickups: 0, returns: 0 }));
  bookings.forEach((booking) => {
    const pickupKey = dateKey(booking.pickupAt);
    const returnKey = dateKey(booking.returnAt);
    if (pickupKey.startsWith(`${period}-`)) data[Number(pickupKey.slice(-2)) - 1].pickups += 1;
    if (returnKey.startsWith(`${period}-`)) data[Number(returnKey.slice(-2)) - 1].returns += 1;
  });
  return data;
}

function buildSchedule(bookings, selectedDate) {
  return bookings.flatMap((booking) => {
    const entries = [];
    if (dateKey(booking.pickupAt) === selectedDate) entries.push({ booking, event: "Pickup", tone: "bg-blue-50 text-blue-700" });
    if (dateKey(booking.returnAt) === selectedDate) entries.push({ booking, event: booking.isOverdue ? "Overdue return" : "Return", tone: booking.isOverdue ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700" });
    return entries;
  });
}

function percentage(value, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function buildCalendarDays(period) {
  const [year, month] = String(period).split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  if (Number.isNaN(firstDay.getTime())) return [];
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month - 1, 1 - leadingDays);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { key: dateKey(date), day: date.getDate(), inPeriod: dateMonthKey(date) === period };
  });
}

function dateKey(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMonthKey(value) {
  return dateKey(value).slice(0, 7);
}

function validDate(value) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

function dateTime(value) {
  return validDate(value) ? new Date(value).getTime() : 0;
}

function periodLabel(value) {
  const [year, month] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(value) {
  if (!validDate(value)) return "—";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatLongDate(value) {
  if (!validDate(value)) return "selected date";
  return new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}
