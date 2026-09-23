import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

export default function ProfilePage({ user, onRefresh }) {
  const [name, setName] = useState(user?.name || '');
  const [prefs, setPrefs] = useState({ due_today_enabled: true, due_tomorrow_enabled: true, overdue_enabled: true });
  const [loadedPrefs, setLoadedPrefs] = useState(false);

  useEffect(() => {
    apiRequest('/api/profile/notification-preferences')
      .then((data) => setPrefs(data))
      .finally(() => setLoadedPrefs(true));
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    await apiRequest('/api/profile', { method: 'PATCH', body: JSON.stringify({ name }) });
    onRefresh();
  };

  const savePrefs = async (event) => {
    event.preventDefault();
    await apiRequest('/api/profile/notification-preferences', { method: 'PATCH', body: JSON.stringify(prefs) });
  };

  return (
    <section className="grid">
      <article className="card">
        <h3>Profile</h3>
        <form className="stack" onSubmit={saveProfile}>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <button type="submit">Save profile</button>
        </form>
      </article>
      <article className="card">
        <h3>Notification Preferences</h3>
        <form className="stack" onSubmit={savePrefs}>
          <label><input type="checkbox" checked={prefs.due_today_enabled} onChange={(e) => setPrefs({ ...prefs, due_today_enabled: e.target.checked })} /> Due today</label>
          <label><input type="checkbox" checked={prefs.due_tomorrow_enabled} onChange={(e) => setPrefs({ ...prefs, due_tomorrow_enabled: e.target.checked })} /> Due tomorrow</label>
          <label><input type="checkbox" checked={prefs.overdue_enabled} onChange={(e) => setPrefs({ ...prefs, overdue_enabled: e.target.checked })} /> Overdue</label>
          <button type="submit">Save preferences</button>
        </form>
      </article>
    </section>
  );
}
