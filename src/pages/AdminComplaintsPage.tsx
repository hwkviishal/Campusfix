import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { apiService } from '../services/api';
import { Complaint, ComplaintPagination, ComplaintPriority, ComplaintStatus } from '../types';
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
} from '../components/ComplaintBadges';
import { AssignTechnicianModal } from '../components/AssignTechnicianModal';
import { UpdatePriorityModal } from '../components/UpdatePriorityModal';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  UserCheck,
  Wrench,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building,
  CheckCircle2,
  X,
} from 'lucide-react';

export const AdminComplaintsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // State initialized from URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'ALL');
  const [assigned, setAssigned] = useState(searchParams.get('assigned') || 'ALL');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pagination, setPagination] = useState<ComplaintPagination>({
    currentPage: 1,
    totalPages: 1,
    totalComplaints: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [assignTarget, setAssignTarget] = useState<Complaint | null>(null);
  const [priorityTarget, setPriorityTarget] = useState<Complaint | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        limit: 10,
        sortBy,
      };
      if (search.trim()) params.search = search.trim();
      if (status !== 'ALL') params.status = status;
      if (category !== 'ALL') params.category = category;
      if (priority !== 'ALL') params.priority = priority;
      if (assigned !== 'ALL') params.assigned = assigned;

      const res = await apiService.getAllComplaintsAdmin(params);
      if (res.success && res.data) {
        setComplaints(res.data.complaints);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [page, status, category, priority, assigned, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setCategory('ALL');
    setPriority('ALL');
    setAssigned('ALL');
    setSortBy('newest');
    setPage(1);
    setSearchParams({});
  };

  const handleAssignUpdated = (updated: Complaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c._id === updated._id ? updated : c))
    );
  };

  const handlePriorityUpdated = (updated: Complaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c._id === updated._id ? updated : c))
    );
  };

  const activeFiltersCount =
    (status !== 'ALL' ? 1 : 0) +
    (category !== 'ALL' ? 1 : 0) +
    (priority !== 'ALL' ? 1 : 0) +
    (assigned !== 'ALL' ? 1 : 0) +
    (search ? 1 : 0);

  return (
    <AdminLayout
      title="Master Complaints Directory"
      subtitle="Complete database of logged student complaints across all campus facilities"
      actions={
        <div className="flex items-center gap-2">
          <button
            id="admin-refresh-list-btn"
            onClick={fetchComplaints}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search and Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="complaints-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, description, building, room, or ticket ID..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button
              id="complaints-search-btn"
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              Search
            </button>
            {activeFiltersCount > 0 && (
              <button
                id="complaints-reset-btn"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
              <select
                id="filter-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open (Unassigned)</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="VERIFIED">Verified</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Priority</label>
              <select
                id="filter-priority"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                id="filter-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Assignment</label>
              <select
                id="filter-assigned"
                value={assigned}
                onChange={(e) => {
                  setAssigned(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">All Records</option>
                <option value="unassigned">Unassigned Only</option>
                <option value="assigned">Assigned Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sort By</label>
              <select
                id="filter-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="priority">Priority Order</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Complaints Table Container */}
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
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Complaint Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Reported</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                      <span>Loading records from database...</span>
                    </td>
                  </tr>
                ) : complaints.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      No complaints matched the active filters.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c) => {
                    const isAssigned = Boolean(c.assignedTo);
                    const techName =
                      typeof c.assignedTo === 'object' && c.assignedTo !== null
                        ? c.assignedTo.name
                        : null;

                    return (
                      <tr
                        key={c._id}
                        id={`complaint-table-row-${c._id}`}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-500 whitespace-nowrap">
                          #{c._id.slice(-6).toUpperCase()}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                          <Link
                            to={`/admin/complaints/${c._id}`}
                            className="hover:text-blue-600 transition-colors line-clamp-1"
                          >
                            {c.title}
                          </Link>
                          <span className="text-[11px] text-slate-400 font-normal line-clamp-1">
                            {c.description}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <CategoryBadge category={c.category} size="sm" />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PriorityBadge priority={c.priority} size="sm" />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={c.status} size="sm" />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                          <div>{c.building}</div>
                          <div className="text-slate-400">Fl {c.floor} • Rm {c.room}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isAssigned ? (
                            <div className="flex items-center gap-1.5 text-xs text-purple-800 font-medium">
                              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                              <span className="truncate max-w-[110px]">{techName}</span>
                            </div>
                          ) : (
                            <button
                              id={`table-assign-btn-${c._id}`}
                              onClick={() => setAssignTarget(c)}
                              className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-[11px] font-semibold border border-blue-200 transition-colors"
                            >
                              + Assign Tech
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              id={`action-assign-${c._id}`}
                              onClick={() => setAssignTarget(c)}
                              title="Assign or Reassign"
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-slate-200"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>

                            <button
                              id={`action-priority-${c._id}`}
                              onClick={() => setPriorityTarget(c)}
                              title="Adjust Priority"
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-slate-200"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              to={`/admin/complaints/${c._id}`}
                              id={`action-view-${c._id}`}
                              title="View Complaint Dossier"
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md border border-blue-200"
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
                {complaints.length > 0 ? (pagination.currentPage - 1) * 10 + 1 : 0}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {Math.min(pagination.currentPage * 10, pagination.totalComplaints)}
              </strong>{' '}
              of <strong className="text-slate-900">{pagination.totalComplaints}</strong> tickets
            </div>

            <div className="flex items-center gap-2">
              <button
                id="pagination-prev-btn"
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
                id="pagination-next-btn"
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
