# Fixture Design -- Notifications Panel

Task context: User views and manages application notifications.

## Screen: Notifications Drawer

- Slide-out drawer from right edge, triggered by bell icon in masthead
- Header: "Notifications" title with unread count badge, "Mark all read" link
- Notification list: each item shows icon (info/warning/danger/success), title, timestamp, read/unread dot
- Clicking a notification navigates to the relevant page and marks it as read
- "Clear all" button at bottom of list
- Notifications grouped by date: Today, Yesterday, Earlier

## Screen: Notification Preferences

- Accessed from gear icon in drawer header
- Toggle switches for each notification category: System alerts, User mentions, Task updates
- "Email digest" dropdown: Never, Daily, Weekly
- Save button at bottom
