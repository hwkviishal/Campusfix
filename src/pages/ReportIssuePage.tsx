import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StudentNavbar } from '../components/StudentNavbar';
import { apiService } from '../services/api';
import {
  ComplaintCategory,
  ComplaintPriority,
  CreateComplaintInput,
} from '../types';
import {
  ArrowLeft,
  Send,
  AlertCircle,
  Building,
  CheckCircle2,
  Info,
  Layers,
  MapPin,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { CategoryBadge, PriorityBadge } from '../components/ComplaintBadges';
import { ImageDropzone, SelectedImageFile } from '../components/ImageDropzone';

const CATEGORIES: { id: ComplaintCategory; label: string; description: string }[] = [
  { id: 'ELECTRICAL', label: 'Electrical', description: 'Lights, fans, sockets, wiring, power trip' },
  { id: 'PLUMBING', label: 'Plumbing', description: 'Leaks, faucets, drainage, washroom fixtures' },
  { id: 'INTERNET_WIFI', label: 'Wi-Fi / Network', description: 'Access points, signal loss, ethernet wall ports' },
  { id: 'FURNITURE', label: 'Furniture', description: 'Chairs, desks, whiteboards, classroom podiums' },
  { id: 'CLEANING', label: 'Housekeeping', description: 'Spills, waste clearing, sanitation, cafeteria' },
  { id: 'CLASSROOM_EQUIPMENT', label: 'Classroom Tech', description: 'Projector, audio, microphones, smart podium' },
  { id: 'SECURITY', label: 'Campus Security', description: 'Door locks, gates, safety hazards, exterior lighting' },
  { id: 'TRANSPORT', label: 'Transport / Parking', description: 'Campus shuttle, bike racks, parking zones' },
  { id: 'HOSTEL', label: 'Hostel Maintenance', description: 'Dormitory room repairs, bedframes, hallway lights' },
  { id: 'OTHER', label: 'Other Facilities', description: 'General utility issues not listed above' },
];

const PRIORITIES: { id: ComplaintPriority; label: string; desc: string }[] = [
  { id: 'LOW', label: 'Low', desc: 'Minor cosmetic or non-blocking request' },
  { id: 'MEDIUM', label: 'Medium', desc: 'Routine issue impacting comfort' },
  { id: 'HIGH', label: 'High', desc: 'Disruptive issue requiring prompt technician attention' },
  { id: 'CRITICAL', label: 'Critical', desc: 'Immediate safety or operational hazard' },
];

const COMMON_BUILDINGS = [
  'Academic Block A',
  'Academic Block B',
  'Science Complex A',
  'Engineering Tower',
  'Library & Media Center',
  'Hostel Block C',
  'North Residential Hall',
  'Computer Science Lab',
  'Campus Dining Hall',
  'Sports Complex',
];

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CreateComplaintInput>({
    title: '',
    description: '',
    category: 'ELECTRICAL',
    priority: 'MEDIUM',
    building: '',
    floor: '',
    room: '',
    images: [],
  });

  const [selectedFiles, setSelectedFiles] = useState<SelectedImageFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUploadProgress(null);

    // Form validation
    if (formData.title.trim().length < 3) {
      setErrorMessage('Title must be at least 3 characters.');
      return;
    }

    if (formData.description.trim().length < 10) {
      setErrorMessage('Description must be at least 10 characters.');
      return;
    }

    if (!formData.building.trim()) {
      setErrorMessage('Please specify the building location.');
      return;
    }

    if (!formData.floor.trim()) {
      setErrorMessage('Please specify the floor.');
      return;
    }

    if (!formData.room.trim()) {
      setErrorMessage('Please specify the room, hall, or lab number.');
      return;
    }

    if (selectedFiles.length > 0 && !isCloudinaryConfigured) {
      setErrorMessage(
        'Cloudinary is not configured on the server. Please clear attached photos to submit text-only, or configure Cloudinary credentials.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      let res;
      if (selectedFiles.length > 0) {
        const multipart = new FormData();
        multipart.append('title', formData.title.trim());
        multipart.append('description', formData.description.trim());
        multipart.append('category', formData.category);
        multipart.append('priority', formData.priority);
        multipart.append('building', formData.building.trim());
        multipart.append('floor', formData.floor.trim());
        multipart.append('room', formData.room.trim());

        selectedFiles.forEach((f) => {
          multipart.append('images', f.file);
        });

        res = await apiService.createComplaint(multipart, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percent);
            }
          },
        });
      } else {
        res = await apiService.createComplaint(formData);
      }

      setSuccessMessage('Complaint lodged successfully! Redirecting...');
      const complaintId = res.data?.complaint?._id || res.data?.complaint?.id;
      setTimeout(() => {
        if (complaintId) {
          navigate(`/student/complaints/${complaintId}`);
        } else {
          navigate('/student/complaints');
        }
      }, 1200);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to submit complaint. Please check your connection.'
      );
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900 flex flex-col">
      <StudentNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/student/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Report a Campus Issue
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Submit a new facility maintenance or repair request for prompt resolution.
              </p>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Submission failed:</span> {errorMessage}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3 text-emerald-800 text-sm animate-pulse">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Complaint Form Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-7">
            {/* 1. Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Issue Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formData.title.length}/120 characters
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="e.g., Ceiling fan vibrating loudly, AC blowing warm air, Water leak beneath sink"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Provide a clear, brief headline summarizing the equipment or room problem.
              </p>
            </div>

            {/* 2. Category Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Facility Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`text-left p-2.5 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold">{cat.label}</div>
                      <div className="text-[10px] text-slate-500 mt-1 leading-tight line-clamp-2">
                        {cat.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Priority Level */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Urgency & Priority <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRIORITIES.map((p) => {
                  const isSelected = formData.priority === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setFormData({ ...formData, priority: p.id })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <PriorityBadge priority={p.id} size="sm" />
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight mt-1">
                        {p.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Location Details */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>Exact Location on Campus</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Building */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Building / Complex <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="building-suggestions"
                    placeholder="e.g. Academic Block A"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <datalist id="building-suggestions">
                    {COMMON_BUILDINGS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                {/* Floor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Floor Level <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2nd Floor or Ground"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                {/* Room / Lab */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room / Lab Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 204 or Hall B"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* 5. Detailed Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formData.description.length}/2000 characters
                </span>
              </div>
              <textarea
                required
                rows={5}
                maxLength={2000}
                placeholder="Explain the issue in detail. For example: When did it start? Does it occur continuously or intermittently? What equipment or safety concern is affected?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Minimum 10 characters. Please be descriptive so the maintenance department brings proper tools.
              </p>
            </div>

            {/* 6. Photo Attachments (Phase 5 Secure Cloudinary Upload) */}
            <div className="pt-2">
              <ImageDropzone
                files={selectedFiles}
                onChange={setSelectedFiles}
                maxFiles={5}
                maxSizeMB={5}
                disabled={isSubmitting}
                isCloudinaryConfigured={isCloudinaryConfigured}
                label="Student Evidence Photos"
                helperText="Upload up to 5 photos showing the broken equipment or facility issue (JPEG, PNG, WebP up to 5MB)."
              />
            </div>

            {/* Upload Progress Bar */}
            {isSubmitting && uploadProgress !== null && (
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-indigo-600 animate-bounce" />
                    Uploading evidence photos to Cloudinary...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <Link
                to="/student/dashboard"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg shadow-sm shadow-blue-600/25 transition-all hover:shadow cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Ticket...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Lodge Complaint</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
