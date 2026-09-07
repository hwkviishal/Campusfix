import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { Complaint } from '../models/Complaint.js';
import { Comment } from '../models/Comment.js';
import { notificationService } from '../services/notificationService.js';
import { emitToComplaint } from '../services/socketService.js';

/**
 * GET /api/complaints/:id/comments
 * Retrieves all comments on a complaint for authorized users.
 * Students only receive public comments (isInternal: false).
 * Technicians and Admins receive both public and internal comments.
 */
export async function getComplaintComments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format.',
      });
      return;
    }

    const complaint = await Complaint.findById(id).lean();
    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
      return;
    }

    // Role-based Access Control
    if (user.role === 'STUDENT') {
      const isOwner = complaint.reportedBy?.toString() === user.id;
      if (!isOwner) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You can only view comments on your own complaints.',
        });
        return;
      }
    } else if (user.role === 'TECHNICIAN') {
      const isAssigned = complaint.assignedTo?.toString() === user.id;
      if (!isAssigned) {
        res.status(403).json({
          success: false,
          message: 'Access denied: Technicians can only view comments on assigned tasks.',
        });
        return;
      }
    }
    // ADMIN has full read access to all complaint comments

    // Query filter: students never see internal comments
    const commentFilter: Record<string, any> = {
      complaint: new mongoose.Types.ObjectId(id),
    };

    if (user.role === 'STUDENT') {
      commentFilter.isInternal = false;
    }

    const comments = await Comment.find(commentFilter)
      .sort({ createdAt: 1 })
      .populate('author', 'name email role')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Comments retrieved successfully.',
      data: {
        comments,
        count: comments.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/complaints/:id/comments
 * Adds a new comment or internal note to a complaint docket.
 * Students cannot create internal comments.
 */
export async function addComplaintComment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { message, isInternal } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format.',
      });
      return;
    }

    // Sanitize and validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        success: false,
        message: 'Comment message is required.',
      });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 2000) {
      res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 2000 characters.',
      });
      return;
    }

    const wantsInternal = Boolean(isInternal);

    // Rule: Students are strictly forbidden from creating internal comments
    if (user.role === 'STUDENT' && wantsInternal) {
      res.status(403).json({
        success: false,
        message: 'Students are not authorized to create internal notes.',
      });
      return;
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
      return;
    }

    // Authorization checks
    if (user.role === 'STUDENT') {
      const isOwner = complaint.reportedBy?.toString() === user.id;
      if (!isOwner) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You can only comment on your own complaints.',
        });
        return;
      }
    } else if (user.role === 'TECHNICIAN') {
      const isAssigned = complaint.assignedTo?.toString() === user.id;
      if (!isAssigned) {
        res.status(403).json({
          success: false,
          message: 'Access denied: Technicians can only comment on assigned tasks.',
        });
        return;
      }
    }
    // ADMIN can comment on any complaint

    // Create and persist the comment
    const comment = await Comment.create({
      complaint: complaint._id,
      author: new mongoose.Types.ObjectId(user.id),
      message: trimmedMessage,
      isInternal: wantsInternal,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name email role')
      .lean();

    // Trigger asynchronous notification generation (safe error handling inside service)
    await notificationService.notifyCommentAdded(
      populatedComment,
      complaint,
      {
        id: user.id,
        name: user.name || 'User',
        role: user.role || 'STUDENT',
      }
    );

    // Real-time socket event broadcast
    emitToComplaint(
      id,
      'comment:new',
      {
        complaintId: id,
        comment: populatedComment,
      },
      { internalOnly: wantsInternal }
    );

    res.status(201).json({
      success: true,
      message: wantsInternal
        ? 'Internal note successfully recorded.'
        : 'Comment added successfully.',
      data: {
        comment: populatedComment,
      },
    });
  } catch (error) {
    next(error);
  }
}
