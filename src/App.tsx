import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationToast } from './components/NotificationToast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { MyComplaintsPage } from './pages/MyComplaintsPage';
import { ComplaintDetailsPage } from './pages/ComplaintDetailsPage';
import { TechnicianDashboard } from './pages/TechnicianDashboard';
import { TechnicianTasksPage } from './pages/TechnicianTasksPage';
import { TechnicianTaskDetailsPage } from './pages/TechnicianTaskDetailsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';
import { AdminComplaintDetailsPage } from './pages/AdminComplaintDetailsPage';
import { AdminTechniciansPage } from './pages/AdminTechniciansPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SystemConsole } from './pages/SystemConsole';
import { RefreshCw } from 'lucide-react';

/**
 * Root Index Redirector
 * Intelligently routes authenticated users to their corresponding dashboard
 * or redirects guests to /login
 */
function RootIndex() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-slate-700">
        <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm font-medium">Starting CampusFix session...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'TECHNICIAN') {
      return <Navigate to="/technician" replace />;
    }
    return <Navigate to="/student" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <NotificationToast />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/" element={<RootIndex />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Notifications Activity History (All Authenticated Roles) */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'TECHNICIAN', 'ADMIN']}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Role-Aware Portals */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/report"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <ReportIssuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/complaints"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <MyComplaintsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <ComplaintDetailsPage />
              </ProtectedRoute>
            }
          />
          {/* Technician Protected Routes */}
          <Route
            path="/technician"
            element={
              <ProtectedRoute allowedRoles={['TECHNICIAN', 'ADMIN']}>
                <TechnicianDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technician/tasks"
            element={
              <ProtectedRoute allowedRoles={['TECHNICIAN', 'ADMIN']}>
                <TechnicianTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technician/tasks/:id"
            element={
              <ProtectedRoute allowedRoles={['TECHNICIAN', 'ADMIN']}>
                <TechnicianTaskDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminComplaintsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminComplaintDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/technicians"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminTechniciansPage />
              </ProtectedRoute>
            }
          />

          {/* Phase 1 & 2 System Monitor & Test Suite */}
          <Route path="/system" element={<SystemConsole />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
  );
}
