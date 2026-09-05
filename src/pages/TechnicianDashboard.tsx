import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TechnicianLayout } from '../components/TechnicianLayout';
import { apiService } from '../services/api';
import { TechnicianDashboardData, Complaint } from '../types';
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
} from '../components/ComplaintBadges';
import { ResolveTaskModal } from '../components/ResolveTaskModal';
import {
  Wrench,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  CheckSquare,
  RefreshCw,
  Eye,
  MapPin,
  Building,
  User,
} from 'lucide-react';

export const TechnicianDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TechnicianDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [resolveTarget, setResolveTarget] = useState<Complaint | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'critical' | 'recent'>('pending');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getTechnicianDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load technician dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleStartTask = async (complaintId: string) => {
    setActionLoading(complaintId);
    try {
      const res = await apiService.startTechnicianTask(complaintId);
      if (res.success) {
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start task');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolved = (updated: Complaint) => {
    fetchDashboardData();
  };

  if (loading && !data) {
    return (
      <TechnicianLayout title="Technician Workspace" subtitle="Active maintenance assignments">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
          <p className="text-sm font-medium">Loading assigned maintenance work orders...</p>
        </div>
      </TechnicianLayout>
    );
  }

  if (error && !data) {
    return (
      <TechnicianLayout title="Technician Workspace" subtitle="Active maintenance assignments">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-semibold text-red-800">{error}</p>
          <button
            id="tech-retry-dashboard-btn"
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold"
          >
            Retry Loading
          </button>
        </div>
      </TechnicianLayout>
    );
  }

  const stats = data?.statistics || {
    assignedTasks: 0,
    pendingTasks: 0,
    inProgress: 0,
    resolved: 0,
  };

  const metricCards = [
    {
      id: 'stat-tech-total',
      label: 'All Assigned Tasks',
      value: stats.assignedTasks,
      icon: CheckSquare,
      color: 'text-slate-800',
      bg: 'bg-slate-100',
    },
    {
      id: 'stat-tech-pending',
      label: 'Pending Pickup (ASSIGNED)',
      value: stats.pendingTasks,
      icon: Clock,
      color: 'text-purple-700',
      bg: 'bg-purple-50 border-purple-200',
    },
    {
      id: 'stat-tech-in-progress',
      label: 'Currently In Progress',
      value: stats.inProgress,
      icon: Wrench,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    },
    {
      id: 'stat-tech-resolved',
      label: 'Completed & Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
    },
  ];

  const pendingComplaints =
    data?.recentAssignments.filter((c) => c.status === 'ASSIGNED') || [];
  const criticalComplaints = data?.criticalTasks || [];
  const recentComplaints = data?.recentAssignments || [];

  const getActiveTabComplaints = () => {
    switch (activeTab) {
      case 'critical':
        return criticalComplaints;
      case 'recent':
        return recentComplaints;
      case 'pending':
      default:
        return pendingComplaints.length > 0 ? pendingComplaints : recentComplaints;
    }
  };

  const currentList = getActiveTabComplaints();

  return (
    <TechnicianLayout
      title="Field Maintenance Console"
      subtitle="Your active service assignments and diagnostic queues"
      actions={
        <div className="flex items-center gap-2">
          <button
            id="tech-refresh-btn"
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Orders</span>
          </button>
          <Link
            to="/technician/tasks"
            id="tech-view-all-tasks-btn"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <span>My Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                id={card.id}
                className={`p-5 rounded-2xl border text-left transition-all ${card.bg}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">{card.label}</span>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className={`text-3xl font-bold tracking-tight ${card.color}`}>
                  {card.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Task Queue Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 px-6 pt-4 pb-0 bg-slate-50/50 gap-3">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
              <button
                id="tech-tab-pending"
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
                  activeTab === 'pending'
                    ? 'border-amber-600 text-amber-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending Pickup</span>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full">
                  {pendingComplaints.length}
                </span>
              </button>

              <button
                id="tech-tab-critical"
                onClick={() => setActiveTab('critical')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
                  activeTab === 'critical'
                    ? 'border-red-600 text-red-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-red-600" />
                <span>Critical / Emergency</span>
                <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[10px] rounded-full">
                  {criticalComplaints.length}
                </span>
              </button>

              <button
                id="tech-tab-recent"
                onClick={() => setActiveTab('recent')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
                  activeTab === 'recent'
                    ? 'border-slate-800 text-slate-800 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-slate-600" />
                <span>All Assigned Tasks</span>
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
                  {recentComplaints.length}
                </span>
              </button>
            </div>

            <div className="pb-3 text-xs text-slate-500">
              Assigned specifically to your technical specialization
            </div>
          </div>

          {/* List of Tasks */}
          <div className="divide-y divide-slate-100">
            {currentList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
                <p className="font-semibold text-slate-600">Queue is clear</p>
                <p className="text-slate-400 text-[11px]">No active work orders pending in this section.</p>
              </div>
            ) : (
              currentList.map((task) => {
                const isAssigned = task.status === 'ASSIGNED';
                const isInProgress = task.status === 'IN_PROGRESS';
                const isResolved = task.status === 'RESOLVED' || task.status === 'VERIFIED' || task.status === 'CLOSED';

                return (
                  <div
                    key={task._id}
                    id={`tech-task-${task._id}`}
                    className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={task.status} size="sm" />
                        <PriorityBadge priority={task.priority} size="sm" />
                        <CategoryBadge category={task.category} size="sm" />
                        <span className="text-[11px] font-mono text-slate-400">
                          #{task._id.slice(-6).toUpperCase()}
                        </span>
                      </div>

                      <Link
                        to={`/technician/tasks/${task._id}`}
                        className="font-semibold text-sm text-slate-900 hover:text-amber-600 block transition-colors"
                      >
                        {task.title}
                      </Link>

                      <p className="text-xs text-slate-600 line-clamp-1">
                        {task.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="font-medium text-slate-600">
                          📍 {task.building}, Floor {task.floor}, {task.room}
                        </span>
                        <span>•</span>
                        <span>
                          👤 Student: {typeof task.reportedBy === 'object' ? task.reportedBy?.name : 'Student'}
                        </span>
                        <span>•</span>
                        <span>
                          📅 Assigned: {task.assignedAt ? new Date(task.assignedAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons for Technician Workflow */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {isAssigned && (
                        <button
                          id={`start-task-btn-${task._id}`}
                          onClick={() => handleStartTask(task._id)}
                          disabled={actionLoading === task._id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === task._id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>Start Task</span>
                        </button>
                      )}

                      {isInProgress && (
                        <button
                          id={`resolve-task-btn-${task._id}`}
                          onClick={() => setResolveTarget(task)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolve Task</span>
                        </button>
                      )}

                      {isResolved && (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}

                      <Link
                        to={`/technician/tasks/${task._id}`}
                        id={`view-task-btn-${task._id}`}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                        title="View Full Task Dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      <ResolveTaskModal
        complaint={resolveTarget}
        isOpen={Boolean(resolveTarget)}
        onClose={() => setResolveTarget(null)}
        onResolved={handleResolved}
      />
    </TechnicianLayout>
  );
};
