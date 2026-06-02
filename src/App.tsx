import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminPage } from './pages/AdminPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { LeagueTablePage } from './pages/LeagueTablePage';
import { LoginPage } from './pages/LoginPage';
import { MyPicksPage } from './pages/MyPicksPage';
import { RulesPage } from './pages/RulesPage';
import { WelcomePage } from './pages/WelcomePage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<WelcomePage />} />
        <Route path="my-picks" element={<MyPicksPage />} />
        <Route path="league-table" element={<LeagueTablePage />} />
        <Route path="comparison" element={<ComparisonPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
