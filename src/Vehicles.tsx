import React, { useEffect, useMemo, useState } from "react";

type VehicleStatus = "available" | "rented" | "maintenance";

type Vehicle = {
  id: string;
  name: string;
  category: "car" | "motor" | "van" | "truck";
  subtype: string;
  plate: string;
  transmission: string;
  fuel: string;
  price: number;
  description: string;
  rating: number;
  rentals: number;
  status: VehicleStatus;
  featured: boolean;
  driverAvailable: boolean;
  icon: string;
};

const gradients: Record<Vehicle["category"], string> = {
  car: "from-indigo-600/80 to-violet-600/80",
  motor: "from-emerald-600/80 to-teal-600/80",
  van: "from-amber-600/80 to-orange-600/80",
  truck: "from-rose-600/80 to-fuchsia-600/80",
};

const statusBadge: Record<VehicleStatus, string> = {
  available:
    "bg-emerald-500/15 text-emerald-200 border border-emerald-500/20",
  rented: "bg-amber-500/15 text-amber-200 border border-amber-500/20",
  maintenance:
    "bg-slate-500/15 text-slate-200 border border-slate-500/25",
};

const subtypeOptions: Record<Vehicle["category"], string[]> = {
  car: ["Sedan", "SUV", "Hatchback", "Coupe", "Luxury"],
  motor: ["Sport", "Cruiser", "Scooter"],
  van: ["Passenger", "Cargo"],
  truck: ["Pickup", "Heavy Duty"],
};

const initialVehicles: Vehicle[] = [
  {
    id: "v1",
    name: "Toyota Camry 2024",
    category: "car",
    subtype: "Sedan",
    plate: "ABC-1234",
    transmission: "Automatic",
    fuel: "Gasoline",
    price: 75,
    description:
      "Comfortable midsize sedan, smooth handling and excellent fuel efficiency.",
    rating: 4.8,
    rentals: 156,
    status: "available",
    featured: true,
    driverAvailable: true,
    icon: "🚗",
  },
  {
    id: "v2",
    name: "Honda CBR600RR",
    category: "motor",
    subtype: "Sport",
    plate: "MTR-6001",
    transmission: "Manual",
    fuel: "Gasoline",
    price: 45,
    description:
      "High-performance sport motorcycle with agile control and speed.",
    rating: 4.9,
    rentals: 124,
    status: "rented",
    featured: false,
    driverAvailable: false,
    icon: "🏍️",
  },
  {
    id: "v3",
    name: "Mercedes Sprinter",
    category: "van",
    subtype: "Passenger",
    plate: "VAN-7788",
    transmission: "Automatic",
    fuel: "Diesel",
    price: 120,
    description:
      "Spacious passenger van ideal for group travel and long rides.",
    rating: 4.7,
    rentals: 98,
    status: "available",
    featured: true,
    driverAvailable: true,
    icon: "🚐",
  },
  {
    id: "v4",
    name: "Ford F-150 Pickup",
    category: "truck",
    subtype: "Pickup",
    plate: "TRK-1500",
    transmission: "Automatic",
    fuel: "Gasoline",
    price: 95,
    description:
      "Strong pickup truck for hauling and rugged terrain, comfortable cabin.",
    rating: 4.5,
    rentals: 61,
    status: "maintenance",
    featured: false,
    driverAvailable: false,
    icon: "🚛",
  },
  {
    id: "v5",
    name: "BMW X5 2024",
    category: "car",
    subtype: "SUV",
    plate: "BMW-2024",
    transmission: "Automatic",
    fuel: "Hybrid",
    price: 145,
    description:
      "Premium SUV with luxury interior, strong performance, and modern tech.",
    rating: 4.9,
    rentals: 84,
    status: "available",
    featured: true,
    driverAvailable: true,
    icon: "🚙",
  },
  {
    id: "v6",
    name: "Harley Davidson Street",
    category: "motor",
    subtype: "Cruiser",
    plate: "HD-9090",
    transmission: "Manual",
    fuel: "Gasoline",
    price: 65,
    description:
      "Classic cruiser style, comfortable ride, and iconic presence.",
    rating: 4.6,
    rentals: 72,
    status: "available",
    featured: false,
    driverAvailable: false,
    icon: "🏍️",
  },
  {
    id: "v7",
    name: "Tesla Model S",
    category: "car",
    subtype: "Luxury",
    plate: "EV-7777",
    transmission: "Automatic",
    fuel: "Electric",
    price: 180,
    description:
      "High-end electric sedan with instant torque and advanced autopilot features.",
    rating: 5.0,
    rentals: 39,
    status: "rented",
    featured: true,
    driverAvailable: true,
    icon: "⚡",
  },
  {
    id: "v8",
    name: "Chevrolet Express Cargo",
    category: "van",
    subtype: "Cargo",
    plate: "CGO-3322",
    transmission: "Automatic",
    fuel: "Gasoline",
    price: 85,
    description:
      "Reliable cargo van with large capacity for deliveries and business use.",
    rating: 4.4,
    rentals: 57,
    status: "available",
    featured: false,
    driverAvailable: false,
    icon: "🚐",
  },
];

