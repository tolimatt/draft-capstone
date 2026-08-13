import React, { useEffect, useRef, useState } from "react";
import { LoaderCircle, Send, X } from "lucide-react";
import API from "../utils/api";
import { getSessionUser, SESSION_USER_UPDATED_EVENT } from "../utils/sessionStore";

const CHAT_WIDGET_STORAGE_KEY_PREFIX = "rentifypro.chatWidget.v1";
const LEGACY_CHAT_WIDGET_STORAGE_KEY = "rentifypro.chatWidget.v1";
const CHAT_INPUT_MAX_LENGTH = 500;
const DISALLOWED_CHAT_INPUT_REGEX = /[^A-Za-z?,. ]+/g;
const MAX_STORED_MESSAGES = 40;
const WELCOME_MESSAGE_ID_PREFIX = "welcome-";

const BLOCKED_WORDS = [
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "puta",
  "putangina",
  "gago",
  "tanga",
  "ulol",
  "tarantado",
  "pakyu",
  "bwisit",
  "nigger",
  "nigga",
];

const TIME_BASED_GREETINGS = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

const getGreetingPeriod = (date = new Date()) => {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  if (totalMinutes === 0) return "evening";
  if (totalMinutes < 12 * 60) return "morning";
  if (totalMinutes < 18 * 60) return "afternoon";
  return "evening";
};

const getWelcomeText = (date = new Date()) => {
  const greetingPeriod = getGreetingPeriod(date);
  const greeting = TIME_BASED_GREETINGS[greetingPeriod] || TIME_BASED_GREETINGS.evening;

  return `${greeting}, I am Rentify AI. I automatically reply in English, Filipino, or Taglish based on how you ask your question. What can I help you with today?`;
};

const QUICK_PROMPTS = [
  "Show available vehicles",
  "How does booking work?",
  "What are the rental requirements?",
];

const createWelcomeMessage = (language, date = new Date()) => ({
  id: `${WELCOME_MESSAGE_ID_PREFIX}${language}-${getGreetingPeriod(date)}`,
  sender: "bot",
  text: getWelcomeText(date),
  recommendations: [],
  showViewAvailableVehicles: false,
});

const formatHourlyRate = (value) => {
  const amount = Number(value || 0);
  return `P${amount.toLocaleString()} / hour`;
};

const normalizeRecommendations = (recommendations) =>
  Array.isArray(recommendations) ? recommendations.filter((item) => item && typeof item === "object") : [];

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const BLOCKED_WORD_GLOBAL_PATTERN = new RegExp(
  `\\b(${BLOCKED_WORDS.map((word) => escapeRegex(word)).join("|")})\\b`,
  "gi"
);

const maskBadWord = (word = "") => {
  const characters = Array.from(String(word || ""));
  if (characters.length <= 2) return "*".repeat(characters.length);
  return `${characters[0]}${"*".repeat(characters.length - 2)}${characters.at(-1)}`;
};

const sanitizeDraftInput = (value = "") =>
  String(value || "")
    .replace(DISALLOWED_CHAT_INPUT_REGEX, "")
    .slice(0, CHAT_INPUT_MAX_LENGTH);

const censorBadWords = (value = "") =>
  String(value || "").replace(BLOCKED_WORD_GLOBAL_PATTERN, (word) => maskBadWord(word));

const normalizeMessage = (message) => {
  if (!message || typeof message !== "object") {
    return null;
  }

  const sender = message.sender === "user" ? "user" : "bot";
  const text = String(message.text || "").trim();
  if (!text) {
    return null;
  }

  return {
    id: String(message.id || `${sender}-${Date.now()}`),
    sender,
    text,
    recommendations: sender === "bot" ? normalizeRecommendations(message.recommendations) : [],
    showViewAvailableVehicles:
      sender === "bot" ? Boolean(message.showViewAvailableVehicles) : false,
  };
};

const isWelcomeMessage = (message) =>
  String(message?.id || "").startsWith(WELCOME_MESSAGE_ID_PREFIX);

const ensureConversation = (messages, language, date = new Date()) => {
  const normalized = Array.isArray(messages)
    ? messages
        .map((message) => normalizeMessage(message))
        .filter(Boolean)
        .filter((message) => !isWelcomeMessage(message))
        .slice(-Math.max(0, MAX_STORED_MESSAGES - 1))
    : [];

  return [createWelcomeMessage(language, date), ...normalized];
};

const getDefaultChatState = () => ({
  language: "english",
  conversations: {
    english: [createWelcomeMessage("english")],
    filipino: [createWelcomeMessage("filipino")],
  },
  drafts: {
    english: "",
    filipino: "",
  },
});

const resolveStorageScope = () => {
  const userId = String(getSessionUser()?._id || "").trim();
  return userId ? `user:${userId}` : "guest";
};

