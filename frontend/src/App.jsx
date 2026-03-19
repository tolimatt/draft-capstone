import React, { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentTime, getTodayDate, getTomorrowDate } from "./utils/dateUtils";

// Main pages
import RentifyPro from "./pages/RentifyPro";
import SignInPage from "./components/SignInPage";
import VehiclesPage from "./pages/VehiclesPage";
import VehicleDetailsPage from "./pages/VehicleDetailsPage";
import BookingsPage from "./pages/BookingsPage";
import RealtimeChatPage from "./pages/RealtimeChatPage";
import NotificationsPage from "./pages/NotificationsPage";
import AboutPage from "./pages/AboutPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import AccountSettings from "./pages/AccountSettings";
import ProceedVehicleOwner from "./pages/ProceedVehicleOwner";
import VehicleOwnerVerification from "./pages/VehicleOwnerVerification";

// Registration pages
import RegisterPage from "./components/RegisterPage";
import RegisterOwnerPage from "./pages/RegisterOwnerPage";

// Verification pages
import RegisterOTP from "./verification/RegisterOTP";
import ForgotPasswordEmail from "./verification/ForgotPasswordEmail";
import ForgotPasswordOTP from "./verification/ForgotPasswordOTP";
import ResetPassword from "./verification/ResetPassword";

// Owner pages
import OwnerLayout from "./owner/OwnerLayout";

// Shared parts
import LogoutModal from "./components/LogoutModal";
import IdleWarningModal from "./components/IdleWarningModal";
import { disconnectSocket } from "./utils/socket";
import API from "./utils/api";
import {
  SESSION_USER_UPDATED_EVENT,
  clearSessionOwnerProfile,
  clearSessionUser,
  getSessionUser,
  setSessionUser,
} from "./utils/sessionStore";

const ROUTE_TO_PAGE = {
  "/": "home",
  "/vehicles": "vehicles",
  "/vehicle-details": "vehicle-details",
  "/about": "about",
  "/privacy": "privacy-policy",
  "/privacy-policy": "privacy-policy",
  "/terms": "terms-and-conditions",
  "/terms-and-conditions": "terms-and-conditions",
  "/bookings": "booking-history",
  "/signin": "signin",
  "/register": "register",
  "/register-owner": "register-owner",
  "/registerotp": "registerotp",
  "/forgot-email": "forgot-email",
  "/forgot-otp": "forgot-otp",
  "/reset-password": "reset-password",
  "/chat": "realtime-chat",
  "/notifications": "notifications",
  "/account-settings": "account-settings",
  "/vehicle-owner-proceed": "vehicle-owner-proceed",
  "/vehicle-owner-verification": "vehicle-owner-verification",
  "/owner-dashboard": "owner-dashboard",
};

const PAGE_TO_ROUTE = Object.entries(ROUTE_TO_PAGE).reduce((map, [route, page]) => {
  map[page] = route;
  return map;
}, {});

const resolvePageFromPath = (pathname) => {
  const raw = String(pathname || "/").toLowerCase();
  const normalized = raw === "/" ? raw : raw.replace(/\/+$/, "");
  return ROUTE_TO_PAGE[normalized] || "home";
};

const getVehicleIdFromSearch = (search) => {
  const params = new URLSearchParams(String(search || ""));
  return String(params.get("vehicleId") || "").trim();
};

const getQueryParam = (search, key) => {
  const params = new URLSearchParams(String(search || ""));
  return String(params.get(key) || "").trim();
};

const buildRouteWithQuery = (path, query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    const normalized = String(value || "").trim();
    if (normalized) params.set(key, normalized);
  });
  const search = params.toString();
  return search ? `${path}?${search}` : path;
};

const FLOW_STATE_STORAGE_KEY = "rentifypro:flow-state";

