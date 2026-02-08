import { useEffect, useState } from "react"
import Analytics from "./Analytics"
import AIInsights from "./AIInsights"
import Blockchain from "./Blockchain"
import Verification from "./Verification"
import Payments from "./Payments"
import Sidebar from "./Sidebar"
import Dashboard from "./Dashboard"
import Bookings from "./Bookings"
import Vehicles from "./Vehicles"
import Users from "./Users"        // ✅ ADD
import Topbar from "./Topbar"

/* =========================
   ALLOWED PAGES
========================= */
export type Page =
  | "Dashboard"
  | "Bookings"
  | "Vehicles"
  | "Users"
  | "Payments"
  | "Verification"
  | "Blockchain"
  | "Analytics"
  | "Insights"



export default function App() {
  const [activePage, setActivePage] = useState<Page>("Dashboard")

  /* HTML showSection() equivalent */
  useEffect(() => {
    const handler = (event: Event) => {
      const e = event as CustomEvent<Page>
      if (e.detail) {
        setActivePage(e.detail)
      }
    }

    window.addEventListener("navigate", handler)
    return () => window.removeEventListener("navigate", handler)
  }, [])

  return (
    // 🔒 lock viewport height, DO NOT change colors
    <div className="h-screen bg-white flex overflow-hidden">
      {/* SIDEBAR — fixed */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR — fixed */}
        <Topbar title={activePage} />

        {/* PAGE CONTENT — ONLY THIS SCROLLS */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          {activePage === "Insights" && <AIInsights />}
          {activePage === "Verification" && <Verification />}
          {activePage === "Analytics" && <Analytics />}
          {activePage === "Payments" && <Payments />}
          {activePage === "Dashboard" && <Dashboard />}
          {activePage === "Bookings" && <Bookings />}
          {activePage === "Vehicles" && <Vehicles />}
          {activePage === "Blockchain" && <Blockchain />}
          {activePage === "Users" && <Users />}     {/* ✅ THIS IS THE KEY */}
        </main>
      </div>
    </div>
  )
}
