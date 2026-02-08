import { useState } from "react"

/* =====================
   TYPES
===================== */
type VerificationStatus = "Pending" | "Approved" | "Rejected"

type Verification = {
  id: string
  user: string
  idType: string
  idNumber: string
  status: VerificationStatus
}

type EmergencyContact = {
  id: string
  user: string
  contact: string
  relationship: string
  phone: string
}

/* =====================
   SAMPLE DATA
===================== */
const verificationSeed: Verification[] = [
  {
    id: "v1",
    user: "Emily Davis",
    idType: "Passport",
    idNumber: "••••9912",
    status: "Pending",
  },
  {
    id: "v2",
    user: "Kevin Brown",
    idType: "Driver License",
    idNumber: "••••2233",
    status: "Pending",
  },
]

const emergencySeed: EmergencyContact[] = [
  {
    id: "e1",
    user: "John Smith",
    contact: "Jane Smith",
    relationship: "Spouse",
    phone: "+1 234-567-8902",
  },
  {
    id: "e2",
    user: "Sarah Wilson",
    contact: "Mark Wilson",
    relationship: "Brother",
    phone: "+1 234-567-8910",
  },
]

/* =====================
   PAGE
===================== */
export default function Verification() {
  const [verifications, setVerifications] =
    useState<Verification[]>(verificationSeed)

  const approve = (id: string) => {
    setVerifications((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: "Approved" } : v
      )
    )
  }

  const reject = (id: string) => {
    setVerifications((prev) => prev.filter((v) => v.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Verification Center
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Review identity and emergency contact submissions
        </p>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= LEFT ================= */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-300 shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-300 bg-slate-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending ID Verifications
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Government-issued ID submissions awaiting review
            </p>
          </div>

          <div className="p-6 space-y-4">
            {verifications.length === 0 && (
              <p className="text-sm text-gray-500">
                No pending verifications.
              </p>
            )}

            {verifications.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-gray-300 bg-slate-50 shadow-sm p-5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {v.user}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {v.idType} — {v.idNumber}
                    </p>
                  </div>

                  <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                    Pending
                  </span>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => approve(v.id)}
                    className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-sm"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => reject(v.id)}
                    className="flex-1 h-10 rounded-xl bg-red-500/10 text-red-700 font-semibold hover:bg-red-500/20"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= RIGHT ================= */}
        <div className="rounded-2xl bg-white border border-gray-300 shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-300 bg-slate-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Emergency Contacts Review
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Verified emergency contacts linked to users
            </p>
          </div>

          <div className="p-6 space-y-5">
            {emergencySeed.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-gray-300 bg-slate-50 shadow-sm p-5"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {e.user}
                    </p>
                    <p className="text-xs text-gray-600">
                      Emergency Contact Record
                    </p>
                  </div>

                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                    Verified
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">
                      Contact Name
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {e.contact}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">
                      Phone
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {e.phone}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">
                      Relationship
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {e.relationship}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
