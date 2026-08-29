import axios from "axios";
import express from "express";
import {
  getConversations,
  getOwnerRenterThreads,
  openOwnerRenterThread,
  updateOwnerRenterThreadPin,
  getMessagesWithUser,
  sendMessageToUser,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
  deleteConversation,
} from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { requireModerationCapability } from "../middleware/moderation.middleware.js";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import { ensureChatbotServiceReady } from "../utils/chatbotServiceManager.js";
import { censorProfanityInText } from "../utils/chatModeration.js";
import {
  applyChatbotGuardrails,
  buildRejectedChatbotResponse,
  buildChatbotPayload,
  buildRetryPayload,
  normalizeChatbotResponse,
  shouldRetryChatbotResponse,
  validateChatbotInput,
} from "../utils/chatbotPayload.js";

const router = express.Router();
const isProduction = process.env.NODE_ENV === "production";
const DEFAULT_CHATBOT_URL = isProduction ? "" : "http://localhost:8001";
const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "extended"];

router.post("/", async (req, res, next) => {
  try {
    const rawMessage = String(req.body?.message || "");
    const language = String(req.body?.language || "auto").trim().toLowerCase();
    const validation = validateChatbotInput(rawMessage);
    if (!validation.isValid) {
      const rejectedResponse = buildRejectedChatbotResponse(
        language === "auto" ? rawMessage : language,
        validation.reason
      );
      if (validation.reason === "profanity") {
        rejectedResponse.censoredMessage = censorProfanityInText(rawMessage.trim());
      }
      return res.json(rejectedResponse);
    }
    const message = validation.message;

    const chatbotBaseUrl = String(process.env.CHATBOT_URL || DEFAULT_CHATBOT_URL)
      .trim()
      .replace(/\/+$/, "");
    if (!chatbotBaseUrl) {
      return res.status(503).json({ message: "CHATBOT_URL is not configured in production." });
    }
    await ensureChatbotServiceReady();

    const vehicles = await Vehicle.find({ availabilityStatus: "available" })
      .select(
        "name description location availabilityStatus imageUrl images dailyRentalRate pricingUnit specs driverOptionEnabled driverDailyRate"
      )
      .lean();

    let realtimeAvailableVehicles = vehicles;
    if (vehicles.length > 0) {
      const vehicleIds = vehicles.map((vehicle) => vehicle._id);
      const lockedVehicleIds = await Booking.distinct("vehicle", {
        vehicle: { $in: vehicleIds },
        status: { $in: ACTIVE_BOOKING_STATUSES },
        returnAt: { $gt: new Date() },
      });
      const lockedVehicleIdSet = new Set(lockedVehicleIds.map((id) => String(id)));
      realtimeAvailableVehicles = vehicles.filter(
        (vehicle) => !lockedVehicleIdSet.has(String(vehicle?._id || ""))
      );
    }

    const payload = buildChatbotPayload(message, language, realtimeAvailableVehicles);
    if (payload.preflightRejectReason) {
      return res.json(buildRejectedChatbotResponse(payload.selectedLanguage, payload.preflightRejectReason));
    }

    const { data: firstResponse } = await axios.post(
      `${chatbotBaseUrl}/chat`,
      {
        message: payload.filteredMessage,
        language: payload.selectedLanguage,
        vehicles: payload.vehicles,
      },
      { timeout: 15000 }
    );

    let chatbotResponse = normalizeChatbotResponse(firstResponse);

    if (shouldRetryChatbotResponse(chatbotResponse, payload)) {
      const retryMessage = buildRetryPayload(payload);
      const { data: retryResponse } = await axios.post(
        `${chatbotBaseUrl}/chat`,
        {
          message: retryMessage,
          language: payload.selectedLanguage,
          vehicles: payload.vehicles,
        },
        { timeout: 15000 }
      );

      const normalizedRetry = normalizeChatbotResponse(retryResponse);
      if (normalizedRetry.score >= chatbotResponse.score) {
        chatbotResponse = normalizedRetry;
      }
    }

    return res.json(applyChatbotGuardrails(chatbotResponse, payload));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return res.status(error.response.status).json(
          error.response.data && typeof error.response.data === "object"
            ? error.response.data
            : { message: "Chatbot service returned an invalid response." }
        );
      }

      return res.status(502).json({
        message: "Chatbot service is unavailable.",
      });
    }

    return next(error);
  }
});

router.get("/conversations", protect, authorize("user", "owner", "admin"), getConversations);
router.get("/owner/renters", protect, authorize("owner", "admin"), getOwnerRenterThreads);
router.post("/owner/renters/:renterId/open", protect, authorize("owner", "admin"), openOwnerRenterThread);
router.patch("/owner/renters/:renterId/pin", protect, authorize("owner", "admin"), updateOwnerRenterThreadPin);
router.delete("/conversations/:userId", protect, authorize("user", "owner", "admin"), deleteConversation);
router.get("/messages/:userId", protect, authorize("user", "owner", "admin"), getMessagesWithUser);
router.post("/messages/:userId", protect, authorize("user", "owner", "admin"), requireModerationCapability("chat"), sendMessageToUser);
router.patch("/messages/:userId/read", protect, authorize("user", "owner", "admin"), markMessagesAsRead);
router.patch("/messages/:messageId", protect, authorize("user", "owner", "admin"), editMessage);
router.delete("/messages/:messageId", protect, authorize("user", "owner", "admin"), deleteMessage);

export default router;
