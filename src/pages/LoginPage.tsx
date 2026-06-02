import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/');
  };

  return (
    <section className="card narrow">
      <h2>Log In</h2>
      <p>Sign in to manage your World Cup Boys picks.</p>
      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Email
          <input required type="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input required type="password" placeholder="••••••••" />
        </label>
        <button type="submit">Log In</button>
      </form>
    </section>
  );
}
