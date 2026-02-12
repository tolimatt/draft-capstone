import React, { useEffect, useMemo, useState } from "react";


/* =======================
   DATA
======================= */

const initialVehicles = [
  {
    id: "v1",
    name: "Toyota Camry 2024",
    category: "Car",
    subtype: "Sedan",
    plate: "ABC-1234",
    transmission: "Automatic",
    fuel: "Gasoline",
    price: 75,
    rating: 4.8,
    rentals: 156,
    status: "Available",
    featured: true,
    driverAvailable: true,
    icon: "🚗",
  },
];

/* =======================
   PAGE
======================= */

export default function Vehicles() {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [selected, setSelected] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
  const open = () => setShowAddModal(true);
  window.addEventListener("open-add-vehicle", open);
  return () => window.removeEventListener("open-add-vehicle", open);
}, []);


   const [filters, setFilters] = useState({
    search: "",
    category: "All",
    subtype: "All",
    status: "All",
    transmission: "All",
    fuel: "All",
  });

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-full">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Vehicle Management
        </h1>
        <p className="text-sm text-gray-600">
          Manage and monitor your fleet
        </p>
      </div>

      {/* FILTER BAR (TABLE-LIKE) */}
<div className="bg-white rounded-2xl border border-gray-300 p-4 shadow-md">
  <div className="grid grid-cols-[2fr_repeat(5,1fr)] gap-3 items-end">

    
    {/* SEARCH */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">
      Search Vehicles
    </label>
    <input
      type="text"
      placeholder="Search by name, plate..."
      value={filters.search}
      onChange={(e) =>
        setFilters({ ...filters, search: e.target.value })
      }
      className="w-full px-4 py-2.5 rounded-xl border border-gray-300
      text-sm text-gray-800 placeholder:text-gray-400
      focus:outline-none focus:ring-2
      focus:ring-[#017FE6]/40 focus:border-[#017FE6]"
    />
  </div>

  {/* CATEGORY */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">Category</label>
    <select
      value={filters.category}
      onChange={(e) =>
        setFilters({ ...filters, category: e.target.value })
      }
      className="w-full px-3 py-2.5 rounded-xl border border-gray-300
      text-sm text-gray-800 bg-white focus:outline-none
      focus:ring-2 focus:ring-[#017FE6]/40 focus:border-[#017FE6]"
    >
      <option>All</option>
      <option>Car</option>
      <option>Motorcycle</option>
      <option>Van</option>
      <option>Truck</option>
    </select>
  </div>

  {/* SUBTYPE */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">Subtype</label>
    <select
      value={filters.subtype}
      onChange={(e) =>
        setFilters({ ...filters, subtype: e.target.value })
      }
      className="w-full px-3 py-2.5 rounded-xl border border-gray-300
      text-sm text-gray-800 bg-white focus:outline-none
      focus:ring-2 focus:ring-[#017FE6]/40 focus:border-[#017FE6]"
    >
      <option>All</option>
      <option>Sedan</option>
      <option>SUV</option>
      <option>Cruiser</option>
      <option>Pickup</option>
    </select>
  </div>

  {/* STATUS */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">Status</label>
    <select
      value={filters.status}
      onChange={(e) =>
        setFilters({ ...filters, status: e.target.value })
      }
      className="w-full px-3 py-2.5 rounded-xl border border-gray-300
      text-sm text-gray-800 bg-white focus:outline-none
      focus:ring-2 focus:ring-[#017FE6]/40 focus:border-[#017FE6]"
    >
      <option>All</option>
      <option>Available</option>
      <option>Rented</option>
      <option>Maintenance</option>
    </select>
  </div>

  {/* TRANSMISSION */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">Transmission</label>
    <select
      value={filters.transmission}
      onChange={(e) =>
        setFilters({ ...filters, transmission: e.target.value })
      }
      className="w-full px-3 py-2.5 rounded-xl border border-gray-300
      text-sm text-gray-800 bg-white focus:outline-none
      focus:ring-2 focus:ring-[#017FE6]/40 focus:border-[#017FE6]"
    >
      <option>All</option>
      <option>Automatic</option>
      <option>Manual</option>
    </select>
  </div>

  {/* FUEL */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">Fuel Type</label>
    <select
      value={filters.fuel}
      onChange={(e) =>
        setFilters({ ...filters, fuel: e.target.value })
      }
      className="w-full px-3 py-2.5 rounded-xl border border-gray-300
      text-sm text-gray-800 bg-white focus:outline-none
      focus:ring-2 focus:ring-[#017FE6]/40 focus:border-[#017FE6]"
    >
      <option>All</option>
      <option>Gasoline</option>
      <option>Diesel</option>
      <option>Electric</option>
      <option>Hybrid</option>
    </select>
  </div>

</div>
</div>


      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles
  .filter((v) => {
    if (
      filters.search &&
      !v.name.toLowerCase().includes(filters.search.toLowerCase()) &&
      !v.plate.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    if (filters.category !== "All" && v.category !== filters.category) {
      return false;
    }

    if (filters.subtype !== "All" && v.subtype !== filters.subtype) {
      return false;
    }

    if (filters.status !== "All" && v.status !== filters.status) {
      return false;
    }

    if (
      filters.transmission !== "All" &&
      v.transmission !== filters.transmission
    ) {
      return false;
    }

    if (filters.fuel !== "All" && v.fuel !== filters.fuel) {
      return false;
    }

    return true;
  })
  .map((v) => (
    <VehicleCard
      key={v.id}
      vehicle={v}
      onClick={() => setSelected(v)}
    />
  ))}

      </div>

      {/* DETAILS MODAL */}
      {selected && (
        <VehicleDetailsModal
          vehicle={selected}
          onClose={() => setSelected(null)}
          onRemove={() =>
            setVehicles((prev) =>
              prev.filter((x) => x.id !== selected.id)
            )
          }
          onCycleStatus={() =>
            setVehicles((prev) =>
              prev.map((v) =>
                v.id === selected.id
                  ? {
                      ...v,
                      status:
                        v.status === "Available"
                          ? "Rented"
                          : v.status === "Rented"
                          ? "Maintenance"
                          : "Available",
                    }
                  : v
              )
            )
          }
        />
      )}
      {/* ADD VEHICLE MODAL */}
{showAddModal && (
  <AddVehicleModal
    onClose={() => setShowAddModal(false)}
    onAdd={(newVehicle) => {
      setVehicles((prev) => [...prev, newVehicle]);
      setShowAddModal(false);
    }}
  />
)}
    </div>
  );
}

/* =======================
   VEHICLE CARD
======================= */

function VehicleCard({ vehicle, onClick }) {
  return (
    <div
  onClick={onClick}
  className="relative bg-white rounded-2xl border border-gray-300 shadow-sm hover:shadow-xl transition cursor-pointer overflow-hidden"
>
  {/* TOP BANNER */}
  <div className="h-32 flex items-center justify-center text-5xl bg-gradient-to-br from-blue-50 to-blue-100">
    {vehicle.icon}
  </div>

  {/* STATUS BADGE */}

  {/* RATING */}
  <span className="absolute top-3 right-3 text-sm text-yellow-500 font-medium">
    ★ {vehicle.rating}
  </span>

  {/* BODY */}
  <div className="p-4 space-y-2">
    {/* STATUS */}
<span
  className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${
    statusStyles[vehicle.status]
  }`}
>
  {vehicle.status}
</span>

    <h3 className="font-semibold text-gray-900 leading-tight">
      {vehicle.name}
    </h3>

    <p className="text-xs text-gray-600">
      {vehicle.subtype} • {vehicle.transmission} • {vehicle.fuel}
    </p>
    {vehicle.description && (
  <p className="text-xs text-gray-500 line-clamp-2">
    {vehicle.description}
  </p>
)}


    <div className="flex items-center justify-between pt-2">
      <span className="font-bold text-[#017FE6]">
        ${vehicle.price}
        <span className="text-xs text-gray-500 font-medium"> /day</span>
      </span>

      {/* EDIT BUTTON (matches image) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="px-3 py-1.5 text-sm rounded-lg bg-[#017FE6]/10 text-[#017FE6] hover:bg-[#017FE6]/20"
      >
        Edit
      </button>
    </div>
  </div>
</div>

  );
}

const statusStyles = {
  Available: "bg-green-100 text-green-700",
  Rented: "bg-orange-100 text-orange-700",
  Maintenance: "bg-gray-200 text-gray-700",
};


/* =======================
   DETAILS MODAL (MATCHES IMAGE)
======================= */

function VehicleDetailsModal({ vehicle, onClose, onRemove, onCycleStatus }) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
  className="
    bg-white
    w-full
    max-w-3xl
    max-h-[90vh]
    rounded-3xl
    shadow-2xl
    border border-gray-200
    flex flex-col">          
          {/* HEADER */}
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Vehicle Details</h2>
            <button onClick={onClose} className="text-xl">×</button>
          </div>

          {/* HERO */}
          <div className="h-48 flex items-center justify-center text-6xl bg-gradient-to-br from-blue-50 to-blue-100">
            {vehicle.icon}
          </div>

          {/* BODY (SCROLLABLE) */}
            <div className="p-6 space-y-6 overflow-y-auto">

            
            {/* TITLE */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold">
                  {vehicle.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {vehicle.subtype} • {vehicle.transmission} • {vehicle.fuel}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                {vehicle.status}
              </span>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Per Day" value={`$${vehicle.price}`} />
              <Stat label="Rating" value={vehicle.rating} />
              <Stat label="Total Rentals" value={vehicle.rentals} />
            </div>

            {/* DETAILS */}
            <div className="space-y-2">
              <Detail label="Plate Number" value={vehicle.plate} />
              <Detail label="Category" value={vehicle.category} />
              <Detail
                label="Driver Availability"
                value={vehicle.driverAvailability}
              />
              <Detail
                label="Featured"
                value={vehicle.featured ? "Yes" : "No"}
              />
            </div>


            {/* GALLERY */}
            {vehicle.images && (
              <>

              {vehicle.documents?.orcr && (
              <>
                <p className="font-semibold mt-6 mb-2">OR / CR</p>
                <img
                  src={
                    typeof vehicle.documents.orcr === "string"
                      ? vehicle.documents.orcr
                      : vehicle.documents.orcr.preview
                  }
                  className="h-40 rounded-xl border object-contain bg-white"
                />
              </>
            )}

              {/* INTERIOR */}
              <p className="font-semibold mb-2">Interior</p>
              <div className="grid grid-cols-4 gap-3">
                {vehicle.images.interior.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    className="h-24 rounded-xl object-cover border"
                  />
                ))}
              </div>
            </>
            
          )}

            {/* DESCRIPTION */}
                {vehicle.description && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
                    <p className="font-medium mb-1">Description</p>
                    <p>{vehicle.description}</p>
                </div>
                )}


                        {/* ACTIONS */}
            <div className="grid grid-cols-2 gap-4 pt-4">
            <button
                onClick={() => {
                onCycleStatus();
                onClose();
                }}
                className="py-3 rounded-xl bg-[#017FE6] text-white font-semibold"
            >
                Change Status
            </button>

            <button
                onClick={() => {
                onRemove();
                onClose();
                }}
                className="py-3 rounded-xl bg-red-100 text-red-600 font-semibold"
            >
                Remove
            </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* =======================
   SMALL UI
======================= */

function Detail({ label, value }) {
  return (
    <div className="flex justify-between bg-gray-50 px-4 py-3 rounded-lg text-sm border border-gray-200">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl p-4 text-center border border-gray-200 shadow-sm">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function GalleryTile({ emoji }) {
  return (
    <div className="h-16 rounded-xl bg-gray-50 flex items-center justify-center text-xl">
      {emoji}
    </div>
  );
}
function AddVehicleModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
  name: "",
  plate: "",
  category: "Car",
  subtype: "Sedan",
  transmission: "Automatic",
  fuel: "Gasoline",
  price: "",
  description: "",
  status: "Available",
  driverAvailability: "Self-Drive Only",
  interiorImages: [],   
  orcrFile: null,      
});



  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
        className="
          bg-white/95 backdrop-blur
          w-full max-w-2xl
          max-h-[85vh]
          rounded-3xl
          shadow-[0_30px_80px_rgba(0,0,0,0.25)]
          border border-gray-200
          flex flex-col
          animate-[fadeIn_0.25s_ease-out]">
          {/* HEADER */}
            <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Add Vehicle</h2>
            <button onClick={onClose} className="text-2xl leading-none">×</button>
            </div>

          {/* SCROLL AREA */}
            <div className="overflow-y-auto px-6 py-6 space-y-6">
          {/* FORM */}  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input
              className="px-4 py-2 rounded-xl border"
              placeholder="Vehicle Name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <select
            className="px-3 py-2 rounded-xl border"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value })
            }
          >
            <option>Available</option>
            <option>Maintenance</option>
          </select>


            <input
              className="px-4 py-2 rounded-xl border"
              placeholder="Plate Number"
              value={form.plate}
              onChange={(e) =>
                setForm({ ...form, plate: e.target.value })
              }
            />

            <select
              className="px-3 py-2 rounded-xl border"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
            >
              <option>Car</option>
              <option>Motorcycle</option>
              <option>Van</option>
              <option>Truck</option>
            </select>

            <select
              className="px-3 py-2 rounded-xl border"
              value={form.subtype}
              onChange={(e) =>
                setForm({ ...form, subtype: e.target.value })
              }
            >
              <option>Sedan</option>
              <option>SUV</option>
              <option>Pickup</option>
            </select>

            <select
              className="px-3 py-2 rounded-xl border"
              value={form.transmission}
              onChange={(e) =>
                setForm({ ...form, transmission: e.target.value })
              }
            >
              <option>Automatic</option>
              <option>Manual</option>
            </select>

            <select
              className="px-3 py-2 rounded-xl border"
              value={form.fuel}
              onChange={(e) =>
                setForm({ ...form, fuel: e.target.value })
              }
            >
              <option>Gasoline</option>
              <option>Diesel</option>
              <option>Electric</option>
            </select>

            <input
             type="number"
            min="0"
            className="px-4 py-2 rounded-xl border col-span-1"
            placeholder="Price / day"
            value={form.price}
            onChange={(e) =>
                setForm({ ...form, price: e.target.value })
            }
            />

          </div>

          <div className="col-span-2 mt-4">
          <label className="text-sm font-medium text-gray-600 block mb-1">
            Interior Photos (Required: 4)
          </label>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files);

              setForm((prev) => {
                const combined = [
                  ...prev.interiorImages,
                  ...files.map((f) => URL.createObjectURL(f)),
                ];

                if (combined.length > 4) {
                  alert("You can only upload up to 4 interior photos.");
                  return prev;
                }

                return {
                  ...prev,
                  interiorImages: combined,
                };
              });

              e.target.value = "";
            }}
            className="block w-full text-sm"
          />

          <div className="grid grid-cols-4 gap-2 mt-2">
            {form.interiorImages.map((img, i) => (
              <div key={i} className="relative">
                <img
                  src={img}
                  className="h-20 w-full rounded-lg object-cover border"
                />

                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      interiorImages: prev.interiorImages.filter((_, x) => x !== i),
                    }))
                  }
                  className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1 rounded"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>


        <div className="col-span-2 mt-4">
          <label className="text-sm font-medium text-gray-600 block mb-1">
            OR/CR Document (Required)
          </label>

          <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;

            setForm({
              ...form,
              orcrFile: {
                file,
                preview: file.type.startsWith("image/")
                  ? URL.createObjectURL(file)
                  : null,
              },
            });
          }}
          className="block w-full text-sm"
        />

          {form.orcrFile && (
          <div className="mt-2 space-y-2">
            {form.orcrFile.preview ? (
              <div className="relative w-40">
                <img
                  src={form.orcrFile.preview}
                  className="h-24 w-full rounded-lg object-cover border"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, orcrFile: null })}
                  className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1 rounded"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Uploaded: {form.orcrFile.file.name}
                </p>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, orcrFile: null })}
                  className="text-xs text-red-500"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
        </div>


        <textarea
          className="
            mt-4
            px-5 py-4
            rounded-xl
            border
            w-full
            resize-none
            text-sm
            leading-relaxed
            focus:outline-none
            focus:ring-2
            focus:ring-[#017FE6]/40
          "
          rows={5}
          placeholder="Vehicle features and description..."
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />


        <div className="flex items-center gap-4 mt-4">
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-600 block mb-1">
            Driver Availability
          </label>

          <select
            value={form.driverAvailability}
            onChange={(e) =>
              setForm({ ...form, driverAvailability: e.target.value })
            }
            className="w-full px-4 py-2 rounded-xl border"
          >
            <option>Self-Drive Only</option>
            <option>With Driver Only</option>
            <option>Self-Drive / With Driver</option>
          </select>
        </div>

        </div>
        </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white/80">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                if (form.interiorImages.length !== 4) {
            alert("Exactly 4 interior photos are required.");
            return;
          }

          if (!form.orcrFile) {
            alert("Please upload the OR/CR document.");
            return;
          }

          onAdd({
            id: Date.now().toString(),
            rating: 0,
            rentals: 0,
            icon: "🚗",
            price: Number(form.price),
            images: {
              interior: form.interiorImages,
            },
            documents: {
            orcr: form.orcrFile.preview, // image preview URL
          },
            ...form,
          });


              }}
              className="px-5 py-2 rounded-xl bg-[#017FE6] text-white hover:bg-[#017FE6]/90"
            >
              Add Vehicle
            </button>
          </div>
        </div>
      </div>
    </>
  );
 }
