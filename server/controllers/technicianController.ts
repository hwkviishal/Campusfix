import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { Complaint } from '../models/Complaint.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import {
  uploadMultipleImages,
  deleteMultipleImagesFromCloudinary,
  UploadedImageResult,
} from '../services/cloudinaryService.js';

/**
 * GET /api/technician/dashboard
 * Aggregates real MongoDB metrics exclusively for the authenticated technician.
 */
export async function getTechnicianDashboard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const technicianId = new mongoose.Types.ObjectId(req.user!.id);

    const [
      assignedTasks,
      pendingTasks,
      inProgress,
      resolved,
      recentAssignments,
      highPriorityTasks,
      criticalTasks,
    ] = await Promise.all([
      Complaint.countDocuments({ assignedTo: technicianId }),
      Complaint.countDocuments({ assignedTo: technicianId, status: 'ASSIGNED' }),
      Complaint.countDocuments({ assignedTo: technicianId, status: 'IN_PROGRESS' }),
      Complaint.countDocuments({
        assignedTo: technicianId,
        status: { $in: ['RESOLVED', 'VERIFIED', 'CLOSED'] },
      }),
      // Recent assignments
      Complaint.find({ assignedTo: technicianId })
        .sort({ assignedAt: -1, createdAt: -1 })
        .limit(6)
        .populate('reportedBy', 'name email role phone')
        .populate('department', 'name code'),
      // High priority active tasks
      Complaint.find({
        assignedTo: technicianId,
        priority: { $in: ['HIGH', 'CRITICAL'] },
        status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
      })
        .sort({ priority: -1, createdAt: -1 })
        .limit(6)
        .populate('reportedBy', 'name email role phone')
        .populate('department', 'name code'),
      // Critical active tasks
      Complaint.find({
        assignedTo: technicianId,
        priority: 'CRITICAL',
        status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
      })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('reportedBy', 'name email role phone')
        .populate('department', 'name code'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          assignedTasks,
          pendingTasks,
          inProgress,
          resolved,
        },
        recentAssignments,
        highPriorityTasks,
        criticalTasks,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/technician/tasks
 * Lists ONLY complaints assigned to the authenticated technician.
 */
export async function getTechnicianTasks(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const technicianId = new mongoose.Types.ObjectId(req.user!.id);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, priority, category, search } = req.query;

    const filter: Record<string, any> = { assignedTo: technicianId };

    if (status && status !== 'ALL' && typeof status === 'string') {
      filter.status = status;
    }

    if (priority && priority !== 'ALL' && typeof priority === 'string') {
      filter.priority = priority;
    }

    if (category && category !== 'ALL' && typeof category === 'string') {
      filter.category = category;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { title: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
        { building: { $regex: s, $options: 'i' } },
        { room: { $regex: s, $options: 'i' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reportedBy', 'name email role phone')
        .populate('department', 'name code contactEmail'),
      Complaint.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/technician/tasks/:id
 * Retrieve single task assigned to technician. Validates ownership.
 */
export async function getTechnicianTaskDetails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const technicianId = req.user!.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid task ID format.',
      });
      return;
    }

    const complaint = await Complaint.findById(id)
      .populate('reportedBy', 'name email role phone')
      .populate('department', 'name code contactEmail')
      .populate('statusHistory.changedBy', 'name email role');

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
      return;
    }

    // Ownership check: technician can only view complaints assigned to them
    if (!complaint.assignedTo || complaint.assignedTo.toString() !== technicianId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access tasks assigned to another technician.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        complaint,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/technician/tasks/:id/start
 * Technician starts working on an assigned task (ASSIGNED -> IN_PROGRESS).
 */
export async function startTechnicianTask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const technicianId = req.user!.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid task ID format.',
      });
      return;
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
      return;
    }

    // Ownership check: technician can only operate on their own tasks
    if (!complaint.assignedTo || complaint.assignedTo.toString() !== technicianId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify tasks assigned to another technician.',
      });
      return;
    }

    // Workflow validation: Must transition ASSIGNED -> IN_PROGRESS
    if (complaint.status !== 'ASSIGNED') {
      res.status(400).json({
        success: false,
        message: `Cannot start task. Current status is '${complaint.status}'. Tasks can only be started when in 'ASSIGNED' state.`,
      });
      return;
    }

    complaint.status = 'IN_PROGRESS';

    const techObjectId = new mongoose.Types.ObjectId(technicianId);
    complaint.statusHistory.push({
      status: 'IN_PROGRESS',
      changedBy: techObjectId,
      timestamp: new Date(),
      comment: 'Technician started working on the issue',
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('reportedBy', 'name email role phone')
      .populate('assignedTo', 'name email role phone department')
      .populate('department', 'name code contactEmail')
      .populate('statusHistory.changedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Task status updated to IN_PROGRESS. Work has commenced.',
      data: {
        complaint: populatedComplaint,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/technician/tasks/:id/resolve
 * Technician marks an in-progress task as RESOLVED with required notes.
 */
export async function resolveTechnicianTask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const technicianId = req.user!.id;
    const { resolutionNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid task ID format.',
      });
      return;
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
      return;
    }

    // Ownership check: technician can only operate on their own tasks
    if (!complaint.assignedTo || complaint.assignedTo.toString() !== technicianId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify tasks assigned to another technician.',
      });
      return;
    }

    // Workflow validation: Must transition IN_PROGRESS -> RESOLVED
    if (complaint.status !== 'IN_PROGRESS') {
      res.status(400).json({
        success: false,
        message: `Cannot resolve task directly. Current status is '${complaint.status}'. Tasks must be marked as 'IN_PROGRESS' before resolving.`,
      });
      return;
    }

    // Required resolutionNotes validation
    if (
      !resolutionNotes ||
      typeof resolutionNotes !== 'string' ||
      resolutionNotes.trim().length < 5
    ) {
      res.status(400).json({
        success: false,
        message: 'Resolution notes are required and must be at least 5 characters long describing the fix.',
      });
      return;
    }

    // Handle resolution image uploads (multipart/form-data)
    const files = (req.files as Express.Multer.File[]) || [];
    let uploadedResolutionImages: UploadedImageResult[] = [];

    if (files.length > 0) {
      if (!isCloudinaryConfigured()) {
        res.status(400).json({
          success: false,
          message:
            'Cloudinary image storage is not configured on the server. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server environment, or submit resolution without image attachments.',
        });
        return;
      }

      try {
        uploadedResolutionImages = await uploadMultipleImages(
          files,
          `campusfix/complaints/${id}/resolution`,
          ['campusfix', 'technician-resolution']
        );
      } catch (uploadErr: any) {
        res.status(500).json({
          success: false,
          message: `Failed to upload resolution images: ${uploadErr.message || 'Cloudinary upload error'}`,
        });
        return;
      }
    } else if (req.body.resolutionImages) {
      // JSON backwards compatibility
      const bodyImages = req.body.resolutionImages;
      if (Array.isArray(bodyImages)) {
        uploadedResolutionImages = bodyImages.map((img: any) =>
          typeof img === 'string' ? { url: img, publicId: '' } : img
        );
      }
    }

    complaint.status = 'RESOLVED';
    complaint.resolvedAt = new Date();
    complaint.resolutionNotes = resolutionNotes.trim();
    if (uploadedResolutionImages.length > 0) {
      complaint.resolutionImages = uploadedResolutionImages;
    }

    const techObjectId = new mongoose.Types.ObjectId(technicianId);
    complaint.statusHistory.push({
      status: 'RESOLVED',
      changedBy: techObjectId,
      timestamp: new Date(),
      comment: `Issue resolved: ${resolutionNotes.trim()}${uploadedResolutionImages.length > 0 ? ` (${uploadedResolutionImages.length} resolution photos attached)` : ''}`,
    });

    try {
      await complaint.save();
    } catch (saveError) {
      // Clean up newly uploaded resolution images from Cloudinary if save fails
      if (uploadedResolutionImages.length > 0) {
        const publicIdsToClean = uploadedResolutionImages
          .map((img) => img.publicId)
          .filter(Boolean);
        if (publicIdsToClean.length > 0) {
          await deleteMultipleImagesFromCloudinary(publicIdsToClean);
        }
      }
      throw saveError;
    }

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('reportedBy', 'name email role phone')
      .populate('assignedTo', 'name email role phone department')
      .populate('department', 'name code contactEmail')
      .populate('statusHistory.changedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Task marked as RESOLVED.',
      data: {
        complaint: populatedComplaint,
      },
    });
  } catch (error) {
    next(error);
  }
}
