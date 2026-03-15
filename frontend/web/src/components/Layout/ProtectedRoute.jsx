import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore(s => !!s.isAuthenticated && !!s.user && !!s.accessToken);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
