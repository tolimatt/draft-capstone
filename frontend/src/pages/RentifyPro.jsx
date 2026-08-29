import React, { useEffect, useMemo, useState } from "react";
import {
  Bike,
  Car,
  Fuel,
  MapPin,
  Radio,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Users,
  Van,
  Wrench,
  ArrowRight,
} from "lucide-react";
import Navbar from "../components/Navbar";
import ChatWidget from "../components/ChatWidget";
import VehiclePreviewModal from "../components/VehiclePreviewModal";
import API from "../utils/api";
import {
  formatDateInput,
  getMinPickupDateTime,
  formatTimeInput,
} from "../utils/dateUtils";
import InfoModal from "../components/InfoModal";
import VehicleCover from "../components/VehicleCover";
import { DEFAULT_VEHICLE_IMAGE } from "../utils/media";
import { formatVehicleTypeLabel } from "../utils/vehicleText";

const categories = [
  {
    id: "premium-cars",
    title: "Premium Cars",
    icon: Car,
    image: "/cars-optimized.jpg",
    tags: ["Sedan", "Hatchback", "SUV", "Luxury"],
    description: "Ideal for family trips, business meetings, and city drives.",
    vehicleType: "car",
  },
  {
    id: "motorcycles",
    title: "Motorcycles",
    icon: Bike,
    image: "/motor-optimized.jpg",
    tags: ["Scooter", "Sport Bike", "Cruiser"],
    description: "Great for fast commutes and flexible urban travel.",
    vehicleType: "motorcycle",
  },
  {
    id: "vans",
    title: "Vans",
    icon: Van,
    image: "/van-optimized.jpg",
    tags: ["Passenger", "Mini Van", "Cargo", "Luxury"],
    description: "Spacious and reliable for group trips and transport runs.",
    vehicleType: "van",
  },
  {
    id: "trucks",
    title: "Trucks",
    icon: Truck,
    image: "/trucks-optimized.jpg",
    tags: ["Pick-up", "Cargo", "Refrigerated", "Flat Bed"],
    description: "Built for heavy-duty tasks and dependable hauling.",
    vehicleType: "truck",
  },
];

const pickRandom = (list, count) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

const normalizeFeaturedVehicle = (vehicle) => ({
  id: vehicle._id,
  _id: vehicle._id,
  name: vehicle.name,
  location: vehicle.location,
  coverImageUrl: vehicle.coverImageUrl || vehicle.imageUrl || vehicle.images?.[0] || DEFAULT_VEHICLE_IMAGE,
  image: vehicle.coverImageUrl || vehicle.imageUrl || vehicle.images?.[0] || DEFAULT_VEHICLE_IMAGE,
  coverDisplayMode: vehicle.coverDisplayMode || "auto",
  category: vehicle.specs?.subType
    ? formatVehicleTypeLabel(vehicle.specs?.type, vehicle.specs.subType, { separator: " · " })
    : "Owner-listed Vehicle",
  seats: vehicle.specs?.seats || 4,
  transmission: vehicle.specs?.transmission || "Automatic",
  fuel: vehicle.specs?.fuel || "Gasoline",
  price: Number((vehicle.hourlyRentalRate ?? vehicle.dailyRentalRate) || 0),
  rating: Number.isFinite(Number(vehicle.averageRating ?? vehicle.rating))
    ? Number(Number(vehicle.averageRating ?? vehicle.rating).toFixed(1))
    : 0,
  reviewCount: Number.isFinite(Number(vehicle.reviewCount)) ? Number(vehicle.reviewCount) : 0,
  available: vehicle.availabilityStatus === "available",
  description: vehicle.description || "",
  owner: {
    _id: vehicle.owner?._id || "",
    name: vehicle.owner?.name || "Vehicle Owner",
    email: vehicle.owner?.email || "",
    avatar: vehicle.owner?.avatar || "",
    verified: vehicle.owner?.verified !== false,
  },
  codingDay: "",
});

const featureItems = [
  {
    icon: Sparkles,
    title: "AI-Powered Suggestions",
    description: "Get smarter recommendations based on your preferred routes and vehicle types.",
  },
  {
    icon: Shield,
    title: "Secure Booking Flow",
    description: "Transparent booking updates with secure data handling for every reservation.",
  },
  {
    icon: Radio,
    title: "Fast Online Rentals",
    description: "Compare, reserve, and confirm vehicles in minutes with a clean booking process.",
  },
];

