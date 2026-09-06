import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  LayoutDashboard,
  CarFront,
  CalendarDays,
  MessageCircle,
  Star,
  Wallet,
  BarChart3,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import LogoutModal from "../../components/LogoutModal";
import { getOwnerProfileFromStorage } from "../utils/ownerProfile";
import API from "../../utils/api";
import { disconnectSocket, getSocket } from "../../utils/socket";
import {
  SESSION_OWNER_PROFILE_UPDATED_EVENT,
  clearSessionOwnerProfile,
  clearSessionUser,
} from "../../utils/sessionStore";
import { LIVE_COUNTERS_REFRESH_EVENT } from "../../utils/liveCounters";

const BRAND_LOGO_SRC = "/rentifypro-logo-optimized.png";

function Sidebar({
  activePage,
  setActivePage,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const [owner, setOwner] = useState(() => getOwnerProfileFromStorage());
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const syncOwner = () => {
      setOwner(getOwnerProfileFromStorage());
    };

    window.addEventListener("owner-profile-updated", syncOwner);
    window.addEventListener(SESSION_OWNER_PROFILE_UPDATED_EVENT, syncOwner);

    return () => {
      window.removeEventListener("owner-profile-updated", syncOwner);
      window.removeEventListener(SESSION_OWNER_PROFILE_UPDATED_EVENT, syncOwner);
    };
  }, []);

  /* ── badge counters ─────────────────────────────────── */
  const syncBadges = useCallback(async () => {
    try {
      const threadsRes = await API.getOwnerRenterThreads().catch(() => ({ renters: [] }));

      const totalUnreadMessages = (threadsRes.renters || []).reduce(
        (sum, t) => sum + Number(t.unreadCount || 0),
        0
      );
      setUnreadMessages(totalUnreadMessages);
    } catch {
      // Keep current badge values when sync fails.
    }
  }, []);

  useEffect(() => {
    const initialSyncTimer = window.setTimeout(syncBadges, 0);

    const refresh = () => syncBadges();
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncBadges();
    };

    window.addEventListener(LIVE_COUNTERS_REFRESH_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(initialSyncTimer);
      window.removeEventListener(LIVE_COUNTERS_REFRESH_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncBadges]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onNewMessage = () => setUnreadMessages((p) => p + 1);

    socket.on("message:new", onNewMessage);

    return () => {
      socket.off("message:new", onNewMessage);
    };
  }, []);

  const getInitials = (first, last) =>
    `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();

  const displayName =
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    owner.name ||
    "Owner";
  const displayEmail = owner.email || "owner@rentifypro.com";

  const menuItems = [
    { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "Vehicles", label: "My Vehicles", icon: CarFront },
    { id: "Bookings", label: "Bookings", icon: CalendarDays },
    { id: "Messages", label: "Messages", icon: MessageCircle, badge: unreadMessages },
    { id: "Reviews", label: "Reviews", icon: Star },
    { id: "Earnings", label: "Earnings", icon: Wallet },
    { id: "Analytics", label: "Analytics", icon: BarChart3 },
    { id: "Reports", label: "Reports", icon: ShieldAlert },
  ];

  const openLogoutModal = () => {
    setIsLogoutModalOpen(true);
    onCloseMobile?.();
  };

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false);
  };

  const handleLogout = async () => {
    setIsLogoutModalOpen(false);
    try {
      await API.logout();
    } catch {
      // Continue local cleanup even if the request fails.
    }
    disconnectSocket();
    clearSessionOwnerProfile();
    clearSessionUser();
    localStorage.removeItem("isNewOwner");
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = "/signin";
  };

  return (
    <>
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onCancel={closeLogoutModal}
        onConfirm={handleLogout}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[17.5rem] max-w-[86vw] bg-white flex flex-col border-r border-gray-200 transform transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-[16.5rem] lg:max-w-none lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* header */}
        <div className="flex h-20 items-center border-b border-slate-100 px-5 sm:px-6 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
              <img
                src={BRAND_LOGO_SRC}
                alt="RentifyPro logo"
                className="h-full w-full rounded-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#017FE6]">RentifyPro</h1>
              <p className="text-xs opacity-90 text-[#017FE6]">Owner / Lessor Dashboard</p>
            </div>
          </div>
        </div>

        {/* profile */}
        <div className="px-5 sm:px-6 py-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#017FE6] text-lg font-bold text-white">
              {owner.avatar ? (
                <img
                  src={owner.avatar}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                getInitials(owner.firstName, owner.lastName) || "O"
              )}
            </div>

            <div>
              <p className="font-semibold">
                {displayName}
              </p>
              <p className="text-xs text-gray-500">{displayEmail}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setActivePage("Profile");
              onCloseMobile?.();
            }}
            className="mt-4 w-full text-sm font-medium text-[#017FE6] border border-[#017FE6] rounded-lg py-2 hover:bg-[#017FE6] hover:text-white transition"
          >
            Edit Profile
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setActivePage(item.id);
                onCloseMobile?.();
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer ${
                activePage === item.id
                  ? "bg-[#017FE6] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <item.icon size={20} strokeWidth={2} aria-hidden="true" />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span
                  className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-[11px] font-bold px-1.5 ${
                    activePage === item.id
                      ? "bg-white text-[#017FE6]"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* footer */}
        <div className="px-4 py-4 border-t">
          <div
            onClick={openLogoutModal}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-red-600 hover:bg-red-50"
          >
            <LogOut size={20} strokeWidth={2} aria-hidden="true" />
            Logout
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
