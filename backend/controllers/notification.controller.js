import Notification from "../models/Notification.js";

const activeUserNotificationScope = (userId) => ({
  user: userId,
  archived_at: null,
  // Legacy safety: keep previously soft-deleted rows hidden until cleanup removes them.
  deleted_at: null,
});

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find(activeUserNotificationScope(req.user._id))
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, notifications });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      ...activeUserNotificationScope(req.user._id),
      _id: req.params.id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    notification.readAt = new Date();
    await notification.save();

    res.json({ success: true, notification });
  } catch {
    res.status(500).json({ success: false, message: "Failed to mark notification as read." });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        ...activeUserNotificationScope(req.user._id),
        readAt: null,
      },
      { $set: { readAt: new Date() } }
    );

    res.json({ success: true, message: "All notifications marked as read." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to update notifications." });
  }
};

export const deleteAllReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany(
      {
        ...activeUserNotificationScope(req.user._id),
        readAt: { $exists: true, $ne: null },
      }
    );

    res.json({
      success: true,
      message: "All read notifications deleted.",
      deletedCount: result.deletedCount || 0,
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to delete read notifications." });
  }
};

export const archiveReadNotifications = async (req, res) => {
  try {
    const now = new Date();
    const result = await Notification.updateMany(
      {
        ...activeUserNotificationScope(req.user._id),
        readAt: { $exists: true, $ne: null },
      },
      { $set: { archived_at: now } }
    );

    res.json({
      success: true,
      message: "Read notifications archived.",
      archivedCount: result.modifiedCount || 0,
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to archive read notifications." });
  }
};

