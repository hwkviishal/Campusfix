import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { SeedAccount } from '../types';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Lock,
  Mail,
  UserCheck,
  Sparkles,
  KeyRound,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState<string>('student1@campusfix.edu');
  const [password, setPassword] = useState<string>('Student@123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seedAccounts, setSeedAccounts] = useState<SeedAccount[]>([]);

  // If already logged in, redirect to respective role dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = (location.state as any)?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        const dest =
          user.role === 'ADMIN'
            ? '/admin'
            : user.role === 'TECHNICIAN'
            ? '/technician'
            : '/student';
        navigate(dest, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location.state]);

  // Load seed accounts for easy testing
  useEffect(() => {
    apiService
      .getSeedInfo()
      .then((res) => {
        if (res.success && res.data.accounts) {
          setSeedAccounts(res.data.accounts);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedInUser = await login({ email: email.trim(), password });
      const dest =
        loggedInUser.role === 'ADMIN'
          ? '/admin'
          : loggedInUser.role === 'TECHNICIAN'
          ? '/technician'
          : '/student';
      navigate(dest, { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Unable to log in. Please check your credentials.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectSeedAccount = (acc: SeedAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">CampusFix</span>
          </Link>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">Sign in to your account</h1>
          <p className="mt-1 text-xs text-slate-500">
            Access maintenance requests, technician work orders, or administration
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {errorMessage && (
            <div
              id="login-error-alert"
              className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Campus Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student1@campusfix.edu"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Seed Accounts for Instant Verification */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>One-Click Dev Accounts:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Phase 2 Verified</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  selectSeedAccount({
                    name: 'Admin',
                    email: 'admin@campusfix.edu',
                    password: 'Admin@123',
                    role: 'ADMIN',
                  })
                }
                className="px-2.5 py-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-lg text-xs transition-colors"
              >
                <div className="font-semibold text-slate-800">Admin</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">admin@campusfix.edu</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  selectSeedAccount({
                    name: 'Electrician',
                    email: 'tech.electric@campusfix.edu',
                    password: 'Tech@123',
                    role: 'TECHNICIAN',
                  })
                }
                className="px-2.5 py-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-lg text-xs transition-colors"
              >
                <div className="font-semibold text-slate-800">Technician</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">tech.electric@campusfix.edu</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  selectSeedAccount({
                    name: 'Plumber',
                    email: 'tech.plumb@campusfix.edu',
                    password: 'Tech@123',
                    role: 'TECHNICIAN',
                  })
                }
                className="px-2.5 py-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-lg text-xs transition-colors"
              >
                <div className="font-semibold text-slate-800">Tech (Plumbing)</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">tech.plumb@campusfix.edu</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  selectSeedAccount({
                    name: 'Student 1',
                    email: 'student1@campusfix.edu',
                    password: 'Student@123',
                    role: 'STUDENT',
                  })
                }
                className="px-2.5 py-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-lg text-xs transition-colors"
              >
                <div className="font-semibold text-slate-800">Student 1</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">student1@campusfix.edu</div>
              </button>
            </div>
          </div>

          <div className="pt-2 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              Register as Student
            </Link>
          </div>
        </div>

        {/* Back to System Console */}
        <div className="text-center">
          <Link
            to="/system"
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Return to Phase 1 & 2 System Monitor
          </Link>
        </div>
      </div>
    </div>
  );
};
