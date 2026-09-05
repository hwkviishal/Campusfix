import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { handleEvidenceUpload } from '../middleware/uploadMiddleware.js';
import {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  removeComplaintImage,
} from '../controllers/complaintController.js';

const router = Router();

// All complaint routes require authentication
router.use(requireAuth);

// Create Complaint - only authenticated STUDENT accounts can create complaints (supports multipart/form-data with up to 5 images)
router.post('/', requireRole('STUDENT'), handleEvidenceUpload, createComplaint);

// Get My Complaints - filtered to current authenticated student
router.get('/my', getMyComplaints);

// Get single complaint details - with authorization enforcement
router.get('/:id', getComplaintById);

// Update complaint - only if reported by current student and status is OPEN
router.patch('/:id', updateComplaint);
router.put('/:id', updateComplaint);

// Remove specific image from OPEN complaint
router.post('/:id/remove-image', requireRole('STUDENT'), removeComplaintImage);
router.delete('/:id/images', requireRole('STUDENT'), removeComplaintImage);

// Delete complaint - only if reported by current student and status is OPEN
router.delete('/:id', deleteComplaint);

export default router;

