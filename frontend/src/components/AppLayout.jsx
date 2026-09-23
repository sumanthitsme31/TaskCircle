import { Link, Outlet, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';

export default function AppLayout({ user, unreadCount, onRefresh }) {
  const navigate = useNavigate();

  const logout = async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    navigate('/login');
  };

  return (
    <div className="shell">
      <nav className="sidebar">
        <h2>TaskCircle</h2>
        <Link to="/app">Dashboard</Link>
        <Link to="/app/my-tasks">My Tasks</Link>
        <Link to="/app/notifications">Notifications ({unreadCount})</Link>
        <Link to="/app/profile">Profile</Link>
        <button onClick={logout} type="button">Logout</button>
      </nav>
      <main className="content">
        <header className="topbar">
          <div>
            <strong>{user?.name}</strong>
            <p>{user?.email}</p>
          </div>
          <button onClick={onRefresh} type="button">Refresh</button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
