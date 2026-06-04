import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setToken } from '../services/apiClient';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get('displayName'));
    const password = String(form.get('password'));

    try {
      setError(null);
      const response = await login(displayName, password);
      setToken(response.token);
      localStorage.setItem('wcb_display_name', response.user.displayName);
      if (response.user.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <section className="card narrow">
      <h2>Log In</h2>
      <p>Sign in with the username and password your organiser gave you.</p>
      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Username
          <input required name="displayName" type="text" placeholder="Your name" maxLength={40} />
        </label>
        <label>
          Password
          <input
            required
            name="password"
            maxLength={128}
            type="password"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="warning">{error}</p>}
        <button type="submit">Log In</button>
      </form>
    </section>
  );
}
