import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { apiService } from '../services/api';
import { Complaint } from '../types';
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
} from '../components/ComplaintBadges';
import { StatusTimeline } from '../components/StatusTimeline';
import { AssignTechnicianModal } from '../components/AssignTechnicianModal';
import { UpdatePriorityModal } from '../components/UpdatePriorityModal';
import { ImageGallery } from '../components/ImageGallery';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Building,
  MapPin,
  Calendar,
  User,
  SlidersHorizontal,
  Wrench,
  FileText,
  Clock,
  CheckCircle2,
  Mail,
  Phone,
} from 'lucide-react';

export const AdminComplaintDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [assignOpen, setAssignOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  const fetchComplaint = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getAdminComplaintById(id);
      if (res.success && res.data?.complaint) {
        setComplaint(res.data.complaint);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load complaint dossier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  const handleAssigned = (updated: Complaint) => {
    setComplaint(updated);
  };

  const handlePriorityUpdated = (updated: Complaint) => {
    setComplaint(updated);
  };

  if (loading && !complaint) {
    return (
      <AdminLayout title="Complaint Details" subtitle="Inspecting maintenance docket">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium">Retrieving complaint record #{id}...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !complaint) {
    return (
      <AdminLayout title="Complaint Details" subtitle="Inspecting maintenance docket">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-semibold text-red-800">{error || 'Complaint not found'}</p>
          <Link
            to="/admin/complaints"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Complaints
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const reporter = typeof complaint.reportedBy === 'object' ? complaint.reportedBy : null;
  const assignedTech = typeof complaint.assignedTo === 'object' ? complaint.assignedTo : null;
  const department = typeof complaint.department === 'object' ? complaint.department : null;

  return (
    <AdminLayout
      title={`Complaint Docket #${complaint._id.slice(-6).toUpperCase()}`}
      subtitle={`Created on ${new Date(complaint.createdAt).toLocaleDateString()} at ${new Date(complaint.createdAt).toLocaleTimeString()}`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/admin/complaints"
            id="back-to-complaints-btn"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Complaints List</span>
          </Link>
          <button
            id="admin-assign-btn-header"
            onClick={() => setAssignOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{complaint.assignedTo ? 'Reassign Tech' : 'Assign Tech'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Status & Controls Header Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={complaint.status} size="md" />
                <PriorityBadge priority={complaint.priority} size="md" />
                <CategoryBadge category={complaint.category} size="md" />
                <span className="font-mono text-xs text-slate-400">
                  ID: {complaint._id}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {complaint.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="adjust-priority-btn"
                onClick={() => setPriorityOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Adjust Priority</span>
              </button>
              <button
                id="assign-tech-btn"
                onClick={() => setAssignOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{complaint.assignedTo ? 'Change Assignment' : 'Assign Technician'}</span>
              </button>
            </div>
          </div>

          {/* Lifecycle Step Progress Timeline */}
          <div className="pt-4 border-t border-slate-100">
            <StatusTimeline
              currentStatus={complaint.status}
              history={complaint.statusHistory}
            />
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Details, Description, and Resolution */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Location */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Incident Description</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-normal">
                {complaint.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <span className="text-slate-400 block mb-0.5">Building:</span>
                  <span className="font-semibold text-slate-900">{complaint.building}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <span className="text-slate-400 block mb-0.5">Floor:</span>
                  <span className="font-semibold text-slate-900">Floor {complaint.floor}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <span className="text-slate-400 block mb-0.5">Room / Area:</span>
                  <span className="font-semibold text-slate-900">{complaint.room}</span>
                </div>
              </div>

              {/* Student Evidence Photos Gallery */}
              <div className="pt-6 border-t border-slate-100">
                <ImageGallery
                  images={complaint.images || []}
                  title="Student Reported Evidence Photos"
                  type="evidence"
                  emptyMessage="No evidence photos were submitted by student."
                />
              </div>
            </div>

            {/* Resolution Report (if available) */}
            {(complaint.resolutionNotes ||
              (complaint.resolutionImages && complaint.resolutionImages.length > 0)) && (
              <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs space-y-4 bg-emerald-50/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Field Technician Resolution Notes</span>
                  </h3>
                  {complaint.resolvedAt && (
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Resolved: {new Date(complaint.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {complaint.resolutionNotes && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 leading-relaxed whitespace-pre-line">
                    {complaint.resolutionNotes}
                  </div>
                )}
                {/* Technician Completion Photos */}
                <div>
                  <ImageGallery
                    images={complaint.resolutionImages || []}
                    title="Technician Completion Photos"
                    type="resolution"
                    emptyMessage="No resolution photos attached by technician."
                  />
                </div>
              </div>
            )}

            {/* Status History Audit Trail */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Audit & Status Transition Log</span>
              </h3>

              <div className="space-y-3">
                {complaint.statusHistory && complaint.statusHistory.length > 0 ? (
                  complaint.statusHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.status} size="sm" />
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {item.comment && (
                          <p className="text-slate-600 text-[11px] pl-0.5">{item.comment}</p>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 self-end sm:self-center">
                        Changed by User #{String(item.changedBy).slice(-6)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No transition history logged.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Assigned Technician & Reporter Cards */}
          <div className="space-y-6">
            {/* Technician Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>Assigned Technician</span>
                </h3>
                <button
                  id="card-assign-btn"
                  onClick={() => setAssignOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  {assignedTech ? 'Change' : 'Assign'}
                </button>
              </div>

              {assignedTech ? (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {assignedTech.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{assignedTech.name}</p>
                      <p className="text-xs text-blue-700">Maintenance Technician</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-100 text-xs space-y-1.5 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{assignedTech.email}</span>
                    </div>
                    {assignedTech.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{assignedTech.phone}</span>
                      </div>
                    )}
                    {complaint.assignedAt && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Assigned: {new Date(complaint.assignedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                  <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
                  <p className="text-xs font-semibold text-amber-900">No Technician Assigned</p>
                  <p className="text-[11px] text-amber-700">
                    This ticket is unassigned. Assign a technician to begin on-site dispatch.
                  </p>
                  <button
                    id="unassigned-prompt-btn"
                    onClick={() => setAssignOpen(true)}
                    className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Assign Technician
                  </button>
                </div>
              )}
            </div>

            {/* Department Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-600" />
                <span>Department Responsible</span>
              </h3>
              <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-purple-900">
                  {department ? department.name : 'Campus Facilities & Operations'}
                </p>
                {department?.code && (
                  <p className="text-[11px] text-purple-700">Code: {department.code}</p>
                )}
                {department?.contactEmail && (
                  <p className="text-[11px] text-slate-500">Contact: {department.contactEmail}</p>
                )}
              </div>
            </div>

            {/* Student Reporter Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span>Reported By Student</span>
              </h3>

              {reporter ? (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {reporter.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{reporter.name}</p>
                      <p className="text-[11px] text-slate-400">Student Body Member</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{reporter.email}</span>
                    </div>
                    {reporter.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{reporter.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Student information not available.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AssignTechnicianModal
        complaint={complaint}
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={handleAssigned}
      />

      <UpdatePriorityModal
        complaint={complaint}
        isOpen={priorityOpen}
        onClose={() => setPriorityOpen(false)}
        onUpdated={handlePriorityUpdated}
      />
    </AdminLayout>
  );
};
