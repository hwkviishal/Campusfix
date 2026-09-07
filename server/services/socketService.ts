import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { authService, AUTH_COOKIE_NAME, JwtPayload } from './authService.js';
import { User, IUser } from '../models/User.js';
import { Complaint } from '../models/Complaint.js';

export interface AuthenticatedSocketUser {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TECHNICIAN' | 'ADMIN';
  department?: string;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user: AuthenticatedSocketUser;
  };
}

let io: SocketIOServer | null = null;

/**
 * Extracts and verifies JWT from handshake auth, header, or cookies.
 */
function extractTokenFromHandshake(socket: Socket): string | null {
  // 1. Handshake auth payload
  if (socket.handshake.auth && typeof socket.handshake.auth.token === 'string') {
    const raw = socket.handshake.auth.token.trim();
    if (raw) return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw;
  }

  // 2. Authorization header
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 3. Cookie header
  const rawCookie = socket.handshake.headers.cookie;
  if (rawCookie) {
    const match = rawCookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (match) {
      return decodeURIComponent(match.split('=')[1]);
    }
  }

  return null;
}

/**
 * Initializes Socket.IO with the shared HTTP server.
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    serveClient: false,
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware for all incoming socket connections
  io.use(async (socket, next) => {
    try {
      const token = extractTokenFromHandshake(socket);
      if (!token) {
        return next(new Error('Authentication required. No credentials provided.'));
      }

      let payload: JwtPayload;
      try {
        payload = authService.verifyToken(token);
      } catch (tokenErr) {
        return next(new Error('Invalid or expired authentication token.'));
      }

      if (!payload || !payload.userId) {
        return next(new Error('Malformed authentication token.'));
      }

      const user = await User.findById(payload.userId).lean();
      if (!user) {
        return next(new Error('Authenticated user no longer exists.'));
      }

      if (user.isActive === false) {
        return next(new Error('User account is deactivated.'));
      }

      // Attach verified user data to socket
      socket.data.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department?.toString(),
      };

      return next();
    } catch (err: any) {
      console.error('[Socket.IO] Authentication handshake error:', err.message);
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.data.user;

    if (!user) {
      socket.disconnect(true);
      return;
    }

    // Automatically join the user's private personal room: user:{userId}
    const userRoom = `user:${user.id}`;
    socket.join(userRoom);

    // If admin, also join admin group room for instant system-wide broadcast updates
    if (user.role === 'ADMIN') {
      socket.join('role:ADMIN');
    }

    /**
     * Room joining protocol for complaints: complaint:{complaintId}
     * Strictly verifies authorization:
     * - ADMIN: Allowed for all complaints
     * - STUDENT: Only allowed if reportedBy === user.id
     * - TECHNICIAN: Only allowed if assignedTo === user.id
     */
    socket.on(
      'complaint:join',
      async (
        payload: { complaintId: string },
        callback?: (response: { success: boolean; message?: string }) => void
      ) => {
        try {
          const complaintId = payload?.complaintId;
          if (!complaintId || !mongoose.Types.ObjectId.isValid(complaintId)) {
            const errRes = { success: false, message: 'Invalid complaint ID' };
            socket.emit('error', errRes);
            if (typeof callback === 'function') callback(errRes);
            return;
          }

          const complaint = await Complaint.findById(complaintId).lean();
          if (!complaint) {
            const errRes = { success: false, message: 'Complaint not found' };
            socket.emit('error', errRes);
            if (typeof callback === 'function') callback(errRes);
            return;
          }

          let isAuthorized = false;
          if (user.role === 'ADMIN') {
            isAuthorized = true;
          } else if (user.role === 'STUDENT') {
            isAuthorized = complaint.reportedBy?.toString() === user.id;
          } else if (user.role === 'TECHNICIAN') {
            isAuthorized = complaint.assignedTo?.toString() === user.id;
          }

          if (!isAuthorized) {
            const forbiddenRes = {
              success: false,
              message: 'Forbidden: You are not authorized to subscribe to this complaint docket.',
            };
            socket.emit('error', forbiddenRes);
            if (typeof callback === 'function') callback(forbiddenRes);
            return;
          }

          const room = `complaint:${complaintId}`;
          socket.join(room);

          const successRes = { success: true, message: `Joined room ${room}` };
          if (typeof callback === 'function') callback(successRes);
        } catch (err: any) {
          console.error('[Socket.IO] complaint:join error:', err);
          const failRes = { success: false, message: 'Internal server error while joining room' };
          socket.emit('error', failRes);
          if (typeof callback === 'function') callback(failRes);
        }
      }
    );

    /**
     * Room leaving protocol for complaints
     */
    socket.on(
      'complaint:leave',
      (payload: { complaintId: string }, callback?: (response: { success: boolean }) => void) => {
        try {
          const complaintId = payload?.complaintId;
          if (complaintId) {
            socket.leave(`complaint:${complaintId}`);
          }
          if (typeof callback === 'function') callback({ success: true });
        } catch (err) {
          if (typeof callback === 'function') callback({ success: false });
        }
      }
    );
  });

  return io;
}

