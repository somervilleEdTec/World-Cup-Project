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
    const displayName = String(form.get('displayName'));
    const password = String(form.get('password'));
    const joinPassword = String(form.get('joinPassword') ?? '');

    try {
      setError(null);
      if (mode === 'register') {
        await register(displayName, password, joinPassword);
      }
      const response = await login(displayName, password);
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
      <h2>{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>
      <p>Sign in to manage your World Cup Boys predictions.</p>
      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Name
          <input required name="displayName" type="text" placeholder="Shiva XI" maxLength={40} />
        </label>
        <label>
          Password
          <input
            required
            name="password"
            maxLength={6}
            type="password"
            placeholder="Up to 6 characters"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {mode === 'register' && (
          <label>
            Sign-up password
            <input
              required
              name="joinPassword"
              type="password"
              placeholder="Ask the organiser"
              autoComplete="off"
            />
          </label>
        )}
        {error && <p className="warning">{error}</p>}
        <button type="submit">{mode === 'login' ? 'Log In' : 'Register & Log In'}</button>
      </form>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Already registered? Log in'}
      </button>
    </section>
  );
}
