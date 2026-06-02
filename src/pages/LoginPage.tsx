import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, setToken } from '../services/apiClient';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    const displayName = String(form.get('displayName') ?? 'Player');

    try {
      setError(null);
      if (mode === 'register') {
        await register(email, password, displayName);
      }
      const response = await login(email, password);
      setToken(response.token);
      localStorage.setItem('wcb_display_name', response.user.displayName);
      localStorage.setItem('wcb_is_admin', response.user.isAdmin ? '1' : '0');
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <section className="card narrow">
      <h2>Log In</h2>
      <p>Sign in to manage your World Cup Boys picks.</p>
      <form onSubmit={onSubmit} className="form-grid">
        {mode === 'register' && (
          <label>
            Display name
            <input required name="displayName" type="text" placeholder="Shiva XI" />
          </label>
        )}
        <label>
          Email
          <input required name="email" type="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input required name="password" minLength={8} type="password" placeholder="••••••••" />
        </label>
        {error && <p className="warning">{error}</p>}
        <button type="submit">{mode === 'login' ? 'Log In' : 'Register & Log In'}</button>
      </form>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Already registered? Log in'}
      </button>
    </section>
  );
}
