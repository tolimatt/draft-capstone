import { useEffect, useState } from "react";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import API from "../../utils/api";
import { getSocket } from "../../utils/socket";
import { formatDisplayName, getInitialsFromName } from "../../utils/dateUtils";
import { resolveAssetUrl } from "../../utils/media";
import { getSessionUser } from "../../utils/sessionStore";

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
const appendUniqueMessage = (list, message) =>
  list.some((item) => item._id === message._id) ? list : [...list, message];
const replaceMessageById = (list, message) =>
  list.map((item) => (item._id === message._id ? { ...item, ...message } : item));
const toMessagePreview = (message) => ({
  _id: message._id,
  text: message.text,
  sender: message.sender,
  receiver: message.receiver,
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

export default function Messages() {
  const currentUserId = getSessionUser()?._id || "";
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  const [showConversationList, setShowConversationList] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState("");
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState("");
  const [activeMessageActionId, setActiveMessageActionId] = useState("");
  const [showDeleteConversationConfirm, setShowDeleteConversationConfirm] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);

  const loadConversations = async () => {
    try {
      const response = await API.getConversations();
      const next = (response.conversations || []).map((conversation) => ({
        ...conversation,
        partner: normalizePartner(conversation.partner),
      }));
      setConversations(next);
      setActiveUser((prev) => {
        if (prev?._id && next.some((conversation) => conversation.partner._id === prev._id)) {
          return prev;
        }
        return next[0]?.partner || null;
      });
    } catch (err) {
      setError(err.message || "Failed to load conversations.");
    }
  };

  const loadMessages = async (partnerId) => {
    if (!partnerId) return;
    setLoading(true);
    setError("");
    try {
      const response = await API.getMessagesWithUser(partnerId);
      setMessages(response.messages || []);
      await API.markMessagesAsRead(partnerId);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.partner._id === partnerId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
    } catch (err) {
      setError(err.message || "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

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
    if (!activeUser?._id) return;
    loadMessages(activeUser._id);
  }, [activeUser?._id]);

  useEffect(() => {
    setEditingMessageId("");
    setEditingText("");
    setConfirmDeleteMessageId("");
    setActiveMessageActionId("");
  }, [activeUser?._id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncomingMessage = (message) => {
      setConversations((prev) => {
        const senderId = String(message.sender?._id || message.sender);
        const isOutgoing = senderId === String(currentUserId);
        const partner = isOutgoing ? message.receiver : message.sender;
        const partnerId = String(partner?._id || partner);
        if (!partnerId) return prev;

        const existing = prev.find((conversation) => conversation.partner._id === partnerId);
        const nextConversation = {
          partner: normalizePartner({
            _id: partner?._id || partnerId,
            name: partner?.name,
            email: partner?.email,
            avatar: partner?.avatar,
          }),
          lastMessage: toMessagePreview(message),
          unreadCount:
            !isOutgoing && activeUser?._id !== partnerId
              ? (existing?.unreadCount || 0) + 1
              : existing?.unreadCount || 0,
        };

        const rest = prev.filter((conversation) => conversation.partner._id !== partnerId);
        return [nextConversation, ...rest];
      });

      if (
        String(message.sender?._id || message.sender) === String(activeUser?._id) ||
        String(message.receiver?._id || message.receiver) === String(activeUser?._id)
      ) {
        setMessages((prev) => appendUniqueMessage(prev, message));
      }
    };

    const handleMessageUpdate = (message) => {
      const senderId = String(message.sender?._id || message.sender);
      const isOutgoing = senderId === String(currentUserId);
      const partner = isOutgoing ? message.receiver : message.sender;
      const partnerId = String(partner?._id || partner);
      if (!partnerId) return;

      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.partner._id !== partnerId) return conversation;
          if (String(conversation.lastMessage?._id || "") !== String(message._id)) return conversation;
          return {
            ...conversation,
            lastMessage: toMessagePreview(message),
          };
        })
      );

      if (
        String(message.sender?._id || message.sender) !== String(activeUser?._id) &&
        String(message.receiver?._id || message.receiver) !== String(activeUser?._id)
      ) {
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

      if (String(activeUser?._id) !== partnerId) return;

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
  }, [activeUser?._id, currentUserId]);

  const send = async () => {
    if (!activeUser?._id || !text.trim()) return;

    try {
      const response = await API.sendMessageToUser(activeUser._id, {
        text: text.trim(),
      });
      setMessages((prev) => appendUniqueMessage(prev, response.message));
      setText("");
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
          String(conversation.lastMessage?._id || "") === String(updated._id)
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
          String(conversation.lastMessage?._id || "") === String(updated._id)
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
    if (!activeUser?._id || deletingConversation) return;

    try {
      setDeletingConversation(true);
      setError("");
      await API.deleteConversation(activeUser._id);
      setMessages([]);
      cancelEditMessage();
      setShowDeleteConversationConfirm(false);
      await loadConversations();
    } catch (err) {
      setError(err.message || "Failed to delete conversation.");
    } finally {
      setDeletingConversation(false);
    }
  };

  const handleSelectConversation = (partner) => {
    setActiveUser(partner);
    if (isMobileView) {
      setShowConversationList(false);
    }
  };

  const isShowingList = !isMobileView || showConversationList;
  const isShowingThread = !isMobileView || !showConversationList;

  return (
    <div className="flex h-full min-h-[70vh] bg-white border rounded-xl overflow-hidden">
      <aside
        className={`border-r bg-gray-50 w-full lg:w-80 lg:flex-shrink-0 ${
          isShowingList ? "block" : "hidden"
        }`}
      >
        <div className="px-4 py-3 border-b font-semibold">Renter Conversations</div>
        <div className="overflow-y-auto h-[calc(70vh-48px)] lg:h-[calc(100%-48px)]">
          {conversations.map((conversation) => (
            <button
              key={conversation.partner._id}
              onClick={() => handleSelectConversation(conversation.partner)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-gray-100 ${
                activeUser?._id === conversation.partner._id ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <AvatarCircle
                    name={conversation.partner.name}
                    avatar={conversation.partner.avatar}
                    sizeClass="w-8 h-8"
                  />
                  <p className="font-medium text-sm truncate">{conversation.partner.name}</p>
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
            </button>
          ))}
        </div>
      </aside>

      <section className={`flex-1 flex-col ${isShowingThread ? "flex" : "hidden"}`}>
        <div className="px-5 py-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {isMobileView && (
                <button
                  type="button"
                  onClick={() => setShowConversationList(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <AvatarCircle name={activeUser?.name || "User"} avatar={activeUser?.avatar} sizeClass="w-9 h-9" />
              <div className="min-w-0">
                <h2 className="font-semibold">{activeUser?.name || "Select conversation"}</h2>
                {activeUser?.email && <p className="text-xs text-gray-500">{activeUser.email}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConversationConfirm(true)}
              disabled={!activeUser}
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
          {loading && <p className="text-sm text-gray-500">Loading messages...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !messages.length && (
            <p className="text-sm text-gray-500">No messages yet.</p>
          )}

          {messages.map((message) => {
            const isOwner = String(message.sender?._id || message.sender) !== String(activeUser?._id);
            const isEditing = isOwner && editingMessageId === message._id;
            const showActions =
              isOwner &&
              !isEditing &&
              !message.isDeleted &&
              activeMessageActionId === String(message._id);
            return (
              <div key={message._id} className={`flex ${isOwner ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                    isOwner ? "bg-[#017FE6] text-white" : "bg-white border"
                  }`}
                  onClick={(event) => {
                    if (!isOwner || isEditing || message.isDeleted) return;
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
                  <p className={`text-[10px] mt-1 ${isOwner ? "text-white/80" : "text-gray-500"}`}>
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            disabled={!activeUser}
          />
          <button onClick={send} disabled={!activeUser} className="px-4 rounded-lg bg-[#017FE6] text-white">
            <Send size={16} />
          </button>
        </div>
      </section>

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

  useEffect(() => {
    setFailed(false);
  }, [image]);

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
