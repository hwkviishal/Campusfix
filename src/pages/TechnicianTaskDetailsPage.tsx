import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TechnicianLayout } from '../components/TechnicianLayout';
import { apiService } from '../services/api';
import { Complaint } from '../types';
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
} from '../components/ComplaintBadges';
import { StatusTimeline } from '../components/StatusTimeline';
import { ResolveTaskModal } from '../components/ResolveTaskModal';
import { ImageGallery } from '../components/ImageGallery';
import { CommentThread } from '../components/CommentThread';
import { useSocket } from '../context/SocketContext';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle2,
  Building,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Clock,
  Wrench,
  ShieldCheck,
} from 'lucide-react';

export const TechnicianTaskDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [resolveOpen, setResolveOpen] = useState(false);

  const fetchTask = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getTechnicianTaskById(id);
      if (res.success && res.data?.complaint) {
        setTask(res.data.complaint);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const { onComplaintUpdated } = useSocket();

  useEffect(() => {
    fetchTask();
  }, [id]);

  useEffect(() => {
    const unsub = onComplaintUpdated((updated) => {
      if (id && (updated._id === id || (updated as any).id === id)) {
        setTask(updated);
      }
    });
    return unsub;
  }, [id, onComplaintUpdated]);

  const handleStartTask = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      const res = await apiService.startTechnicianTask(task._id);
      if (res.success && res.data?.complaint) {
        setTask(res.data.complaint);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolved = (updated: Complaint) => {
    setTask(updated);
  };

  if (loading && !task) {
    return (
      <TechnicianLayout title="Task Details" subtitle="Inspecting service work order">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
          <p className="text-sm font-medium">Retrieving task record #{id}...</p>
        </div>
      </TechnicianLayout>
    );
  }

  if (error || !task) {
    return (
      <TechnicianLayout title="Task Details" subtitle="Inspecting service work order">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-semibold text-red-800">{error || 'Task not found'}</p>
          <Link
            to="/technician/tasks"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Tasks
          </Link>
        </div>
      </TechnicianLayout>
    );
  }

  const reporter = typeof task.reportedBy === 'object' ? task.reportedBy : null;
  const department = typeof task.department === 'object' ? task.department : null;

  const isAssigned = task.status === 'ASSIGNED';
  const isInProgress = task.status === 'IN_PROGRESS';
  const isResolved = task.status === 'RESOLVED' || task.status === 'VERIFIED' || task.status === 'CLOSED';

  return (
    <TechnicianLayout
      title={`Work Order #${task._id.slice(-6).toUpperCase()}`}
      subtitle={`Assigned: ${task.assignedAt ? new Date(task.assignedAt).toLocaleString() : 'Recent'}`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/technician/tasks"
            id="back-to-tasks-btn"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>My Tasks</span>
          </Link>

          {isAssigned && (
            <button
              id="tech-detail-start-btn"
              onClick={handleStartTask}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {actionLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Start On-Site Work</span>
            </button>
          )}

          {isInProgress && (
            <button
              id="tech-detail-resolve-btn"
              onClick={() => setResolveOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark as Resolved</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Banner Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={task.status} size="md" />
                <PriorityBadge priority={task.priority} size="md" />
                <CategoryBadge category={task.category} size="md" />
                <span className="font-mono text-xs text-slate-400">
                  ID: {task._id}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {task.title}
              </h2>
            </div>

            {/* Workflow Action Pill */}
            <div>
              {isAssigned && (
                <button
                  id="header-start-btn"
                  onClick={handleStartTask}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Begin Maintenance</span>
                </button>
              )}

              {isInProgress && (
                <button
                  id="header-resolve-btn"
                  onClick={() => setResolveOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete & Resolve</span>
                </button>
              )}

              {isResolved && (
                <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Task Successfully Resolved</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="pt-4 border-t border-slate-100">
            <StatusTimeline
              currentStatus={task.status}
              history={task.statusHistory}
            />
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Location */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Job Description & Location</span>
              </h3>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed font-normal">
                {task.description}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <span className="text-slate-400 block mb-0.5">Facility Building:</span>
                  <span className="font-semibold text-slate-900">{task.building}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <span className="text-slate-400 block mb-0.5">Floor Level:</span>
                  <span className="font-semibold text-slate-900">Floor {task.floor}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <span className="text-slate-400 block mb-0.5">Room / Section:</span>
                  <span className="font-semibold text-slate-900">{task.room}</span>
                </div>
              </div>

              {/* Student Evidence Photos Gallery */}
              <div className="pt-6 border-t border-slate-100">
                <ImageGallery
                  images={task.images || []}
                  title="Student Reported Evidence Photos"
                  type="evidence"
                  emptyMessage="No evidence photos were submitted with this ticket."
                />
              </div>
            </div>

            {/* Resolution Report (if exists) */}
            {(task.resolutionNotes ||
              (task.resolutionImages && task.resolutionImages.length > 0)) && (
              <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs space-y-4 bg-emerald-50/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Your Submitted Resolution Report</span>
                  </h3>
                  {task.resolvedAt && (
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Timestamp: {new Date(task.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {task.resolutionNotes && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 leading-relaxed whitespace-pre-line">
                    {task.resolutionNotes}
                  </div>
                )}
                {/* Technician Completion Photos */}
                <div>
                  <ImageGallery
                    images={task.resolutionImages || []}
                    title="Attached Completion Photos"
                    type="resolution"
                    emptyMessage="No completion photos attached."
                  />
                </div>
              </div>
            )}

            {/* Action Card if In Progress */}
            {isInProgress && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center gap-2.5 text-amber-900 font-semibold text-sm">
                  <Wrench className="w-5 h-5 text-amber-600" />
                  <span>Work In Progress on Location</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  You have marked this task as started. When physical repairs, cleaning, or electrical maintenance are finished, click below to submit your resolution report and complete the job.
                </p>
                <button
                  id="in-progress-resolve-btn"
                  onClick={() => setResolveOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete & Submit Resolution Report</span>
                </button>
              </div>
            )}

            {/* Real-time Communication & Internal Notes Thread */}
            {id && <CommentThread complaintId={id} />}

            {/* Transition Timeline */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Job History & Progress Trail</span>
              </h3>

              <div className="space-y-3">
                {task.statusHistory && task.statusHistory.length > 0 ? (
                  task.statusHistory.map((item, idx) => (
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
                        Updated
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No transitions logged.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Student Details & Department */}
          <div className="space-y-6">
            {/* Student Contact Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span>Student Contact</span>
              </h3>

              {reporter ? (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {reporter.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{reporter.name}</p>
                      <p className="text-[11px] text-slate-400">Reporting Student</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-slate-600 space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <a
                        href={`mailto:${reporter.email}`}
                        className="text-blue-600 hover:underline truncate"
                      >
                        {reporter.email}
                      </a>
                    </div>
                    {reporter.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <a
                          href={`tel:${reporter.phone}`}
                          className="text-slate-800 font-medium hover:underline"
                        >
                          {reporter.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Reporter profile unavailable.</p>
              )}
            </div>

            {/* Department Assignment */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-600" />
                <span>Operating Unit</span>
              </h3>
              <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-purple-900">
                  {department ? department.name : 'Campus Facilities'}
                </p>
                {department?.code && (
                  <p className="text-[11px] text-purple-700">Code: {department.code}</p>
                )}
                <p className="text-[11px] text-slate-500 pt-1">
                  Assigned directly to you via Central Dispatch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      <ResolveTaskModal
        complaint={task}
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolved={handleResolved}
      />
    </TechnicianLayout>
  );
};
