import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import { createNotification } from "../utils/notification.js";
import { emitToUser } from "../socket/index.js";
import { syncVehicleAvailabilityByBookingState } from "../utils/vehicleAvailability.js";
import { getTransactionFee } from "../utils/fees.js";
import {
  applyLedgerRecordToBooking,
  getBookingLedgerConfig,
  getBookingLedgerEligibility,
  getSepoliaTxUrl,
  recordBookingTransactionOnChain as recordBookingTransactionOnLedger,
} from "../utils/blockchainBooking.js";
import {
  HOURLY_RATE_UNIT,
  getBookingDriverHourlyRate,
  getBookingDurationHours,
  getBookingDurationMinutes,
  getBookingVehicleHourlyRate,
  roundCurrency,
} from "../utils/pricing.js";

const STATUSES = new Set(["pending", "confirmed", "extended", "completed", "cancelled", "rejected"]);
const PAYMENT_STATUSES = new Set(["unpaid", "partial", "paid", "refunded"]);
const WALK_IN_PAYMENT_STATUSES = new Set(["none", "requested", "approved", "rejected", "completed"]);
const WALK_IN_REVIEW_ACTIONS = new Set(["approve", "reject"]);
const EXTENSION_STATUSES = new Set(["none", "requested", "approved", "rejected"]);
const EXTENSION_REVIEW_ACTIONS = new Set(["approve", "reject"]);
const ACTIVE_BOOKING_STATUSES = new Set(["confirmed", "extended"]);
const ACTIVE_OVERLAP_STATUSES = ["pending", "confirmed", "extended"];
const LATE_RETURN_PENALTY_MULTIPLIER_DEFAULT = 0.25;
const BOOKING_AUTO_COMPLETE_GRACE_MINUTES_DEFAULT = 0;
const BOOKING_OVERDUE_GRACE_MINUTES_DEFAULT = 0;

const getLateReturnPenaltyMultiplier = () => {
  const raw = Number(process.env.LATE_RETURN_PENALTY_MULTIPLIER);
  if (!Number.isFinite(raw) || raw < 0) return LATE_RETURN_PENALTY_MULTIPLIER_DEFAULT;
  return raw;
};

const parseGraceMinutes = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return Math.floor(numeric);
};

const getOwnerBookingLifecycleGracePolicy = () => ({
  autoCompleteMinutes: parseGraceMinutes(
    process.env.BOOKING_AUTO_COMPLETE_GRACE_MINUTES,
    BOOKING_AUTO_COMPLETE_GRACE_MINUTES_DEFAULT
  ),
  overdueMinutes: parseGraceMinutes(
    process.env.BOOKING_OVERDUE_GRACE_MINUTES,
    BOOKING_OVERDUE_GRACE_MINUTES_DEFAULT
  ),
});

const getImageUrl = (req, pathValue) => {
  if (!pathValue) return "";
  if (/^https?:\/\//i.test(pathValue)) return pathValue;
  return `${req.protocol}://${req.get("host")}/${String(pathValue).replace(/\\/g, "/")}`;
};

const getConfiguredBlockchainRecordingFee = () => getTransactionFee();

const shouldUseConfiguredGasFeeFallback = (booking) => {
  const paymentStatus = String(booking?.paymentStatus || "").trim().toLowerCase();
  return paymentStatus === "unpaid" || paymentStatus === "partial";
};

const getOwnerBookingGasFee = (booking) => {
  const configured = getConfiguredBlockchainRecordingFee();
  const persisted = Number(booking?.blockchainGasFee);
  if (Number.isFinite(persisted) && persisted > 0) {
    const roundedPersisted = Math.round(persisted * 100) / 100;
    if (!shouldUseConfiguredGasFeeFallback(booking)) {
      return roundedPersisted;
    }
    return Math.round(Math.max(roundedPersisted, configured) * 100) / 100;
  }
  if (shouldUseConfiguredGasFeeFallback(booking)) {
    return configured;
  }
  return 0;
};

const getOwnerBookingLatePenaltyRatePerHour = (booking) => {
  const persisted = Number(booking?.lateReturnPenaltyRatePerHour || 0);
  if (Number.isFinite(persisted) && persisted > 0) {
    return roundCurrency(persisted);
  }
  const vehicleRate = getBookingVehicleHourlyRate(booking);
  const driverRate = Boolean(booking?.driverSelected) ? getBookingDriverHourlyRate(booking) : 0;
  const baseRate = Math.max(0, Number(vehicleRate || 0)) + Math.max(0, Number(driverRate || 0));
  return roundCurrency(baseRate * getLateReturnPenaltyMultiplier());
};

const getOwnerBookingLatePenaltyFee = (booking) => {
  const penalty = Number(booking?.lateReturnPenaltyFee || 0);
  if (!Number.isFinite(penalty) || penalty <= 0) return 0;
  return roundCurrency(penalty);
};

const getOwnerBookingPayableAmount = (booking) => {
  const bookingTotal = Number(booking?.totalAmount || 0);
  const total = Number.isFinite(bookingTotal) && bookingTotal > 0 ? bookingTotal : 0;
  return Math.round((total + getOwnerBookingLatePenaltyFee(booking) + getOwnerBookingGasFee(booking)) * 100) / 100;
};

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeWalkInStatus = (value, fallback = "none") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (WALK_IN_PAYMENT_STATUSES.has(normalized)) return normalized;
  return fallback;
};

const normalizeExtensionStatus = (value, fallback = "none") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (EXTENSION_STATUSES.has(normalized)) return normalized;
  return fallback;
};

const toOptionalText = (value, maxLength = 500) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.slice(0, maxLength);
};

const toIdString = (value) => {
  const raw = value?._id || value;
  const normalized = String(raw || "").trim();
  return normalized || null;
};

const getOwnerBookingPaidAmount = (booking) => {
  const status = String(booking?.paymentStatus || "").trim().toLowerCase();
  if (status === "refunded") return 0;

  const totalPayable = getOwnerBookingPayableAmount(booking);
  const paid = Number(booking?.paymentAmountPaid);
  if (Number.isFinite(paid) && paid > 0) {
    return Math.min(roundCurrency(paid), totalPayable);
  }

  if (status === "paid") return totalPayable;
  return 0;
};

