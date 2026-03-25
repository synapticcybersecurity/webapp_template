/**
 * API Client Configuration
 * Axios instance for custom API endpoints not handled by better-auth
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

// CSRF token cache
let csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  const response = await axios.get(`${API_URL}/api/csrf-token`, {
    withCredentials: true,
  });
  csrfToken = response.data.csrfToken;
  return csrfToken!;
}

// Request interceptor — attach CSRF token to state-changing requests
api.interceptors.request.use(
  async (config) => {
    const method = config.method?.toUpperCase();
    if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (!csrfToken) {
        await fetchCsrfToken();
      }
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — handle auth errors and CSRF token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup') {
        window.location.href = '/login';
      }
    }

    // Refresh CSRF token and retry on CSRF validation failure
    if (error.response?.status === 403 && error.response?.data?.code === 'EBADCSRFTOKEN') {
      csrfToken = null;
      await fetchCsrfToken();
      const originalRequest = error.config;
      originalRequest.headers['X-CSRF-Token'] = csrfToken;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Custom API endpoints not covered by better-auth
export const userAPI = {
  // Admin approval workflow (custom business logic)
  listPendingApprovals: () => api.get('/api/users/pending'),
  getPendingCount: () => api.get('/api/users/pending/count'),
  approveUser: (id: string) => api.post(`/api/users/${id}/approve`),
  rejectUser: (id: string, reason?: string) => api.post(`/api/users/${id}/reject`, { reason }),
};

export const billingAPI = {
  listPlans: () => api.get('/api/billing/plans'),
  getBillingOverview: (orgId: string) => api.get(`/api/billing/${orgId}`),
  createCheckout: (orgId: string, data: { plan: string; interval: string }) =>
    api.post(`/api/billing/${orgId}/checkout`, data),
  createPortal: (orgId: string) => api.post(`/api/billing/${orgId}/portal`),
  getInvoices: (orgId: string, limit?: number) =>
    api.get(`/api/billing/${orgId}/invoices`, { params: { limit } }),
};

export const meteringAPI = {
  getUsageSummary: (orgId: string) => api.get(`/api/metering/${orgId}`),
};

export const projectAPI = {
  listProjects: (params?: any) => api.get('/api/projects', { params }),
  getProject: (id: string) => api.get(`/api/projects/${id}`),
  createProject: (data: any) => api.post('/api/projects', data),
  updateProject: (id: string, data: any) => api.patch(`/api/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/api/projects/${id}`),
};

export default api;
