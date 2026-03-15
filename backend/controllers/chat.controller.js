import mongoose from "mongoose";
import ChatMessage from "../models/ChatMessage.js";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import { createNotification } from "../utils/notification.js";
import { emitToUser } from "../socket/index.js";
import { censorProfanityInText } from "../utils/chatModeration.js";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));
const toIdString = (value) => String(value?._id || value || "");

const buildOwnerRenterQuery = (userA, userB) => ({
  $or: [
    { owner: userA, renter: userB },
    { owner: userB, renter: userA },
  ],
});

const parseChatContext = (value = {}) => ({
  bookingId: String(value?.bookingId || "").trim(),
  vehicleId: String(value?.vehicleId || "").trim(),
});

const validateChatContext = ({ bookingId, vehicleId }) => {
  if (bookingId && vehicleId) {
    return "Provide only one chat context: bookingId or vehicleId.";
  }
  if (bookingId && !isObjectId(bookingId)) return "Invalid booking ID.";
  if (vehicleId && !isObjectId(vehicleId)) return "Invalid vehicle ID.";
  return "";
};

const sanitizeChatMessage = (message = {}) => {
  if (!message || typeof message !== "object") return message;
  return {
    ...message,
    text: censorProfanityInText(String(message.text || "")),
  };
};

const applyScopeQuery = (query, relation, context = {}) => {
  if (context.bookingId && relation?.bookingId) {
    query.booking = relation.bookingId;
    return query;
  }
  if (context.vehicleId && relation?.vehicleId) {
    query.vehicle = relation.vehicleId;
  }
  return query;
};