const getOwnerBookingRemainingAmount = (booking) => {
  const totalPayable = getOwnerBookingPayableAmount(booking);
  const paidAmount = getOwnerBookingPaidAmount(booking);
  return roundCurrency(Math.max(totalPayable - paidAmount, 0));
};

const getOwnerBookingReturnBoundaryWithGrace = (booking, graceMinutes = 0) => {
  const returnAt = toDate(booking?.returnAt);
  if (!returnAt) return null;
  const grace = Math.max(0, Math.floor(Number(graceMinutes || 0)));
  if (grace <= 0) return returnAt;
  return new Date(returnAt.getTime() + grace * 60 * 1000);
};

const getOwnerBookingOverdueMinutes = (booking, now = new Date(), graceMinutes = 0) => {
  const overdueBoundary = getOwnerBookingReturnBoundaryWithGrace(booking, graceMinutes);
  const current = toDate(now);
  if (!overdueBoundary || !current) return 0;
  if (current.getTime() <= overdueBoundary.getTime()) return 0;
  const diffMs = current.getTime() - overdueBoundary.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60)));
};

const hasSettledOwnerBookingPayment = (booking) => {
  const paymentStatus = String(booking?.paymentStatus || "").trim().toLowerCase();
  const walkInStatus = normalizeWalkInStatus(booking?.walkInPaymentStatus, "none");
  return paymentStatus === "paid" || walkInStatus === "completed";
};

const recalculateOwnerBookingAmountsForRange = (booking, nextReturnAt) => {
  const pickupAt = toDate(booking?.pickupAt);
  const returnAt = toDate(nextReturnAt);
  if (!pickupAt || !returnAt || returnAt.getTime() <= pickupAt.getTime()) {
    return null;
  }

  const diffMs = returnAt.getTime() - pickupAt.getTime();
  const bookingDurationMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
  const bookingDurationHours = getBookingDurationHours({
    pickupAt,
    returnAt,
    bookingDurationMinutes,
    bookingDurationHours: Number(bookingDurationMinutes || 0) / 60,
  });
  const bookingDays = Math.max(1, Math.ceil(bookingDurationMinutes / (24 * 60)));
  if (!(bookingDurationMinutes > 0) || !(bookingDurationHours > 0)) return null;

  const vehicleHourlyRate = getBookingVehicleHourlyRate(booking);
  const driverHourlyRate = Boolean(booking?.driverSelected) ? getBookingDriverHourlyRate(booking) : 0;
  const baseAmount = roundCurrency(vehicleHourlyRate * bookingDurationHours);
  const driverAmount = roundCurrency(driverHourlyRate * bookingDurationHours);
  const totalAmount = roundCurrency(baseAmount + driverAmount);

  booking.returnAt = returnAt;
  booking.bookingDays = bookingDays;
  booking.bookingDurationMinutes = bookingDurationMinutes;
  booking.bookingDurationHours = bookingDurationHours;
  booking.baseAmount = baseAmount;
  booking.driverAmount = driverAmount;
  booking.totalAmount = totalAmount;
  booking.rentalRateUnit = HOURLY_RATE_UNIT;

  return {
    bookingDurationMinutes,
    bookingDurationHours,
    bookingDays,
    baseAmount,
    driverAmount,
    totalAmount,
  };
};

const syncOwnerBookingPaymentSnapshot = (booking) => {
  const totalPayable = getOwnerBookingPayableAmount(booking);
  const existingPaidAmount = Number(booking?.paymentAmountPaid || 0);
  const normalizedPaidAmount = Number.isFinite(existingPaidAmount) && existingPaidAmount > 0
    ? Math.min(roundCurrency(existingPaidAmount), totalPayable)
    : 0;
  const remainingAmount = roundCurrency(Math.max(totalPayable - normalizedPaidAmount, 0));

  booking.paymentAmountPaid = normalizedPaidAmount;
  booking.paymentAmountDue = remainingAmount;
  if (remainingAmount <= 0) {
    booking.paymentStatus = "paid";
    booking.paidAt = booking.paidAt || new Date();
    booking.paymentCheckoutAmount = 0;
    booking.paymentScope = "full";
  } else if (normalizedPaidAmount > 0) {
    booking.paymentStatus = "partial";
    booking.paidAt = null;
  } else {
    booking.paymentStatus = "unpaid";
    booking.paidAt = null;
  }
};

const resetWalkInPaymentState = (booking, { clearBalancePaymentMethod = true } = {}) => {
  if (!booking) return;
  if (clearBalancePaymentMethod) {
    booking.balancePaymentMethod = null;
  }
  booking.walkInPaymentStatus = "none";
  booking.walkInRequestedAt = null;
  booking.walkInRequestedBy = null;
  booking.walkInRequestNote = "";
  booking.walkInReviewedAt = null;
  booking.walkInReviewedBy = null;
  booking.walkInReviewNote = "";
  booking.walkInConfirmedAt = null;
  booking.walkInConfirmedBy = null;
  booking.walkInConfirmationNote = "";
};

const serializeWalkInPayment = (booking) => ({
  status: normalizeWalkInStatus(booking?.walkInPaymentStatus, "none"),
  requestedAt: booking?.walkInRequestedAt || null,
  requestedBy: toIdString(booking?.walkInRequestedBy),
  requestNote: toOptionalText(booking?.walkInRequestNote),
  reviewedAt: booking?.walkInReviewedAt || null,
  reviewedBy: toIdString(booking?.walkInReviewedBy),
  reviewNote: toOptionalText(booking?.walkInReviewNote),
  confirmedAt: booking?.walkInConfirmedAt || null,
  confirmedBy: toIdString(booking?.walkInConfirmedBy),
  confirmationNote: toOptionalText(booking?.walkInConfirmationNote),
});

