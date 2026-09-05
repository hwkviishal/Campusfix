import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StudentNavbar } from '../components/StudentNavbar';
import { apiService } from '../services/api';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintPagination,
} from '../types';
import {
  CategoryBadge,
  PriorityBadge,
  StatusPill,
} from '../components/ComplaintBadges';
import {
  Search,
  Filter,
  PlusCircle,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ClipboardList,
  MapPin,
  AlertCircle,
  Camera,
} from 'lucide-react';

export const MyComplaintsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pagination, setPagination] = useState<ComplaintPagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get('category') || 'ALL'
  );
  const [priorityFilter, setPriorityFilter] = useState<string>(
    searchParams.get('priority') || 'ALL'
  );
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiService.getMyComplaints({
        page,
        limit: 10,
        search: searchTerm.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      });

      if (res.data) {
        setComplaints(res.data.complaints);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load complaints.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [page, statusFilter, categoryFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setPriorityFilter('ALL');
    setPage(1);
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    priorityFilter !== 'ALL';

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900 flex flex-col">
      <StudentNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Complaints</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track status, updates, and maintenance progress for all your reported issues.
            </p>
          </div>
          <Link
            to="/student/report"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-blue-600/20 transition-all hover:shadow self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report New Issue</span>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="md:col-span-4 relative">
              <input
                type="text"
                placeholder="Search title, building, room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </form>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="VERIFIED">Verified</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700"
              >
                <option value="ALL">All Categories</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="INTERNET_WIFI">Wi-Fi / Network</option>
                <option value="FURNITURE">Furniture</option>
                <option value="CLEANING">Cleaning</option>
                <option value="CLASSROOM_EQUIPMENT">Classroom Tech</option>
                <option value="SECURITY">Security</option>
                <option value="TRANSPORT">Transport</option>
                <option value="HOSTEL">Hostel</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="md:col-span-2 flex items-center gap-2">
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Complaints Table / List Container */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">Fetching complaints from server...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {hasActiveFilters ? 'No complaints match your filters' : 'No complaints reported yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                {hasActiveFilters
                  ? 'Try changing or clearing your search keywords and filter criteria.'
                  : 'Notice something broken or in need of maintenance on campus? Submit your first issue ticket.'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              ) : (
                <Link
                  to="/student/report"
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm shadow-blue-600/20 transition-all hover:shadow"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Report an Issue</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 sm:px-6">ID & Issue Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Reported</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {complaints.map((c) => {
                    const id = c._id || c.id || '';
                    const shortId = id.slice(-6).toUpperCase();
                    return (
                      <tr
                        key={id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => (window.location.href = `/student/complaints/${id}`)}
                      >
                        {/* Title & Short ID */}
                        <td className="py-3.5 px-4 sm:px-6 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              #{shortId}
                            </span>
                            <span className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {c.title}
                            </span>
                            {c.images && c.images.length > 0 && (
                              <span
                                title={`${c.images.length} evidence photo(s) attached`}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded"
                              >
                                <Camera className="w-2.5 h-2.5 text-slate-500" />
                                <span>{c.images.length}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5 max-w-sm">
                            {c.description}
                          </p>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <CategoryBadge category={c.category} size="sm" />
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PriorityBadge priority={c.priority} size="sm" />
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusPill status={c.status} size="sm" />
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {c.building} • {c.floor ? `Fl ${c.floor}` : ''} ({c.room})
                            </span>
                          </div>
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                          {new Date(c.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link
                            to={`/student/complaints/${id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100/70 px-2.5 py-1 rounded-md transition-colors"
                          >
                            <span>View</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!isLoading && complaints.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing{' '}
                <span className="font-semibold text-slate-800">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-semibold text-slate-800">{pagination.total}</span> complaints
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <span className="px-3 font-semibold text-slate-800">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
