import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function ProtectedRoute() {
  const hasHydrated = useAuthStore(s => s.hasHydrated);
  const isAuthenticated = useAuthStore(s => !!s.isAuthenticated && !!s.user && !!s.accessToken);
  if (!hasHydrated) return null;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
