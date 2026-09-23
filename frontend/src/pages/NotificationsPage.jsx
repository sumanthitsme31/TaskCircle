import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import StatusBlock from '../components/StatusBlock';

export default function NotificationsPage({ refreshShell }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/notifications');
      setNotifications(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const readOne = async (id) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
    await load();
    refreshShell();
  };

  const readAll = async () => {
    await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
    await load();
    refreshShell();
  };

  return (
    <article className="card">
      <div className="row">
        <h3>Notifications</h3>
        <button onClick={readAll} type="button">Mark all as read</button>
      </div>
      <StatusBlock loading={loading} error={error} hasData={notifications.length > 0} emptyMessage="No notifications yet.">
        <ul className="list">
          {notifications.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.type}</strong>
                <p>{item.message}</p>
              </div>
              {!item.is_read && <button onClick={() => readOne(item.id)} type="button">Mark read</button>}
            </li>
          ))}
        </ul>
      </StatusBlock>
    </article>
  );
}
