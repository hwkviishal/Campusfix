import React, { useState, useEffect } from 'react';
import { Complaint } from '../types';
import { apiService } from '../services/api';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  UploadCloud,
} from 'lucide-react';
import { ImageDropzone, SelectedImageFile } from './ImageDropzone';

interface ResolveTaskModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved: (updated: Complaint) => void;
}

export const ResolveTaskModal: React.FC<ResolveTaskModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onResolved,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedImageFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResolutionNotes('');
      setSelectedFiles([]);
      setUploadProgress(null);
      setError(null);

      apiService
        .getUploadStatus()
        .then((res) => {
          if (res?.data) {
            setIsCloudinaryConfigured(Boolean(res.data.configured));
          }
        })
        .catch(() => {
          setIsCloudinaryConfigured(false);
        });
    }
  }, [isOpen]);

  if (!isOpen || !complaint) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolutionNotes.trim().length < 5) {
      setError('Resolution notes are required and must be at least 5 characters detailing actions taken.');
      return;
    }

    if (selectedFiles.length > 0 && !isCloudinaryConfigured) {
      setError('Cloudinary is not configured. Please clear resolution photos to submit text-only.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setUploadProgress(null);

    try {
      let res;
      if (selectedFiles.length > 0) {
        const multipart = new FormData();
        multipart.append('resolutionNotes', resolutionNotes.trim());
        selectedFiles.forEach((item) => {
          multipart.append('resolutionImages', item.file);
        });

        res = await apiService.resolveTechnicianTask(complaint._id, multipart, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        });
      } else {
        res = await apiService.resolveTechnicianTask(complaint._id, {
          resolutionNotes: resolutionNotes.trim(),
        });
      }

      if (res.success && res.data?.complaint) {
        onResolved(res.data.complaint);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete resolution');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div
        id="resolve-task-modal"
        className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base">Resolve Field Task</h2>
              <p className="text-xs text-slate-500">Record maintenance work and attach resolution photos</p>
            </div>
          </div>
          <button
            id="close-resolve-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <p className="text-slate-500">Task Title:</p>
            <p className="font-semibold text-slate-900">{complaint.title}</p>
            <p className="text-slate-500">
              Location: {complaint.building}, Floor {complaint.floor}, {complaint.room}
            </p>
          </div>

          <div>
            <label
              htmlFor="resolution-notes-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Detailed Resolution Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="resolution-notes-input"
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe repairs performed, replacement parts installed, or corrective actions taken..."
              className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white leading-relaxed"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum 5 characters. Detailed notes will be logged into the audit timeline and displayed to students upon verification.
            </p>
          </div>

          {/* Resolution Images Dropzone */}
          <div className="pt-2 border-t border-slate-100">
            <ImageDropzone
              files={selectedFiles}
              onChange={setSelectedFiles}
              maxFiles={5}
              maxSizeMB={5}
              disabled={submitting}
              isCloudinaryConfigured={isCloudinaryConfigured}
              label="Completed Work Photos (Optional)"
              helperText="Attach up to 5 photos showing the repaired equipment, new parts, or clean site (JPEG, PNG, WebP up to 5MB)."
            />
          </div>

          {/* Upload Progress Bar */}
          {submitting && uploadProgress !== null && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-emerald-600 animate-bounce" />
                  Uploading resolution photos to Cloudinary...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              id="cancel-resolve-btn"
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-resolve-btn"
              type="submit"
              disabled={submitting || resolutionNotes.trim().length < 5}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Resolution...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Task Resolved</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
