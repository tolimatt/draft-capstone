import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CarFront, Clock3, CreditCard, MapPin, Users } from "lucide-react";
import API from "../../utils/api";
import { getSocket } from "../../utils/socket";
import { getTransactionFee } from "../../utils/fees";
import { formatDurationMinutes, getDurationHoursFromMinutes, getDurationMinutesBetween } from "../../utils/dateUtils";
import { resolveAssetUrl } from "../../utils/media";

const statusFilters = [
  { id: "action", label: "Needs Approval" },
  { id: "active", label: "Active Rentals" },
  { id: "past", label: "Past Bookings" },
  { id: "all", label: "All Bookings" },
];
const statusStyles = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  extended: "bg-violet-100 text-violet-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};
const paymentStyles = {
  unpaid: "bg-gray-200 text-gray-700",
  partial: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
  refunded: "bg-blue-100 text-blue-700",
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "-");
const money = (value) =>
  `\u20b1${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
const toTitleCase = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
const normalizeBookingStatus = (booking) =>
  booking?.status === "rejected" ? { ...booking, status: "cancelled" } : booking;
const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "extended"];
const PAST_BOOKING_STATUSES = ["completed", "cancelled", "rejected"];
const bookingNeedsOwnerAction = (booking) => {
  const status = String(booking?.status || "").toLowerCase();
  return (
    status === "pending" ||
    String(booking?.extensionStatus || booking?.extension_request?.status || "").toLowerCase() === "requested" ||
    String(booking?.cancellationStatus || booking?.cancellation_request?.status || "").toLowerCase() === "requested" ||
    getWalkInStatus(booking) === "requested" ||
    (Boolean(booking?.lateReturn?.isOverdue || booking?.late_return?.isOverdue) &&
      ["confirmed", "extended"].includes(status))
  );
};
const bookingMatchesView = (booking, view) => {
  const status = String(booking?.status || "").toLowerCase();
  if (view === "action") return bookingNeedsOwnerAction(booking);
  if (view === "active") return ACTIVE_BOOKING_STATUSES.includes(status);
  if (view === "past") return PAST_BOOKING_STATUSES.includes(status);
  return true;
};
const getWalkInStatus = (booking) =>
  String(booking?.walkInPayment?.status || booking?.walk_in_payment?.status || "none")
    .trim()
    .toLowerCase();

const getLateReturnInfo = (booking) => {
  const lateReturn = booking?.lateReturn || booking?.late_return || {};
  const overdueMinutes = Number(lateReturn?.overdueMinutes || 0);
  const penaltyFee = Number(lateReturn?.penaltyFee || booking?.lateReturnPenaltyFee || 0);
  return {
    isOverdue: Boolean(lateReturn?.isOverdue),
    overdueMinutes: Number.isFinite(overdueMinutes) && overdueMinutes > 0 ? Math.round(overdueMinutes) : 0,
    penaltyFee: Number.isFinite(penaltyFee) && penaltyFee > 0 ? penaltyFee : 0,
  };
};

const getExtensionRequestInfo = (booking) => {
  const extension = booking?.extensionRequest || booking?.extension_request || {};
  return {
    status: String(extension?.status || "none").trim().toLowerCase(),
    requestedReturnAt: extension?.requestedReturnAt || null,
    requestNote: String(extension?.requestNote || "").trim(),
    reviewNote: String(extension?.reviewNote || "").trim(),
  };
};
const getCancellationRequestInfo = (booking) => {
  const cancellation = booking?.cancellationRequest || booking?.cancellation_request || {};
  return {
    status: String(cancellation?.status || "none").trim().toLowerCase(),
    requestNote: String(cancellation?.requestNote || "").trim(),
    reviewNote: String(cancellation?.reviewNote || "").trim(),
  };
};
const getBookingDurationMinutesForPricing = (booking) => {
  const directMinutes = Number(booking?.bookingDurationMinutes);
  if (Number.isFinite(directMinutes) && directMinutes > 0) return Math.round(directMinutes);

  if (booking?.pickupAt && booking?.returnAt) {
    const rangeMinutes = getDurationMinutesBetween(booking.pickupAt, booking.returnAt);
    if (rangeMinutes > 0) return rangeMinutes;
  }

  const directHours = Number(booking?.bookingDurationHours);
  if (Number.isFinite(directHours) && directHours > 0) return Math.round(directHours * 60);

  const bookingDays = Number(booking?.bookingDays || 0);
  if (Number.isFinite(bookingDays) && bookingDays > 0) return Math.round(bookingDays * 24 * 60);

  return 0;
};

const getRentalTotal = (booking) => {
  const latePenalty = Number(
    booking?.lateReturnPenaltyFee ?? booking?.lateReturn?.penaltyFee ?? booking?.late_return?.penaltyFee ?? 0
  );
  const safeLatePenalty = Number.isFinite(latePenalty) && latePenalty > 0 ? latePenalty : 0;

  const total = Number(booking?.totalAmount);
  if (Number.isFinite(total) && total >= 0) return total + safeLatePenalty;

  const baseAmount = Number(booking?.baseAmount);
  const driverAmount = Number(booking?.driverAmount);
  if (Number.isFinite(baseAmount) && Number.isFinite(driverAmount) && baseAmount + driverAmount >= 0) {
    return baseAmount + driverAmount + safeLatePenalty;
  }

  const durationHours = getDurationHoursFromMinutes(getBookingDurationMinutesForPricing(booking));
  const hourlyRate = Number((booking?.vehicleHourlyRate ?? booking?.vehicleDailyRate) || 0);
  if (Number.isFinite(hourlyRate) && hourlyRate >= 0 && Number.isFinite(durationHours) && durationHours > 0) {
    const driverHourlyRate = Number((booking?.driverHourlyRate ?? booking?.driverDailyRate) || 0);
    const driverSelected = Boolean(booking?.driverSelected);
    const computedDriverAmount =
      driverSelected && Number.isFinite(driverHourlyRate) && driverHourlyRate > 0
        ? driverHourlyRate * durationHours
        : 0;
    return hourlyRate * durationHours + computedDriverAmount + safeLatePenalty;
  }

  const payable = Number(booking?.amountPayable);
  if (Number.isFinite(payable) && payable >= 0) return payable;

  return safeLatePenalty;
};

const getPayableAmount = (booking) => getRentalTotal(booking) + getTransactionFee();

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("action");
  const [bookingPage, setBookingPage] = useState({ hasMore: false, nextCursor: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [walkInActionBookingId, setWalkInActionBookingId] = useState("");

  const loadBookings = async ({ cursor = null, append = false } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const response = await API.getOwnerBookings({
        view: statusFilter,
        limit: 25,
        ...(cursor ? { cursor } : {}),
      });
      const mapped = (response.bookings || []).map(normalizeBookingStatus);
      setBookings((previous) => (append ? [...previous, ...mapped] : mapped));
      setBookingPage(response.page || { hasMore: false, nextCursor: null });
    } catch (err) {
      setError(err.message || "Failed to load bookings.");
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleBookingUpdate = (booking) => {
      setBookings((prev) => {
        const normalized = normalizeBookingStatus(booking);
        const exists = prev.some((item) => item._id === normalized._id);
        if (exists) {
          return prev.map((item) => (item._id === normalized._id ? normalized : item));
        }
        return [normalized, ...prev];
      });
    };

    socket.on("booking:updated", handleBookingUpdate);
    return () => socket.off("booking:updated", handleBookingUpdate);
  }, []);

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => bookingMatchesView(booking, statusFilter)),
    [bookings, statusFilter]
  );

  const updateBookingStatus = async (bookingId, nextStatus) => {
    try {
      const response = await API.updateOwnerBookingStatus(bookingId, nextStatus);
      const normalized = normalizeBookingStatus(response.booking);
      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId ? normalized : booking
        )
      );
    } catch (err) {
      setError(err.message || "Failed to update booking status.");
    }
  };

  const updatePaymentStatus = async (bookingId, paymentStatus) => {
    try {
      const response = await API.updateOwnerBookingPaymentStatus(bookingId, paymentStatus);
      const normalized = normalizeBookingStatus(response.booking);
      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId ? normalized : booking
        )
      );
    } catch (err) {
      setError(err.message || "Failed to update payment status.");
    }
  };

  const reviewExtensionRequest = async (bookingId, action) => {
    try {
      setWalkInActionBookingId(bookingId);
      const response = await API.reviewOwnerBookingExtensionRequest(bookingId, action);
      const normalized = normalizeBookingStatus(response.booking);
      setBookings((prev) => prev.map((booking) => (booking._id === bookingId ? normalized : booking)));
    } catch (err) {
      setError(err.message || "Failed to review extension request.");
    } finally {
      setWalkInActionBookingId("");
    }
  };

  const reviewCancellationRequest = async (bookingId, action) => {
    try {
      setWalkInActionBookingId(bookingId);
      const response = await API.reviewOwnerBookingCancellationRequest(bookingId, action);
      const normalized = normalizeBookingStatus(response.booking);
      setBookings((prev) => prev.map((booking) => (booking._id === bookingId ? normalized : booking)));
    } catch (err) {
      setError(err.message || "Failed to review cancellation request.");
    } finally {
      setWalkInActionBookingId("");
    }
  };

  const reviewWalkInRequest = async (bookingId, action) => {
    try {
      setWalkInActionBookingId(bookingId);
      const response = await API.reviewOwnerWalkInPaymentRequest(bookingId, action);
      const normalized = normalizeBookingStatus(response.booking);
      setBookings((prev) => prev.map((booking) => (booking._id === bookingId ? normalized : booking)));
    } catch (err) {
      setError(err.message || "Failed to review walk-in request.");
    } finally {
      setWalkInActionBookingId("");
    }
  };

  const confirmWalkInPayment = async (bookingId) => {
    try {
      setWalkInActionBookingId(bookingId);
      const response = await API.confirmOwnerWalkInPayment(bookingId);
      const normalized = normalizeBookingStatus(response.booking);
      setBookings((prev) => prev.map((booking) => (booking._id === bookingId ? normalized : booking)));
    } catch (err) {
      setError(err.message || "Failed to confirm walk-in payment.");
    } finally {
      setWalkInActionBookingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Booking management</h1>
        <p className="mt-1 text-sm text-slate-500">Review renter requests, active rentals, and payment activity.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {statusFilters.map((status) => (
          <button
            key={status.id}
            onClick={() => setStatusFilter(status.id)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              statusFilter === status.id
                ? "bg-[#017FE6] text-white shadow-md shadow-blue-100"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading bookings...</p>}

      {!loading && !filteredBookings.length && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#017FE6]"><CarFront size={26} /></div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Your queue is clear</h2>
          <p className="mt-1 text-sm text-slate-500">No bookings match this view right now. New renter activity will appear here.</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredBookings.map((booking) => {
          const lateReturnInfo = getLateReturnInfo(booking);
          const extensionInfo = getExtensionRequestInfo(booking);
          const cancellationInfo = getCancellationRequestInfo(booking);
          const vehicleImage = resolveAssetUrl(booking.vehicle?.imageUrl || booking.vehicle?.images?.[0] || "");

          return (
          <article key={booking._id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/70 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-blue-100 sm:h-24 sm:w-32">
                  {vehicleImage ? (
                    <img src={vehicleImage} alt={booking.vehicle?.name || "Vehicle"} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#017FE6]"><CarFront size={30} /></div>
                  )}
                </div>
                <div className="min-w-0 py-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#017FE6]">Booking #{String(booking._id || "").slice(-6).toUpperCase()}</p>
                  <h3 className="mt-1 truncate text-xl font-bold text-slate-900">{booking.vehicle?.name || "Vehicle"}</h3>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500"><Users size={14} className="text-slate-400" /> {booking.renter?.name || booking.renter?.email || "Renter details unavailable"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    statusStyles[booking.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {toTitleCase(booking.status)}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    paymentStyles[booking.paymentStatus] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {toTitleCase(booking.paymentStatus)}
                </span>
                {extensionInfo.status !== "none" && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      extensionInfo.status === "approved"
                        ? "bg-violet-100 text-violet-700"
                        : extensionInfo.status === "rejected"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    Extension {toTitleCase(extensionInfo.status)}
                  </span>
                )}
                {getWalkInStatus(booking) !== "none" && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      getWalkInStatus(booking) === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : getWalkInStatus(booking) === "rejected"
                          ? "bg-rose-100 text-rose-700"
                          : getWalkInStatus(booking) === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    Walk-in {toTitleCase(getWalkInStatus(booking))}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 border-y border-slate-100 py-4 text-sm md:grid-cols-2 xl:grid-cols-4">
              <Info icon={CalendarDays} title="Pickup" value={formatDateTime(booking.pickupAt)} />
              <Info icon={CalendarDays} title="Return" value={formatDateTime(booking.returnAt)} />
              <Info icon={Clock3} title="Duration" value={formatDurationMinutes(getBookingDurationMinutesForPricing(booking))} />
              <Info icon={MapPin} title="Location" value={booking.vehicle?.location || "-"} />
              <Info title="Vehicle Rate" value={`${money(booking.vehicleHourlyRate ?? booking.vehicleDailyRate)} / hr`} />
              <Info
                title="Driver Option"
                value={
                  booking.driverSelected
                    ? `Yes (${money(booking.driverHourlyRate ?? booking.driverDailyRate)} /hr)`
                    : "No"
                }
              />
              <Info title="Base Amount" value={money(booking.baseAmount)} />
              <Info
                title="Late Penalty"
                value={lateReturnInfo.penaltyFee > 0 ? money(lateReturnInfo.penaltyFee) : money(0)}
              />
              <Info icon={CreditCard} title="Total Payment" value={money(getPayableAmount(booking))} />
            </div>

            {lateReturnInfo.isOverdue && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Overdue return notice: renter has not returned the vehicle on time (overdue by{" "}
                {formatDurationMinutes(lateReturnInfo.overdueMinutes)}).
              </div>
            )}

            {extensionInfo.status === "requested" && (
              <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                Extension request pending review.
                {extensionInfo.requestedReturnAt ? ` Requested return: ${formatDateTime(extensionInfo.requestedReturnAt)}.` : ""}
              </div>
            )}



            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
              <div className="flex flex-wrap gap-2">
                {booking.status === "pending" && (
                  <>
                    <button
                      onClick={() => updateBookingStatus(booking._id, "confirmed")}
                      className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateBookingStatus(booking._id, "rejected")}
                      className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm"
                    >
                      Reject
                    </button>
                  </>
                )}
                {["confirmed", "extended"].includes(String(booking.status || "").toLowerCase()) && (
                  <button
                    onClick={() => updateBookingStatus(booking._id, "completed")}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm"
                  >
                    Mark Completed
                  </button>
                )}
                {["pending", "confirmed", "extended"].includes(String(booking.status || "").toLowerCase()) && (
                  <button
                    onClick={() => updateBookingStatus(booking._id, "cancelled")}
                    className="px-3 py-2 rounded-lg bg-gray-700 text-white text-sm"
                  >
                    Cancel
                  </button>
                )}
                {extensionInfo.status === "requested" && (
                  <>
                    <button
                      onClick={() => reviewExtensionRequest(booking._id, "approve")}
                      disabled={walkInActionBookingId === booking._id}
                      className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Approve Extension
                    </button>
                    <button
                      onClick={() => reviewExtensionRequest(booking._id, "reject")}
                      disabled={walkInActionBookingId === booking._id}
                      className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Reject Extension
                    </button>
                  </>
                )}
                {cancellationInfo.status === "requested" && (
                  <>
                    <button
                      onClick={() => reviewCancellationRequest(booking._id, "approve")}
                      disabled={walkInActionBookingId === booking._id}
                      className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Approve Cancellation
                    </button>
                    <button
                      onClick={() => reviewCancellationRequest(booking._id, "reject")}
                      disabled={walkInActionBookingId === booking._id}
                      className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Keep Booking
                    </button>
                  </>
                )}

                {getWalkInStatus(booking) === "requested" && (
                  <>
                    <button
                      onClick={() => reviewWalkInRequest(booking._id, "approve")}
                      disabled={walkInActionBookingId === booking._id}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Approve Walk-in
                    </button>
                    <button
                      onClick={() => reviewWalkInRequest(booking._id, "reject")}
                      disabled={walkInActionBookingId === booking._id}
                      className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Reject Walk-in
                    </button>
                  </>
                )}
                {getWalkInStatus(booking) === "approved" &&
                  String(booking.paymentStatus || "").toLowerCase() === "partial" && (
                    <button
                      onClick={() => confirmWalkInPayment(booking._id)}
                      disabled={walkInActionBookingId === booking._id}
                      className="px-3 py-2 rounded-lg bg-[#017FE6] text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Confirm Walk-in Received
                    </button>
                  )}
                {getWalkInStatus(booking) === "rejected" && (
                  <p className="w-full text-xs text-rose-700">Walk-in request was rejected.</p>
                )}
                {getWalkInStatus(booking) === "approved" && (
                  <p className="w-full text-xs text-emerald-700">
                    Walk-in request approved. Confirm once remaining balance is received.
                  </p>
                )}
                {getWalkInStatus(booking) === "completed" && (
                  <p className="w-full text-xs text-green-700">Walk-in payment has been confirmed.</p>
                )}
                {extensionInfo.status === "approved" && (
                  <p className="w-full text-xs text-violet-700">
                    Extension approved. Updated return schedule is now {formatDateTime(booking.returnAt)}.
                  </p>
                )}
                {extensionInfo.status === "rejected" && (
                  <p className="w-full text-xs text-rose-700">
                    Extension request rejected.
                    {extensionInfo.reviewNote ? ` Note: ${extensionInfo.reviewNote}` : ""}
                  </p>
                )}
                {cancellationInfo.status === "approved" && (
                  <p className="w-full text-xs text-amber-700">
                    Cancellation request approved. Booking has been cancelled.
                  </p>
                )}
                {cancellationInfo.status === "rejected" && (
                  <p className="w-full text-xs text-slate-700">
                    Cancellation request rejected. Booking remains active.
                    {cancellationInfo.reviewNote ? ` Note: ${cancellationInfo.reviewNote}` : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 md:justify-end">
                <label className="text-sm font-medium text-slate-600">Payment</label>
                <select
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#017FE6]"
                  value={booking.paymentStatus}
                  disabled={walkInActionBookingId === booking._id}
                  onChange={(e) => updatePaymentStatus(booking._id, e.target.value)}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </article>
          );
        })}
      </div>

      {bookingPage.hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => loadBookings({ cursor: bookingPage.nextCursor, append: true })}
            disabled={loadingMore}
            className="rounded-lg border border-[#017FE6] px-4 py-2 text-sm font-medium text-[#017FE6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : "Load more bookings"}
          </button>
        </div>
      )}
    </div>
  );
}

function Info({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">{Icon && <Icon size={13} className="text-[#017FE6]" />}{title}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
