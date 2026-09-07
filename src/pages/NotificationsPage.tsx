import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { AppNotification, NotificationType } from '../types';
import { apiService } from '../services/api';
import { StudentNavbar } from '../components/StudentNavbar';
import { AdminLayout } from '../components/AdminLayout';
import { TechnicianLayout } from '../components/TechnicianLayout';
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Wrench,
  ShieldAlert,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'COMPLAINT_CREATED':
      return <AlertCircle className="w-5 h-5 text-blue-500" />;
    case 'COMPLAINT_ASSIGNED':
      return <Wrench className="w-5 h-5 text-amber-500" />;
    case 'STATUS_CHANGED':
      return <Clock className="w-5 h-5 text-indigo-500" />;
    case 'COMMENT_ADDED':
      return <MessageSquare className="w-5 h-5 text-purple-500" />;
    case 'COMPLAINT_RESOLVED':
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'COMPLAINT_VERIFIED':
    case 'COMPLAINT_CLOSED':
      return <CheckCircle2 className="w-5 h-5 text-teal-500" />;
    case 'PRIORITY_CHANGED':
      return <ShieldAlert className="w-5 h-5 text-rose-500" />;
    default:
      return <Bell className="w-5 h-5 text-slate-500" />;
  }
}

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { markAsRead, markAllAsRead, refreshNotifications: refreshSocketContext } = useSocket();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getNotifications({
        page,
        limit: 15,
        unreadOnly,
      });

      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalCount(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    refreshSocketContext();
  };

  const handleNavigateToComplaint = (notif: AppNotification) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }

    if (notif.relatedComplaint) {
      const complaintId =
        typeof notif.relatedComplaint === 'object'
          ? notif.relatedComplaint._id || (notif.relatedComplaint as any).id
          : notif.relatedComplaint;

      if (!complaintId) return;

      if (user?.role === 'ADMIN') {
        navigate(`/admin/complaints/${complaintId}`);
      } else if (user?.role === 'TECHNICIAN') {
        navigate(`/technician/tasks/${complaintId}`);
      } else {
        navigate(`/student/complaints/${complaintId}`);
      }
    }
  };

  const content = (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Activity Notifications
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time updates regarding your reported complaints, assignments, and comments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                id="page-mark-all-read-btn"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read ({unreadCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => {
              setUnreadOnly(false);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              !unreadOnly
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>All Notifications</span>
            <span className="text-[10px] opacity-75">({totalCount})</span>
          </button>

          <button
            onClick={() => {
              setUnreadOnly(true);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              unreadOnly
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Unread Only</span>
            {unreadCount > 0 && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No notifications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {unreadOnly
                ? 'You have caught up with everything! No unread notifications.'
                : 'When actions occur on complaints, updates will appear here in real-time.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => handleNavigateToComplaint(notif)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer ${
                  !notif.isRead ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm tracking-tight ${
                          !notif.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                        }`}
                      >
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 rounded-full">
                          New
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                      {notif.relatedComplaint && (
                        <span className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                          <span>View Complaint</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!notif.isRead && (
                  <button
                    onClick={(e) => handleMarkOne(notif._id, e)}
                    className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (user?.role === 'ADMIN') {
    return (
      <AdminLayout title="Notifications" subtitle="Campus-wide activity stream and administrative alerts">
        {content}
      </AdminLayout>
    );
  }

  if (user?.role === 'TECHNICIAN') {
    return (
      <TechnicianLayout title="Notifications" subtitle="Task assignments and update notifications">
        {content}
      </TechnicianLayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StudentNavbar />
      <main className="flex-1">{content}</main>
    </div>
  );
};
