import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { apiService } from '../services/api';
import { TechnicianItem } from '../types';
import {
  Wrench,
  Search,
  RefreshCw,
  UserCheck,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export const AdminTechniciansPage: React.FC = () => {
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const fetchTechnicians = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getAllTechnicians({
        search: search.trim() || undefined,
      });
      if (res.success && res.data) {
        setTechnicians(res.data.technicians);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load technician roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTechnicians();
  };

  // Collect unique departments
  const departments = Array.from(
    new Set(
      technicians
        .map((t) => t.department?.name)
        .filter((d): d is string => Boolean(d))
    )
  );

  const filteredTechnicians = technicians.filter((tech) => {
    if (selectedDept !== 'ALL' && tech.department?.name !== selectedDept) {
      return false;
    }
    return true;
  });

  const totalAssignedWorkload = technicians.reduce(
    (acc, t) => acc + (t.assignedTaskCount || 0),
    0
  );
  const totalResolvedTasks = technicians.reduce(
    (acc, t) => acc + (t.resolvedTaskCount || 0),
    0
  );

  return (
    <AdminLayout
      title="Maintenance Technicians Roster"
      subtitle="Authorized field maintenance personnel across campus facilities"
      actions={
        <button
          id="refresh-tech-roster-btn"
          onClick={fetchTechnicians}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Roster</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Roster Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Active Technicians</span>
              <p className="text-2xl font-bold text-slate-900">{technicians.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Active Field Workload</span>
              <p className="text-2xl font-bold text-amber-700">{totalAssignedWorkload} tasks</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Total Completed Repairs</span>
              <p className="text-2xl font-bold text-emerald-700">{totalResolvedTasks} tasks</p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="tech-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or skill..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="tech-dept-filter"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="p-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Technician Cards Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-medium">Loading maintenance team roster...</p>
          </div>
        ) : filteredTechnicians.length === 0 ? (
          <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No technicians found matching criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechnicians.map((tech) => {
              return (
                <div
                  key={tech._id}
                  id={`technician-card-${tech._id}`}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-xs">
                        {tech.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900 leading-tight">
                          {tech.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] font-medium text-emerald-700">
                            Active on Duty
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono">
                      #{tech._id.slice(-4).toUpperCase()}
                    </span>
                  </div>

                  {/* Department Badge */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>Department:</span>
                    </div>
                    <p className="font-semibold text-slate-800 truncate">
                      {tech.department?.name || 'Facilities Operations'}
                    </p>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{tech.email}</span>
                    </div>
                    {tech.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{tech.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Workload Stats & Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-slate-400 block text-[10px]">Active Tasks:</span>
                      <strong className="text-blue-700 text-sm">
                        {tech.assignedTaskCount || 0} active
                      </strong>
                    </div>

                    <div className="text-xs">
                      <span className="text-slate-400 block text-[10px]">Resolved:</span>
                      <strong className="text-emerald-700 text-sm">
                        {tech.resolvedTaskCount || 0} completed
                      </strong>
                    </div>

                    <Link
                      to={`/admin/complaints?search=${encodeURIComponent(tech.name)}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>View Tasks</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
