import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pin,
  Send,
  Trash2,
} from "lucide-react";
import API from "../../utils/api";
import { getSocket } from "../../utils/socket";
import { formatDisplayName, getInitialsFromName } from "../../utils/dateUtils";
import { resolveAssetUrl } from "../../utils/media";
import { getSessionUser } from "../../utils/sessionStore";

const getId = (value) => String(value?._id || value || "");

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "-";

const formatRelativeTime = (value) => {
  const date = value ? new Date(value) : null;
  const time = date?.getTime();
  if (!time || Number.isNaN(time)) return "No activity";

  const diffMs = Math.max(Date.now() - time, 0);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}h ago`;
  if (diffMs < 7 * day) return `${Math.max(1, Math.floor(diffMs / day))}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const toTimeValue = (value) => {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

const appendUniqueMessage = (list, message) =>
  list.some((item) => item._id === message._id) ? list : [...list, message];

const replaceMessageById = (list, message) =>
  list.map((item) => (item._id === message._id ? { ...item, ...message } : item));

const toMessagePreview = (message = {}) => ({
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
    _id: getId(partner),
    name: name || email || "User",
    email,
    avatar: resolveAssetUrl(partner?.avatar),
  };
};

const normalizeVehicle = (vehicle = {}) => {
  if (typeof vehicle === "string") {
    return { _id: "", name: vehicle || "Vehicle" };
  }

  return {
    _id: getId(vehicle),
    name: String(vehicle?.name || "").trim() || "Vehicle",
  };
};

const sortRenterThreads = (threads = []) =>
  [...threads].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.isPinned && b.isPinned) {
      const pinnedDiff = toTimeValue(b.pinnedAt) - toTimeValue(a.pinnedAt);
      if (pinnedDiff) return pinnedDiff;
    }
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return (
      toTimeValue(b.lastMessage?.createdAt || b.latestActivityAt) -
      toTimeValue(a.lastMessage?.createdAt || a.latestActivityAt)
    );
  });

const normalizeRenterThread = (thread = {}) => {
  const partner = normalizePartner(thread.partner || thread.renter || {});
  const lastMessage = thread.lastMessage ? toMessagePreview(thread.lastMessage) : null;
  const vehicle = normalizeVehicle(thread.vehicle || lastMessage?.vehicle || {});
  const isActive = Boolean(thread.isActive || thread.status === "active");

  return {
    ...thread,
    partner,
    renter: partner,
    isActive,
    status: thread.status || (isActive ? "active" : "previous"),
    statusLabel: thread.statusLabel || (isActive ? "Active Rental" : "Previous Renter"),
    vehicle,
    latestBooking: thread.latestBooking || null,
    latestActivityAt:
      thread.latestActivityAt ||
      thread.latestBooking?.activityAt ||
      lastMessage?.createdAt ||
      null,
    unreadCount: Number(thread.unreadCount || 0),
    isPinned: Boolean(thread.isPinned || thread.pinned),
    pinnedAt: thread.pinnedAt || null,
    lastMessage,
  };
};

