import { apiClient } from './apiClient';
import type { Organization } from '../types/models';

/**
 * Multi-tenant org endpoints.
 *
 * Every org-scoped route runs through the server's `orgScope` middleware, which
 * derives the tenant from the caller's token -- never from a client-supplied id.
 * So none of these take an organization parameter, by design.
 */
export const organizationsService = {
  async publicDirectory(): Promise<Organization[]> {
    const { data } = await apiClient.get('/api/organizations/public-directory');
    return data.data ?? data;
  },
  async create(payload: { name: string; code?: string }) {
    const { data } = await apiClient.post('/api/organizations/create', payload);
    return data.data ?? data;
  },
  async update(changes: Partial<Organization>) {
    const { data } = await apiClient.put('/api/organizations/update', changes);
    return data.data ?? data;
  },
  async switch(organizationId: string) {
    const { data } = await apiClient.post('/api/organizations/switch', { organizationId });
    return data.data ?? data;
  },
  async members() {
    const { data } = await apiClient.get('/api/organizations/members');
    return data.data ?? data;
  },
  async approveMember(email: string) {
    const { data } = await apiClient.post('/api/organizations/members/approve', { email });
    return data.data ?? data;
  },
  async inviteMember(email: string) {
    const { data } = await apiClient.post('/api/organizations/members/invite', { email });
    return data.data ?? data;
  },
  async updateMember(payload: { email: string; orgRole?: string }) {
    const { data } = await apiClient.put('/api/organizations/members/update', payload);
    return data.data ?? data;
  },
  async joinByInvite(code: string) {
    const { data } = await apiClient.post('/api/organizations/join-invite', { code });
    return data.data ?? data;
  },
  async requestToJoin(organizationId: string) {
    const { data } = await apiClient.post('/api/organizations/join-request', { organizationId });
    return data.data ?? data;
  },
  async regenerateInvite() {
    const { data } = await apiClient.post('/api/organizations/invite/regenerate', {});
    return data.data ?? data;
  },
};
