import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
