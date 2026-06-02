import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Welcome' },
  { to: '/my-picks', label: 'My Picks' },
  { to: '/league-table', label: 'League Table' },
  { to: '/comparison', label: 'Comparison' },
  { to: '/admin', label: 'Admin' }
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>World Cup Boys</h1>
          <p className="tagline">Welcome to the Shiva Bowl</p>
        </div>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className="nav-btn">
              {link.label}
            </NavLink>
          ))}
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
