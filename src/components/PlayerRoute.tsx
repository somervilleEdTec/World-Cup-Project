import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchAuthMe } from '../services/apiClient';

export function PlayerRoute({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchAuthMe()
      .then((response) => setAllowed(!response.user.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
