import React from 'react';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '../types';
import {
  Zap,
  Droplet,
  Wifi,
  Armchair,
  Sparkles,
  Monitor,
  Shield,
  Bus,
  Home,
  HelpCircle,
  AlertCircle,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Wrench,
  CheckCheck,
  Archive,
} from 'lucide-react';

export const CategoryBadge: React.FC<{ category: ComplaintCategory; size?: 'sm' | 'md' }> = ({
  category,
  size = 'md',
}) => {
  const getCategoryDetails = () => {
    switch (category) {
      case 'ELECTRICAL':
        return { label: 'Electrical', icon: Zap, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'PLUMBING':
        return { label: 'Plumbing', icon: Droplet, bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'INTERNET_WIFI':
        return { label: 'Wi-Fi / Network', icon: Wifi, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'FURNITURE':
        return { label: 'Furniture', icon: Armchair, bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'CLEANING':
        return { label: 'Cleaning', icon: Sparkles, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'CLASSROOM_EQUIPMENT':
        return { label: 'Classroom Tech', icon: Monitor, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'SECURITY':
        return { label: 'Security', icon: Shield, bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'TRANSPORT':
        return { label: 'Transport', icon: Bus, bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'HOSTEL':
        return { label: 'Hostel', icon: Home, bg: 'bg-pink-50 text-pink-700 border-pink-200' };
      case 'OTHER':
      default:
        return { label: 'Other', icon: HelpCircle, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const { label, icon: Icon, bg } = getCategoryDetails();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${bg} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: ComplaintPriority; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'md',
}) => {
  const getPriorityDetails = () => {
    switch (priority) {
      case 'CRITICAL':
        return {
          label: 'Critical',
          icon: Flame,
          bg: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
          dot: 'bg-rose-600',
        };
      case 'HIGH':
        return {
          label: 'High',
          icon: AlertTriangle,
          bg: 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
          dot: 'bg-amber-500',
        };
      case 'MEDIUM':
        return {
          label: 'Medium',
          icon: AlertCircle,
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'LOW':
      default:
        return {
          label: 'Low',
          icon: Clock,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const { label, bg, dot } = getPriorityDetails();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  );
};

export const StatusPill: React.FC<{ status: ComplaintStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const getStatusDetails = () => {
    switch (status) {
      case 'OPEN':
        return {
          label: 'Open',
          icon: Clock,
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'ASSIGNED':
        return {
          label: 'Assigned',
          icon: Wrench,
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          icon: Clock,
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'RESOLVED':
        return {
          label: 'Resolved',
          icon: CheckCircle2,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'VERIFIED':
        return {
          label: 'Verified',
          icon: CheckCheck,
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
        };
      case 'CLOSED':
      default:
        return {
          label: 'Closed',
          icon: Archive,
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
        };
    }
  };

  const { label, icon: Icon, bg } = getStatusDetails();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${bg} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </span>
  );
};

export const StatusBadge = StatusPill;
