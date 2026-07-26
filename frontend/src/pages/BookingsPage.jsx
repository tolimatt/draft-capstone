import { useEffect, useMemo, useState } from "react";
import { MessageCircle, MoreHorizontal, Pencil, Send, Trash2, X } from "lucide-react";
import API from "../utils/api";
import { getSocket } from "../utils/socket";
import Navbar from "../components/Navbar";
import BookingAccessModal from "../components/BookingAccessModal";
import ChatWidget from "../components/ChatWidget";
import { requestLiveCountersRefresh } from "../utils/liveCounters";
import { getTransactionFee } from "../utils/fees";
import { getSessionUser } from "../utils/sessionStore";
import {
  formatDateInput,
  formatDurationMinutes,
  formatTimeInput,
  getInitialsFromName,
  getDateTime,
  getDurationHoursFromMinutes,
  getDurationMinutesBetween,
} from "../utils/dateUtils";
import { resolveAssetUrl } from "../utils/media";

const statusStyles = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border border-blue-200",
  extended: "bg-violet-100 text-violet-800 border border-violet-200",
  completed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 border border-rose-200",
  rejected: "bg-rose-100 text-rose-800 border border-rose-200",
};

const paymentStyles = {
  unpaid: "bg-rose-100 text-rose-800 border border-rose-200",
  partial: "bg-orange-100 text-orange-800 border border-orange-200",
  paid: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  refunded: "bg-cyan-100 text-cyan-800 border border-cyan-200",
};
const DOWNPAYMENT_RATE = 0.3;

const money = (value) =>
  `\u20b1${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
const moneyWithCents = (value) =>
  `\u20b1${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");
const toTitleCase = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
const getOwnerDisplayName = (booking) => {
  const owner = booking?.owner || {};
  return String(owner.name || owner.email || "").trim() || "Owner";
};
const appendUniqueMessage = (list, message) =>
  list.some((item) => item._id === message._id) ? list : [...list, message];
const replaceMessageById = (list, message) =>
  list.map((item) => (item._id === message._id ? { ...item, ...message } : item));
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
  const latePenaltyFee = Number(
    booking?.lateReturnPenaltyFee ?? booking?.lateReturn?.penaltyFee ?? booking?.late_return?.penaltyFee ?? 0
  );
  const safeLatePenaltyFee = Number.isFinite(latePenaltyFee) && latePenaltyFee > 0 ? roundCurrency(latePenaltyFee) : 0;

  const total = Number(booking?.totalAmount);
  if (Number.isFinite(total) && total >= 0) return roundCurrency(total + safeLatePenaltyFee);

  const baseAmount = Number(booking?.baseAmount);
  const driverAmount = Number(booking?.driverAmount);
  if (Number.isFinite(baseAmount) && Number.isFinite(driverAmount) && baseAmount + driverAmount > 0) {
    return roundCurrency(baseAmount + driverAmount + safeLatePenaltyFee);
  }

  const durationHours = getDurationHoursFromMinutes(getBookingDurationMinutesForPricing(booking));
  const vehicleHourlyRate = Number((booking?.vehicleHourlyRate ?? booking?.vehicleDailyRate) || 0);
  if (Number.isFinite(vehicleHourlyRate) && vehicleHourlyRate > 0 && Number.isFinite(durationHours) && durationHours > 0) {
    const driverHourlyRate = Number((booking?.driverHourlyRate ?? booking?.driverDailyRate) || 0);
    const driverSelected = Boolean(booking?.driverSelected);
    const driverAmountFromRate =
      driverSelected && Number.isFinite(driverHourlyRate) && driverHourlyRate > 0
        ? driverHourlyRate * durationHours
        : 0;
    return roundCurrency(vehicleHourlyRate * durationHours + driverAmountFromRate + safeLatePenaltyFee);
  }

  const payable = Number(booking?.amountPayable);
  if (Number.isFinite(payable) && payable >= 0) {
    return Math.max(roundCurrency(payable - getTransactionFee()), 0);
  }

  return safeLatePenaltyFee;
};

const getVehicleRateForPayment = (booking) => getRentalTotal(booking);

const getAmountPayable = (booking) => getRentalTotal(booking) + getTransactionFee();

const roundCurrency = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
};

const getPaymentPaidAmount = (booking) => {
  const totalPayable = getAmountPayable(booking);
  const paid = Number(booking?.paymentAmountPaid);
  if (Number.isFinite(paid) && paid > 0) {
    return Math.min(roundCurrency(paid), totalPayable);
  }
  if (String(booking?.paymentStatus || "").toLowerCase() === "paid") {
    return totalPayable;
  }
  return 0;
};

const getPaymentRemainingAmount = (booking) => {
  const totalPayable = getAmountPayable(booking);
  return roundCurrency(Math.max(totalPayable - getPaymentPaidAmount(booking), 0));
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
    penaltyFee: Number.isFinite(penaltyFee) && penaltyFee > 0 ? roundCurrency(penaltyFee) : 0,
    action: String(lateReturn?.action || "none").trim().toLowerCase(),
  };
};

const getExtensionRequestInfo = (booking) => {
  const extension = booking?.extensionRequest || booking?.extension_request || {};
  return {
    status: String(extension?.status || "none").trim().toLowerCase(),
    currentReturnAt: extension?.currentReturnAt || null,
    requestedReturnAt: extension?.requestedReturnAt || null,
    requestNote: String(extension?.requestNote || "").trim(),
    reviewNote: String(extension?.reviewNote || "").trim(),
  };
};

const getWalkInStatusMessage = (booking) => {
  const status = getWalkInStatus(booking);
  if (status === "requested") {
    return "Walk-in request pending owner approval.";
  }
  if (status === "approved") {
    return "Walk-in request approved. Settle remaining balance with owner, then wait for owner confirmation.";
  }
  if (status === "rejected") {
    return "Walk-in request was rejected by owner. You can request again or pay online.";
  }
  if (status === "completed") {
    return "Walk-in payment confirmed by owner.";
  }
  return "";
};

