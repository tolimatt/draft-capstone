type TopbarProps = {
  title: string
}

export default function Topbar({ title }: TopbarProps) {
  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "#017FE6",
        borderBottom: "1px solid rgba(255,255,255,0.20)", // ✅ same style as sidebar divider
      }}
    >
      {/* ✅ IMPORTANT: fixed height to match sidebar header */}
      <div className="h-20 px-6 flex items-center justify-between gap-4">
        {/* LEFT */}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white leading-tight">
            {title}
          </h1>
          <p className="text-white/80 text-sm leading-tight">
            Welcome back! Here’s what’s happening today.
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <input
              placeholder="Search..."
              className="
                w-72 h-10 rounded-xl
                bg-white/15 border border-white/20
                pl-10 pr-4 text-sm text-white placeholder:text-white/70
                outline-none
                focus:border-white/40
                focus:ring-2 focus:ring-white/25
              "
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80">
              🔍
            </span>
          </div>

          {/* Notification */}
          <button
            className="
              relative w-10 h-10 rounded-xl
              bg-white/15 border border-white/20
              hover:bg-white/20 transition
              flex items-center justify-center text-white
            "
            title="Notifications"
          >
            🔔
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
          </button>

          {/* Add Vehicle */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("navigate", { detail: "Vehicles" }))
              setTimeout(() => {
                window.dispatchEvent(new Event("open-add-vehicle"))
              }, 0)
            }}
            className="
              h-10 px-4 rounded-xl
              bg-white text-[#017FE6] font-semibold
              hover:bg-white/90 transition
            "
            style={{
              boxShadow: "0 10px 22px rgba(0,0,0,0.18)",
            }}
          >
            + Add Vehicle
          </button>
        </div>
      </div>
    </header>
  )
}
