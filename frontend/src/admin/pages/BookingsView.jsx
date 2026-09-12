import { Activity, CalendarCheck2, CalendarDays, Clock3, Eye, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { AnalyticsPanel, DistributionList, MetricTile, TrendBars } from "../components/AdminAnalytics";
import { EmptyState, FilterSelect, SearchField, StatCard, StatusBadge, TableFooter } from "../components/AdminUI";

export default function BookingsView({ bookings, initialStatus = "All Statuses", onView }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const active = bookings.filter((booking) => booking.isActive).length;
  const overdue = bookings.filter((booking) => booking.isOverdue).length;
  const completed = bookings.filter((booking) => booking.status === "Completed").length;
  const bookingTrend = useMemo(() => buildBookingTrend(bookings), [bookings]);
  const upcoming = useMemo(() => bookings
    .filter((booking) => !["Cancelled", "Rejected", "Completed"].includes(booking.status) && validDate(booking.pickupAt) >= startOfToday())
    .sort((first, second) => validDate(first.pickupAt) - validDate(second.pickupAt))
    .slice(0, 5), [bookings]);
  const statusDistribution = [
    { label: "Pending", value: bookings.filter((booking) => booking.status === "Pending").length, tone: "amber" },
    { label: "Confirmed / active", value: bookings.filter((booking) => booking.status === "Confirmed" || booking.isActive).length, tone: "blue" },
    { label: "Completed", value: completed, tone: "emerald" },
    { label: "Cancelled / rejected", value: bookings.filter((booking) => ["Cancelled", "Rejected"].includes(booking.status)).length, tone: "rose" },
  ];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const displayStatus = booking.isOverdue ? "Overdue" : booking.isActive ? "Active" : booking.status;
      const matchesSearch = !query || [booking.reference, booking.renter, booking.vehicle, booking.operator].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = status === "All Statuses" || displayStatus === status;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, status]);

  return (
    <div className="space-y-5">
      <section aria-label="Booking operations statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Bookings" value={bookings.length} description="All platform booking records" icon={CalendarCheck2} />
        <StatCard label="Active Rentals" value={active} description="Currently in progress" icon={CalendarCheck2} tone="green" />
        <StatCard label="Overdue Returns" value={overdue} description="Require operational follow-up" icon={Clock3} tone="red" />
        <StatCard label="Completed" value={completed} description="Successfully completed rentals" icon={UserRoundCheck} tone="slate" />
      </section>

      <section aria-label="Booking activity insights" className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <AnalyticsPanel eyebrow="Booking tracker" title="Rental demand and status flow" description="Six-month booking volume with the current operational status mix." icon={Activity}>
          <TrendBars data={bookingTrend} primaryLabel="Bookings" />
          <div className="mt-5 border-t border-slate-100 pt-5"><DistributionList items={statusDistribution} /></div>
        </AnalyticsPanel>
        <AnalyticsPanel eyebrow="Upcoming schedule" title="Next pickups" description="The nearest confirmed or pending rentals that need operational readiness." icon={CalendarDays}>
          {upcoming.length ? <div className="space-y-2.5">{upcoming.map((booking) => (
            <button key={booking.id} type="button" onClick={() => onView(booking)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
              <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700"><strong className="text-sm leading-none">{dayNumber(booking.pickupAt)}</strong><span className="mt-0.5 text-[8px] font-bold uppercase">{monthShort(booking.pickupAt)}</span></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900">{booking.vehicle}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">#{booking.reference} · {booking.renter}</span></span>
              <StatusBadge value={booking.status} />
            </button>
          ))}</div> : <div className="grid min-h-48 place-items-center text-center"><div><CalendarCheck2 className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-semibold text-slate-700">No upcoming pickups</p><p className="mt-1 text-xs text-slate-500">New confirmed rentals will appear here.</p></div></div>}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4"><MetricTile label="Active now" value={active} tone="emerald" /><MetricTile label="Overdue" value={overdue} tone={overdue ? "rose" : "slate"} /></div>
        </AnalyticsPanel>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_20px_rgba(33,33,33,0.035)]">
        <div className="grid gap-4 border-b border-slate-200 p-4 lg:grid-cols-[minmax(280px,1fr)_220px_auto] lg:items-end">
          <SearchField label="Search Bookings" value={search} onChange={setSearch} placeholder="Search by booking, renter, vehicle, or operator..." />
          <FilterSelect label="Operational Status" value={status} onChange={setStatus} options={["All Statuses", "Active", "Pending", "Confirmed", "Completed", "Cancelled", "Rejected", "Overdue"]} />
          <button type="button" onClick={() => { setSearch(""); setStatus("All Statuses"); }} className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Clear Filters</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] border-collapse">
            <caption className="sr-only">RentifyPro booking operations without financial information</caption>
            <thead className="bg-slate-50">
              <tr>{["Booking", "Renter", "Vehicle", "Operator", "Pickup", "Return", "Driver", "Status", "Actions"].map((heading) => <th key={heading} scope="col" className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((booking) => (
                <tr key={booking.id} className="transition-colors hover:bg-blue-50/30">
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm font-bold text-blue-700">#{booking.reference}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-slate-950">{booking.renter}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{booking.vehicle}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{booking.operator}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600"><time dateTime={booking.pickupAt}>{formatDateTime(booking.pickupAt)}</time></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600"><time dateTime={booking.returnAt}>{formatDateTime(booking.returnAt)}</time></td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{booking.driverSelected ? "Selected" : "Not selected"}</td>
                  <td className="px-4 py-3.5"><StatusBadge value={booking.isOverdue ? "Overdue" : booking.isActive ? "Active" : booking.status} /></td>
                  <td className="px-4 py-3.5"><button type="button" onClick={() => onView(booking)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><Eye size={14} />View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <EmptyState icon={CalendarCheck2} title="No bookings found" description="Try changing your search or status filter." /> : null}
        </div>
        <TableFooter visible={filtered.length} total={bookings.length} noun="bookings" />
      </section>
    </div>
  );
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function buildBookingTrend(bookings) {
  const months = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({ key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: date.toLocaleDateString("en-PH", { month: "short" }), value: 0 });
  }
  const byKey = new Map(months.map((month) => [month.key, month]));
  bookings.forEach((booking) => {
    const date = validDate(booking.createdAt || booking.pickupAt);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (byKey.has(key)) byKey.get(key).value += 1;
  });
  return months;
}

function validDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayNumber(value) { return validDate(value)?.getDate() || "—"; }
function monthShort(value) { return validDate(value)?.toLocaleDateString("en-PH", { month: "short" }) || ""; }
