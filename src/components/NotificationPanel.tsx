import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { AppNotification, NotificationType } from '../types';
import {
  CheckCheck,
  Bell,
  Clock,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Wrench,
  ShieldAlert,
} from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'COMPLAINT_CREATED':
      return <AlertCircle className="w-4 h-4 text-blue-500" />;
    case 'COMPLAINT_ASSIGNED':
      return <Wrench className="w-4 h-4 text-amber-500" />;
    case 'STATUS_CHANGED':
      return <Clock className="w-4 h-4 text-indigo-500" />;
    case 'COMMENT_ADDED':
      return <MessageSquare className="w-4 h-4 text-purple-500" />;
    case 'COMPLAINT_RESOLVED':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'COMPLAINT_VERIFIED':
    case 'COMPLAINT_CLOSED':
      return <CheckCircle2 className="w-4 h-4 text-teal-500" />;
    case 'PRIORITY_CHANGED':
      return <ShieldAlert className="w-4 h-4 text-rose-500" />;
    default:
      return <Bell className="w-4 h-4 text-slate-500" />;
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
    onClose();

    if (notif.relatedComplaint) {
      const complaintId =
        typeof notif.relatedComplaint === 'object'
          ? notif.relatedComplaint._id || (notif.relatedComplaint as any).id
          : notif.relatedComplaint;
      if (complaintId) {
        navigate(`/student/complaints/${complaintId}`);
      }
    }
  };

  return (
    <div
      ref={panelRef}
      id="notification-dropdown-panel"
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-900">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            id="mark-all-read-button"
            onClick={() => markAllAsRead()}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <Bell className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-600">No notifications yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Updates about your complaints will appear here in real-time.
            </p>
          </div>
        ) : (
          notifications.slice(0, 10).map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 text-left ${
                !notif.isRead ? 'bg-blue-50/40' : ''
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                {getNotificationIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs truncate ${
                      !notif.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                    }`}
                  >
                    {notif.title}
                  </span>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                  {notif.message}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {formatTimeAgo(notif.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <Link
          to="/notifications"
          onClick={onClose}
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
        >
          <span>View all notifications</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
        <span className="text-[11px] text-slate-400">Real-time sync active</span>
      </div>
    </div>
  );
};