const readFlowState = () => {
  try {
    const raw = sessionStorage.getItem(FLOW_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeFlowState = (nextState = {}) => {
  try {
    const normalized = Object.entries(nextState).reduce((acc, [key, value]) => {
      const text = String(value || "").trim();
      if (text) acc[key] = text;
      return acc;
    }, {});
    if (!Object.keys(normalized).length) {
      sessionStorage.removeItem(FLOW_STATE_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(FLOW_STATE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage errors.
  }
};

const getInitialsFromName = (name) => {
  const cleaned = String(name || "").trim();
  if (!cleaned) return "U";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || "" : "";
  return `${first}${last}`.toUpperCase() || "U";
};

const normalizeChatNavigationContext = (context = null) => {
  if (!context || typeof context !== "object") return null;

  const partnerId = String(context.partnerId || context.userId || "").trim();
  if (!partnerId) return null;

  const bookingId = String(context.bookingId || "").trim();
  const vehicleId = String(context.vehicleId || "").trim();

  return {
    partnerId,
    partnerName: String(context.partnerName || "").trim(),
    partnerEmail: String(context.partnerEmail || "").trim(),
    partnerAvatar: String(context.partnerAvatar || "").trim(),
    ...(bookingId ? { bookingId } : {}),
    ...(vehicleId ? { vehicleId } : {}),
  };
};

const LEGACY_AUTH_KEYS = ["token"];
const LEGACY_PROFILE_KEYS = ["user", "ownerProfile", "ownerProfilePhoto", "profilePhoto", "profilePhotoUserId"];
const AUTH_PAGES = new Set([
  "signin",
  "register",
  "register-owner",
  "registerotp",
  "forgot-email",
  "forgot-otp",
  "reset-password",
]);
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const IDLE_WARNING_SECONDS = 60;
const IDLE_ACTIVITY_EVENTS = ["keydown", "pointerdown", "touchstart", "mousemove", "scroll"];

const hydrateStoredUser = (storedUser = {}) => {
  if (!storedUser || typeof storedUser !== "object") return null;

  const displayName =
    String(storedUser.name || "").trim() ||
    String(storedUser.email || "").split("@")[0] ||
    "User";
  const avatar = String(storedUser.avatar || "").trim();

  return {
    ...storedUser,
    _id: storedUser._id,
    name: displayName,
    initials: String(storedUser.initials || "").trim() || getInitialsFromName(displayName),
    avatar,
  };
};

const App = () => {
  const getDefaultBookingData = () => {
    return {
      vehicleType: "",
      location: "",
      pickupDate: getTodayDate(),
      pickupTime: getCurrentTime(),
      returnDate: getTomorrowDate(),
      returnTime: getCurrentTime(),
    };
  };

  const [currentPage, setCurrentPage] = useState(() =>
    resolvePageFromPath(window.location.pathname)
  );
  const initialFlowStateRef = useRef(readFlowState());
  const initialFlowState = initialFlowStateRef.current;
  const [bookingData, setBookingData] = useState(getDefaultBookingData());
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [pendingScrollTarget, setPendingScrollTarget] = useState("");
  const [chatNavigationContext, setChatNavigationContext] = useState(null);

  const [registeredEmail, setRegisteredEmail] = useState(() =>
    String(initialFlowState.registeredEmail || "").trim()
  );
  const [registeredPhone, setRegisteredPhone] = useState(() =>
    String(initialFlowState.registeredPhone || "").trim()
  );
  const [registeredName, setRegisteredName] = useState(() =>
    String(initialFlowState.registeredName || "").trim()
  );
  const [registerRole, setRegisterRole] = useState(() =>
    String(initialFlowState.registerRole || "").trim().toLowerCase() === "owner" ? "owner" : "user"
  );

  const [forgotEmail, setForgotEmail] = useState(() =>
    String(initialFlowState.forgotEmail || "").trim()
  );
  const [forgotResetToken, setForgotResetToken] = useState(() =>
    String(initialFlowState.forgotResetToken || "").trim()
  );

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOwnerLoggedIn, setIsOwnerLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isSessionBootstrapping, setIsSessionBootstrapping] = useState(true);

  // Logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showIdleWarningModal, setShowIdleWarningModal] = useState(false);
  const [idleCountdownSeconds, setIdleCountdownSeconds] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const idleDeadlineRef = useRef(0);
  const logoutInProgressRef = useRef(false);
  const idleWarningOpenRef = useRef(false);

  useEffect(() => {
    const purgeLegacyStorage = () => {
      LEGACY_AUTH_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      LEGACY_PROFILE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    };

    purgeLegacyStorage();

    let mounted = true;

    const bootstrapSession = async () => {
      try {
        const response = await API.getProfile();
        const profileUser =
          response?.user && typeof response.user === "object" ? response.user : null;
        if (!mounted || !profileUser || profileUser.isVerified !== true) {
          throw new Error("No active session");
        }

        const hydratedUser = hydrateStoredUser(profileUser);
        setSessionUser(profileUser);
        setUser(hydratedUser);

        const isOwner = profileUser.role === "owner";
        const ownerPreference = String(localStorage.getItem("isNewOwner") || "").trim().toLowerCase();
        const ownerMode = isOwner && ownerPreference !== "false";
        if (ownerMode) {
          localStorage.setItem("isNewOwner", "true");
          setIsOwnerLoggedIn(true);
          setIsLoggedIn(false);
          setCurrentPage("owner-dashboard");
        } else {
          if (isOwner) localStorage.setItem("isNewOwner", "false");
          setIsOwnerLoggedIn(false);
          setIsLoggedIn(true);
          const pathPage = resolvePageFromPath(window.location.pathname);
          if (AUTH_PAGES.has(pathPage) || pathPage === "owner-dashboard") {
            setCurrentPage("home");
          }
        }
      } catch {
        if (!mounted) return;
        setIsLoggedIn(false);
        setIsOwnerLoggedIn(false);
        setUser(null);
        clearSessionUser();
        clearSessionOwnerProfile();
        purgeLegacyStorage();
        localStorage.removeItem("isNewOwner");
      } finally {
        if (mounted) setIsSessionBootstrapping(false);
      }
    };

    bootstrapSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const syncUserProfile = (event) => {
      const payloadUser =
        event?.detail && typeof event.detail === "object"
          ? event.detail
          : getSessionUser();

      if (!payloadUser) {
        setUser(null);
        setIsLoggedIn(false);
        setIsOwnerLoggedIn(false);
        return;
      }

      const hydrated = hydrateStoredUser(payloadUser);
      if (!hydrated) return;
      setUser((prev) => (prev ? { ...prev, ...hydrated } : hydrated));
    };

    window.addEventListener("user-profile-updated", syncUserProfile);
    window.addEventListener(SESSION_USER_UPDATED_EVENT, syncUserProfile);

    return () => {
      window.removeEventListener("user-profile-updated", syncUserProfile);
      window.removeEventListener(SESSION_USER_UPDATED_EVENT, syncUserProfile);
    };
  }, []);

  useEffect(() => {
    const selectedVehicleId = String(selectedVehicle?._id || selectedVehicle?.id || "").trim();
    writeFlowState({
      selectedVehicleId,
      registeredEmail,
      registeredPhone,
      registeredName,
      registerRole,
      forgotEmail,
      forgotResetToken,
    });
  }, [
    selectedVehicle?._id,
    selectedVehicle?.id,
    registeredEmail,
    registeredPhone,
    registeredName,
    registerRole,
    forgotEmail,
    forgotResetToken,
  ]);

  useEffect(() => {
    const query = window.location.search;

    if (currentPage === "registerotp") {
      const queryEmail = getQueryParam(query, "email");
      const queryPhone = getQueryParam(query, "phone");
      const queryRole = getQueryParam(query, "role").toLowerCase();

      if (queryEmail && queryEmail !== registeredEmail) {
        setRegisteredEmail(queryEmail);
      }
      if (queryPhone && queryPhone !== registeredPhone) {
        setRegisteredPhone(queryPhone);
      }
      if ((queryRole === "owner" || queryRole === "user") && queryRole !== registerRole) {
        setRegisterRole(queryRole);
      }
      if (!queryEmail && !registeredEmail) {
        setCurrentPage("register");
      }
      return;
    }

    if (currentPage === "forgot-otp" || currentPage === "reset-password") {
      const queryEmail = getQueryParam(query, "email");
      if (queryEmail && queryEmail !== forgotEmail) {
        setForgotEmail(queryEmail);
      }

      const effectiveEmail = queryEmail || forgotEmail;
      if (!effectiveEmail) {
        setCurrentPage("forgot-email");
        return;
      }

      if (currentPage === "reset-password" && !forgotResetToken) {
        setCurrentPage("forgot-otp");
      }
    }
  }, [
    currentPage,
    registeredEmail,
    registeredPhone,
    registerRole,
    forgotEmail,
    forgotResetToken,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(resolvePageFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const baseRoute = PAGE_TO_ROUTE[currentPage];
    if (!baseRoute) return;

    const targetRoute = (() => {
      if (currentPage === "vehicle-details") {
        const queryVehicleId = getVehicleIdFromSearch(window.location.search);
        const selectedVehicleId = String(selectedVehicle?._id || selectedVehicle?.id || "").trim();
        const storedVehicleId = String(readFlowState().selectedVehicleId || "").trim();
        return buildRouteWithQuery(baseRoute, {
          vehicleId: queryVehicleId || selectedVehicleId || storedVehicleId,
        });
      }

      if (currentPage === "registerotp") {
        const queryEmail = getQueryParam(window.location.search, "email");
        const queryPhone = getQueryParam(window.location.search, "phone");
        const queryRole = getQueryParam(window.location.search, "role");
        const role = registerRole === "owner" ? "owner" : queryRole === "owner" ? "owner" : "user";
        return buildRouteWithQuery(baseRoute, {
          email: registeredEmail || queryEmail,
          phone: registeredPhone || queryPhone,
          role,
        });
      }

      if (currentPage === "forgot-otp" || currentPage === "reset-password") {
        const queryEmail = getQueryParam(window.location.search, "email");
        return buildRouteWithQuery(baseRoute, {
          email: forgotEmail || queryEmail,
        });
      }

      if (currentPage === "owner-dashboard") {
        const tab = getQueryParam(window.location.search, "tab");
        return buildRouteWithQuery(baseRoute, { tab });
      }

      return baseRoute;
    })();

    const currentRoute = `${window.location.pathname}${window.location.search}`;
    if (currentRoute === targetRoute) return;
    window.history.pushState({ page: currentPage }, "", targetRoute);
  }, [
    currentPage,
    selectedVehicle?._id,
    selectedVehicle?.id,
    registeredEmail,
    registeredPhone,
    registerRole,
    forgotEmail,
  ]);

  useEffect(() => {
    if (currentPage !== "vehicle-details") return undefined;
    const storedVehicleId = String(readFlowState().selectedVehicleId || "").trim();
    const vehicleIdFromQuery = getVehicleIdFromSearch(window.location.search) || storedVehicleId;
    const selectedVehicleId = String(selectedVehicle?._id || selectedVehicle?.id || "").trim();
    if (selectedVehicleId && (!vehicleIdFromQuery || vehicleIdFromQuery === selectedVehicleId)) {
      return undefined;
    }

    if (!vehicleIdFromQuery) {
      setCurrentPage("vehicles");
      return undefined;
    }

    let active = true;
    API.getPublicVehicleById(vehicleIdFromQuery)
      .then((response) => {
        if (!active) return;
        const vehicle = response?.vehicle;
        if (vehicle && (vehicle._id || vehicle.id)) {
          setSelectedVehicle(vehicle);
          return;
        }
        setCurrentPage("vehicles");
      })
      .catch(() => {
        if (!active) return;
        setCurrentPage("vehicles");
      });

    return () => {
      active = false;
    };
  }, [currentPage, selectedVehicle?._id, selectedVehicle?.id]);

  useEffect(() => {
    const switchToUser = () => {
      localStorage.setItem("isNewOwner", "false");
      setIsOwnerLoggedIn(false);
      setIsLoggedIn(true);
      setCurrentPage("home");
    };
    window.addEventListener("switch-to-user", switchToUser);
    return () => window.removeEventListener("switch-to-user", switchToUser);
  }, []);

  const performLogout = useCallback(async ({ redirectPage = "home" } = {}) => {
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;

    try {
      await API.logout();
    } catch {
      // Local cleanup still runs below.
    }

    setShowLogoutModal(false);
    setShowIdleWarningModal(false);
    setIdleCountdownSeconds(0);
    idleWarningOpenRef.current = false;
    setIsLoggedIn(false);
    setIsOwnerLoggedIn(false);
    setUser(null);
    setPendingScrollTarget("");
    disconnectSocket();
    clearSessionOwnerProfile();
    clearSessionUser();
    localStorage.removeItem("isNewOwner");
    LEGACY_AUTH_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    LEGACY_PROFILE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    lastActivityRef.current = Date.now();
    idleDeadlineRef.current = 0;
    setSelectedVehicle(null);
    setRegisteredEmail("");
    setRegisteredPhone("");
    setRegisteredName("");
    setRegisterRole("user");
    setForgotEmail("");
    setForgotResetToken("");
    writeFlowState({});
    setCurrentPage(redirectPage);
    logoutInProgressRef.current = false;
  }, []);

  const keepSessionActive = useCallback(() => {
    lastActivityRef.current = Date.now();
    idleDeadlineRef.current = 0;
    if (idleWarningOpenRef.current) {
      idleWarningOpenRef.current = false;
      setShowIdleWarningModal(false);
      setIdleCountdownSeconds(0);
    }
  }, []);

  // Open the logout modal
  const requestLogout = () => {
    setShowLogoutModal(true);
  };

  // Finish logout
  const confirmLogout = async () => {
    await performLogout({ redirectPage: "home" });
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  useEffect(() => {
    idleWarningOpenRef.current = showIdleWarningModal;
  }, [showIdleWarningModal]);

  useEffect(() => {
    const sessionActive = isLoggedIn || isOwnerLoggedIn;

    if (!sessionActive) {
      setShowIdleWarningModal(false);
      setIdleCountdownSeconds(0);
      idleDeadlineRef.current = 0;
      idleWarningOpenRef.current = false;
      return undefined;
    }

    keepSessionActive();

    const markActivity = () => {
      if (!(isLoggedIn || isOwnerLoggedIn)) return;
      keepSessionActive();
    };

    const tickIdleState = () => {
      if (logoutInProgressRef.current) return;

      const now = Date.now();
      if (!idleDeadlineRef.current) {
        const idleMs = now - lastActivityRef.current;
        const warningWindowMs = IDLE_WARNING_SECONDS * 1000;
        const warningTriggerMs = Math.max(0, IDLE_TIMEOUT_MS - warningWindowMs);
        if (idleMs >= warningTriggerMs) {
          const remainingMsBeforeLogout = Math.max(0, IDLE_TIMEOUT_MS - idleMs);
          idleDeadlineRef.current = now + remainingMsBeforeLogout;
          setShowIdleWarningModal(true);
          idleWarningOpenRef.current = true;
        } else {
          return;
        }
      }

      const remainingSeconds = Math.max(0, Math.ceil((idleDeadlineRef.current - now) / 1000));
      setIdleCountdownSeconds(remainingSeconds);

      if (remainingSeconds <= 0) {
        performLogout({ redirectPage: "signin" });
      }
    };

    IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    tickIdleState();
    const idleTimer = window.setInterval(tickIdleState, 1000);

    return () => {
      window.clearInterval(idleTimer);
      IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, [isLoggedIn, isOwnerLoggedIn, keepSessionActive, performLogout]);

  // Build initials from the full name
  const buildUserData = (name, email, role) => {
    const parts = name.trim().split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    return {
      name,
      initials: firstName.charAt(0).toUpperCase() + (lastName.charAt(0) || "").toUpperCase(),
      email,
      role,
      isVerified: true,
    };
  };

  const goToBookingHistory = () => {
    setCurrentPage("booking-history");
  };

  const goToRealtimeChat = (context = null) => {
    if (!isLoggedIn) {
      setCurrentPage("signin");
      return;
    }
    setChatNavigationContext(normalizeChatNavigationContext(context));
    setCurrentPage("realtime-chat");
  };

  const clearChatNavigationContext = useCallback(() => {
    setChatNavigationContext(null);
  }, []);

  const goToNotifications = () => {
    if (!isLoggedIn) {
      setCurrentPage("signin");
      return;
    }
    setCurrentPage("notifications");
  };

  const navigateToContacts = () => {
    if (currentPage === "home") {
      const contactsSection = document.getElementById("contacts");
      if (contactsSection) {
        contactsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    setPendingScrollTarget("contacts");
    setCurrentPage("home");
  };

  const navigateToAbout = () => {
    if (currentPage === "home") {
      const aboutSection = document.getElementById("about");
      if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    if (currentPage === "about") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setPendingScrollTarget("about");
    setCurrentPage("home");
  };

  const goToPrivacyPolicy = () => {
    if (currentPage === "privacy-policy") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrentPage("privacy-policy");
  };

  const goToTermsAndConditions = () => {
    if (currentPage === "terms-and-conditions") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrentPage("terms-and-conditions");
  };

  useEffect(() => {
    if (!pendingScrollTarget) return undefined;

    const timer = window.setTimeout(() => {
      const target = document.getElementById(pendingScrollTarget);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setPendingScrollTarget("");
    }, 80);

    return () => window.clearTimeout(timer);
  }, [currentPage, pendingScrollTarget]);

  if (isSessionBootstrapping) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-600 text-sm">
        Restoring your session...
      </div>
    );
  }

  return (
    <>
      {/* logout modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />

      <IdleWarningModal
        isOpen={showIdleWarningModal}
        countdownSeconds={idleCountdownSeconds}
        idleMinutes={15}
        onStaySignedIn={keepSessionActive}
        onSignOut={() => performLogout({ redirectPage: "signin" })}
      />

      {/* home */}
      {currentPage === "home" && (
        <RentifyPro
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onNavigateToVehicles={() => {
            setBookingData(getDefaultBookingData());
            setCurrentPage("vehicles");
          }}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToAbout={navigateToAbout}
          onNavigateToContacts={navigateToContacts}
          onNavigateToPrivacyPolicy={goToPrivacyPolicy}
          onNavigateToTermsAndConditions={goToTermsAndConditions}
          onSearch={(data) => {
            setBookingData(data);
            setCurrentPage("vehicles");
          }}
          onViewDetails={(vehicle) => {
            setSelectedVehicle(vehicle);
            setCurrentPage("vehicle-details");
          }}
          onLogout={requestLogout}
        />
      )}

      {/* sign in */}
      {currentPage === "signin" && (
        <SignInPage
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToForgotPassword={() => setCurrentPage("forgot-email")}
          onLoginSuccess={(userData) => {
            setUser(userData);
            setSessionUser(userData);
            setRegisteredEmail("");
            setRegisteredPhone("");
            setRegisteredName("");
            setRegisterRole("user");
            setForgotEmail("");
            setForgotResetToken("");

            if (userData?.role === "owner") {
              setIsOwnerLoggedIn(true);
              setIsLoggedIn(false);
              localStorage.setItem("isNewOwner", "true");
              setCurrentPage("owner-dashboard");
            } else {
              setIsLoggedIn(true);
              setIsOwnerLoggedIn(false);
              setCurrentPage("home");
            }
          }}
        />
      )}

      {/* forgot password */}
      {currentPage === "forgot-email" && (
        <ForgotPasswordEmail
          onNavigateToOTP={(email) => {
            setForgotEmail(email);
            setForgotResetToken("");
            setCurrentPage("forgot-otp");
          }}
          onNavigateToSignIn={() => setCurrentPage("signin")}
        />
      )}

      {currentPage === "forgot-otp" && (
        <ForgotPasswordOTP
          email={forgotEmail}
          onVerified={(resetToken) => {
            setForgotResetToken(resetToken);
            setCurrentPage("reset-password");
          }}
          onNavigateToForgotPassword={() => setCurrentPage("forgot-email")}
        />
      )}

      {currentPage === "reset-password" && (
        <ResetPassword
          email={forgotEmail}
          token={forgotResetToken}
          onSuccess={() => {
            setForgotEmail("");
            setForgotResetToken("");
            setCurrentPage("signin");
          }}
          onBack={() => setCurrentPage("forgot-otp")}
        />
      )}

      {/* vehicles */}
      {currentPage === "vehicles" && (
        <VehiclesPage
          bookingData={bookingData}
          setBookingData={setBookingData}
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToVehicles={() => setCurrentPage("vehicles")}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToAbout={navigateToAbout}
          onNavigateToContacts={navigateToContacts}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onViewDetails={(vehicle) => {
            setSelectedVehicle(vehicle);
            setCurrentPage("vehicle-details");
          }}
          onLogout={requestLogout}
        />
      )}

      {/* vehicle details */}
      {currentPage === "vehicle-details" && !selectedVehicle && (
        <div className="min-h-screen bg-white flex items-center justify-center text-slate-600 text-sm">
          Loading vehicle details...
        </div>
      )}

      {currentPage === "vehicle-details" && selectedVehicle && (
        <VehicleDetailsPage
          vehicle={selectedVehicle}
          bookingData={bookingData}
          setBookingData={setBookingData}
          isLoggedIn={isLoggedIn}
          user={user}
          onBack={() => setCurrentPage("vehicles")}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToVehicles={() => setCurrentPage("vehicles")}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToAbout={navigateToAbout}
          onNavigateToContacts={navigateToContacts}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onLogout={requestLogout}
        />
      )}

      {/* user registration */}
      {currentPage === "register" && (
        <RegisterPage
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToRegisterOTP={(email, phone, name) => {
            setRegisteredEmail(email);
            setRegisteredPhone(phone);
            setRegisteredName(name || "");
            setRegisterRole("user");
            setCurrentPage("registerotp");
          }}
          onNavigateToOwnerRegister={() => setCurrentPage("register-owner")}
        />
      )}

      {/* owner registration */}
      {currentPage === "register-owner" && (
        <RegisterOwnerPage
          onBack={() => setCurrentPage("register")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToRegisterOTP={(email, phone, name) => {
            setRegisteredEmail(email);
            setRegisteredPhone(phone);
            setRegisteredName(name || "");
            setRegisterRole("owner");
            setCurrentPage("registerotp");
          }}
        />
      )}

      {/* OTP verification */}
      {currentPage === "registerotp" && (
        <RegisterOTP
          email={registeredEmail}
          phone={registeredPhone}
          role={registerRole}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToRegister={() => setCurrentPage("register")}
          onVerificationSuccess={(role, verifiedUser) => {
            const fallbackUser = buildUserData(
              registeredName || registeredEmail,
              registeredEmail,
              role
            );
            const userData = verifiedUser
              ? {
                  ...verifiedUser,
                  initials:
                    String(verifiedUser.initials || "").trim() ||
                    getInitialsFromName(verifiedUser.name || verifiedUser.email),
                }
              : fallbackUser;

            setRegisteredEmail("");
            setRegisteredPhone("");
            setRegisteredName("");
            setRegisterRole("user");

            if (role === "owner") {
              setIsOwnerLoggedIn(true);
              setIsLoggedIn(false);
              localStorage.setItem("isNewOwner", "true");
              setUser(userData);
              setSessionUser(userData);
              setCurrentPage("owner-dashboard");
            } else {
              setIsLoggedIn(true);
              setIsOwnerLoggedIn(false);
              setUser(userData);
              setSessionUser(userData);
              setCurrentPage("home");
            }
          }}
        />
      )}

      {/* account settings */}
      {currentPage === "account-settings" && (
        <AccountSettings
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToVehicles={() => setCurrentPage("vehicles")}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onNavigateToVehicleOwnerProceed={() => setCurrentPage("vehicle-owner-proceed")}
          onNavigateToAbout={navigateToAbout}
          onLogout={requestLogout}
        />
      )}

      {currentPage === "about" && (
        <AboutPage
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToVehicles={() => setCurrentPage("vehicles")}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToAbout={navigateToAbout}
          onNavigateToContacts={navigateToContacts}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onNavigateToPrivacyPolicy={goToPrivacyPolicy}
          onNavigateToTermsAndConditions={goToTermsAndConditions}
          onLogout={requestLogout}
        />
      )}

      {currentPage === "privacy-policy" && (
        <PrivacyPolicyPage
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToVehicles={() => setCurrentPage("vehicles")}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToAbout={navigateToAbout}
          onNavigateToContacts={navigateToContacts}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onNavigateToTermsAndConditions={goToTermsAndConditions}
          onLogout={requestLogout}
        />
      )}

      {currentPage === "terms-and-conditions" && (
        <TermsAndConditionsPage
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToVehicles={() => setCurrentPage("vehicles")}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToAbout={navigateToAbout}
          onNavigateToContacts={navigateToContacts}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onNavigateToPrivacyPolicy={goToPrivacyPolicy}
          onLogout={requestLogout}
        />
      )}

      {currentPage === "booking-history" && (
        <BookingsPage
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToVehicles={() => setCurrentPage("vehicles")}
          onNavigateToAbout={navigateToAbout}
          onNavigateToContacts={navigateToContacts}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onLogout={requestLogout}
        />
      )}

      {currentPage === "realtime-chat" && (
        <RealtimeChatPage
          isLoggedIn={isLoggedIn}
          user={user}
          initialChatContext={chatNavigationContext}
          onChatContextHandled={clearChatNavigationContext}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToVehicles={() => setCurrentPage("vehicles")}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToAbout={navigateToAbout}
          onNavigateToContacts={navigateToContacts}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onLogout={requestLogout}
        />
      )}

      {currentPage === "notifications" && (
        <NotificationsPage
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToSignIn={() => setCurrentPage("signin")}
          onNavigateToRegister={() => setCurrentPage("register")}
          onNavigateToVehicles={() => setCurrentPage("vehicles")}
          onNavigateToBookingHistory={goToBookingHistory}
          onNavigateToAbout={navigateToAbout}
          onNavigateToContacts={navigateToContacts}
          onNavigateToChat={goToRealtimeChat}
          onNavigateToNotifications={goToNotifications}
          onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
          onLogout={requestLogout}
        />
      )}

      {/* owner upgrade */}
      {currentPage === "vehicle-owner-proceed" && (
        <ProceedVehicleOwner
          onBack={() => setCurrentPage("account-settings")}
          onDoLater={() => setCurrentPage("account-settings")}
          onProceed={() => setCurrentPage("vehicle-owner-verification")}
          onNavigateToHome={() => setCurrentPage("home")}
        />
      )}

      {currentPage === "vehicle-owner-verification" && (
        <VehicleOwnerVerification
          onNavigateToHome={() => setCurrentPage("home")}
          onBack={() => setCurrentPage("vehicle-owner-proceed")}
          onSubmit={() => {
            localStorage.setItem("isNewOwner", "true");
            setIsOwnerLoggedIn(true);
            setIsLoggedIn(false);
            setCurrentPage("owner-dashboard");
          }}
        />
      )}

      {/* owner dashboard */}
      {currentPage === "owner-dashboard" && isOwnerLoggedIn && <OwnerLayout />}
    </>
  );
};

export default App;

