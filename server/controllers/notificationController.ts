import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { Notification } from '../models/Notification.js';

/**
 * GET /api/notifications
 * Retrieves paginated notification history for the authenticated user.
 */
export async function getNotifications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const unreadOnly = req.query.unreadOnly === 'true';

    const filter: Record<string, any> = {
      recipient: new mongoose.Types.ObjectId(userId),
    };

    if (unreadOnly) {
      filter.isRead = false;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('relatedComplaint', 'title status priority category building room')
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        recipient: new mongoose.Types.ObjectId(userId),
        isRead: false,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/notifications/unread-count
 * Returns the unread notification badge count for the authenticated user.
 */
export async function getUnreadNotificationCount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const unreadCount = await Notification.countDocuments({
      recipient: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 * Enforces ownership: users can only mark their own notifications.
 */
export async function markNotificationAsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid notification ID format.',
      });
      return;
    }

    // Strictly enforce recipient ownership
    const notification = await Notification.findOne({
      _id: id,
      recipient: new mongoose.Types.ObjectId(userId),
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or you are not authorized to access it.',
      });
      return;
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications for the authenticated user as read.
 */
export async function markAllNotificationsAsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await Notification.updateMany(
      {
        recipient: new mongoose.Types.ObjectId(userId),
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: {
        updatedCount: result.modifiedCount,
        unreadCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
