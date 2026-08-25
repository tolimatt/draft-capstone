export const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
export const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\u200D|\uFE0F|\u20E3|\u2028|\u2029)/u;

export const ALLOWED_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];

export const validateAdminEmail = (value) => {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return "Email is required.";
  if (EMOJI_REGEX.test(email)) return "Email must not contain emoji.";
  if (/\s/.test(email)) return "Email must not contain spaces.";
  if (email.length > 254) return "Email is too long (max 254 characters).";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email format.";
  if (!ALLOWED_EMAIL_DOMAINS.includes(email.split("@")[1])) return "Please use Gmail, Yahoo, Outlook, or Hotmail.";
  return "";
};

export const validateAdminPassword = (value) => {
  const password = String(value || "");
  if (!password) return "Password is required.";
  if (/\s/.test(password)) return "Password must not contain spaces.";
  if (EMOJI_REGEX.test(password)) return "Password must not contain emoji.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long (max 128 characters).";
  if (!/[A-Z]/.test(password)) return "Password needs an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password needs a lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password needs a number.";
  if (!/[!@#$%^&*()_+\-=[\]{}|;':",.<>?/`~]/.test(password)) return "Password needs a special character.";
  return "";
};