const serializeLateReturn = (booking) => {
  const overdueMinutes = Math.max(0, Math.round(Number(booking?.lateReturnOverdueMinutes || 0)));
  return {
    isOverdue: Boolean(booking?.lateReturnIsOverdue),
    overdueMinutes,
    detectedAt: booking?.lateReturnDetectedAt || null,
    notifiedAt: booking?.lateReturnNotifiedAt || null,
    penaltyRatePerHour: getOwnerBookingLatePenaltyRatePerHour(booking),
    penaltyFee: getOwnerBookingLatePenaltyFee(booking),
    action: String(booking?.lateReturnAction || "").trim().toLowerCase() || "none",
    resolvedAt: booking?.lateReturnResolvedAt || null,
    resolvedBy: toIdString(booking?.lateReturnResolvedBy),
  };
};

const serializeExtensionRequest = (booking) => ({
  status: normalizeExtensionStatus(booking?.extensionStatus, "none"),
  requestedAt: booking?.extensionRequestedAt || null,
  requestedBy: toIdString(booking?.extensionRequestedBy),
  currentReturnAt: booking?.extensionCurrentReturnAt || null,
  requestedReturnAt: booking?.extensionRequestedReturnAt || null,
  requestNote: toOptionalText(booking?.extensionRequestNote),
  reviewedAt: booking?.extensionReviewedAt || null,
  reviewedBy: toIdString(booking?.extensionReviewedBy),
  reviewAction: String(booking?.extensionReviewAction || "").trim().toLowerCase() || null,
  reviewNote: toOptionalText(booking?.extensionReviewNote),
});

const getOwnerBookingEarnedAt = (booking) => {
  const status = String(booking?.paymentStatus || "").trim().toLowerCase();
  if (status === "paid") {
    return toDate(booking?.paidAt || booking?.paymentUpdatedAt || booking?.updatedAt);
  }
  if (status === "partial") {
    return toDate(booking?.paymentUpdatedAt || booking?.updatedAt);
  }
  return null;
};

const getOwnerBookingEarningsBreakdown = (booking) => {
  const amountPayable = getOwnerBookingPayableAmount(booking);
  const amountEarned = getOwnerBookingPaidAmount(booking);
  const ratio = amountPayable > 0 ? Math.min(amountEarned / amountPayable, 1) : 0;

  const baseAmount = Number(booking?.baseAmount);
  const driverAmount = Number(booking?.driverAmount);
  const safeBase = Number.isFinite(baseAmount) ? baseAmount : 0;
  const safeDriver = Number.isFinite(driverAmount) ? driverAmount : 0;

  return {
    amountPayable,
    amountEarned: roundCurrency(amountEarned),
    vehicleIncome: roundCurrency(safeBase * ratio),
    driverIncome: roundCurrency(safeDriver * ratio),
  };
};

const getOwnerBookingBlockchainStatus = (booking) => {
  const config = getBookingLedgerConfig();
  const configured = Boolean(config?.contractAddress && config?.rpcUrl && config?.deployerPrivateKey);
  const txHash = String(booking?.blockchainTxHash || "").trim();
  const eligibility = getBookingLedgerEligibility(booking);
  const blockers = [];

  if (!configured) blockers.push("chain_not_configured");

  let state = "pending";
  let reason = "awaiting_record";

  if (txHash) {
    state = "recorded";
    reason = null;
  } else if (eligibility.reason === "booking_cancelled") {
    state = "not_applicable";
    reason = "booking_cancelled";
  } else if (eligibility.reason === "payment_not_completed") {
    state = "not_ready";
    reason = "payment_not_completed";
  } else if (blockers.length > 0) {
    state = "blocked";
    reason = blockers[0];
  }

  return {
    state,
    reason,
    blockers,
    configured,
    version: config.selectedVersion || null,
    network: config.network || null,
    chainId: config.chainId || null,
    contractAddress: config.contractAddress || null,
  };
};

