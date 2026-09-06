import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  CarFront,
  Fuel,
  MapPin,
  Search,
  Settings,
  Star,
  Truck,
  Users,
  Van,
  ArrowRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  KeyRound,
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
    icon: CarFront,
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
    image: "/ai powered suggestions.jpg",
    title: "AI-Powered Suggestions",
    description: "Get smarter recommendations based on your preferred routes and vehicle types.",
  },
  {
    image: "/secure booking flow.jpg",
    title: "Secure Booking Flow",
    description: "Transparent booking updates with secure data handling for every reservation.",
  },
  {
    image: "/online rentals.jpg",
    title: "Fast Online Rentals",
    description: "Compare, reserve, and confirm vehicles in minutes with a clean booking process.",
  },
];

const aboutValues = [
  {
    title: "Quality Vehicles",
    description: "All vehicles are inspected and maintained for safety and reliability.",
    image: "/about-quality-vehicles.png",
  },
  {
    title: "Customer Experience",
    description: "Simple booking flow and responsive support across every trip stage.",
    image: "/about-customer-experience.png",
  },
  {
    title: "Trust & Transparency",
    description: "Clear rates, honest policies, and transparent booking updates.",
    image: "/about-trust-transparency.png",
  },
];

const processSteps = [
  {
    number: "01",
    icon: Search,
    title: "Find a Vehicle",
    description: "Search available vehicles by location, category, schedule, or keywords.",
  },
  {
    number: "02",
    icon: CalendarCheck,
    title: "Book Securely",
    description: "Choose your rental schedule and complete your booking using RentifyPro's supported payment options.",
  },
  {
    number: "03",
    icon: KeyRound,
    title: "Pick Up & Drive",
    description: "Coordinate with the vehicle owner, start your rental, and manage your booking directly through RentifyPro.",
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

function CategoryPreview({ category, className = "", onBrowse }) {
  const CategoryIcon = category.icon;
  const categoryIndex = categories.findIndex((item) => item.id === category.id);

  return (
    <article className={`rp-vehicle-selector__preview ${className}`}>
      <img
        src={category.image}
        alt={`${category.title} available on RentifyPro`}
        className="rp-vehicle-selector__image"
        loading="lazy"
      />
      <span className="rp-vehicle-selector__shade" aria-hidden="true" />

      <div className="rp-vehicle-selector__meta">
        <span>
          {String(categoryIndex + 1).padStart(2, "0")} / {String(categories.length).padStart(2, "0")}
        </span>
        <span>Available in the marketplace</span>
      </div>

      <div className="rp-vehicle-selector__details">
        <span className="rp-vehicle-selector__active-icon" aria-hidden="true">
          <CategoryIcon size={24} strokeWidth={2} />
        </span>
        <p className="rp-vehicle-selector__eyebrow">Selected vehicle type</p>
        <h3>{category.title}</h3>
        <p className="rp-vehicle-selector__description">{category.description}</p>

        <div className="rp-vehicle-selector__tags" aria-label={`${category.title} examples`}>
          {category.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        {onBrowse && (
          <button type="button" onClick={onBrowse} className="rp-vehicle-selector__browse">
            Browse {category.title}
            <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

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
  const [displayedCategory, setDisplayedCategory] = useState(categories[0]);
  const [outgoingCategory, setOutgoingCategory] = useState(null);
  const [categoryTransitionDirection, setCategoryTransitionDirection] = useState("next");
  const [featuredNavigation, setFeaturedNavigation] = useState({
    canGoPrevious: false,
    canGoNext: false,
  });
  const [showAI, setShowAI] = useState(false);
  const [previewVehicle, setPreviewVehicle] = useState(null);
  const [validationModalMessage, setValidationModalMessage] = useState("");
  const homeRef = useRef(null);
  const categoryCarouselRef = useRef(null);
  const featuredCarouselRef = useRef(null);
  const categoryTransitionTimeoutRef = useRef(null);
  const categoryScrollFrameRef = useRef(null);
  const featuredScrollFrameRef = useRef(null);

  const filteredLocations = useMemo(
    () =>
      locations.filter((entry) =>
        entry.toLowerCase().includes(location.trim().toLowerCase())
      ),
    [location]
  );

  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) || categories[0];

  const selectVehicleCategory = (category, { scrollMobileCard = false } = {}) => {
    const currentIndex = categories.findIndex((item) => item.id === activeCategoryId);
    const nextIndex = categories.findIndex((item) => item.id === category.id);

    if (category.id !== activeCategoryId) {
      window.clearTimeout(categoryTransitionTimeoutRef.current);
      setCategoryTransitionDirection(nextIndex > currentIndex ? "next" : "previous");
      setOutgoingCategory(displayedCategory);
      setDisplayedCategory(category);
      categoryTransitionTimeoutRef.current = window.setTimeout(() => {
        setOutgoingCategory(null);
      }, 520);
    }

    setActiveCategoryId(category.id);
    setVehicleType(category.vehicleType);

    if (scrollMobileCard && window.matchMedia?.("(max-width: 767px)").matches) {
      const target = categoryCarouselRef.current?.querySelector(
        `[data-category-card="${category.id}"]`
      );
      target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    }
  };

  const handleCategoryCarouselScroll = (event) => {
    const carousel = event.currentTarget;
    window.cancelAnimationFrame(categoryScrollFrameRef.current);
    categoryScrollFrameRef.current = window.requestAnimationFrame(() => {
      const cards = Array.from(carousel.querySelectorAll("[data-category-card]"));
      const closestCard = cards.reduce((closest, card) => (
        Math.abs(card.offsetLeft - carousel.scrollLeft) < Math.abs(closest.offsetLeft - carousel.scrollLeft)
          ? card
          : closest
      ), cards[0]);
      const category = categories.find((item) => item.id === closestCard?.dataset.categoryCard);

      if (category && category.id !== activeCategoryId) {
        setActiveCategoryId(category.id);
        setVehicleType(category.vehicleType);
        setDisplayedCategory(category);
        setOutgoingCategory(null);
      }
    });
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
        setFeaturedVehicles(pickRandom(availableVehicles, 4));
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

  useEffect(() => () => {
    window.clearTimeout(categoryTransitionTimeoutRef.current);
    window.cancelAnimationFrame(categoryScrollFrameRef.current);
    window.cancelAnimationFrame(featuredScrollFrameRef.current);
  }, []);

  useEffect(() => {
    const carousel = featuredCarouselRef.current;
    if (!carousel) return undefined;

    const syncNavigation = () => {
      const maximumScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
      setFeaturedNavigation({
        canGoPrevious: carousel.scrollLeft > 2,
        canGoNext: carousel.scrollLeft < maximumScroll - 2,
      });
    };
    const handleScroll = () => {
      window.cancelAnimationFrame(featuredScrollFrameRef.current);
      featuredScrollFrameRef.current = window.requestAnimationFrame(syncNavigation);
    };
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(syncNavigation);

    syncNavigation();
    carousel.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver?.observe(carousel);

    return () => {
      carousel.removeEventListener("scroll", handleScroll);
      resizeObserver?.disconnect();
    };
  }, [featuredVehicles.length]);

  useEffect(() => {
    const landing = homeRef.current;
    if (!landing) return undefined;

    const targets = Array.from(landing.querySelectorAll("[data-rp-reveal]"))
      .filter((element) => !element.classList.contains("is-visible"));

    if (targets.length === 0) return undefined;

    const reveal = (element) => element.classList.add("is-visible");
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach(reveal);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [featuredVehicles.length]);

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

  const scrollFeaturedVehicles = (direction) => {
    const carousel = featuredCarouselRef.current;
    const firstCard = carousel?.querySelector("[data-featured-card]");
    if (!carousel || !firstCard) return;

    const cardWidth = firstCard.getBoundingClientRect().width;
    carousel.scrollBy({ left: direction * (cardWidth + 24), behavior: "smooth" });
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
    <div ref={homeRef} id="home" className="rp-renter-home min-h-screen">
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
          className="rp-home-hero-image rp-hero-parallax absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617]/80 via-[#0f172a]/60 to-[#0B75E7]/50" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl rp-hero-motion">
            <span className="rp-hero-motion__eyebrow rp-chip bg-white/18 text-white border border-white/30">
              Premium Mobility Marketplace
            </span>
            <h1 className="rp-hero-motion__title text-white mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              Rent Smarter.
              <br />
              Drive Better.
            </h1>
            <p className="rp-hero-motion__copy text-blue-100 mt-5 max-w-2xl text-base sm:text-lg">
              Discover cars, motorcycles, vans, and trucks with a modern booking experience built
              for convenience and confidence.
            </p>

            <div className="rp-hero-motion__actions mt-8 flex flex-wrap items-center gap-3">
              <span className="rp-hero-motion__action">
                <button onClick={onNavigateToVehicles} className="rp-btn-primary px-6 py-3 text-sm sm:text-base">
                  Browse Vehicles
                </button>
              </span>
              <span className="rp-hero-motion__action">
                <button onClick={onNavigateToAbout} className="rp-btn-secondary px-6 py-3 text-sm sm:text-base">
                  Learn More
                </button>
              </span>
            </div>
          </div>

        </div>
      </section>

      <section className="rp-hero-search relative z-20 mx-auto -mt-16 max-w-6xl px-4 sm:-mt-20 sm:px-6">
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
                      <MapPin size={16} strokeWidth={2} className="text-[#0B75E7]" aria-hidden="true" />
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
                    const matchingCategory = categories.find((category) => (
                      category.vehicleType === nextVehicleType
                    ));
                    if (matchingCategory) selectVehicleCategory(matchingCategory);
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
        <div
          className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between rp-scroll-reveal rp-reveal-up"
          data-rp-reveal=""
        >
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

        <div className="rp-vehicle-selector rp-scroll-reveal rp-reveal-card" data-rp-reveal="">
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
                    onClick={() => selectVehicleCategory(category, { scrollMobileCard: true })}
                    className={`rp-vehicle-selector__option rp-scroll-reveal rp-reveal-from-left ${isActive ? "is-active" : ""}`}
                    data-rp-reveal=""
                    style={{ "--rp-reveal-delay": `${120 + index * 90}ms` }}
                  >
                    <span className="rp-vehicle-selector__number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="rp-vehicle-selector__icon" aria-hidden="true">
                      <category.icon size={24} strokeWidth={2} />
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

          <div
            className="rp-vehicle-selector__desktop-stage rp-scroll-reveal rp-reveal-image"
            data-rp-reveal=""
            style={{ "--rp-reveal-delay": "180ms" }}
            aria-live="polite"
          >
            {outgoingCategory && (
              <CategoryPreview
                category={outgoingCategory}
                className={`rp-vehicle-selector__preview--outgoing rp-vehicle-selector__preview--${categoryTransitionDirection}`}
                onBrowse={() => handleSearch(outgoingCategory.vehicleType)}
              />
            )}
            <CategoryPreview
              key={displayedCategory.id}
              category={displayedCategory}
              className={`rp-vehicle-selector__preview--active ${
                outgoingCategory ? `rp-vehicle-selector__preview--enter-${categoryTransitionDirection}` : ""
              }`}
              onBrowse={() => handleSearch(displayedCategory.vehicleType)}
            />
          </div>

          <div
            ref={categoryCarouselRef}
            className="rp-vehicle-selector__mobile-carousel"
            aria-label="Swipe through vehicle categories"
            onScroll={handleCategoryCarouselScroll}
          >
            {categories.map((category) => (
              <div
                key={category.id}
                className="rp-vehicle-selector__mobile-slide"
                data-category-card={category.id}
              >
                <CategoryPreview
                  category={category}
                  onBrowse={() => handleSearch(category.vehicleType)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="featured" className="rp-featured-section scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div
            className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between rp-scroll-reveal rp-reveal-up"
            data-rp-reveal=""
          >
            <div className="rp-section-heading max-w-2xl">
              <span className="rp-page-eyebrow">Available near you</span>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Featured <span className="text-[#0B75E7]">vehicles</span>
              </h2>
              <p className="mt-3 text-slate-600">A small selection of verified listings ready to book.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              <div className="rp-featured-carousel__controls" role="group" aria-label="Featured vehicle navigation">
                <button
                  type="button"
                  className="rp-featured-carousel__arrow"
                  onClick={() => scrollFeaturedVehicles(-1)}
                  disabled={!featuredNavigation.canGoPrevious}
                  aria-label="Previous vehicles"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="rp-featured-carousel__arrow"
                  onClick={() => scrollFeaturedVehicles(1)}
                  disabled={!featuredNavigation.canGoNext}
                  aria-label="Next vehicles"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
              <button type="button" onClick={onNavigateToVehicles} className="rp-btn-secondary px-4 py-2.5 text-sm">
                View all vehicles
                <ArrowRight size={16} />
              </button>
            </div>
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
            <div
              ref={featuredCarouselRef}
              className="rp-featured-carousel"
              role="region"
              aria-label="Featured vehicles"
              tabIndex="0"
            >
              {featuredVehicles.map((vehicle, index) => (
                <article
                  key={vehicle.id}
                  className="rp-featured-card rp-scroll-reveal rp-reveal-card flex h-full flex-col overflow-hidden"
                  data-rp-reveal=""
                  data-featured-card=""
                  style={{ "--rp-reveal-delay": `${index * 90}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => openVehiclePreview(vehicle)}
                    className="rp-featured-card__preview text-left"
                    aria-label={`View details for ${vehicle.name}`}
                  >
                    <span className="rp-featured-card__media">
                      <VehicleCover
                        vehicle={vehicle}
                        alt={vehicle.name}
                        contentClassName="p-4 sm:p-5"
                        imageClassName="rp-reveal-media-image"
                      >
                        <span className={`absolute left-3 top-3 z-10 rp-featured-card__availability ${vehicle.available ? "is-available" : ""}`}>
                          {vehicle.available ? "Available" : "Unavailable"}
                        </span>
                        <span className="rp-featured-card__rating absolute right-3 top-3 z-10">
                          <Star size={16} strokeWidth={2} fill="currentColor" aria-hidden="true" />
                          {vehicle.reviewCount > 0 ? vehicle.rating : "New"}
                        </span>
                      </VehicleCover>
                    </span>
                  </button>

                  <div className="rp-featured-card__body">
                    <div className="rp-featured-card__topline">
                      <span>{vehicle.category}</span>
                      <span className="rp-featured-card__price">
                        <strong>₱{vehicle.price.toLocaleString()}</strong>
                        <span>/ hour</span>
                      </span>
                    </div>
                    <h3>{vehicle.name}</h3>
                    <p className="rp-featured-card__location">
                      <MapPin size={16} strokeWidth={2} aria-hidden="true" />
                      <span>{vehicle.location}</span>
                    </p>

                    <div className="rp-featured-card__specs" aria-label={`${vehicle.name} specifications`}>
                      <span><Users size={16} strokeWidth={2} aria-hidden="true" />{vehicle.seats} seats</span>
                      <span><Settings size={16} strokeWidth={2} aria-hidden="true" />{vehicle.transmission}</span>
                      <span><Fuel size={16} strokeWidth={2} aria-hidden="true" />{vehicle.fuel}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFeaturedBookNow(vehicle)}
                      disabled={!vehicle.available}
                      className="rp-featured-card__book rp-btn-primary disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                    >
                      {vehicle.available ? "Book now" : "Unavailable"}
                      {vehicle.available && <ArrowRight size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="rp-how-it-works scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div
            className="rp-how-it-works__heading rp-scroll-reveal rp-reveal-up"
            data-rp-reveal=""
          >
            <span className="rp-page-eyebrow">A simple way to rent</span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">How RentifyPro Works</h2>
            <p>
              From your first search to the moment you drive away, every step stays clear and in your control.
            </p>
          </div>

          <div className="rp-process-stack">
            {processSteps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <article
                  key={step.number}
                  className="rp-process-step rp-scroll-reveal rp-reveal-card"
                  data-rp-reveal=""
                  style={{
                    "--rp-process-top": `${5.75 + index * 1.1}rem`,
                    "--rp-reveal-delay": `${index * 90}ms`,
                    zIndex: index + 1,
                  }}
                >
                  <div className="rp-process-step__number" aria-hidden="true">{step.number}</div>
                  <div className="rp-process-step__icon" aria-hidden="true">
                    <StepIcon size={32} strokeWidth={2} />
                  </div>
                  <div className="rp-process-step__content">
                    <span>Step {index + 1}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="about" className="rp-home-section mx-auto max-w-7xl scroll-mt-28 px-5 py-16 sm:px-8 sm:py-20">
        <div
          className="rp-section-heading mb-10 text-center rp-scroll-reveal rp-reveal-up"
          data-rp-reveal=""
        >
          <span className="rp-page-eyebrow">Built for better journeys</span>
          <h2 className="text-3xl sm:text-4xl font-bold">
            About <span className="text-[#0B75E7]">RentifyPro</span>
          </h2>
          <p className="text-slate-600 mt-3">
            Your trusted partner for vehicle rentals in the Philippines.
          </p>
        </div>

        <article
          className="rp-surface rp-scroll-reveal rp-reveal-from-left p-6 sm:p-8 mb-8"
          data-rp-reveal=""
          style={{ "--rp-reveal-delay": "80ms" }}
        >
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

        <div className="grid gap-5 md:grid-cols-12 md:auto-rows-fr">
          {aboutValues.map((item, index) => (
            <article
              key={item.title}
              className={`group rp-surface rp-hover-lift rp-scroll-reveal rp-reveal-card overflow-hidden ${
                index === 1 ? "rp-reveal-from-right" : index === 2 ? "rp-reveal-from-left" : ""
              } ${
                index === 0
                  ? "md:col-span-5 md:row-span-2"
                  : "sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:col-span-7"
              }`}
              data-rp-reveal=""
              style={{ "--rp-reveal-delay": `${index * 100}ms` }}
            >
              <div
                className={`overflow-hidden bg-[#edf6ff] ${
                  index === 0 ? "aspect-[16/9]" : "h-52 sm:h-full sm:min-h-44"
                }`}
              >
                <img
                  src={item.image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="rp-reveal-media-image h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>

              <div className={`flex flex-col justify-center ${index === 0 ? "p-7" : "p-6 sm:p-7"}`}>
                <div className="mb-4 h-1 w-10 rounded-full bg-[#0B75E7]" />
                <h3 className="text-xl font-bold tracking-tight text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rp-home-section mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pb-20">
        <div
          className="rp-section-heading mb-10 text-center rp-scroll-reveal rp-reveal-up"
          data-rp-reveal=""
        >
          <span className="rp-page-eyebrow">Simple, secure, dependable</span>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Why Choose <span className="text-[#0B75E7]">RentifyPro</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {featureItems.map((item, index) => (
            <article
              key={item.title}
              className="group rp-surface rp-hover-lift rp-scroll-reveal rp-reveal-card flex h-full flex-col overflow-hidden text-left"
              data-rp-reveal=""
              style={{ "--rp-reveal-delay": `${index * 100}ms` }}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img
                  src={item.image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="rp-reveal-media-image h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <h3 className="text-xl font-bold tracking-tight text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
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
            <div className="rp-scroll-reveal rp-reveal-up" data-rp-reveal="">
              <h3 className="text-2xl font-bold">RentifyPro</h3>
              <p className="text-blue-100 mt-3 text-sm">
                Your trusted partner for vehicle rentals in the Philippines.
              </p>
            </div>

            <div
              className="rp-scroll-reveal rp-reveal-up"
              data-rp-reveal=""
              style={{ "--rp-reveal-delay": "80ms" }}
            >
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

            <div
              className="rp-scroll-reveal rp-reveal-up"
              data-rp-reveal=""
              style={{ "--rp-reveal-delay": "160ms" }}
            >
              <h4 className="font-bold mb-3">Vehicle Categories</h4>
              <ul className="space-y-2 text-blue-100 text-sm">
                <li>Cars</li>
                <li>Motorcycles</li>
                <li>Vans</li>
                <li>Trucks</li>
              </ul>
            </div>

            <div
              className="rp-scroll-reveal rp-reveal-up"
              data-rp-reveal=""
              style={{ "--rp-reveal-delay": "240ms" }}
            >
              <h4 className="font-bold mb-3">Contact</h4>
              <ul className="space-y-2 text-blue-100 text-sm">
                <li>+63 912 324 5678</li>
                <li>message@rentifypro.com</li>
                <li>Dagupan, Pangasinan</li>
                <li>Philippines</li>
              </ul>
            </div>
          </div>

          <div
            className="border-t border-blue-400/50 mt-10 pt-5 flex flex-col sm:flex-row items-center justify-between text-blue-100 text-sm gap-2 rp-scroll-reveal rp-reveal-up"
            data-rp-reveal=""
            style={{ "--rp-reveal-delay": "300ms" }}
          >
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
