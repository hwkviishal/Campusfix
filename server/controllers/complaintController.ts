import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { Complaint, ComplaintCategory, ComplaintPriority } from '../models/Complaint.js';
import { Department } from '../models/Department.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import {
  uploadMultipleImages,
  deleteImageFromCloudinary,
  deleteMultipleImagesFromCloudinary,
  UploadedImageResult,
} from '../services/cloudinaryService.js';

const VALID_CATEGORIES: ComplaintCategory[] = [
  'ELECTRICAL',
  'PLUMBING',
  'INTERNET_WIFI',
  'FURNITURE',
  'CLEANING',
  'CLASSROOM_EQUIPMENT',
  'SECURITY',
  'TRANSPORT',
  'HOSTEL',
  'OTHER',
];

const VALID_PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Helper to map categories to department codes
const CATEGORY_TO_DEP_CODE: Record<string, string> = {
  ELECTRICAL: 'ELEC',
  PLUMBING: 'PLUMB',
  INTERNET_WIFI: 'IT-NET',
  CLEANING: 'HOUSE',
  FURNITURE: 'FACIL',
  CLASSROOM_EQUIPMENT: 'FACIL',
};

export async function createComplaint(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to create a complaint.',
      });
      return;
    }

    const { title, description, category, priority, building, floor, room, images } = req.body;

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      res.status(400).json({
        success: false,
        message: 'Complaint title is required and must be at least 3 characters long.',
      });
      return;
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      res.status(400).json({
        success: false,
        message: 'Description is required and must be at least 10 characters long.',
      });
      return;
    }

    if (!category || !VALID_CATEGORIES.includes(category as ComplaintCategory)) {
      res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
      return;
    }

    if (!priority || !VALID_PRIORITIES.includes(priority as ComplaintPriority)) {
      res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
      });
      return;
    }

    if (!building || typeof building !== 'string' || !building.trim()) {
      res.status(400).json({
        success: false,
        message: 'Building location is required.',
      });
      return;
    }

    if (!floor || typeof floor !== 'string' || !floor.trim()) {
      res.status(400).json({
        success: false,
        message: 'Floor is required.',
      });
      return;
    }

    if (!room || typeof room !== 'string' || !room.trim()) {
      res.status(400).json({
        success: false,
        message: 'Room or lab location is required.',
      });
      return;
    }

    // Try finding relevant department if code matches
    let departmentId: mongoose.Types.ObjectId | undefined;
    const depCode = CATEGORY_TO_DEP_CODE[category];
    if (depCode) {
      const dep = await Department.findOne({ code: depCode });
      if (dep) {
        departmentId = dep._id as mongoose.Types.ObjectId;
      }
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const complaintId = new mongoose.Types.ObjectId();

    // Check for uploaded files (multipart/form-data)
    const files = (req.files as Express.Multer.File[]) || [];
    let uploadedImages: UploadedImageResult[] = [];

    if (files.length > 0) {
      if (!isCloudinaryConfigured()) {
        res.status(400).json({
          success: false,
          message:
            'Cloudinary image storage is not configured on the server. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server environment, or submit the complaint without attachments.',
        });
        return;
      }

      try {
        uploadedImages = await uploadMultipleImages(
          files,
          `campusfix/complaints/${complaintId.toString()}/evidence`,
          ['campusfix', 'student-evidence']
        );
      } catch (uploadErr: any) {
        res.status(500).json({
          success: false,
          message: `Failed to upload evidence images: ${uploadErr.message || 'Cloudinary upload error'}`,
        });
        return;
      }
    } else if (images) {
      // Support backward compatibility if images were passed in JSON body
      if (Array.isArray(images)) {
        uploadedImages = images.map((img: any) =>
          typeof img === 'string' ? { url: img, publicId: '' } : img
        );
      } else if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed)) {
            uploadedImages = parsed.map((img: any) =>
              typeof img === 'string' ? { url: img, publicId: '' } : img
            );
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    const newComplaint = new Complaint({
      _id: complaintId,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'OPEN',
      building: building.trim(),
      floor: floor.trim(),
      room: room.trim(),
      images: uploadedImages,
      resolutionImages: [],
      reportedBy: userId,
      department: departmentId,
      statusHistory: [
        {
          status: 'OPEN',
          changedBy: userId,
          timestamp: new Date(),
          comment: 'Complaint lodged by student',
        },
      ],
    });

    try {
      await newComplaint.save();
    } catch (dbError) {
      // Rollback Cloudinary uploads if MongoDB save fails
      if (uploadedImages.length > 0) {
        const publicIdsToClean = uploadedImages
          .map((img) => img.publicId)
          .filter(Boolean);
        if (publicIdsToClean.length > 0) {
          await deleteMultipleImagesFromCloudinary(publicIdsToClean);
        }
      }
      throw dbError;
    }

    const populatedComplaint = await Complaint.findById(newComplaint._id)
      .populate('reportedBy', 'name email role')
      .populate('department', 'name code');

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      data: {
        complaint: populatedComplaint,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyComplaints(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to view complaints.',
      });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, category, priority, search } = req.query;

    const filter: Record<string, any> = {
      reportedBy: userId,
    };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (priority && priority !== 'ALL') {
      filter.priority = priority;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { building: searchRegex },
        { room: searchRegex },
      ];
    }

    const [complaints, total, allStudentComplaints] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reportedBy', 'name email role')
        .populate('department', 'name code'),
      Complaint.countDocuments(filter),
      // Aggregate stats for this student across ALL their complaints
      Complaint.find({ reportedBy: userId }).select('status'),
    ]);

    const stats = {
      total: allStudentComplaints.length,
      open: allStudentComplaints.filter((c) => c.status === 'OPEN').length,
      inProgress: allStudentComplaints.filter((c) =>
        ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)
      ).length,
      resolved: allStudentComplaints.filter((c) =>
        ['RESOLVED', 'VERIFIED'].includes(c.status)
      ).length,
      closed: allStudentComplaints.filter((c) => c.status === 'CLOSED').length,
    };

    const pages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: {
        complaints,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getComplaintById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format.',
      });
      return;
    }

    const complaint = await Complaint.findById(id)
      .populate('reportedBy', 'name email role')
      .populate('department', 'name code')
      .populate('statusHistory.changedBy', 'name role email');

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
      return;
    }

    // A student may only access complaints they reported
    const reporterId =
      typeof complaint.reportedBy === 'object' && complaint.reportedBy !== null
        ? (complaint.reportedBy as any)._id?.toString() || (complaint.reportedBy as any).id?.toString()
        : complaint.reportedBy?.toString();

    if (req.user.role === 'STUDENT' && reporterId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this complaint.',
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

export async function updateComplaint(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format.',
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

    // Ownership check
    const reporterId = complaint.reportedBy.toString();
    if (req.user.role === 'STUDENT' && reporterId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify complaints filed by another user.',
      });
      return;
    }

    // Check status: For Phase 3, students may edit their own complaint ONLY while status === OPEN
    if (complaint.status !== 'OPEN') {
      res.status(400).json({
        success: false,
        message: `Editing is disabled because this complaint is already ${complaint.status}. Only OPEN complaints can be edited.`,
      });
      return;
    }

    const { title, description, category, priority, building, floor, room } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3) {
        res.status(400).json({
          success: false,
          message: 'Title must be at least 3 characters long.',
        });
        return;
      }
      complaint.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 10) {
        res.status(400).json({
          success: false,
          message: 'Description must be at least 10 characters long.',
        });
        return;
      }
      complaint.description = description.trim();
    }

    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category as ComplaintCategory)) {
        res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        });
        return;
      }
      complaint.category = category;

      // Update department if relevant
      const depCode = CATEGORY_TO_DEP_CODE[category];
      if (depCode) {
        const dep = await Department.findOne({ code: depCode });
        if (dep) {
          complaint.department = dep._id as mongoose.Types.ObjectId;
        }
      }
    }

    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority as ComplaintPriority)) {
        res.status(400).json({
          success: false,
          message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
        });
        return;
      }
      complaint.priority = priority;
    }

    if (building !== undefined) {
      if (typeof building !== 'string' || !building.trim()) {
        res.status(400).json({
          success: false,
          message: 'Building cannot be empty.',
        });
        return;
      }
      complaint.building = building.trim();
    }

    if (floor !== undefined) {
      if (typeof floor !== 'string' || !floor.trim()) {
        res.status(400).json({
          success: false,
          message: 'Floor cannot be empty.',
        });
        return;
      }
      complaint.floor = floor.trim();
    }

    if (room !== undefined) {
      if (typeof room !== 'string' || !room.trim()) {
        res.status(400).json({
          success: false,
          message: 'Room cannot be empty.',
        });
        return;
      }
      complaint.room = room.trim();
    }

    await complaint.save();

    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate('reportedBy', 'name email role')
      .populate('department', 'name code')
      .populate('statusHistory.changedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully.',
      data: {
        complaint: updatedComplaint,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteComplaint(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format.',
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

    // Ownership check
    const reporterId = complaint.reportedBy.toString();
    if (req.user.role === 'STUDENT' && reporterId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot delete a complaint filed by another student.',
      });
      return;
    }

    // Status check: deletion allowed only when status === OPEN
    if (complaint.status !== 'OPEN') {
      res.status(400).json({
        success: false,
        message: `Deletion rejected: Only complaints in OPEN status can be deleted. Current status: ${complaint.status}.`,
      });
      return;
    }

    // Collect all publicIds for cleanup in Cloudinary
    const imagePublicIds: string[] = [];
    if (Array.isArray(complaint.images)) {
      complaint.images.forEach((img: any) => {
        if (img && typeof img === 'object' && img.publicId) {
          imagePublicIds.push(img.publicId);
        }
      });
    }
    if (Array.isArray(complaint.resolutionImages)) {
      complaint.resolutionImages.forEach((img: any) => {
        if (img && typeof img === 'object' && img.publicId) {
          imagePublicIds.push(img.publicId);
        }
      });
    }

    await Complaint.findByIdAndDelete(id);

    // Clean up images from Cloudinary asynchronously
    if (imagePublicIds.length > 0) {
      deleteMultipleImagesFromCloudinary(imagePublicIds).catch((err) => {
        console.error('[Cloudinary] Cleanup error after complaint deletion:', err);
      });
    }

    res.status(200).json({
      success: true,
      message: 'Complaint deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Explicitly removes an image from an OPEN complaint and deletes it from Cloudinary.
 */
export async function removeComplaintImage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { id } = req.params;
    const publicId = (req.body?.publicId || req.query?.publicId) as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format.',
      });
      return;
    }

    if (!publicId || typeof publicId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Image publicId is required to remove an image.',
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

    // Ownership check: Student can only modify their own complaint
    const reporterId = complaint.reportedBy.toString();
    if (req.user.role === 'STUDENT' && reporterId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify images on a complaint filed by another student.',
      });
      return;
    }

    // Status check: Image removal allowed ONLY when status === OPEN
    if (complaint.status !== 'OPEN') {
      res.status(400).json({
        success: false,
        message: `Images cannot be removed once a complaint is in status '${complaint.status}'. Only OPEN complaints can be modified.`,
      });
      return;
    }

    const initialLength = complaint.images.length;
    complaint.images = complaint.images.filter(
      (img: any) => (img.publicId || img) !== publicId
    );

    if (complaint.images.length === initialLength) {
      res.status(404).json({
        success: false,
        message: 'The specified image was not found on this complaint.',
      });
      return;
    }

    await complaint.save();

    // Delete image from Cloudinary
    await deleteImageFromCloudinary(publicId);

    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate('reportedBy', 'name email role')
      .populate('department', 'name code')
      .populate('statusHistory.changedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Image removed successfully from complaint.',
      data: {
        complaint: updatedComplaint,
      },
    });
  } catch (error) {
    next(error);
  }
}