const serializeOwnerBooking = (req, booking) => {
  const vehicle = booking.vehicle || {};
  const rawImages = Array.isArray(vehicle.images) ? vehicle.images : [];
  const images = rawImages.map((pathValue) => getImageUrl(req, pathValue));
  const bookingDurationMinutes = getBookingDurationMinutes(booking);
  const bookingDurationHours = getBookingDurationHours(booking);
  const vehicleHourlyRate = getBookingVehicleHourlyRate(booking);
  const driverHourlyRate = getBookingDriverHourlyRate(booking);

  return {
    _id: booking._id,
    pickupAt: booking.pickupAt,
    returnAt: booking.returnAt,
    bookingDays: booking.bookingDays,
    bookingDurationMinutes,
    bookingDurationHours,
    rentalRateUnit: HOURLY_RATE_UNIT,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    payment_status: booking.paymentStatus,
    paymentMethod: booking.paymentMethod || null,
    payment_method: booking.paymentMethod || null,
    balancePaymentMethod: booking.balancePaymentMethod || null,
    balance_payment_method: booking.balancePaymentMethod || null,
    autoCompletedAt: booking.autoCompletedAt || null,
    actualReturnAt: booking.actualReturnAt || null,
    lateReturn: serializeLateReturn(booking),
    late_return: serializeLateReturn(booking),
    extensionRequest: serializeExtensionRequest(booking),
    extension_request: serializeExtensionRequest(booking),
    walkInPayment: serializeWalkInPayment(booking),
    walk_in_payment: serializeWalkInPayment(booking),
    paymongoReference: booking.paymongoReference || null,
    paymongo_reference: booking.paymongoReference || null,
    paymongoCheckoutId: booking.paymongoCheckoutId || null,
    paymentIntentId: booking.paymentIntentId || null,
    payment_intent_id: booking.paymentIntentId || null,
    paymentRequestedAt: booking.paymentRequestedAt || null,
    paymentUpdatedAt: booking.paymentUpdatedAt || null,
    paidAt: booking.paidAt || null,
    blockchainTxHash: booking.blockchainTxHash || null,
    blockchainRecordedAt: booking.blockchainRecordedAt || null,
    blockchainExplorerUrl: booking.blockchainTxHash ? getSepoliaTxUrl(booking.blockchainTxHash) : null,
    blockchain: booking.blockchain
      ? {
          network: booking.blockchain.network || null,
          chainId: booking.blockchain.chainId || null,
          contractAddress: booking.blockchain.contractAddress || null,
          version: booking.blockchain.version || null,
          bookingKey: booking.blockchain.bookingKey || null,
          bookingHash: booking.blockchain.bookingHash || null,
          renterIdHash: booking.blockchain.renterIdHash || null,
          ownerId: booking.blockchain.ownerId || null,
          amountInCents:
            Number.isFinite(Number(booking.blockchain.amountInCents)) ? booking.blockchain.amountInCents : null,
          paymentStatus: booking.blockchain.paymentStatus || null,
          paymentStatusCode:
            Number.isFinite(Number(booking.blockchain.paymentStatusCode))
              ? booking.blockchain.paymentStatusCode
              : null,
          blockNumber:
            Number.isFinite(Number(booking.blockchain.blockNumber)) ? booking.blockchain.blockNumber : null,
        }
      : null,
    blockchainStatus: getOwnerBookingBlockchainStatus(booking),
    vehicleDailyRate: vehicleHourlyRate,
    vehicleHourlyRate,
    driverSelected: booking.driverSelected,
    driverDailyRate: driverHourlyRate,
    driverHourlyRate,
    baseAmount: booking.baseAmount,
    driverAmount: booking.driverAmount,
    totalAmount: booking.totalAmount,
    lateReturnPenaltyRatePerHour: getOwnerBookingLatePenaltyRatePerHour(booking),
    lateReturnPenaltyFee: getOwnerBookingLatePenaltyFee(booking),
    blockchainGasFee: getOwnerBookingGasFee(booking),
    amountPayable: getOwnerBookingPayableAmount(booking),
    paymentAmountPaid: getOwnerBookingPaidAmount(booking),
    paymentAmountDue: getOwnerBookingRemainingAmount(booking),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    renter: booking.renter || null,
    owner: booking.owner || null,
    vehicle: booking.vehicle
      ? {
          _id: vehicle._id,
          name: vehicle.name,
          location: vehicle.location,
          specs: vehicle.specs || {},
          imageUrl: images[0] || getImageUrl(req, vehicle.imageUrl),
          images,
        }
      : null,
  };
};

const populateFields = [
  { path: "renter", select: "name email avatar" },
  { path: "owner", select: "name email avatar" },
  {
    path: "vehicle",
    select:
      "name location specs images imageUrl dailyRentalRate pricingUnit driverOptionEnabled driverDailyRate",
  },
];

const autoRecordOwnerBookingOnChain = async (booking) => {
  if (!booking || booking.blockchainTxHash) {
    return {
      recorded: Boolean(booking?.blockchainTxHash),
      warning: null,
    };
  }

  const eligibility = getBookingLedgerEligibility(booking);
  if (!eligibility.eligible) {
    return {
      recorded: false,
      warning: null,
    };
  }

  try {
    const ledgerRecord = await recordBookingTransactionOnLedger({ booking });
    applyLedgerRecordToBooking(booking, ledgerRecord);
    await booking.save();
    return {
      recorded: true,
      warning: null,
    };
  } catch (error) {
    return {
      recorded: false,
      warning: String(error?.message || "Failed to record booking on blockchain."),
    };
  }
};

const syncOwnerBookingLifecycleState = async (booking) => {
  if (!booking?._id) return { updated: false };

  const now = new Date();
  const gracePolicy = getOwnerBookingLifecycleGracePolicy();
  const normalizedStatus = String(booking?.status || "").trim().toLowerCase();
  if (!ACTIVE_BOOKING_STATUSES.has(normalizedStatus)) {
    return { updated: false };
  }

  const returnAt = toDate(booking?.returnAt);
  if (!returnAt || now.getTime() < returnAt.getTime()) {
    return { updated: false };
  }

  if (hasSettledOwnerBookingPayment(booking)) {
    const autoCompleteBoundary = getOwnerBookingReturnBoundaryWithGrace(booking, gracePolicy.autoCompleteMinutes);
    if (!autoCompleteBoundary || now.getTime() < autoCompleteBoundary.getTime()) {
      return { updated: false };
    }

    let changed = false;
    if (booking.status !== "completed") {
      booking.status = "completed";
      changed = true;
    }
    if (!booking.autoCompletedAt) {
      booking.autoCompletedAt = now;
      changed = true;
    }
    if (!booking.actualReturnAt) {
      booking.actualReturnAt = returnAt;
      changed = true;
    }
    if (booking.lateReturnIsOverdue) {
      booking.lateReturnIsOverdue = false;
      changed = true;
    }
    if (Number(booking.lateReturnOverdueMinutes || 0) > 0) {
      booking.lateReturnOverdueMinutes = 0;
      changed = true;
    }

    if (changed) {
      await booking.save();
      await syncVehicleAvailabilityByBookingState(booking.vehicle?._id || booking.vehicle);

      await createNotification({
        user: booking.renter?._id || booking.renter,
        type: "booking_status",
        title: "Booking completed automatically",
        message: "Your rental duration ended and the booking status was updated to completed.",
        data: { bookingId: booking._id, status: "completed", autoCompleted: true },
      });
      await createNotification({
        user: booking.owner?._id || booking.owner,
        type: "booking_status",
        title: "Booking completed automatically",
        message: "A rental duration ended and the booking was auto-completed.",
        data: { bookingId: booking._id, status: "completed", autoCompleted: true },
      });
    }

    return { updated: changed, status: String(booking.status || "").toLowerCase() };
  }

  const overdueMinutes = getOwnerBookingOverdueMinutes(booking, now, gracePolicy.overdueMinutes);
  if (overdueMinutes <= 0) {
    return { updated: false };
  }
  let changed = false;

  if (!booking.lateReturnIsOverdue) {
    booking.lateReturnIsOverdue = true;
    changed = true;
  }
  if (Number(booking.lateReturnOverdueMinutes || 0) !== overdueMinutes) {
    booking.lateReturnOverdueMinutes = overdueMinutes;
    changed = true;
  }
  if (!booking.lateReturnDetectedAt) {
    booking.lateReturnDetectedAt = now;
    changed = true;
  }
  const penaltyRatePerHour = getOwnerBookingLatePenaltyRatePerHour(booking);
  if (roundCurrency(Number(booking.lateReturnPenaltyRatePerHour || 0)) !== penaltyRatePerHour) {
    booking.lateReturnPenaltyRatePerHour = penaltyRatePerHour;
    changed = true;
  }

  let shouldNotifyOverdue = false;
  if (!booking.lateReturnNotifiedAt) {
    booking.lateReturnNotifiedAt = now;
    shouldNotifyOverdue = true;
    changed = true;
  }

  if (changed) {
    await booking.save();
  }

  if (shouldNotifyOverdue) {
    await createNotification({
      user: booking.renter?._id || booking.renter,
      type: "booking_status",
      title: "Late return detected",
      message:
        "Your booking is overdue. You can extend the rental or proceed with late return from your booking card.",
      data: {
        bookingId: booking._id,
        status: booking.status,
        isOverdue: true,
        overdueMinutes,
        actions: ["extend_rental", "proceed_late_return"],
      },
    });
    await createNotification({
      user: booking.owner?._id || booking.owner,
      type: "booking_status",
      title: "Vehicle return is overdue",
      message: "The renter has exceeded the scheduled return time.",
      data: {
        bookingId: booking._id,
        status: booking.status,
        isOverdue: true,
        overdueMinutes,
      },
    });
  }

  return { updated: changed || shouldNotifyOverdue, status: String(booking.status || "").toLowerCase() };
};

