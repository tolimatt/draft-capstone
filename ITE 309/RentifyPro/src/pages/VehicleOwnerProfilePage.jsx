import {
  BadgeCheck,
  Car,
  MapPin,
  Star,
  Users,
  Settings,
  Fuel,
} from "lucide-react";

/* ===========================
   SAMPLE OWNER DATA
=========================== */
const SAMPLE_OWNER = {
  name: "Juan Dela Cruz",
  avatar: "/owner-profile.png",
  verified: true,
  location: "Quezon City, Philippines",
  rating: 4.8,
  vehicles: 3,
  rentals: 128,
  joinedDate: "January 2024",
  verifiedDate: "March 2024",

  vehicleList: [
    {
      id: 1,
      name: "Toyota Vios 2022",
      category: "Sedan",
      location: "Quezon City",
      seats: 5,
      transmission: "Automatic",
      fuel: "Gasoline",
      price: 1800,
      rating: 4.7,
      available: true,
      image: "/vios.png",
    },
    {
      id: 2,
      name: "Honda Click 160",
      category: "Motorcycle",
      location: "Manila",
      seats: 2,
      transmission: "Automatic",
      fuel: "Gasoline",
      price: 900,
      rating: 4.6,
      available: false,
      image: "/click160.png",
    },
    {
      id: 3,
      name: "Toyota Fortuner",
      category: "SUV",
      location: "Makati",
      seats: 7,
      transmission: "Automatic",
      fuel: "Diesel",
      price: 3500,
      rating: 4.9,
      available: true,
      image: "/fortuner.png",
    },
  ],

  reviews: [
    {
      id: 1,
      name: "Maria Santos",
      rating: 5,
      comment: "Very smooth transaction. Clean car and polite owner.",
      date: "Feb 10, 2026",
    },
    {
      id: 2,
      name: "John Dela Peña",
      rating: 4,
      comment: "Good experience overall. Would rent again.",
      date: "Feb 8, 2026",
    },
  ],
};

/* ===========================
   MAIN COMPONENT
=========================== */
export default function VehicleOwnerProfilePage({ onBack }) {
  const owner = SAMPLE_OWNER;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-24 max-w-7xl mx-auto space-y-10">

      {/* BACK */}
      <button
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-[#017FE6]"
      >
        ← Back
      </button>

      {/* OWNER HEADER */}
      <div className="bg-white rounded-2xl border p-8 flex flex-col md:flex-row gap-8">
        <img
          src={owner.avatar}
          alt={owner.name}
          className="w-32 h-32 rounded-full object-cover border"
        />

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{owner.name}</h1>
            {owner.verified && <BadgeCheck className="text-[#017FE6]" />}
          </div>

          <p className="text-sm text-[#017FE6] font-medium">
            Verified Vehicle Owner
          </p>

          <p className="flex items-center gap-1 text-gray-500 text-sm">
            <MapPin size={14} /> {owner.location}
          </p>

          <div className="flex gap-6 text-sm mt-3">
            <span className="flex items-center gap-1 text-yellow-400 font-semibold">
              <Star size={14} fill="currentColor" /> {owner.rating}
            </span>
            <span>🚗 {owner.vehicles} Vehicles</span>
            <span>📦 {owner.rentals} Rentals</span>
          </div>

          <div className="text-xs text-gray-400">
            <p>Joined: {owner.joinedDate}</p>
            <p>Verified since: {owner.verifiedDate}</p>
          </div>
        </div>
      </div>

      {/* VEHICLES GRID */}
      <div className="bg-white rounded-2xl border p-7">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Car size={18} />
          Vehicles by {owner.name}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {owner.vehicleList?.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow group flex flex-col"
            >
              {/* IMAGE + BADGES */}
              <div className="relative">
                {vehicle.available && (
                  <span className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                    Available
                  </span>
                )}

                <span className="absolute top-4 right-4 bg-gray-900 px-3 py-1 rounded-full text-xs font-semibold z-10 flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-white">{vehicle.rating}</span>
                </span>

                <div className="bg-gray-50 h-36 flex items-center justify-center px-5">
                  <img
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="h-full max-w-[93%] object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>

              {/* CONTENT */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-xl font-bold mb-1">{vehicle.name}</h3>
                <p className="text-gray-500 text-sm mb-2">
                  {vehicle.category}
                </p>

                <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                  <MapPin size={14} className="text-[#017FE6]" />
                  {vehicle.location}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Users size={16} className="text-[#017FE6]" />
                    {vehicle.seats} seats
                  </span>
                  <span className="flex items-center gap-1">
                    <Settings size={16} className="text-[#017FE6]" />
                    {vehicle.transmission}
                  </span>
                  <span className="flex items-center gap-1">
                    <Fuel size={16} className="text-[#017FE6]" />
                    {vehicle.fuel}
                  </span>
                </div>

                <div className="text-lg font-bold text-[#017FE6] mb-3">
                  ₱{vehicle.price.toLocaleString()} / day
                </div>

                <div className="flex gap-2 mt-auto">
                  <button className="flex-1 border-2 border-gray-300 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">
                    View Details
                  </button>
                  <button className="flex-1 bg-[#017FE6] text-white py-2 rounded-lg hover:bg-[#0165B8]">
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REVIEWS */}
      <div className="bg-white rounded-2xl border p-7">
        <h2 className="text-lg font-bold mb-6">Customer Reviews</h2>

        <div className="space-y-4">
          {owner.reviews.map((r) => (
            <div key={r.id} className="border rounded-xl p-4">
              <div className="flex justify-between">
                <p className="font-semibold">{r.name}</p>
                <span className="text-yellow-400">
                  {"★".repeat(r.rating)}
                </span>
              </div>
              <p className="text-sm text-gray-600">{r.comment}</p>
              <p className="text-xs text-gray-400 mt-1">{r.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
