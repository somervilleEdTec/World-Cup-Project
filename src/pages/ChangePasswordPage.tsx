import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../services/apiClient';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get('currentPassword'));
    const newPassword = String(form.get('newPassword'));
    const confirmPassword = String(form.get('confirmPassword'));

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setError(null);
      await changePassword(currentPassword, newPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password');
    }
  };

  return (
    <section className="card narrow">
      <h2>Choose your password</h2>
      <p>
        Your organiser created your account with a temporary password. Choose your own password
        (1–6 characters) before you continue.
      </p>
      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Current password
          <input
            required
            name="currentPassword"
            type="password"
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <input
            required
            name="newPassword"
            maxLength={6}
            type="password"
            autoComplete="new-password"
            placeholder="1–6 characters"
          />
        </label>
        <label>
          Confirm new password
          <input
            required
            name="confirmPassword"
            maxLength={6}
            type="password"
            autoComplete="new-password"
          />
        </label>
        {error && <p className="warning">{error}</p>}
        <button type="submit">Save password and continue</button>
      </form>
    </section>
  );
}
