import React, { useEffect, useMemo, useState } from "react";
import { CarFront, Fuel, MapPin, Search, Settings, Users } from "lucide-react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import ChatWidget from "../components/ChatWidget";
import BookingAccessModal from "../components/BookingAccessModal";
import VehiclePreviewModal from "../components/VehiclePreviewModal";
import { sanitizeBookingRange } from "../utils/dateUtils";
import VehicleCover from "../components/VehicleCover";
import { DEFAULT_VEHICLE_IMAGE } from "../utils/media";
import { formatVehicleType } from "../utils/vehicleText";

const normalizeVehicleType = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "motor") return "motorcycle";
  return normalized;
};

const normalizeVehicle = (vehicle) => ({
  id: vehicle._id,
  _id: vehicle._id,
  name: vehicle.name,
  location: vehicle.location,
  coverImageUrl: vehicle.coverImageUrl || vehicle.imageUrl || vehicle.images?.[0] || DEFAULT_VEHICLE_IMAGE,
  image: vehicle.coverImageUrl || vehicle.imageUrl || vehicle.images?.[0] || DEFAULT_VEHICLE_IMAGE,
  images: vehicle.images || [],
  coverDisplayMode: vehicle.coverDisplayMode || "auto",
  type: normalizeVehicleType(vehicle.specs?.type || "car"),
  subType: vehicle.specs?.subType || "Standard",
  category: "Owner-listed Vehicle",
  seats: vehicle.specs?.seats || 4,
  transmission: vehicle.specs?.transmission || "Automatic",
  fuel: vehicle.specs?.fuel || "Gasoline",
  plateNumber: vehicle.specs?.plateNumber || "",
  price: Number((vehicle.hourlyRentalRate ?? vehicle.dailyRentalRate) || 0),
  driverOptionEnabled: Boolean(vehicle.driverOptionEnabled),
  driverDailyRate: Number((vehicle.driverHourlyRate ?? vehicle.driverDailyRate) || 0),
  rating: Number.isFinite(Number(vehicle.averageRating ?? vehicle.rating))
    ? Number(Number(vehicle.averageRating ?? vehicle.rating).toFixed(1))
    : 0,
  reviewCount: Number.isFinite(Number(vehicle.reviewCount)) ? Number(vehicle.reviewCount) : 0,
  available: vehicle.availabilityStatus === "available",
  description: vehicle.description || "",
  specs: vehicle.specs || {},
  owner: {
    _id: vehicle.owner?._id || "",
    name: vehicle.owner?.name || "Vehicle Owner",
    email: vehicle.owner?.email || "",
    avatar: vehicle.owner?.avatar || "",
    verified: vehicle.owner?.verified !== false,
  },
});

