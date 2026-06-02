import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../services/apiClient';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
