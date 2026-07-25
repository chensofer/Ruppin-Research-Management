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
import HelpPage from './pages/HelpPage';

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

// Only for researchers / center managers — blocks assistants AND secretaries
function ResearcherOnlyRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (user.systemAuthorization === 'עוזר מחקר') return <Navigate to="/attendance" replace />;
  if (user.systemAuthorization === 'מזכירות') return <Navigate to="/approvals" replace />;
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
            <ResearcherOnlyRoute><DashboardPage /></ResearcherOnlyRoute>
          } />
          <Route path="/projects/:id" element={
            <ResearcherOnlyRoute><ProjectPage /></ResearcherOnlyRoute>
          } />
          <Route path="/comparison" element={
            <ResearcherOnlyRoute><ComparisonPage /></ResearcherOnlyRoute>
          } />
          <Route path="/archive" element={
            <ResearcherOnlyRoute><ArchivePage /></ResearcherOnlyRoute>
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

          {/* Help — all authenticated users */}
          <Route path="/help" element={
            <ProtectedRoute><HelpPage /></ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
