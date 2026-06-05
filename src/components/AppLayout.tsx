import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken, fetchAuthMe } from '../services/apiClient';

const baseLinks = [
  { to: '/', label: 'Welcome', mobileLabel: 'Home' },
  { to: '/my-picks', label: 'My Predictions', mobileLabel: 'Predict' },
  { to: '/league-table', label: 'League Table', mobileLabel: 'Table' },
  { to: '/comparison', label: 'Comparison', mobileLabel: 'Compare' }
];

export function AppLayout() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('wcb_display_name');
    if (stored) setDisplayName(stored);
    void fetchAuthMe()
      .then((response) => {
        setDisplayName(response.user.displayName);
        setIsAdmin(response.user.isAdmin);
        localStorage.setItem('wcb_display_name', response.user.displayName);
      })
      .catch(() => setIsAdmin(false));
  }, []);

  const links = (isAdmin
    ? baseLinks.filter((link) => link.to !== '/my-picks')
    : baseLinks
  ).concat(isAdmin ? [{ to: '/admin', label: 'Admin', mobileLabel: 'Admin' }] : []);

  const logout = () => {
    clearToken();
    localStorage.removeItem('wcb_display_name');
    setDisplayName(null);
    setIsAdmin(false);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>World Cup Boys</h1>
          <p className="tagline">World Cup Predictions</p>
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
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'mobile-nav-btn active' : 'mobile-nav-btn')}
          >
            <span className="mobile-nav-label">{link.mobileLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
