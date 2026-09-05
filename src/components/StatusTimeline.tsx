import React from 'react';
import { ComplaintStatus, StatusHistoryItem } from '../types';
import { Check, Clock, AlertCircle } from 'lucide-react';

interface StatusTimelineProps {
  currentStatus: ComplaintStatus;
  history?: StatusHistoryItem[];
}

const LIFECYCLE_STEPS: { status: ComplaintStatus; label: string; description: string }[] = [
  { status: 'OPEN', label: 'Reported', description: 'Complaint logged into system' },
  { status: 'ASSIGNED', label: 'Assigned', description: 'Routed to facility department' },
  { status: 'IN_PROGRESS', label: 'In Progress', description: 'Technician on-site fixing issue' },
  { status: 'RESOLVED', label: 'Resolved', description: 'Repairs completed by technician' },
  { status: 'VERIFIED', label: 'Verified', description: 'Quality inspection confirmed' },
  { status: 'CLOSED', label: 'Closed', description: 'Ticket archived and completed' },
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStatus, history }) => {
  const currentIndex = LIFECYCLE_STEPS.findIndex((s) => s.status === currentStatus);

  // Map history comments or timestamps to steps if available
  const getHistoryInfoForStatus = (status: ComplaintStatus) => {
    if (!history) return null;
    return history.find((h) => h.status === status);
  };

  return (
    <div className="w-full py-4">
      {/* Step Indicators Bar */}
      <div className="relative">
        {/* Background track line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-0 hidden md:block" />

        {/* Progress track line */}
        <div
          className="absolute top-4 left-4 h-0.5 bg-blue-600 transition-all duration-500 -z-0 hidden md:block"
          style={{
            width: `${Math.max(0, (currentIndex / (LIFECYCLE_STEPS.length - 1)) * 100)}%`,
          }}
        />

        {/* Steps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-2">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;
            const hist = getHistoryInfoForStatus(step.status);

            return (
              <div
                key={step.status}
                className="relative flex flex-col items-center text-center p-2 rounded-lg bg-white md:bg-transparent border md:border-transparent border-slate-200"
              >
                {/* Dot / Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all mb-2 shadow-xs ${
                    isCompleted
                      ? 'bg-blue-600 text-white ring-4 ring-blue-50'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Label */}
                <div
                  className={`text-xs font-semibold tracking-tight ${
                    isCurrent
                      ? 'text-blue-700'
                      : isCompleted
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </div>

                {/* Secondary Description */}
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5 hidden md:block">
                  {step.description}
                </div>

                {/* Timestamp if present in history */}
                {hist && (
                  <div className="text-[10px] text-blue-600 font-mono mt-1">
                    {new Date(hist.timestamp).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
