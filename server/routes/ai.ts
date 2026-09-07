import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  analyzeComplaintHandler,
  checkDuplicateHandler,
} from '../controllers/aiController.js';

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

/**
 * POST /api/ai/check-duplicate
 * Accessible to authenticated STUDENT, TECHNICIAN, and ADMIN
 */
router.post(
  '/check-duplicate',
  requireAuth,
  requireRole('STUDENT', 'TECHNICIAN', 'ADMIN'),
  checkDuplicateHandler
);

export default router;

