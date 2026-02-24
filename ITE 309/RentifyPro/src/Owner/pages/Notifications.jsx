import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Car,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

/* OWNER NOTIFICATIONS */
const initialNotifications = [
  {
    id: 1,
    type: "booking",
    title: "New Booking Request",
    message: "Maria Santos requested Toyota Camry 2024 (2 days).",
    time: "5 minutes ago",
    unread: true,
    icon: Car,
  },
  {
    id: 2,
    type: "payment",
    title: "Payment Received",
    message: "₱3,000 downpayment received for Booking #BKG-1004.",
    time: "1 hour ago",
    unread: true,
    icon: CheckCircle,
  },
  {
    id: 3,
    type: "review",
    title: "New Review",
    message: "Juan Dela Cruz left a 5⭐ review on Honda Click 160.",
    time: "Yesterday",
    unread: false,
    icon: MessageSquare,
  },
  {
  id: 4,
  type: "system",
  title: "Booking Cancelled",
  message:
    "Maria Santos cancelled Booking #BKG-1002. The reserved vehicle is now available for new bookings.",
  time: "2 days ago",
  unread: false,
  icon: ShieldAlert,
}
];

const TYPE_TABS = ["all", "booking", "payment", "review", "system"];

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeType, setActiveType] = useState("all");

  /* MARK ONE AS READ */
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, unread: false } : n
      )
    );
  };

  /* MARK ALL AS READ */
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, unread: false }))
    );
  };

  /* FILTER BY TYPE */
  const filteredNotifications =
    activeType === "all"
      ? notifications
      : notifications.filter((n) => n.type === activeType);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          onClick={markAllAsRead}
          className="text-sm text-blue-600 hover:underline"
        >
          Mark all as read
        </button>
      </div>

      {/* TYPE TABS */}
      <div className="flex gap-2">
        {TYPE_TABS.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-1.5 rounded-full text-sm ${
              activeType === type
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {type === "all"
              ? "All"
              : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="bg-white rounded-xl shadow divide-y">
        {filteredNotifications.length === 0 && (
          <p className="p-6 text-center text-gray-500">
            No notifications found.
          </p>
        )}

        {filteredNotifications.map((notif) => (
          <div
            key={notif.id}
            onClick={() => markAsRead(notif.id)}
            className={`flex gap-4 p-4 cursor-pointer ${
              notif.unread ? "bg-blue-50" : "bg-white"
            } hover:bg-gray-50`}
          >
            {/* ICON */}
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                notif.unread
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <notif.icon className="w-5 h-5" />
            </div>

            {/* CONTENT */}
            <div className="flex-1">
              <div className="flex justify-between">
                <h2 className="font-semibold">{notif.title}</h2>
                <span className="text-xs text-gray-400">{notif.time}</span>
              </div>

              <p className="text-sm text-gray-600 mt-1">
                {notif.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}