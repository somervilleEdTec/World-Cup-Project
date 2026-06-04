import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchAuthMe, getToken } from '../services/apiClient';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'ok' | 'login'>('loading');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus('login');
      return;
    }
    void fetchAuthMe()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('login'));
  }, []);

  if (status === 'loading') return null;
  if (status === 'login') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
