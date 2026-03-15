import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from './store/authStore';
import { useAdminStore } from './store/adminStore';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import AdminProtectedRoute from './components/Layout/AdminProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage    from './pages/LoginPage';
import ChatPage     from './pages/ChatPage';
import StatusPage   from './pages/StatusPage';
import SettingsPage from './pages/SettingsPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPanelPage from './pages/AdminPanelPage';
import adminApi from './utils/adminApi';
import { API_BASE_URL } from './utils/runtimeConfig';

export default function App() {
  const authHydrated = useAuthStore(s => s.hasHydrated);
  const user = useAuthStore(s => s.user);
  const accessToken = useAuthStore(s => s.accessToken);
  const isAuthenticated = useAuthStore(s => !!s.isAuthenticated && !!s.user && !!s.accessToken);
  const setAuth = useAuthStore(s => s.setAuth);
  const setAccessToken = useAuthStore(s => s.setAccessToken);
  const logout = useAuthStore(s => s.logout);

  const adminHydrated = useAdminStore(s => s.hasHydrated);
  const admin = useAdminStore(s => s.admin);
  const adminToken = useAdminStore(s => s.token);
  const setAdmin = useAdminStore(s => s.setAdmin);
  const clearAdminAuth = useAdminStore(s => s.clearAdminAuth);

  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (!authHydrated) return;

    let cancelled = false;

    async function bootstrapUserSession() {
      if (user && accessToken) {
        if (!cancelled) setSessionReady(true);
        return;
      }

      try {
        const refresh = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
        const newAccessToken = refresh.data?.accessToken;
        if (!newAccessToken) throw new Error('Missing refreshed access token');

        setAccessToken(newAccessToken);
        const me = await axios.get(`${API_BASE_URL}/users/me`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${newAccessToken}` },
        });

        setAuth(me.data.user, newAccessToken);
      } catch {
        logout();
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    }

    bootstrapUserSession();
    return () => { cancelled = true; };
  }, [authHydrated, user, accessToken, setAuth, setAccessToken, logout]);

  useEffect(() => {
    if (!adminHydrated) return;
    if (!admin || !adminToken) return;

    adminApi.get('/admin-auth/me')
      .then(({ data }) => {
        if (data?.admin) setAdmin(data.admin);
      })
      .catch(() => {
        clearAdminAuth();
      });
  }, [adminHydrated, admin, adminToken, setAdmin, clearAdminAuth]);

  if (!authHydrated || !adminHydrated || !sessionReady) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminPanelPage />} />
        </Route>
        <Route path="/login"   element={isAuthenticated ? <Navigate to="/chats" replace /> : <LoginPage />} />
        <Route path="/signup"   element={isAuthenticated ? <Navigate to="/chats" replace /> : <LoginPage />} />
        <Route path="/forgot-password"   element={isAuthenticated ? <Navigate to="/chats" replace /> : <LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/chats"    element={<ChatPage />} />
          <Route path="/chats/:id" element={<ChatPage />} />
          <Route path="/status"   element={<StatusPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/join/:code" element={<ChatPage />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? '/chats' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
