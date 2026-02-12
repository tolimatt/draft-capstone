function Sidebar({ activePage, setActivePage }) {
  // TEMP SAMPLE OWNER DATA (replace with auth data later)
  const owner = {
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "juan.delacruz@email.com",
    avatar: null, // image URL later
  };

  const menuItems = [
    { id: "Dashboard", label: "Dashboard", icon: "📊" },
    { id: "Vehicles", label: "My Vehicles", icon: "🚗" },
    { id: "Bookings", label: "Bookings", icon: "📑" },
    { id: "Earnings", label: "Earnings", icon: "💰" },
    { id: "Analytics", label: "Analytics", icon: "🤖" },
    { id: "Blockchain", label: "Blockchain Records", icon: "🔗" },
  ];

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/signin";
  };

  return (
    <aside className="w-72 h-full bg-white text-gray-800 flex flex-col border-r border-gray-200">
      {/* Header */}
      <div className="h-20 px-6 bg-[#017FE6] text-white flex items-center border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-[#017FE6] flex items-center justify-center font-bold">
            R
          </div>
          <div>
            <h1 className="text-lg font-bold">RentifyPro</h1>
            <p className="text-xs opacity-90">Owner / Lessor Dashboard</p>
          </div>
        </div>
      </div>

      {/* PROFILE SECTION */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* PROFILE PICTURE */}
          <div className="w-14 h-14 rounded-full bg-[#017FE6] text-white flex items-center justify-center text-xl font-bold">
            {owner.firstName.charAt(0)}
          </div>

          <div className="flex-1">
            <p className="font-semibold text-gray-800 leading-tight">
              {owner.firstName} {owner.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {owner.email}
            </p>
          </div>
        </div>

        {/* EDIT PROFILE */}
        <button
          onClick={() => setActivePage("Profile")}
          className="mt-4 w-full text-sm font-medium text-[#017FE6] border border-[#017FE6] rounded-lg py-2 hover:bg-[#017FE6] hover:text-white transition"
        >
          Edit Profile
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = activePage === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                isActive
                  ? "bg-[#017FE6] text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="px-4 py-4 border-t border-gray-200 space-y-1">
        <div
          onClick={() => setActivePage("Settings")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition ${
            activePage === "Settings"
              ? "bg-gray-200 text-gray-900"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span className="text-sm font-medium">Settings</span>
        </div>

        <div
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-red-600 hover:bg-red-50 transition"
        >
          <span className="text-lg">🚪</span>
          <span className="text-sm font-medium">Logout</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
