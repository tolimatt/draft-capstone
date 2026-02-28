import React, { useEffect, useState } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

const NotificationToggle = ({ icon: Icon, title, description, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#E6F2FF] flex items-center justify-center">
          <Icon size={20} className="text-[#017FE6]" />
        </div>

        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>

      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#017FE6] transition"></div>
        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
      </label>
    </div>
  );
};

const NotificationSettings = ({ user }) => {
  const [settings, setSettings] = useState({
    email: true,
    push: true,
    sms: false,
    booking: true,
    security: true,
  });

  // LOAD SAVED SETTINGS
  useEffect(() => {
    if (!user?.email) return;

    const saved = JSON.parse(localStorage.getItem("notificationSettings")) || {};
    if (saved[user.email]) {
      setSettings(saved[user.email]);
    }
  }, [user]);

  // SAVE ON CHANGE
  const updateSetting = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);

    const all = JSON.parse(localStorage.getItem("notificationSettings")) || {};
    all[user.email] = updated;
    localStorage.setItem("notificationSettings", JSON.stringify(all));
  };

 return (
  <div className="flex justify-center">
    <div className="bg-white rounded-xl shadow p-6 space-y-6 max-w-3xl w-full">

      {/* DELIVERY METHODS */}
      <div className="space-y-3">
        <NotificationToggle
          icon={Mail}
          title="Email Notifications"
          description="Receive updates via email"
          checked={settings.email}
          onChange={() => updateSetting("email")}
        />

        <NotificationToggle
          icon={Smartphone}
          title="Push Notifications"
          description="Get real-time alerts on your device"
          checked={settings.push}
          onChange={() => updateSetting("push")}
        />

        <NotificationToggle
          icon={MessageCircle}
          title="SMS Notifications"
          description="Receive important updates via SMS"
          checked={settings.sms}
          onChange={() => updateSetting("sms")}
        />
      </div>

      {/* NOTIFICATION TYPES */}
      <div className="pt-4 border-t space-y-3">
        <NotificationToggle
          icon={ShieldCheck}
          title="Security Alerts"
          description="Login attempts and password changes"
          checked={settings.security}
          onChange={() => updateSetting("security")}
        />

        <NotificationToggle
          icon={Bell}
          title="Booking Updates"
          description="Booking confirmations and reminders"
          checked={settings.booking}
          onChange={() => updateSetting("booking")}
        />
      </div>

    </div>
  </div>
);
};

export default NotificationSettings;