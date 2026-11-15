import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Navbar } from './components/layout/Navbar';
import { LoginPage } from './pages/auth/LoginPage';
import { DoctorWorkspace } from './pages/doctor/DoctorWorkspace';
import { DoctorCompletedPage } from './pages/doctor/DoctorCompletedPage';
import { ReceptionPage } from './pages/nurse/ReceptionPage';
import { ClinicRoomsPage } from './pages/nurse/ClinicRoomsPage';
import { QueueAssignPage } from './pages/nurse/QueueAssignPage';
import { PatientsDirectoryPage } from './pages/patients/PatientsDirectoryPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';

// Component điều hướng trang chủ theo quyền (Role)
const RootRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'DOCTOR':
      return <Navigate to="/doctor/workspace" replace />;
    case 'NURSE':
      return <Navigate to="/nurse/reception" replace />;
    case 'ADMIN':
      return <Navigate to="/admin/users" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Component kiểm tra phân quyền cho từng Route
interface RoleRouteProps {
  allowedRoles: Array<'ADMIN' | 'DOCTOR' | 'NURSE'>;
  children: React.ReactElement;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role as any)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Layout dùng chung cho các màn hình yêu cầu xác thực
const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!['ADMIN', 'DOCTOR', 'NURSE'].includes(user.role)) {
    logout();
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-chrome-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

// Public Route: nếu đã đăng nhập thì tự động vào hệ thống, không ở lại trang login
const PublicOnlyRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <RootRedirect />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />

        {/* Protected App Routes */}
        <Route element={<ProtectedLayout />}>
          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Doctor Routes */}
          <Route
            path="/doctor/workspace"
            element={
              <RoleRoute allowedRoles={['DOCTOR']}>
                <DoctorWorkspace />
              </RoleRoute>
            }
          />
          <Route
            path="/doctor/completed"
            element={
              <RoleRoute allowedRoles={['DOCTOR']}>
                <DoctorCompletedPage />
              </RoleRoute>
            }
          />

          {/* Nurse Routes */}
          <Route
            path="/nurse/reception"
            element={
              <RoleRoute allowedRoles={['NURSE']}>
                <ReceptionPage />
              </RoleRoute>
            }
          />
          <Route
            path="/nurse/rooms"
            element={
              <RoleRoute allowedRoles={['NURSE']}>
                <ClinicRoomsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/nurse/queue"
            element={
              <RoleRoute allowedRoles={['NURSE']}>
                <QueueAssignPage />
              </RoleRoute>
            }
          />

          {/* Shared Routes */}
          <Route
            path="/patients"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE']}>
                <PatientsDirectoryPage />
              </RoleRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/users"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <UserManagementPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <AuditLogPage />
              </RoleRoute>
            }
          />
        </Route>

        {/* Fallback cho tất cả các đường dẫn không hợp lệ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
