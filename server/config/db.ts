import mongoose from 'mongoose';
import { ENV } from './env.js';

let mongoMemoryServerInstance: any = null;

export interface DatabaseStatus {
  connected: boolean;
  state: string;
  host: string;
  databaseName: string;
  isInMemory: boolean;
  error?: string | null;
}

const connectionStates: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

export async function connectDB(): Promise<DatabaseStatus> {
  // If already connected, return status
  if (mongoose.connection.readyState === 1) {
    return getDatabaseStatus();
  }

  const primaryUri = ENV.MONGODB_URI;

  if (primaryUri) {
    try {
      console.log(`[Database] Attempting connection to MongoDB URI: ${primaryUri.replace(/\/\/.*@/, '//***:***@')}`);
      await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log(`[Database] Successfully connected to MongoDB at ${mongoose.connection.host}/${mongoose.connection.name}`);
      return getDatabaseStatus();
    } catch (err: any) {
      console.warn(`[Database] Failed to connect to primary MongoDB URI (${err.message}). Falling back to in-memory MongoDB engine...`);
    }
  }

  // Fallback to in-memory MongoDB for seamless sandbox/local execution
  try {
    console.log('[Database] Initializing embedded MongoDB server for development...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoMemoryServerInstance = await MongoMemoryServer.create({
      instance: {
        dbName: 'campusfix_dev',
      },
    });
    const memoryUri = mongoMemoryServerInstance.getUri();
    console.log(`[Database] Embedded MongoDB running at: ${memoryUri}`);

    await mongoose.connect(memoryUri);
    console.log('[Database] Successfully connected to embedded MongoDB instance.');
    return getDatabaseStatus();
  } catch (memErr: any) {
    console.error('[Database] Failed to initialize embedded MongoDB:', memErr.message);
    return {
      connected: false,
      state: connectionStates[mongoose.connection.readyState] || 'unknown',
      host: 'none',
      databaseName: 'none',
      isInMemory: false,
      error: memErr.message,
    };
  }
}

export function getDatabaseStatus(): DatabaseStatus {
  const readyState = mongoose.connection.readyState;
  return {
    connected: readyState === 1,
    state: connectionStates[readyState] || 'unknown',
    host: mongoose.connection.host || (mongoMemoryServerInstance ? 'localhost (memory)' : 'none'),
    databaseName: mongoose.connection.name || 'none',
    isInMemory: !!mongoMemoryServerInstance,
  };
}

export async function closeDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServerInstance) {
    await mongoMemoryServerInstance.stop();
  }
}
