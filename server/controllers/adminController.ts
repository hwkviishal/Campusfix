import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../models/Complaint.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';

const VALID_PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/**
 * GET /api/admin/dashboard
 * Aggregates real MongoDB counts and lists for admin oversight.
 */
export async function getAdminDashboard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [
      total,
      open,
      assigned,
      inProgress,
      resolved,
      verified,
      closed,
      critical,
      recentComplaints,
      unassignedComplaints,
      criticalComplaints,
      requiringAttention,
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'OPEN' }),
      Complaint.countDocuments({ status: 'ASSIGNED' }),
      Complaint.countDocuments({ status: 'IN_PROGRESS' }),
      Complaint.countDocuments({ status: 'RESOLVED' }),
      Complaint.countDocuments({ status: 'VERIFIED' }),
      Complaint.countDocuments({ status: 'CLOSED' }),
      Complaint.countDocuments({ priority: 'CRITICAL' }),
      // Recent complaints
      Complaint.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('reportedBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .populate('department', 'name code'),
      // Unassigned complaints (status OPEN or no assignedTo)
      Complaint.find({
        $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }, { status: 'OPEN' }],
        status: { $nin: ['RESOLVED', 'VERIFIED', 'CLOSED'] },
      })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('reportedBy', 'name email role')
        .populate('department', 'name code'),
      // Critical active complaints
      Complaint.find({
        priority: 'CRITICAL',
        status: { $nin: ['CLOSED', 'VERIFIED'] },
      })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('reportedBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .populate('department', 'name code'),
      // Requiring attention: Critical or Open for over 24h
      Complaint.find({
        status: { $in: ['OPEN', 'ASSIGNED'] },
        $or: [
          { priority: { $in: ['CRITICAL', 'HIGH'] } },
          { createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      })
        .sort({ createdAt: 1 })
        .limit(6)
        .populate('reportedBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .populate('department', 'name code'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total,
          open,
          assigned,
          inProgress,
          resolved,
          verified,
          closed,
          critical,
        },
        recentComplaints,
        unassignedComplaints,
        criticalComplaints,
        requiringAttention,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/complaints
 * Comprehensive search, filtering, and pagination for administrator oversight.
 */
export async function getAllComplaintsAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      category,
      priority,
      department,
      building,
      assigned,
      sortBy,
    } = req.query;

    const filter: Record<string, any> = {};

    // Search query
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      if (mongoose.Types.ObjectId.isValid(s)) {
        filter.$or = [{ _id: s }, { title: { $regex: s, $options: 'i' } }];
      } else {
        filter.$or = [
          { title: { $regex: s, $options: 'i' } },
          { description: { $regex: s, $options: 'i' } },
          { building: { $regex: s, $options: 'i' } },
          { room: { $regex: s, $options: 'i' } },
        ];
      }
    }

    // Status filter
    if (status && status !== 'ALL' && typeof status === 'string') {
      filter.status = status;
    }

    // Category filter
    if (category && category !== 'ALL' && typeof category === 'string') {
      filter.category = category;
    }

    // Priority filter
    if (priority && priority !== 'ALL' && typeof priority === 'string') {
      filter.priority = priority;
    }

    // Department filter
    if (department && department !== 'ALL' && typeof department === 'string') {
      if (mongoose.Types.ObjectId.isValid(department)) {
        filter.department = new mongoose.Types.ObjectId(department);
      }
    }

    // Building filter
    if (building && building !== 'ALL' && typeof building === 'string') {
      filter.building = building;
    }

    // Assignment filter
    if (assigned === 'assigned') {
      filter.assignedTo = { $ne: null };
    } else if (assigned === 'unassigned') {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
        },
      ];
    }

    // Sorting
    let sortOptions: Record<string, any> = { createdAt: -1 };
    if (sortBy === 'priority') {
      // Prioritize CRITICAL -> HIGH -> MEDIUM -> LOW
      sortOptions = { priority: -1, createdAt: -1 };
    } else if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else {
      sortOptions = { createdAt: -1 };
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('reportedBy', 'name email role phone')
        .populate('assignedTo', 'name email role phone department')
        .populate('department', 'name code contactEmail'),
      Complaint.countDocuments(filter),
    ]);

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
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/complaints/:id
 * Retrieve a full complaint document for administrator inspection.
 */
export async function getComplaintDetailsAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format.',
      });
      return;
    }

    const complaint = await Complaint.findById(id)
      .populate('reportedBy', 'name email role phone')
      .populate('assignedTo', 'name email role phone department')
      .populate('department', 'name code contactEmail')
      .populate('statusHistory.changedBy', 'name email role');

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Complaint not found.',
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
 * PATCH /api/admin/complaints/:id/assign
 * Assigns an active technician to a complaint and updates the status to ASSIGNED.
 */
