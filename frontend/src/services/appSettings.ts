import { apiClient } from './apiClient';

/** Org-level feature flags, plus the SuperAdmin global switches. */
export const appSettingsService = {
  async get() {
    const { data } = await apiClient.get('/api/app-settings');
    return data.data ?? data;
  },
  async update(changes: Record<string, unknown>) {
    const { data } = await apiClient.put('/api/app-settings', changes);
    return data.data ?? data;
  },
  async getGlobal() {
    const { data } = await apiClient.get('/api/app-settings/global');
    return data.data ?? data;
  },
};
