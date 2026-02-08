import { useMemo } from "react"

/* =====================
   TYPES
===================== */
type Stat = {
  label: string
  value: string
}

type ChainTxStatus = "Confirmed" | "Processing"

type ChainTx = {
  id: string
  title: string
  hash: string
  status: ChainTxStatus
}

/* =====================
   DATA
===================== */
const statsSeed: Stat[] = [
  { label: "Total Transactions", value: "2,847" },
  { label: "Smart Contracts", value: "156" },
  { label: "Verified Records", value: "100%" },
]

const txSeed: ChainTx[] = [
  {
    id: "t1",
    title: "Rental Agreement #BK-2024-001",
    hash: "0x7a3b...4f2e",
    status: "Confirmed",
  },
  {
    id: "t2",
    title: "Payment Verification #TXN-003",
    hash: "0x8b4c...5d3f",
    status: "Processing",
  },
]

/* =====================
   PAGE
===================== */
export default function Blockchain() {
  const stats = useMemo(() => statsSeed, [])
  const txs = useMemo(() => txSeed, [])

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-[#017FE6] text-white flex items-center justify-center shadow-[0_12px_30px_rgba(1,127,230,0.35)]">
          ⚗️
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Blockchain Integration
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Secure & Transparent Transaction Records
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>

      {/* TRANSACTIONS */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.10)] overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Blockchain Transactions
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Latest activity recorded on-chain
          </p>
        </div>

        <div className="p-6 space-y-4">
          {txs.map((tx) => (
            <TxRow key={tx.id} tx={tx} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* =====================
   UI PARTS
===================== */

function StatCard({ stat }: { stat: Stat }) {
  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.10)] overflow-hidden">
      {/* top accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#017FE6] to-sky-400" />

      <div className="p-6">
        <p className="text-sm text-gray-600">{stat.label}</p>
        <p className="mt-3 text-3xl font-extrabold text-gray-900 tracking-tight">
          {stat.value}
        </p>
      </div>
    </div>
  )
}

function TxRow({ tx }: { tx: ChainTx }) {
  const confirmed = tx.status === "Confirmed"

  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-between shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_18px_45px_rgba(0,0,0,0.12)] transition">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold border shadow-sm
            ${
              confirmed
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
        >
          {confirmed ? "✓" : "⏳"}
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {tx.title}
          </p>
          <p className="text-sm text-gray-600 mt-1 truncate">
            {tx.hash}
          </p>
        </div>
      </div>

      <StatusPill status={tx.status} />
    </div>
  )
}

function StatusPill({ status }: { status: ChainTxStatus }) {
  return status === "Confirmed" ? (
    <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
      Confirmed
    </span>
  ) : (
    <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
      Processing
    </span>
  )
}
