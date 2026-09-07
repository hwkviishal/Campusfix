import express from 'express';
import cookieParser from 'cookie-parser';
import { Server } from 'node:http';
import { Writable } from 'node:stream';
import mongoose from 'mongoose';
import { connectDB } from '../server/config/db.js';
import { User, IUser } from '../server/models/User.js';
import { Complaint } from '../server/models/Complaint.js';
import { Department } from '../server/models/Department.js';
import { authService } from '../server/services/authService.js';
import complaintRoutes from '../server/routes/complaints.js';
import technicianRoutes from '../server/routes/technician.js';
import adminRoutes from '../server/routes/admin.js';
import notificationRoutes from '../server/routes/notifications.js';
import commentRoutes from '../server/routes/comments.js';
import { socketService } from '../server/services/socketService.js';
import { Notification } from '../server/models/Notification.js';
import { Comment } from '../server/models/Comment.js';
import { cloudinary } from '../server/config/cloudinary.js';
import { ENV } from '../server/config/env.js';

export interface TestContext {
  server: Server;
  baseUrl: string;
  studentA: IUser & { token: string };
  studentB: IUser & { token: string };
  technicianA: IUser & { token: string };
  technicianB: IUser & { token: string };
  mockCloudinary: {
    setShouldFail: (fail: boolean) => void;
    getUploadedCount: () => number;
    getDestroyedIds: () => string[];
    reset: () => void;
  };
  cleanup: () => Promise<void>;
}

// Binary image signatures
export const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
  0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
]);

export const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
]);

export const VALID_WEBP_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  0x18, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00,
]);

export const INVALID_MAGIC_BYTES_BUFFER = Buffer.from('NOT_AN_IMAGE_DISGUISED_AS_JPG_CONTENT');

export const OVERSIZED_BUFFER = Buffer.alloc(5.2 * 1024 * 1024, 0xff); // 5.2 MB

export async function setupTestEnvironment(): Promise<TestContext> {
  // 1. Ensure mock credentials in environment
  process.env.CLOUDINARY_CLOUD_NAME = 'mock_campusfix_cloud';
  process.env.CLOUDINARY_API_KEY = 'mock_campusfix_key';
  process.env.CLOUDINARY_API_SECRET = 'mock_campusfix_secret';
  (ENV as any).CLOUDINARY_CLOUD_NAME = 'mock_campusfix_cloud';
  (ENV as any).CLOUDINARY_API_KEY = 'mock_campusfix_key';
  (ENV as any).CLOUDINARY_API_SECRET = 'mock_campusfix_secret';

  // 2. Connect DB
  await connectDB();

  // 3. Mock Cloudinary uploader
  let shouldFail = false;
  let uploadCount = 0;
  const destroyedIds: string[] = [];

  const originalUploadStream = cloudinary.uploader.upload_stream;
  const originalDestroy = cloudinary.uploader.destroy;

  cloudinary.uploader.upload_stream = ((options: any, callback?: any) => {
    const cb = typeof options === 'function' ? options : callback;
    uploadCount++;

    return new (class extends Writable {
      _write(_chunk: any, _encoding: string, next: () => void) {
        next();
      }
      _final(next: () => void) {
        next();
        if (shouldFail) {
          cb(new Error('Simulated Cloudinary service upload failure'));
        } else {
          const randomId = 'mock_asset_' + Math.random().toString(36).substring(2, 9);
          cb(null, {
            secure_url: `https://res.cloudinary.com/mock_campusfix_cloud/image/upload/${randomId}.jpg`,
            public_id: `campusfix/evidence/${randomId}`,
            format: 'jpg',
            bytes: 2048,
          });
        }
      }
    })();
  }) as any;

  cloudinary.uploader.destroy = (async (publicId: string) => {
    destroyedIds.push(publicId);
    return { result: 'ok' };
  }) as any;

  // 4. Create Express test app
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  app.use('/api/complaints', complaintRoutes);
  app.use('/api/technician', technicianRoutes);

  // 5. Start HTTP server on ephemeral port
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // 6. Seed Department & Test Users
  let dept = await Department.findOne({ code: 'ELE' });
  if (!dept) {
    dept = await Department.create({
      name: 'Electrical Maintenance',
      code: 'ELE',
      description: 'Handles electrical fixtures and issues',
    });
  }

  // Clear previous test users/complaints
  await Complaint.deleteMany({});
  await User.deleteMany({ email: { $regex: /@test\.campusfix$/ } });

  const studentAUser = await User.create({
    name: 'Alice Student',
    email: 'alice@test.campusfix',
    password: 'Password123!',
    role: 'STUDENT',
  });
  const studentBUser = await User.create({
    name: 'Bob Student',
    email: 'bob@test.campusfix',
    password: 'Password123!',
    role: 'STUDENT',
  });

  const techAUser = await User.create({
    name: 'Tom Technician',
    email: 'tom@test.campusfix',
    password: 'Password123!',
    role: 'TECHNICIAN',
    department: dept._id,
  });
  const techBUser = await User.create({
    name: 'Terry Technician',
    email: 'terry@test.campusfix',
    password: 'Password123!',
    role: 'TECHNICIAN',
    department: dept._id,
  });

  const studentA = Object.assign(studentAUser, {
    token: authService.generateToken({ userId: studentAUser._id.toString(), role: 'STUDENT' }),
  });
  const studentB = Object.assign(studentBUser, {
    token: authService.generateToken({ userId: studentBUser._id.toString(), role: 'STUDENT' }),
  });
  const technicianA = Object.assign(techAUser, {
    token: authService.generateToken({ userId: techAUser._id.toString(), role: 'TECHNICIAN' }),
  });
  const technicianB = Object.assign(techBUser, {
    token: authService.generateToken({ userId: techBUser._id.toString(), role: 'TECHNICIAN' }),
  });

  const mockCloudinary = {
    setShouldFail: (fail: boolean) => {
      shouldFail = fail;
    },
    getUploadedCount: () => uploadCount,
    getDestroyedIds: () => [...destroyedIds],
    reset: () => {
      shouldFail = false;
      uploadCount = 0;
      destroyedIds.length = 0;
    },
  };

  const cleanup = async () => {
    cloudinary.uploader.upload_stream = originalUploadStream;
    cloudinary.uploader.destroy = originalDestroy;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
  };

  return {
    server,
    baseUrl,
    studentA,
    studentB,
    technicianA,
    technicianB,
    mockCloudinary,
    cleanup,
  };
}

