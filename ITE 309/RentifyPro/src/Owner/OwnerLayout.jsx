import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Bookings from "./pages/Bookings";
import Messages from "./pages/Messages";
import Reviews from "./pages/Reviews";
import Earnings from "./pages/Earnings";
import Analytics from "./pages/Analytics";
import Blockchain from "./pages/Blockchain";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";

export default function OwnerLayout() {
  const [activePage, setActivePage] = useState("Dashboard");

  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* SIDEBAR */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOPBAR */}
        <Topbar
          title={activePage}
          onSwitchToUser={() => {
            localStorage.removeItem("isNewOwner");
            window.dispatchEvent(new Event("switch-to-user"));
          }}
        />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">
          {activePage === "Dashboard" && <Dashboard />}
          {activePage === "Vehicles" && <Vehicles />}
          {activePage === "Bookings" && <Bookings />}
          {activePage === "Messages" && <Messages />}
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