const resolveOwnerRenterPair = async ({ senderId, partnerId, bookingId, vehicleId }) => {
  const senderKey = toIdString(senderId);
  const partnerKey = toIdString(partnerId);
  if (!senderKey || !partnerKey) return null;

  if (bookingId) {
    const booking = await Booking.findById(bookingId).select("_id owner renter vehicle");
    if (!booking) return null;

    const participants = [String(booking.owner), String(booking.renter)];
    if (!participants.includes(senderKey) || !participants.includes(partnerKey)) {
      return null;
    }

    return {
      bookingId: booking._id,
      vehicleId: booking.vehicle || null,
      ownerId: booking.owner,
      renterId: booking.renter,
    };
  }

  if (vehicleId) {
    const vehicle = await Vehicle.findById(vehicleId).select("_id owner");
    if (!vehicle) return null;

    const ownerKey = String(vehicle.owner);
    if (![senderKey, partnerKey].includes(ownerKey)) return null;

    const renterId = senderKey === ownerKey ? partnerId : senderId;
    if (!renterId || String(renterId) === ownerKey) return null;

    return {
      bookingId: null,
      vehicleId: vehicle._id,
      ownerId: vehicle.owner,
      renterId,
    };
  }

  const latestBooking = await Booking.findOne(buildOwnerRenterQuery(senderId, partnerId))
    .sort({ createdAt: -1 })
    .select("_id owner renter vehicle");

  if (latestBooking) {
    return {
      bookingId: latestBooking._id,
      vehicleId: latestBooking.vehicle || null,
      ownerId: latestBooking.owner,
      renterId: latestBooking.renter,
    };
  }

  // Fallback to existing chat relation so persisted messages remain visible
  // even when booking lookups are unavailable (for example after archival/migration).
  const latestChatRelation = await ChatMessage.findOne(buildOwnerRenterQuery(senderId, partnerId))
    .sort({ createdAt: -1 })
    .select("booking vehicle owner renter");
  if (!latestChatRelation) return null;

  return {
    bookingId: latestChatRelation.booking || null,
    vehicleId: latestChatRelation.vehicle || null,
    ownerId: latestChatRelation.owner,
    renterId: latestChatRelation.renter,
  };
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const [messages, unreadCounts] = await Promise.all([
      ChatMessage.find({
        $or: [{ sender: userId }, { receiver: userId }],
      })
        .sort({ createdAt: -1 })
        .limit(500)
        .populate("sender", "name email avatar")
        .populate("receiver", "name email avatar")
        .populate("booking", "pickupAt returnAt status")
        .populate("vehicle", "name")
        .lean(),
      ChatMessage.aggregate([
        {
          $match: {
            receiver: userId,
            readAt: null,
          },
        },
        {
          $group: {
            _id: "$sender",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const unreadBySender = new Map(
      unreadCounts.map((entry) => [String(entry._id), entry.count])
    );

    const byPartner = new Map();
    for (const message of messages) {
      const partner =
        String(message.sender?._id || message.sender) === String(userId)
          ? message.receiver
          : message.sender;

      const partnerId = String(partner?._id || partner);
      if (!partnerId || byPartner.has(partnerId)) continue;

        byPartner.set(partnerId, {
        partner: {
            _id: partner?._id || partnerId,
            name: partner?.name || partner?.email || "User",
            email: partner?.email || "",
            avatar: partner?.avatar || "",
          },
          lastMessage: {
          _id: message._id,
          text: censorProfanityInText(String(message.text || "")),
          sender: message.sender,
          receiver: message.receiver,
          booking: message.booking || null,
          vehicle: message.vehicle || null,
          createdAt: message.createdAt,
        },
        unreadCount: unreadBySender.get(partnerId) || 0,
      });
    }

    res.json({ success: true, conversations: Array.from(byPartner.values()) });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch conversations." });
  }
};

export const getMessagesWithUser = async (req, res) => {
  try {
    const partnerId = req.params.userId;
    const currentUserId = req.user._id;
    const context = parseChatContext(req.query);

    if (!isObjectId(partnerId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    const contextError = validateChatContext(context);
    if (contextError) {
      return res.status(400).json({ success: false, message: contextError });
    }

    const relation = await resolveOwnerRenterPair({
      senderId: currentUserId,
      partnerId,
      bookingId: context.bookingId,
      vehicleId: context.vehicleId,
    });

    if (!relation) {
      return res.status(403).json({
        success: false,
        message: "Chat is only available between renters and owners with related bookings.",
      });
    }

    const query = {
      $or: [
        { sender: currentUserId, receiver: partnerId },
        { sender: partnerId, receiver: currentUserId },
      ],
    };
    applyScopeQuery(query, relation, context);

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar")
      .populate("booking", "pickupAt returnAt status")
      .populate("vehicle", "name")
      .lean();

    res.json({
      success: true,
      messages: messages.map((message) => sanitizeChatMessage(message)),
      conversationMeta: {
        bookingId: relation.bookingId || null,
        vehicleId: relation.vehicleId || null,
        ownerId: relation.ownerId,
        renterId: relation.renterId,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch messages." });
  }
};

export const sendMessageToUser = async (req, res) => {
  try {
    const receiverId = req.params.userId;
    const senderId = req.user._id;
    const text = String(req.body.text || "").trim();
    const context = parseChatContext(req.body);

    if (!isObjectId(receiverId)) {
      return res.status(400).json({ success: false, message: "Invalid receiver ID." });
    }
    if (!text) {
      return res.status(400).json({ success: false, message: "Message text is required." });
    }

    const contextError = validateChatContext(context);
    if (contextError) {
      return res.status(400).json({ success: false, message: contextError });
    }

    const relation = await resolveOwnerRenterPair({
      senderId,
      partnerId: receiverId,
      bookingId: context.bookingId,
      vehicleId: context.vehicleId,
    });
    if (!relation) {
      return res.status(403).json({
        success: false,
        message: "Chat is only available between renters and owners with related bookings.",
      });
    }

    const message = await ChatMessage.create({
      owner: relation.ownerId,
      renter: relation.renterId,
      booking: relation.bookingId || null,
      vehicle: relation.vehicleId || null,
      sender: senderId,
      receiver: receiverId,
      text: censorProfanityInText(text),
      attachments: [],
    });

    const populated = await ChatMessage.findById(message._id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar")
      .populate("booking", "pickupAt returnAt status")
      .populate("vehicle", "name")
      .lean();
    const sanitizedMessage = sanitizeChatMessage(populated);

    await createNotification({
      user: receiverId,
      type: "chat_message",
      title: "New message",
      message: `${req.user.name || "Someone"} sent you a message.`,
      data: {
        senderId,
        bookingId: relation.bookingId || null,
        vehicleId: relation.vehicleId || null,
      },
    });

    emitToUser(String(receiverId), "chat:message", sanitizedMessage);
    emitToUser(String(senderId), "chat:message", sanitizedMessage);

    res.status(201).json({ success: true, message: sanitizedMessage });
  } catch {
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const partnerId = req.params.userId;
    const currentUserId = req.user._id;
    const context = parseChatContext(req.query);

    if (!isObjectId(partnerId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    const contextError = validateChatContext(context);
    if (contextError) {
      return res.status(400).json({ success: false, message: contextError });
    }

    const relation = await resolveOwnerRenterPair({
      senderId: currentUserId,
      partnerId,
      bookingId: context.bookingId,
      vehicleId: context.vehicleId,
    });

    if (!relation) {
      return res.status(403).json({
        success: false,
        message: "Chat is only available between renters and owners with related bookings.",
      });
    }

    const query = {
      sender: partnerId,
      receiver: currentUserId,
      readAt: null,
    };
    applyScopeQuery(query, relation, context);

    await ChatMessage.updateMany(
      query,
      { $set: { readAt: new Date() } }
    );

    res.json({ success: true, message: "Messages marked as read." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to mark messages as read." });
  }
};
