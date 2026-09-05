import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StudentNavbar } from '../components/StudentNavbar';
import { apiService } from '../services/api';
import { Complaint, ComplaintStats } from '../types';
import {
  CategoryBadge,
  PriorityBadge,
  StatusPill,
} from '../components/ComplaintBadges';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRight,
  ClipboardList,
  Wrench,
  Archive,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<ComplaintStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await apiService.getMyComplaints({ page: 1, limit: 5 });
        if (res.data) {
          setComplaints(res.data.complaints);
          setStats(res.data.stats);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard metrics.');
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const studentFirstName = user?.name ? user.name.split(' ')[0] : 'Student';

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900 flex flex-col">
      <StudentNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Service Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Good day, {studentFirstName} 👋
            </h1>
            <p className="text-sm text-slate-500 max-w-xl">
              Track your maintenance requests, monitor repair timelines, and report campus facility issues in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/student/report"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-600/25 transition-all hover:shadow cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report an Issue</span>
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Complaints */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Lodged
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : stats.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">All time reported tickets</p>
          </div>

          {/* Open */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Open
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-700 font-mono">
              {isLoading ? '...' : stats.open}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting staff assignment</p>
          </div>

          {/* In Progress */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                In Progress
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-700 font-mono">
              {isLoading ? '...' : stats.inProgress}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Under active maintenance</p>
          </div>

          {/* Resolved */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Resolved
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono">
              {isLoading ? '...' : stats.resolved}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Fixes completed & verified</p>
          </div>

          {/* Closed */}
          <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Closed
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Archive className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-700 font-mono">
              {isLoading ? '...' : stats.closed}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Archived maintenance records</p>
          </div>
        </div>

        {/* Recent Complaints Section */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Recent Issue Reports
              </h2>
              <p className="text-xs text-slate-500">Latest tickets filed from your student account</p>
            </div>
            <Link
              to="/student/complaints"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>View all ({stats.total})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading complaints...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">No complaints found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                You haven't reported any campus issues yet. Found a problem? Report it in 60 seconds.
              </p>
              <Link
                to="/student/report"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Report Issue</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {complaints.map((c) => {
                const id = c._id || c.id || '';
                const shortId = id.slice(-6).toUpperCase();
                return (
                  <Link
                    key={id}
                    to={`/student/complaints/${id}`}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          #{shortId}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {c.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>
                            {c.building}, Fl {c.floor} ({c.room})
                          </span>
                        </div>
                        <span>•</span>
                        <span className="font-mono text-[11px]">
                          {new Date(c.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <CategoryBadge category={c.category} size="sm" />
                      <PriorityBadge priority={c.priority} size="sm" />
                      <StatusPill status={c.status} size="sm" />
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all hidden sm:block ml-2" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Tips / Lifecycle Guide */}
        <div className="bg-slate-50/75 border border-slate-200 rounded-xl p-5 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-slate-700 mb-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>CampusFix Resolution Lifecycle</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-900 block mb-0.5">1. Report Issue</span>
              <p className="text-[11px] text-slate-500">Log location, category, and urgency</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-900 block mb-0.5">2. Staff Routing</span>
              <p className="text-[11px] text-slate-500">Dispatched to electrical, plumbing, or IT</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-900 block mb-0.5">3. Technician Repair</span>
              <p className="text-[11px] text-slate-500">Live work order status updates</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-900 block mb-0.5">4. Quality Verify</span>
              <p className="text-[11px] text-slate-500">Inspection verified and ticket archived</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
