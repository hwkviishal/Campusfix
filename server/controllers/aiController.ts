import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { analyzeComplaint } from '../services/geminiService.js';
import { detectDuplicateComplaints } from '../services/duplicateComplaintService.js';

export async function analyzeComplaintHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { description, building, floor, room } = req.body || {};

    if (typeof description !== 'string' || !description.trim()) {
      res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters long for AI analysis.',
      });
      return;
    }

    const trimmedDescription = description.trim();

    if (trimmedDescription.length < 10) {
      res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters long for AI analysis.',
      });
      return;
    }

    if (trimmedDescription.length > 2000) {
      res.status(400).json({
        success: false,
        message: 'Description cannot exceed 2000 characters for AI analysis.',
      });
      return;
    }

    const analysis = await analyzeComplaint({
      description: trimmedDescription,
      building: typeof building === 'string' ? building.trim() : undefined,
      floor: typeof floor === 'string' ? floor.trim() : undefined,
      room: typeof room === 'string' ? room.trim() : undefined,
    });

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('[AI Controller] Error during complaint analysis:', error?.message || error);

    res.status(503).json({
      success: false,
      message:
        'AI analysis is currently unavailable. Please continue filling out the complaint manually.',
      error: 'AI_SERVICE_UNAVAILABLE',
    });
  }
}

export async function checkDuplicateHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, description, category, building, floor, room } = req.body || {};

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const trimmedDesc = typeof description === 'string' ? description.trim() : '';

    if (!trimmedTitle && !trimmedDesc) {
      res.status(400).json({
        success: false,
        message: 'Title or description is required to check for duplicate complaints.',
      });
      return;
    }

    if (trimmedDesc.length > 2000) {
      res.status(400).json({
        success: false,
        message: 'Description cannot exceed 2000 characters.',
      });
      return;
    }

    if (trimmedTitle.length > 120) {
      res.status(400).json({
        success: false,
        message: 'Title cannot exceed 120 characters.',
      });
      return;
    }

    const result = await detectDuplicateComplaints({
      title: trimmedTitle || undefined,
      description: trimmedDesc,
      category: typeof category === 'string' ? category.trim() : undefined,
      building: typeof building === 'string' ? building.trim() : undefined,
      floor: typeof floor === 'string' ? floor.trim() : undefined,
      room: typeof room === 'string' ? room.trim() : undefined,
    });

    res.status(200).json({
      success: true,
      hasDuplicate: result.hasDuplicate,
      confidence: result.confidence,
      matches: result.matches,
      data: result,
    });
  } catch (error: any) {
    console.error('[AI Controller] Error during duplicate detection:', error?.message || error);

    res.status(503).json({
      success: false,
      message:
        'Duplicate checking is temporarily unavailable. Please continue filling out the complaint manually.',
      error: 'DUPLICATE_CHECK_UNAVAILABLE',
    });
  }
}