const autoSyncOwnerBookingLifecycles = async (bookings = []) => {
  const updated = [];
  for (const booking of bookings) {
    const result = await syncOwnerBookingLifecycleState(booking);
    if (result.updated) {
      updated.push(booking);
    }
  }
  return updated;
};

export const getOwnerBookings = async (req, res) => {
  try {
    const status = req.query.status || "all";
    const query = { owner: req.user._id };
    if (status === "cancelled") {
      query.status = { $in: ["cancelled", "rejected"] };
    } else if (status !== "all" && STATUSES.has(status)) {
      query.status = status;
    }

    const bookings = await Booking.find(query).populate(populateFields).sort({ createdAt: -1 });
    const autoSynced = await autoSyncOwnerBookingLifecycles(bookings);
    for (const booking of autoSynced) {
      const payload = serializeOwnerBooking(req, booking);
      emitToUser(String(booking.renter?._id || booking.renter), "booking:updated", payload);
      emitToUser(String(booking.owner?._id || booking.owner), "booking:updated", payload);
    }
    res.json({ success: true, bookings: bookings.map((booking) => serializeOwnerBooking(req, booking)) });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch owner bookings." });
  }
};

export const updateOwnerBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, owner: req.user._id }).populate(populateFields);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    await syncOwnerBookingLifecycleState(booking);

    if (String(status || "").trim().toLowerCase() === "extended") {
      return res.status(400).json({
        success: false,
        message: "Use extension approval flow to set status to extended.",
      });
    }

    if (status === "confirmed") {
      const vehicleId = booking.vehicle?._id || booking.vehicle;
      const conflictingBooking = await Booking.findOne({
        _id: { $ne: booking._id },
        vehicle: vehicleId,
        status: { $in: ACTIVE_OVERLAP_STATUSES },
        pickupAt: { $lt: booking.returnAt },
        returnAt: { $gt: booking.pickupAt },
      }).select("_id");

      if (conflictingBooking) {
        return res.status(409).json({
          success: false,
          message: "Cannot confirm booking because the schedule conflicts with another active booking.",
        });
      }
    }

    booking.status = status;
    if (status === "completed") {
      booking.actualReturnAt = booking.actualReturnAt || new Date();
      booking.lateReturnResolvedAt = booking.lateReturnResolvedAt || new Date();
      booking.lateReturnResolvedBy = booking.lateReturnResolvedBy || req.user._id;
    }
    await booking.save();
    await syncVehicleAvailabilityByBookingState(booking.vehicle?._id || booking.vehicle);

    await createNotification({
      user: booking.renter._id,
      type: "booking_status",
      title: "Booking status updated",
      message: `Your booking is now ${status}.`,
      data: { bookingId: booking._id, status },
    });

    const payload = serializeOwnerBooking(req, booking);
    emitToUser(String(booking.renter._id), "booking:updated", payload);
    emitToUser(String(booking.owner._id), "booking:updated", payload);

    res.json({ success: true, booking: payload });
  } catch {
    res.status(500).json({ success: false, message: "Failed to update booking status." });
  }
};

