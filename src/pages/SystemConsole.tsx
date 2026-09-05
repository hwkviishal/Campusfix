import React, { useEffect, useState } from 'react';
import {
  Server,
  Database,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ShieldCheck,
  FolderTree,
  ArrowRight,
  Terminal,
  Cpu,
  UserCheck,
  KeyRound,
  ShieldAlert,
  LogOut,
  User,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { HealthResponse, SystemStatusResponse, SeedAccount } from '../types';
import { useAuth } from '../context/AuthContext';

export const SystemConsole: React.FC = () => {
  const { user, isAuthenticated, logout, login } = useAuth();
  const navigate = useNavigate();

  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [systemData, setSystemData] = useState<SystemStatusResponse | null>(null);
  const [seedAccounts, setSeedAccounts] = useState<SeedAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Interactive Test Suite State
  const [testEndpoint, setTestEndpoint] = useState<string>('/api/auth/me');
  const [testResponse, setTestResponse] = useState<string>('');
  const [testLoading, setTestLoading] = useState<boolean>(false);

  const fetchHealthAndStatus = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const [health, system, seedRes] = await Promise.all([
        apiService.getHealth(),
        apiService.getSystemStatus(),
        apiService.getSeedInfo().catch(() => ({ success: false, data: { accounts: [] } })),
      ]);
      const latency = Math.round(performance.now() - start);
      setHealthData(health);
      setSystemData(system);
      if (seedRes.data?.accounts) {
        setSeedAccounts(seedRes.data.accounts);
      }
      setPingLatency(latency);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Error contacting backend:', err);
      setError(err.response?.data?.message || err.message || 'Unable to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndStatus();
    const interval = setInterval(() => {
      fetchHealthAndStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const runTest = async (
    type: 'me' | 'admin' | 'technician' | 'student' | 'my-complaints' | 'create-test-complaint'
  ) => {
    setTestLoading(true);
    setTestEndpoint(
      type === 'me'
        ? '/api/auth/me'
        : type === 'my-complaints'
        ? '/api/complaints/my'
        : type === 'create-test-complaint'
        ? 'POST /api/complaints'
        : `/api/auth/role-test/${type}`
    );
    try {
      let data: any;
      if (type === 'me') {
        data = await apiService.getMe();
      } else if (type === 'my-complaints') {
        data = await apiService.getMyComplaints();
      } else if (type === 'create-test-complaint') {
        data = await apiService.createComplaint({
          title: `Diagnostic test issue lodged at ${new Date().toLocaleTimeString()}`,
          description: 'Automated verification test ticket created from System Console.',
          category: 'ELECTRICAL',
          priority: 'MEDIUM',
          building: 'Academic Block A',
          floor: '2',
          room: '204',
        });
      } else {
        data = await apiService.testRoleAccess(type);
      }
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResponse(
        JSON.stringify(
          {
            status: err.response?.status || 500,
            error: err.response?.data || err.message,
          },
          null,
          2
        )
      );
    } finally {
      setTestLoading(false);
    }
  };

  const quickSwitch = async (acc: SeedAccount) => {
    try {
      await login({ email: acc.email, password: acc.password });
      const dest =
        acc.role === 'ADMIN'
          ? '/admin'
          : acc.role === 'TECHNICIAN'
          ? '/technician'
          : '/student';
      navigate(dest);
    } catch (err: any) {
      alert('Login error: ' + (err.message || 'Failed'));
    }
  };

  const phases = [
    { num: 1, title: 'Project Setup & MongoDB Connection', status: 'completed', desc: 'MERN bootstrap, Express server, Mongoose setup, Vite middleware, typed environment config' },
    { num: 2, title: 'Database Models & Authentication', status: 'completed', desc: 'Mongoose schemas (User, Department), bcrypt hashing, JWT auth, HTTP-only cookies, requireAuth, requireRole RBAC' },
    { num: 3, title: 'Complaint CRUD & Student Dashboard', status: 'completed', desc: 'Complaint Mongoose model, status history lifecycle, student CRUD, location hierarchy, status timeline' },
    { num: 4, title: 'Admin & Technician Workflows', status: 'completed', desc: 'Admin complaint management, technician roster, task assignment, and technician execution lifecycle' },
    { num: 5, title: 'Secure Image Uploads (Cloudinary)', status: 'completed', desc: 'Secure multipart file streaming, magic-byte MIME validation, student evidence & technician resolution galleries' },
    { num: 6, title: 'Student Verification, Closure & Ratings', status: 'next', desc: 'Student ticket resolution verification, dispute/reopen flow, star rating & feedback submission' },
    { num: 7, title: 'Socket.IO Real-Time Notifications', status: 'pending', desc: 'Live event-driven alerts for task assignment, status changes, and student verification' },
    { num: 8, title: 'Search, Filtering & Pagination', status: 'pending', desc: 'Server-side category, priority, location, and date multi-filter engine' },
    { num: 9, title: 'AI Complaint Classification', status: 'pending', desc: 'Gemini-assisted category, priority, and summary recommendations' },
    { num: 10, title: 'Security Hardening & Production Polish', status: 'pending', desc: 'Rate limiting, Helmet, seed data, and deployment readiness' },
  ];

  return (
    <div id="app-root" className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      {/* Dark Navy Minimal Utility Sidebar */}
      <aside
        id="main-sidebar"
        className="w-64 bg-[#0F172A] flex flex-col fixed inset-y-0 left-0 z-40 hidden lg:flex"
      >
        {/* Brand Logo & Name */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800/60">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-xl tracking-tight leading-none">CampusFix</span>
              <span className="text-[10px] text-blue-400 font-medium tracking-wider uppercase mt-1">Utility Console</span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <Link
            to="/system"
            className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl font-medium text-sm transition-colors"
          >
            <Activity className="w-5 h-5" />
            <span>Telemetry & Status</span>
          </Link>

          <a
            href="#auth-test-suite"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-xl text-sm transition-colors"
          >
            <KeyRound className="w-5 h-5" />
            <span>Phase 2 Auth Suite</span>
          </a>

          <a
            href="#architecture-overview"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-xl text-sm transition-colors"
          >
            <FolderTree className="w-5 h-5" />
            <span>Architecture & Tree</span>
          </a>

          <a
            href="#phases-roadmap"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-xl text-sm transition-colors"
          >
            <Layers className="w-5 h-5" />
            <span>Phase Milestones</span>
          </a>
        </nav>

        {/* Auth Quick Links in Sidebar */}
        <div className="px-4 py-3 mx-4 mb-3 rounded-xl bg-slate-800/70 border border-slate-700/60 text-slate-300 text-xs space-y-2">
          <div className="font-semibold text-slate-200">Role Portals:</div>
          <div className="flex flex-col gap-1 text-[11px]">
            <Link to="/student" className="text-blue-400 hover:underline">→ /student Portal</Link>
            <Link to="/technician" className="text-amber-400 hover:underline">→ /technician Portal</Link>
            <Link to="/admin" className="text-purple-400 hover:underline">→ /admin Portal</Link>
          </div>
        </div>

        {/* Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0F172A]">
          {isAuthenticated && user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  {user.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                  <div className="text-[10px] text-blue-400 font-mono">{user.role}</div>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="text-slate-400 hover:text-red-400 p-1 rounded"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold text-center block transition-colors"
            >
              Sign In to Session
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden lg:pl-64">
        {/* Top Header */}
        <header
          id="main-header"
          className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8"
        >
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-slate-900">CampusFix</span>
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-700">
              MERN Infrastructure & Phase 2 Authentication Suite
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Database Pill */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  healthData?.data.database.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
              <span className="font-medium">
                DB: {healthData?.data.database.connected ? 'Connected' : 'Connecting...'}
              </span>
              {pingLatency !== null && <span className="text-slate-400">({pingLatency}ms)</span>}
            </div>

            {/* Current Auth Status Pill */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <span className="font-semibold">{user.name.split(' ')[0]}</span>
                <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-mono font-bold">
                  {user.role}
                </span>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Sign In
              </Link>
            )}

            {/* Test Ping Button */}
            <button
              id="refresh-btn"
              onClick={fetchHealthAndStatus}
              disabled={loading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <main id="main-content" className="p-4 sm:p-8 space-y-8 flex-1">
          {/* Top Utility Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500 font-medium">Phase 2 Status</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 flex items-center justify-between">
                <span>Auth Active</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </h3>
              <div className="mt-2 flex items-center text-xs text-emerald-600 font-bold">
                <span>JWT + HTTP-Only Cookies</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500 font-medium">Database Models</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 truncate">
                User & Dept
              </h3>
              <div className="mt-2 flex items-center text-xs text-blue-600 font-bold">
                <span>Mongoose Schemas + Seed Data</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500 font-medium">RBAC Security</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900">
                3 Roles
              </h3>
              <div className="mt-2 flex items-center text-xs text-emerald-600 font-bold">
                <span>STUDENT • TECH • ADMIN</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500 font-medium">Current Session</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 truncate">
                {isAuthenticated && user ? user.role : 'Guest / None'}
              </h3>
              <div className="mt-2 flex items-center text-xs text-blue-600 font-bold">
                <span>{isAuthenticated && user ? user.email : 'Click "Sign In" to authenticate'}</span>
              </div>
            </div>
          </div>

          {/* Error Alert if any */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Connection Alert</p>
                <p className="mt-0.5 text-xs text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Interactive Phase 2 Auth Test Suite */}
          <section
            id="auth-test-suite"
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900">Phase 2 Authentication & RBAC Test Console</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Test live JWT verification, HTTP-only session cookies, and role-based permissions directly in the browser
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  Go to Login Page
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
                >
                  Go to Register Page
                </Link>
              </div>
            </div>

            {/* Test Action Buttons */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-700">Test Backend Route Authorization:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => runTest('me')}
                  disabled={testLoading}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>GET /api/auth/me</span>
                </button>
                <button
                  onClick={() => runTest('student')}
                  disabled={testLoading}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Test Student Role (requireRole('STUDENT'))</span>
                </button>
                <button
                  onClick={() => runTest('technician')}
                  disabled={testLoading}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Test Technician Role (requireRole('TECHNICIAN'))</span>
                </button>
                <button
                  onClick={() => runTest('admin')}
                  disabled={testLoading}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Test Admin Role (requireRole('ADMIN'))</span>
                </button>
                <button
                  onClick={() => runTest('my-complaints')}
                  disabled={testLoading}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>GET /api/complaints/my</span>
                </button>
                <button
                  onClick={() => runTest('create-test-complaint')}
                  disabled={testLoading}
                  className="px-3.5 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>POST /api/complaints (Test Issue)</span>
                </button>
              </div>
            </div>

            {/* Live Response Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Endpoint: {testEndpoint}</span>
                <span>{testLoading ? 'Requesting...' : 'Live Output'}</span>
              </div>
              <pre className="bg-[#0F172A] text-emerald-400 rounded-xl p-4 font-mono text-xs overflow-x-auto h-40 overflow-y-auto border border-slate-800">
                {testResponse || '// Click any test button above to verify authorization response...'}
              </pre>
            </div>

            {/* Seed Accounts One-Click Table */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Development Seed Accounts (Instant Switch):</span>
                <span className="text-[10px] text-slate-400 font-mono">1 Admin • 2 Technicians • 5 Students</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Password</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {seedAccounts.map((acc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-medium text-slate-900">{acc.name}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              acc.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : acc.role === 'TECHNICIAN'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {acc.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-700">{acc.email}</td>
                        <td className="p-3 font-mono text-slate-400">{acc.password}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => quickSwitch(acc)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded text-xs font-semibold transition-colors"
                          >
                            Log In & Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Architecture Layout & System Status Dual Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Project & Directory Layout */}
            <div
              id="architecture-overview"
              className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <FolderTree className="w-5 h-5 text-blue-600" />
                  <span>Full-Stack Architecture & Directory Tree</span>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md uppercase">
                  Phase 2 Active
                </span>
              </div>

              <div className="bg-[#0F172A] text-slate-200 rounded-xl p-4 font-mono text-xs space-y-1 overflow-x-auto border border-slate-800">
                <div className="text-blue-400 font-bold">campusfix/</div>
                <div className="pl-4 text-emerald-400">├── server/</div>
                <div className="pl-8 text-slate-300">├── models/</div>
                <div className="pl-12 text-emerald-400">├── User.ts (bcrypt pre-save, comparePassword, safe toJSON)</div>
                <div className="pl-12 text-emerald-400">└── Department.ts (Mongoose model & unique codes)</div>
                <div className="pl-8 text-slate-300">├── middleware/</div>
                <div className="pl-12 text-emerald-400">├── authMiddleware.ts (requireAuth, JWT verification)</div>
                <div className="pl-12 text-emerald-400">├── roleMiddleware.ts (requireRole: STUDENT/TECH/ADMIN)</div>
                <div className="pl-12 text-slate-400">└── errorHandler.ts (Centralized JSON error handler)</div>
                <div className="pl-8 text-slate-300">├── controllers/</div>
                <div className="pl-12 text-emerald-400">└── authController.ts (register, login, logout, me)</div>
                <div className="pl-8 text-slate-300">├── routes/</div>
                <div className="pl-12 text-emerald-400">├── auth.ts (/api/auth/register, /login, /logout, /me)</div>
                <div className="pl-12 text-slate-400">└── health.ts (/api/health, /api/system/status)</div>
                <div className="pl-8 text-slate-300">└── services/</div>
                <div className="pl-12 text-emerald-400">├── authService.ts (JWT sign/verify, HTTP-only cookie)</div>
                <div className="pl-12 text-emerald-400">└── seedService.ts (1 Admin, 2 Techs, 5 Students)</div>
                <div className="pl-4 text-cyan-400">├── src/ (Client Frontend)</div>
                <div className="pl-8 text-slate-300">├── context/</div>
                <div className="pl-12 text-emerald-400">└── AuthContext.tsx (user, login, register, logout, session)</div>
                <div className="pl-8 text-slate-300">├── components/</div>
                <div className="pl-12 text-emerald-400">└── ProtectedRoute.tsx (RBAC client guard)</div>
                <div className="pl-8 text-slate-300">├── pages/</div>
                <div className="pl-12 text-emerald-400">├── LoginPage.tsx</div>
                <div className="pl-12 text-emerald-400">├── RegisterPage.tsx</div>
                <div className="pl-12 text-emerald-400">├── StudentDashboard.tsx (/student)</div>
                <div className="pl-12 text-emerald-400">├── TechnicianDashboard.tsx (/technician)</div>
                <div className="pl-12 text-emerald-400">└── AdminDashboard.tsx (/admin)</div>
                <div className="pl-4 text-amber-400">├── server.ts (Express entry point + Vite middleware)</div>
                <div className="pl-4 text-slate-400">└── .env.example (JWT_SECRET, MONGODB_URI)</div>
              </div>
            </div>

            {/* Right: Dark System Status Utility Card */}
            <div
              id="system-status-card"
              className="bg-[#1E293B] rounded-2xl shadow-lg p-6 text-white flex flex-col justify-between"
            >
              <div>
                <h2 className="font-bold text-sm text-slate-400 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Diagnostics</span>
                </h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-300">
                      <span>Server Uptime</span>
                      <span className="font-mono text-blue-400">{healthData?.data.uptimeSeconds ?? 0}s</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full w-[100%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-300">
                      <span>Database State</span>
                      <span className="font-mono text-emerald-400 uppercase">{healthData?.data.database.state || 'connected'}</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full w-[100%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-300">
                      <span>Environment</span>
                      <span className="font-mono text-slate-300 uppercase">{healthData?.data.environment || 'development'}</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full w-[75%]"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-700/60 mt-6">
                <div className="text-xs text-slate-400 mb-2">Connected Database Host:</div>
                <div className="text-xs font-mono bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700/50 text-slate-200 truncate">
                  {healthData?.data.database.host || '127.0.0.1'} / {healthData?.data.database.databaseName || 'campusfix'}
                </div>
              </div>
            </div>
          </div>

          {/* 10-Phase Implementation Roadmap Tracker */}
          <section
            id="phases-roadmap"
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">CampusFix Phased Implementation Tracker</h2>
                <p className="text-xs text-slate-500 mt-0.5">Structured delivery following enterprise SaaS architecture</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md uppercase">
                  Phase 1 & 2 Verified
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {phases.map((p) => {
                const isDone = p.status === 'completed';
                const isNext = p.status === 'next';
                return (
                  <div
                    key={p.num}
                    className={`p-5 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isNext
                        ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-300'
                        : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : isNext
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-300 text-slate-700'
                          }`}
                        >
                          {p.num}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-900">{p.title}</h3>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : isNext
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isDone ? 'Completed' : isNext ? 'Up Next' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2.5 pl-8 leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        {/* Minimal Footer */}
        <footer id="main-footer" className="bg-white border-t border-slate-200 py-5 px-4 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>CampusFix &copy; 2026 • Campus Maintenance & Issue-Tracking System</div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-emerald-600">Phase 2 Online</span>
              <span>JWT Authentication</span>
              <span>RBAC Protected</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
