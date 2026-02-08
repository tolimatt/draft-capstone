import { useMemo } from "react"

/* =====================
   TYPES
===================== */
type PaymentStatus = "Completed" | "Held"

type PaymentType =
  | "Downpayment"
  | "Full Payment"
  | "Security Deposit"
  | "Insurance"

type Payment = {
  id: string
  customer: string
  type: PaymentType
  amount: number
  date: string
  status: PaymentStatus
}

/* =====================
   SAMPLE PAYMENTS
===================== */
const payments: Payment[] = [
  {
    id: "TXN-001",
    customer: "John Smith",
    type: "Downpayment",
    amount: 75,
    date: "Jan 15, 2024",
    status: "Completed",
  },
  {
    id: "TXN-002",
    customer: "Sarah Wilson",
    type: "Full Payment",
    amount: 360,
    date: "Jan 15, 2024",
    status: "Completed",
  },
  {
    id: "TXN-003",
    customer: "Mike Johnson",
    type: "Security Deposit",
    amount: 200,
    date: "Jan 14, 2024",
    status: "Held",
  },
  {
    id: "TXN-004",
    customer: "Emma Davis",
    type: "Insurance",
    amount: 45,
    date: "Jan 14, 2024",
    status: "Completed",
  },
]

/* =====================
   PAGE
===================== */
export default function Payments() {
  const stats = useMemo(() => {
    return {
      today: 3245,
      pending: 1890,
      refunds: 456,
      deposits: 12500,
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
        <p className="text-sm text-gray-500">
          Overview of recent transactions and payment activity
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Revenue" value={`$${stats.today.toLocaleString()}`} color="emerald" />
        <StatCard label="Pending Payments" value={`$${stats.pending.toLocaleString()}`} color="amber" />
        <StatCard label="Refunds Processed" value={`$${stats.refunds.toLocaleString()}`} color="red" />
        <StatCard label="Security Deposits" value={`$${stats.deposits.toLocaleString()}`} color="blue" />
      </div>

      {/* TABLE */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <Th>Transaction ID</Th>
                <Th>Customer</Th>
                <Th>Type</Th>
                <Th>Amount</Th>
                <Th>Date</Th>
                <Th>Status</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <Td className="font-medium text-[#017FE6]">#{p.id}</Td>
                  <Td>{p.customer}</Td>
                  <Td>
                    <TypePill type={p.type} />
                  </Td>
                  <Td className="font-semibold">${p.amount.toFixed(2)}</Td>
                  <Td className="text-gray-600">{p.date}</Td>
                  <Td>
                    <StatusPill status={p.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* =====================
   UI PARTS
===================== */

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-4 text-left font-semibold">{children}</th>
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={`px-6 py-4 align-middle text-gray-800 ${className}`}>{children}</td>
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: "emerald" | "amber" | "red" | "blue"
}) {
  const colors = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-[#017FE6]",
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${colors[color]}`}>
        {value}
      </p>
    </div>
  )
}

function StatusPill({ status }: { status: PaymentStatus }) {
  return status === "Completed" ? (
    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700">
      Completed
    </span>
  ) : (
    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700">
      Held
    </span>
  )
}

function TypePill({ type }: { type: PaymentType }) {
  const map: Record<PaymentType, string> = {
    Downpayment: "bg-indigo-500/15 text-indigo-700",
    "Full Payment": "bg-emerald-500/15 text-emerald-700",
    "Security Deposit": "bg-amber-500/15 text-amber-700",
    Insurance: "bg-sky-500/15 text-sky-700",
  }

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${map[type]}`}>
      {type}
    </span>
  )
}
