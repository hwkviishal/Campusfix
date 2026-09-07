import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { analyzeComplaintHandler } from '../controllers/aiController.js';

const router = Router();

/**
 * POST /api/ai/analyze-complaint
 * Accessible to authenticated STUDENT, TECHNICIAN, and ADMIN
 */
router.post(
  '/analyze-complaint',
  requireAuth,
  requireRole('STUDENT', 'TECHNICIAN', 'ADMIN'),
  analyzeComplaintHandler
);

export default router;