export const updateOwnerBookingPaymentStatus = async (req, res) => {
  try {
    const requestedPaymentStatus = String(req.body?.paymentStatus || "").trim().toLowerCase();
    if (!PAYMENT_STATUSES.has(requestedPaymentStatus)) {
      return res.status(400).json({ success: false, message: "Invalid payment status." });
    }
    if (requestedPaymentStatus === "paid") {
      return res.status(403).json({
        success: false,
        message:
          "Manual paid updates are blocked. Use walk-in confirmation or renter payment verification instead.",
      });
    }

    const booking = await Booking.findOne({ _id: req.params.id, owner: req.user._id }).populate(populateFields);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }
    await syncOwnerBookingLifecycleState(booking);

    booking.paymentStatus = requestedPaymentStatus;
    booking.paymentUpdatedAt = new Date();
    if (requestedPaymentStatus === "partial") {
      booking.paidAt = null;
    } else if (requestedPaymentStatus === "unpaid" || requestedPaymentStatus === "refunded") {
      const totalPayable = getOwnerBookingPayableAmount(booking);
      booking.paymentAmountPaid = 0;
      booking.paymentAmountDue = totalPayable;
      booking.paymentCheckoutAmount = 0;
      booking.paymentScope = null;
      booking.paymentChannel = null;
      booking.paidAt = null;
      resetWalkInPaymentState(booking);
    }
    await booking.save();
    const blockchainResult = await autoRecordOwnerBookingOnChain(booking);

    await createNotification({
      user: booking.renter._id,
      type: "booking_payment",
      title: "Payment status updated",
      message: `Payment status is now ${requestedPaymentStatus}.`,
      data: { bookingId: booking._id, paymentStatus: requestedPaymentStatus },
    });

    const payload = serializeOwnerBooking(req, booking);
    emitToUser(String(booking.renter._id), "booking:updated", payload);
    emitToUser(String(booking.owner._id), "booking:updated", payload);

    const message = blockchainResult?.warning
      ? `Payment status updated. Blockchain recording is pending: ${blockchainResult.warning}`
      : "Payment status updated.";

    res.json({
      success: true,
      message,
      blockchainWarning: blockchainResult?.warning || null,
      booking: payload,
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to update payment status." });
  }
};

export const reviewOwnerBookingExtensionRequest = async (req, res) => {
  try {
    const action = String(req.body?.action || "").trim().toLowerCase();
    if (!EXTENSION_REVIEW_ACTIONS.has(action)) {
      return res.status(400).json({ success: false, message: "Invalid extension review action." });
    }

    const booking = await Booking.findOne({ _id: req.params.id, owner: req.user._id }).populate(populateFields);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    await syncOwnerBookingLifecycleState(booking);

    const normalizedStatus = String(booking.status || "").trim().toLowerCase();
    if (["cancelled", "rejected", "completed"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "This booking can no longer process extension requests.",
      });
    }

    const extensionStatus = normalizeExtensionStatus(booking.extensionStatus, "none");
    if (extensionStatus !== "requested") {
      return res.status(409).json({
        success: false,
        message: "No pending extension request found for this booking.",
      });
    }

    const now = new Date();
    const note = toOptionalText(req.body?.note, 500);

    if (action === "approve") {
      const requestedReturnAt = toDate(booking.extensionRequestedReturnAt);
      const currentReturnAt = toDate(booking.returnAt);
      if (!requestedReturnAt || !currentReturnAt || requestedReturnAt.getTime() <= currentReturnAt.getTime()) {
        return res.status(400).json({
          success: false,
          message: "Requested extension schedule is invalid.",
        });
      }

      const vehicleId = booking.vehicle?._id || booking.vehicle;
      const conflictingBooking = await Booking.findOne({
        _id: { $ne: booking._id },
        vehicle: vehicleId,
        status: { $in: ACTIVE_OVERLAP_STATUSES },
        pickupAt: { $lt: requestedReturnAt },
        returnAt: { $gt: booking.pickupAt },
      }).select("_id");
      if (conflictingBooking) {
        return res.status(409).json({
          success: false,
          message: "Cannot approve extension because it conflicts with another booking schedule.",
        });
      }

      const recalculated = recalculateOwnerBookingAmountsForRange(booking, requestedReturnAt);
      if (!recalculated) {
        return res.status(400).json({
          success: false,
          message: "Failed to apply extension because the updated duration is invalid.",
        });
      }

      booking.status = "extended";
      booking.extensionStatus = "approved";
      booking.extensionReviewedAt = now;
      booking.extensionReviewedBy = req.user._id;
      booking.extensionReviewAction = "approve";
      booking.extensionReviewNote = note;
      booking.lateReturnIsOverdue = false;
      booking.lateReturnDetectedAt = null;
      booking.lateReturnNotifiedAt = null;
      booking.lateReturnOverdueMinutes = 0;
      booking.lateReturnPenaltyFee = 0;
      booking.lateReturnAction = "none";
      booking.lateReturnResolvedAt = null;
      booking.lateReturnResolvedBy = null;
      booking.actualReturnAt = null;
      booking.paymentUpdatedAt = now;
      syncOwnerBookingPaymentSnapshot(booking);
      await booking.save();
      await syncVehicleAvailabilityByBookingState(vehicleId);

      const refreshed = await Booking.findById(booking._id).populate(populateFields);
      const payload = serializeOwnerBooking(req, refreshed);

      await createNotification({
        user: refreshed.renter?._id || refreshed.renter,
        type: "booking_status",
        title: "Extension approved",
        message: "Your extension request was approved. Booking schedule and price were updated.",
        data: {
          bookingId: refreshed._id,
          status: refreshed.status,
          extensionStatus: "approved",
          returnAt: refreshed.returnAt,
        },
      });

      emitToUser(String(refreshed.renter?._id || refreshed.renter), "booking:updated", payload);
      emitToUser(String(refreshed.owner?._id || refreshed.owner), "booking:updated", payload);

      return res.json({
        success: true,
        message: "Extension request approved. Booking schedule and pricing were updated.",
        booking: payload,
      });
    }

    booking.extensionStatus = "rejected";
    booking.extensionReviewedAt = now;
    booking.extensionReviewedBy = req.user._id;
    booking.extensionReviewAction = "reject";
    booking.extensionReviewNote = note;
    booking.lateReturnAction = "none";
    booking.paymentUpdatedAt = now;
    await booking.save();

    const refreshed = await Booking.findById(booking._id).populate(populateFields);
    const payload = serializeOwnerBooking(req, refreshed);

    await createNotification({
      user: refreshed.renter?._id || refreshed.renter,
      type: "booking_status",
      title: "Extension rejected",
      message: "Your extension request was rejected. The original booking schedule remains in effect.",
      data: {
        bookingId: refreshed._id,
        status: refreshed.status,
        extensionStatus: "rejected",
      },
    });

    emitToUser(String(refreshed.renter?._id || refreshed.renter), "booking:updated", payload);
    emitToUser(String(refreshed.owner?._id || refreshed.owner), "booking:updated", payload);

    return res.json({
      success: true,
      message: "Extension request rejected.",
      booking: payload,
    });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to review extension request." });
  }
};

