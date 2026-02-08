type SidebarProps = {
  activePage: string
  setActivePage: (page: string) => void
}

const menuItems = [
  { id: "Dashboard", label: "Dashboard", icon: "📊" },
  {
    id: "Vehicles",
    label: "Vehicles",
    icon: "🚗",
    badge: 8,
    badgeColor: "bg-blue-100 text-blue-600",
  },
  {
    id: "Bookings",
    label: "Bookings",
    icon: "📑",
    badge: 1,
    badgeColor: "bg-yellow-100 text-yellow-600",
  },
  { id: "Users", label: "Users", icon: "👥" },
  { id: "Payments", label: "Payments", icon: "💳" },
  { id: "Verification", label: "Verification", icon: "✅", dot: true },
  { id: "Blockchain", label: "Blockchain", icon: "🔗" },
  { id: "Analytics", label: "Analytics", icon: "📈" },
  { id: "Insights", label: "AI Insights", icon: "🤖" },
  { id: "Settings", label: "Settings", icon: "⚙️" },
]

function Sidebar({ activePage, setActivePage }: SidebarProps) {
  return (
    <aside className="w-72 h-screen bg-white text-gray-800 flex flex-col border-r border-gray-200">

      {/* Header */}
      <div className="h-20 px-6 bg-[#017FE6] text-white flex items-center border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-[#017FE6] flex items-center justify-center font-bold">
            R
          </div>
          <div>
            <h1 className="text-lg font-bold">RentifyPro</h1>
            <p className="text-xs opacity-90">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = activePage === item.id

          return (
            <div
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all
                ${
                  isActive
                    ? "bg-[#017FE6] text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>

              <span className="flex-1 text-sm font-medium">
                {item.label}
              </span>

              {item.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}

              {item.dot && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