/**
 * Returns active Socket.IO server instance or null.
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Sets or mocks the active Socket.IO server instance (useful for testing).
 */
export function setSocketServer(instance: SocketIOServer | null): void {
  io = instance;
}

/**
 * Emits real-time notification to a specific user's private room.
 */
export function emitToUser(userId: string, event: string, data: any): void {
  try {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, data);
  } catch (err) {
    console.error(`[Socket.IO] Failed to emit '${event}' to user:${userId}:`, err);
  }
}

/**
 * Emits real-time notification to all active administrators.
 */
export function emitToAdmins(event: string, data: any): void {
  try {
    if (!io) return;
    io.to('role:ADMIN').emit(event, data);
  } catch (err) {
    console.error(`[Socket.IO] Failed to emit '${event}' to role:ADMIN:`, err);
  }
}

/**
 * Emits real-time event to a complaint room with optional internal comment segregation.
 */
export function emitToComplaint(
  complaintId: string,
  event: string,
  data: any,
  options?: { internalOnly?: boolean }
): void {
  try {
    if (!io) return;
    const room = `complaint:${complaintId}`;

    if (options?.internalOnly) {
      // Internal comments must NOT be delivered to students.
      // Socket.IO allows inspecting room sockets or filtering by socket data.
      const roomSockets = io.sockets.adapter.rooms.get(room);
      if (!roomSockets) return;

      for (const socketId of roomSockets) {
        const clientSocket = io.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;
        if (clientSocket && (clientSocket.data.user?.role === 'ADMIN' || clientSocket.data.user?.role === 'TECHNICIAN')) {
          clientSocket.emit(event, data);
        }
      }
    } else {
      io.to(room).emit(event, data);
    }
  } catch (err) {
    console.error(`[Socket.IO] Failed to emit '${event}' to complaint:${complaintId}:`, err);
  }
}

/**
 * Emits complaint:updated to all involved parties (complaint room, user rooms, and admin group).
 */
export function emitComplaintUpdated(complaint: any): void {
  try {
    if (!io) return;
    const complaintId = complaint._id ? complaint._id.toString() : complaint.id;
    if (!complaintId) return;

    const payload = {
      complaintId,
      complaint,
      timestamp: new Date().toISOString(),
    };

    // 1. Emit to complaint room
    io.to(`complaint:${complaintId}`).emit('complaint:updated', payload);

    // 2. Emit to reported student user room
    const reporterId = complaint.reportedBy?._id
      ? complaint.reportedBy._id.toString()
      : complaint.reportedBy?.toString();
    if (reporterId) {
      io.to(`user:${reporterId}`).emit('complaint:updated', payload);
    }

    // 3. Emit to assigned technician user room if assigned
    const assignedId = complaint.assignedTo?._id
      ? complaint.assignedTo._id.toString()
      : complaint.assignedTo?.toString();
    if (assignedId) {
      io.to(`user:${assignedId}`).emit('complaint:updated', payload);
    }

    // 4. Emit to all administrators
    io.to('role:ADMIN').emit('complaint:updated', payload);
  } catch (err) {
    console.error('[Socket.IO] Failed to emit complaint:updated:', err);
  }
}

export const socketService = {
  init: initSocketServer,
  get: getSocketServer,
  set: setSocketServer,
  emitToUser,
  emitToAdmins,
  emitToComplaint,
  emitComplaintUpdated,
};
