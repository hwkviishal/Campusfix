import axios from 'axios';
import {
  HealthResponse,
  SystemStatusResponse,
  AuthResponse,
  MeResponse,
  LoginCredentials,
  RegisterData,
  SeedInfoResponse,
  ComplaintsResponse,
  SingleComplaintResponse,
  CreateComplaintInput,
  UpdateComplaintInput,
  ComplaintAIAnalysisResponse,
  DuplicateDetectionResponse,
} from '../types';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const apiService = {
  getHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },

  getSystemStatus: async (): Promise<SystemStatusResponse> => {
    const response = await apiClient.get<SystemStatusResponse>('/system/status');
    return response.data;
  },

  // Phase 2 Auth Endpoints
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
    return response.data;
  },

  getMe: async (): Promise<MeResponse> => {
    const response = await apiClient.get<MeResponse>('/auth/me');
    return response.data;
  },

  getSeedInfo: async (): Promise<SeedInfoResponse> => {
    const response = await apiClient.get<SeedInfoResponse>('/auth/seed-info');
    return response.data;
  },

  testRoleAccess: async (role: 'admin' | 'technician' | 'student'): Promise<any> => {
    const response = await apiClient.get(`/auth/role-test/${role}`);
    return response.data;
  },

  // Phase 3 & Phase 5 Complaint CRUD Endpoints
  createComplaint: async (
    data: CreateComplaintInput | FormData,
    options?: { onUploadProgress?: (progressEvent: any) => void }
  ): Promise<SingleComplaintResponse> => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const response = await apiClient.post<SingleComplaintResponse>('/complaints', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      onUploadProgress: options?.onUploadProgress,
    });
    return response.data;
  },

  removeComplaintImage: async (
    id: string,
    publicId: string
  ): Promise<SingleComplaintResponse> => {
    const response = await apiClient.post<SingleComplaintResponse>(
      `/complaints/${id}/remove-image`,
      { publicId }
    );
    return response.data;
  },

  getMyComplaints: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    category?: string;
    priority?: string;
  }): Promise<ComplaintsResponse> => {
    const response = await apiClient.get<ComplaintsResponse>('/complaints/my', { params });
    return response.data;
  },

  getComplaintById: async (id: string): Promise<SingleComplaintResponse> => {
    const response = await apiClient.get<SingleComplaintResponse>(`/complaints/${id}`);
    return response.data;
  },

  updateComplaint: async (
    id: string,
    data: UpdateComplaintInput
  ): Promise<SingleComplaintResponse> => {
    const response = await apiClient.patch<SingleComplaintResponse>(`/complaints/${id}`, data);
    return response.data;
  },

  deleteComplaint: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/complaints/${id}`
    );
    return response.data;
  },

  // Phase 4 Admin Endpoints
  getAdminDashboard: async (): Promise<{ success: boolean; data: import('../types').AdminDashboardData }> => {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },

  getAllComplaintsAdmin: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    category?: string;
    priority?: string;
    department?: string;
    building?: string;
    assigned?: string;
    sortBy?: string;
  }): Promise<{
    success: boolean;
    data: {
      complaints: import('../types').Complaint[];
      pagination: import('../types').ComplaintPagination;
    };
  }> => {
    const response = await apiClient.get('/admin/complaints', { params });
    return response.data;
  },

  getAdminComplaintById: async (id: string): Promise<SingleComplaintResponse> => {
    const response = await apiClient.get<SingleComplaintResponse>(`/admin/complaints/${id}`);
    return response.data;
  },

  assignTechnician: async (
    id: string,
    data: { technicianId: string; overrideDepartment?: boolean }
  ): Promise<SingleComplaintResponse> => {
    const response = await apiClient.patch<SingleComplaintResponse>(
      `/admin/complaints/${id}/assign`,
      data
    );
    return response.data;
  },

  updateComplaintPriority: async (
    id: string,
    priority: import('../types').ComplaintPriority
  ): Promise<SingleComplaintResponse> => {
    const response = await apiClient.patch<SingleComplaintResponse>(
      `/admin/complaints/${id}/priority`,
      { priority }
    );
    return response.data;
  },

  getAllTechnicians: async (params?: {
    search?: string;
    department?: string;
  }): Promise<{
    success: boolean;
    data: {
      technicians: import('../types').TechnicianItem[];
    };
  }> => {
    const response = await apiClient.get('/admin/technicians', { params });
    return response.data;
  },

  // Phase 4 Technician Endpoints
  getTechnicianDashboard: async (): Promise<{
    success: boolean;
    data: import('../types').TechnicianDashboardData;
  }> => {
    const response = await apiClient.get('/technician/dashboard');
    return response.data;
  },

  getTechnicianTasks: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  }): Promise<{
    success: boolean;
    data: {
      tasks: import('../types').Complaint[];
      pagination: import('../types').ComplaintPagination;
    };
  }> => {
    const response = await apiClient.get('/technician/tasks', { params });
    return response.data;
  },

  getTechnicianTaskById: async (id: string): Promise<SingleComplaintResponse> => {
    const response = await apiClient.get<SingleComplaintResponse>(`/technician/tasks/${id}`);
    return response.data;
  },

  startTechnicianTask: async (id: string): Promise<SingleComplaintResponse> => {
    const response = await apiClient.patch<SingleComplaintResponse>(
      `/technician/tasks/${id}/start`
    );
    return response.data;
  },

  resolveTechnicianTask: async (
    id: string,
    data: { resolutionNotes: string } | FormData,
    options?: { onUploadProgress?: (progressEvent: any) => void }
  ): Promise<SingleComplaintResponse> => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const response = await apiClient.patch<SingleComplaintResponse>(
      `/technician/tasks/${id}/resolve`,
      data,
      {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        onUploadProgress: options?.onUploadProgress,
      }
    );
    return response.data;
  },

  getUploadStatus: async (): Promise<{
    success: boolean;
    data: { configured: boolean; cloudName?: string; message: string };
  }> => {
    const response = await apiClient.get('/system/upload-status');
    return response.data;
  },

  // Phase 6 Notifications
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<import('../types').NotificationsResponse> => {
    const response = await apiClient.get<import('../types').NotificationsResponse>('/notifications', {
      params,
    });
    return response.data;
  },

  getUnreadNotificationCount: async (): Promise<import('../types').UnreadCountResponse> => {
    const response = await apiClient.get<import('../types').UnreadCountResponse>(
      '/notifications/unread-count'
    );
    return response.data;
  },

  markNotificationAsRead: async (
    id: string
  ): Promise<{ success: boolean; data: { notification: import('../types').AppNotification } }> => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllNotificationsAsRead: async (): Promise<{
    success: boolean;
    message: string;
    data: { updatedCount: number };
  }> => {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  // Phase 6 Comments
  getComplaintComments: async (
    complaintId: string
  ): Promise<import('../types').CommentsResponse> => {
    const response = await apiClient.get<import('../types').CommentsResponse>(
      `/complaints/${complaintId}/comments`
    );
    return response.data;
  },

  addComplaintComment: async (
    complaintId: string,
    data: { message: string; isInternal?: boolean }
  ): Promise<{ success: boolean; data: { comment: import('../types').ComplaintComment } }> => {
    const response = await apiClient.post(
      `/complaints/${complaintId}/comments`,
      data
    );
    return response.data;
  },

  // Admin status update
  updateComplaintStatusAdmin: async (
    complaintId: string,
    status: string,
    comment?: string
  ): Promise<SingleComplaintResponse> => {
    const response = await apiClient.patch<SingleComplaintResponse>(
      `/admin/complaints/${complaintId}/status`,
      { status, comment }
    );
    return response.data;
  },

  // Phase 7A AI Complaint Intelligence
  analyzeComplaintWithAI: async (payload: {
    description: string;
    building?: string;
    floor?: string;
    room?: string;
  }): Promise<ComplaintAIAnalysisResponse> => {
    const response = await apiClient.post<ComplaintAIAnalysisResponse>(
      '/ai/analyze-complaint',
      payload
    );
    return response.data;
  },

  // Phase 7B AI Duplicate Complaint Detection
  checkDuplicateWithAI: async (payload: {
    title?: string;
    description: string;
    category?: string;
    building?: string;
    floor?: string;
    room?: string;
  }): Promise<DuplicateDetectionResponse> => {
    const response = await apiClient.post<DuplicateDetectionResponse>(
      '/ai/check-duplicate',
      payload
    );
    return response.data;
  },
};
