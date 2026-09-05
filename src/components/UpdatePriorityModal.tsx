import React, { useState } from 'react';
import { Complaint, ComplaintPriority } from '../types';
import { apiService } from '../services/api';
import { PriorityBadge } from './ComplaintBadges';
import {
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface UpdatePriorityModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: Complaint) => void;
}

const PRIORITIES: { value: ComplaintPriority; label: string; desc: string; color: string }[] = [
  { value: 'LOW', label: 'Low', desc: 'Non-critical cosmetic or minor operational defect', color: 'border-slate-300' },
  { value: 'MEDIUM', label: 'Medium', desc: 'Standard service issue affecting comfort or single station', color: 'border-blue-300' },
  { value: 'HIGH', label: 'High', desc: 'Significant disruption to lecture hall, lab, or dormitory service', color: 'border-amber-300' },
  { value: 'CRITICAL', label: 'Critical', desc: 'Immediate safety, structural hazard, or campus-wide outage', color: 'border-red-400' },
];

export const UpdatePriorityModal: React.FC<UpdatePriorityModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority>(
    complaint?.priority || 'MEDIUM'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (complaint) {
      setSelectedPriority(complaint.priority);
      setError(null);
    }
  }, [complaint, isOpen]);

  if (!isOpen || !complaint) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiService.updateComplaintPriority(complaint._id, selectedPriority);
      if (res.success && res.data?.complaint) {
        onUpdated(res.data.complaint);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update priority');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div
        id="update-priority-modal"
        className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base">Adjust Priority Level</h2>
              <p className="text-xs text-slate-500">Reprioritize triage order for dispatch</p>
            </div>
          </div>
          <button
            id="close-priority-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-slate-600">
            Target Ticket: <strong className="text-slate-900">{complaint.title}</strong>
          </div>

          <div className="space-y-2.5">
            {PRIORITIES.map((p) => {
              const isSelected = selectedPriority === p.value;
              return (
                <label
                  key={p.value}
                  id={`priority-option-${p.value}`}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p.value}
                    checked={isSelected}
                    onChange={() => setSelectedPriority(p.value)}
                    className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <PriorityBadge priority={p.value} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">{p.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              id="cancel-priority-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-priority-btn"
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Priority</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
