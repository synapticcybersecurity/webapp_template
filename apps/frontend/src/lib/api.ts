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

// Guards against a burst of concurrent failures each triggering their own
// navigation; the first one wins and the rest fall through quietly.
let isRedirecting = false;

/**
 * Pages that stay reachable without an active subscription, because they are
 * where a paywalled user goes to resolve it.
 */
const PAYWALL_EXEMPT_PATHS = ['/pricing', '/billing', '/login', '/signup', '/organizations'];

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
  },
);

// Response interceptor — handle auth errors and CSRF token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const currentPath = window.location.pathname;

    if (error.response?.status === 401) {
      if (!isRedirecting && currentPath !== '/login' && currentPath !== '/signup') {
        isRedirecting = true;
        // Preserve where they were so login can send them back.
        const redirect = encodeURIComponent(currentPath + window.location.search);
        window.location.assign(`/login?redirect=${redirect}`);
      }
    }

    // Paywall, not a permission failure: the session is valid but the org has
    // no active subscription and no live trial. Send them somewhere they can
    // actually fix it, unless they are already on such a page -- redirecting
    // /pricing to /pricing would loop.
    if (
      error.response?.status === 403 &&
      error.response?.data?.error?.code === 'SUBSCRIPTION_REQUIRED' &&
      !isRedirecting &&
      !PAYWALL_EXEMPT_PATHS.some((path) => currentPath.startsWith(path))
    ) {
      isRedirecting = true;
      window.location.assign('/pricing?reason=subscription_required');
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
  },
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

export const adminAPI = {
  listOrganizations: (search?: string) =>
    api.get('/api/admin/organizations', { params: search ? { search } : undefined }),
  setActiveOrganization: (organizationId: string) =>
    api.post('/api/admin/session/active-org', { organizationId }),
  clearActiveOrganization: () => api.delete('/api/admin/session/active-org'),
};

export const meteringAPI = {
  getUsageSummary: (orgId: string) => api.get(`/api/metering/${orgId}`),
};

export const projectAPI = {
  listProjects: (params?: Record<string, unknown>) => api.get('/api/projects', { params }),
  getProject: (id: string) => api.get(`/api/projects/${id}`),
  createProject: (data: Record<string, unknown>) => api.post('/api/projects', data),
  updateProject: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/api/projects/${id}`),
};

export default api;
