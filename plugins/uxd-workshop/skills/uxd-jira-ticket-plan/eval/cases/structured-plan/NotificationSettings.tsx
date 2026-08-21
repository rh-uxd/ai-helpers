import { useEffect, useState } from 'react';
import { getNotificationPrefs, saveNotificationPrefs } from './notifications';

type Prefs = {
  emailEnabled: boolean;
};

export const NotificationSettings = () => {
  const [prefs, setPrefs] = useState<Prefs>({ emailEnabled: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationPrefs().then(setPrefs);
  }, []);

  const onToggleEmail = async () => {
    const next = { emailEnabled: !prefs.emailEnabled };
    setPrefs(next);
    setSaving(true);
    await saveNotificationPrefs(next);
    setSaving(false);
  };

  return (
    <form>
      <h1>Notification settings</h1>
      <label>
        <input
          type="checkbox"
          checked={prefs.emailEnabled}
          onChange={onToggleEmail}
          disabled={saving}
        />
        Email alerts
      </label>
    </form>
  );
};
