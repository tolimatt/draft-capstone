import Notification from "../models/Notification.js";
import { emitToUser } from "../socket/index.js";

const TYPE_CATEGORY_MAP = {
  booking_status: "booking",
  booking_payment: "payment",
  chat_message: "chat",
  system: "system",
};

const TYPE_EVENT_PREFIX_MAP = {
  booking_status: "booking",
  booking_payment: "payment",
  chat_message: "chat",
  system: "system",
};

const VALID_CATEGORIES = new Set(["booking", "payment", "chat", "system"]);
const VALID_PRIORITIES = new Set(["low", "normal", "important", "urgent"]);

const toIdString = (value) => {
  if (!value) return "";
  return String(value?._id || value);
};

const compactText = (value) => String(value || "").trim();

const slugify = (value) =>
  compactText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

const resolveCategory = (type, category) => {
  const normalized = compactText(category);
  if (VALID_CATEGORIES.has(normalized)) return normalized;
  return TYPE_CATEGORY_MAP[type] || "system";
};

const resolveEntity = (data = {}) => {
  const bookingId = toIdString(data.bookingId);
  if (bookingId) return { entityType: "booking", entityId: bookingId };

  const conversationId = toIdString(data.conversationId);
  if (conversationId) return { entityType: "conversation", entityId: conversationId };

  const messageId = toIdString(data.messageId);
  if (messageId) return { entityType: "message", entityId: messageId };

  const vehicleId = toIdString(data.vehicleId);
  if (vehicleId) return { entityType: "vehicle", entityId: vehicleId };

  return { entityType: "", entityId: "" };
};

const resolveEvent = ({ type = "system", event, title, data = {} }) => {
  const explicitEvent = compactText(event || data.event);
  if (explicitEvent) return explicitEvent;

  if (type === "booking_status" && data.autoCompleted) return "booking.completed";
  if (type === "booking_status" && data.isOverdue) return "booking.overdue";
  if (type === "booking_payment" && data.walkInPaymentStatus) {
    return `walkin_payment.${slugify(data.walkInPaymentStatus)}`;
  }
  if (type === "booking_payment" && data.paymentStatus) {
    return `payment.${slugify(data.paymentStatus)}`;
  }
  if (type === "chat_message") return "chat.message_received";

  const prefix = TYPE_EVENT_PREFIX_MAP[type] || "system";
  const titleSlug = slugify(title);
  return titleSlug ? `${prefix}.${titleSlug}` : prefix;
};

const resolvePriority = ({ priority, type, data = {} }) => {
  const normalized = compactText(priority);
  if (VALID_PRIORITIES.has(normalized)) return normalized;
  if (data.isOverdue) return "urgent";
  if (type === "booking_payment") return "important";
  return "normal";
};

const resolveDedupeKey = ({ dedupeKey, user, type, data = {}, event }) => {
  const explicitKey = compactText(dedupeKey || data.dedupeKey);
  if (explicitKey) return explicitKey;

  const recipientId = toIdString(user);
  const bookingId = toIdString(data.bookingId);
  if (!recipientId || !bookingId) return "";

  const normalizedEvent = compactText(event);
  if (
    normalizedEvent === "booking.completed" ||
    normalizedEvent === "booking.overdue" ||
    (type === "booking_status" && (data.autoCompleted || data.isOverdue))
  ) {
    return `${recipientId}:${normalizedEvent || type}:${bookingId}`;
  }

  return "";
};

const findExistingByDedupeKey = ({ user, dedupeKey }) => {
  if (!user || !dedupeKey) return null;
  return Notification.findOne({ user, dedupeKey });
};

export const NotificationService = {
  async send({
    user,
    type = "system",
    category,
    event,
    priority,
    actor = null,
    title,
    message,
    data = {},
    entityType,
    entityId,
    actionUrl = "",
    dedupeKey,
  }) {
    const recipientId = toIdString(user);
    const normalizedTitle = compactText(title);
    const normalizedMessage = compactText(message);

    if (!recipientId || !normalizedTitle || !normalizedMessage) {
      console.warn("[notification] Skipped invalid notification payload.", {
        user: recipientId,
        type,
        hasTitle: Boolean(normalizedTitle),
        hasMessage: Boolean(normalizedMessage),
      });
      return null;
    }

    const inferredEntity = resolveEntity(data);
    const resolvedEvent = resolveEvent({ type, event, title: normalizedTitle, data });
    const resolvedDedupeKey = resolveDedupeKey({
      dedupeKey,
      user: recipientId,
      type,
      data,
      event: resolvedEvent,
    });

    try {
      const existing = await findExistingByDedupeKey({
        user: recipientId,
        dedupeKey: resolvedDedupeKey,
      });
      if (existing) return existing;

      const notification = await Notification.create({
        user: recipientId,
        type,
        category: resolveCategory(type, category),
        event: resolvedEvent,
        priority: resolvePriority({ priority, type, data }),
        actor: actor ? toIdString(actor) : null,
        entityType: compactText(entityType) || inferredEntity.entityType,
        entityId: compactText(entityId) || inferredEntity.entityId,
        actionUrl: compactText(actionUrl || data.actionUrl),
        dedupeKey: resolvedDedupeKey,
        title: normalizedTitle,
        message: normalizedMessage,
        data,
      });

      emitToUser(recipientId, "notification:new", notification);
      return notification;
    } catch (error) {
      if (error?.code === 11000) {
        return findExistingByDedupeKey({
          user: recipientId,
          dedupeKey: resolvedDedupeKey,
        });
      }

      console.error("[notification] Failed to create notification:", error?.message || error);
      return null;
    }
  },

  async sendMany(items = []) {
    const notifications = [];
    for (const item of items) {
      const notification = await this.send(item);
      if (notification) notifications.push(notification);
    }
    return notifications;
  },
};

export default NotificationService;
