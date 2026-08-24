import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Bookings from "./pages/Bookings";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Reviews from "./pages/Reviews";
import Earnings from "./pages/Earnings";
import Analytics from "./pages/Analytics";
import Blockchain from "./pages/Blockchain";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import API from "../utils/api";
import { normalizeOwnerProfile, persistOwnerProfile } from "./utils/ownerProfile";

const OWNER_ACTIVE_PAGE_STORAGE_KEY = "rentifypro:owner-active-page";
const OWNER_PAGES = new Set([
  "Dashboard",
  "Vehicles",
  "Bookings",
  "Messages",
  "Notifications",
  "Reviews",
  "Earnings",
  "Analytics",
  "Blockchain",
  "Settings",
  "Profile",
]);

const normalizeOwnerPage = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized || !OWNER_PAGES.has(normalized)) return "Dashboard";
  return normalized;
};

export default function OwnerLayout() {
  const [activePage, setActivePage] = useState(() => {
    const tabFromUrl = new URLSearchParams(window.location.search).get("tab");
    if (tabFromUrl) return normalizeOwnerPage(tabFromUrl);
    const tabFromStorage = sessionStorage.getItem(OWNER_ACTIVE_PAGE_STORAGE_KEY);
    return normalizeOwnerPage(tabFromStorage);
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigateToPage = (page) => {
    setActivePage(normalizeOwnerPage(page));
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const handler = (event) => {
      const page = event?.detail;
      if (typeof page === "string") {
        setActivePage(normalizeOwnerPage(page));
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("navigate", handler);
    return () => window.removeEventListener("navigate", handler);
  }, []);

  useEffect(() => {
    let mounted = true;

    const syncOwnerProfile = async () => {
      try {
        const response = await API.getProfile();
        if (!mounted || !response?.user || response.user.role !== "owner") return;
        const normalized = normalizeOwnerProfile(response.user, response.user);
        persistOwnerProfile(normalized);
        window.dispatchEvent(new Event("owner-profile-updated"));
      } catch {
        // Keep local profile data if sync fails.
      }
    };

    syncOwnerProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(OWNER_ACTIVE_PAGE_STORAGE_KEY, activePage);
    } catch {
      // Ignore storage errors.
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === activePage) return;
    params.set("tab", activePage);
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [activePage]);

  return (
    <div className="relative flex min-h-screen bg-[#f6f9fc] lg:h-screen">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
        />
      )}

      {/* sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={navigateToPage}
        isMobileOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* main area */}
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden lg:h-screen">
        {/* top bar */}
        <Topbar
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onNavigateToNotifications={() => navigateToPage("Notifications")}
        />

        {/* page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          {activePage === "Dashboard" && <Dashboard />}
          {activePage === "Vehicles" && <Vehicles />}
          {activePage === "Bookings" && <Bookings />}
          {activePage === "Messages" && <Messages />}
          {activePage === "Notifications" && <Notifications />}
          {activePage === "Reviews" && <Reviews />}
          {activePage === "Earnings" && <Earnings />}
          {activePage === "Analytics" && <Analytics />}
          {activePage === "Blockchain" && <Blockchain />}
          {activePage === "Settings" && <Settings />}
          {activePage === "Profile" && <Profile />}
        </main>
      </div>
    </div>
  );
}
