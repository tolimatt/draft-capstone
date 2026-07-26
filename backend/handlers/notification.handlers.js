import eventBus from "../events/eventBus.js";
import { NOTIFICATION_EVENTS } from "../events/notification.events.js";
import NotificationService from "../services/notification.service.js";

let registered = false;

const toIdString = (value) => {
  if (!value) return "";
  return String(value?._id || value);
};

const toOptionalText = (value) => String(value || "").trim();

const displayName = (value, fallback = "Someone") =>
  toOptionalText(value?.name || value?.fullName || value?.email) || fallback;

const statusLabel = (value) => toOptionalText(value).replace(/_/g, " ") || "updated";

const getBooking = (payload = {}) => payload.booking || {};
const getBookingId = (payload = {}) => toIdString(payload.bookingId || getBooking(payload)._id);
const getVehicleId = (payload = {}) =>
  toIdString(payload.vehicleId || payload.vehicle?._id || getBooking(payload).vehicle?._id || getBooking(payload).vehicle);
const getVehicleName = (payload = {}) =>
  toOptionalText(payload.vehicleName || payload.vehicle?.name || getBooking(payload).vehicle?.name) || "a vehicle";
const getOwnerId = (payload = {}) =>
  toIdString(payload.ownerId || getBooking(payload).owner?._id || getBooking(payload).owner);
const getRenterId = (payload = {}) =>
  toIdString(payload.renterId || getBooking(payload).renter?._id || getBooking(payload).renter);

const notificationKey = (recipientId, eventName, entityId, suffix = "") => {
  const recipient = toIdString(recipientId);
  const entity = toIdString(entityId);
  if (!recipient || !eventName || !entity) return "";
  return [recipient, eventName, entity, suffix].filter(Boolean).join(":");
};

const bookingData = (payload = {}, extra = {}) => ({
  bookingId: getBookingId(payload),
  vehicleId: getVehicleId(payload) || null,
  ...extra,
});

const sendBookingNotification = (payload, recipientId, eventName, notification) => {
  const bookingId = getBookingId(payload);
  return NotificationService.send({
    user: recipientId,
    type: "booking_status",
    category: "booking",
    event: eventName,
    entityType: "booking",
    entityId: bookingId,
    dedupeKey: notificationKey(recipientId, eventName, bookingId, notification.dedupeSuffix),
    ...notification,
  });
};

const sendPaymentNotification = (payload, recipientId, eventName, notification) => {
  const bookingId = getBookingId(payload);
  return NotificationService.send({
    user: recipientId,
    type: "booking_payment",
    category: "payment",
    event: eventName,
    priority: "important",
    entityType: "booking",
    entityId: bookingId,
    dedupeKey: notificationKey(recipientId, eventName, bookingId, notification.dedupeSuffix),
    ...notification,
  });
};

const subscribe = (eventName, handler) => {
  eventBus.on(eventName, (payload) => {
    Promise.resolve(handler(payload)).catch((error) => {
      console.error(`[notification-handler] ${eventName} failed:`, error?.message || error);
    });
  });
};

const handleBookingCreated = async (payload = {}) => {
  const ownerId = getOwnerId(payload);
  const actorName = displayName(payload.actor || payload.renter, "A renter");

  await sendBookingNotification(payload, ownerId, NOTIFICATION_EVENTS.BOOKING_CREATED, {
    title: "New booking request",
    message: `${actorName} requested to book ${getVehicleName(payload)}.`,
    data: bookingData(payload, { status: "pending" }),
  });
};

const handleBookingCancelled = async (payload = {}) => {
  const cancelledBy = toOptionalText(payload.cancelledBy).toLowerCase();
  const recipientId = toIdString(payload.recipientId) || (cancelledBy === "owner" ? getRenterId(payload) : getOwnerId(payload));
  const message =
    cancelledBy === "owner" ? "Your booking was cancelled by the owner." : "A renter cancelled a booking.";

  await sendBookingNotification(payload, recipientId, NOTIFICATION_EVENTS.BOOKING_CANCELLED, {
    title: "Booking cancelled",
    message,
    data: bookingData(payload, { status: "cancelled", cancelledBy: cancelledBy || "renter" }),
  });
};

