import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { apiRequest } from './api/client';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CircleDetailPage from './pages/CircleDetailPage';
import MyTasksPage from './pages/MyTasksPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import './styles/app.css';

function ProtectedRoutes({ user, unreadCount, refresh, circles, circlesLoading, circlesError }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout user={user} unreadCount={unreadCount} onRefresh={refresh} />}>
        <Route index element={<DashboardPage circles={circles} loading={circlesLoading} error={circlesError} reload={refresh} />} />
        <Route path="circles/:circleId" element={<CircleDetailPage />} />
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="notifications" element={<NotificationsPage refreshShell={refresh} />} />
        <Route path="profile" element={<ProfilePage user={user} onRefresh={refresh} />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [circles, setCircles] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [circlesError, setCirclesError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setCirclesLoading(true);
    try {
      const [me, circleData, unread] = await Promise.all([
        apiRequest('/api/auth/me'),
        apiRequest('/api/circles').catch(() => []),
        apiRequest('/api/notifications/unread-count').catch(() => ({ unread_count: 0 }))
      ]);
      setUser(me);
      setCircles(circleData);
      setUnreadCount(unread.unread_count || 0);
      setCirclesError('');
    } catch {
      setUser(null);
      setCircles([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setCirclesLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  if (loading) {
    return <main className="centered"><p>Loading...</p></main>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/app" replace /> : <LoginPage />} />
        <Route path="/app/*" element={<ProtectedRoutes user={user} unreadCount={unreadCount} refresh={refresh} circles={circles} circlesLoading={circlesLoading} circlesError={circlesError} />} />
        <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
