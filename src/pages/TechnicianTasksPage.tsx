import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TechnicianLayout } from '../components/TechnicianLayout';
import { apiService } from '../services/api';
import { Complaint, ComplaintPagination } from '../types';
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
} from '../components/ComplaintBadges';
import { ResolveTaskModal } from '../components/ResolveTaskModal';
import {
  Search,
  RefreshCw,
  Eye,
  Play,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  AlertTriangle,
  Clock,
  Wrench,
  Camera,
} from 'lucide-react';

export const TechnicianTasksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'ALL');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [tasks, setTasks] = useState<Complaint[]>([]);
  const [pagination, setPagination] = useState<ComplaintPagination>({
    currentPage: 1,
    totalPages: 1,
    totalComplaints: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [resolveTarget, setResolveTarget] = useState<Complaint | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (status !== 'ALL') params.status = status;
      if (priority !== 'ALL') params.priority = priority;
      if (category !== 'ALL') params.category = category;

      const res = await apiService.getTechnicianTasks(params);
      if (res.success && res.data) {
        setTasks(res.data.tasks);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch technician tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, status, priority, category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTasks();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setPriority('ALL');
    setCategory('ALL');
    setPage(1);
    setSearchParams({});
  };

  const handleStartTask = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      const res = await apiService.startTechnicianTask(taskId);
      if (res.success && res.data?.complaint) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? res.data!.complaint : t))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start task');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolved = (updated: Complaint) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === updated._id ? updated : t))
    );
  };

  const activeFiltersCount =
    (status !== 'ALL' ? 1 : 0) +
    (priority !== 'ALL' ? 1 : 0) +
    (category !== 'ALL' ? 1 : 0) +
    (search ? 1 : 0);

  return (
    <TechnicianLayout
      title="My Assigned Tasks"
      subtitle="Complete list of campus service requests assigned to your queue"
      actions={
        <button
          id="tech-reload-tasks-btn"
          onClick={fetchTasks}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Search and Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="tech-task-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assigned tasks by title, location, description..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
            <button
              id="tech-search-btn"
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              Search
            </button>
            {activeFiltersCount > 0 && (
              <button
                id="tech-reset-filter-btn"
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear ({activeFiltersCount})</span>
              </button>
            )}
          </form>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
              <select
                id="tech-filter-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ASSIGNED">Assigned (Awaiting Pickup)</option>
                <option value="IN_PROGRESS">In Progress (Active Work)</option>
                <option value="RESOLVED">Resolved</option>
                <option value="VERIFIED">Verified</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Priority</label>
              <select
                id="tech-filter-priority"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
              <select
                id="tech-filter-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="INTERNET_WIFI">Internet / Wi-Fi</option>
                <option value="FURNITURE">Furniture</option>
                <option value="CLEANING">Cleaning</option>
                <option value="CLASSROOM_EQUIPMENT">Classroom Equipment</option>
                <option value="SECURITY">Security</option>
                <option value="TRANSPORT">Transport</option>
                <option value="HOSTEL">Hostel</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Issue Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned On</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                      <span>Loading your service tickets...</span>
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      No service tasks found in your assignment queue.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const isAssigned = task.status === 'ASSIGNED';
                    const isInProgress = task.status === 'IN_PROGRESS';
                    const isResolved = task.status === 'RESOLVED' || task.status === 'VERIFIED' || task.status === 'CLOSED';

                    return (
                      <tr
                        key={task._id}
                        id={`tech-task-row-${task._id}`}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-500 whitespace-nowrap">
                          #{task._id.slice(-6).toUpperCase()}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/technician/tasks/${task._id}`}
                              className="hover:text-amber-600 transition-colors line-clamp-1"
                            >
                              {task.title}
                            </Link>
                            {task.images && task.images.length > 0 && (
                              <span
                                title={`${task.images.length} student evidence photo(s)`}
                                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded"
                              >
                                <Camera className="w-2.5 h-2.5 text-slate-500" />
                                <span>{task.images.length}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-normal line-clamp-1">
                            {task.description}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PriorityBadge priority={task.priority} size="sm" />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <CategoryBadge category={task.category} size="sm" />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                          <div>{task.building}</div>
                          <div className="text-slate-400">Fl {task.floor} • {task.room}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={task.status} size="sm" />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                          {task.assignedAt ? new Date(task.assignedAt).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAssigned && (
                              <button
                                id={`row-start-${task._id}`}
                                onClick={() => handleStartTask(task._id)}
                                disabled={actionLoading === task._id}
                                className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-semibold transition-colors"
                              >
                                {actionLoading === task._id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Play className="w-3 h-3 fill-current" />
                                )}
                                <span>Start</span>
                              </button>
                            )}

                            {isInProgress && (
                              <button
                                id={`row-resolve-${task._id}`}
                                onClick={() => setResolveTarget(task)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Resolve</span>
                              </button>
                            )}

                            {isResolved && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                                Resolved
                              </span>
                            )}

                            <Link
                              to={`/technician/tasks/${task._id}`}
                              id={`row-view-${task._id}`}
                              title="View Task Dossier"
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing{' '}
              <strong className="text-slate-900">
                {tasks.length > 0 ? (pagination.currentPage - 1) * 10 + 1 : 0}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {Math.min(pagination.currentPage * 10, pagination.totalComplaints)}
              </strong>{' '}
              of <strong className="text-slate-900">{pagination.totalComplaints}</strong> tasks
            </div>

            <div className="flex items-center gap-2">
              <button
                id="tech-pagination-prev"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="px-2 font-medium text-slate-700">
                Page {pagination.currentPage} of {pagination.totalPages || 1}
              </span>

              <button
                id="tech-pagination-next"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
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
