import Notification from "../models/Notification.js";

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const parseCleanupInterval = () => {
  const raw = Number(process.env.NOTIFICATION_CLEANUP_INTERVAL_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_CLEANUP_INTERVAL_MS;
  return Math.floor(raw);
};

let cleanupTimer = null;

const getHardDeleteCutoff = (now = new Date()) => new Date(now.getTime() - THREE_DAYS_IN_MS);

export const purgeArchivedNotifications = async (now = new Date()) => {
  const cutoff = getHardDeleteCutoff(now);
  const result = await Notification.deleteMany({
    $or: [
      { archived_at: { $lte: cutoff } },
      // Legacy safety: remove rows soft-deleted by the previous implementation.
      { deleted_at: { $exists: true, $ne: null } },
    ],
  });
  return result.deletedCount || 0;
};

export const startNotificationCleanupJob = () => {
  if (cleanupTimer) return;

  const runCleanup = async () => {
    try {
      const deletedCount = await purgeArchivedNotifications();
      if (deletedCount > 0) {
        console.log(`[notification-cleanup] Permanently deleted ${deletedCount} notifications.`);
      }
    } catch (error) {
      console.error("[notification-cleanup] Failed:", error?.message || error);
    }
  };

  void runCleanup();
  cleanupTimer = setInterval(() => {
    void runCleanup();
  }, parseCleanupInterval());

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
};

export const stopNotificationCleanupJob = () => {
  if (!cleanupTimer) return;
  clearInterval(cleanupTimer);
  cleanupTimer = null;
};
