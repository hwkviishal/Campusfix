import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notificationController.js';

const router = Router();

// All notification routes strictly require authentication
router.use(requireAuth);

// Get paginated notifications
router.get('/', getNotifications);

// Get unread notification count badge
router.get('/unread-count', getUnreadNotificationCount);

// Mark all notifications as read
router.patch('/read-all', markAllNotificationsAsRead);

// Mark a single notification as read
router.patch('/:id/read', markNotificationAsRead);

export default router;
