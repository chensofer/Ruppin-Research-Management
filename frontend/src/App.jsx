import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import ApprovalsPage from './pages/ApprovalsPage';
import AttendancePage from './pages/AttendancePage';
import ProfilePage from './pages/ProfilePage';

// Redirects research assistants to their attendance page
function RoleAwareRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.systemAuthorization === 'עוזר מחקר') return <Navigate to="/attendance" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
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
          <Route path="/approvals" element={
            <RoleAwareRoute><ApprovalsPage /></RoleAwareRoute>
          } />

          {/* Attendance — only for research assistants */}
          <Route path="/attendance" element={
            <ProtectedRoute><AttendancePage /></ProtectedRoute>
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
  );
}
