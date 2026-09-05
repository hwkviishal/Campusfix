import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { handleResolutionUpload } from '../middleware/uploadMiddleware.js';
import {
  getTechnicianDashboard,
  getTechnicianTasks,
  getTechnicianTaskDetails,
  startTechnicianTask,
  resolveTechnicianTask,
} from '../controllers/technicianController.js';

const router = Router();

// Enforce TECHNICIAN role on all /api/technician endpoints
router.use(requireAuth, requireRole('TECHNICIAN'));

// Technician Dashboard stats
router.get('/dashboard', getTechnicianDashboard);

// Technician Task Management (Assigned only)
router.get('/tasks', getTechnicianTasks);
router.get('/tasks/:id', getTechnicianTaskDetails);
router.patch('/tasks/:id/start', startTechnicianTask);
// Resolve task - supports multipart/form-data with resolutionImages
router.patch('/tasks/:id/resolve', handleResolutionUpload, resolveTechnicianTask);

export default router;

