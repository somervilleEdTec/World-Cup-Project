import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { fetchAuthMe, getToken } from '../services/apiClient';

/** Blocks app routes until a forced password change is completed. */
export function PasswordChangeGate() {
  const [mustChange, setMustChange] = useState<boolean | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setMustChange(false);
      return;
    }
    void fetchAuthMe()
      .then((response) => setMustChange(response.user.mustChangePassword))
      .catch(() => setMustChange(false));
  }, []);

  if (mustChange === null) return null;
  if (mustChange) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}