const handleCancellationRequested = async (payload = {}) => {
  const actorName = displayName(payload.actor || payload.renter, "A renter");
  await sendBookingNotification(payload, getOwnerId(payload), NOTIFICATION_EVENTS.CANCELLATION_REQUESTED, {
    title: "Cancellation request received",
    message: `${actorName} requested to cancel a booking for ${getVehicleName(payload)}.`,
    data: bookingData(payload, {
      status: payload.status || getBooking(payload).status,
      cancellationStatus: "requested",
    }),
  });
};

const handleCancellationApproved = async (payload = {}) => {
  await sendBookingNotification(payload, getRenterId(payload), NOTIFICATION_EVENTS.CANCELLATION_APPROVED, {
    title: "Cancellation approved",
    message: "The owner approved your cancellation request. Your booking is now cancelled.",
    data: bookingData(payload, {
      status: "cancelled",
      cancellationStatus: "approved",
    }),
  });
};

const handleCancellationRejected = async (payload = {}) => {
  await sendBookingNotification(payload, getRenterId(payload), NOTIFICATION_EVENTS.CANCELLATION_REJECTED, {
    title: "Cancellation request rejected",
    message: "The owner did not approve your cancellation request. Your booking remains active.",
    data: bookingData(payload, {
      status: payload.status || getBooking(payload).status,
      cancellationStatus: "rejected",
    }),
  });
};

const handleBookingApproved = async (payload = {}) => {
  await sendBookingNotification(payload, getRenterId(payload), NOTIFICATION_EVENTS.BOOKING_APPROVED, {
    title: "Booking approved",
    message: "Your booking request was approved.",
    data: bookingData(payload, { status: "confirmed" }),
  });
};

const handleBookingRejected = async (payload = {}) => {
  await sendBookingNotification(payload, getRenterId(payload), NOTIFICATION_EVENTS.BOOKING_REJECTED, {
    title: "Booking rejected",
    message: "Your booking request was rejected.",
    data: bookingData(payload, { status: "rejected" }),
  });
};

const handleBookingStatusUpdated = async (payload = {}) => {
  const status = statusLabel(payload.status || getBooking(payload).status);
  await sendBookingNotification(payload, toIdString(payload.recipientId) || getRenterId(payload), NOTIFICATION_EVENTS.BOOKING_STATUS_UPDATED, {
    title: "Booking status updated",
    message: `Your booking is now ${status}.`,
    dedupeSuffix: status,
    data: bookingData(payload, { status: payload.status || getBooking(payload).status }),
  });
};

const handleBookingOverdue = async (payload = {}) => {
  const overdueMinutes = Number(payload.overdueMinutes || getBooking(payload).lateReturnOverdueMinutes || 0);
  const data = bookingData(payload, {
    status: payload.status || getBooking(payload).status,
    isOverdue: true,
    overdueMinutes,
  });

  await NotificationService.sendMany([
    {
      user: getRenterId(payload),
      type: "booking_status",
      category: "booking",
      event: NOTIFICATION_EVENTS.BOOKING_OVERDUE,
      priority: "urgent",
      title: "Late return detected",
      message:
        "Your booking is overdue. You can extend the rental or proceed with late return from your booking card.",
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getRenterId(payload), NOTIFICATION_EVENTS.BOOKING_OVERDUE, getBookingId(payload)),
      data: { ...data, actions: ["extend_rental", "proceed_late_return"] },
    },
    {
      user: getOwnerId(payload),
      type: "booking_status",
      category: "booking",
      event: NOTIFICATION_EVENTS.BOOKING_OVERDUE,
      priority: "urgent",
      title: "Vehicle return is overdue",
      message: "The renter has exceeded the scheduled return time.",
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getOwnerId(payload), NOTIFICATION_EVENTS.BOOKING_OVERDUE, getBookingId(payload)),
      data,
    },
  ]);
};

