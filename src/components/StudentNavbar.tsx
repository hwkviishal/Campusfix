import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  LogOut,
  Sliders,
} from 'lucide-react';

export const StudentNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/student/dashboard') {
      return location.pathname === '/student' || location.pathname === '/student/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-6">
        {/* Brand */}
        <Link to="/student/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-blue-500/30 group-hover:bg-blue-700 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg text-slate-900 tracking-tight">CampusFix</span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider hidden sm:inline-block">
              Student
            </span>
          </div>
        </Link>

        {/* Primary Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/student/dashboard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive('/student/dashboard')
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/student/complaints"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive('/student/complaints')
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            My Complaints
          </Link>
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <Link
          to="/student/report"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium px-3 sm:px-3.5 py-1.5 rounded-lg shadow-sm shadow-blue-600/20 transition-all hover:shadow"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report Issue</span>
        </Link>

        <Link
          to="/system"
          className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
          title="System Architecture & API Status"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>System Console</span>
        </Link>

        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center justify-center text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="hidden xl:block text-left text-xs leading-tight">
              <div className="font-semibold text-slate-800 truncate max-w-[120px]">
                {user?.name || 'Student'}
              </div>
              <div className="text-slate-400 text-[11px] truncate max-w-[120px]">
                {user?.email || 'student@campusfix.edu'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