export interface Phase6TestContext {
  server: Server;
  baseUrl: string;
  studentA: IUser & { token: string };
  studentB: IUser & { token: string };
  technicianA: IUser & { token: string };
  technicianB: IUser & { token: string };
  admin: IUser & { token: string };
  cleanup: () => Promise<void>;
}

export async function setupPhase6Environment(): Promise<Phase6TestContext> {
  // Connect DB
  await connectDB();

  // Create Express test app
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  app.use('/api/complaints', complaintRoutes);
  app.use('/api/technician', technicianRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/comments', commentRoutes);

  // Start HTTP server on ephemeral port
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Initialize Socket.io on this server
  const io = socketService.init(server);

  // Clear data
  await Complaint.deleteMany({});
  await Notification.deleteMany({});
  await Comment.deleteMany({});
  await User.deleteMany({ email: { $regex: /@phase6\.campusfix$/ } });

  let dept = await Department.findOne({ code: 'ELE' });
  if (!dept) {
    dept = await Department.create({
      name: 'Electrical Maintenance',
      code: 'ELE',
      description: 'Handles electrical fixtures and issues',
    });
  }

  // Create test users
  const studentAUser = await User.create({
    name: 'Alice Student',
    email: 'alice@phase6.campusfix',
    password: 'Password123!',
    role: 'STUDENT',
  });
  const studentBUser = await User.create({
    name: 'Bob Student',
    email: 'bob@phase6.campusfix',
    password: 'Password123!',
    role: 'STUDENT',
  });
  const techAUser = await User.create({
    name: 'Tom Technician',
    email: 'tom@phase6.campusfix',
    password: 'Password123!',
    role: 'TECHNICIAN',
    department: dept._id,
  });
  const techBUser = await User.create({
    name: 'Terry Technician',
    email: 'terry@phase6.campusfix',
    password: 'Password123!',
    role: 'TECHNICIAN',
    department: dept._id,
  });
  const adminUser = await User.create({
    name: 'Super Admin',
    email: 'admin@phase6.campusfix',
    password: 'Password123!',
    role: 'ADMIN',
  });

  const studentA = Object.assign(studentAUser, {
    token: authService.generateToken({ userId: studentAUser._id.toString(), role: 'STUDENT' }),
  });
  const studentB = Object.assign(studentBUser, {
    token: authService.generateToken({ userId: studentBUser._id.toString(), role: 'STUDENT' }),
  });
  const technicianA = Object.assign(techAUser, {
    token: authService.generateToken({ userId: techAUser._id.toString(), role: 'TECHNICIAN' }),
  });
  const technicianB = Object.assign(techBUser, {
    token: authService.generateToken({ userId: techBUser._id.toString(), role: 'TECHNICIAN' }),
  });
  const admin = Object.assign(adminUser, {
    token: authService.generateToken({ userId: adminUser._id.toString(), role: 'ADMIN' }),
  });

  const cleanup = async () => {
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
  };

  return {
    server,
    baseUrl,
    studentA,
    studentB,
    technicianA,
    technicianB,
    admin,
    cleanup,
  };
}
