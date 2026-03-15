import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import AdminProtectedRoute from './components/Layout/AdminProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage    from './pages/LoginPage';
import ChatPage     from './pages/ChatPage';
import StatusPage   from './pages/StatusPage';
import SettingsPage from './pages/SettingsPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPanelPage from './pages/AdminPanelPage';

export default function App() {
  const isAuthenticated = useAuthStore(s => !!s.isAuthenticated && !!s.user && !!s.accessToken);

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
