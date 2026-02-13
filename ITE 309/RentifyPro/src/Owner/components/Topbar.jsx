import {
  Search,
  Bell,
  Plus,
  ArrowLeftRight,
} from "lucide-react";

export default function Topbar({ title, onSwitchToUser }) {
  return (
    <header
  className="sticky top-0 z-40 bg-[#017FE6] border-b border-white/20"
      style={{
        background: "#017FE6",
        borderBottom: "1px solid rgba(255,255,255,0.20)",
      }}
    >
      {/* MATCH SIDEBAR HEIGHT */}
      <div className="h-20 px-6 flex items-center justify-between gap-6">

        {/* LEFT */}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white leading-tight">
            {title}
          </h1>
          <p className="text-sm text-white/80">
            Welcome back! Here’s what’s happening today.
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">

          {/* SEARCH */}
          <div className="relative hidden md:block">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
            />
            <input
              placeholder="Search..."
              className="
                w-72 h-10 rounded-xl
                bg-white/15 border border-white/20
                pl-10 pr-4 text-sm
                text-white placeholder:text-white/60
                outline-none
                focus:ring-2 focus:ring-white/25
              "
            />
          </div>

          {/* NOTIFICATIONS */}
          <button
            className="
              relative w-10 h-10 rounded-xl
              bg-white/15 border border-white/20
              hover:bg-white/25 transition
              flex items-center justify-center
            "
            title="Notifications"
          >
            <Bell size={18} className="text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
          </button>

          {/* SWITCH TO USER */}
          <button
            onClick={onSwitchToUser}
            className="
              h-10 px-4 rounded-xl
              bg-white/15 border border-white/20
              text-white text-sm font-semibold
              hover:bg-white/25 transition
              flex items-center gap-2
            "
          >
            <ArrowLeftRight size={16} />
            Switch to User
          </button>

          {/* ADD VEHICLE */}
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("navigate", { detail: "Vehicles" })
              );
              setTimeout(() => {
                window.dispatchEvent(new Event("open-add-vehicle"));
              }, 0);
            }}
            className="
              h-10 px-4 rounded-xl
              bg-white text-[#017FE6]
              font-semibold
              hover:bg-white/90 transition
              flex items-center gap-2
            "
            style={{
              boxShadow: "0 10px 22px rgba(0,0,0,0.18)",
            }}
          >
            <Plus size={18} />
            Add Vehicle
          </button>
        </div>
      </div>
    </header>
  );
}
