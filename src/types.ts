export type UserRole = 'STUDENT' | 'TECHNICIAN' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  profileImage?: string;
  department?: {
    _id?: string;
    id?: string;
    name: string;
    code: string;
  } | string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
  };
  error?: string;
}

export interface MeResponse {
  success: boolean;
  data: {
    user: User;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'STUDENT';
}

export interface SeedAccount {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  departmentName?: string;
}

export interface SeedInfoResponse {
  success: boolean;
  data: {
    message: string;
    accounts: SeedAccount[];
  };
}

export type ComplaintStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'VERIFIED'
  | 'CLOSED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintCategory =
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'INTERNET_WIFI'
  | 'FURNITURE'
  | 'CLEANING'
  | 'CLASSROOM_EQUIPMENT'
  | 'SECURITY'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'OTHER';

export interface StatusHistoryItem {
  _id?: string;
  status: ComplaintStatus;
  changedBy: {
    _id?: string;
    id?: string;
    name: string;
    role: string;
    email?: string;
  } | string;
  timestamp: string;
  comment?: string;
}

export interface ComplaintImage {
  _id?: string;
  id?: string;
  url: string;
  publicId: string;
}

export interface Complaint {
  _id: string;
  id?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  building: string;
  floor: string;
  room: string;
  images: (ComplaintImage | string)[];
  resolutionImages?: (ComplaintImage | string)[];
  reportedBy: {
    _id?: string;
    id?: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
  } | string;
  assignedTo?: {
    _id?: string;
    id?: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    department?: {
      _id?: string;
      id?: string;
      name: string;
      code: string;
    } | string;
  } | string;
  assignedAt?: string;
  department?: {
    _id?: string;
    id?: string;
    name: string;
    code: string;
    contactEmail?: string;
  } | string;
  resolutionNotes?: string;
  resolvedAt?: string;
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  verified: number;
  closed: number;
  critical: number;
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentComplaints: Complaint[];
  unassignedComplaints: Complaint[];
  criticalComplaints: Complaint[];
  requiringAttention: Complaint[];
}

export interface TechnicianStats {
  assignedTasks: number;
  pendingTasks: number;
  inProgress: number;
  resolved: number;
}

export interface TechnicianDashboardData {
  stats: TechnicianStats;
  recentAssignments: Complaint[];
  highPriorityTasks: Complaint[];
  criticalTasks: Complaint[];
}

export interface TechnicianItem {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'TECHNICIAN';
  department?: {
    _id?: string;
    id?: string;
    name: string;
    code: string;
  } | string;
  isActive: boolean;
  assignedTaskCount: number;
  resolvedTaskCount: number;
  createdAt: string;
}

export interface AssignTechnicianInput {
  technicianId: string;
}

export interface UpdatePriorityInput {
  priority: ComplaintPriority;
}

export interface ResolveTaskInput {
  resolutionNotes: string;
}

export interface ComplaintPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ComplaintStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface CreateComplaintInput {
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  building: string;
  floor: string;
  room: string;
  images?: string[];
}

export interface UpdateComplaintInput {
  title?: string;
  description?: string;
  category?: ComplaintCategory;
  priority?: ComplaintPriority;
  building?: string;
  floor?: string;
  room?: string;
}

export interface ComplaintsResponse {
  success: boolean;
  data: {
    complaints: Complaint[];
    pagination: ComplaintPagination;
    stats: ComplaintStats;
  };
}

export interface SingleComplaintResponse {
  success: boolean;
  message?: string;
  data: {
    complaint: Complaint;
  };
}

export interface DatabaseStatus {
  connected: boolean;
  state: string;
  host: string;
  databaseName: string;
  isInMemory: boolean;
  error?: string | null;
}

export interface HealthResponse {
  success: boolean;
  message: string;
  data: {
    appName: string;
    version: string;
    environment: string;
    port: number;
    uptimeSeconds: number;
    timestamp: string;
    database: DatabaseStatus;
  };
}

export interface SystemStatusResponse {
  success: boolean;
  system: {
    platform: string;
    nodeVersion: string;
    phase: number;
    phaseDescription: string;
    cloudinaryConfigured?: boolean;
    cloudinaryStatus?: {
      configured: boolean;
      cloudName?: string;
      message: string;
    };
    database: DatabaseStatus;
    counts?: {
      complaints: number;
      users: number;
    };
    services: Record<string, string>;
    nextPhase: string;
  };
}

// Phase 6 Notification & Comment Types
export type NotificationType =
  | 'COMPLAINT_CREATED'
  | 'COMPLAINT_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'COMMENT_ADDED'
  | 'COMPLAINT_RESOLVED'
  | 'COMPLAINT_VERIFIED'
  | 'COMPLAINT_CLOSED'
  | 'PRIORITY_CHANGED'
  | 'SYSTEM';

export interface AppNotification {
  _id: string;
  id?: string;
  recipient: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedComplaint?: {
    _id: string;
    id?: string;
    title: string;
    status: ComplaintStatus;
    priority: ComplaintPriority;
    category: ComplaintCategory;
    building: string;
    room: string;
  } | string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  message?: string;
  data: {
    notifications: AppNotification[];
    unreadCount: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

export interface CommentAuthor {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  profileImage?: string;
}

export interface ComplaintComment {
  _id: string;
  id?: string;
  complaint: string;
  author: CommentAuthor;
  message: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsResponse {
  success: boolean;
  message?: string;
  data: {
    comments: ComplaintComment[];
    count: number;
  };
}

// Phase 7A AI Complaint Intelligence
export interface ComplaintAIAnalysis {
  suggestedTitle: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  departmentCode: string;
  summary: string;
  suggestedAction: string;
}

export interface ComplaintAIAnalysisResponse {
  success: boolean;
  message?: string;
  data?: ComplaintAIAnalysis;
  error?: string;
}


