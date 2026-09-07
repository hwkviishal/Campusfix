import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { analyzeComplaint } from '../services/geminiService.js';

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
