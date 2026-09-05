import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  Wrench,
  LogOut,
  Cpu,
  ChevronRight,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';

interface TechnicianLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const TechnicianLayout: React.FC<TechnicianLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/technician', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/technician/tasks', label: 'My Assigned Tasks', icon: CheckSquare, exact: false },
    { to: '/system', label: 'System Console', icon: Cpu, exact: false },
  ];

  const isCurrentActive = (itemTo: string, exact: boolean) => {
    if (exact) {
      return location.pathname === itemTo;
    }
    return location.pathname.startsWith(itemTo);
  };

  const departmentName =
    typeof user?.department === 'object' && user?.department !== null
      ? user.department.name
      : 'Facilities Maintenance';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-slate-800 antialiased">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-white shadow-xs">
            CF
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight">CampusFix</span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 rounded">
              Technician
            </span>
          </div>
        </div>
        <button
          id="tech-mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 select-none z-20`}
      >
        {/* Brand Banner */}
        <div className="hidden md:flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center font-bold text-white text-base shadow-sm ring-2 ring-amber-500/30">
            CF
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white tracking-tight">CampusFix</span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                Staff
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Field Maintenance Portal</p>
          </div>
        </div>

        {/* Technician Identity Card */}
        <div className="p-4 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-750/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-900/60 border border-amber-500/30 flex items-center justify-center font-semibold text-amber-300 text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Technician'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-700/60 text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Department:</span>
              <span className="text-amber-300 font-medium truncate max-w-[120px] text-right">
                {departmentName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <UserCheck className="w-3 h-3" /> Active on Duty
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Task Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.to, item.exact);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={`tech-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-amber-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 text-amber-200" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            id="tech-logout-button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top bar with Breadcrumbs / Actions */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2.5">{actions}</div>}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