const getStorageKey = (scope) => `${CHAT_WIDGET_STORAGE_KEY_PREFIX}:${scope}`;

const readStoredChatState = (scope) => {
  if (typeof window === "undefined") {
    return getDefaultChatState();
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(scope));
    if (!raw) {
      return getDefaultChatState();
    }

    const parsed = JSON.parse(raw);
    return {
      language: "english",
      conversations: {
        english: ensureConversation(parsed?.conversations?.english, "english"),
        filipino: ensureConversation(parsed?.conversations?.filipino, "filipino"),
      },
      drafts: {
        english: sanitizeDraftInput(parsed?.drafts?.english || ""),
        filipino: sanitizeDraftInput(parsed?.drafts?.filipino || ""),
      },
    };
  } catch {
    return getDefaultChatState();
  }
};

export default function ChatWidget({ isOpen, onClose, onViewAvailableVehicles }) {
  const initialStorageScope = resolveStorageScope();
  const initialState = readStoredChatState(initialStorageScope);
  const [storageScope, setStorageScope] = useState(initialStorageScope);
  const [language, setLanguage] = useState(initialState.language);
  const [messagesByLanguage, setMessagesByLanguage] = useState(initialState.conversations);
  const [draftByLanguage, setDraftByLanguage] = useState(initialState.drafts);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef(null);

  const messages = ensureConversation(messagesByLanguage[language], language);
  const draft = String(draftByLanguage[language] || "");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      getStorageKey(storageScope),
      JSON.stringify({
        language,
        conversations: {
          english: ensureConversation(messagesByLanguage.english, "english"),
          filipino: ensureConversation(messagesByLanguage.filipino, "filipino"),
        },
        drafts: {
          english: String(draftByLanguage.english || ""),
          filipino: String(draftByLanguage.filipino || ""),
        },
      })
    );
  }, [draftByLanguage, language, messagesByLanguage, storageScope]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.localStorage.removeItem(LEGACY_CHAT_WIDGET_STORAGE_KEY);

    const syncChatStateToCurrentSessionUser = () => {
      const nextScope = resolveStorageScope();

      setStorageScope((currentScope) => {
        if (currentScope === nextScope) {
          return currentScope;
        }

        const nextState = readStoredChatState(nextScope);
        setLanguage("english");
        setMessagesByLanguage(nextState.conversations);
        setDraftByLanguage(nextState.drafts);
        return nextScope;
      });
    };

    window.addEventListener(SESSION_USER_UPDATED_EVENT, syncChatStateToCurrentSessionUser);
    return () => {
      window.removeEventListener(SESSION_USER_UPDATED_EVENT, syncChatStateToCurrentSessionUser);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages, isSending]);

  const updateMessagesForLanguage = (targetLanguage, updater) => {
    setMessagesByLanguage((current) => {
      const currentMessages = ensureConversation(current[targetLanguage], targetLanguage);
      const nextMessages =
        typeof updater === "function" ? updater(currentMessages) : updater;

      return {
        ...current,
        [targetLanguage]: ensureConversation(nextMessages, targetLanguage),
      };
    });
  };

  const updateDraftForLanguage = (targetLanguage, value) => {
    setDraftByLanguage((current) => ({
      ...current,
      [targetLanguage]: value,
    }));
  };

  const sendMessage = async () => {
    const activeLanguage = language;
    const rawDraft = String(draftByLanguage[activeLanguage] || "");
    const sanitizedDraft = sanitizeDraftInput(rawDraft);
    const message = sanitizedDraft.trim();

    if (sanitizedDraft !== rawDraft) {
      updateDraftForLanguage(activeLanguage, sanitizedDraft);
    }

    if (!message || isSending) return;

    const userMessageId = `user-${Date.now()}`;
    updateMessagesForLanguage(activeLanguage, (current) => [
      ...current,
      {
        id: userMessageId,
        sender: "user",
        text: censorBadWords(message),
        recommendations: [],
        showViewAvailableVehicles: false,
      },
    ]);
    updateDraftForLanguage(activeLanguage, "");
    setIsSending(true);

    try {
      const response = await API.chatWithBot({ message, language: "auto" });
      updateMessagesForLanguage(activeLanguage, (current) => {
        const updatedMessages = response.censoredMessage
          ? current.map((item) =>
              item.id === userMessageId
                ? { ...item, text: String(response.censoredMessage) }
                : item
            )
          : current;

        return [
          ...updatedMessages,
          {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text:
              response.reply ||
              (activeLanguage === "filipino"
                ? "May problema sa tugon ng chatbot. Pakisubukan muli."
                : "There was a problem with the chatbot response. Please try again."),
            recommendations: Array.isArray(response.recommendations)
              ? response.recommendations
              : [],
            showViewAvailableVehicles:
              response.intent === "available_vehicles" &&
              Array.isArray(response.recommendations) &&
              response.recommendations.length > 0,
          },
        ];
      });
    } catch (error) {
      updateMessagesForLanguage(activeLanguage, (current) => [
        ...current,
        {
          id: `bot-error-${Date.now()}`,
          sender: "bot",
          text:
            error.message ||
            (activeLanguage === "filipino"
              ? "Hindi maabot ang chatbot service sa ngayon. Pakisubukan muli mamaya."
              : "The chatbot service is unavailable right now. Please try again later."),
          recommendations: [],
          showViewAvailableVehicles: false,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Rentify AI chatbot"
      className="fixed bottom-4 right-4 z-[90] flex h-[76vh] max-h-[620px] w-[calc(100vw-2rem)] max-w-[440px] flex-col overflow-hidden rounded-[1.75rem] border border-blue-100/80 bg-white shadow-[0_30px_100px_rgba(2,32,71,0.3)]"
    >
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0B75E7_0%,#056ED9_55%,#045FC3_100%)] px-4 py-4 text-white">
        <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full border border-white/10 bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 right-20 h-28 w-28 rounded-full border border-white/10" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 p-1 shadow-lg shadow-blue-950/15 backdrop-blur-sm">
              <img
                src="/rentify-ai-logo-bubble.png"
                alt="Rentify AI"
                className="h-full w-full rounded-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Rentify AI</h3>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-blue-100">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white/25" />
                </span>
                <span>Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 transition hover:rotate-3 hover:bg-white/20"
            aria-label="Close Rentify AI"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="rp-ai-chat-body flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-end gap-2.5 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.sender === "bot" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white p-0.5 shadow-sm">
                <img
                  src="/rentify-ai-logo-bubble.png"
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full rounded-full object-contain"
                />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.sender === "user"
                  ? "rounded-br-md bg-[linear-gradient(135deg,#0B75E7,#056ED9)] text-white shadow-[0_10px_24px_rgba(11,117,231,0.2)]"
                  : "rounded-bl-md border border-slate-200/90 bg-white text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
              }`}
            >
              <p className="whitespace-pre-line">{message.text}</p>

              {message.sender === "bot" && message.recommendations?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.recommendations.map((vehicle, index) => (
                    <article
                      key={`${message.id}-${vehicle._id || vehicle.name || index}`}
                      className="rounded-2xl border border-blue-100 bg-[linear-gradient(145deg,#f8fbff,#eff6ff)] p-3 transition hover:border-blue-200"
                    >
                      <h4 className="font-semibold text-slate-900">
                        {vehicle.name || "Vehicle"}
                      </h4>
                      <p className="mt-1 text-xs text-slate-600">
                        {vehicle.type || "N/A"} | {vehicle.transmission || "N/A"} |{" "}
                        {vehicle.seats || 0} seats
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#0B75E7]">
                        {formatHourlyRate(vehicle.hourlyRate ?? vehicle.dailyRate)}
                      </p>
                    </article>
                  ))}
                  {message.showViewAvailableVehicles && typeof onViewAvailableVehicles === "function" && (
                    <button
                      onClick={() => {
                        onClose?.();
                        onViewAvailableVehicles();
                      }}
                      className="mt-1 inline-flex items-center justify-center rounded-xl bg-[#0B75E7] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#095fb8]"
                    >
                      View available vehicles
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {messages.length === 1 && !isSending && (
          <div className="pl-10">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => updateDraftForLanguage(language, prompt)}
                  className="rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-[#0B75E7] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {isSending && (
          <div className="flex items-end gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white p-0.5 shadow-sm">
              <img src="/rentify-ai-logo-bubble.png" alt="" aria-hidden="true" className="h-full w-full rounded-full object-contain" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              <LoaderCircle size={16} className="animate-spin" />
              {language === "filipino" ? "Nag-iisip..." : "Thinking..."}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200/80 bg-white/95 p-3.5 backdrop-blur">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
          <input
            value={draft}
            onChange={(event) =>
              updateDraftForLanguage(language, sanitizeDraftInput(event.target.value))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              language === "filipino"
                ? "Magtanong tungkol sa sasakyan o booking..."
                : "Ask about vehicles or booking..."
            }
            className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            disabled={isSending}
            maxLength={CHAT_INPUT_MAX_LENGTH}
          />
          <button
            onClick={sendMessage}
            disabled={isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0B75E7,#045FC3)] text-white shadow-[0_8px_18px_rgba(11,117,231,0.24)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span>Press Enter to send</span>
          <span>{draft.length}/{CHAT_INPUT_MAX_LENGTH}</span>
        </div>
      </div>
    </div>
  );
}
