import React from "react";

interface Notification {
  id: string;
  message: string;
  read: boolean;
}

export function NotificationPanel({
  notifications,
  onDismiss,
  onMarkRead,
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const [filter, setFilter] = React.useState("");

  const filtered = notifications.filter((n) =>
    n.message.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div role="region">
      <h2>Notifications</h2>
      <input
        type="text"
        placeholder="Search..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul>
        {filtered.map((n) => (
          <li key={n.id} style={{ fontWeight: n.read ? "normal" : "bold" }}>
            <span>{n.message}</span>
            <button onClick={() => onMarkRead(n.id)}>
              <svg viewBox="0 0 16 16">
                <path d="M13.5 2L6 9.5 2.5 6" />
              </svg>
            </button>
            <button onClick={() => onDismiss(n.id)}>
              <svg viewBox="0 0 16 16">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && <p>No notifications found</p>}
    </div>
  );
}
