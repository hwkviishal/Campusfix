import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { AppNotification, Complaint, ComplaintComment } from '../types';
import { apiService } from '../services/api';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  recentToast: AppNotification | null;
  dismissToast: () => void;
  joinComplaint: (complaintId: string) => void;
  leaveComplaint: (complaintId: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  onComplaintUpdated: (handler: (complaint: Complaint) => void) => () => void;
  onCommentNew: (handler: (comment: ComplaintComment) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentToast, setRecentToast] = useState<AppNotification | null>(null);

  // Event listener registries
  const complaintListenersRef = useRef<Set<(complaint: Complaint) => void>>(new Set());
  const commentListenersRef = useRef<Set<(comment: ComplaintComment) => void>>(new Set());

  // Initial load of unread count & recent notifications
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [resNotifs, resCount] = await Promise.all([
        apiService.getNotifications({ page: 1, limit: 15 }),
        apiService.getUnreadNotificationCount(),
      ]);

      if (resNotifs.success && resNotifs.data) {
        setNotifications(resNotifs.data.notifications);
      }
      if (resCount.success && resCount.data) {
        setUnreadCount(resCount.data.unreadCount);
      }
    } catch (err) {
      console.warn('[SocketContext] Failed to fetch notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setRecentToast(null);
    }
  }, [user, refreshNotifications]);

  // Socket connection lifecycle
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to same origin with credentials & optional auth token
    const socketUrl = window.location.origin;
    const socketInstance: Socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: {
        token: token || undefined,
      },
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected with ID:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[Socket] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Real-time notification received
    socketInstance.on('notification:new', (notification: AppNotification) => {
      setNotifications((prev) => {
        // Prevent duplicate entries
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount((count) => count + 1);
      setRecentToast(notification);
    });

    // Real-time notification marked as read
    socketInstance.on('notification:read', (data: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === data.notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    });

    // Real-time complaint update
    socketInstance.on('complaint:updated', (complaint: Complaint) => {
      complaintListenersRef.current.forEach((handler) => {
        try {
          handler(complaint);
        } catch (e) {
          console.error('[Socket] Complaint listener error:', e);
        }
      });
    });

    // Real-time comment posted
    socketInstance.on('comment:new', (comment: ComplaintComment) => {
      commentListenersRef.current.forEach((handler) => {
        try {
          handler(comment);
        } catch (e) {
          console.error('[Socket] Comment listener error:', e);
        }
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, token]);

  const dismissToast = useCallback(() => {
    setRecentToast(null);
  }, []);

  const joinComplaint = useCallback(
    (complaintId: string) => {
      if (socket && isConnected) {
        socket.emit('complaint:join', { complaintId });
      }
    },
    [socket, isConnected]
  );

  const leaveComplaint = useCallback(
    (complaintId: string) => {
      if (socket && isConnected) {
        socket.emit('complaint:leave', { complaintId });
      }
    },
    [socket, isConnected]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const res = await apiService.markNotificationAsRead(id);
        if (res.success) {
          setNotifications((prev) =>
            prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
          );
          setUnreadCount((count) => Math.max(0, count - 1));
        }
      } catch (err) {
        console.error('[SocketContext] Error marking notification as read:', err);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await apiService.markAllNotificationsAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[SocketContext] Error marking all notifications as read:', err);
    }
  }, []);

  const onComplaintUpdated = useCallback((handler: (complaint: Complaint) => void) => {
    complaintListenersRef.current.add(handler);
    return () => {
      complaintListenersRef.current.delete(handler);
    };
  }, []);

  const onCommentNew = useCallback((handler: (comment: ComplaintComment) => void) => {
    commentListenersRef.current.add(handler);
    return () => {
      commentListenersRef.current.delete(handler);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        unreadCount,
        recentToast,
        dismissToast,
        joinComplaint,
        leaveComplaint,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        onComplaintUpdated,
        onCommentNew,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
