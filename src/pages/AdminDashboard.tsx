import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { apiService } from '../services/api';
import { AdminDashboardData, Complaint } from '../types';
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
} from '../components/ComplaintBadges';
import { AssignTechnicianModal } from '../components/AssignTechnicianModal';
import { UpdatePriorityModal } from '../components/UpdatePriorityModal';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Layers,
  ArrowRight,
  Flame,
  ShieldAlert,
  Search,
  UserCheck,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  CheckCheck,
  Building,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [assignTarget, setAssignTarget] = useState<Complaint | null>(null);
  const [priorityTarget, setPriorityTarget] = useState<Complaint | null>(null);
  const [activeTab, setActiveTab] = useState<'unassigned' | 'critical' | 'attention' | 'recent'>('unassigned');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getAdminDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAssignUpdated = (updated: Complaint) => {
    // Refresh to keep all stats and lists synchronized
    fetchDashboardData();
  };

  const handlePriorityUpdated = (updated: Complaint) => {
    fetchDashboardData();
  };

  if (loading && !data) {
    return (
      <AdminLayout title="Admin Overview" subtitle="Campus Facilities Management & Operations">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium">Loading real-time facilities telemetry...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error && !data) {
    return (
      <AdminLayout title="Admin Overview" subtitle="Campus Facilities Management & Operations">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-semibold text-red-800">{error}</p>
          <button
            id="admin-dashboard-retry-btn"
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700"
          >
            Retry Loading
          </button>
        </div>
      </AdminLayout>
    );
  }

  const stats = data?.statistics || {
    total: 0,
    open: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    verified: 0,
    closed: 0,
    critical: 0,
  };

  const metricCards = [
    {
      id: 'stat-total',
      label: 'Total Tickets',
      value: stats.total,
      icon: Layers,
      color: 'text-slate-800',
      bg: 'bg-slate-100',
      filter: undefined,
    },
    {
      id: 'stat-open',
      label: 'Open (Unassigned)',
      value: stats.open,
      icon: Clock,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
      filter: 'OPEN',
    },
    {
      id: 'stat-assigned',
      label: 'Assigned',
      value: stats.assigned,
      icon: UserCheck,
      color: 'text-purple-700',
      bg: 'bg-purple-50 border-purple-200',
      filter: 'ASSIGNED',
    },
    {
      id: 'stat-in-progress',
      label: 'In Progress',
      value: stats.inProgress,
      icon: Wrench,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      filter: 'IN_PROGRESS',
    },
    {
      id: 'stat-resolved',
      label: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      filter: 'RESOLVED',
    },
    {
      id: 'stat-critical',
      label: 'Critical Triage',
      value: stats.critical,
      icon: Flame,
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
      priorityFilter: 'CRITICAL',
    },
  ];

  const getActiveTabComplaints = () => {
    switch (activeTab) {
      case 'unassigned':
        return data?.unassignedComplaints || [];
      case 'critical':
        return data?.criticalComplaints || [];
      case 'attention':
        return data?.attentionRequired || [];
      case 'recent':
      default:
        return data?.recentComplaints || [];
    }
  };

  const activeComplaints = getActiveTabComplaints();

  return (
    <AdminLayout
      title="Facilities Operations Command"
      subtitle="Real-time campus maintenance monitoring & technician dispatch"
      actions={
        <div className="flex items-center gap-2">
          <button
            id="admin-refresh-telemetry-btn"
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/complaints"
            id="admin-view-all-complaints-btn"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <span>All Complaints</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                id={card.id}
                onClick={() => {
                  if (card.priorityFilter) {
                    navigate(`/admin/complaints?priority=${card.priorityFilter}`);
                  } else if (card.filter) {
                    navigate(`/admin/complaints?status=${card.filter}`);
                  } else {
                    navigate('/admin/complaints');
                  }
                }}
                className={`p-4 rounded-xl border text-left transition-all hover:shadow-xs hover:-translate-y-0.5 ${card.bg}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">{card.label}</span>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className={`text-2xl font-bold tracking-tight ${card.color}`}>
                  {card.value}
                </div>
              </button>
            );
          })}
        </div>

        {/* Actionable Triage Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Section Tabs Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 px-6 pt-4 pb-0 bg-slate-50/50 gap-3">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
              <button
                id="tab-unassigned"
                onClick={() => setActiveTab('unassigned')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
                  activeTab === 'unassigned'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Unassigned</span>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full">
                  {data?.unassignedComplaints.length || 0}
                </span>
              </button>

              <button
                id="tab-critical"
                onClick={() => setActiveTab('critical')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
                  activeTab === 'critical'
                    ? 'border-red-600 text-red-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-red-600" />
                <span>Critical Priority</span>
                <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[10px] rounded-full">
                  {data?.criticalComplaints.length || 0}
                </span>
              </button>

              <button
                id="tab-attention"
                onClick={() => setActiveTab('attention')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
                  activeTab === 'attention'
                    ? 'border-amber-600 text-amber-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Attention Required</span>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full">
                  {data?.attentionRequired.length || 0}
                </span>
              </button>

              <button
                id="tab-recent"
                onClick={() => setActiveTab('recent')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
                  activeTab === 'recent'
                    ? 'border-slate-800 text-slate-800 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                <span>Recent Logged</span>
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
                  {data?.recentComplaints.length || 0}
                </span>
              </button>
            </div>

            <div className="pb-3 text-xs text-slate-500">
              Showing active triage queues for dispatch operations
            </div>
          </div>

          {/* Tab Content List */}
          <div className="divide-y divide-slate-100">
            {activeComplaints.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <CheckCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
                <p className="font-semibold text-slate-600">No issues in this queue</p>
                <p className="text-slate-400 text-[11px]">All matching complaints have been triaged or addressed.</p>
              </div>
            ) : (
              activeComplaints.map((complaint) => {
                const isAssigned = Boolean(complaint.assignedTo);
                const assignedName =
                  typeof complaint.assignedTo === 'object' && complaint.assignedTo !== null
                    ? complaint.assignedTo.name
                    : null;
                const deptName =
                  typeof complaint.department === 'object' && complaint.department !== null
                    ? complaint.department.name
                    : 'Facilities';

                return (
                  <div
                    key={complaint._id}
                    id={`complaint-row-${complaint._id}`}
                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={complaint.status} size="sm" />
                        <PriorityBadge priority={complaint.priority} size="sm" />
                        <CategoryBadge category={complaint.category} size="sm" />
                        <span className="text-[11px] text-slate-400">
                          #{complaint._id.slice(-6).toUpperCase()}
                        </span>
                      </div>

                      <Link
                        to={`/admin/complaints/${complaint._id}`}
                        className="font-semibold text-sm text-slate-900 hover:text-blue-600 block transition-colors"
                      >
                        {complaint.title}
                      </Link>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        {complaint.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span>
                          📍 {complaint.building}, Floor {complaint.floor}, {complaint.room}
                        </span>
                        <span>•</span>
                        <span>🏢 {deptName}</span>
                        <span>•</span>
                        <span>
                          👤 {typeof complaint.reportedBy === 'object' ? complaint.reportedBy?.name : 'Student'}
                        </span>
                        <span>•</span>
                        <span>🕒 {new Date(complaint.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Quick Action Controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {isAssigned ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg text-xs font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span className="truncate max-w-[130px]">{assignedName}</span>
                        </div>
                      ) : (
                        <button
                          id={`assign-btn-${complaint._id}`}
                          onClick={() => setAssignTarget(complaint)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Assign Tech</span>
                        </button>
                      )}

                      <button
                        id={`reassign-btn-${complaint._id}`}
                        onClick={() => setAssignTarget(complaint)}
                        title="Reassign Technician"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </button>

                      <button
                        id={`priority-btn-${complaint._id}`}
                        onClick={() => setPriorityTarget(complaint)}
                        title="Change Priority"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>

                      <Link
                        to={`/admin/complaints/${complaint._id}`}
                        id={`view-details-${complaint._id}`}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                        title="View Details"
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

      {/* Modals */}
      <AssignTechnicianModal
        complaint={assignTarget}
        isOpen={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        onAssigned={handleAssignUpdated}
      />

      <UpdatePriorityModal
        complaint={priorityTarget}
        isOpen={Boolean(priorityTarget)}
        onClose={() => setPriorityTarget(null)}
        onUpdated={handlePriorityUpdated}
      />
    </AdminLayout>
  );
};