export async function assignTechnician(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { technicianId, overrideDepartment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format.',
      });
      return;
    }

    if (!technicianId || !mongoose.Types.ObjectId.isValid(technicianId)) {
      res.status(400).json({
        success: false,
        message: 'A valid technicianId is required.',
      });
      return;
    }

    const complaint = await Complaint.findById(id).populate('department');
    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
      return;
    }

    // Fetch and validate technician
    const technician = await User.findById(technicianId).populate('department');
    if (!technician) {
      res.status(404).json({
        success: false,
        message: 'Technician user not found.',
      });
      return;
    }

    if (technician.role !== 'TECHNICIAN') {
      res.status(400).json({
        success: false,
        message: `User is not a technician. Selected user has role '${technician.role}'.`,
      });
      return;
    }

    if (!technician.isActive) {
      res.status(400).json({
        success: false,
        message: 'Cannot assign task to an inactive technician.',
      });
      return;
    }

    // Check if complaint is in a state that can be assigned
    if (['RESOLVED', 'VERIFIED', 'CLOSED'].includes(complaint.status)) {
      res.status(400).json({
        success: false,
        message: `Cannot assign technician to a ticket with status '${complaint.status}'.`,
      });
      return;
    }

    // Set technician assignment
    complaint.assignedTo = technician._id as mongoose.Types.ObjectId;
    complaint.assignedAt = new Date();
    complaint.status = 'ASSIGNED';

    // Status history entry (always uses authenticated admin ID from req.user)
    const adminId = new mongoose.Types.ObjectId(req.user!.id);
    complaint.statusHistory.push({
      status: 'ASSIGNED',
      changedBy: adminId,
      timestamp: new Date(),
      comment: `Complaint assigned to technician ${technician.name} by Administrator.`,
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('reportedBy', 'name email role phone')
      .populate('assignedTo', 'name email role phone department')
      .populate('department', 'name code contactEmail')
      .populate('statusHistory.changedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: `Complaint successfully assigned to technician ${technician.name}.`,
      data: {
        complaint: populatedComplaint,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/complaints/:id/priority
 * Update priority level for a complaint (LOW, MEDIUM, HIGH, CRITICAL).
 */
export async function updateComplaintPriority(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format.',
      });
      return;
    }

    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed values: [${VALID_PRIORITIES.join(', ')}].`,
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

    const previousPriority = complaint.priority;
    if (previousPriority === priority) {
      res.status(200).json({
        success: true,
        message: `Priority is already set to ${priority}.`,
        data: { complaint },
      });
      return;
    }

    complaint.priority = priority;

    // Record priority adjustment in status history
    const adminId = new mongoose.Types.ObjectId(req.user!.id);
    complaint.statusHistory.push({
      status: complaint.status,
      changedBy: adminId,
      timestamp: new Date(),
      comment: `Priority updated from ${previousPriority} to ${priority} by Administrator.`,
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('reportedBy', 'name email role phone')
      .populate('assignedTo', 'name email role phone department')
      .populate('department', 'name code contactEmail')
      .populate('statusHistory.changedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: `Priority updated to ${priority}.`,
      data: {
        complaint: populatedComplaint,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/technicians
 * Lists all registered technicians with their department, active status,
 * and dynamic task counts (assigned vs resolved).
 */
export async function getAllTechnicians(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { search, department } = req.query;

    const filter: Record<string, any> = { role: 'TECHNICIAN' };

    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
      ];
    }

    if (department && department !== 'ALL' && typeof department === 'string') {
      if (mongoose.Types.ObjectId.isValid(department)) {
        filter.department = new mongoose.Types.ObjectId(department);
      }
    }

    const technicians = await User.find(filter)
      .populate('department', 'name code')
      .sort({ name: 1 })
      .lean();

    // Calculate assignedTaskCount & resolvedTaskCount for each technician
    const technicianStatsPromises = technicians.map(async (tech) => {
      const [assignedCount, resolvedCount] = await Promise.all([
        Complaint.countDocuments({
          assignedTo: tech._id,
          status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
        }),
        Complaint.countDocuments({
          assignedTo: tech._id,
          status: { $in: ['RESOLVED', 'VERIFIED', 'CLOSED'] },
        }),
      ]);

      return {
        _id: tech._id.toString(),
        id: tech._id.toString(),
        name: tech.name,
        email: tech.email,
        phone: tech.phone || 'N/A',
        role: 'TECHNICIAN',
        department: tech.department,
        isActive: tech.isActive,
        assignedTaskCount: assignedCount,
        resolvedTaskCount: resolvedCount,
        createdAt: tech.createdAt,
      };
    });

    const techniciansWithMetrics = await Promise.all(technicianStatsPromises);

    res.status(200).json({
      success: true,
      data: {
        technicians: techniciansWithMetrics,
      },
    });
  } catch (error) {
    next(error);
  }
}
