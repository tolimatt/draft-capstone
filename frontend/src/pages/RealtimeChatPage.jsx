import { useEffect, useMemo, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { getSocket } from "../utils/socket";
import { requestLiveCountersRefresh } from "../utils/liveCounters";
import { formatDisplayName, getInitialsFromName } from "../utils/dateUtils";
import { resolveAssetUrl } from "../utils/media";
import { getSessionUser } from "../utils/sessionStore";

const getId = (value) => String(value?._id || value || "");
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
const appendUniqueMessage = (list, message) =>
  list.some((item) => item._id === message._id) ? list : [...list, message];
const replaceMessageById = (list, message) =>
  list.map((item) => (item._id === message._id ? { ...item, ...message } : item));
const toMessagePreview = (message) => ({
  _id: message._id,
  text: message.text,
  sender: message.sender,
  receiver: message.receiver,
  booking: message.booking || null,
  vehicle: message.vehicle || null,
  createdAt: message.createdAt,
  editedAt: message.editedAt || null,
  isEdited: Boolean(message.isEdited || message.editedAt),
  isDeleted: Boolean(message.isDeleted),
});

const normalizePartner = (partner = {}) => {
  const name = formatDisplayName(partner?.name || "", "");
  const email = String(partner?.email || "").trim();
  return {
    _id: String(partner?._id || ""),
    name: name || email || "User",
    email,
    avatar: resolveAssetUrl(partner?.avatar),
  };
};

const normalizeChatContext = (context = {}) => ({
  bookingId: String(context?.bookingId || "").trim(),
  vehicleId: String(context?.vehicleId || "").trim(),
});

const normalizeInitialPartner = (context = {}) => {
  const partnerId = String(context?.partnerId || context?.userId || "").trim();
  if (!partnerId) return null;

  return normalizePartner({
    _id: partnerId,
    name: context?.partnerName,
    email: context?.partnerEmail,
    avatar: context?.partnerAvatar,
  });
};

const messageMatchesContext = (message, context = {}) => {
  const bookingId = String(context?.bookingId || "").trim();
  const vehicleId = String(context?.vehicleId || "").trim();
  if (!bookingId && !vehicleId) return true;

  const messageBookingId = getId(message?.booking);
  const messageVehicleId = getId(message?.vehicle);

  if (bookingId) return messageBookingId === bookingId;
  if (vehicleId) return messageVehicleId === vehicleId && !messageBookingId;
  return true;
};

export default function RealtimeChatPage({
  isLoggedIn,
  user,
  initialChatContext,
  onChatContextHandled,
  onNavigateToHome,
  onNavigateToSignIn,
  onNavigateToRegister,
  onNavigateToVehicles,
  onNavigateToBookingHistory,
  onNavigateToAbout,
  onNavigateToContacts,
  onNavigateToChat,
  onNavigateToNotifications,
  onNavigateToAccountSettings,
  onLogout,
}) {
  const currentUserId = user?._id || getSessionUser()?._id || "";

  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState("");
  const [activeChatContext, setActiveChatContext] = useState({ bookingId: "", vehicleId: "" });
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState("");
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState("");
  const [activeMessageActionId, setActiveMessageActionId] = useState("");
  const [showDeleteConversationConfirm, setShowDeleteConversationConfirm] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => getId(conversation.partner) === activePartnerId),
    [conversations, activePartnerId]
  );

  const mergeInitialPartnerConversation = (list = []) => {
    const initialPartner = normalizeInitialPartner(initialChatContext);
    if (!initialPartner?._id) return list;
    if (list.some((conversation) => getId(conversation.partner) === initialPartner._id)) return list;
    return [
      {
        partner: initialPartner,
        lastMessage: null,
        unreadCount: 0,
      },
      ...list,
    ];
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    setError("");
    try {
      const response = await API.getConversations();
      const nextConversations = mergeInitialPartnerConversation(
        (response.conversations || []).map((conversation) => ({
          ...conversation,
          partner: normalizePartner(conversation.partner),
        }))
      );
      setConversations(nextConversations);
      setActivePartnerId((prevId) =>
        nextConversations.some((conversation) => getId(conversation.partner) === prevId)
          ? prevId
          : getId(nextConversations[0]?.partner)
      );
      requestLiveCountersRefresh();
    } catch (err) {
      setError(err.message || "Failed to load conversations.");
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (partnerId, context = {}) => {
    if (!partnerId) return;

    setLoadingMessages(true);
    setError("");
    try {
      const normalizedContext = normalizeChatContext(context);
      const response = await API.getMessagesWithUser(partnerId, normalizedContext);
      setMessages(response.messages || []);
      await API.markMessagesAsRead(partnerId, normalizedContext);
      setConversations((prev) =>
        prev.map((conversation) =>
          getId(conversation.partner) === partnerId ? { ...conversation, unreadCount: 0 } : conversation
        )
      );
      requestLiveCountersRefresh();
    } catch (err) {
      setError(err.message || "Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const initialPartner = normalizeInitialPartner(initialChatContext);
    if (!initialPartner?._id) return;

    setConversations((prev) => mergeInitialPartnerConversation(prev));
    setActivePartnerId(initialPartner._id);
    setActiveChatContext(normalizeChatContext(initialChatContext));
    onChatContextHandled?.();
  }, [initialChatContext, onChatContextHandled]);

  useEffect(() => {
    loadMessages(activePartnerId, activeChatContext);
  }, [activePartnerId, activeChatContext.bookingId, activeChatContext.vehicleId]);

  useEffect(() => {
    setEditingMessageId("");
    setEditingText("");
    setConfirmDeleteMessageId("");
    setActiveMessageActionId("");
  }, [activePartnerId, activeChatContext.bookingId, activeChatContext.vehicleId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleIncomingMessage = (message) => {
      const senderId = getId(message.sender);
      const isOutgoing = senderId === String(currentUserId);
      const partner = isOutgoing ? message.receiver : message.sender;
      const partnerId = getId(partner);

      if (!partnerId) return;

      setConversations((prev) => {
        const existingConversation = prev.find(
          (conversation) => getId(conversation.partner) === partnerId
        );

        const nextConversation = {
          partner: normalizePartner({
            _id: getId(partner),
            name: partner?.name,
            email: partner?.email,
            avatar: partner?.avatar,
          }),
          lastMessage: toMessagePreview(message),
          unreadCount:
            !isOutgoing && activePartnerId !== partnerId
              ? (existingConversation?.unreadCount || 0) + 1
              : 0,
        };

        const rest = prev.filter((conversation) => getId(conversation.partner) !== partnerId);
        return [nextConversation, ...rest];
      });

      if (activePartnerId !== partnerId || !messageMatchesContext(message, activeChatContext)) {
        return;
      }

      setMessages((prev) => appendUniqueMessage(prev, message));

      if (!isOutgoing) {
        API.markMessagesAsRead(partnerId, activeChatContext)
          .then(() => requestLiveCountersRefresh())
          .catch(() => {});
      }
    };

    const handleMessageUpdate = (message) => {
      const senderId = getId(message.sender);
      const isOutgoing = senderId === String(currentUserId);
      const partner = isOutgoing ? message.receiver : message.sender;
      const partnerId = getId(partner);
      if (!partnerId) return;

      setConversations((prev) =>
        prev.map((conversation) => {
          if (getId(conversation.partner) !== partnerId) return conversation;
          if (getId(conversation.lastMessage) !== String(message._id)) return conversation;
          return {
            ...conversation,
            lastMessage: toMessagePreview(message),
          };
        })
      );

      if (activePartnerId !== partnerId || !messageMatchesContext(message, activeChatContext)) {
        return;
      }

      setMessages((prev) => replaceMessageById(prev, message));
      if (message.isDeleted) {
        setActiveMessageActionId((prev) => (prev === String(message._id) ? "" : prev));
        setConfirmDeleteMessageId((prev) => (prev === String(message._id) ? "" : prev));
      }
    };

    const handleConversationDeleted = (payload = {}) => {
      const partnerId = String(payload.partnerId || "");
      if (!partnerId) return;

      loadConversations();

      if (activePartnerId !== partnerId) return;

      setMessages([]);
      setEditingMessageId("");
      setEditingText("");
      setConfirmDeleteMessageId("");
      setActiveMessageActionId("");
      loadMessages(partnerId, activeChatContext);
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:message:update", handleMessageUpdate);
    socket.on("chat:conversation:deleted", handleConversationDeleted);
    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:message:update", handleMessageUpdate);
      socket.off("chat:conversation:deleted", handleConversationDeleted);
    };
  }, [activePartnerId, activeChatContext, currentUserId]);

  const sendMessage = async () => {
    const text = messageText.trim();
    if (!activePartnerId || !text) return;

    try {
      const contextPayload = normalizeChatContext(activeChatContext);
      const response = await API.sendMessageToUser(activePartnerId, {
        text,
        ...contextPayload,
      });
      if (messageMatchesContext(response.message, contextPayload)) {
        setMessages((prev) => appendUniqueMessage(prev, response.message));
      }
      setMessageText("");
      loadConversations();
    } catch (err) {
      setError(err.message || "Failed to send message.");
    }
  };

  const startEditMessage = (message) => {
    if (!message?._id || message.isDeleted) return;
    setEditingMessageId(message._id);
    setEditingText(String(message.text || ""));
    setActiveMessageActionId("");
  };

  const cancelEditMessage = () => {
    setEditingMessageId("");
    setEditingText("");
  };

  const saveEditedMessage = async () => {
    if (!editingMessageId) return;

    const nextText = editingText.trim();
    if (!nextText) {
      setError("Message text is required.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");
      const response = await API.editChatMessage(editingMessageId, { text: nextText });
      const updated = response.message;
      setMessages((prev) => replaceMessageById(prev, updated));
      setConversations((prev) =>
        prev.map((conversation) =>
          getId(conversation.lastMessage) === String(updated._id)
            ? { ...conversation, lastMessage: toMessagePreview(updated) }
            : conversation
        )
      );
      cancelEditMessage();
    } catch (err) {
      setError(err.message || "Failed to edit message.");
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteMessageConfirm = (message) => {
    if (!message?._id || deletingMessageId) return;
    setConfirmDeleteMessageId(String(message._id));
    setActiveMessageActionId("");
  };

  const deleteOwnMessage = async () => {
    const messageId = String(confirmDeleteMessageId || "");
    if (!messageId || deletingMessageId) return;

    try {
      setDeletingMessageId(messageId);
      setError("");
      const response = await API.deleteChatMessage(messageId);
      const updated = response.message;
      setMessages((prev) => replaceMessageById(prev, updated));
      setConversations((prev) =>
        prev.map((conversation) =>
          getId(conversation.lastMessage) === String(updated._id)
            ? { ...conversation, lastMessage: toMessagePreview(updated) }
            : conversation
        )
      );
      if (editingMessageId === messageId) {
        cancelEditMessage();
      }
      setActiveMessageActionId((prev) => (prev === messageId ? "" : prev));
      setConfirmDeleteMessageId("");
    } catch (err) {
      setError(err.message || "Failed to delete message.");
    } finally {
      setDeletingMessageId("");
    }
  };

  const confirmDeleteConversation = async () => {
    if (!activePartnerId || deletingConversation) return;

    try {
      setDeletingConversation(true);
      setError("");
      await API.deleteConversation(activePartnerId, activeChatContext);
      setMessages([]);
      cancelEditMessage();
      setShowDeleteConversationConfirm(false);
      await loadConversations();
      requestLiveCountersRefresh();
    } catch (err) {
      setError(err.message || "Failed to delete conversation.");
    } finally {
      setDeletingConversation(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        activePage=""
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
        onNavigateToAccountSettings={onNavigateToAccountSettings}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-5">
          <h1 className="text-3xl font-bold">Real-Time Chat</h1>
          <p className="text-sm text-gray-600">Talk with owners about your bookings in real time.</p>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="bg-white border rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[64vh]">
          <aside className="border-r bg-gray-50">
            <div className="px-4 py-3 border-b font-semibold">Conversations</div>
            {loadingConversations && (
              <p className="px-4 py-3 text-sm text-gray-500">Loading conversations...</p>
            )}
            {!loadingConversations && !conversations.length && (
              <p className="px-4 py-3 text-sm text-gray-500">No conversations yet.</p>
            )}
            <div className="max-h-[64vh] overflow-y-auto">
              {conversations.map((conversation) => {
                const partnerId = getId(conversation.partner);
                return (
                  <button
                    key={partnerId}
                    onClick={() => {
                      setActivePartnerId(partnerId);
                      setActiveChatContext({ bookingId: "", vehicleId: "" });
                    }}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-gray-100 ${
                      activePartnerId === partnerId ? "bg-gray-100" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarCircle
                          name={conversation.partner?.name || "User"}
                          avatar={conversation.partner?.avatar}
                          sizeClass="w-8 h-8"
                        />
                        <p className="font-medium text-sm truncate">
                          {conversation.partner?.name || "User"}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {conversation.lastMessage?.text || "No messages"}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {formatDateTime(conversation.lastMessage?.createdAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex flex-col">
            <div className="px-5 py-4 border-b">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                <h2 className="font-semibold">
                  {activeConversation?.partner?.name || "Select a conversation"}
                </h2>
                {activeConversation?.partner?.email && (
                  <p className="text-xs text-gray-500">{activeConversation.partner.email}</p>
                )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConversationConfirm(true)}
                  disabled={!activePartnerId}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50"
              onClick={() => setActiveMessageActionId("")}
            >
              {loadingMessages && <p className="text-sm text-gray-500">Loading messages...</p>}
              {!loadingMessages && !messages.length && (
                <p className="text-sm text-gray-500">
                  {activePartnerId ? "No messages yet." : "Choose a conversation to start chatting."}
                </p>
              )}

              {messages.map((message) => {
                const isMine = getId(message.sender) === String(currentUserId);
                const isEditing = isMine && editingMessageId === message._id;
                const showActions =
                  isMine &&
                  !isEditing &&
                  !message.isDeleted &&
                  activeMessageActionId === String(message._id);
                return (
                  <div key={message._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                        isMine ? "bg-[#017FE6] text-white" : "bg-white border"
                      }`}
                      onClick={(event) => {
                        if (!isMine || isEditing || message.isDeleted) return;
                        event.stopPropagation();
                        setActiveMessageActionId((prev) =>
                          prev === String(message._id) ? "" : String(message._id)
                        );
                      }}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editingText}
                            onChange={(event) => setEditingText(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveEditedMessage();
                              }
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full rounded border border-white/30 bg-white px-2 py-1 text-sm text-slate-900"
                          />
                          <div className="flex justify-end gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={cancelEditMessage}
                              className="rounded bg-white/20 px-2 py-0.5"
                              disabled={savingEdit}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveEditedMessage}
                              className="rounded bg-white px-2 py-0.5 text-[#017FE6]"
                              disabled={savingEdit}
                            >
                              {savingEdit ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className={message.isDeleted ? "italic opacity-85" : ""}>{message.text}</p>
                      )}
                      <p className={`text-[10px] mt-1 ${isMine ? "text-white/80" : "text-gray-500"}`}>
                        {formatDateTime(message.createdAt)}
                        {message.isEdited && !message.isDeleted ? " - edited" : ""}
                      </p>
                      {showActions && (
                        <div className="mt-1 flex justify-end gap-2 text-[10px] text-white/80">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              startEditMessage(message);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDeleteMessageConfirm(message);
                            }}
                            disabled={deletingMessageId === message._id || Boolean(confirmDeleteMessageId)}
                          >
                            {deletingMessageId === message._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t p-3 flex gap-2">
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                placeholder="Type your message"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                disabled={!activePartnerId}
              />
              <button
                onClick={sendMessage}
                disabled={!activePartnerId}
                className="px-4 rounded-lg bg-[#017FE6] text-white disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </section>
        </div>
      </div>

      {showDeleteConversationConfirm && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[2px]"
            onClick={() => {
              if (!deletingConversation) setShowDeleteConversationConfirm(false);
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                    onClick={() => setShowDeleteConversationConfirm(false)}
                    disabled={deletingConversation}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteConversation}
                    disabled={deletingConversation}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {deletingConversation ? "Deleting..." : "Delete Conversation"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDeleteMessageId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[2px]"
            onClick={() => {
              if (!deletingMessageId) setConfirmDeleteMessageId("");
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.25)]">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-900">Delete Message</h3>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-slate-700">Are you sure you want to delete this message?</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteMessageId("")}
                    disabled={Boolean(deletingMessageId)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={deleteOwnMessage}
                    disabled={Boolean(deletingMessageId)}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {deletingMessageId ? "Deleting..." : "Yes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AvatarCircle({ name, avatar, sizeClass = "w-8 h-8" }) {
  const image = String(avatar || "").trim();
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 flex-shrink-0`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-[#017FE6] text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}
      aria-label={name}
    >
      {getInitialsFromName(name || "User")}
    </div>
  );
}
