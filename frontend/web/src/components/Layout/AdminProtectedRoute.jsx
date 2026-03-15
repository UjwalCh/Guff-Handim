import { Navigate, Outlet } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';

export default function AdminProtectedRoute() {
  const isAuthed = useAdminStore(s => !!s.admin && !!s.token);
  return isAuthed ? <Outlet /> : <Navigate to="/admin/login" replace />;
}