const handleBookingCompleted = async (payload = {}) => {
  const data = bookingData(payload, {
    status: "completed",
    autoCompleted: Boolean(payload.autoCompleted),
  });

  await NotificationService.sendMany([
    {
      user: getRenterId(payload),
      type: "booking_status",
      category: "booking",
      event: NOTIFICATION_EVENTS.BOOKING_COMPLETED,
      title: payload.autoCompleted ? "Booking completed automatically" : "Booking completed",
      message: payload.autoCompleted
        ? "Your rental duration ended and the booking status was updated to completed."
        : "Your booking was marked as completed.",
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getRenterId(payload), NOTIFICATION_EVENTS.BOOKING_COMPLETED, getBookingId(payload)),
      data,
    },
    {
      user: getOwnerId(payload),
      type: "booking_status",
      category: "booking",
      event: NOTIFICATION_EVENTS.BOOKING_COMPLETED,
      title: payload.autoCompleted ? "Booking completed automatically" : "Booking completed",
      message: payload.autoCompleted
        ? "A rental duration ended and the booking was auto-completed."
        : "A booking was marked as completed.",
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getOwnerId(payload), NOTIFICATION_EVENTS.BOOKING_COMPLETED, getBookingId(payload)),
      data,
    },
  ]);
};

const handleLateReturnProcessed = async (payload = {}) => {
  const overdueMinutes = Number(payload.overdueMinutes || getBooking(payload).lateReturnOverdueMinutes || 0);
  const lateReturnPenaltyFee = Number(
    payload.lateReturnPenaltyFee ?? getBooking(payload).lateReturnPenaltyFee ?? 0
  );
  const actorName = displayName(payload.actor || payload.renter, "Your renter");
  const data = bookingData(payload, {
    status: payload.status || getBooking(payload).status || "completed",
    overdueMinutes,
    lateReturnPenaltyFee,
  });

  await NotificationService.sendMany([
    {
      user: getOwnerId(payload),
      type: "booking_status",
      category: "booking",
      event: NOTIFICATION_EVENTS.LATE_RETURN_PROCESSED,
      title: "Late return processed",
      message:
        lateReturnPenaltyFee > 0
          ? `${actorName} proceeded with late return. Additional charges were applied.`
          : `${actorName} confirmed vehicle return.`,
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getOwnerId(payload), NOTIFICATION_EVENTS.LATE_RETURN_PROCESSED, getBookingId(payload)),
      data,
    },
    {
      user: getRenterId(payload),
      type: "booking_status",
      category: "booking",
      event: NOTIFICATION_EVENTS.LATE_RETURN_PROCESSED,
      title: "Late return confirmed",
      message:
        lateReturnPenaltyFee > 0
          ? "Your late return was processed and additional charges were added to your booking."
          : "Your return was confirmed successfully.",
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getRenterId(payload), NOTIFICATION_EVENTS.LATE_RETURN_PROCESSED, getBookingId(payload)),
      data,
    },
  ]);
};

const handleExtensionRequested = async (payload = {}) => {
  const actorName = displayName(payload.actor || payload.renter, "A renter");
  await sendBookingNotification(payload, getOwnerId(payload), NOTIFICATION_EVENTS.EXTENSION_REQUESTED, {
    title: "Extension request received",
    message: `${actorName} requested to extend the booking schedule.`,
    data: bookingData(payload, {
      status: payload.status || getBooking(payload).status,
      extensionStatus: "requested",
      requestedReturnAt: payload.requestedReturnAt || getBooking(payload).extensionRequestedReturnAt,
    }),
  });
};

const handleExtensionApproved = async (payload = {}) => {
  await sendBookingNotification(payload, getRenterId(payload), NOTIFICATION_EVENTS.EXTENSION_APPROVED, {
    title: "Extension approved",
    message: "Your extension request was approved. Booking schedule and price were updated.",
    data: bookingData(payload, {
      status: payload.status || getBooking(payload).status,
      extensionStatus: "approved",
      returnAt: payload.returnAt || getBooking(payload).returnAt,
    }),
  });
};

const handleExtensionRejected = async (payload = {}) => {
  await sendBookingNotification(payload, getRenterId(payload), NOTIFICATION_EVENTS.EXTENSION_REJECTED, {
    title: "Extension rejected",
    message: "Your extension request was rejected. The original booking schedule remains in effect.",
    data: bookingData(payload, {
      status: payload.status || getBooking(payload).status,
      extensionStatus: "rejected",
    }),
  });
};

