import React, { useState, useEffect } from 'react';
import { Complaint, TechnicianItem } from '../types';
import { apiService } from '../services/api';
import {
  X,
  Wrench,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Building2,
} from 'lucide-react';

interface AssignTechnicianModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: (updated: Complaint) => void;
}

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onAssigned,
}) => {
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [overrideDepartment, setOverrideDepartment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && complaint) {
      loadTechnicians();
      setSelectedTechId(
        typeof complaint.assignedTo === 'object' && complaint.assignedTo !== null
          ? complaint.assignedTo._id
          : typeof complaint.assignedTo === 'string'
          ? complaint.assignedTo
          : ''
      );
      setOverrideDepartment(false);
      setError(null);
    }
  }, [isOpen, complaint]);

  const loadTechnicians = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getAllTechnicians();
      if (res.success) {
        setTechnicians(res.data.technicians);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load technicians');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !complaint) return null;

  const complaintDeptId =
    typeof complaint.department === 'object' && complaint.department !== null
      ? complaint.department._id
      : typeof complaint.department === 'string'
      ? complaint.department
      : null;

  const complaintDeptName =
    typeof complaint.department === 'object' && complaint.department !== null
      ? complaint.department.name
      : 'General Facility';

  // Filter technicians
  const filteredTechs = technicians.filter((tech) => {
    const q = searchQuery.toLowerCase();
    const deptName = tech.department?.name?.toLowerCase() || '';
    return (
      tech.name.toLowerCase().includes(q) ||
      tech.email.toLowerCase().includes(q) ||
      deptName.includes(q)
    );
  });

  const selectedTech = technicians.find((t) => t._id === selectedTechId);
  const isCrossDepartment =
    selectedTech &&
    complaintDeptId &&
    selectedTech.department?._id &&
    selectedTech.department._id !== complaintDeptId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId) {
      setError('Please select a technician to assign.');
      return;
    }

    if (isCrossDepartment && !overrideDepartment) {
      setError('Technician is from a different department. Please check "Override Department" to proceed.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiService.assignTechnician(complaint._id, {
        technicianId: selectedTechId,
        overrideDepartment,
      });
      if (res.success && res.data?.complaint) {
        onAssigned(res.data.complaint);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign technician');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div
        id="assign-technician-modal"
        className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base">Assign Technician</h2>
              <p className="text-xs text-slate-500">Route issue to field staff for immediate resolution</p>
            </div>
          </div>
          <button
            id="close-assign-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Complaint Target Summary */}
        <div className="px-6 py-3.5 bg-blue-50/50 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-semibold text-blue-900 truncate block max-w-md">
              {complaint.title}
            </span>
            <span className="text-blue-700">
              {complaint.building} • Floor {complaint.floor} • Room {complaint.room}
            </span>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 rounded-md text-blue-800 font-medium">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Target: {complaintDeptName}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-technician-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search technician by name or department..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Technician Cards */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading available technicians...</span>
              </div>
            ) : filteredTechs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No technicians found matching criteria.
              </div>
            ) : (
              filteredTechs.map((tech) => {
                const isSelected = selectedTechId === tech._id;
                const isMatchingDept = complaintDeptId && tech.department?._id === complaintDeptId;

                return (
                  <label
                    key={tech._id}
                    id={`tech-option-${tech._id}`}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="technician"
                        value={tech._id}
                        checked={isSelected}
                        onChange={() => setSelectedTechId(tech._id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">{tech.name}</span>
                          {isMatchingDept && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                              Dept Match
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {tech.department?.name || 'General Department'} • {tech.phone || tech.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div className="text-[11px]">
                        <span className="text-slate-500">Workload:</span>{' '}
                        <span className="font-semibold text-slate-700">
                          {tech.assignedTaskCount || 0} active
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Department Cross Warning & Override Checkbox */}
          {isCrossDepartment && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Cross-Department Assignment:</strong> Selected technician belongs to{' '}
                  <span className="underline font-semibold">{selectedTech?.department?.name}</span>, while
                  this complaint is cataloged under{' '}
                  <span className="underline font-semibold">{complaintDeptName}</span>.
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-200 text-amber-900 font-medium">
                <input
                  id="override-department-checkbox"
                  type="checkbox"
                  checked={overrideDepartment}
                  onChange={(e) => setOverrideDepartment(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 border-amber-300 focus:ring-amber-500"
                />
                <span>Authorize cross-department dispatch override</span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              id="cancel-assign-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-assign-btn"
              type="submit"
              disabled={submitting || !selectedTechId}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Confirm Assignment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