export default function VehiclesPage({
  bookingData,
  setBookingData,
  isLoggedIn,
  user,
  onLogout,
  onNavigateToHome,
  onNavigateToSignIn,
  onNavigateToRegister,
  onNavigateToVehicles,
  onViewDetails,
  onNavigateToBookingHistory,
  onNavigateToAbout,
  onNavigateToContacts,
  onNavigateToChat,
  onNavigateToNotifications,
  onOpenNotificationsModal,
  onNavigateToAccountSettings,
}) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [showBookingAccessModal, setShowBookingAccessModal] = useState(false);
  const [previewVehicle, setPreviewVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState(String(bookingData.location || ""));
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState(
    normalizeVehicleType(bookingData.vehicleType || "")
  );
  const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, totalPages: 1 });

  useEffect(() => {
    setBookingData((prev) => {
      const normalized = sanitizeBookingRange(prev);
      if (
        prev.pickupDate === normalized.pickupDate &&
        prev.pickupTime === normalized.pickupTime &&
        prev.returnDate === normalized.returnDate &&
        prev.returnTime === normalized.returnTime
      ) {
        return prev;
      }
      return { ...prev, ...normalized };
    });
  }, [setBookingData]);

  const combinedSearch = useMemo(() => searchQuery.trim(), [searchQuery]);
  const combinedLocation = useMemo(() => locationQuery.trim(), [locationQuery]);

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await API.getPublicVehicles({
          search: combinedSearch,
          location: combinedLocation,
          vehicleType: vehicleTypeFilter,
          page: 1,
          limit: 24,
        });

        if (!isActive) return;
        const availableVehicles = (response.vehicles || [])
          .map(normalizeVehicle)
          .filter((vehicle) => vehicle.available);
        setVehicles(availableVehicles);
        setPagination({
          ...(response.pagination || { page: 1, limit: 24, total: 0, totalPages: 1 }),
          total: availableVehicles.length,
          totalPages: Math.max(1, Math.ceil(availableVehicles.length / 24)),
          hasNextPage: false,
          hasPrevPage: false,
        });
      } catch (err) {
        if (!isActive) return;
        setError(err.message || "Failed to load available vehicles.");
      } finally {
        if (isActive) setLoading(false);
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [combinedSearch, combinedLocation, vehicleTypeFilter]);

  const availableCount = useMemo(
    () => vehicles.filter((vehicle) => vehicle.available).length,
    [vehicles]
  );

  const closeBookingAccessModal = () => setShowBookingAccessModal(false);
  const handleBookingModalSignIn = () => {
    setShowBookingAccessModal(false);
    onNavigateToSignIn();
  };
  const handleBookingModalRegister = () => {
    setShowBookingAccessModal(false);
    onNavigateToRegister();
  };
  const handleBookingModalBrowseVehicles = () => {
    setShowBookingAccessModal(false);
    onNavigateToVehicles();
  };

  const openVehiclePreview = (vehicle) => {
    setPreviewVehicle(vehicle);
  };

  const closeVehiclePreview = () => {
    setPreviewVehicle(null);
  };

  const handleBookNow = (vehicle) => {
    if (!vehicle?.available) return;
    if (!isLoggedIn) {
      setShowBookingAccessModal(true);
      return;
    }
    onViewDetails(vehicle);
  };

  const handleChatOwner = (vehicle) => {
    if (!vehicle) return;

    const ownerId = String(vehicle.owner?._id || "");
    const viewerId = String(user?._id || "");
    const vehicleId = String(vehicle._id || vehicle.id || "");

    if (!ownerId || ownerId === viewerId) return;
    if (!isLoggedIn) {
      onNavigateToSignIn?.();
      return;
    }

    onNavigateToChat?.({
      partnerId: ownerId,
      partnerName: vehicle.owner?.name || "Vehicle Owner",
      partnerEmail: vehicle.owner?.email || "",
      partnerAvatar: vehicle.owner?.avatar || "",
      ...(vehicleId ? { vehicleId } : {}),
    });
  };

  const previewOwnerId = String(previewVehicle?.owner?._id || "");
  const disablePreviewChat = Boolean(previewVehicle) && (
    !previewOwnerId || previewOwnerId === String(user?._id || "")
  );

  return (
      <div className="rp-renter-page min-h-screen">
        <Navbar
          activePage="vehicles"
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={onNavigateToHome}
          onNavigateToVehicles={onNavigateToVehicles}
          onNavigateToBookingHistory={onNavigateToBookingHistory}
          onNavigateToAbout={onNavigateToAbout}
          onNavigateToContacts={onNavigateToContacts}
          onNavigateToChat={onNavigateToChat}
          onNavigateToNotifications={onNavigateToNotifications}
          onOpenNotificationsModal={onOpenNotificationsModal}
          onNavigateToSignIn={onNavigateToSignIn}
          onNavigateToRegister={onNavigateToRegister}
          onNavigateToAccountSettings={onNavigateToAccountSettings}
          isAIOpen={showAI}
          onShowAI={() => setShowAI(true)}
          onLogout={onLogout}
        />

        <div className="rp-page-shell mx-auto max-w-[1380px] px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <div className="rp-page-header mb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <span className="rp-page-eyebrow">Rental marketplace</span>
                <h1 className="text-3xl sm:text-4xl font-bold">Browse Vehicles</h1>
                <p className="text-slate-600 mt-2">
                  Explore verified listings with flexible schedules and transparent pricing.
                </p>
              </div>
              <div className="rp-chip bg-[#0B75E7]/10 text-[#0B75E7] text-sm font-bold">
                {availableCount} available now
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <aside className="rp-surface rp-glass p-5 h-fit sticky top-24 space-y-4">
              <h2 className="text-lg font-bold">Filters</h2>

              <div>
                <label className="text-sm font-medium mb-1 block text-slate-600">Search</label>
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="rp-input pr-9 text-sm"
                    placeholder="Name, details, plate number"
                    maxLength={100}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-slate-600">Location</label>
                <div className="relative">
                  <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="rp-input pr-9 text-sm"
                    placeholder="City, municipality, or area"
                    maxLength={180}
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-slate-600">Vehicle Type</label>
                <select
                  className="rp-input text-sm"
                  value={vehicleTypeFilter}
                  onChange={(event) => setVehicleTypeFilter(normalizeVehicleType(event.target.value))}
                >
                  <option value="">All types</option>
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
              </div>
            </aside>

            <section>
              {loading && <p className="text-sm text-slate-600">Loading vehicles...</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {!loading && !error && pagination.total > 0 && (
                <p className="mb-3 text-sm text-slate-500">
                  Showing {vehicles.length} of {pagination.total} vehicles
                </p>
              )}

              {!loading && !error && vehicles.length === 0 && (
                <div className="rp-surface p-6 text-slate-600 text-sm">
                  No vehicles match your filters.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {vehicles.map((vehicle) => (
                  <article
                    key={vehicle.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openVehiclePreview(vehicle)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openVehiclePreview(vehicle);
                      }
                    }}
                    aria-label={`Preview ${vehicle.name}`}
                    className="rp-surface rp-hover-lift overflow-hidden flex flex-col cursor-pointer"
                  >
                  <div className="px-4 pt-4">
                    <VehicleCover
                      vehicle={vehicle}
                      alt={vehicle.name}
                      contentClassName="p-4 sm:p-5"
                    >
                      <span
                        className={`absolute top-3 left-3 z-10 rp-chip ${
                          vehicle.available
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {vehicle.available ? "Available" : "Unavailable"}
                      </span>
                      <span className="absolute top-3 right-3 z-10 rp-chip bg-slate-900 text-white">
                        {vehicle.reviewCount > 0 ? vehicle.rating.toFixed(1) : "No reviews"}
                      </span>
                    </VehicleCover>
                  </div>

                    <div className="p-5 flex flex-col gap-2 flex-1">
                      <h3 className="text-lg font-bold">{vehicle.name}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2">{vehicle.description}</p>

                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <CarFront size={14} className="text-[#0B75E7]" />
                        <span>{formatVehicleType(vehicle.type, "Vehicle")}</span>
                      </div>

                      <div className="flex gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Users size={14} className="text-[#0B75E7]" />
                          {vehicle.seats}
                        </span>
                        <span className="flex items-center gap-1">
                          <Settings size={14} className="text-[#0B75E7]" />
                          {vehicle.transmission}
                        </span>
                        <span className="flex items-center gap-1">
                          <Fuel size={14} className="text-[#0B75E7]" />
                          {vehicle.fuel}
                        </span>
                      </div>

                      {vehicle.driverOptionEnabled && (
                        <p className="text-sm text-blue-700">
                          Driver available
                        </p>
                      )}

                      <div className="text-xl font-bold text-[#0B75E7]">
                        P{vehicle.price.toLocaleString()}
                        <span className="text-sm text-slate-500 font-medium"> / hour</span>
                      </div>

                      <div className="pt-4 mt-auto">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleBookNow(vehicle);
                          }}
                          disabled={!vehicle.available}
                          className={`py-2 text-sm w-full rounded-xl font-semibold transition ${
                            vehicle.available
                              ? "rp-btn-primary"
                              : "bg-slate-200 text-slate-600 cursor-not-allowed"
                          }`}
                        >
                          {vehicle.available ? "Book Now" : "Unavailable"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
        <VehiclePreviewModal
          isOpen={Boolean(previewVehicle)}
          vehicle={previewVehicle}
          onClose={closeVehiclePreview}
          onBookNow={() => {
            if (!previewVehicle) return;
            closeVehiclePreview();
            handleBookNow(previewVehicle);
          }}
          onChatOwner={() => {
            if (!previewVehicle) return;
            closeVehiclePreview();
            handleChatOwner(previewVehicle);
          }}
          disableChat={disablePreviewChat}
        />
        <BookingAccessModal
          isOpen={showBookingAccessModal}
          onClose={closeBookingAccessModal}
          onSignIn={handleBookingModalSignIn}
          onRegister={handleBookingModalRegister}
          onBrowseVehicles={handleBookingModalBrowseVehicles}
        />
        <ChatWidget
          isOpen={showAI}
          onClose={() => setShowAI(false)}
          onViewAvailableVehicles={onNavigateToVehicles}
        />
      </div>
    );
  }