export const reviewOwnerWalkInPaymentRequest = async (req, res) => {
  try {
    const action = String(req.body?.action || "").trim().toLowerCase();
    if (!WALK_IN_REVIEW_ACTIONS.has(action)) {
      return res.status(400).json({ success: false, message: "Invalid walk-in review action." });
    }

    const booking = await Booking.findOne({ _id: req.params.id, owner: req.user._id }).populate(populateFields);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }
    await syncOwnerBookingLifecycleState(booking);

    if (["cancelled", "rejected"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Cancelled bookings cannot be updated for walk-in payment.",
      });
    }
    if (!["confirmed", "extended"].includes(String(booking.status || "").trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Booking must be approved or extended before reviewing walk-in payment.",
      });
    }

    const normalizedPaymentStatus = String(booking.paymentStatus || "").trim().toLowerCase();
    if (normalizedPaymentStatus !== "partial") {
      return res.status(400).json({
        success: false,
        message: "Walk-in payment review is only available after downpayment.",
      });
    }

    const remainingAmount = getOwnerBookingRemainingAmount(booking);
    if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "This booking has no remaining walk-in balance.",
      });
    }

    const walkInStatus = normalizeWalkInStatus(booking.walkInPaymentStatus, "none");
    if (walkInStatus !== "requested") {
      return res.status(409).json({
        success: false,
        message: "No pending walk-in payment request was found for this booking.",
      });
    }

    const note = toOptionalText(req.body?.note, 500);
    booking.walkInPaymentStatus = action === "approve" ? "approved" : "rejected";
    booking.walkInReviewedAt = new Date();
    booking.walkInReviewedBy = req.user._id;
    booking.walkInReviewNote = note;
    booking.walkInConfirmedAt = null;
    booking.walkInConfirmedBy = null;
    booking.walkInConfirmationNote = "";
    booking.balancePaymentMethod = action === "approve" ? "Walk-in" : null;
    booking.paymentUpdatedAt = new Date();
    await booking.save();

    const refreshed = await Booking.findById(booking._id).populate(populateFields);
    const payload = serializeOwnerBooking(req, refreshed);
    const walkInLabel = action === "approve" ? "approved" : "rejected";

    await createNotification({
      user: refreshed.renter?._id || refreshed.renter,
      type: "booking_payment",
      title: action === "approve" ? "Walk-in payment approved" : "Walk-in payment rejected",
      message:
        action === "approve"
          ? "Your walk-in payment request was approved by the owner."
          : "Your walk-in payment request was rejected by the owner.",
      data: { bookingId: refreshed._id, walkInPaymentStatus: walkInLabel },
    });

    emitToUser(String(refreshed.renter?._id || refreshed.renter), "booking:updated", payload);
    emitToUser(String(refreshed.owner?._id || refreshed.owner), "booking:updated", payload);

    return res.json({
      success: true,
      message:
        action === "approve"
          ? "Walk-in payment request approved."
          : "Walk-in payment request rejected.",
      booking: payload,
    });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to review walk-in payment request." });
  }
};

export const confirmOwnerWalkInPayment = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, owner: req.user._id }).populate(populateFields);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }
    await syncOwnerBookingLifecycleState(booking);

    if (["cancelled", "rejected"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Cancelled bookings cannot be settled via walk-in payment.",
      });
    }
    if (!["confirmed", "extended", "completed"].includes(String(booking.status || "").trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Only approved, extended, or completed bookings can be settled via walk-in payment.",
      });
    }

    const normalizedPaymentStatus = String(booking.paymentStatus || "").trim().toLowerCase();
    if (normalizedPaymentStatus !== "partial") {
      return res.status(400).json({
        success: false,
        message: "Walk-in confirmation is only available for partially paid bookings.",
      });
    }

    const walkInStatus = normalizeWalkInStatus(booking.walkInPaymentStatus, "none");
    if (walkInStatus !== "approved") {
      return res.status(409).json({
        success: false,
        message: "Walk-in payment must be approved before confirmation.",
      });
    }

    const remainingAmount = getOwnerBookingRemainingAmount(booking);
    if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "This booking has no remaining balance.",
      });
    }

    const note = toOptionalText(req.body?.note, 500);
    const totalPayable = getOwnerBookingPayableAmount(booking);

    booking.paymentStatus = "paid";
    booking.paymentAmountPaid = totalPayable;
    booking.paymentAmountDue = 0;
    booking.paymentCheckoutAmount = 0;
    booking.paymentScope = "full";
    booking.paymentChannel = null;
    booking.paidAt = booking.paidAt || new Date();
    booking.paymentUpdatedAt = new Date();
    booking.balancePaymentMethod = "Walk-in";
    booking.walkInPaymentStatus = "completed";
    booking.walkInConfirmedAt = new Date();
    booking.walkInConfirmedBy = req.user._id;
    booking.walkInConfirmationNote = note;
    await booking.save();

    const blockchainResult = await autoRecordOwnerBookingOnChain(booking);
    const refreshed = await Booking.findById(booking._id).populate(populateFields);
    const payload = serializeOwnerBooking(req, refreshed);

    await createNotification({
      user: refreshed.renter?._id || refreshed.renter,
      type: "booking_payment",
      title: "Walk-in payment confirmed",
      message: "The owner confirmed your remaining balance payment.",
      data: { bookingId: refreshed._id, paymentStatus: "paid", walkInPaymentStatus: "completed" },
    });

    emitToUser(String(refreshed.renter?._id || refreshed.renter), "booking:updated", payload);
    emitToUser(String(refreshed.owner?._id || refreshed.owner), "booking:updated", payload);

    const message = blockchainResult?.warning
      ? `Walk-in payment confirmed. Blockchain recording is pending: ${blockchainResult.warning}`
      : "Walk-in payment confirmed successfully.";

    return res.json({
      success: true,
      message,
      blockchainWarning: blockchainResult?.warning || null,
      booking: payload,
    });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to confirm walk-in payment." });
  }
};

