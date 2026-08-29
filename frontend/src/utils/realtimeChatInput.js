export const REALTIME_CHAT_INPUT_MAX_LENGTH = 2000;
export const REALTIME_CHAT_WORD_LIMIT = 250;

const DISALLOWED_REALTIME_CHAT_INPUT_REGEX = /[^A-Za-z?,. \r\n]+/g;

export const countRealtimeChatWords = (value = "") => {
  const words = String(value || "").trim().match(/\S+/g);
  return words ? words.length : 0;
};

const limitRealtimeChatWords = (value = "") => {
  const text = String(value || "");
  const words = [...text.matchAll(/\S+/g)];
  if (words.length <= REALTIME_CHAT_WORD_LIMIT) return text;

  const firstExcludedWord = words[REALTIME_CHAT_WORD_LIMIT];
  return text.slice(0, firstExcludedWord.index).trimEnd();
};

export const sanitizeRealtimeChatInput = (value = "") =>
  limitRealtimeChatWords(
    String(value || "")
      .replace(DISALLOWED_REALTIME_CHAT_INPUT_REGEX, "")
      .slice(0, REALTIME_CHAT_INPUT_MAX_LENGTH)
  );
