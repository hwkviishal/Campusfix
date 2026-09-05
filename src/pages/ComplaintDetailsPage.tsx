import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { StudentNavbar } from '../components/StudentNavbar';
import { apiService } from '../services/api';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  UpdateComplaintInput,
} from '../types';
import {
  CategoryBadge,
  PriorityBadge,
  StatusPill,
} from '../components/ComplaintBadges';
import { StatusTimeline } from '../components/StatusTimeline';
import { ImageGallery } from '../components/ImageGallery';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building,
  User,
  Shield,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
  Clock,
  MessageSquare,
  Sparkles,
  Wrench,
} from 'lucide-react';

const CATEGORIES: ComplaintCategory[] = [
  'ELECTRICAL',
  'PLUMBING',
  'INTERNET_WIFI',
  'FURNITURE',
  'CLEANING',
  'CLASSROOM_EQUIPMENT',
  'SECURITY',
  'TRANSPORT',
  'HOSTEL',
  'OTHER',
];

const PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const ComplaintDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<UpdateComplaintInput>({});
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Remove Image State
  const [isRemovingImage, setIsRemovingImage] = useState<boolean>(false);

  const handleRemoveImage = async (publicId: string) => {
    if (!id) return;
    try {
      setIsRemovingImage(true);
      const res = await apiService.removeComplaintImage(id, publicId);
      if (res.data?.complaint) {
        setComplaint(res.data.complaint);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove image from complaint.');
    } finally {
      setIsRemovingImage(false);
    }
  };

  const fetchComplaint = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiService.getComplaintById(id);
      if (res.data?.complaint) {
        setComplaint(res.data.complaint);
        setEditFormData({
          title: res.data.complaint.title,
          description: res.data.complaint.description,
          category: res.data.complaint.category,
          priority: res.data.complaint.priority,
          building: res.data.complaint.building,
          floor: res.data.complaint.floor,
          room: res.data.complaint.room,
        });
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access Denied: You do not have permission to view complaints submitted by another student.');
      } else if (err.response?.status === 404) {
        setError('Complaint not found. The requested ticket does not exist or has been removed.');
      } else {
        setError(err.response?.data?.message || 'Failed to load complaint details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setUpdateError(null);

    if (editFormData.title && editFormData.title.trim().length < 3) {
      setUpdateError('Title must be at least 3 characters.');
      return;
    }

    if (editFormData.description && editFormData.description.trim().length < 10) {
      setUpdateError('Description must be at least 10 characters.');
      return;
    }

    try {
      setIsUpdating(true);
      const res = await apiService.updateComplaint(id, editFormData);
      if (res.data?.complaint) {
        setComplaint(res.data.complaint);
        setIsEditModalOpen(false);
      }
    } catch (err: any) {
      setUpdateError(err.response?.data?.message || 'Failed to update complaint.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!id) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await apiService.deleteComplaint(id);
      setIsDeleteModalOpen(false);
      navigate('/student/complaints');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete complaint.');
      setIsDeleting(false);
    }
  };

  const isEditable = complaint?.status === 'OPEN';

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900 flex flex-col">
      <StudentNavbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/student/complaints"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Complaints</span>
            </Link>

            {complaint && (
              <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                ID: #{(complaint._id || complaint.id || '').slice(-6).toUpperCase()}
              </span>
            )}
          </div>

          {/* Action Buttons if OPEN */}
          {complaint && isEditable && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Issue</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-xs">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading complaint details...</p>
          </div>
        )}

        {error && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-xs">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Unable to Display Ticket</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">{error}</p>
            <Link
              to="/student/complaints"
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to My Complaints</span>
            </Link>
          </div>
        )}

        {/* Main Content when complaint is loaded */}
        {!isLoading && complaint && (
          <div className="space-y-6">
            {/* Primary Details Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 sm:p-8">
              {/* Badges & Meta */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={complaint.status} size="md" />
                  <CategoryBadge category={complaint.category} />
                  <PriorityBadge priority={complaint.priority} />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Reported {new Date(complaint.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-4">
                {complaint.title}
              </h2>

              {/* Locked Status Notice if not editable */}
              {!isEditable && (
                <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5 text-xs text-slate-600">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    This ticket is actively in maintenance lifecycle (<strong>{complaint.status}</strong>). To maintain institutional audit compliance, direct editing and deletion by students are locked.
                  </span>
                </div>
              )}

              {/* Status Timeline Component */}
              <div className="border-y border-slate-100 py-4 my-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Resolution Progress
                </h4>
                <StatusTimeline
                  currentStatus={complaint.status}
                  history={complaint.statusHistory}
                />
              </div>

              {/* Description */}
              <div className="space-y-2 mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Problem Description
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-lg border border-slate-100">
                  {complaint.description}
                </p>
              </div>

              {/* Location & Department Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50/50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-semibold mb-1">
                    Building
                  </span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>{complaint.building}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-semibold mb-1">
                    Floor Level
                  </span>
                  <div className="font-semibold text-slate-800">Floor {complaint.floor}</div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-semibold mb-1">
                    Room / Lab
                  </span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{complaint.room}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-semibold mb-1">
                    Assigned Unit
                  </span>
                  <div className="font-semibold text-slate-800">
                    {typeof complaint.department === 'object' && complaint.department !== null
                      ? (complaint.department as any).name
                      : 'Campus Facilities'}
                  </div>
                </div>
              </div>

              {/* Student Evidence Photos Gallery */}
              <div className="pt-6 border-t border-slate-100">
                <ImageGallery
                  images={complaint.images || []}
                  title="Reported Evidence Photos"
                  type="evidence"
                  emptyMessage="No evidence photos were attached to this report."
                  canRemove={complaint.status === 'OPEN'}
                  onRemoveImage={handleRemoveImage}
                  isRemoving={isRemovingImage}
                />
              </div>

              {/* Technician Resolution Section (When Resolved or Notes present) */}
              {(complaint.status === 'RESOLVED' ||
                complaint.resolutionNotes ||
                (complaint.resolutionImages && complaint.resolutionImages.length > 0)) && (
                <div className="mt-6 p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <Wrench className="w-4 h-4 text-emerald-600" />
                      <span>Technician Resolution Details</span>
                    </div>
                    {complaint.resolvedAt && (
                      <span className="text-xs text-emerald-700 font-mono">
                        Resolved on{' '}
                        {new Date(complaint.resolvedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  {complaint.resolutionNotes && (
                    <div className="bg-white/80 p-4 rounded-lg border border-emerald-100 text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <p className="font-semibold text-emerald-950 mb-1">
                        Repair & Work Performed:
                      </p>
                      <p className="whitespace-pre-line">{complaint.resolutionNotes}</p>
                    </div>
                  )}

                  {/* Resolution Photos Gallery */}
                  <div>
                    <ImageGallery
                      images={complaint.resolutionImages || []}
                      title="Technician Completion Photos"
                      type="resolution"
                      emptyMessage="No completion photos attached by technician."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Status History & Audit Log Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Status History & Activity Log
                </h3>
              </div>

              <div className="space-y-4">
                {complaint.statusHistory && complaint.statusHistory.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {complaint.statusHistory.map((item, idx) => {
                      const changedByName =
                        typeof item.changedBy === 'object' && item.changedBy !== null
                          ? item.changedBy.name
                          : 'Campus Staff';
                      const changedByRole =
                        typeof item.changedBy === 'object' && item.changedBy !== null
                          ? item.changedBy.role
                          : '';

                      return (
                        <div key={item._id || idx} className="relative">
                          {/* Dot */}
                          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />

                          <div className="bg-slate-50/75 border border-slate-200 rounded-lg p-3.5 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <StatusPill status={item.status} size="sm" />
                                <span className="font-semibold text-slate-800">
                                  {changedByName}
                                </span>
                                {changedByRole && (
                                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                    {changedByRole}
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-400 font-mono text-[11px]">
                                {new Date(item.timestamp).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {item.comment ? (
                              <p className="text-slate-600 italic">“{item.comment}”</p>
                            ) : (
                              <p className="text-slate-400 italic">No additional comments entered.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No status history recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Complaint Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-base font-bold text-slate-900">Edit Complaint</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {updateError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{updateError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={editFormData.title || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={editFormData.category}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          category: e.target.value as ComplaintCategory,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={editFormData.priority}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          priority: e.target.value as ComplaintPriority,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Building
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.building || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, building: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Floor
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.floor || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Room
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.room || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, room: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    required
                    maxLength={2000}
                    value={editFormData.description || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving Changes...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-md w-full p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete this Complaint?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Are you sure you want to permanently delete ticket{' '}
                <strong>#{complaint?.title}</strong>? This action cannot be undone.
              </p>

              {deleteError && (
                <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Ticket'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
