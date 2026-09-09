import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../config/api';

/**
 * The single HTTP client for this app's own backend.
 *
 * Before this existed, every screen called bare `axios` with a hand-built
 * template-literal URL and, when it remembered, a hand-attached Authorization
 * header. That produced 222 call sites, 60 of which read the token out of
 * AsyncStorage but only 21 of which actually sent it -- the rest silently made
 * unauthenticated requests, which the server answers differently.
 *
 * Attaching the token here makes that impossible to get wrong. It is scoped to
 * `baseURL`: anything talking to a third party (Cloudinary, Google) must keep
 * using bare `axios`, so credentials can never leak to another host.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // A caller that sets its own Authorization wins -- some flows (password
  // reset, token refresh) deliberately send a different credential.
  if (!config.headers.Authorization) {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  // Multi-tenant scoping. The server reads this to pick the active
  // organization, so omitting it silently returns another tenant's view (or
  // none at all). It has to live here, not on axios.defaults: an instance made
  // by axios.create() copies the global defaults ONCE, at creation, so later
  // mutations of axios.defaults.headers.common never reach it.
  if (!config.headers['x-organization-id']) {
    const activeOrgId = await AsyncStorage.getItem('activeOrgId');
    if (activeOrgId) config.headers['x-organization-id'] = activeOrgId;
  }

  return config;
});

/** A network or server failure, normalised so callers do not parse AxiosError. */
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly isNetworkError: boolean;

  constructor(message: string, status: number | null, code: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.isNetworkError = status === null;
  }
}

apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError<{ message?: string; error?: string; code?: string }>) => {
    const status = error.response?.status ?? null;
    const body = error.response?.data;
    const message =
      body?.message ??
      body?.error ??
      (status === null
        ? 'Could not reach the server. Check your connection.'
        : `Request failed (${status}).`);
    return Promise.reject(new ApiError(message, status, body?.code ?? null));
  },
);

export default apiClient;
