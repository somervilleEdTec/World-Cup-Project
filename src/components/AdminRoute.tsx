import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchAuthMe, getToken } from '../services/apiClient';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setAllowed(false);
      return;
    }
    void fetchAuthMe()
      .then((response) => setAllowed(response.user.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}
