import { Car, Eye, Gauge, MapPin, SlidersHorizontal, Tags, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import VehicleImage from "../components/VehicleImage";
import { presentVehicle } from "../vehiclePresentation";
import { percentage } from "../adminAnalytics";
import { AnalyticsPanel, DistributionList, MetricTile, ProgressRing } from "../components/AdminAnalytics";
import { EmptyState, FilterSelect, SearchField, StatCard, StatusBadge, TableFooter } from "../components/AdminUI";

export default function VehiclesView({ vehicles: sourceVehicles, onView }) {
  const vehicles = useMemo(() => sourceVehicles.map(presentVehicle), [sourceVehicles]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [type, setType] = useState("All Types");
  const [category, setCategory] = useState("All Categories");
  const [moreFilters, setMoreFilters] = useState(false);
  const types = [...new Set(vehicles.map((vehicle) => vehicle.type).filter(Boolean))];
  const categories = [...new Set(vehicles.map((vehicle) => vehicle.category).filter(Boolean))];
  const available = vehicles.filter((vehicle) => vehicle.status === "Available").length;
  const unavailable = vehicles.length - available;
  const readiness = percentage(available, vehicles.length);
  const typeDistribution = types.map((vehicleType, index) => ({ label: vehicleType, value: vehicles.filter((vehicle) => vehicle.type === vehicleType).length, tone: ["blue", "emerald", "violet", "amber"][index % 4] }));
  const topLocations = countValues(vehicles.map((vehicle) => vehicle.location)).slice(0, 4);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesSearch = !query || [vehicle.name, vehicle.plateNumber, vehicle.operator, vehicle.location].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = status === "All Statuses" || vehicle.status === status;
      const matchesType = type === "All Types" || vehicle.type === type;
      const matchesCategory = category === "All Categories" || vehicle.category === category;
      return matchesSearch && matchesStatus && matchesType && matchesCategory;
    });
  }, [category, search, status, type, vehicles]);

  return (
    <div className="space-y-5">
      <section aria-label="Vehicle statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Vehicles" value={vehicles.length} description="All registered vehicles" icon={Car} />
        <StatCard label="Available" value={available} description="Ready for booking" icon={Car} tone="green" />
        <StatCard label="Unavailable" value={unavailable} description="Not currently rental-ready" icon={Wrench} tone="amber" />
        <StatCard label="Vehicle Types" value={types.length} description="Fleet classifications" icon={Tags} tone="slate" />
      </section>

      <section aria-label="Fleet health overview" className="grid gap-5 xl:grid-cols-[minmax(330px,.72fr)_minmax(0,1.28fr)]">
        <AnalyticsPanel eyebrow="Fleet health monitor" title="Rental readiness" description="The share of registered vehicles currently ready to accept bookings." icon={Gauge}>
          <ProgressRing value={readiness} label="Ready" detail={`${available} available and ${unavailable} unavailable vehicle${vehicles.length === 1 ? "" : "s"}.`} tone={readiness >= 75 ? "emerald" : readiness >= 50 ? "amber" : "rose"} />
          <div className="mt-5 grid grid-cols-2 gap-2"><MetricTile label="Ready to rent" value={available} tone="emerald" /><MetricTile label="Needs attention" value={unavailable} tone={unavailable ? "amber" : "slate"} /></div>
        </AnalyticsPanel>
        <AnalyticsPanel eyebrow="Fleet composition" title="Vehicle types and operating areas" description="Understand how the marketplace fleet is distributed across classifications and locations." icon={Tags}>
          <div className="grid gap-6 md:grid-cols-2 md:divide-x md:divide-slate-100">
            <div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Vehicle type mix</p><DistributionList items={typeDistribution} emptyLabel="Vehicle classifications will appear here." /></div>
            <div className="md:pl-6"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Top operating locations</p>{topLocations.length ? <div className="space-y-2.5">{topLocations.map(({ label, value }) => <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-inset ring-slate-100"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><MapPin size={15} /></span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{label}</span><strong className="text-sm text-slate-950">{value}</strong></div>)}</div> : <p className="flex min-h-36 items-center justify-center text-sm text-slate-500">Vehicle locations will appear here.</p>}</div>
          </div>
        </AnalyticsPanel>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_20px_rgba(33,33,33,0.035)]">
        <div className="grid gap-4 border-b border-slate-200 p-4 lg:grid-cols-[minmax(280px,1.6fr)_220px_220px_auto] lg:items-end">
          <SearchField value={search} onChange={setSearch} placeholder="Search by vehicle, plate number, operator, or location..." />
          <FilterSelect value={status} onChange={setStatus} options={["All Statuses", "Available", "Unavailable"]} />
          <FilterSelect value={type} onChange={setType} options={["All Types", ...types]} />
          <button type="button" aria-expanded={moreFilters} onClick={() => setMoreFilters((current) => !current)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><SlidersHorizontal size={17} />More Filters</button>
        </div>
        {moreFilters ? <div className="border-b border-slate-200 bg-slate-50/60 p-4"><div className="max-w-xs"><FilterSelect label="Category" value={category} onChange={setCategory} options={["All Categories", ...categories]} /></div></div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <caption className="sr-only">Registered RentifyPro vehicles</caption>
            <thead className="bg-slate-50"><tr>{["Vehicle", "Plate No.", "Category", "Operator", "Location", "Rental Rate", "Status", "Actions"].map((heading) => <th key={heading} scope="col" className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((vehicle) => (
                <tr key={vehicle.id || vehicle.plateNumber} className="transition-colors hover:bg-blue-50/30">
                  <td className="px-4 py-3.5"><div className="flex min-w-[250px] items-center gap-3"><VehicleImage vehicle={vehicle} className="w-20" thumbnail /><div><p className="text-sm font-semibold text-slate-950">{vehicle.name}</p><p className="mt-1 text-xs text-slate-500">{vehicle.type} <span aria-hidden="true">•</span> {vehicle.seats} seats <span aria-hidden="true">•</span> {vehicle.transmission}</p><p className="mt-0.5 text-xs text-slate-500">{vehicle.fuel}</p></div></div></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">{vehicle.plateNumber}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{vehicle.category}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{vehicle.operator}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{vehicle.location}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm font-semibold text-slate-800">{vehicle.rentalRate}</td>
                  <td className="px-4 py-3.5"><StatusBadge value={vehicle.status} /></td>
                  <td className="px-4 py-3.5"><button type="button" onClick={() => onView(vehicle)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><Eye size={14} />View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <EmptyState icon={Car} title={vehicles.length ? "No vehicles found" : "No vehicles have been registered yet"} description={vehicles.length ? "Try changing your search or filters." : "Registered vehicles will appear here."} /> : null}
        </div>
        <TableFooter visible={filtered.length} total={vehicles.length} noun="vehicles" />
      </section>
    </div>
  );
}

function countValues(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((first, second) => second.value - first.value);
}
