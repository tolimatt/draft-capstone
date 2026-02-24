import React from "react";

const LogsActivity = () => {
  const activityLogs = [
    {
      id: 1,
      action: "New booking request",
      details: "Toyota Vios requested by Juan Dela Cruz",
      date: "Feb 20, 2026 • 2:30 PM",
      status: "Pending",
    },
    {
      id: 2,
      action: "Booking approved",
      details: "Booking for Honda Click approved",
      date: "Feb 20, 2026 • 3:10 PM",
      status: "Approved",
    },
    {
      id: 3,
      action: "Vehicle returned",
      details: "Toyota Vios returned successfully",
      date: "Feb 19, 2026 • 6:45 PM",
      status: "Completed",
    },
    {
      id: 4,
      action: "Payment received",
      details: "₱1,500 received for Yamaha Mio rental",
      date: "Feb 19, 2026 • 7:00 PM",
      status: "Paid",
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <h1>Activity Logs</h1>
      <p style={{ color: "#666" }}>
        Track all activities related to your listed vehicles
      </p>

      <div style={{ marginTop: "20px" }}>
        {activityLogs.map((log) => (
          <div
            key={log.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "12px",
              backgroundColor: "#fff",
            }}
          >
            <h3 style={{ margin: "0 0 6px 0" }}>{log.action}</h3>
            <p style={{ margin: "0 0 6px 0", color: "#555" }}>
              {log.details}
            </p>
            <small style={{ color: "#888" }}>{log.date}</small>

            <div style={{ marginTop: "8px" }}>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  backgroundColor:
                    log.status === "Pending"
                      ? "#fff3cd"
                      : log.status === "Approved"
                      ? "#d1e7dd"
                      : "#e2e3e5",
                  color:
                    log.status === "Pending"
                      ? "#856404"
                      : log.status === "Approved"
                      ? "#0f5132"
                      : "#41464b",
                }}
              >
                {log.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogsActivity;