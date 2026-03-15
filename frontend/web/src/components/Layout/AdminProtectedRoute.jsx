import { Navigate, Outlet } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';

export default function AdminProtectedRoute() {
  const hasHydrated = useAdminStore(s => s.hasHydrated);
  const isAuthed = useAdminStore(s => !!s.admin && !!s.token);
  if (!hasHydrated) return null;
  return isAuthed ? <Outlet /> : <Navigate to="/admin/login" replace />;
}
