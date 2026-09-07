import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StudentNavbar } from '../components/StudentNavbar';
import { apiService } from '../services/api';
import {
  ComplaintCategory,
  ComplaintPriority,
  CreateComplaintInput,
  ComplaintAIAnalysis,
  DuplicateMatchItem,
  DuplicateDetectionResult,
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
  Check,
  X,
  Wrench,
  Bot,
  Search,
  ExternalLink,
} from 'lucide-react';
import { CategoryBadge, PriorityBadge, StatusPill } from '../components/ComplaintBadges';
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

const DEPARTMENT_LABELS: Record<string, string> = {
  ELEC: 'Electrical Maintenance',
  PLUMB: 'Plumbing & Water Systems',
  'IT-NET': 'IT & Network Infrastructure',
  FACIL: 'Campus Facilities & Operations',
  HOUSE: 'General Housekeeping',
};

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

  // Phase 7A AI States
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<ComplaintAIAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAppliedFeedback, setAiAppliedFeedback] = useState<string | null>(null);

  // Phase 7B AI Duplicate Detection States
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateDetectionResult | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [noDuplicatesNotice, setNoDuplicatesNotice] = useState(false);
  const [isDuplicateDismissed, setIsDuplicateDismissed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Phase 7B Duplicate Check Handler
  const handleCheckDuplicates = async () => {
    setDuplicateError(null);
    setNoDuplicatesNotice(false);
    setIsDuplicateDismissed(false);

    const trimmedDesc = formData.description.trim();
    const trimmedTitle = formData.title.trim();

    if (!trimmedDesc && !trimmedTitle) {
      setDuplicateError('Please enter a title or description before checking for duplicates.');
      return;
    }

    try {
      setIsCheckingDuplicates(true);
      const res = await apiService.checkDuplicateWithAI({
        title: trimmedTitle || undefined,
        description: trimmedDesc || trimmedTitle,
        category: formData.category,
        building: formData.building.trim() || undefined,
        floor: formData.floor.trim() || undefined,
        room: formData.room.trim() || undefined,
      });

      const data = res?.data || (res as any);
      if (res?.success && data) {
        if (data.hasDuplicate && data.matches && data.matches.length > 0) {
          setDuplicateResult(data);
          setNoDuplicatesNotice(false);
        } else {
          setDuplicateResult(null);
          setNoDuplicatesNotice(true);
        }
      } else {
        setDuplicateError('Duplicate checking is temporarily unavailable.');
      }
    } catch (err: any) {
      setDuplicateError('Duplicate checking is temporarily unavailable.');
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  // AI Analysis Handler
  const handleAnalyzeAI = async () => {
    setAiError(null);
    setAiAppliedFeedback(null);

    const trimmed = formData.description.trim();
    if (trimmed.length < 10) {
      setAiError('Please provide at least 10 characters in the description before requesting AI analysis.');
      return;
    }

    try {
      setIsAnalyzingAI(true);
      const res = await apiService.analyzeComplaintWithAI({
        description: trimmed,
        building: formData.building.trim() || undefined,
        floor: formData.floor.trim() || undefined,
        room: formData.room.trim() || undefined,
      });

      if (res?.success && res.data) {
        setAiRecommendation(res.data);
      } else {
        setAiError(
          res?.message ||
            'AI analysis is temporarily unavailable. You can continue submitting your complaint manually.'
        );
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        'AI analysis is temporarily unavailable. Please continue filling out the complaint manually.';
      setAiError(message);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const applyAllRecommendations = () => {
    if (!aiRecommendation) return;
    setFormData((prev) => ({
      ...prev,
      title: aiRecommendation.suggestedTitle || prev.title,
      category: aiRecommendation.category || prev.category,
      priority: aiRecommendation.priority || prev.priority,
    }));
    setAiAppliedFeedback('AI recommendations applied to form! You can further adjust any field below.');
  };

  const applyTitle = () => {
    if (!aiRecommendation) return;
    setFormData((prev) => ({ ...prev, title: aiRecommendation.suggestedTitle }));
    setAiAppliedFeedback('Suggested title applied.');
  };

  const applyCategory = () => {
    if (!aiRecommendation) return;
    setFormData((prev) => ({ ...prev, category: aiRecommendation.category }));
    setAiAppliedFeedback('Suggested category applied.');
  };

  const applyPriority = () => {
    if (!aiRecommendation) return;
    setFormData((prev) => ({ ...prev, priority: aiRecommendation.priority }));
    setAiAppliedFeedback('Suggested priority applied.');
  };

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

              {/* AI Analysis & Duplicate Check Action Bar */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5">
                <p className="text-[11px] text-slate-400">
                  Minimum 10 characters. Please be descriptive so the maintenance department brings proper tools.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="btn-check-duplicates"
                    onClick={handleCheckDuplicates}
                    disabled={isCheckingDuplicates || (!formData.description.trim() && !formData.title.trim())}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isCheckingDuplicates
                        ? 'bg-amber-50 text-amber-700 border-amber-200 cursor-wait'
                        : formData.description.trim() || formData.title.trim()
                        ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 cursor-pointer shadow-xs'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                    title={
                      !formData.description.trim() && !formData.title.trim()
                        ? 'Enter a title or description to check for existing similar complaints'
                        : 'Check if an existing active complaint already describes this issue'
                    }
                  >
                    {isCheckingDuplicates ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                        <span>Checking duplicates...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        <span>🔍 Check for Similar Issues</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="btn-analyze-ai"
                    onClick={handleAnalyzeAI}
                    disabled={isAnalyzingAI || formData.description.trim().length < 10}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                      isAnalyzingAI
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-wait'
                        : formData.description.trim().length >= 10
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 cursor-pointer shadow-blue-500/20'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                    title={
                      formData.description.trim().length < 10
                        ? 'Enter at least 10 characters in description to analyze'
                        : 'Analyze complaint using Gemini AI'
                    }
                  >
                    {isAnalyzingAI ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span>Analyzing with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>✨ Analyze with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Duplicate Check: No duplicates notice */}
              {noDuplicatesNotice && (
                <div
                  id="no-duplicates-notice"
                  className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">✓ No similar active complaints found.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNoDuplicatesNotice(false)}
                    className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Duplicate Check: Error or Unavailable */}
              {duplicateError && (
                <div
                  id="duplicate-error-notice"
                  className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{duplicateError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDuplicateError(null)}
                    className="text-slate-500 hover:text-slate-700 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Duplicate Check: Matches Found Panel */}
              {duplicateResult?.hasDuplicate && !isDuplicateDismissed && duplicateResult.matches.length > 0 && (
                <div
                  id="duplicate-complaints-panel"
                  className="mt-4 p-4.5 rounded-xl bg-amber-50/80 border border-amber-300 shadow-xs space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Search className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-amber-950">
                            Possible similar issue found
                          </h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 rounded-md">
                            {Math.round(duplicateResult.confidence * 100)}% Match
                          </span>
                        </div>
                        <p className="text-xs text-amber-800/90 mt-0.5">
                          An active complaint already exists that may describe this maintenance issue. You can review it or continue submitting.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="btn-continue-anyway-top"
                      onClick={() => setIsDuplicateDismissed(true)}
                      className="text-amber-800 hover:text-amber-950 p-1 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                      title="Dismiss and continue submitting"
                    >
                      <span>Dismiss</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Matched Complaints List */}
                  <div className="space-y-2.5">
                    {duplicateResult.matches.map((match) => (
                      <div
                        key={match.complaintId}
                        className="p-3.5 bg-white border border-amber-200/80 rounded-lg text-xs space-y-2.5 shadow-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {match.ticketId}
                            </span>
                            <CategoryBadge category={match.category} size="sm" />
                            <StatusPill status={match.status} />
                          </div>

                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                            {Math.round(match.confidence * 100)}% confidence
                          </span>
                        </div>

                        <div>
                          <h5 className="font-bold text-slate-900 text-sm mb-1">{match.title}</h5>
                          <p className="text-slate-600 line-clamp-2 leading-relaxed">
                            {match.shortDescription}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <div className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>
                              {match.location.building} • Floor {match.location.floor} • Room {match.location.room}
                            </span>
                          </div>
                        </div>

                        {/* AI Reason */}
                        <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-md text-[11px] text-amber-900">
                          <span className="font-semibold">AI Match Reason: </span>
                          {match.reason}
                        </div>

                        {/* Action Row */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <Link
                            to={`/student/complaints/${match.complaintId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <span>View Complaint</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>

                          <button
                            type="button"
                            id="btn-continue-anyway"
                            onClick={() => setIsDuplicateDismissed(true)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            Continue Anyway
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Applied Feedback Notice */}
              {aiAppliedFeedback && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{aiAppliedFeedback}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiAppliedFeedback(null)}
                    className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* AI Error Alert (Non-blocking) */}
              {aiError && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start justify-between text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">AI Assistant Notice:</span> {aiError}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiError(null)}
                    className="text-amber-700 hover:text-amber-900 p-1 shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* AI Recommendation Card */}
              {aiRecommendation && (
                <div
                  id="ai-recommendation-card"
                  className="mt-4 p-5 rounded-xl bg-gradient-to-b from-indigo-50/50 to-slate-50 border border-indigo-200/80 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                            AI Recommendation
                          </h4>
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded-md">
                            Gemini 3.8 Flash
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Review suggested triage and actions below. You can apply all or individual recommendations.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiRecommendation(null)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                      title="Dismiss recommendation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Suggested Title */}
                    <div className="p-3 bg-white border border-slate-200 rounded-lg sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Suggested Title
                        </span>
                        <button
                          type="button"
                          onClick={applyTitle}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Use this title
                        </button>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {aiRecommendation.suggestedTitle}
                      </p>
                    </div>

                    {/* Suggested Category */}
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Recommended Category
                        </span>
                        <button
                          type="button"
                          onClick={applyCategory}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <CategoryBadge category={aiRecommendation.category} size="sm" />
                      </div>
                    </div>

                    {/* Suggested Priority */}
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Assessed Urgency
                        </span>
                        <button
                          type="button"
                          onClick={applyPriority}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={aiRecommendation.priority} size="sm" />
                      </div>
                    </div>

                    {/* Responsible Department */}
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Responsible Department
                      </span>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {DEPARTMENT_LABELS[aiRecommendation.departmentCode] ||
                            aiRecommendation.departmentCode}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ({aiRecommendation.departmentCode})
                        </span>
                      </div>
                    </div>

                    {/* AI Summary */}
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Issue Summary
                      </span>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        {aiRecommendation.summary}
                      </p>
                    </div>

                    {/* Suggested Maintenance Action */}
                    <div className="p-3 bg-white border border-slate-200 rounded-lg sm:col-span-2">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                        <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Recommended Maintenance Action</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {aiRecommendation.suggestedAction}
                      </p>
                    </div>
                  </div>

                  {/* Accept or Dismiss Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-indigo-100">
                    <button
                      type="button"
                      onClick={() => setAiRecommendation(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>

                    <button
                      type="button"
                      id="btn-apply-all-ai"
                      onClick={applyAllRecommendations}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply All Recommendations</span>
                    </button>
                  </div>
                </div>
              )}
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
