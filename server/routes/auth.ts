import { Router, Response } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Public auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/seed-info', authController.getDevSeedInfo);

// Protected session route
router.get('/me', requireAuth, authController.getMe);

// Verification and testing routes for Phase 2 RBAC check
router.get(
  '/role-test/admin',
  requireAuth,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Access granted: You are authorized as an ADMIN.',
      user: req.user,
    });
  }
);

router.get(
  '/role-test/technician',
  requireAuth,
  requireRole('TECHNICIAN', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Access granted: You are authorized as a TECHNICIAN or ADMIN.',
      user: req.user,
    });
  }
);

router.get(
  '/role-test/student',
  requireAuth,
  requireRole('STUDENT'),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Access granted: You are authorized as a STUDENT.',
      user: req.user,
    });
  }
);

export default router;