const handlePaymentReceived = async (payload = {}) => {
  const paymentStatus = toOptionalText(payload.paymentStatus || getBooking(payload).paymentStatus);
  const isNowPaidInFull = paymentStatus === "paid";
  const actorName = displayName(payload.actor || payload.renter, "A renter");
  const vehicleName = getVehicleName(payload);

  await NotificationService.sendMany([
    {
      user: getOwnerId(payload),
      type: "booking_payment",
      category: "payment",
      event: NOTIFICATION_EVENTS.PAYMENT_RECEIVED,
      priority: "important",
      title: isNowPaidInFull ? "Booking paid" : "Downpayment received",
      message: isNowPaidInFull
        ? `${actorName} completed payment for ${vehicleName}.`
        : `${actorName} paid a downpayment for ${vehicleName}.`,
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getOwnerId(payload), NOTIFICATION_EVENTS.PAYMENT_RECEIVED, getBookingId(payload), paymentStatus),
      data: bookingData(payload, { paymentStatus }),
    },
    {
      user: getRenterId(payload),
      type: "booking_payment",
      category: "payment",
      event: NOTIFICATION_EVENTS.PAYMENT_RECEIVED,
      priority: "important",
      title: isNowPaidInFull ? "Payment successful" : "Downpayment successful",
      message: isNowPaidInFull
        ? `Your payment for ${vehicleName || "your booking"} was successful.`
        : `Your downpayment for ${vehicleName || "your booking"} was successful.`,
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getRenterId(payload), NOTIFICATION_EVENTS.PAYMENT_RECEIVED, getBookingId(payload), paymentStatus),
      data: bookingData(payload, { paymentStatus }),
    },
  ]);
};

const handlePaymentStatusUpdated = async (payload = {}) => {
  const paymentStatus = toOptionalText(payload.paymentStatus || getBooking(payload).paymentStatus);
  await sendPaymentNotification(payload, getRenterId(payload), NOTIFICATION_EVENTS.PAYMENT_STATUS_UPDATED, {
    title: "Payment status updated",
    message: `Payment status is now ${paymentStatus}.`,
    dedupeSuffix: paymentStatus,
    data: bookingData(payload, { paymentStatus }),
  });
};

const handleWalkInPaymentRequested = async (payload = {}) => {
  const actorName = displayName(payload.actor || payload.renter, "Your renter");
  const vehicleName = getVehicleName(payload);

  await NotificationService.sendMany([
    {
      user: getOwnerId(payload),
      type: "booking_payment",
      category: "payment",
      event: NOTIFICATION_EVENTS.WALKIN_PAYMENT_REQUESTED,
      priority: "important",
      title: "Walk-in payment requested",
      message: `${actorName} requested walk-in payment approval for ${vehicleName}.`,
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getOwnerId(payload), NOTIFICATION_EVENTS.WALKIN_PAYMENT_REQUESTED, getBookingId(payload)),
      data: bookingData(payload, { walkInPaymentStatus: "requested" }),
    },
    {
      user: getRenterId(payload),
      type: "booking_payment",
      category: "payment",
      event: NOTIFICATION_EVENTS.WALKIN_PAYMENT_REQUESTED,
      priority: "important",
      title: "Walk-in payment request sent",
      message: "Your request is now waiting for owner approval.",
      entityType: "booking",
      entityId: getBookingId(payload),
      dedupeKey: notificationKey(getRenterId(payload), NOTIFICATION_EVENTS.WALKIN_PAYMENT_REQUESTED, getBookingId(payload)),
      data: bookingData(payload, { walkInPaymentStatus: "requested" }),
    },
  ]);
};

const handleWalkInPaymentReviewed = (action) => async (payload = {}) => {
  const approved = action === "approved";
  await sendPaymentNotification(
    payload,
    getRenterId(payload),
    approved ? NOTIFICATION_EVENTS.WALKIN_PAYMENT_APPROVED : NOTIFICATION_EVENTS.WALKIN_PAYMENT_REJECTED,
    {
      title: approved ? "Walk-in payment approved" : "Walk-in payment rejected",
      message: approved
        ? "Your walk-in payment request was approved by the owner."
        : "Your walk-in payment request was rejected by the owner.",
      data: bookingData(payload, { walkInPaymentStatus: action }),
    }
  );
};

const handleWalkInPaymentConfirmed = async (payload = {}) => {
  await sendPaymentNotification(payload, getRenterId(payload), NOTIFICATION_EVENTS.WALKIN_PAYMENT_CONFIRMED, {
    title: "Walk-in payment confirmed",
    message: "The owner confirmed your remaining balance payment.",
    data: bookingData(payload, { paymentStatus: "paid", walkInPaymentStatus: "completed" }),
  });
};

