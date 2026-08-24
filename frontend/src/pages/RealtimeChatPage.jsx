import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageSquare, Search, Send, Trash2 } from "lucide-react";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { getSocket } from "../utils/socket";
import { requestLiveCountersRefresh } from "../utils/liveCounters";
import { formatDisplayName, getInitialsFromName } from "../utils/dateUtils";
import { resolveAssetUrl } from "../utils/media";
import { getSessionUser } from "../utils/sessionStore";
import {
  REALTIME_CHAT_INPUT_MAX_LENGTH,
  sanitizeRealtimeChatInput,
} from "../utils/realtimeChatInput";

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
  const [conversationQuery, setConversationQuery] = useState("");
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth < 768);
  const [showConversationList, setShowConversationList] = useState(true);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => getId(conversation.partner) === activePartnerId),
    [conversations, activePartnerId]
  );

  const filteredConversations = useMemo(() => {
    const query = conversationQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) =>
      [
        conversation.partner?.name,
        conversation.partner?.email,
        conversation.lastMessage?.text,
      ].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [conversationQuery, conversations]);

  const mergeInitialPartnerConversation = useCallback((list = []) => {
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
  }, [initialChatContext]);

  const loadConversations = useCallback(async () => {
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
  }, [mergeInitialPartnerConversation]);

  const loadMessages = useCallback(async (partnerId, context = {}) => {
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
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const initialPartner = normalizeInitialPartner(initialChatContext);
    if (!initialPartner?._id) return;

    setConversations((prev) => mergeInitialPartnerConversation(prev));
    setActivePartnerId(initialPartner._id);
    setActiveChatContext(normalizeChatContext(initialChatContext));
    setShowConversationList(false);
    onChatContextHandled?.();
  }, [initialChatContext, mergeInitialPartnerConversation, onChatContextHandled]);

  useEffect(() => {
    loadMessages(activePartnerId, activeChatContext);
  }, [activePartnerId, activeChatContext, loadMessages]);

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
  }, [activePartnerId, activeChatContext, currentUserId, loadConversations, loadMessages]);

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
    setEditingText(sanitizeRealtimeChatInput(message.text));
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
      if (isMobileView) setShowConversationList(true);
      requestLiveCountersRefresh();
    } catch (err) {
      setError(err.message || "Failed to delete conversation.");
    } finally {
      setDeletingConversation(false);
    }
  };

  const isShowingList = !isMobileView || showConversationList;
  const isShowingThread = !isMobileView || !showConversationList;

  return (
    <div className="min-h-screen">
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

      <main className="mx-auto max-w-[1380px] px-4 pb-12 pt-24 sm:px-6 sm:pt-28">
        <div className="rp-chat-page-header rp-surface">
          <div className="rp-chat-page-heading">
            <span className="rp-chat-page-icon" aria-hidden="true">
              <MessageSquare size={22} />
            </span>
            <div>
              <p className="rp-chat-eyebrow">Renter inbox</p>
              <h1>Messages</h1>
              <p>Talk with vehicle owners about bookings, pickup details, and trip updates.</p>
            </div>
          </div>
          <span className="rp-chat-live-pill">
            <span aria-hidden="true" />
            Real-time messaging
          </span>
        </div>

        {error && (
          <div className="rp-chat-alert" role="alert">
            {error}
          </div>
        )}

        <div className="rp-chat-shell">
          <aside className={`rp-chat-sidebar ${isShowingList ? "rp-chat-panel-visible" : "rp-chat-panel-hidden"}`}>
            <div className="rp-chat-sidebar-header">
              <div>
                <h2>Conversations</h2>
                <p>{conversations.length} total</p>
              </div>
              <span className="rp-chat-count" aria-label={`${conversations.length} conversations`}>
                {conversations.length > 99 ? "99+" : conversations.length}
              </span>
            </div>

            <div className="rp-chat-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={conversationQuery}
                onChange={(event) => setConversationQuery(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
              />
            </div>

            <div className="rp-chat-conversation-list">
              {loadingConversations && (
                <p className="rp-chat-list-message">Loading conversations...</p>
              )}
              {!loadingConversations && !conversations.length && (
                <div className="rp-chat-list-empty">
                  <MessageSquare size={20} aria-hidden="true" />
                  <p>No conversations yet</p>
                  <span>Open a vehicle listing to message its owner.</span>
                </div>
              )}
              {!loadingConversations && conversations.length > 0 && !filteredConversations.length && (
                <p className="rp-chat-list-message">No conversations match your search.</p>
              )}

              {filteredConversations.map((conversation) => {
                const partnerId = getId(conversation.partner);
                const isActive = activePartnerId === partnerId;
                return (
                  <button
                    key={partnerId}
                    type="button"
                    onClick={() => {
                      setActivePartnerId(partnerId);
                      setActiveChatContext({ bookingId: "", vehicleId: "" });
                      setShowConversationList(false);
                    }}
                    className={`rp-chat-conversation ${isActive ? "rp-chat-conversation-active" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <AvatarCircle
                      name={conversation.partner?.name || "User"}
                      avatar={conversation.partner?.avatar}
                      sizeClass="h-11 w-11"
                    />
                    <div className="rp-chat-conversation-copy">
                      <div className="rp-chat-conversation-title">
                        <p>{conversation.partner?.name || "User"}</p>
                        <time>{formatDateTime(conversation.lastMessage?.createdAt)}</time>
                      </div>
                      <div className="rp-chat-conversation-preview">
                        <p>{conversation.lastMessage?.text || "No messages yet"}</p>
                        {conversation.unreadCount > 0 && (
                          <span aria-label={`${conversation.unreadCount} unread messages`}>
                          {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={`rp-chat-thread ${isShowingThread ? "rp-chat-panel-visible" : "rp-chat-panel-hidden"}`}>
            <div className="rp-chat-thread-header">
              <div className="rp-chat-thread-person">
                {isMobileView && (
                  <button
                    type="button"
                    className="rp-chat-back-button"
                    onClick={() => setShowConversationList(true)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                {activeConversation && (
                  <AvatarCircle
                    name={activeConversation.partner?.name || "User"}
                    avatar={activeConversation.partner?.avatar}
                    sizeClass="h-10 w-10"
                  />
                )}
                <div className="min-w-0">
                  <h2>{activeConversation?.partner?.name || "Select a conversation"}</h2>
                  <p>
                    {activeConversation?.partner?.email || "Choose an owner from your conversations"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteConversationConfirm(true)}
                disabled={!activePartnerId}
                className="rp-chat-delete-button"
                aria-label="Delete conversation"
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>

            <div
              className="rp-chat-message-area"
              onClick={() => setActiveMessageActionId("")}
            >
              {loadingMessages && <p className="rp-chat-state-message">Loading messages...</p>}
              {!loadingMessages && !messages.length && (
                <div className="rp-chat-empty-thread">
                  <span aria-hidden="true"><MessageSquare size={24} /></span>
                  <h3>{activePartnerId ? "Start the conversation" : "Your messages live here"}</h3>
                  <p>
                    {activePartnerId
                      ? "Send a message to discuss booking details with this vehicle owner."
                      : "Choose a conversation from the list to view and send messages."}
                  </p>
                </div>
              )}

              <div className="rp-chat-message-list">
                {messages.map((message) => {
                  const isMine = getId(message.sender) === String(currentUserId);
                  const isEditing = isMine && editingMessageId === message._id;
                  const showActions =
                    isMine &&
                    !isEditing &&
                    !message.isDeleted &&
                    activeMessageActionId === String(message._id);
                  return (
                    <div key={message._id} className={`rp-chat-message-row ${isMine ? "rp-chat-message-row-mine" : ""}`}>
                      {!isMine && activeConversation && (
                        <AvatarCircle
                          name={activeConversation.partner?.name || "User"}
                          avatar={activeConversation.partner?.avatar}
                          sizeClass="h-8 w-8"
                        />
                      )}
                      <div className={`rp-chat-message-stack ${isMine ? "rp-chat-message-stack-mine" : ""}`}>
                        <div
                          className={`rp-chat-bubble ${isMine ? "rp-chat-bubble-mine" : "rp-chat-bubble-other"}`}
                          onClick={(event) => {
                            if (!isMine || isEditing || message.isDeleted) return;
                            event.stopPropagation();
                            setActiveMessageActionId((prev) =>
                              prev === String(message._id) ? "" : String(message._id)
                            );
                          }}
                        >
                          {isEditing ? (
                            <div className="rp-chat-edit-box">
                              <input
                                value={editingText}
                                onChange={(event) =>
                                  setEditingText(sanitizeRealtimeChatInput(event.target.value))
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    saveEditedMessage();
                                  }
                                }}
                                onClick={(event) => event.stopPropagation()}
                                maxLength={REALTIME_CHAT_INPUT_MAX_LENGTH}
                                autoFocus
                              />
                              <div>
                                <button type="button" onClick={cancelEditMessage} disabled={savingEdit}>Cancel</button>
                                <button type="button" onClick={saveEditedMessage} disabled={savingEdit}>
                                  {savingEdit ? "Saving..." : "Save"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className={message.isDeleted ? "italic opacity-80" : ""}>{message.text}</p>
                          )}
                          <time>
                            {formatDateTime(message.createdAt)}
                            {message.isEdited && !message.isDeleted ? " · edited" : ""}
                          </time>
                        </div>
                        {showActions && (
                          <div className="rp-chat-message-actions">
                            <button type="button" onClick={() => startEditMessage(message)}>Edit</button>
                            <button
                              type="button"
                              onClick={() => openDeleteMessageConfirm(message)}
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
            </div>

            <form
              className="rp-chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <input
                value={messageText}
                onChange={(event) =>
                  setMessageText(sanitizeRealtimeChatInput(event.target.value))
                }
                placeholder={activePartnerId ? "Write a message..." : "Select a conversation first"}
                aria-label="Message"
                maxLength={REALTIME_CHAT_INPUT_MAX_LENGTH}
                disabled={!activePartnerId}
              />
              <button
                type="submit"
                disabled={!activePartnerId || !messageText.trim()}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </form>
          </section>
        </div>
      </main>

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
  const [failedImage, setFailedImage] = useState("");

  if (image && failedImage !== image) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 flex-shrink-0`}
        onError={() => setFailedImage(image)}
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