export default function BookingsPage({
  isLoggedIn,
  user,
  onNavigateToHome,
  onNavigateToSignIn,
  onNavigateToRegister,
  onNavigateToVehicles,
  onNavigateToAbout,
  onNavigateToContacts,
  onNavigateToChat,
  onNavigateToNotifications,
  onOpenNotificationsModal,
  onNavigateToBookingHistory,
  onNavigateToAccountSettings,
  onLogout,
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [chatBooking, setChatBooking] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [chatError, setChatError] = useState("");
  const [editingChatMessageId, setEditingChatMessageId] = useState("");
  const [editingChatText, setEditingChatText] = useState("");
  const [savingChatEdit, setSavingChatEdit] = useState(false);
  const [deletingChatMessageId, setDeletingChatMessageId] = useState("");
  const [confirmDeleteChatMessageId, setConfirmDeleteChatMessageId] = useState("");
  const [activeChatMessageActionId, setActiveChatMessageActionId] = useState("");
  const [showDeleteChatConversationConfirm, setShowDeleteChatConversationConfirm] = useState(false);
  const [deletingChatConversation, setDeletingChatConversation] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(!isLoggedIn);
  const [payingBookingId, setPayingBookingId] = useState("");
  const [verifyingBookingId, setVerifyingBookingId] = useState("");
  const [paymentErrors, setPaymentErrors] = useState({});
  const [paymentNotice, setPaymentNotice] = useState("");
  const [approvalModalBooking, setApprovalModalBooking] = useState(null);
  const [paymentConfirmBooking, setPaymentConfirmBooking] = useState(null);
  const [extensionModalBooking, setExtensionModalBooking] = useState(null);
  const [extensionForm, setExtensionForm] = useState({
    newReturnDate: "",
    newReturnTime: "",
    note: "",
  });
  const [extensionSubmitting, setExtensionSubmitting] = useState(false);
  const [lateReturnSubmittingId, setLateReturnSubmittingId] = useState("");
  const [paymentPreferences, setPaymentPreferences] = useState({
    scope: "downpayment",
    channel: "ewallet",
  });
  const [showAI, setShowAI] = useState(false);
  const currentUserId = user?._id || getSessionUser()?._id || "";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const bookingResponse = await API.getMyBookings(statusFilter);
      const normalized = (bookingResponse.bookings || []).map((booking) =>
        booking.status === "rejected" ? { ...booking, status: "cancelled" } : booking
      );
      setBookings(normalized);
      requestLiveCountersRefresh();
    } catch (err) {
      setError(err.message || "Failed to load booking history.");
    } finally {
      setLoading(false);
    }
  };

  const upsertBooking = (incomingBooking) => {
    if (!incomingBooking?._id) return;
    const normalized =
      incomingBooking.status === "rejected"
        ? { ...incomingBooking, status: "cancelled" }
        : incomingBooking;
    setBookings((prev) => {
      const exists = prev.some((item) => item._id === normalized._id);
      if (exists) {
        return prev.map((item) => (item._id === normalized._id ? normalized : item));
      }
      return [normalized, ...prev];
    });
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setBookings([]);
      setChatBooking(null);
      setChatMessages([]);
      setEditingChatMessageId("");
      setEditingChatText("");
      setConfirmDeleteChatMessageId("");
      setActiveChatMessageActionId("");
      setLoading(false);
      setError("");
      setShowAuthPrompt(true);
      return;
    }

    setShowAuthPrompt(false);
    load();
  }, [isLoggedIn, statusFilter]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const socket = getSocket();
    if (!socket) return;

    const handleBookingUpdate = (booking) => {
      upsertBooking(booking);
    };

    const handleIncomingMessage = (message) => {
      if (!chatBooking) return;
      const ownerId = String(chatBooking.owner?._id || "");
      const bookingId = String(chatBooking._id || "");
      const messageBookingId = String(message.booking?._id || message.booking || "");
      const senderId = String(message.sender?._id || message.sender);
      const receiverId = String(message.receiver?._id || message.receiver);

      if ([senderId, receiverId].includes(ownerId) && messageBookingId === bookingId) {
        setChatMessages((prev) => appendUniqueMessage(prev, message));
      }
    };

    const handleMessageUpdate = (message) => {
      if (!chatBooking) return;
      const ownerId = String(chatBooking.owner?._id || "");
      const bookingId = String(chatBooking._id || "");
      const senderId = String(message.sender?._id || message.sender);
      const receiverId = String(message.receiver?._id || message.receiver);
      const messageBookingId = String(message.booking?._id || message.booking || "");

      if (![senderId, receiverId].includes(ownerId) || messageBookingId !== bookingId) {
        return;
      }

      setChatMessages((prev) => replaceMessageById(prev, message));
      if (message.isDeleted) {
        setActiveChatMessageActionId((prev) => (prev === String(message._id) ? "" : prev));
        setConfirmDeleteChatMessageId((prev) => (prev === String(message._id) ? "" : prev));
      }
    };

    const handleConversationDeleted = (payload = {}) => {
      if (!chatBooking) return;

      const partnerId = String(payload.partnerId || "");
      const bookingId = String(payload.bookingId || "");
      const activeOwnerId = String(chatBooking.owner?._id || "");
      const activeBookingId = String(chatBooking._id || "");

      if (partnerId !== activeOwnerId) return;
      if (bookingId && bookingId !== activeBookingId) return;

      setChatMessages([]);
      setEditingChatMessageId("");
      setEditingChatText("");
      setConfirmDeleteChatMessageId("");
      setActiveChatMessageActionId("");
    };

    socket.on("booking:updated", handleBookingUpdate);
    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:message:update", handleMessageUpdate);
    socket.on("chat:conversation:deleted", handleConversationDeleted);
    return () => {
      socket.off("booking:updated", handleBookingUpdate);
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:message:update", handleMessageUpdate);
      socket.off("chat:conversation:deleted", handleConversationDeleted);
    };
  }, [isLoggedIn, chatBooking]);

  const filteredBookings = useMemo(
    () =>
      statusFilter === "all"
        ? bookings
        : bookings.filter((booking) => booking.status === statusFilter),
    [bookings, statusFilter]
  );

  const cancelBooking = async (bookingId) => {
    try {
      const response = await API.cancelBooking(bookingId);
      setBookings((prev) =>
        prev.map((booking) => (booking._id === bookingId ? response.booking : booking))
      );
    } catch (err) {
      setError(err.message || "Failed to cancel booking.");
    }
  };

  const submitReview = async (bookingId) => {
    const draft = reviewDrafts[bookingId];
    if (!draft || !draft.rating) return;

    try {
      const response = await API.reviewBooking(bookingId, {
        rating: Number(draft.rating),
        comment: draft.comment || "",
      });
      setBookings((prev) =>
        prev.map((booking) => (booking._id === bookingId ? response.booking : booking))
      );
    } catch (err) {
      setError(err.message || "Failed to submit review.");
    }
  };

  const openExtensionModal = (booking) => {
    if (!booking?._id) return;
    const currentReturn = booking?.returnAt ? new Date(booking.returnAt) : null;
    const fallback = new Date(Date.now() + 60 * 60 * 1000);
    const suggested = currentReturn && !Number.isNaN(currentReturn.getTime())
      ? new Date(currentReturn.getTime() + 60 * 60 * 1000)
      : fallback;

    setExtensionForm({
      newReturnDate: formatDateInput(suggested),
      newReturnTime: formatTimeInput(suggested),
      note: "",
    });
    setExtensionModalBooking(booking);
  };

  const submitExtensionRequest = async () => {
    const booking = extensionModalBooking;
    if (!booking?._id) return;

    const newReturnAt = getDateTime(extensionForm.newReturnDate, extensionForm.newReturnTime);
    const currentReturnAt = booking?.returnAt ? new Date(booking.returnAt) : null;
    if (!newReturnAt || Number.isNaN(newReturnAt.getTime())) {
      setError("Please provide a valid new return date and time.");
      return;
    }
    if (!currentReturnAt || Number.isNaN(currentReturnAt.getTime())) {
      setError("Current return schedule is invalid for this booking.");
      return;
    }
    if (newReturnAt.getTime() <= currentReturnAt.getTime()) {
      setError("New return date/time must be later than the current return schedule.");
      return;
    }

    try {
      setExtensionSubmitting(true);
      setError("");
      const response = await API.requestBookingExtension(booking._id, {
        newReturnAt: newReturnAt.toISOString(),
        note: extensionForm.note || "",
      });
      if (response.booking) {
        upsertBooking(response.booking);
      }
      setPaymentNotice(response.message || "Extension request submitted. Waiting for owner approval.");
      setExtensionModalBooking(null);
    } catch (err) {
      setError(err.message || "Failed to request booking extension.");
    } finally {
      setExtensionSubmitting(false);
    }
  };

  const handleProceedLateReturn = async (booking) => {
    if (!booking?._id) return;
    try {
      setLateReturnSubmittingId(booking._id);
      setError("");
      const response = await API.proceedLateReturn(booking._id);
      if (response.booking) {
        upsertBooking(response.booking);
      }
      setPaymentNotice(response.message || "Late return was processed.");
    } catch (err) {
      setError(err.message || "Failed to process late return.");
    } finally {
      setLateReturnSubmittingId("");
    }
  };

  const openChat = async (booking) => {
    if (!booking?.owner?._id) return;
    setChatBooking(booking);
    setChatError("");
    setChatText("");
    setEditingChatMessageId("");
    setEditingChatText("");
    setConfirmDeleteChatMessageId("");
    setActiveChatMessageActionId("");
    setShowDeleteChatConversationConfirm(false);
    try {
      const response = await API.getMessagesWithUser(booking.owner._id, booking._id);
      setChatMessages(response.messages || []);
      await API.markMessagesAsRead(booking.owner._id, { bookingId: booking._id });
      requestLiveCountersRefresh();
    } catch (err) {
      setChatError(err.message || "Failed to load chat.");
    }
  };

  const sendChatMessage = async () => {
    if (!chatBooking?.owner?._id || !chatText.trim()) return;
    try {
      const response = await API.sendMessageToUser(chatBooking.owner._id, {
        text: chatText.trim(),
        bookingId: chatBooking._id,
      });
      setChatMessages((prev) => appendUniqueMessage(prev, response.message));
      setChatText("");
    } catch (err) {
      setChatError(err.message || "Failed to send message.");
    }
  };

  const startEditChatMessage = (message) => {
    if (!message?._id || message.isDeleted) return;
    setEditingChatMessageId(message._id);
    setEditingChatText(String(message.text || ""));
    setActiveChatMessageActionId("");
  };

  const cancelEditChatMessage = () => {
    setEditingChatMessageId("");
    setEditingChatText("");
  };

  const saveEditedChatMessage = async () => {
    if (!editingChatMessageId) return;
    const nextText = editingChatText.trim();
    if (!nextText) {
      setChatError("Message text is required.");
      return;
    }

    try {
      setSavingChatEdit(true);
      setChatError("");
      const response = await API.editChatMessage(editingChatMessageId, { text: nextText });
      setChatMessages((prev) => replaceMessageById(prev, response.message));
      cancelEditChatMessage();
    } catch (err) {
      setChatError(err.message || "Failed to edit message.");
    } finally {
      setSavingChatEdit(false);
    }
  };

  const openDeleteChatMessageConfirm = (message) => {
    if (!message?._id || deletingChatMessageId) return;
    setConfirmDeleteChatMessageId(String(message._id));
    setActiveChatMessageActionId("");
  };

  const deleteOwnChatMessage = async () => {
    const messageId = String(confirmDeleteChatMessageId || "");
    if (!messageId || deletingChatMessageId) return;

    try {
      setDeletingChatMessageId(messageId);
      setChatError("");
      const response = await API.deleteChatMessage(messageId);
      setChatMessages((prev) => replaceMessageById(prev, response.message));
      if (editingChatMessageId === messageId) {
        cancelEditChatMessage();
      }
      setActiveChatMessageActionId((prev) => (prev === messageId ? "" : prev));
      setConfirmDeleteChatMessageId("");
    } catch (err) {
      setChatError(err.message || "Failed to delete message.");
    } finally {
      setDeletingChatMessageId("");
    }
  };

  const confirmDeleteChatConversation = async () => {
    if (!chatBooking?.owner?._id || deletingChatConversation) return;

    try {
      setDeletingChatConversation(true);
      setChatError("");
      await API.deleteConversation(chatBooking.owner._id, { bookingId: chatBooking._id });
      setChatMessages([]);
      cancelEditChatMessage();
      setShowDeleteChatConversationConfirm(false);
      requestLiveCountersRefresh();
    } catch (err) {
      setChatError(err.message || "Failed to delete conversation.");
    } finally {
      setDeletingChatConversation(false);
    }
  };

  const closeChatModal = () => {
    setChatBooking(null);
    setChatMessages([]);
    setChatText("");
    setChatError("");
    setEditingChatMessageId("");
    setEditingChatText("");
    setConfirmDeleteChatMessageId("");
    setActiveChatMessageActionId("");
    setShowDeleteChatConversationConfirm(false);
  };

  const startPayment = async (bookingId, options = {}) => {
    if (!bookingId) return;
    setPaymentNotice("");
    setPaymentErrors((prev) => ({ ...prev, [bookingId]: "" }));
    setPayingBookingId(bookingId);
    try {
      const response = await API.payBooking(bookingId, options);
      if (response.booking) {
        upsertBooking(response.booking);
      }

      const checkoutUrl = String(response.checkoutUrl || "").trim();
      if (!checkoutUrl) {
        throw new Error("Payment URL was not returned by the server.");
      }
      window.location.assign(checkoutUrl);
    } catch (err) {
      setPaymentErrors((prev) => ({
        ...prev,
        [bookingId]: err.message || "Failed to start payment.",
      }));
    } finally {
      setPayingBookingId("");
    }
  };

  const setWalkInPayment = async (bookingId) => {
    if (!bookingId) return;
    setPaymentNotice("");
    setPaymentErrors((prev) => ({ ...prev, [bookingId]: "" }));
    setPayingBookingId(bookingId);
    try {
      const response = await API.requestWalkInPayment(bookingId, { method: "walkin" });
      if (response.booking) {
        upsertBooking(response.booking);
      }
      setPaymentNotice(response.message || "Walk-in payment request submitted. Waiting for owner approval.");
    } catch (err) {
      setPaymentErrors((prev) => ({
        ...prev,
        [bookingId]: err.message || "Failed to request walk-in payment.",
      }));
    } finally {
      setPayingBookingId("");
    }
  };

  const handlePayNow = (booking) => {
    if (!booking?._id) return;
    const canPayForStatus = ["confirmed", "extended", "completed"].includes(
      String(booking.status || "").toLowerCase()
    );
    if (!canPayForStatus) {
      setApprovalModalBooking(booking);
      return;
    }
    const isPartial = String(booking.paymentStatus || "").toLowerCase() === "partial";
    const walkInStatus = getWalkInStatus(booking);
    const hasActiveWalkIn = ["requested", "approved"].includes(walkInStatus);
    setPaymentPreferences({
      scope: isPartial ? "full" : "downpayment",
      channel: isPartial && !hasActiveWalkIn ? "walkin" : "ewallet",
    });
    setPaymentConfirmBooking(booking);
  };

  const confirmAndStartPayment = async () => {
    const bookingId = paymentConfirmBooking?._id;
    if (!bookingId) return;
    const isPartial = String(paymentConfirmBooking?.paymentStatus || "").toLowerCase() === "partial";
    const walkInStatus = getWalkInStatus(paymentConfirmBooking);
    if (isPartial && paymentPreferences.channel === "walkin") {
      setPaymentConfirmBooking(null);
      if (walkInStatus === "requested") {
        setPaymentNotice("Walk-in request is already pending owner approval.");
        return;
      }
      if (walkInStatus === "approved") {
        setPaymentNotice("Walk-in request already approved. Please settle with owner for confirmation.");
        return;
      }
      if (walkInStatus === "completed") {
        setPaymentNotice("Walk-in payment is already confirmed for this booking.");
        return;
      }
      await setWalkInPayment(bookingId);
      return;
    }
    const scope = isPartial ? "full" : paymentPreferences.scope;
    const channel = paymentPreferences.channel;
    setPaymentConfirmBooking(null);
    startPayment(bookingId, {
      paymentScope: scope,
      paymentChannel: channel,
    });
  };

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const params = new URLSearchParams(window.location.search);
    const bookingId = String(params.get("bookingId") || "").trim();
    const paymentResult = String(params.get("payment") || "").trim().toLowerCase();
    const checkoutId =
      String(params.get("checkoutId") || "").trim() ||
      String(params.get("checkout_session_id") || "").trim();

    if (!bookingId || !paymentResult) return undefined;

    const clearQuery = () => {
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", cleanUrl);
    };

    if (paymentResult === "cancelled") {
      setPaymentNotice("Payment was cancelled.");
      clearQuery();
      return undefined;
    }

    if (paymentResult !== "success") {
      clearQuery();
      return undefined;
    }

    let isActive = true;
    const wait = (ms) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });

    const verifyPayment = async () => {
      setVerifyingBookingId(bookingId);
      setPaymentErrors((prev) => ({ ...prev, [bookingId]: "" }));
      try {
        const maxAttempts = 4;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          const response = await API.verifyBookingPayment(bookingId, checkoutId);
          if (!isActive) return;

          if (response.booking) {
            upsertBooking(response.booking);
          }

          const paymentStatus = String(
            response.paymentStatus || response.booking?.paymentStatus || ""
          ).toLowerCase();
          const paymentCaptured =
            Boolean(response.paymentCaptured) || paymentStatus === "paid" || paymentStatus === "partial";

          if (paymentCaptured) {
            requestLiveCountersRefresh();
            const paidBooking = response.booking || null;
            const blockchainWarning = response?.blockchain?.warning || "";
            if (paymentStatus === "partial") {
              const remaining = paidBooking
                ? moneyWithCents(getPaymentRemainingAmount(paidBooking))
                : moneyWithCents(0);
              setPaymentNotice(`Downpayment successful. Remaining balance: ${remaining}.`);
            } else if (paidBooking?.blockchainTxHash) {
              setPaymentNotice("Payment successful. Booking has been recorded on blockchain.");
            } else if (blockchainWarning) {
              setPaymentNotice(`Payment successful. Blockchain recording is pending: ${blockchainWarning}`);
            } else {
              setPaymentNotice("Payment successful. Blockchain recording is being processed automatically.");
            }
            return;
          }

          if (attempt < maxAttempts) {
            await wait(1500);
          }
        }

        setPaymentNotice("Payment is still processing. Please check again in a moment.");
      } catch (err) {
        if (!isActive) return;
        setPaymentErrors((prev) => ({
          ...prev,
          [bookingId]: err.message || "Failed to verify payment.",
        }));
      } finally {
        if (isActive) {
          setVerifyingBookingId("");
          clearQuery();
        }
      }
    };

    verifyPayment();
    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);

  const confirmIsPartial =
    String(paymentConfirmBooking?.paymentStatus || "").trim().toLowerCase() === "partial";
  const confirmWalkInStatus = getWalkInStatus(paymentConfirmBooking);
  const confirmCanRequestWalkIn =
    confirmIsPartial && (confirmWalkInStatus === "none" || confirmWalkInStatus === "rejected");
  const confirmIsWalkIn = confirmIsPartial && paymentPreferences.channel === "walkin";
  const confirmTotalPayable = paymentConfirmBooking ? getAmountPayable(paymentConfirmBooking) : 0;
  const confirmPaidAmount = paymentConfirmBooking ? getPaymentPaidAmount(paymentConfirmBooking) : 0;
  const confirmRemainingAmount = paymentConfirmBooking
    ? getPaymentRemainingAmount(paymentConfirmBooking)
    : 0;
  const confirmScope = confirmIsPartial ? "full" : paymentPreferences.scope;
  const confirmChargeAmount = paymentConfirmBooking
    ? confirmIsWalkIn
      ? confirmCanRequestWalkIn
        ? 0
        : confirmRemainingAmount
      : confirmScope === "downpayment"
        ? roundCurrency(confirmTotalPayable * DOWNPAYMENT_RATE)
        : confirmRemainingAmount
    : 0;
  const confirmRemainingAfterPayment = paymentConfirmBooking
    ? confirmIsWalkIn
      ? confirmCanRequestWalkIn
        ? confirmRemainingAmount
        : 0
      : roundCurrency(Math.max(confirmRemainingAmount - confirmChargeAmount, 0))
    : 0;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar
          activePage="bookings"
          isLoggedIn={isLoggedIn}
          user={user}
          onNavigateToHome={onNavigateToHome}
          onNavigateToSignIn={onNavigateToSignIn}
          onNavigateToRegister={onNavigateToRegister}
          onNavigateToVehicles={onNavigateToVehicles}
          onNavigateToBookingHistory={onNavigateToBookingHistory}
          onNavigateToAbout={onNavigateToAbout}
          onNavigateToContacts={onNavigateToContacts}
          onNavigateToChat={onNavigateToChat}
          onNavigateToNotifications={onNavigateToNotifications}
          onOpenNotificationsModal={onOpenNotificationsModal}
          onNavigateToAccountSettings={onNavigateToAccountSettings}
          isAIOpen={showAI}
          onShowAI={() => setShowAI(true)}
          onLogout={onLogout}
        />

        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
          <div className="bg-white border rounded-2xl p-8 text-center">
            <h1 className="text-3xl font-bold">Bookings</h1>
            <p className="text-sm text-gray-600 mt-2">
              You are on the bookings page. Sign in or register to view your booking history.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              {!showAuthPrompt && (
                <button
                  onClick={() => setShowAuthPrompt(true)}
                  className="px-5 py-2 rounded-lg bg-[#017FE6] text-white text-sm"
                >
                  Show access message
                </button>
              )}
              <button
                onClick={onNavigateToVehicles}
                className="px-5 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50"
              >
                Continue browsing vehicles
              </button>
            </div>
          </div>
        </div>

        <BookingAccessModal
          isOpen={showAuthPrompt}
          onClose={() => setShowAuthPrompt(false)}
          onSignIn={onNavigateToSignIn}
          onRegister={onNavigateToRegister}
          onBrowseVehicles={onNavigateToVehicles}
        />
        <ChatWidget
          isOpen={showAI}
          onClose={() => setShowAI(false)}
          onViewAvailableVehicles={onNavigateToVehicles}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        activePage="bookings"
        isLoggedIn={isLoggedIn}
        user={user}
        onNavigateToHome={onNavigateToHome}
        onNavigateToSignIn={onNavigateToSignIn}
        onNavigateToRegister={onNavigateToRegister}
        onNavigateToVehicles={onNavigateToVehicles}
        onNavigateToBookingHistory={onNavigateToBookingHistory}
        onNavigateToAbout={onNavigateToAbout}
        onNavigateToContacts={onNavigateToContacts}
        onNavigateToChat={onNavigateToChat}
        onNavigateToNotifications={onNavigateToNotifications}
        onOpenNotificationsModal={onOpenNotificationsModal}
        onNavigateToAccountSettings={onNavigateToAccountSettings}
        isAIOpen={showAI}
        onShowAI={() => setShowAI(true)}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 space-y-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="text-sm text-gray-600">Real-time booking updates and notifications.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="extended">Extended</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Payment reminder: Complete payment within the booked rental duration, or request walk-in settlement upon
          returning the vehicle.
        </div>

        {loading && <p className="text-sm text-gray-600">Loading bookings...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {paymentNotice && <p className="text-sm text-emerald-700">{paymentNotice}</p>}

        {!loading && !error && filteredBookings.length === 0 && (
          <div className="bg-white border rounded-xl p-6 text-sm text-gray-600">
            No bookings found.
          </div>
        )}

        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const lateReturnInfo = getLateReturnInfo(booking);
            const extensionInfo = getExtensionRequestInfo(booking);
            const ownerDisplayName = getOwnerDisplayName(booking);
            const isPaymentEligibleStatus = ["confirmed", "extended", "completed"].includes(
              String(booking.status || "").toLowerCase()
            );
            const canResolveOverdue =
              lateReturnInfo.isOverdue && ["confirmed", "extended"].includes(String(booking.status || "").toLowerCase());

            return (
            <article key={booking._id} className="bg-white border rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{booking.vehicle?.name || "Vehicle"}</h2>
                  <p className="text-sm text-gray-500">{booking.vehicle?.location || "-"}</p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${
                      statusStyles[booking.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {toTitleCase(booking.status)}
                  </span>
                  <span
                    className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${
                      paymentStyles[booking.paymentStatus] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {toTitleCase(booking.paymentStatus)}
                  </span>
                  {extensionInfo.status !== "none" && (
                    <span
                      className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${
                        extensionInfo.status === "approved"
                          ? "bg-violet-100 text-violet-800 border border-violet-200"
                          : extensionInfo.status === "rejected"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      Extension {toTitleCase(extensionInfo.status)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4 text-sm">
                <Info title="Pickup" value={formatDate(booking.pickupAt)} />
                <Info title="Return" value={formatDate(booking.returnAt)} />
                <Info title="Duration" value={formatDurationMinutes(getBookingDurationMinutesForPricing(booking))} />
                <Info
                  title="Vehicle Rate"
                  value={`${money(booking.vehicleHourlyRate ?? booking.vehicleDailyRate)} / hr`}
                />
                <Info
                  title="Driver"
                  value={
                    booking.driverSelected
                      ? `${money(booking.driverHourlyRate ?? booking.driverDailyRate)} / hr`
                      : "No"
                  }
                />
                <Info title="Rental Total" value={money(getRentalTotal(booking))} />
                <Info
                  title="Late Penalty"
                  value={lateReturnInfo.penaltyFee > 0 ? moneyWithCents(lateReturnInfo.penaltyFee) : moneyWithCents(0)}
                />
                <Info title="Transaction Fee" value={moneyWithCents(getTransactionFee())} />
                <Info title="Amount Payable" value={moneyWithCents(getAmountPayable(booking))} />
              </div>

              {lateReturnInfo.isOverdue && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  Late return detected: overdue by {formatDurationMinutes(lateReturnInfo.overdueMinutes)}.
                  {lateReturnInfo.penaltyFee > 0
                    ? ` Current late charge: ${moneyWithCents(lateReturnInfo.penaltyFee)}.`
                    : " Additional charges may apply."}
                </div>
              )}

              {extensionInfo.status === "requested" && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Extension request pending owner approval.
                  {extensionInfo.requestedReturnAt ? ` Requested return: ${formatDate(extensionInfo.requestedReturnAt)}.` : ""}
                </div>
              )}
              {extensionInfo.status === "rejected" && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  Your extension request was rejected. Original return schedule still applies.
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="flex min-w-0 max-w-full items-center gap-2">
                  <span className="min-w-0 truncate text-sm text-slate-600">
                    Owner: <span className="font-medium text-slate-900">{ownerDisplayName}</span>
                  </span>
                  <button
                    onClick={() => openChat(booking)}
                    className="shrink-0 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm"
                  >
                    Chat Owner
                  </button>
                </div>

                {["unpaid", "partial"].includes(String(booking.paymentStatus || "").toLowerCase()) &&
                  !["cancelled", "rejected"].includes(booking.status) && (
                    <button
                      onClick={() => handlePayNow(booking)}
                      disabled={payingBookingId === booking._id || verifyingBookingId === booking._id}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        payingBookingId === booking._id || verifyingBookingId === booking._id
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : isPaymentEligibleStatus
                            ? "bg-[#017FE6] text-white"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {payingBookingId === booking._id || verifyingBookingId === booking._id
                        ? "Processing..."
                        : String(booking.paymentStatus || "").toLowerCase() === "partial"
                          ? "Pay Remaining"
                          : "Pay Now"}
                    </button>
                  )}

                {["unpaid", "partial"].includes(String(booking.paymentStatus || "").toLowerCase()) &&
                  !isPaymentEligibleStatus &&
                  !["cancelled", "rejected"].includes(booking.status) && (
                    <p className="w-full text-xs text-amber-700">
                      Payment is locked until the booking is approved or extended.
                    </p>
                  )}

                {["pending", "confirmed", "extended"].includes(booking.status) && (
                  <button
                    onClick={() => cancelBooking(booking._id)}
                    className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm"
                  >
                    Cancel Booking
                  </button>
                )}

                {canResolveOverdue && (
                  <>
                    <button
                      onClick={() => openExtensionModal(booking)}
                      disabled={extensionInfo.status === "requested" || lateReturnSubmittingId === booking._id}
                      className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Extend Rental Time
                    </button>
                    <button
                      onClick={() => handleProceedLateReturn(booking)}
                      disabled={lateReturnSubmittingId === booking._id || extensionInfo.status === "requested"}
                      className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {lateReturnSubmittingId === booking._id ? "Processing..." : "Proceed with Late Return"}
                    </button>
                  </>
                )}

                {booking.status === "completed" && !booking.reviewRating && (
                  <>
                    <select
                      className="border rounded-lg px-2 py-2 text-sm"
                      value={reviewDrafts[booking._id]?.rating || ""}
                      onChange={(e) =>
                        setReviewDrafts((prev) => ({
                          ...prev,
                          [booking._id]: {
                            ...prev[booking._id],
                            rating: e.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Rating</option>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating}
                        </option>
                      ))}
                    </select>
                    <input
                      className="border rounded-lg px-3 py-2 text-sm min-w-[220px]"
                      placeholder="Leave a review"
                      value={reviewDrafts[booking._id]?.comment || ""}
                      onChange={(e) =>
                        setReviewDrafts((prev) => ({
                          ...prev,
                          [booking._id]: {
                            ...prev[booking._id],
                            comment: e.target.value,
                          },
                        }))
                      }
                    />
                    <button
                      onClick={() => submitReview(booking._id)}
                      className="px-3 py-2 rounded-lg bg-[#017FE6] text-white text-sm"
                    >
                      Submit Review
                    </button>
                  </>
                )}

                {booking.reviewRating && (
                  <span className="text-sm text-green-700">
                    Review submitted: {booking.reviewRating}/5
                  </span>
                )}

                {getWalkInStatus(booking) !== "none" && (
                  <p
                    className={`w-full text-xs ${
                      getWalkInStatus(booking) === "approved"
                        ? "text-emerald-700"
                        : getWalkInStatus(booking) === "rejected"
                          ? "text-rose-700"
                          : "text-amber-700"
                    }`}
                  >
                    {getWalkInStatusMessage(booking)}
                  </p>
                )}

                {paymentErrors[booking._id] && (
                  <p className="w-full text-xs text-red-600">{paymentErrors[booking._id]}</p>
                )}
              </div>
            </article>
            );
          })}
        </div>
      </div>

      {chatBooking && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[2px]"
            onClick={closeChatModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="flex w-full max-w-2xl max-h-[86vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.25)] flex-col">
              <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <OwnerAvatar owner={chatBooking.owner} />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-base font-semibold text-slate-950">
                          {getOwnerDisplayName(chatBooking)}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          Owner
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {chatBooking.vehicle?.name || "Booking conversation"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteChatConversationConfirm(true)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                      aria-label="Delete conversation"
                      title="Delete conversation"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={closeChatModal}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                      aria-label="Close chat"
                      title="Close chat"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-5"
                onClick={() => setActiveChatMessageActionId("")}
              >
                {chatError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {chatError}
                  </div>
                )}
                {!chatMessages.length && (
                  <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#017FE6]">
                      <MessageCircle size={22} />
                    </div>
                    <p className="text-sm font-medium text-slate-800">No messages yet</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">
                      Start the conversation about this booking with the vehicle owner.
                    </p>
                  </div>
                )}
                {chatMessages.map((message) => {
                  const isMe = String(message.sender?._id || message.sender) === String(currentUserId);
                  const isEditing = isMe && editingChatMessageId === message._id;
                  const showActions =
                    isMe &&
                    !isEditing &&
                    !message.isDeleted &&
                    activeChatMessageActionId === String(message._id);
                  return (
                    <div key={message._id} className={`group flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`relative max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[74%] ${
                          isMe
                            ? "rounded-br-md bg-[#017FE6] text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                        }`}
                        onClick={(event) => {
                          if (!isMe || isEditing || message.isDeleted) return;
                          event.stopPropagation();
                          setActiveChatMessageActionId((prev) =>
                            prev === String(message._id) ? "" : String(message._id)
                          );
                        }}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              value={editingChatText}
                              onChange={(event) => setEditingChatText(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  saveEditedChatMessage();
                                }
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className="w-full rounded-lg border border-white/30 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-2 ring-transparent transition focus:ring-white/30"
                            />
                            <div className="flex justify-end gap-2 text-[11px]">
                              <button
                                type="button"
                                onClick={cancelEditChatMessage}
                                className="rounded-lg bg-white/20 px-2.5 py-1"
                                disabled={savingChatEdit}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={saveEditedChatMessage}
                                className="rounded-lg bg-white px-2.5 py-1 text-[#017FE6]"
                                disabled={savingChatEdit}
                              >
                                {savingChatEdit ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className={`whitespace-pre-wrap break-words ${message.isDeleted ? "italic opacity-85" : ""}`}>
                            {message.text}
                          </p>
                        )}
                        <p className={`mt-1.5 text-[10px] ${isMe ? "text-white/80" : "text-slate-400"}`}>
                          {formatDate(message.createdAt)}
                          {message.isEdited && !message.isDeleted ? " - edited" : ""}
                        </p>
                        {isMe && !isEditing && !message.isDeleted && (
                          <span className="mt-1 inline-flex items-center text-white/75" aria-hidden="true">
                            <MoreHorizontal size={13} />
                          </span>
                        )}
                        {showActions && (
                          <div className="mt-2 flex justify-end gap-1.5 text-[11px] text-white">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                startEditChatMessage(message);
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 transition hover:bg-white/30"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDeleteChatMessageConfirm(message);
                              }}
                              disabled={
                                deletingChatMessageId === message._id || Boolean(confirmDeleteChatMessageId)
                              }
                              className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 transition hover:bg-white/30 disabled:opacity-60"
                            >
                              <Trash2 size={12} />
                              {deletingChatMessageId === message._id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-[#0B75E7] focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Type your message"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        sendChatMessage();
                      }
                    }}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatText.trim()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#017FE6] text-white shadow-sm transition hover:bg-[#0165B8] disabled:cursor-not-allowed disabled:bg-slate-300"
                    aria-label="Send message"
                  >
                    <Send size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showDeleteChatConversationConfirm && (
            <>
              <div
                className="fixed inset-0 z-[55] bg-slate-900/45 backdrop-blur-[2px]"
                onClick={() => {
                  if (!deletingChatConversation) setShowDeleteChatConversationConfirm(false);
                }}
              />
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.25)]">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-base font-semibold text-slate-900">Delete Conversation</h3>
                  </div>
                  <div className="px-6 py-5">
                    <p className="text-sm text-slate-700">
                      Are you sure you want to delete this conversation? This action cannot be undone.
                    </p>
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteChatConversationConfirm(false)}
                        disabled={deletingChatConversation}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteChatConversation}
                        disabled={deletingChatConversation}
                        className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                      >
                        {deletingChatConversation ? "Deleting..." : "Delete Conversation"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {confirmDeleteChatMessageId && (
            <>
              <div
                className="fixed inset-0 z-[55] bg-slate-900/45 backdrop-blur-[2px]"
                onClick={() => {
                  if (!deletingChatMessageId) setConfirmDeleteChatMessageId("");
                }}
              />
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.25)]">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-base font-semibold text-slate-900">Delete Message</h3>
                  </div>
                  <div className="px-6 py-5">
                    <p className="text-sm text-slate-700">Are you sure you want to delete this message?</p>
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteChatMessageId("")}
                        disabled={Boolean(deletingChatMessageId)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={deleteOwnChatMessage}
                        disabled={Boolean(deletingChatMessageId)}
                        className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                      >
                        {deletingChatMessageId ? "Deleting..." : "Yes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {approvalModalBooking && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] z-[70]"
            onClick={() => setApprovalModalBooking(null)}
          />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-[0_25px_80px_rgba(15,23,42,0.25)]">
              <div className="px-6 pt-5 pb-4 border-b border-slate-200 bg-gradient-to-r from-[#0B75E7]/10 via-white to-white">
                <h3 className="text-lg font-semibold text-slate-900">Payment Not Available Yet</h3>
                <p className="text-sm text-slate-600 mt-1">
                  You can only pay after the owner approves your booking.
                </p>
              </div>
              <div className="px-6 py-5">
                <p className="text-xs text-slate-500">
                  Current status: {toTitleCase(approvalModalBooking.status || "pending")}
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setApprovalModalBooking(null)}
                    className="rp-btn-primary px-4 py-2 text-sm"
                  >
                    I Understand
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {paymentConfirmBooking && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] z-[70]"
            onClick={() => {
              if (!payingBookingId) setPaymentConfirmBooking(null);
            }}
          />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-[0_25px_80px_rgba(15,23,42,0.25)]">
              <div className="px-6 pt-5 pb-4 border-b border-slate-200 bg-gradient-to-r from-[#0B75E7]/10 via-white to-white">
                <h3 className="text-lg font-semibold text-slate-900">Confirm Payment</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Review your payment before continuing.
                </p>
              </div>

              <div className="px-6 py-5">
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Payment reminder: complete payment within the booked rental duration, or request walk-in settlement
                upon return.
              </div>
              <div className="rounded-xl border p-4 space-y-2 text-sm">
                <Line label="Rental Amount" value={money(getVehicleRateForPayment(paymentConfirmBooking))} />
                <Line label="Transaction Fee" value={moneyWithCents(getTransactionFee())} />
                <Line label="Already Paid" value={moneyWithCents(confirmPaidAmount)} />
                <Line
                  label="Total Amount Payable"
                  value={moneyWithCents(confirmTotalPayable)}
                  strong
                />
                <Line label="Remaining Balance" value={moneyWithCents(confirmRemainingAmount)} />
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Pay Now Option</p>
                {confirmIsPartial ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    A downpayment is already recorded. You may pay the remaining balance online or request walk-in
                    payment approval.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentPreferences.scope === "downpayment"}
                        onChange={() =>
                          setPaymentPreferences((prev) => ({ ...prev, scope: "downpayment" }))
                        }
                      />
                      <span className="text-sm text-gray-700">
                        Downpayment (30%): {moneyWithCents(roundCurrency(confirmTotalPayable * DOWNPAYMENT_RATE))}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentPreferences.scope === "full"}
                        onChange={() => setPaymentPreferences((prev) => ({ ...prev, scope: "full" }))}
                      />
                      <span className="text-sm text-gray-700">
                        Full Payment: {moneyWithCents(confirmRemainingAmount)}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Payment Method</p>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={paymentPreferences.channel === "ewallet"}
                      onChange={() => setPaymentPreferences((prev) => ({ ...prev, channel: "ewallet" }))}
                    />
                    <span className="text-sm text-gray-700">E-wallet (GCash / Maya)</span>
                  </label>
                  <label className="flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={paymentPreferences.channel === "card"}
                      onChange={() => setPaymentPreferences((prev) => ({ ...prev, channel: "card" }))}
                    />
                    <span className="text-sm text-gray-700">Credit / Debit Card</span>
                  </label>
                  {confirmIsPartial && (
                    <label
                      className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                        confirmCanRequestWalkIn ? "cursor-pointer" : "opacity-70 cursor-not-allowed"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={paymentPreferences.channel === "walkin"}
                        disabled={!confirmCanRequestWalkIn}
                        onChange={() => setPaymentPreferences((prev) => ({ ...prev, channel: "walkin" }))}
                      />
                      <span className="text-sm text-gray-700">
                        Request Walk-in Payment (owner must approve before confirmation)
                      </span>
                    </label>
                  )}
                </div>
                {confirmWalkInStatus === "requested" && (
                  <p className="text-xs text-amber-700">
                    Walk-in request is already pending owner approval.
                  </p>
                )}
                {confirmWalkInStatus === "approved" && (
                  <p className="text-xs text-emerald-700">
                    Walk-in request already approved. Settle with owner and wait for owner confirmation.
                  </p>
                )}
                {confirmWalkInStatus === "rejected" && (
                  <p className="text-xs text-rose-700">
                    Your previous walk-in request was rejected. You may submit a new request.
                  </p>
                )}
                {confirmIsWalkIn && confirmCanRequestWalkIn && (
                  <p className="text-xs text-amber-700">
                    This will send a walk-in payment request to the owner. No online charge will happen now.
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm space-y-1">
                <Line label="Amount to Pay Now" value={moneyWithCents(confirmChargeAmount)} strong />
                <Line
                  label="Balance After This Payment"
                  value={moneyWithCents(confirmRemainingAfterPayment)}
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setPaymentConfirmBooking(null)}
                  disabled={Boolean(payingBookingId)}
                  className="rp-btn-secondary px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAndStartPayment}
                  disabled={Boolean(payingBookingId)}
                  className="rp-btn-primary px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {payingBookingId
                    ? "Processing..."
                    : confirmIsWalkIn
                      ? "Request Walk-in Approval"
                      : "Proceed to Pay"}
                </button>
              </div>
              </div>
            </div>
          </div>
        </>
      )}

      {extensionModalBooking && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] z-[70]"
            onClick={() => {
              if (!extensionSubmitting) setExtensionModalBooking(null);
            }}
          />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-[0_25px_80px_rgba(15,23,42,0.25)]">
              <div className="px-6 pt-5 pb-4 border-b border-slate-200 bg-gradient-to-r from-violet-500/10 via-white to-white">
                <h3 className="text-lg font-semibold text-slate-900">Request Rental Extension</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Current return: {formatDate(extensionModalBooking.returnAt)}
                </p>
              </div>
              <div className="px-6 py-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={extensionForm.newReturnDate}
                    min={formatDateInput(extensionModalBooking.returnAt || new Date())}
                    onChange={(event) =>
                      setExtensionForm((prev) => ({ ...prev, newReturnDate: event.target.value }))
                    }
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={extensionForm.newReturnTime}
                    onChange={(event) =>
                      setExtensionForm((prev) => ({ ...prev, newReturnTime: event.target.value }))
                    }
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  value={extensionForm.note}
                  onChange={(event) => setExtensionForm((prev) => ({ ...prev, note: event.target.value }))}
                  rows={3}
                  maxLength={500}
                  placeholder="Optional note to owner"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setExtensionModalBooking(null)}
                    disabled={extensionSubmitting}
                    className="rp-btn-secondary px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitExtensionRequest}
                    disabled={extensionSubmitting}
                    className="rp-btn-primary px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {extensionSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <ChatWidget
        isOpen={showAI}
        onClose={() => setShowAI(false)}
        onViewAvailableVehicles={onNavigateToVehicles}
      />
    </div>
  );
}

function OwnerAvatar({ owner }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = getOwnerDisplayName({ owner });
  const avatar = resolveAssetUrl(owner?.avatar || "");
  const showImage = Boolean(avatar) && !imageFailed;

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#017FE6] text-sm font-semibold text-white ring-4 ring-blue-50">
      {showImage ? (
        <img
          src={avatar}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitialsFromName(name || "Owner")
      )}
    </div>
  );
}

function Info({ title, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-gray-500">{title}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Line({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
