import Booking from "../models/Booking.js";
import eventBus from "../events/eventBus.js";
import { NOTIFICATION_EVENTS } from "../events/notification.events.js";
import {
  getBookingDriverHourlyRate,
  getBookingVehicleHourlyRate,
  getDurationMinutes,
  roundCurrency,
} from "../utils/pricing.js";

const ACTIVE_BOOKING_STATUSES = ["confirmed", "extended"];
const DEFAULT_LIFECYCLE_INTERVAL_MS = 60 * 1000;
const LATE_RETURN_PENALTY_MULTIPLIER_DEFAULT = 0.25;
const BOOKING_OVERDUE_GRACE_MINUTES_DEFAULT = 0;

let lifecycleTimer = null;

const parseLifecycleInterval = () => {
  const raw = Number(process.env.BOOKING_LIFECYCLE_INTERVAL_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_LIFECYCLE_INTERVAL_MS;
  return Math.floor(raw);
};

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

const getLifecycleGracePolicy = () => ({
  overdueMinutes: parseGraceMinutes(
    process.env.BOOKING_OVERDUE_GRACE_MINUTES,
    BOOKING_OVERDUE_GRACE_MINUTES_DEFAULT
  ),
});

const getReturnBoundaryWithGrace = (returnAt, graceMinutes = 0) => {
  if (!returnAt || Number.isNaN(returnAt.getTime())) return null;
  const grace = Math.max(0, Math.floor(Number(graceMinutes || 0)));
  if (grace <= 0) return returnAt;
  return new Date(returnAt.getTime() + grace * 60 * 1000);
};

const getLatePenaltyRatePerHour = (booking) => {
  const persisted = Number(booking?.lateReturnPenaltyRatePerHour || 0);
  if (Number.isFinite(persisted) && persisted > 0) {
    return roundCurrency(persisted);
  }
  const vehicleRate = getBookingVehicleHourlyRate(booking);
  const driverRate = Boolean(booking?.driverSelected) ? getBookingDriverHourlyRate(booking) : 0;
  const baseRate = Math.max(0, Number(vehicleRate || 0)) + Math.max(0, Number(driverRate || 0));
  return roundCurrency(baseRate * getLateReturnPenaltyMultiplier());
};

export const syncOneBookingLifecycle = async (booking, now = new Date()) => {
  const returnAt = booking?.returnAt ? new Date(booking.returnAt) : null;
  if (!returnAt || Number.isNaN(returnAt.getTime())) return false;
  if (now.getTime() < returnAt.getTime()) return false;
  const gracePolicy = getLifecycleGracePolicy();

  const overdueBoundary = getReturnBoundaryWithGrace(returnAt, gracePolicy.overdueMinutes);
  if (!overdueBoundary || now.getTime() <= overdueBoundary.getTime()) return false;
  const overdueMinutes = Math.max(0, getDurationMinutes(overdueBoundary, now));
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
  const penaltyRatePerHour = getLatePenaltyRatePerHour(booking);
  if (roundCurrency(Number(booking.lateReturnPenaltyRatePerHour || 0)) !== penaltyRatePerHour) {
    booking.lateReturnPenaltyRatePerHour = penaltyRatePerHour;
    changed = true;
  }

  let shouldNotify = false;
  if (!booking.lateReturnNotifiedAt) {
    booking.lateReturnNotifiedAt = now;
    shouldNotify = true;
    changed = true;
  }

  if (!changed) return false;
  await booking.save();

  if (shouldNotify) {
    eventBus.emit(NOTIFICATION_EVENTS.BOOKING_OVERDUE, {
      booking,
      overdueMinutes,
    });
  }

  return true;
};

const runLifecycleSync = async () => {
  const now = new Date();
  const bookings = await Booking.find({
    status: { $in: ACTIVE_BOOKING_STATUSES },
    returnAt: { $lte: now },
  }).select(
    "_id status returnAt renter owner vehicle driverSelected vehicleDailyRate driverDailyRate rentalRateUnit lateReturnIsOverdue lateReturnOverdueMinutes lateReturnDetectedAt lateReturnNotifiedAt lateReturnPenaltyRatePerHour actualReturnAt"
  );

  let touched = 0;
  for (const booking of bookings) {
    const changed = await syncOneBookingLifecycle(booking, now);
    if (changed) touched += 1;
  }
  if (touched > 0) {
    console.log(`[booking-lifecycle] Updated ${touched} booking lifecycle records.`);
  }
};

export const startBookingLifecycleJob = () => {
  if (lifecycleTimer) return;

  const run = async () => {
    try {
      await runLifecycleSync();
    } catch (error) {
      console.error("[booking-lifecycle] Failed:", error?.message || error);
    }
  };

  void run();
  lifecycleTimer = setInterval(() => {
    void run();
  }, parseLifecycleInterval());

  if (typeof lifecycleTimer.unref === "function") {
    lifecycleTimer.unref();
  }
};

export const stopBookingLifecycleJob = () => {
  if (!lifecycleTimer) return;
  clearInterval(lifecycleTimer);
  lifecycleTimer = null;
};
