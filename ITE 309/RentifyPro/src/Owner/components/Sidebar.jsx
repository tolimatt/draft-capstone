import { useState } from "react";
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  MessageSquare,
  Star,
  Wallet,
  BarChart3,
  Link2,
  Settings,
  LogOut,
} from "lucide-react";

function Sidebar({ activePage, setActivePage }) {
  const owner = {
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "juan.delacruz@email.com",
  };

  const profilePhoto = localStorage.getItem("ownerProfilePhoto");

  const getInitials = (first, last) =>
    `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();

  const menuItems = [
    { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "Vehicles", label: "My Vehicles", icon: Car },
    { id: "Bookings", label: "Bookings", icon: ClipboardList },
    { id: "Messages", label: "Messages", icon: MessageSquare },
    { id: "Reviews", label: "Reviews", icon: Star },
    { id: "Earnings", label: "Earnings", icon: Wallet },
    { id: "Analytics", label: "Analytics", icon: BarChart3 },
    { id: "Blockchain", label: "Blockchain Records", icon: Link2 },
  ];

  const handleLogout = () => {
    localStorage.removeItem("isNewOwner");
    window.location.href = "/signin";
  };

  return (
    <aside className="w-72 h-full bg-white flex flex-col border-r border-gray-200">
      {/* HEADER */}
      <div className="h-20 px-10 text-white flex items-center border-b border-blue/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#017FE6] text-white flex items-center justify-center font-bold">
            R
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#017FE6]">RentifyPro</h1>
            <p className="text-xs opacity-90 text-[#017FE6]" >Owner / Lessor Dashboard</p>
          </div>
        </div>
      </div>

      {/* PROFILE */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#017FE6] overflow-hidden flex items-center justify-center text-white text-lg font-bold">
            {profilePhoto ? (
              <img src={profilePhoto} className="w-full h-full object-cover" />
            ) : (
              getInitials(owner.firstName, owner.lastName)
            )}
          </div>

          <div>
            <p className="font-semibold">
              {owner.firstName} {owner.lastName}
            </p>
            <p className="text-xs text-gray-500">{owner.email}</p>
          </div>
        </div>

        <button
          onClick={() => setActivePage("Profile")}
          className="mt-4 w-full text-sm font-medium text-[#017FE6] border border-[#017FE6] rounded-lg py-2 hover:bg-[#017FE6] hover:text-white transition"
        >
          Edit Profile
        </button>
      </div>

      {/* NAV */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer ${
              activePage === item.id
                ? "bg-[#017FE6] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="px-4 py-4 border-t">
        <div
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
