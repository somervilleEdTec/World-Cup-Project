import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getToken } from '../services/apiClient';

const baseLinks = [
  { to: '/', label: 'Welcome' },
  { to: '/my-picks', label: 'My Picks' },
  { to: '/league-table', label: 'League Table' },
  { to: '/comparison', label: 'Comparison' },
  { to: '/rules', label: 'Rules' }
];

export function AppLayout() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('wcb_display_name');
    if (stored) setDisplayName(stored);
  }, []);

  const isAdmin = localStorage.getItem('wcb_is_admin') === '1';
  const links = isAdmin ? [...baseLinks, { to: '/admin', label: 'Admin' }] : baseLinks;

  const logout = () => {
    localStorage.removeItem('wcb_token');
    localStorage.removeItem('wcb_display_name');
    localStorage.removeItem('wcb_is_admin');
    setDisplayName(null);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>World Cup Boys</h1>
          <p className="tagline">Welcome to the Shiva Bowl</p>
          {displayName && <p className="kicker">Signed in as {displayName}</p>}
        </div>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className="nav-btn">
              {link.label}
            </NavLink>
          ))}
          <button type="button" className="nav-btn" onClick={logout}>
            Log out
          </button>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className="mobile-nav-btn">
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
