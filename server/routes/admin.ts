import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  getAdminDashboard,
  getAllComplaintsAdmin,
  getComplaintDetailsAdmin,
  assignTechnician,
  updateComplaintPriority,
  getAllTechnicians,
} from '../controllers/adminController.js';

const router = Router();

// Enforce ADMIN role on all /api/admin endpoints
router.use(requireAuth, requireRole('ADMIN'));

// Admin Dashboard stats & metrics
router.get('/dashboard', getAdminDashboard);

// Complaint Management
router.get('/complaints', getAllComplaintsAdmin);
router.get('/complaints/:id', getComplaintDetailsAdmin);
router.patch('/complaints/:id/assign', assignTechnician);
router.patch('/complaints/:id/priority', updateComplaintPriority);

// Technician Management
router.get('/technicians', getAllTechnicians);

export default router;