const aboutValues = [
  {
    title: "Quality Vehicles",
    description: "All vehicles are inspected and maintained for safety and reliability.",
    icon: Wrench,
  },
  {
    title: "Customer Experience",
    description: "Simple booking flow and responsive support across every trip stage.",
    icon: Users,
  },
  {
    title: "Trust & Transparency",
    description: "Clear rates, honest policies, and transparent booking updates.",
    icon: ShieldCheck,
  },
];

const locations = [
  "Urdaneta City, Pangasinan",
  "Dagupan City, Pangasinan",
  "Calasiao, Pangasinan",
  "Lingayen, Pangasinan",
  "Mangaldan, Pangasinan",
  "University of Pangasinan",
  "San Carlos City, Pangasinan",
  "Sta Barbara, Pangasinan",
  "SM Dagupan",
  "Robinsons Place Pangasinan",
];

const getDefaultSearchDates = () => {
  const minPickupDateTime = getMinPickupDateTime();
  const pickupDate = formatDateInput(minPickupDateTime);
  const pickupTime = formatTimeInput(minPickupDateTime);

  const nextDay = new Date(`${pickupDate}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const returnDate = formatDateInput(nextDay);

  return {
    pickupDate,
    pickupTime,
    returnDate,
    returnTime: pickupTime,
  };
};

const normalizeVehicleType = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "motor") return "motorcycle";
  return normalized;
};

const mapSearchPayload = (location, vehicleType) => ({
  location: String(location || "").trim(),
  vehicleType: normalizeVehicleType(vehicleType),
  ...getDefaultSearchDates(),
});

export default function RentifyPro({
  onNavigateToHome,
  onNavigateToSignIn,
  onNavigateToVehicles,
  onNavigateToRegister,
  onNavigateToAbout,
  onNavigateToContacts,
  onNavigateToChat,
  onNavigateToNotifications,
  onSearch,
  onViewDetails,
  onNavigateToBookingHistory,
  onNavigateToAccountSettings,
  onNavigateToReports,
  onNavigateToPrivacyPolicy,
  onNavigateToTermsAndConditions,
  onOpenNotificationsModal,
  isLoggedIn,
  user,
  onLogout,
}) {
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState("");
  const [location, setLocation] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [vehicleType, setVehicleType] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0].id);
  const [showAI, setShowAI] = useState(false);
  const [previewVehicle, setPreviewVehicle] = useState(null);
  const [validationModalMessage, setValidationModalMessage] = useState("");

  const filteredLocations = useMemo(
    () =>
      locations.filter((entry) =>
        entry.toLowerCase().includes(location.trim().toLowerCase())
      ),
    [location]
  );

  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) || categories[0];

  const selectVehicleCategory = (category) => {
    setActiveCategoryId(category.id);
    setVehicleType(category.vehicleType);
  };

  const handleSearch = (typeOverride = vehicleType) => {
    const normalizedLocation = location.trim();
    const normalizedType = String(typeOverride || "").trim();
    if (!normalizedLocation && !normalizedType) {
      setValidationModalMessage("Please enter a location or choose a vehicle type to search.");
      return;
    }
    onSearch(mapSearchPayload(location, typeOverride));
  };

  useEffect(() => {
    let active = true;
    const loadFeatured = async () => {
      setFeaturedLoading(true);
      setFeaturedError("");
      try {
        const response = await API.getPublicVehicles({ page: 1, limit: 24 });
        if (!active) return;
        const availableVehicles = (response.vehicles || [])
          .map(normalizeFeaturedVehicle)
          .filter((vehicle) => vehicle.available);
        setFeaturedVehicles(pickRandom(availableVehicles, 3));
      } catch (err) {
        if (!active) return;
        setFeaturedError(err.message || "Failed to load featured vehicles.");
      } finally {
        if (active) setFeaturedLoading(false);
      }
    };

    loadFeatured();
    return () => {
      active = false;
    };
  }, []);

  const openVehiclePreview = (vehicle) => {
    setPreviewVehicle(vehicle);
  };

  const closeVehiclePreview = () => {
    setPreviewVehicle(null);
  };

  const handleFeaturedBookNow = (vehicle) => {
    if (!vehicle) return;
    if (!isLoggedIn) {
      onNavigateToSignIn?.();
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
    <div id="home" className="rp-renter-home min-h-screen">
      <Navbar
        activePage="home"
        isLoggedIn={isLoggedIn}
        user={user}
        isAIOpen={showAI}
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
        onShowAI={() => setShowAI(true)}
        onLogout={onLogout}
      />

      <section className="relative mx-auto max-w-7xl overflow-hidden pt-28 sm:rounded-b-[2rem] sm:pt-36 pb-28">
        <img
          src="/hero-car1-optimized.jpg"
          alt="RentifyPro Hero"
          className="rp-home-hero-image absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617]/80 via-[#0f172a]/60 to-[#0B75E7]/50" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl rp-animate-fade-up">
            <span className="rp-chip bg-white/18 text-white border border-white/30">
              Premium Mobility Marketplace
            </span>
            <h1 className="text-white mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              Rent Smarter.
              <br />
              Drive Better.
            </h1>
            <p className="text-blue-100 mt-5 max-w-2xl text-base sm:text-lg">
              Discover cars, motorcycles, vans, and trucks with a modern booking experience built
              for convenience and confidence.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={onNavigateToVehicles} className="rp-btn-primary px-6 py-3 text-sm sm:text-base">
                Browse Vehicles
              </button>
              <button onClick={onNavigateToAbout} className="rp-btn-secondary px-6 py-3 text-sm sm:text-base">
                Learn More
              </button>
            </div>
          </div>

        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-16 max-w-6xl px-4 sm:-mt-20 sm:px-6">
        <div className="rp-surface p-5 sm:p-7">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 relative">
              <label className="text-xs font-semibold text-slate-500">Location</label>
              <div className="relative mt-1.5">
                <MapPin
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0B75E7]"
                />
                <input
                  value={location}
                  onChange={(event) => {
                    setLocation(event.target.value);
                    setShowLocationSuggestions(true);
                  }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onBlur={() => {
                    window.setTimeout(() => setShowLocationSuggestions(false), 120);
                  }}
                  className="rp-input pr-9"
                  placeholder="Search location"
                />
              </div>

              {showLocationSuggestions && location && filteredLocations.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto">
                  {filteredLocations.map((entry) => (
                    <button
                      key={entry}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setLocation(entry);
                        setShowLocationSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#0B75E7]/10 flex items-center gap-2"
                    >
                      <MapPin size={14} className="text-[#0B75E7]" />
                      {entry}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Vehicle Type</label>
              <div className="mt-1.5">
                <select
                  className="rp-input cursor-pointer"
                  value={vehicleType}
                  onChange={(event) => {
                    const nextVehicleType = event.target.value;
                    setVehicleType(nextVehicleType);
                    const matchingCategory = categories.find(
                      (category) => category.vehicleType === nextVehicleType
                    );
                    if (matchingCategory) setActiveCategoryId(matchingCategory.id);
                  }}
                >
                  <option value="">All Vehicles</option>
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <button
              onClick={() => handleSearch()}
              className="rp-btn-primary px-8 py-3 text-sm sm:text-base flex items-center gap-2"
            >
              <Search size={18} />
              Search Available Vehicles
            </button>
          </div>
        </div>
      </section>

      <section id="categories" className="rp-home-section mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="rp-section-heading max-w-2xl">
            <span className="rp-page-eyebrow">Browse by vehicle type</span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              What are you looking to <span className="text-[#0B75E7]">drive?</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600 sm:text-base">
            Choose a category to see available vehicles, rates, and pickup options near you.
          </p>
        </div>

        <div className="rp-vehicle-selector">
          <div className="rp-vehicle-selector__choices">
            <div className="rp-vehicle-selector__intro">
              <span>Vehicle collection</span>
              <strong>Choose your drive</strong>
            </div>

            <div className="rp-vehicle-selector__list" role="group" aria-label="Choose a vehicle type">
              {categories.map((category, index) => {
                const isActive = category.id === activeCategory.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => selectVehicleCategory(category)}
                    className={`rp-vehicle-selector__option ${isActive ? "is-active" : ""}`}
                  >
                    <span className="rp-vehicle-selector__number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="rp-vehicle-selector__icon" aria-hidden="true">
                      <category.icon size={19} />
                    </span>
                    <span className="rp-vehicle-selector__label">{category.title}</span>
                    <ArrowRight className="rp-vehicle-selector__arrow" size={18} aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            <p className="rp-vehicle-selector__hint">
              Select a type to preview it, then continue to matching listings.
            </p>
          </div>

          <article className="rp-vehicle-selector__preview">
            <img
              src={activeCategory.image}
              alt={`${activeCategory.title} available on RentifyPro`}
              className="rp-vehicle-selector__image"
            />
            <span className="rp-vehicle-selector__shade" aria-hidden="true" />

            <div className="rp-vehicle-selector__meta">
              <span>
                {String(categories.indexOf(activeCategory) + 1).padStart(2, "0")} / {String(categories.length).padStart(2, "0")}
              </span>
              <span>Available in the marketplace</span>
            </div>

            <div className="rp-vehicle-selector__details">
              <span className="rp-vehicle-selector__active-icon" aria-hidden="true">
                <activeCategory.icon size={21} />
              </span>
              <p className="rp-vehicle-selector__eyebrow">Selected vehicle type</p>
              <h3>{activeCategory.title}</h3>
              <p className="rp-vehicle-selector__description">{activeCategory.description}</p>

              <div className="rp-vehicle-selector__tags" aria-label={`${activeCategory.title} examples`}>
                {activeCategory.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSearch(activeCategory.vehicleType)}
                className="rp-vehicle-selector__browse"
              >
                Browse {activeCategory.title}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>
      </section>

      <section id="featured" className="scroll-mt-24 bg-white/55 py-16 backdrop-blur-[2px] sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="rp-section-heading max-w-2xl">
              <span className="rp-page-eyebrow">Available near you</span>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Featured <span className="text-[#0B75E7]">vehicles</span>
              </h2>
              <p className="mt-3 text-slate-600">A small selection of verified listings ready to book.</p>
            </div>
            <button type="button" onClick={onNavigateToVehicles} className="rp-btn-secondary self-start px-4 py-2.5 text-sm sm:self-auto">
              View all vehicles
              <ArrowRight size={16} />
            </button>
          </div>

          {featuredError && (
            <div className="rp-surface p-6 text-sm text-rose-600">{featuredError}</div>
          )}
          {!featuredLoading && !featuredError && featuredVehicles.length === 0 && (
            <div className="rp-surface p-6 text-sm text-slate-600">
              No available vehicles to feature right now.
            </div>
          )}

          {!featuredLoading && !featuredError && featuredVehicles.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featuredVehicles.map((vehicle) => (
                <article
                  key={vehicle.id}
                  className="rp-featured-card flex h-full flex-col overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => openVehiclePreview(vehicle)}
                    className="rp-featured-card__preview text-left"
                    aria-label={`View details for ${vehicle.name}`}
                  >
                    <span className="block px-3 pt-3">
                      <VehicleCover vehicle={vehicle} alt={vehicle.name} contentClassName="p-4 sm:p-5">
                        <span className={`absolute left-3 top-3 z-10 rp-chip ${vehicle.available ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                          {vehicle.available ? "Available" : "Unavailable"}
                        </span>
                        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white">
                          <Star size={12} fill="currentColor" />
                          {vehicle.reviewCount > 0 ? vehicle.rating : "New"}
                        </span>
                      </VehicleCover>
                    </span>

                    <span className="block px-5 pb-4 pt-5">
                      <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{vehicle.category}</span>
                      <span className="mt-1 flex items-start justify-between gap-4">
                        <span className="text-xl font-bold tracking-tight text-slate-900">{vehicle.name}</span>
                        <span className="mt-1 text-[#0B75E7]" aria-hidden="true"><ArrowRight size={18} /></span>
                      </span>
                      <span className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin size={14} className="shrink-0 text-[#0B75E7]" />
                        <span className="truncate">{vehicle.location}</span>
                      </span>

                      <span className="mt-5 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-100 py-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5 pr-2"><Users size={14} className="text-slate-400" />{vehicle.seats} seats</span>
                        <span className="flex items-center gap-1.5 px-3"><Settings size={14} className="text-slate-400" /><span className="truncate">{vehicle.transmission}</span></span>
                        <span className="flex items-center gap-1.5 pl-3"><Fuel size={14} className="text-slate-400" /><span className="truncate">{vehicle.fuel}</span></span>
                      </span>
                    </span>
                  </button>

                  <div className="mt-auto flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-4">
                    <p className="text-2xl font-bold tracking-tight text-slate-900">
                      P{vehicle.price.toLocaleString()}
                      <span className="ml-1 text-xs font-medium text-slate-500">/ hour</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => handleFeaturedBookNow(vehicle)}
                      disabled={!vehicle.available}
                      className="rp-btn-primary min-h-10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                    >
                      {vehicle.available ? "Book now" : "Unavailable"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="about" className="rp-home-section mx-auto max-w-7xl scroll-mt-28 px-5 py-16 sm:px-8 sm:py-20">
        <div className="rp-section-heading mb-10 text-center">
          <span className="rp-page-eyebrow">Built for better journeys</span>
          <h2 className="text-3xl sm:text-4xl font-bold">
            About <span className="text-[#0B75E7]">RentifyPro</span>
          </h2>
          <p className="text-slate-600 mt-3">
            Your trusted partner for vehicle rentals in the Philippines.
          </p>
        </div>

        <article className="rp-surface p-6 sm:p-8 mb-8">
          <h3 className="text-2xl font-bold mb-4">
            Our <span className="text-[#0B75E7]">Story</span>
          </h3>
          <p className="text-slate-600 mb-4">
            RentifyPro started with one goal: make vehicle rentals easy, reliable, and accessible.
            From a small local fleet, we have grown into a platform that helps renters and owners
            connect with confidence.
          </p>
          <p className="text-slate-600 mb-4">
            Whether it is for business, family trips, or daily transport, we focus on a smooth
            booking experience with practical tools and secure transactions.
          </p>
          <p className="text-slate-600">
            We continue improving the platform to deliver better mobility options for more users.
          </p>
        </article>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {aboutValues.map((item) => (
            <article key={item.title} className="rp-surface rp-hover-lift p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0B75E7]/10 text-[#0B75E7] flex items-center justify-center">
                <item.icon size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
              <p className="text-sm text-slate-600 mt-2">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rp-home-section mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pb-20">
        <div className="rp-section-heading mb-10 text-center">
          <span className="rp-page-eyebrow">Simple, secure, dependable</span>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Why Choose <span className="text-[#0B75E7]">RentifyPro</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featureItems.map((item) => (
            <article key={item.title} className="rp-surface rp-hover-lift p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0B75E7]/10 text-[#0B75E7] flex items-center justify-center">
                <item.icon size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
              <p className="text-sm text-slate-600 mt-2">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer
        id="contacts"
        className="mx-auto mt-8 max-w-7xl overflow-hidden bg-gradient-to-r from-[#045FC3] to-[#0B75E7] py-14 text-white sm:rounded-t-[2rem]"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold">RentifyPro</h3>
              <p className="text-blue-100 mt-3 text-sm">
                Your trusted partner for vehicle rentals in the Philippines.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-blue-100 text-sm">
                <li>
                  <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateToVehicles}>Vehicles</button>
                </li>
                <li>
                  <button onClick={onNavigateToBookingHistory}>Bookings</button>
                </li>
                <li>
                  <button onClick={onNavigateToAbout}>About</button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3">Vehicle Categories</h4>
              <ul className="space-y-2 text-blue-100 text-sm">
                <li>Cars</li>
                <li>Motorcycles</li>
                <li>Vans</li>
                <li>Trucks</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3">Contact</h4>
              <ul className="space-y-2 text-blue-100 text-sm">
                <li>+63 912 324 5678</li>
                <li>message@rentifypro.com</li>
                <li>Dagupan, Pangasinan</li>
                <li>Philippines</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blue-400/50 mt-10 pt-5 flex flex-col sm:flex-row items-center justify-between text-blue-100 text-sm gap-2">
            <p>Copyright 2026 RentifyPro. All rights reserved.</p>
            <div className="flex gap-5">
              <button onClick={onNavigateToPrivacyPolicy}>Privacy Policy</button>
              <button onClick={onNavigateToTermsAndConditions}>Terms and Conditions</button>
            </div>
          </div>
        </div>
      </footer>

      <ChatWidget
        isOpen={showAI}
        onClose={() => setShowAI(false)}
        onViewAvailableVehicles={onNavigateToVehicles}
      />
      <VehiclePreviewModal
        isOpen={Boolean(previewVehicle)}
        vehicle={previewVehicle}
        onClose={closeVehiclePreview}
        onBookNow={() => {
          if (!previewVehicle) return;
          closeVehiclePreview();
          handleFeaturedBookNow(previewVehicle);
        }}
        onChatOwner={() => {
          if (!previewVehicle) return;
          closeVehiclePreview();
          handleChatOwner(previewVehicle);
        }}
        disableChat={disablePreviewChat}
      />
      <InfoModal
        isOpen={Boolean(validationModalMessage)}
        title="RentifyPro says"
        message={validationModalMessage}
        onClose={() => setValidationModalMessage("")}
      />
    </div>
  );
}
