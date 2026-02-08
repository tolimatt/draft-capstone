import { useMemo, useState } from "react"

/* =====================
   TYPES
===================== */
type UserStatus = "Active" | "Pending"

type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  verified: boolean
  bookings: number
  spent: number
  status: UserStatus
  idType: string
  idNumber: string
  license: string
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
}

/* =====================
   SAMPLE USERS (HTML-ish)
===================== */
const seedUsers: User[] = [
  {
    id: "u1",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@email.com",
    phone: "+1 234-567-8901",
    verified: true,
    bookings: 12,
    spent: 2450,
    status: "Active",
    idType: "Passport",
    idNumber: "••••4521",
    license: "DL-12345678 (Valid)",
    emergencyName: "Jane Smith",
    emergencyRelationship: "Spouse",
    emergencyPhone: "+1 234-567-8902",
  },
  {
    id: "u2",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike.johnson@email.com",
    phone: "+1 234-567-8903",
    verified: true,
    bookings: 8,
    spent: 1680,
    status: "Active",
    idType: "Driver License",
    idNumber: "••••8765",
    license: "DL-87654321 (Valid)",
    emergencyName: "Lisa Johnson",
    emergencyRelationship: "Sister",
    emergencyPhone: "+1 234-567-8904",
  },
  {
    id: "u3",
    firstName: "Sarah",
    lastName: "Wilson",
    email: "sarah.wilson@email.com",
    phone: "+1 234-567-8905",
    verified: true,
    bookings: 15,
    spent: 3890,
    status: "Active",
    idType: "National ID",
    idNumber: "••••1190",
    license: "DL-55667788 (Valid)",
    emergencyName: "Mark Wilson",
    emergencyRelationship: "Brother",
    emergencyPhone: "+1 234-567-8910",
  },
  {
    id: "u4",
    firstName: "Emily",
    lastName: "Davis",
    email: "emily.davis@email.com",
    phone: "+1 234-567-8907",
    verified: false,
    bookings: 3,
    spent: 520,
    status: "Pending",
    idType: "Passport",
    idNumber: "••••9912",
    license: "DL-22223333 (Pending)",
    emergencyName: "Kevin Davis",
    emergencyRelationship: "Father",
    emergencyPhone: "+1 234-567-8911",
  },
]

/* =====================
   USERS PAGE
===================== */
const emptyAddForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  idType: "Passport",
  idNumber: "",
  license: "",
  emergencyName: "",
  emergencyRelationship: "Spouse",
  emergencyPhone: "",
  markVerified: false,
}

