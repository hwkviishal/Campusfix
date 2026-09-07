import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Bell, X, ArrowRight } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { recentToast, dismissToast, markAsRead } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!recentToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [recentToast, dismissToast]);

  if (!recentToast) return null;

  const handleClick = async () => {
    if (recentToast._id) {
      await markAsRead(recentToast._id);
    }
    dismissToast();
    if (recentToast.relatedComplaint) {
      const complaintId =
        typeof recentToast.relatedComplaint === 'object'
          ? recentToast.relatedComplaint._id || (recentToast.relatedComplaint as any).id
          : recentToast.relatedComplaint;
      if (complaintId) {
        navigate(`/student/complaints/${complaintId}`);
      }
    } else {
      navigate('/notifications');
    }
  };

  return (
    <aside
      id="realtime-notification-toast"
      aria-label="Real-time Notification"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 p-4 transform transition-all duration-300 ease-out animate-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              {recentToast.title}
            </h4>
            <button
              onClick={dismissToast}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors"
              title="Dismiss toast"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-200 mt-1 line-clamp-2 leading-relaxed">
            {recentToast.message}
          </p>
          <div className="mt-2.5 flex items-center justify-between">
            <button
              onClick={handleClick}
              className="text-xs font-medium text-blue-300 hover:text-blue-100 flex items-center gap-1 transition-colors"
            >
              <span>View details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-slate-400">Just now</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
