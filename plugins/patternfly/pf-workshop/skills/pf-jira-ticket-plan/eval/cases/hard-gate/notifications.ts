export type NotificationPrefs = {
  emailEnabled: boolean;
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const response = await fetch('/api/notifications');
  return response.json();
}

export async function saveNotificationPrefs(
  prefs: NotificationPrefs
): Promise<void> {
  await fetch('/api/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });
}
