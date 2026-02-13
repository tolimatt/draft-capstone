import { useState, useEffect } from "react";
import {
  Send,
  Paperclip,
  FileText,
  Check,
  CheckCheck,
} from "lucide-react";

const timeNow = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const MAX_FILES = 5;

const SAMPLE_CHATS = [
  {
    id: 1,
    name: "Maria Santos",
    messages: [
      {
        from: "user",
        text: "Is the car available tomorrow?",
        files: [],
        time: timeNow(),
        status: "seen",
      },
    ],
  },
];

export default function Messages() {
  const [chats, setChats] = useState(SAMPLE_CHATS);
  const [activeChatId, setActiveChatId] = useState(1);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [userTyping, setUserTyping] = useState(false);

  const activeChat = chats.find((c) => c.id === activeChatId);

//* user tyipingd
  useEffect(() => {
    if (!activeChat) return;

    if (activeChat.messages.at(-1)?.from === "owner") {
      setUserTyping(true);

      const timer = setTimeout(() => {
        setUserTyping(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [activeChat?.messages]);

 //* if the message delivered ir seedn
  useEffect(() => {
    if (!activeChat) return;

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              messages: chat.messages.map((m) =>
                m.from === "owner" && m.status === "delivered"
                  ? { ...m, status: "seen" }
                  : m
              ),
            }
          : chat
      )
    );
  }, [activeChatId]);

//* file picker
  const handleFileSelect = (pickedFiles) => {
    const picked = Array.from(pickedFiles);

    if (files.length + picked.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} attachments only`);
      return;
    }

    const readers = picked.map((file) => {
      if (file.type.startsWith("image")) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve({
              type: "image",
              name: file.name,
              url: reader.result,
            });
          reader.readAsDataURL(file);
        });
      }

      return Promise.resolve({
        type: "file",
        name: file.name,
      });
    });

    Promise.all(readers).then((results) => {
      setFiles((prev) => [...prev, ...results]);
    });
  };

//* owner can send message
  const sendMessage = () => {
    if (!text.trim() && files.length === 0) return;

    const newMessage = {
      from: "owner",
      text: text.trim(),
      files,
      time: timeNow(),
      status: "delivered",
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, newMessage] }
          : chat
      )
    );

    setText("");
    setFiles([]);
  };

//ui of convo
  return (
    <div className="flex h-full bg-white rounded-xl shadow overflow-hidden">

      {/*INBOX */}
      <aside className="w-72 border-r bg-gray-50">
        <h2 className="px-4 py-3 font-semibold border-b">
          Conversations
        </h2>

        {chats.map((chat) => {
          const last = chat.messages.at(-1);
          return (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-100 ${
                chat.id === activeChatId ? "bg-gray-100" : ""
              }`}
            >
              <p className="font-medium">{chat.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {last?.text ||
                  (last?.files?.some((f) => f.type === "image") && "📷 Photo") ||
                  (last?.files?.length > 0 && "📎 Attachment")}
              </p>
            </button>
          );
        })}
      </aside>

      {/*  CHAT  */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">
            {activeChat?.name}
          </h3>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-gray-50">
          {activeChat?.messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.from === "owner"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
                  msg.from === "owner"
                    ? "bg-[#017FE6] text-white"
                    : "bg-white border"
                }`}
              >
                {msg.text && <p>{msg.text}</p>}

                {msg.files?.map((f, idx) =>
                  f.type === "image" ? (
                    <img
                      key={idx}
                      src={f.url}
                      onClick={() => setPreview(f.url)}
                      className="mt-2 max-w-[220px] rounded-lg cursor-pointer hover:opacity-90"
                    />
                  ) : (
                    <div
                      key={idx}
                      className="flex items-center gap-2 mt-2 text-xs"
                    >
                      <FileText size={14} />
                      <span className="underline">{f.name}</span>
                    </div>
                  )
                )}

                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                  <span>{msg.time}</span>
                  {msg.from === "owner" && (
                    <>
                      {msg.status === "delivered" && <Check size={12} />}
                      {msg.status === "seen" && <CheckCheck size={12} />}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {userTyping && (
            <p className="text-xs text-gray-400 italic">
              {activeChat?.name} is typing…
            </p>
          )}
        </div>

        {/* ATTACHMENT PREVIEW */}
        {files.length > 0 && (
          <div className="flex gap-3 px-4 py-2 border-t bg-gray-50">
            {files.map((f, i) => (
              <div key={i} className="relative">
                {f.type === "image" ? (
                  <img
                    src={f.url}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="text-xs">📎 {f.name}</div>
                )}

                <button
                  onClick={() =>
                    setFiles((prev) =>
                      prev.filter((_, idx) => idx !== i)
                    )
                  }
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* INPUT */}
        <div className="px-4 py-3 border-t flex items-center gap-3">
          <label className="cursor-pointer">
            <Paperclip size={18} />
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              hidden
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </label>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#017FE6]"
          />

          <button
            onClick={sendMessage}
            className="bg-[#017FE6] text-white px-4 py-2 rounded-xl hover:bg-[#0165B8] flex items-center gap-2"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      {/* IMAGE PREVIEW MODAL */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <img
            src={preview}
            className="max-h-[90vh] max-w-[90vw] rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
