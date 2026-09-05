import { Router, Request, Response } from 'express';
import { getDatabaseStatus } from '../config/db.js';
import { ENV } from '../config/env.js';
import { seedInitialData } from '../services/seedService.js';
import { Complaint } from '../models/Complaint.js';
import { User } from '../models/User.js';
import { isCloudinaryConfigured, getCloudinaryStatus } from '../config/cloudinary.js';

const router = Router();

const startTime = Date.now();

router.get('/health', (req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    success: true,
    message: 'CampusFix API is running smoothly',
    data: {
      appName: 'CampusFix',
      version: '1.0.0-phase5',
      environment: ENV.NODE_ENV,
      port: ENV.PORT,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      database: dbStatus,
      cloudinaryConfigured: isCloudinaryConfigured(),
    },
  });
});

router.get('/system/status', async (req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();
  const cldStatus = getCloudinaryStatus();
  const [complaintCount, userCount] = await Promise.all([
    Complaint.countDocuments(),
    User.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    system: {
      platform: 'CampusFix MERN Architecture',
      nodeVersion: process.version,
      phase: 5,
      phaseDescription: 'Secure Image Uploads with Cloudinary & Role-Based Evidence Management',
      cloudinaryConfigured: cldStatus.configured,
      cloudinaryStatus: cldStatus,
      database: dbStatus,
      counts: {
        complaints: complaintCount,
        users: userCount,
      },
      services: {
        express: 'Active (Port 3000)',
        mongoose: dbStatus.connected ? 'Connected' : 'Disconnected',
        cloudinary: cldStatus.configured ? 'Active (Connected)' : 'Disabled (Unconfigured)',
        adminModule: 'Active (/api/admin)',
        technicianModule: 'Active (/api/technician)',
        cors: 'Configured',
        cookieParser: 'Configured',
        viteMiddleware: 'Configured (Development Mode)',
      },
      nextPhase: 'Phase 6: Student Verification, Closure, and Feedback Ratings',
    },
  });
});

router.get('/system/upload-status', (req: Request, res: Response) => {
  const cldStatus = getCloudinaryStatus();
  res.status(200).json({
    success: true,
    data: cldStatus,
  });
});


router.post('/system/reseed', async (req: Request, res: Response) => {
  try {
    await seedInitialData(true);
    const [complaintCount, userCount] = await Promise.all([
      Complaint.countDocuments(),
      User.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      message: 'Database reseeded successfully with Phase 4 dataset.',
      counts: {
        complaints: complaintCount,
        users: userCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Reseed failed',
      error: err.message,
    });
  }
});

export default router;
