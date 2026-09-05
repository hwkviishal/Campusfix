import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-slate-700">
        <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm font-medium">Verifying authenticated session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted (403)</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your authenticated account (<span className="font-semibold text-slate-800">{user.email}</span>) has the role of{' '}
            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-mono font-bold">
              {user.role}
            </span>
            . This route requires one of: <span className="font-mono text-blue-600 font-bold">{allowedRoles.join(', ')}</span>.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <a
              href={`/${user.role.toLowerCase()}`}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Your Dashboard
            </a>
            <button
              onClick={() => logout()}
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
