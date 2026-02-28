// src/utils/activityLogger.js

export const logActivity = (
  email,
  action,
  description,
  type = "security"
) => {
  if (!email) return;

  const logs =
    JSON.parse(localStorage.getItem("activityLogs")) || {};

  if (!logs[email]) logs[email] = [];

  logs[email].push({
    id: Date.now(),
    action,
    description,
    type,
    date: new Date().toLocaleString(),
  });

  localStorage.setItem("activityLogs", JSON.stringify(logs));
};