const handleChatMessageReceived = async (payload = {}) => {
  const receiverId = toIdString(payload.receiverId || payload.receiver?._id || payload.receiver);
  const senderId = toIdString(payload.senderId || payload.sender?._id || payload.sender);
  const messageId = toIdString(payload.messageId || payload.message?._id || payload.message);

  await NotificationService.send({
    user: receiverId,
    type: "chat_message",
    category: "chat",
    event: NOTIFICATION_EVENTS.CHAT_MESSAGE_RECEIVED,
    title: "New message",
    message: `${displayName(payload.actor || payload.sender, "Someone")} sent you a message.`,
    entityType: messageId ? "message" : getBookingId(payload) ? "booking" : "conversation",
    entityId: messageId || getBookingId(payload) || getVehicleId(payload),
    dedupeKey: messageId ? notificationKey(receiverId, NOTIFICATION_EVENTS.CHAT_MESSAGE_RECEIVED, messageId) : "",
    data: {
      senderId,
      bookingId: getBookingId(payload) || null,
      vehicleId: getVehicleId(payload) || null,
      messageId: messageId || null,
    },
  });
};

const handleReviewCreated = async (payload = {}) => {
  await sendBookingNotification(payload, getOwnerId(payload), NOTIFICATION_EVENTS.REVIEW_CREATED, {
    type: "system",
    category: "system",
    title: "New vehicle review",
    message: "A renter left a review on a completed booking.",
    data: bookingData(payload, { rating: payload.rating || getBooking(payload).reviewRating }),
  });
};

export const registerNotificationHandlers = () => {
  if (registered) return;
  registered = true;

  subscribe(NOTIFICATION_EVENTS.BOOKING_CREATED, handleBookingCreated);
  subscribe(NOTIFICATION_EVENTS.BOOKING_CANCELLED, handleBookingCancelled);
  subscribe(NOTIFICATION_EVENTS.BOOKING_APPROVED, handleBookingApproved);
  subscribe(NOTIFICATION_EVENTS.BOOKING_REJECTED, handleBookingRejected);
  subscribe(NOTIFICATION_EVENTS.BOOKING_STATUS_UPDATED, handleBookingStatusUpdated);
  subscribe(NOTIFICATION_EVENTS.BOOKING_OVERDUE, handleBookingOverdue);
  subscribe(NOTIFICATION_EVENTS.BOOKING_COMPLETED, handleBookingCompleted);
  subscribe(NOTIFICATION_EVENTS.LATE_RETURN_PROCESSED, handleLateReturnProcessed);

  subscribe(NOTIFICATION_EVENTS.CANCELLATION_REQUESTED, handleCancellationRequested);
  subscribe(NOTIFICATION_EVENTS.CANCELLATION_APPROVED, handleCancellationApproved);
  subscribe(NOTIFICATION_EVENTS.CANCELLATION_REJECTED, handleCancellationRejected);

  subscribe(NOTIFICATION_EVENTS.EXTENSION_REQUESTED, handleExtensionRequested);
  subscribe(NOTIFICATION_EVENTS.EXTENSION_APPROVED, handleExtensionApproved);
  subscribe(NOTIFICATION_EVENTS.EXTENSION_REJECTED, handleExtensionRejected);

  subscribe(NOTIFICATION_EVENTS.PAYMENT_RECEIVED, handlePaymentReceived);
  subscribe(NOTIFICATION_EVENTS.PAYMENT_STATUS_UPDATED, handlePaymentStatusUpdated);
  subscribe(NOTIFICATION_EVENTS.WALKIN_PAYMENT_REQUESTED, handleWalkInPaymentRequested);
  subscribe(NOTIFICATION_EVENTS.WALKIN_PAYMENT_APPROVED, handleWalkInPaymentReviewed("approved"));
  subscribe(NOTIFICATION_EVENTS.WALKIN_PAYMENT_REJECTED, handleWalkInPaymentReviewed("rejected"));
  subscribe(NOTIFICATION_EVENTS.WALKIN_PAYMENT_CONFIRMED, handleWalkInPaymentConfirmed);

  subscribe(NOTIFICATION_EVENTS.CHAT_MESSAGE_RECEIVED, handleChatMessageReceived);

  subscribe(NOTIFICATION_EVENTS.REVIEW_CREATED, handleReviewCreated);
};

export default registerNotificationHandlers;
