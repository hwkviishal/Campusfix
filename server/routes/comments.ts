import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getComplaintComments, addComplaintComment } from '../controllers/commentController.js';

const router = Router({ mergeParams: true });

// All comment operations require authentication
router.use(requireAuth);

// GET comments for complaint
router.get('/:id/comments', getComplaintComments);
router.get('/complaint/:id', getComplaintComments);
router.get('/:id', getComplaintComments);

// POST comment to complaint
router.post('/:id/comments', addComplaintComment);
router.post('/complaint/:id', addComplaintComment);
router.post('/:id', addComplaintComment);

export default router;
