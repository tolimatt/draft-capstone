const PROFANITY_WORDS = [
  "asshole",
  "bastard",
  "bitch",
  "bullshit",
  "cunt",
  "dick",
  "fuck",
  "motherfucker",
  "pussy",
  "shit",
  "slut",
  "whore",
  "bobo",
  "bwisit",
  "gago",
  "hindot",
  "inutil",
  "kantot",
  "leche",
  "puta",
  "putangina",
  "tanga",
  "tarantado",
  "ulol",
];

const escapeRegex = (value = "") => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const maskWord = (word = "") => {
  const text = String(word || "");
  if (!text) return "";
  if (text.length <= 2) return "*".repeat(text.length);
  return `${text[0]}${"*".repeat(text.length - 2)}${text[text.length - 1]}`;
};

const PROFANITY_PATTERNS = [...new Set(PROFANITY_WORDS)]
  .sort((a, b) => b.length - a.length)
  .map((word) => ({
    word,
    regex: new RegExp(`(^|[^a-z0-9])(${escapeRegex(word)})(?=[^a-z0-9]|$)`, "gi"),
  }));

export const censorProfanityInText = (input = "") => {
  let output = String(input || "");

  for (const pattern of PROFANITY_PATTERNS) {
    output = output.replace(pattern.regex, (_match, prefix = "", dirtyWord = "") => {
      return `${prefix}${maskWord(dirtyWord)}`;
    });
  }

  return output;
};

