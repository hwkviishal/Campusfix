import mongoose, { Types } from 'mongoose';
import { Notification, INotification, NotificationType } from '../models/Notification.js';
import { IComplaint } from '../models/Complaint.js';
import { User } from '../models/User.js';
import { emitToUser, emitComplaintUpdated, emitToAdmins } from './socketService.js';

export interface CreateNotificationInput {
  recipient: Types.ObjectId | string;
  title: string;
  message: string;
  type: NotificationType;
  relatedComplaint?: Types.ObjectId | string;
}

export class NotificationService {
  /**
   * Core function to create, persist, and emit a real-time notification.
   * Includes duplicate check to prevent duplicate notifications if an action runs in rapid succession.
   */
  public async createNotification(
    input: CreateNotificationInput
  ): Promise<INotification | null> {
    try {
      const recipientId = new mongoose.Types.ObjectId(input.recipient.toString());
      const complaintId = input.relatedComplaint
        ? new mongoose.Types.ObjectId(input.relatedComplaint.toString())
        : undefined;

      // Duplicate prevention: check if identical notification was created within last 3 seconds
      const threeSecondsAgo = new Date(Date.now() - 3000);
      const duplicate = await Notification.findOne({
        recipient: recipientId,
        type: input.type,
        relatedComplaint: complaintId,
        message: input.message,
        createdAt: { $gte: threeSecondsAgo },
      }).lean();

      if (duplicate) {
        return null;
      }

      const notification = await Notification.create({
        recipient: recipientId,
        title: input.title.trim(),
        message: input.message.trim(),
        type: input.type,
        relatedComplaint: complaintId,
        isRead: false,
      });

      // Emit real-time socket event to the intended recipient's personal room
      emitToUser(recipientId.toString(), 'notification:new', {
        notification: {
          _id: notification._id.toString(),
          id: notification._id.toString(),
          recipient: recipientId.toString(),
          title: notification.title,
          message: notification.message,
          type: notification.type,
          relatedComplaint: complaintId ? complaintId.toString() : undefined,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
        },
      });

      return notification;
    } catch (error) {
      // Notification errors must not crash caller transactions or handlers
      console.error('[NotificationService] Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Triggered when a new complaint is filed by a student.
   */
  public async notifyComplaintCreated(complaint: any): Promise<void> {
    try {
      const studentId = complaint.reportedBy?._id || complaint.reportedBy;
      const complaintId = complaint._id;

      // 1. Notify the reporting student
      if (studentId) {
        await this.createNotification({
          recipient: studentId,
          title: 'Complaint Submitted',
          message: `Your complaint "${complaint.title}" was successfully submitted and is awaiting assignment.`,
          type: 'COMPLAINT_CREATED',
          relatedComplaint: complaintId,
        });
      }

      // 2. Notify active administrators of the new issue docket
      const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id').lean();
      for (const admin of admins) {
        await this.createNotification({
          recipient: admin._id,
          title: 'New Complaint Filed',
          message: `New complaint filed: "${complaint.title}" in ${complaint.building} (Room ${complaint.room}).`,
          type: 'COMPLAINT_CREATED',
          relatedComplaint: complaintId,
        });
      }

      emitComplaintUpdated(complaint);
    } catch (err) {
      console.error('[NotificationService] notifyComplaintCreated error:', err);
    }
  }

  /**
   * Triggered when an administrator assigns a technician to a complaint.
   */
  public async notifyComplaintAssigned(
    complaint: any,
    technicianId: Types.ObjectId | string,
    assignedBy?: Types.ObjectId | string
  ): Promise<void> {
    try {
      const studentId = complaint.reportedBy?._id || complaint.reportedBy;
      const complaintId = complaint._id;

      // 1. Notify the student
      if (studentId) {
        await this.createNotification({
          recipient: studentId,
          title: 'Complaint Assigned',
          message: `Your complaint "${complaint.title}" has been assigned to a field technician.`,
          type: 'COMPLAINT_ASSIGNED',
          relatedComplaint: complaintId,
        });
      }

      // 2. Notify the assigned technician
      if (technicianId) {
        await this.createNotification({
          recipient: technicianId,
          title: 'New Maintenance Task Assigned',
          message: `You have been assigned a new task: "${complaint.title}" (${complaint.building}, Floor ${complaint.floor}, Room ${complaint.room}).`,
          type: 'COMPLAINT_ASSIGNED',
          relatedComplaint: complaintId,
        });
      }

      emitComplaintUpdated(complaint);
    } catch (err) {
      console.error('[NotificationService] notifyComplaintAssigned error:', err);
    }
  }

  /**
   * Generic handler when complaint status undergoes lifecycle transition.
   */
  public async notifyStatusChanged(
    complaint: any,
    oldStatus: string,
    newStatus: string,
    changedByUserId?: Types.ObjectId | string
  ): Promise<void> {
    try {
      if (oldStatus === newStatus) return;

      if (newStatus === 'ASSIGNED') {
        if (complaint.assignedTo) {
          await this.notifyComplaintAssigned(complaint, complaint.assignedTo, changedByUserId);
        }
        return;
      }

      if (newStatus === 'IN_PROGRESS') {
        const studentId = complaint.reportedBy?._id || complaint.reportedBy;
        if (studentId) {
          await this.createNotification({
            recipient: studentId,
            title: 'Maintenance Work Started',
            message: `A technician has begun active work on your complaint "${complaint.title}".`,
            type: 'STATUS_CHANGED',
            relatedComplaint: complaint._id,
          });
        }
        emitComplaintUpdated(complaint);
        return;
      }

      if (newStatus === 'RESOLVED') {
        await this.notifyComplaintResolved(complaint, changedByUserId);
        return;
      }

      if (newStatus === 'VERIFIED') {
        await this.notifyComplaintVerified(complaint, changedByUserId);
        return;
      }

      if (newStatus === 'CLOSED') {
        await this.notifyComplaintClosed(complaint, changedByUserId);
        return;
      }

      // Fallback status change
      const studentId = complaint.reportedBy?._id || complaint.reportedBy;
      if (studentId) {
        await this.createNotification({
          recipient: studentId,
          title: 'Complaint Status Updated',
          message: `The status of "${complaint.title}" was updated to ${newStatus}.`,
          type: 'STATUS_CHANGED',
          relatedComplaint: complaint._id,
        });
      }
      emitComplaintUpdated(complaint);
    } catch (err) {
      console.error('[NotificationService] notifyStatusChanged error:', err);
    }
  }

  /**
   * Triggered when technician marks a task as RESOLVED.
   */
  public async notifyComplaintResolved(
    complaint: any,
    resolvedBy?: Types.ObjectId | string
  ): Promise<void> {
    try {
      const studentId = complaint.reportedBy?._id || complaint.reportedBy;
      const complaintId = complaint._id;

      // 1. Notify student to review and verify resolution
      if (studentId) {
        await this.createNotification({
          recipient: studentId,
          title: 'Complaint Resolved',
          message: `Your complaint "${complaint.title}" has been marked as resolved by the technician. Please review the resolution.`,
          type: 'COMPLAINT_RESOLVED',
          relatedComplaint: complaintId,
        });
      }

      // 2. Notify administrators
      const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id').lean();
      for (const admin of admins) {
        // Do not self-notify if admin was the resolver
        if (resolvedBy && admin._id.toString() === resolvedBy.toString()) continue;
        await this.createNotification({
          recipient: admin._id,
          title: 'Complaint Marked Resolved',
          message: `Complaint "${complaint.title}" was marked resolved by the technician.`,
          type: 'COMPLAINT_RESOLVED',
          relatedComplaint: complaintId,
        });
      }

      emitComplaintUpdated(complaint);
    } catch (err) {
      console.error('[NotificationService] notifyComplaintResolved error:', err);
    }
  }

  /**
   * Triggered when complaint resolution is VERIFIED.
   */
  public async notifyComplaintVerified(
    complaint: any,
    verifiedBy?: Types.ObjectId | string
  ): Promise<void> {
    try {
      const studentId = complaint.reportedBy?._id || complaint.reportedBy;
      const techId = complaint.assignedTo?._id || complaint.assignedTo;
      const complaintId = complaint._id;

      // 1. Notify student
      if (studentId) {
        await this.createNotification({
          recipient: studentId,
          title: 'Complaint Verified',
          message: `The resolution for "${complaint.title}" has been verified.`,
          type: 'COMPLAINT_VERIFIED',
          relatedComplaint: complaintId,
        });
      }

      // 2. Notify assigned technician
      if (techId && (!verifiedBy || techId.toString() !== verifiedBy.toString())) {
        await this.createNotification({
          recipient: techId,
          title: 'Resolution Verified',
          message: `Your resolution work for "${complaint.title}" was verified by the administrator.`,
          type: 'COMPLAINT_VERIFIED',
          relatedComplaint: complaintId,
        });
      }

      emitComplaintUpdated(complaint);
    } catch (err) {
      console.error('[NotificationService] notifyComplaintVerified error:', err);
    }
  }

  /**
   * Triggered when complaint is CLOSED.
   */
  public async notifyComplaintClosed(
    complaint: any,
    closedBy?: Types.ObjectId | string
  ): Promise<void> {
    try {
      const studentId = complaint.reportedBy?._id || complaint.reportedBy;
      const techId = complaint.assignedTo?._id || complaint.assignedTo;
      const complaintId = complaint._id;

      // 1. Notify student
      if (studentId) {
        await this.createNotification({
          recipient: studentId,
          title: 'Complaint Closed',
          message: `Your complaint "${complaint.title}" has been closed.`,
          type: 'COMPLAINT_CLOSED',
          relatedComplaint: complaintId,
        });
      }

      // 2. Notify assigned technician if different from closedBy
      if (techId && (!closedBy || techId.toString() !== closedBy.toString())) {
        await this.createNotification({
          recipient: techId,
          title: 'Task Closed',
          message: `Maintenance task "${complaint.title}" has been officially closed.`,
          type: 'COMPLAINT_CLOSED',
          relatedComplaint: complaintId,
        });
      }

      emitComplaintUpdated(complaint);
    } catch (err) {
      console.error('[NotificationService] notifyComplaintClosed error:', err);
    }
  }

  /**
   * Triggered when an administrator updates the priority of a complaint.
   */
  public async notifyPriorityChanged(
    complaint: any,
    oldPriority: string,
    newPriority: string,
    updatedBy?: Types.ObjectId | string
  ): Promise<void> {
    try {
      const studentId = complaint.reportedBy?._id || complaint.reportedBy;
      const techId = complaint.assignedTo?._id || complaint.assignedTo;
      const complaintId = complaint._id;

      // 1. Notify student
      if (studentId) {
        await this.createNotification({
          recipient: studentId,
          title: 'Complaint Priority Updated',
          message: `The priority for "${complaint.title}" has been set to ${newPriority}.`,
          type: 'PRIORITY_CHANGED',
          relatedComplaint: complaintId,
        });
      }

      // 2. Notify technician if assigned
      if (techId && (!updatedBy || techId.toString() !== updatedBy.toString())) {
        await this.createNotification({
          recipient: techId,
          title: 'Task Priority Updated',
          message: `The priority of task "${complaint.title}" was updated to ${newPriority}.`,
          type: 'PRIORITY_CHANGED',
          relatedComplaint: complaintId,
        });
      }

      emitComplaintUpdated(complaint);
    } catch (err) {
      console.error('[NotificationService] notifyPriorityChanged error:', err);
    }
  }

  /**
   * Triggered when a new comment is posted to a complaint.
   * Critical security constraints:
   * - Author NEVER receives a self-notification.
   * - Students MUST NEVER receive notifications for internal comments.
   */
  public async notifyCommentAdded(
    comment: any,
    complaint: any,
    author: { id: string; name: string; role: string }
  ): Promise<void> {
    try {
      const authorId = author.id.toString();
      const complaintId = complaint._id;
      const studentId = complaint.reportedBy?._id
        ? complaint.reportedBy._id.toString()
        : complaint.reportedBy?.toString();
      const techId = complaint.assignedTo?._id
        ? complaint.assignedTo._id.toString()
        : complaint.assignedTo?.toString();

      const isInternal = Boolean(comment.isInternal);

      // Case A: Internal Comment
      if (isInternal) {
        // Students MUST NEVER receive internal comments or notifications!
        // 1. Notify assigned technician if not the author
        if (techId && techId !== authorId) {
          await this.createNotification({
            recipient: techId,
            title: 'Internal Note Added',
            message: `${author.name} added an internal note to "${complaint.title}".`,
            type: 'COMMENT_ADDED',
            relatedComplaint: complaintId,
          });
        }

        // 2. Notify administrators if not the author
        const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id').lean();
        for (const admin of admins) {
          if (admin._id.toString() === authorId) continue;
          await this.createNotification({
            recipient: admin._id,
            title: 'Internal Note on Complaint',
            message: `${author.name} (${author.role}) added an internal note to "${complaint.title}".`,
            type: 'COMMENT_ADDED',
            relatedComplaint: complaintId,
          });
        }
        return;
      }

      // Case B: Public Comment
      // 1. Notify reporting student if not the author
      if (studentId && studentId !== authorId) {
        await this.createNotification({
          recipient: studentId,
          title: 'New Comment on Your Complaint',
          message: `${author.name} (${author.role}) commented on "${complaint.title}".`,
          type: 'COMMENT_ADDED',
          relatedComplaint: complaintId,
        });
      }

      // 2. Notify assigned technician if assigned and not the author
      if (techId && techId !== authorId) {
        await this.createNotification({
          recipient: techId,
          title: 'New Comment on Assigned Task',
          message: `${author.name} commented on "${complaint.title}".`,
          type: 'COMMENT_ADDED',
          relatedComplaint: complaintId,
        });
      }

      // 3. Notify administrators if author is not an admin
      if (author.role !== 'ADMIN') {
        const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id').lean();
        for (const admin of admins) {
          if (admin._id.toString() === authorId) continue;
          await this.createNotification({
            recipient: admin._id,
            title: 'New Comment on Complaint',
            message: `${author.name} commented on "${complaint.title}".`,
            type: 'COMMENT_ADDED',
            relatedComplaint: complaintId,
          });
        }
      }
    } catch (err) {
      console.error('[NotificationService] notifyCommentAdded error:', err);
    }
  }
}

export const notificationService = new NotificationService();
