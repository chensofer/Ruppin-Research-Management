import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import CelebrationBanner from './components/CelebrationBanner';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import ApprovalsPage from './pages/ApprovalsPage';
import AttendancePage from './pages/AttendancePage';
import MyReportsPage from './pages/MyReportsPage';
import ProfilePage from './pages/ProfilePage';
import ComparisonPage from './pages/ComparisonPage';
import ArchivePage from './pages/ArchivePage';
import HistoryPage from './pages/HistoryPage';
import UsersPage from './pages/UsersPage';

// Redirects research assistants to their attendance page; secretaries stay in the app
function RoleAwareRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (user.systemAuthorization === 'עוזר מחקר') return <Navigate to="/attendance" replace />;
  return children;
}

// Only accessible by מזכירות
function SecretaryRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.systemAuthorization !== 'מזכירות') return <Navigate to="/dashboard" replace />;
  return children;
}

function ThemedToaster() {
  const { dark } = useTheme();
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: dark ? {
          background: '#1C2536',
          color: '#EAF1FB',
          border: '1px solid #2A3A50',
        } : undefined,
      }}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <CelebrationBanner />
      <ThemedToaster />
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — role-aware redirect for assistants */}
          <Route path="/dashboard" element={
            <RoleAwareRoute><DashboardPage /></RoleAwareRoute>
          } />
          <Route path="/projects/:id" element={
            <RoleAwareRoute><ProjectPage /></RoleAwareRoute>
          } />
          <Route path="/comparison" element={
            <RoleAwareRoute><ComparisonPage /></RoleAwareRoute>
          } />
          <Route path="/archive" element={
            <RoleAwareRoute><ArchivePage /></RoleAwareRoute>
          } />
          <Route path="/approvals" element={
            <RoleAwareRoute><ApprovalsPage /></RoleAwareRoute>
          } />
          <Route path="/history" element={
            <RoleAwareRoute><HistoryPage /></RoleAwareRoute>
          } />

          {/* Attendance — only for research assistants */}
          <Route path="/attendance" element={
            <ProtectedRoute><AttendancePage /></ProtectedRoute>
          } />
          <Route path="/my-reports" element={
            <ProtectedRoute><MyReportsPage /></ProtectedRoute>
          } />

          {/* Users management — secretary only */}
          <Route path="/users" element={
            <SecretaryRoute><UsersPage /></SecretaryRoute>
          } />

          {/* Profile — all authenticated users */}
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
