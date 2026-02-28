import React, { useEffect, useState } from "react";
import {
  Shield,
  Lock,
  LogIn,
  BadgeCheck,
  Calendar,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react";

const iconMap = {
  security: <Shield size={18} className="text-[#017FE6]" />,
  auth: <LogIn size={18} className="text-green-600" />,
  verification: <BadgeCheck size={18} className="text-purple-600" />,
};

const ActivityLogs = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  // LOAD LOGS
  const loadLogs = () => {
    if (!user?.email) return;

    const allLogs =
      JSON.parse(localStorage.getItem("activityLogs")) || [];

    const filtered = (allLogs[user.email] || []).filter(
      (log) => (showArchived ? log.archived : !log.archived)
    );

    setLogs(filtered);
  };

  useEffect(() => {
    loadLogs();
  }, [user, showArchived]);

  // ARCHIVE / RESTORE
  const updateLog = (id, archived) => {
    const allLogs =
      JSON.parse(localStorage.getItem("activityLogs")) || {};

    const updated = (allLogs[user.email] || []).map((log) =>
      log.id === id ? { ...log, archived } : log
    );

    allLogs[user.email] = updated;
    localStorage.setItem("activityLogs", JSON.stringify(allLogs));

    loadLogs();
  };

  // CLEAR ALL
  const clearAllLogs = () => {
    if (!window.confirm("Clear all activity logs?")) return;

    const allLogs =
      JSON.parse(localStorage.getItem("activityLogs")) || {};

    allLogs[user.email] = [];
    localStorage.setItem("activityLogs", JSON.stringify(allLogs));
    setLogs([]);
  };

  // EMPTY STATE
  if (!logs.length) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <Calendar size={36} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500 text-sm">
          {showArchived
            ? "No archived logs."
            : "No activity logs available yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="text-sm font-medium text-[#017FE6] hover:underline"
        >
          {showArchived ? "← Back to Activity Logs" : "View Archived Logs"}
        </button>

        {!showArchived && (
          <button
            onClick={clearAllLogs}
            className="flex items-center gap-2 text-sm text-red-500 hover:underline"
          >
            <Trash2 size={16} />
            Clear all
          </button>
        )}
      </div>

      {/* LOG LIST */}
      {logs
        .slice()
        .reverse()
        .map((log) => (
          <div
            key={log.id}
            className="flex justify-between items-start gap-4 border rounded-xl p-5 bg-white shadow-sm"
          >
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                {iconMap[log.type] || <Lock size={18} />}
              </div>

              <div>
                <p className="font-semibold text-base">
                  {log.action}
                </p>
                <p className="text-sm text-gray-500">
                  {log.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {log.date}
                </p>
              </div>
            </div>

            {/* ACTION */}
            {showArchived ? (
              <button
                onClick={() => updateLog(log.id, false)}
                className="text-gray-400 hover:text-green-600"
                title="Restore log"
              >
                <RotateCcw size={18} />
              </button>
            ) : (
              <button
                onClick={() => updateLog(log.id, true)}
                className="text-gray-400 hover:text-[#017FE6]"
                title="Archive log"
              >
                <Archive size={18} />
              </button>
            )}
          </div>
        ))}
    </div>
  );
};

export default ActivityLogs;