export const getOwnerReviews = async (req, res) => {
  try {
    const reviews = await Booking.find({
      owner: req.user._id,
      reviewRating: { $exists: true },
      reviewCreatedAt: { $exists: true },
    })
      .populate("renter", "name email avatar")
      .populate("vehicle", "name")
      .sort({ reviewCreatedAt: -1 })
      .lean();

    res.json({
      success: true,
      reviews: reviews.map((review) => ({
        _id: review._id,
        rating: review.reviewRating,
        comment: review.reviewComment || "",
        createdAt: review.reviewCreatedAt,
        renter: review.renter || null,
        vehicle: review.vehicle || null,
      })),
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch reviews." });
  }
};

export const getOwnerEarnings = async (req, res) => {
  try {
    const paidBookings = await Booking.find({
      owner: req.user._id,
      paymentStatus: { $in: ["partial", "paid"] },
    })
      .populate("vehicle", "name")
      .populate("renter", "name email")
      .sort({ paymentUpdatedAt: -1, updatedAt: -1 })
      .lean();

    const bookings = paidBookings.map((booking) => {
      const earnings = getOwnerBookingEarningsBreakdown(booking);
      const earnedAt = getOwnerBookingEarnedAt(booking);
      const bookingDurationMinutes = getBookingDurationMinutes(booking);
      const bookingDurationHours = getBookingDurationHours(booking);
      const vehicleHourlyRate = getBookingVehicleHourlyRate(booking);
      const driverHourlyRate = getBookingDriverHourlyRate(booking);

      return {
        _id: booking._id,
        vehicle: booking.vehicle || null,
        renter: booking.renter || null,
        bookingDays: booking.bookingDays,
        bookingDurationMinutes,
        bookingDurationHours,
        rentalRateUnit: HOURLY_RATE_UNIT,
        vehicleDailyRate: vehicleHourlyRate,
        vehicleHourlyRate,
        driverSelected: booking.driverSelected,
        driverDailyRate: driverHourlyRate,
        driverHourlyRate,
        baseAmount: booking.baseAmount,
        driverAmount: booking.driverAmount,
        totalAmount: booking.totalAmount,
        blockchainGasFee: getOwnerBookingGasFee(booking),
        amountPayable: earnings.amountPayable,
        amountEarned: earnings.amountEarned,
        vehicleIncome: earnings.vehicleIncome,
        driverIncome: earnings.driverIncome,
        paymentStatus: booking.paymentStatus,
        paymentAmountPaid: booking.paymentAmountPaid,
        paymentAmountDue: booking.paymentAmountDue,
        earnedAt,
        completedAt: earnedAt || booking.updatedAt,
      };
    });

    const totals = bookings.reduce(
      (acc, booking) => {
        acc.totalEarnings += booking.amountEarned || 0;
        acc.vehicleIncome += booking.vehicleIncome || 0;
        acc.driverIncome += booking.driverIncome || 0;
        return acc;
      },
      { totalEarnings: 0, vehicleIncome: 0, driverIncome: 0 }
    );

    const monthlyMap = new Map();
    bookings.forEach((booking) => {
      const earnedAt = toDate(booking.earnedAt);
      if (!earnedAt) return;

      const year = earnedAt.getFullYear();
      const month = earnedAt.getMonth() + 1;
      const key = `${year}-${month}`;

      const entry =
        monthlyMap.get(key) || {
          _id: { year, month },
          totalEarnings: 0,
          vehicleIncome: 0,
          driverIncome: 0,
          bookings: 0,
        };

      entry.totalEarnings += booking.amountEarned || 0;
      entry.vehicleIncome += booking.vehicleIncome || 0;
      entry.driverIncome += booking.driverIncome || 0;
      entry.bookings += 1;

      monthlyMap.set(key, entry);
    });

    const monthlyEarnings = Array.from(monthlyMap.values())
      .map((entry) => ({
        ...entry,
        totalEarnings: roundCurrency(entry.totalEarnings),
        vehicleIncome: roundCurrency(entry.vehicleIncome),
        driverIncome: roundCurrency(entry.driverIncome),
      }))
      .sort((a, b) => {
        if (a._id.year !== b._id.year) return b._id.year - a._id.year;
        return b._id.month - a._id.month;
      })
      .slice(0, 12);

    res.json({
      success: true,
      totals: {
        totalEarnings: roundCurrency(totals.totalEarnings),
        vehicleIncome: roundCurrency(totals.vehicleIncome),
        driverIncome: roundCurrency(totals.driverIncome),
      },
      monthlyEarnings,
      bookings,
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch earnings." });
  }
};

export const getOwnerAnalytics = async (req, res) => {
  try {
    const ownerId = req.user._id;

    const monthlyEarningsTrend = await Booking.aggregate([
      { $match: { owner: ownerId, status: "completed" } },
      {
        $group: {
          _id: {
            year: { $year: "$updatedAt" },
            month: { $month: "$updatedAt" },
          },
          totalEarnings: {
            $sum: {
              $add: [
                { $ifNull: ["$totalAmount", 0] },
                { $ifNull: ["$blockchainGasFee", 0] },
              ],
            },
          },
          driverIncome: { $sum: "$driverAmount" },
          vehicleIncome: { $sum: "$baseAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const bookingTrend = await Booking.aggregate([
      { $match: { owner: ownerId } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalBookings: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelled: {
            $sum: {
              $cond: [{ $in: ["$status", ["cancelled", "rejected"]] }, 1, 0],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const mostBookedVehicles = await Booking.aggregate([
      { $match: { owner: ownerId } },
      {
        $group: {
          _id: "$vehicle",
          bookings: { $sum: 1 },
          revenue: {
            $sum: {
              $add: [
                { $ifNull: ["$totalAmount", 0] },
                { $ifNull: ["$blockchainGasFee", 0] },
              ],
            },
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
      { $sort: { bookings: -1, revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: Vehicle.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          vehicleId: "$_id",
          vehicleName: "$vehicle.name",
          bookings: 1,
          revenue: 1,
          completedBookings: 1,
        },
      },
    ]);

    res.json({
      success: true,
      monthlyEarningsTrend,
      bookingTrend,
      mostBookedVehicles,
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch analytics." });
  }
};
