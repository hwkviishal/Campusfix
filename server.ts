import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { connectDB, getDatabaseStatus } from './server/config/db.js';
import { ENV } from './server/config/env.js';
import healthRoutes from './server/routes/health.js';
import authRoutes from './server/routes/auth.js';
import complaintRoutes from './server/routes/complaints.js';
import adminRoutes from './server/routes/admin.js';
import technicianRoutes from './server/routes/technician.js';
import notificationRoutes from './server/routes/notifications.js';
import commentRoutes from './server/routes/comments.js';
import { initSocketServer } from './server/services/socketService.js';
import { seedInitialData } from './server/services/seedService.js';
import { errorHandler } from './server/middleware/errorHandler.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic security and parsing middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Connect to Database
  console.log('[Server] Connecting to MongoDB...');
  await connectDB();

  // Seed default data if database is empty
  await seedInitialData();

  // API Routes
  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/complaints', commentRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/technician', technicianRoutes);
  app.use('/api/notifications', notificationRoutes);

  // 404 for unhandled /api routes before Vite middleware
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Initializing Vite middleware for SPA development...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Create unified HTTP server and attach Socket.IO
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  // Bind to 0.0.0.0 and PORT 3000 as strictly required by container infrastructure
  const server = httpServer.listen(PORT, '0.0.0.0', () => {
    const db = getDatabaseStatus();
    console.log(`====================================================`);
    console.log(` CampusFix Server running on http://0.0.0.0:${PORT}`);
    console.log(` Socket.IO   : Active on ws://0.0.0.0:${PORT}`);
    console.log(` Environment : ${ENV.NODE_ENV}`);
    console.log(` MongoDB     : ${db.connected ? 'Connected (' + db.host + ' / ' + db.databaseName + ')' : 'Disconnected'}`);
    console.log(`====================================================`);
  });

  // Graceful shutdown handling
  const handleShutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Server] Fatal bootstrap error:', err);
  process.exit(1);
});