type FilterState = {
  search: string;
  category: "all" | Vehicle["category"];
  subtype: "all" | string;
  status: "all" | VehicleStatus;
  transmission: "all" | string;
  fuel: "all" | string;
};

const emptyForm = {
  name: "",
  plate: "",
  category: "car" as Vehicle["category"],
  subtype: "Sedan",
  transmission: "Automatic",
  fuel: "Gasoline",
  price: "75",
  description: "",
  featured: false,
  driverAvailable: false,
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [selected, setSelected] = useState<Vehicle | null>(null);

  // Open Add modal via Topbar event
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "all",
    subtype: "all",
    status: "all",
    transmission: "all",
    fuel: "all",
  });

  // ✅ Listen to Topbar add button
  useEffect(() => {
    const open = () => setShowAdd(true);
    window.addEventListener("open-add-vehicle", open);
    return () => window.removeEventListener("open-add-vehicle", open);
  }, []);

  // subtype list based on current form category
  const formSubtypes = useMemo(
    () => subtypeOptions[form.category],
    [form.category]
  );

  useEffect(() => {
    // keep form.subtype valid when category changes
    if (!formSubtypes.includes(form.subtype)) {
      setForm((p) => ({ ...p, subtype: formSubtypes[0] || "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  const addVehicle = () => {
    if (!form.name || !form.plate || !form.price || !form.subtype) return;

    const icon =
      form.category === "motor"
        ? "🏍️"
        : form.category === "van"
        ? "🚐"
        : form.category === "truck"
        ? "🚛"
        : "🚗";

    const newVehicle: Vehicle = {
      id: `v${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      subtype: form.subtype,
      plate: form.plate.trim(),
      transmission: form.transmission,
      fuel: form.fuel,
      price: Number(form.price),
      description: form.description.trim() || "No description provided.",
      rating: 5,
      rentals: 0,
      status: "available",
      featured: form.featured,
      driverAvailable: form.driverAvailable,
      icon,
    };

    setVehicles((prev) => [newVehicle, ...prev]);
    setShowAdd(false);
    setForm({ ...emptyForm, subtype: subtypeOptions[emptyForm.category][0] });
  };

  const cycleStatus = (id: string) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status:
                v.status === "available"
                  ? "rented"
                  : v.status === "rented"
                  ? "maintenance"
                  : "available",
            }
          : v
      )
    );
  };

  const removeVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    setSelected(null);
  };

  const filteredVehicles = useMemo(() => {
    const s = filters.search.trim().toLowerCase();

    return vehicles.filter((v) => {
      const matchSearch =
        !s ||
        v.name.toLowerCase().includes(s) ||
        v.plate.toLowerCase().includes(s);

      const matchCategory =
        filters.category === "all" ? true : v.category === filters.category;

      const matchSubtype =
        filters.subtype === "all" ? true : v.subtype === filters.subtype;

      const matchStatus =
        filters.status === "all" ? true : v.status === filters.status;

      const matchTransmission =
        filters.transmission === "all"
          ? true
          : v.transmission === filters.transmission;

      const matchFuel =
        filters.fuel === "all" ? true : v.fuel === filters.fuel;

      return (
        matchSearch &&
        matchCategory &&
        matchSubtype &&
        matchStatus &&
        matchTransmission &&
        matchFuel
      );
    });
  }, [vehicles, filters]);

  // Subtype dropdown choices depend on category filter
  const filterSubtypeChoices = useMemo(() => {
    if (filters.category === "all") {
      // union of all
      const all = Object.values(subtypeOptions).flat();
      return Array.from(new Set(all));
    }
    return subtypeOptions[filters.category];
  }, [filters.category]);

  return (
    <div className="space-y-6">
      {/* Top header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Vehicle Management
          </h1>
          <p className="text-slate-300/80">
            Search, filter, and manage your fleet in one place.
          </p>
        </div>
      </div>

      {/* FILTER BAR (matches screenshot layout) */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
        <div className="p-4 grid grid-cols-1 lg:grid-cols-[1.2fr_repeat(5,auto)] gap-3 items-end">
          {/* search */}
          <div className="lg:col-span-1">
            <label className="block text-xs text-slate-300/80 mb-2">
              Search Vehicles
            </label>
            <div className="relative">
              <input
                value={filters.search}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, search: e.target.value }))
                }
                placeholder="Search by name, plate..."
                className="w-full h-11 rounded-xl bg-[#0b1020]/70 border border-white/10 text-slate-100 placeholder:text-slate-400/60 px-4 pr-10 outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400/80">
                ⌕
              </span>
            </div>
          </div>

          <FilterSelect
            label="Category"
            value={filters.category}
            onChange={(v) =>
              setFilters((p) => ({
                ...p,
                category: v as any,
                subtype: "all", // reset subtype when category changes
              }))
            }
            options={[
              { value: "all", label: "All Categories" },
              { value: "car", label: "Car" },
              { value: "motor", label: "Motor" },
              { value: "van", label: "Van" },
              { value: "truck", label: "Truck" },
            ]}
          />

          <FilterSelect
            label="Subtype"
            value={filters.subtype}
            onChange={(v) => setFilters((p) => ({ ...p, subtype: v as any }))}
            options={[
              { value: "all", label: "All Subtypes" },
              ...filterSubtypeChoices.map((s) => ({ value: s, label: s })),
            ]}
          />

          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters((p) => ({ ...p, status: v as any }))}
            options={[
              { value: "all", label: "All Status" },
              { value: "available", label: "Available" },
              { value: "rented", label: "Rented" },
              { value: "maintenance", label: "Maintenance" },
            ]}
          />

          <FilterSelect
            label="Transmission"
            value={filters.transmission}
            onChange={(v) =>
              setFilters((p) => ({ ...p, transmission: v as any }))
            }
            options={[
              { value: "all", label: "All Types" },
              { value: "Automatic", label: "Automatic" },
              { value: "Manual", label: "Manual" },
            ]}
          />

          <FilterSelect
            label="Fuel Type"
            value={filters.fuel}
            onChange={(v) => setFilters((p) => ({ ...p, fuel: v as any }))}
            options={[
              { value: "all", label: "All Types" },
              { value: "Gasoline", label: "Gasoline" },
              { value: "Diesel", label: "Diesel" },
              { value: "Electric", label: "Electric" },
              { value: "Hybrid", label: "Hybrid" },
            ]}
          />
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredVehicles.map((v) => (
          <div
            key={v.id}
            onClick={() => setSelected(v)}
            className="rounded-2xl overflow-hidden cursor-pointer border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition shadow-[0_14px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_22px_60px_rgba(0,0,0,0.45)]"
          >
            {/* top banner */}
            <div
              className={`h-36 bg-gradient-to-br ${gradients[v.category]} relative flex items-center justify-center`}
            >
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.35),transparent_45%)]" />
              <div className="relative text-5xl drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
                {v.icon}
              </div>
            </div>

            {/* body */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-1 text-xs rounded-lg capitalize ${statusBadge[v.status]}`}
                >
                  {v.status}
                </span>
                <span className="text-amber-200/90 text-sm flex items-center gap-1">
                  ★ <span className="text-slate-200/90">{v.rating}</span>
                </span>
              </div>

              <h3 className="font-semibold text-white leading-tight">
                {v.name}
              </h3>
              <p className="text-slate-300/70 text-xs">
                {v.subtype} • {v.transmission} • {v.fuel}
              </p>

              <div className="flex items-end justify-between pt-2">
                <span className="text-xl font-bold text-indigo-200">
                  ${v.price}
                  <span className="text-sm text-slate-300/70 font-medium">
                    /day
                  </span>
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(v);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-100 text-sm border border-indigo-500/20 hover:bg-indigo-500/20 shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD VEHICLE MODAL */}
      {showAdd && (
        <OverlayModal onClose={() => setShowAdd(false)} title="Add New Vehicle">
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Vehicle Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Toyota Camry 2024"
                  className="inputDark"
                />
              </Field>

              <Field label="Plate Number">
                <input
                  value={form.plate}
                  onChange={(e) => setForm({ ...form, plate: e.target.value })}
                  placeholder="e.g., ABC-1234"
                  className="inputDark"
                />
              </Field>

              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category: e.target.value as any,
                      subtype: "",
                    })
                  }
                  className="inputDark"
                >
                  <option value="car">Car</option>
                  <option value="motor">Motor</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
              </Field>

              <Field label="Subtype">
                <select
                  value={form.subtype}
                  onChange={(e) => setForm({ ...form, subtype: e.target.value })}
                  className="inputDark"
                >
                  {formSubtypes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Transmission">
                <select
                  value={form.transmission}
                  onChange={(e) =>
                    setForm({ ...form, transmission: e.target.value })
                  }
                  className="inputDark"
                >
                  <option>Automatic</option>
                  <option>Manual</option>
                </select>
              </Field>

              <Field label="Fuel Type">
                <select
                  value={form.fuel}
                  onChange={(e) => setForm({ ...form, fuel: e.target.value })}
                  className="inputDark"
                >
                  <option>Gasoline</option>
                  <option>Diesel</option>
                  <option>Electric</option>
                  <option>Hybrid</option>
                </select>
              </Field>

              <Field label="Price/Day ($)">
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="inputDark"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Vehicle features and description..."
                rows={4}
                className="inputDark resize-none py-3 h-auto"
              />
            </Field>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-3 text-slate-200/90">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-500"
                />
                Featured Vehicle
              </label>

              <label className="flex items-center gap-3 text-slate-200/90">
                <input
                  type="checkbox"
                  checked={form.driverAvailable}
                  onChange={(e) =>
                    setForm({ ...form, driverAvailable: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-500"
                />
                Driver Available
              </label>
            </div>

            <div className="pt-4 grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowAdd(false)}
                className="h-12 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white"
              >
                Cancel
              </button>

              <button
                onClick={addVehicle}
                className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
              >
                Add Vehicle
              </button>
            </div>
          </div>

          {/* helper classes */}
          <style>{`
            .inputDark {
              width: 100%;
              height: 44px;
              border-radius: 14px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              padding: 0 14px;
              color: white;
              outline: none;
            }
            .inputDark:focus {
              border-color: rgba(99,102,241,0.55);
              box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
            }
          `}</style>
        </OverlayModal>
      )}

      {/* VEHICLE DETAILS MODAL (matches screenshot layout) */}
      {selected && (
        <OverlayModal
          title="Vehicle Details"
          onClose={() => setSelected(null)}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            {/* header banner */}
            <div
              className={`h-44 rounded-2xl overflow-hidden bg-gradient-to-br ${gradients[selected.category]} relative flex items-center justify-center`}
            >
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_25%_30%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.40),transparent_55%)]" />
              <div className="relative text-6xl drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
                {selected.icon}
              </div>
            </div>

            {/* title row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selected.name}
                </h2>
                <p className="text-slate-300/70">
                  {selected.subtype} • {selected.transmission} • {selected.fuel}
                </p>
              </div>

              <span
                className={`px-3 py-1.5 rounded-xl capitalize ${statusBadge[selected.status]}`}
              >
                {selected.status}
              </span>
            </div>

            {/* stats */}
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Per Day" value={`$${selected.price}`} />
              <Stat label="Rating" value={selected.rating} />
              <Stat label="Total Rentals" value={selected.rentals} />
            </div>

            {/* details */}
            <div className="pt-1">
              <p className="text-white font-semibold mb-2">Details</p>
              <div className="space-y-2">
                <Detail label="Plate Number" value={selected.plate} />
                <Detail
                  label="Category"
                  value={selected.category.toUpperCase()}
                />
                <Detail
                  label="Driver Available"
                  value={selected.driverAvailable ? "Yes" : "No"}
                />
                <Detail label="Featured" value={selected.featured ? "Yes" : "No"} />
              </div>
            </div>

            {/* gallery */}
            <div className="pt-1">
              <p className="text-white font-semibold mb-2">Interior Gallery</p>
              <div className="grid grid-cols-4 gap-3">
                <GalleryTile emoji="🪑" />
                <GalleryTile emoji="🧊" />
                <GalleryTile emoji="📦" />
                <GalleryTile emoji="🛞" />
              </div>
            </div>

            {/* actions */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => cycleStatus(selected.id)}
                className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
              >
                Change Status
              </button>

              <button
                onClick={() => removeVehicle(selected.id)}
                className="h-12 rounded-xl bg-red-500/15 text-red-200 border border-red-500/20 hover:bg-red-500/20 font-medium shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
              >
                Remove
              </button>
            </div>
          </div>
        </OverlayModal>
      )}
    </div>
  );
}

/* ----------------- UI bits ----------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-300/75">{label}</p>
      {children}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-[160px]">
      <label className="block text-xs text-slate-300/80 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl bg-[#0b1020]/70 border border-white/10 text-slate-100 text-sm px-3 outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function OverlayModal({
  title,
  children,
  onClose,
  maxWidth = "max-w-4xl",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <>
      <button
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          className={`w-full ${maxWidth} rounded-2xl border border-white/10 bg-[#0b1020]/95 shadow-[0_30px_90px_rgba(0,0,0,0.65)] overflow-hidden`}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-lg flex items-center justify-center"
              title="Close"
            >
              ×
            </button>
          </div>

          <div className="p-6">{children}</div>
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4 p-3 rounded-xl bg-white/[0.04] border border-white/10">
      <span className="text-slate-300/70 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-center shadow-[0_14px_40px_rgba(0,0,0,0.30)]">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-300/70 mt-1">{label}</p>
    </div>
  );
}

function GalleryTile({ emoji }: { emoji: string }) {
  return (
    <div className="h-16 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-[0_14px_40px_rgba(0,0,0,0.30)]">
      <span className="text-xl">{emoji}</span>
    </div>
  );
}