export default function Messages() {
  const currentUserId = getSessionUser()?._id || "";
  const [renterThreads, setRenterThreads] = useState([]);
  const [activeRenterId, setActiveRenterId] = useState("");
  const [actionThreadId, setActionThreadId] = useState("");
  const [pinningRenterId, setPinningRenterId] = useState("");
  const [pinNotice, setPinNotice] = useState(null);
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  const [showConversationList, setShowConversationList] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(false);
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

  const activeThread = useMemo(
    () => renterThreads.find((thread) => thread.partner._id === activeRenterId) || null,
    [renterThreads, activeRenterId]
  );
  const actionThread = useMemo(
    () => renterThreads.find((thread) => thread.partner._id === actionThreadId) || null,
    [renterThreads, actionThreadId]
  );

  const loadRenterThreads = async () => {
    setLoadingThreads(true);
    setError("");
    try {
      const response = await API.getOwnerRenterThreads();
      const next = sortRenterThreads((response.renters || []).map(normalizeRenterThread));
      setRenterThreads(next);
      setActiveRenterId((prev) =>
        prev && next.some((thread) => thread.partner._id === prev) ? prev : ""
      );
    } catch (err) {
      setError(err.message || "Failed to load renters.");
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (partnerId) => {
    if (!partnerId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setError("");
    try {
      const response = await API.getMessagesWithUser(partnerId);
      setMessages(response.messages || []);
      await API.markMessagesAsRead(partnerId);
      setRenterThreads((prev) =>
        prev.map((thread) =>
          thread.partner._id === partnerId ? { ...thread, unreadCount: 0 } : thread
        )
      );
    } catch (err) {
      setError(err.message || "Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadRenterThreads();
  }, []);

  useEffect(() => {
    if (!pinNotice) return undefined;
    const timeoutId = window.setTimeout(() => setPinNotice(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [pinNotice]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobileView(mobile);
      if (!mobile) {
        setShowConversationList(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadMessages(activeRenterId);
  }, [activeRenterId]);

  useEffect(() => {
    setEditingMessageId("");
    setEditingText("");
    setConfirmDeleteMessageId("");
    setActiveMessageActionId("");
  }, [activeRenterId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncomingMessage = (message) => {
      const senderId = getId(message.sender);
      const isOutgoing = senderId === String(currentUserId);
      const partner = isOutgoing ? message.receiver : message.sender;
      const partnerId = getId(partner);
      if (!partnerId) return;

      setRenterThreads((prev) => {
        const existing = prev.find((thread) => thread.partner._id === partnerId);
        const nextThread = normalizeRenterThread({
          ...(existing || {}),
          partner: normalizePartner({
            _id: partnerId,
            name: partner?.name || existing?.partner?.name,
            email: partner?.email || existing?.partner?.email,
            avatar: partner?.avatar || existing?.partner?.avatar,
          }),
          vehicle: existing?.vehicle || message.vehicle,
          isActive: existing?.isActive ?? true,
          status: existing?.status || "active",
          statusLabel: existing?.statusLabel || "Active Rental",
          lastMessage: toMessagePreview(message),
          latestActivityAt: message.createdAt,
          unreadCount:
            !isOutgoing && activeRenterId !== partnerId
              ? Number(existing?.unreadCount || 0) + 1
              : Number(existing?.unreadCount || 0),
        });

        const rest = prev.filter((thread) => thread.partner._id !== partnerId);
        return sortRenterThreads([nextThread, ...rest]);
      });

      if (partnerId === activeRenterId) {
        setMessages((prev) => appendUniqueMessage(prev, message));
        if (!isOutgoing) {
          API.markMessagesAsRead(partnerId).catch(() => { });
        }
      }
    };

    const handleMessageUpdate = (message) => {
      const senderId = getId(message.sender);
      const isOutgoing = senderId === String(currentUserId);
      const partner = isOutgoing ? message.receiver : message.sender;
      const partnerId = getId(partner);
      if (!partnerId) return;

      setRenterThreads((prev) =>
        prev.map((thread) => {
          if (thread.partner._id !== partnerId) return thread;
          if (getId(thread.lastMessage) !== String(message._id)) return thread;
          return {
            ...thread,
            lastMessage: toMessagePreview(message),
          };
        })
      );

      if (partnerId !== activeRenterId) return;

      setMessages((prev) => replaceMessageById(prev, message));
      if (message.isDeleted) {
        setActiveMessageActionId((prev) => (prev === String(message._id) ? "" : prev));
        setConfirmDeleteMessageId((prev) => (prev === String(message._id) ? "" : prev));
      }
    };

    const handleConversationDeleted = (payload = {}) => {
      const partnerId = String(payload.partnerId || "");
      if (!partnerId) return;
      loadRenterThreads();

      if (activeRenterId !== partnerId) return;

      setMessages([]);
      setEditingMessageId("");
      setEditingText("");
      setConfirmDeleteMessageId("");
      setActiveMessageActionId("");
      loadMessages(partnerId);
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:message:update", handleMessageUpdate);
    socket.on("chat:conversation:deleted", handleConversationDeleted);
    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:message:update", handleMessageUpdate);
      socket.off("chat:conversation:deleted", handleConversationDeleted);
    };
  }, [activeRenterId, currentUserId]);

  const handleSelectConversation = async (thread) => {
    const renterId = thread?.partner?._id;
    if (!renterId) return;

    try {
      setError("");
      await API.openOwnerRenterThread(renterId);
      setActiveRenterId(renterId);
      setRenterThreads((prev) =>
        prev.map((item) => (item.partner._id === renterId ? { ...item, unreadCount: 0 } : item))
      );
      if (isMobileView) {
        setShowConversationList(false);
      }
    } catch (err) {
      setError(err.message || "Failed to open conversation.");
    }
  };

  const togglePinThread = async (thread) => {
    const renterId = thread?.partner?._id;
    if (!renterId || pinningRenterId) return;

    const nextPinned = !thread.isPinned;
    setPinningRenterId(renterId);
    setError("");
    try {
      const response = await API.setOwnerRenterThreadPin(renterId, nextPinned);
      const savedPinned = Boolean(response.pinned);
      setRenterThreads((prev) =>
        sortRenterThreads(
          prev.map((item) =>
            item.partner._id === renterId
              ? {
                ...item,
                isPinned: savedPinned,
                pinnedAt: response.pinnedAt || (savedPinned ? new Date().toISOString() : null),
              }
              : item
          )
        )
      );
      setPinNotice({
        id: `${renterId}-${Date.now()}`,
        message: `${thread.partner.name} was ${savedPinned ? "pinned" : "unpinned"}.`,
      });
      setActionThreadId("");
    } catch (err) {
      setError(err.message || "Failed to update pinned chat.");
    } finally {
      setPinningRenterId("");
    }
  };

  const send = async () => {
    const nextText = text.trim();
    if (!activeThread?.partner?._id || !nextText) return;

    try {
      const response = await API.sendMessageToUser(activeThread.partner._id, {
        text: nextText,
      });
      setMessages((prev) => appendUniqueMessage(prev, response.message));
      setText("");
      loadRenterThreads();
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
      setRenterThreads((prev) =>
        prev.map((thread) =>
          getId(thread.lastMessage) === String(updated._id)
            ? { ...thread, lastMessage: toMessagePreview(updated) }
            : thread
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
      setRenterThreads((prev) =>
        prev.map((thread) =>
          getId(thread.lastMessage) === String(updated._id)
            ? { ...thread, lastMessage: toMessagePreview(updated) }
            : thread
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
    if (!activeThread?.partner?._id || deletingConversation) return;

    try {
      setDeletingConversation(true);
      setError("");
      await API.deleteConversation(activeThread.partner._id);
      setMessages([]);
      setActiveRenterId("");
      cancelEditMessage();
      setShowDeleteConversationConfirm(false);
      await loadRenterThreads();
    } catch (err) {
      setError(err.message || "Failed to delete conversation.");
    } finally {
      setDeletingConversation(false);
    }
  };

  const isShowingList = !isMobileView || showConversationList;
  const isShowingThread = !isMobileView || !showConversationList;

  return (
    <div className="owner-messages-shell">
      <aside
        className={`owner-messages-renters ${isShowingList ? "owner-messages-panel-visible" : "owner-messages-panel-hidden"
          }`}
      >
        <div className="owner-messages-renters-header">
          <h2>Renters</h2>
        </div>

        <div className="owner-messages-renters-body">
          {error && (
            <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {loadingThreads && (
            <p className="px-1 py-2 text-sm text-slate-500">Loading renters...</p>
          )}

          {!loadingThreads && !renterThreads.length && (
            <p className="px-1 py-2 text-sm text-slate-500">No renter conversations yet.</p>
          )}

          <div className="owner-messages-renter-list">
            {renterThreads.map((thread) => (
              <RenterCard
                key={thread.partner._id}
                thread={thread}
                selected={activeRenterId === thread.partner._id}
                pinning={pinningRenterId === thread.partner._id}
                onSelect={() => handleSelectConversation(thread)}
                onTogglePin={() => togglePinThread(thread)}
                onOpenActions={() => setActionThreadId(thread.partner._id)}
              />
            ))}
          </div>
        </div>
      </aside>

      <section
        className={`owner-messages-thread ${isShowingThread ? "owner-messages-panel-visible" : "owner-messages-panel-hidden"
          }`}
      >
        {activeThread ? (
          <>
            <div className="owner-messages-thread-header">
              <div className="owner-messages-thread-user">
                {isMobileView && (
                  <button
                    type="button"
                    onClick={() => setShowConversationList(true)}
                    className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
                    aria-label="Back to renters"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <AvatarCircle
                  name={activeThread.partner.name}
                  avatar={activeThread.partner.avatar}
                  sizeClass="h-9 w-9"
                />
                <div className="owner-messages-thread-title">
                  <p>{activeThread.partner.name}</p>
                  <span>
                    Renting: {activeThread.vehicle.name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteConversationConfirm(true)}
                className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg border border-rose-100 bg-white px-3 text-xs font-medium text-rose-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>

            <div className="owner-messages-chat-body" onClick={() => setActiveMessageActionId("")}>
              {loadingMessages && <p className="text-sm text-slate-500">Loading messages...</p>}
              {error && (
                <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}

              {!loadingMessages && !messages.length && (
                <p className="text-sm text-slate-500">No messages yet.</p>
              )}

              <div className="owner-messages-bubble-list">
                {messages.map((message) => (
                  <MessageBubble
                    key={message._id}
                    message={message}
                    renterId={activeThread.partner._id}
                    currentUserId={currentUserId}
                    renter={activeThread.partner}
                    isEditing={editingMessageId === message._id}
                    editingText={editingText}
                    savingEdit={savingEdit}
                    deletingMessageId={deletingMessageId}
                    confirmDeleteMessageId={confirmDeleteMessageId}
                    showActions={activeMessageActionId === String(message._id)}
                    onToggleActions={() =>
                      setActiveMessageActionId((prev) =>
                        prev === String(message._id) ? "" : String(message._id)
                      )
                    }
                    onStartEdit={() => startEditMessage(message)}
                    onCancelEdit={cancelEditMessage}
                    onSaveEdit={saveEditedMessage}
                    onEditingTextChange={setEditingText}
                    onDelete={() => openDeleteMessageConfirm(message)}
                  />
                ))}
              </div>
            </div>

            <div className="owner-messages-composer">
              <div className="owner-messages-composer-row">
                <div className="owner-messages-input-wrap">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Type a message"
                    className="owner-messages-input"
                  />
                  <span
                    className="owner-messages-attach-icon"
                    aria-hidden="true"
                    title="Attach file"
                  >
                    <Paperclip size={17} />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={send}
                  disabled={!text.trim()}
                  className="owner-messages-send-button"
                  aria-label="Send message"
                  title="Send message"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyConversationState
            showBackButton={isMobileView}
            onBack={() => setShowConversationList(true)}
            error={error}
          />
        )}
      </section>

      {actionThread && (
        <ActionModal
          thread={actionThread}
          onChat={() => {
            setActionThreadId("");
            handleSelectConversation(actionThread);
          }}
          onCancel={() => setActionThreadId("")}
        />
      )}

      {showDeleteConversationConfirm && (
        <ConfirmModal
          title="Delete Conversation"
          message="Are you sure you want to delete this conversation? This action cannot be undone."
          cancelLabel="Cancel"
          confirmLabel={deletingConversation ? "Deleting..." : "Delete Conversation"}
          confirming={deletingConversation}
          onCancel={() => setShowDeleteConversationConfirm(false)}
          onConfirm={confirmDeleteConversation}
        />
      )}

      {confirmDeleteMessageId && (
        <ConfirmModal
          title="Delete Message"
          message="Are you sure you want to delete this message?"
          cancelLabel="No"
          confirmLabel={deletingMessageId ? "Deleting..." : "Yes"}
          confirming={Boolean(deletingMessageId)}
          onCancel={() => setConfirmDeleteMessageId("")}
          onConfirm={deleteOwnMessage}
        />
      )}

      {pinNotice && <PinStatusToast key={pinNotice.id} message={pinNotice.message} />}
    </div>
  );
}

function RenterCard({ thread, selected, pinning, onSelect, onTogglePin, onOpenActions }) {
  const statusIsActive = thread.status === "active" || thread.isActive;
  const activityAt = thread.lastMessage?.createdAt || thread.latestActivityAt;

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`owner-renter-card ${selected ? "owner-renter-card-selected" : ""}`}
    >
      <div className="owner-renter-card-content">
        <AvatarCircle name={thread.partner.name} avatar={thread.partner.avatar} sizeClass="h-11 w-11" />
        <div className="owner-renter-card-copy">
          <p className="owner-renter-name">{thread.partner.name}</p>
          <span
            className={`owner-renter-status ${statusIsActive
                ? "owner-renter-status-active"
                : "owner-renter-status-previous"
              }`}
          >
            {thread.statusLabel}
          </span>
          <p className="owner-renter-time">{formatRelativeTime(activityAt)}</p>
        </div>
      </div>

      <div className="owner-renter-card-actions">
        <button
          type="button"
          className={`owner-renter-pin ${thread.isPinned ? "owner-renter-pin-active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePin();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          disabled={pinning}
          aria-label={thread.isPinned ? "Unpin chat" : "Pin chat"}
          title={thread.isPinned ? "Unpin chat" : "Pin chat"}
        >
          <Pin size={18} className="-rotate-45" fill={thread.isPinned ? "currentColor" : "none"} />
        </button>
      </div>

      {thread.unreadCount > 0 && (
        <span className="owner-renter-unread">
          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
        </span>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  renterId,
  currentUserId,
  renter,
  isEditing,
  editingText,
  savingEdit,
  deletingMessageId,
  confirmDeleteMessageId,
  showActions,
  onToggleActions,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditingTextChange,
  onDelete,
}) {
  const senderId = getId(message.sender);
  const isOwner = currentUserId ? senderId === String(currentUserId) : senderId !== renterId;

  return (
    <div className={`flex items-start gap-3 ${isOwner ? "justify-end" : "justify-start"}`}>
      {!isOwner && (
        <AvatarCircle name={renter.name} avatar={renter.avatar} sizeClass="mt-1 h-8 w-8" />
      )}

      <div
        className={`group flex max-w-[82%] flex-col sm:max-w-[70%] ${isOwner ? "items-end text-right" : "items-start text-left"
          }`}
      >
        <div
          title={formatDateTime(message.createdAt)}
          className={`rounded-[10px] px-4 py-3 text-sm leading-5 shadow-sm ${isOwner
              ? "bg-[#0188dc] text-white shadow-[0_8px_16px_rgba(1,127,230,0.16)]"
              : "bg-[#e8ebef] text-[#111827] shadow-[0_8px_16px_rgba(15,23,42,0.04)]"
            }`}
          onClick={(event) => {
            if (!isOwner || isEditing || message.isDeleted) return;
            event.stopPropagation();
            onToggleActions();
          }}
        >
          {isEditing ? (
            <div className="space-y-2 text-left">
              <input
                value={editingText}
                onChange={(event) => onEditingTextChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSaveEdit();
                  }
                }}
                onClick={(event) => event.stopPropagation()}
                className="w-full rounded-md border border-white/30 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none"
              />
              <div className="flex justify-end gap-2 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="rounded bg-white/20 px-2 py-1"
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveEdit}
                  className="rounded bg-white px-2 py-1 text-[#017FE6]"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className={message.isDeleted ? "italic opacity-80" : ""}>{message.text}</p>
          )}
        </div>

        {showActions && isOwner && !isEditing && !message.isDeleted && (
          <div className="mt-2 flex justify-end gap-2 text-[11px] font-medium text-slate-500">
            <button type="button" onClick={onStartEdit} className="hover:text-[#017FE6]">
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deletingMessageId === message._id || Boolean(confirmDeleteMessageId)}
              className="hover:text-rose-600 disabled:opacity-50"
            >
              {deletingMessageId === message._id ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyConversationState({ showBackButton, onBack, error }) {
  return (
    <div className="relative flex h-full flex-1 items-center justify-center bg-[#fbfcfe] px-6 text-center">
      {showBackButton && (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          aria-label="Back to renters"
        >
          <ArrowLeft size={16} />
        </button>
      )}
      <div className="max-w-md">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#dfe6ee] bg-white text-[#017FE6]">
          <MessageSquare size={22} />
        </div>
        <h2 className="text-lg font-semibold tracking-normal text-[#111827]">
          Start a conversation
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Select a renter from the list to send messages regarding bookings, vehicle concerns,
          reminders, or follow-ups.
        </p>
        {error && (
          <p className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function ActionModal({ thread, onChat, onCancel }) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-[1px]"
        aria-label="Close chat actions"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="owner-chat-action-modal">
          <div className="owner-chat-action-modal-header">
            <p>{thread.partner.name}</p>
            <span>{thread.vehicle.name}</span>
          </div>
          <div className="owner-chat-action-modal-actions">
            <button
              type="button"
              onClick={onChat}
              className="owner-chat-action-button owner-chat-action-button-primary"
            >
              Chat
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="owner-chat-action-button owner-chat-action-button-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function PinStatusToast({ message }) {
  return (
    <div className="owner-pin-toast" role="status" aria-live="polite">
      <span className="owner-pin-toast-icon" aria-hidden="true">
        <Pin size={15} className="-rotate-45" />
      </span>
      <span>{message}</span>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirming,
  onCancel,
  onConfirm,
}) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-[1px]"
        aria-label={`Close ${title}`}
        onClick={() => {
          if (!confirming) onCancel();
        }}
      />
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.28)]">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-base font-semibold tracking-normal text-slate-900">{title}</h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm leading-6 text-slate-700">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={confirming}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirming}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function AvatarCircle({ name, avatar, sizeClass = "h-8 w-8" }) {
  const image = String(avatar || "").trim();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [image]);

  if (image && !failed) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizeClass} flex-shrink-0 rounded-full border border-slate-200 object-cover`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex-shrink-0 rounded-full bg-[#017FE6] text-xs font-bold text-white flex items-center justify-center`}
      aria-label={name}
    >
      {getInitialsFromName(name || "User")}
    </div>
  );
}
