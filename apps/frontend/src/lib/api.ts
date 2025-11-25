/**
 * API Client Configuration
 * Axios instance with interceptors for auth and error handling
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000;

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any custom headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 (redirect to login)
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API service functions
export const userAPI = {
  getCurrentUser: () => api.get('/api/users/me'),
  updateCurrentUser: (data: any) => api.patch('/api/users/me', data),
  listUsers: (params?: any) => api.get('/api/users', { params }),
  getUserById: (id: string) => api.get(`/api/users/${id}`),
  updateUserRole: (id: string, role: string) =>
    api.patch(`/api/users/${id}/role`, { role }),
  banUser: (id: string, data: any) => api.post(`/api/users/${id}/ban`, data),
  unbanUser: (id: string) => api.post(`/api/users/${id}/unban`),
};

export const organizationAPI = {
  listOrganizations: () => api.get('/api/organizations'),
  getOrganization: (id: string) => api.get(`/api/organizations/${id}`),
  createOrganization: (data: any) => api.post('/api/organizations', data),
  updateOrganization: (id: string, data: any) =>
    api.patch(`/api/organizations/${id}`, data),
  deleteOrganization: (id: string) => api.delete(`/api/organizations/${id}`),
  listMembers: (orgId: string) => api.get(`/api/organizations/${orgId}/members`),
  inviteMember: (orgId: string, data: any) =>
    api.post(`/api/organizations/${orgId}/members`, data),
  updateMemberRole: (orgId: string, memberId: string, role: string) =>
    api.patch(`/api/organizations/${orgId}/members/${memberId}`, { role }),
  removeMember: (orgId: string, memberId: string) =>
    api.delete(`/api/organizations/${orgId}/members/${memberId}`),
  listInvitations: (orgId: string) =>
    api.get(`/api/organizations/${orgId}/invitations`),
  acceptInvitation: (token: string) =>
    api.post(`/api/organizations/invitations/${token}/accept`),
  cancelInvitation: (invitationId: string) =>
    api.delete(`/api/organizations/invitations/${invitationId}`),
};

export const projectAPI = {
  listProjects: (params?: any) => api.get('/api/projects', { params }),
  getProject: (id: string) => api.get(`/api/projects/${id}`),
  createProject: (data: any) => api.post('/api/projects', data),
  updateProject: (id: string, data: any) => api.patch(`/api/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/api/projects/${id}`),
};

export default api;