export default function Users() {

const [showAdd, setShowAdd] = useState(false)

const [addForm, setAddForm] = useState(emptyAddForm)


    const deleteUser = (id: string) => {
  setUsers((prev) => prev.filter((u) => u.id !== id))
  setDetailId(null)
}

  const [users, setUsers] = useState<User[]>(seedUsers)
  const [detailId, setDetailId] = useState<string | null>(null)

  const detail = useMemo(
    () => users.find((u) => u.id === detailId) || null,
    [users, detailId]
  )

  const toggleStatus = (id: string) => {
  setUsers((prev) =>
    prev.map((u) => {
      if (u.id !== id) return u

      const nextStatus = u.status === "Active" ? "Pending" : "Active"

      return {
        ...u,
        status: nextStatus,
        verified: nextStatus === "Active", // 🔑 sync verification
      }
    })
  )
}


  const addUser = () => {
  if (!addForm.firstName || !addForm.lastName || !addForm.email) return

  setUsers((prev) => [
    {
      id: `u${Date.now()}`,
      firstName: addForm.firstName,
      lastName: addForm.lastName,
      email: addForm.email,
      phone: addForm.phone || "—",
      verified: addForm.markVerified,
      bookings: 0,
      spent: 0,
      status: addForm.markVerified ? "Active" : "Pending",
      idType: addForm.idType,
      idNumber: addForm.idNumber || "—",
      license: addForm.license || "—",
      emergencyName: addForm.emergencyName || "—",
      emergencyRelationship: addForm.emergencyRelationship,
      emergencyPhone: addForm.emergencyPhone || "—",
    },
    ...prev,
  ])

  setShowAdd(false)
}


  return (
    <div className="space-y-6">
      {/* SECTION TITLE (Topbar already shows title, so keep this subtle like HTML section header) */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>

        <div className="flex items-center gap-3">
          <input
            placeholder="Search users..."
            className="h-10 w-56 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[#017FE6]/25"
          />
          <button
  onClick={() => {
    setAddForm(emptyAddForm)   // ← RESET FORM FIRST
    setShowAdd(true)          // ← THEN OPEN MODAL
  }}
  className="h-10 rounded-xl bg-[#017FE6] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#017FE6]/90"
>
  Add User
</button>

        </div>
      </div>

      {/* TABLE CARD */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Verification</Th>
                <Th>Bookings</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#017FE6] text-white flex items-center justify-center font-bold text-sm">
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </div>
                      <div className="leading-tight">
                        <p className="font-semibold text-gray-900">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-gray-500">Member since Jan 2023</p>
                      </div>
                    </div>
                  </Td>

                  <Td className="text-gray-700">{u.email}</Td>
                  <Td className="text-gray-700">{u.phone}</Td>

                  <Td>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          u.verified ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      <span className="text-gray-800">
                        {u.verified ? "Verified" : "Pending"}
                      </span>
                    </span>
                  </Td>

                  <Td className="text-gray-900 font-medium">{u.bookings}</Td>

                  <Td>
                    <StatusPill status={u.status} />
                  </Td>

                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      {/* Eye */}
                      <IconBtn title="View" onClick={() => setDetailId(u.id)}>
                        👁
                      </IconBtn>

                      {/* Pencil - toggles status */}
                      <IconBtn
                        title="Toggle Status"
                        onClick={() => toggleStatus(u.id)}
                      >
                        ✎
                      </IconBtn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER DETAILS MODAL (LIGHT, MATCHING APP) */}
      {detail && (
        <Modal title="User Details" onClose={() => setDetailId(null)}>
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-[#017FE6] text-white flex items-center justify-center text-2xl font-bold shadow-sm">
              {detail.firstName[0]}
              {detail.lastName[0]}
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">
              {detail.firstName} {detail.lastName}
            </h3>
            <p className="text-gray-600">{detail.email}</p>

            <div className="mt-2 inline-flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${detail.verified ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="font-medium text-gray-800">
                {detail.verified ? "Verified User" : "Pending Verification"}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <InfoCard label="Phone Number" value={detail.phone} />
            <InfoCard label="Valid ID" value={`${detail.idType} - ${detail.idNumber}`} />
            <InfoCard label="Driver’s License" value={detail.license} />
            <InfoCard
              label="Emergency Contact"
              value={`${detail.emergencyName} (${detail.emergencyRelationship}) — ${detail.emergencyPhone}`}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MiniStat label="Total Bookings" value={detail.bookings} />
            <MiniStat label="Total Spent" value={`$${detail.spent.toLocaleString()}`} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="h-11 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50">
              {detail.verified ? "Unverify User" : "Verify User"}
            </button>
            <button className="h-11 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50">
              Block User
            </button>
          </div>

          <button 
          onClick={() => deleteUser(detail.id)}
          className="mt-3 w-full h-11 rounded-xl bg-red-500/10 text-red-700 font-semibold hover:bg-red-500/15">
            Delete User
          </button>
        </Modal>
      )}

      {showAdd && (
  <Modal title="Add New User" onClose={() => setShowAdd(false)}>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="First Name"
          value={addForm.firstName}
          onChange={(e) =>
            setAddForm((s) => ({ ...s, firstName: e.target.value }))
          }
          className="h-11 rounded-xl border border-gray-200 px-4"
        />
        <input
          placeholder="Last Name"
          value={addForm.lastName}
          onChange={(e) =>
            setAddForm((s) => ({ ...s, lastName: e.target.value }))
          }
          className="h-11 rounded-xl border border-gray-200 px-4"
        />
      </div>

      <input
        placeholder="Email Address"
        value={addForm.email}
        onChange={(e) =>
          setAddForm((s) => ({ ...s, email: e.target.value }))
        }
        className="h-11 w-full rounded-xl border border-gray-200 px-4"
      />

      <input
        placeholder="Phone Number"
        value={addForm.phone}
        onChange={(e) =>
          setAddForm((s) => ({ ...s, phone: e.target.value }))
        }
        className="h-11 w-full rounded-xl border border-gray-200 px-4"
      />

      <div className="grid grid-cols-2 gap-4">
        <select
          value={addForm.idType}
          onChange={(e) =>
            setAddForm((s) => ({ ...s, idType: e.target.value }))
          }
          className="h-11 rounded-xl border border-gray-200 px-4"
        >
          <option>Passport</option>
          <option>Driver License</option>
          <option>National ID</option>
        </select>

        <input
          placeholder="ID Number"
          value={addForm.idNumber}
          onChange={(e) =>
            setAddForm((s) => ({ ...s, idNumber: e.target.value }))
          }
          className="h-11 rounded-xl border border-gray-200 px-4"
        />
      </div>

      <input
        placeholder="Driver’s License Number"
        value={addForm.license}
        onChange={(e) =>
          setAddForm((s) => ({ ...s, license: e.target.value }))
        }
        className="h-11 w-full rounded-xl border border-gray-200 px-4"
      />

      <div className="border-t pt-4 text-sm font-semibold text-gray-700">
        Emergency Contact Information
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Contact Name"
          value={addForm.emergencyName}
          onChange={(e) =>
            setAddForm((s) => ({ ...s, emergencyName: e.target.value }))
          }
          className="h-11 rounded-xl border border-gray-200 px-4"
        />
        <select
          value={addForm.emergencyRelationship}
          onChange={(e) =>
            setAddForm((s) => ({
              ...s,
              emergencyRelationship: e.target.value,
            }))
          }
          className="h-11 rounded-xl border border-gray-200 px-4"
        >
          <option>Spouse</option>
          <option>Parent</option>
          <option>Sibling</option>
          <option>Friend</option>
        </select>
      </div>

      <input
        placeholder="Contact Phone"
        value={addForm.emergencyPhone}
        onChange={(e) =>
          setAddForm((s) => ({ ...s, emergencyPhone: e.target.value }))
        }
        className="h-11 w-full rounded-xl border border-gray-200 px-4"
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={addForm.markVerified}
          onChange={(e) =>
            setAddForm((s) => ({ ...s, markVerified: e.target.checked }))
          }
        />
        Mark as verified
      </label>

      <div className="grid grid-cols-2 gap-3 pt-4">
        <button
          onClick={() => setShowAdd(false)}
          className="h-11 rounded-xl border border-gray-200 bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={addUser}
          className="h-11 rounded-xl bg-[#017FE6] text-white font-semibold"
        >
          Add User
        </button>
      </div>
    </div>
  </Modal>
)}

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
  return <td className={`px-6 py-4 align-middle ${className}`}>{children}</td>
}

function StatusPill({ status }: { status: UserStatus }) {
  if (status === "Active") {
    return (
      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700">
        Active
      </span>
    )
  }
  return (
    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700">
      Pending
    </span>
  )
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition shadow-sm"
    >
      {children}
    </button>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <>
      <button
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-6">{children}</div>
        </div>
      </div>
    </>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
