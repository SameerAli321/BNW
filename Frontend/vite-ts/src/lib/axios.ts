import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

// BNW OMS API — see docs/API_CONTRACT_SPRINT1.md (binding contract, keep in sync).
// Base path already includes /api/v1 (see VITE_SERVER_URL), so endpoint paths below are relative to that.
export const endpoints = {
  auth: {
    me: '/auth/me',
    signIn: '/auth/login',
    // Self-registration is out of scope for Sprint 1 (HR/Admin creates users via POST /users,
    // see endpoints.users.list). Route kept only so the template's existing demo sign-up page
    // still compiles; it is not linked from the BNW OMS nav and is not part of the API contract.
    signUp: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    changePassword: '/auth/change-password',
  },
  users: {
    list: '/users',
    details: (id: number | string) => `/users/${id}`,
    reports: (id: number | string) => `/users/${id}/reports`,
    // Gap-fix — see docs/API_CONTRACT_GAPS_FIX.md Gap 1.
    profile: (id: number | string) => `/users/${id}/profile`,
    resetPassword: (id: number | string) => `/users/${id}/reset-password`,
  },
  roles: '/roles',
  departments: '/departments',
  // Gap-fix — see docs/API_CONTRACT_GAPS_FIX.md Gap 2. CEO/ADMIN only.
  auditLogs: '/audit-logs',
  // Sprint 2 — E-record & Staff summary, see docs/API_CONTRACT_SPRINT2.md.
  staffSummary: {
    list: '/staff-summary',
    export: '/staff-summary/export',
  },
  employees: {
    record: (id: number | string) => `/employees/${id}/record`,
    documents: (id: number | string) => `/employees/${id}/documents`,
    documentRequests: (id: number | string) => `/employees/${id}/document-requests`,
  },
  documents: {
    download: (id: number | string) => `/documents/${id}/download`,
  },
  documentTypes: '/document-types',
  // Sprint 3 — Letter engine, see docs/API_CONTRACT_SPRINT3.md.
  letterTemplates: {
    list: '/letter-templates',
    details: (id: number | string) => `/letter-templates/${id}`,
    fields: (id: number | string) => `/letter-templates/${id}/fields`,
  },
  letters: {
    list: '/letters',
    details: (id: number | string) => `/letters/${id}`,
    preview: (id: number | string) => `/letters/${id}/preview`,
    submitToCeo: (id: number | string) => `/letters/${id}/submit-to-ceo`,
    requestChanges: (id: number | string) => `/letters/${id}/request-changes`,
    ceoSign: (id: number | string) => `/letters/${id}/ceo-sign`,
    sendToEmployee: (id: number | string) => `/letters/${id}/send-to-employee`,
    employeeSign: (id: number | string) => `/letters/${id}/employee-sign`,
    pdf: (id: number | string) => `/letters/${id}/pdf`,
  },
  // Sprint 4 — Appraisals (employee-initiated quarterly flow), see
  // docs/API_CONTRACT_SPRINT4.md.
  appraisalRequests: {
    list: '/appraisal-requests',
    mine: '/appraisal-requests/mine',
    team: '/appraisal-requests/team',
    pendingCeo: '/appraisal-requests/pending-ceo',
    details: (id: number | string) => `/appraisal-requests/${id}`,
    managerDecision: (id: number | string) => `/appraisal-requests/${id}/manager-decision`,
    ceoDecision: (id: number | string) => `/appraisal-requests/${id}/ceo-decision`,
  },
  // Demo-only endpoints kept from the minimal-kit template (out of scope for BNW OMS Sprint 1,
  // not reachable from the app nav — see docs/FRONTEND_STATUS.md).
  chat: '/api/chat',
  kanban: '/api/kanban',
  calendar: '/api/calendar',
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  product: {
    list: '/api/product/list',
    details: '/api/product/details',
    search: '/api/product/search',
  },
} as const;

// ----------------------------------------------------------------------

const axiosInstance = axios.create({
  baseURL: CONFIG.serverUrl,
  // Refresh token travels as an httpOnly cookie (see contract) — cookies must be sent/received.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

/**
 * Silent refresh: exchange the httpOnly refresh cookie for a new access token.
 * Uses a bare axios instance (not `axiosInstance`) to avoid re-triggering this same interceptor.
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post(
      `${CONFIG.serverUrl}${endpoints.auth.refresh}`,
      {},
      { withCredentials: true }
    );

    const accessToken = res?.data?.data?.accessToken as string | undefined;

    if (accessToken) {
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      return accessToken;
    }

    return null;
  } catch {
    return null;
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as RetryableRequestConfig | undefined;
    const status = error?.response?.status;
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

    // On a 401 from a non-auth endpoint, try exactly one silent refresh, then retry the request.
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      }
    }

    const message =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong!';

    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async <T = unknown>(
  args: string | [string, AxiosRequestConfig]
): Promise<T> => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args, {}];

    const res = await axiosInstance.get<T>(url, config);

    return res.data;
  } catch (error) {
    console.error('Fetcher failed:', error);
    throw error;
  }
};
