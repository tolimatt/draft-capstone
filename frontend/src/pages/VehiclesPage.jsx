import React, { useEffect, useMemo, useState } from "react";
import {
  CarFront,
  Search,
} from "lucide-react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import ChatWidget from "../components/ChatWidget";
import BookingAccessModal from "../components/BookingAccessModal";
import VehiclePreviewModal from "../components/VehiclePreviewModal";
import { sanitizeBookingRange } from "../utils/dateUtils";
import VehicleCard from "../components/VehicleCard";
import { DEFAULT_VEHICLE_IMAGE } from "../utils/media";

const normalizeVehicleType = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "motor") return "motorcycle";
  return normalized;
};

const VEHICLE_TYPE_FILTERS = [
  { label: "All vehicles", value: "" },
  { label: "Cars", value: "car" },
  { label: "Motorcycles", value: "motorcycle" },
  { label: "Vans", value: "van" },
  { label: "Trucks", value: "truck" },
];

const MAX_VEHICLE_SEARCH_LENGTH = 100;
const ALLOWED_VEHICLE_SEARCH_PATTERN = /^[\p{L}\p{N} -]*$/u;

const filterVehicleSearch = (value = "") => String(value || "")
  .normalize("NFKC")
  .replace(/[^\p{L}\p{N} -]/gu, "")
  .replace(/ {2,}/g, " ")
  .replace(/-{2,}/g, "-")
  .replace(/^ +/, "")
  .slice(0, MAX_VEHICLE_SEARCH_LENGTH);

const validateVehicleSearch = (value = "") => {
  const search = String(value || "");
  if (search.length > MAX_VEHICLE_SEARCH_LENGTH) {
    return `Search must be ${MAX_VEHICLE_SEARCH_LENGTH} characters or fewer.`;
  }
  if (!ALLOWED_VEHICLE_SEARCH_PATTERN.test(search)) {
    return "Use letters, numbers, spaces, and hyphens only.";
  }
  if (search.startsWith(" ") || search.includes("  ")) {
    return "Use only one space between search terms.";
  }
  if (search.includes("--")) {
    return "Use only one hyphen at a time.";
  }
  return "";
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
  onNavigateToReports,
}) {
  const [vehicles, setVehicles] = useState([]);
  const [reloadSignal, setReloadSignal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [showBookingAccessModal, setShowBookingAccessModal] = useState(false);
  const [previewVehicle, setPreviewVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState(
    normalizeVehicleType(bookingData.vehicleType || "")
  );

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

  const searchValidationError = useMemo(
    () => validateVehicleSearch(searchQuery),
    [searchQuery]
  );
  const combinedSearch = useMemo(() => searchQuery.trim(), [searchQuery]);

  useEffect(() => {
    if (searchValidationError) {
      setLoading(false);
      return undefined;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await API.getPublicVehicles({
          search: combinedSearch,
          vehicleType: vehicleTypeFilter,
          page: 1,
          limit: 24,
        });

        if (!isActive) return;
        const availableVehicles = (response.vehicles || [])
          .map(normalizeVehicle)
          .filter((vehicle) => vehicle.available);
        setVehicles(availableVehicles);
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
  }, [combinedSearch, searchValidationError, vehicleTypeFilter, reloadSignal]);

  const clearVehicleSearch = () => {
    setSearchQuery("");
    setVehicleTypeFilter("");
  };

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
          onNavigateToReports={onNavigateToReports}
          isAIOpen={showAI}
          onShowAI={() => setShowAI(true)}
          onLogout={onLogout}
        />

        <main className="rp-page-shell mx-auto max-w-[1440px] px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <header className="rp-fleet-header">
            <h1>Choose Your Perfect Ride</h1>
            <p>
              Compare available vehicles from verified owners with clear hourly pricing and
              practical details for every trip.
            </p>
          </header>

          <section className="rp-fleet-results" aria-labelledby="vehicle-results-heading">
              <div className="rp-results-toolbar">
                <div>
                  <span className="rp-page-eyebrow">Explore the fleet</span>
                  <h2 id="vehicle-results-heading">Available vehicles</h2>
                  <p>
                    {loading
                      ? "Checking the latest listings..."
                      : `${vehicles.length} ${vehicles.length === 1 ? "vehicle" : "vehicles"} match your search`}
                  </p>
                </div>
                <div className="rp-vehicle-search">
                  <label htmlFor="vehicle-market-search">Search vehicles</label>
                  <div className="rp-vehicle-search__control">
                    <Search size={20} strokeWidth={2} aria-hidden="true" />
                    <input
                      id="vehicle-market-search"
                      type="search"
                      placeholder="Search available vehicles"
                      maxLength={MAX_VEHICLE_SEARCH_LENGTH}
                      value={searchQuery}
                      aria-invalid={Boolean(searchValidationError)}
                      aria-describedby="vehicle-search-help"
                      onChange={(event) => setSearchQuery(filterVehicleSearch(event.target.value))}
                    />
                  </div>
                  <span
                    id="vehicle-search-help"
                    className={searchValidationError ? "is-error" : ""}
                    role={searchValidationError ? "alert" : undefined}
                  >
                    {searchValidationError || "Letters, numbers, single spaces, and hyphens only."}
                  </span>
                </div>
              </div>

              <div className="rp-quick-filters" role="group" aria-label="Quick vehicle type filters">
                {VEHICLE_TYPE_FILTERS.map((filter) => (
                  <button
                    key={filter.value || "all"}
                    type="button"
                    aria-pressed={vehicleTypeFilter === filter.value}
                    className={vehicleTypeFilter === filter.value ? "is-active" : ""}
                    onClick={() => setVehicleTypeFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {loading && (
                <div role="status" className="rp-results-status">Loading available vehicles...</div>
              )}

              {!loading && error && (
                <div role="alert" className="rp-results-status rp-results-status--error"><span>{error}</span><button type="button" onClick={() => setReloadSignal((value) => value + 1)} className="rounded-lg border border-current px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2">Retry</button></div>
              )}

              {!loading && !error && vehicles.length === 0 && (
                <div className="rp-results-status">
                  <CarFront size={24} />
                  <strong>No vehicles match your search</strong>
                  <span>Try another search term or vehicle type.</span>
                  {(combinedSearch || vehicleTypeFilter) && (
                    <button type="button" onClick={clearVehicleSearch}>Clear search</button>
                  )}
                </div>
              )}

              {!loading && !error && vehicles.length > 0 && (
                <div className="rp-market-grid">
                  {vehicles.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      onPreview={openVehiclePreview}
                      onBookNow={handleBookNow}
                      compactSpecs
                    />
                  ))}
                </div>
              )}
          </section>
        </main>
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
