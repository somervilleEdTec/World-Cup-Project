import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './components/AdminRoute';
import { AppLayout } from './components/AppLayout';
import { PasswordChangeGate } from './components/PasswordChangeGate';
import { PlayerRoute } from './components/PlayerRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminPage } from './pages/AdminPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { LeagueTablePage } from './pages/LeagueTablePage';
import { LoginPage } from './pages/LoginPage';
import { MyPicksPage } from './pages/MyPicksPage';
import { WelcomePage } from './pages/WelcomePage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PasswordChangeGate />
          </ProtectedRoute>
        }
      >
        <Route element={<AppLayout />}>
          <Route index element={<WelcomePage />} />
          <Route path="my-picks" element={<PlayerRoute><MyPicksPage /></PlayerRoute>} />
          <Route path="league-table" element={<LeagueTablePage />} />
          <Route path="comparison" element={<ComparisonPage />} />
          <Route path="statistics" element={<Navigate to="/comparison" replace />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
