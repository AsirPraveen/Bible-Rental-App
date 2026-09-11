import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiClient } from '@/services';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../config/api';
export type Organization = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  inviteCode?: string;
  isPublic: boolean;
  requiresApproval: boolean;
  /**
   * Feature flags. These key names MUST match backend/models/Organization.js
   * exactly -- the schema is strict, so Mongoose silently drops any key it does
   * not declare, and a read of a misspelled key yields undefined (which most
   * call sites then treat as "enabled").
   *
   * Three keys here used to be camelCase inventions (forum, prayerWall, songs)
   * that the server neither stored nor returned, so those toggles always
   * displayed as on and never saved.
   */
  features: Partial<{
    bookRental: boolean;
    upperRoom: boolean;
    game: boolean;
    imageGeneration: boolean;
    /** Members may delete their own account, unless the platform switch is off. */
    accountDeletion: boolean;
    Bible: boolean;
    Songs: boolean;
    HistoricalMaps: boolean;
    ReadingTracker: boolean;
    ReadingPlanner: boolean;
    DiscussionForum: boolean;
    FastingTracker: boolean;
    PrayerRequests: boolean;
    MessageNotes: boolean;
    BookPdf: boolean;
    SongPdf: boolean;
    BiblicalArtifacts: boolean;
  }>;
  guestAccess: Record<string, boolean>;
};

/** The org feature-flag map, for code that holds it on its own. */
export type OrgFeatures = Organization['features'];

export type Membership = {
  organization: Organization;
  role: 'Admin' | 'User';
  joinedAt: string;
  isActive: boolean;
};

type OrgContextType = {
  activeOrg: Organization | null;
  memberships: Membership[];
  orgRole: 'Admin' | 'User' | 'Guest';
  loading: boolean;
  switchOrg: (orgId: string) => Promise<boolean>;
  refreshOrgs: () => Promise<void>;
};

const OrganizationContext = createContext<OrgContextType | null>(null);

export const OrganizationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest } = useAuth();
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [orgRole, setOrgRole] = useState<'Admin' | 'User' | 'Guest'>('Guest');
  const [loading, setLoading] = useState(true);

  const fetchOrgContext = async () => {
    if (isGuest) {
      // A guest's whole surface is global content — Bible, historical maps and
      // the 3D museum — so there is no org context to restore. Calling
      // /organizations/details here would 401 (it requires a member) and the
      // global interceptor would log the guest out with "Session Expired".
      setActiveOrg(null);
      setMemberships([]);
      setOrgRole('Guest');
      setLoading(false);
      return;
    }

    if (!user) {
      setActiveOrg(null);
      setMemberships([]);
      setOrgRole('Guest');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const res = await apiClient.post(`/api/auth/userdata`, { token });

      if (res.data.status === 'Ok') {
        const userData = res.data.data;
        const userMemberships: Membership[] = userData.memberships || [];
        setMemberships(userMemberships);

        const isSuper = userData.globalRole === 'SuperAdmin';
        const activeId = userData.activeOrganizationId;
        if (activeId) {
          const activeMembership = userMemberships.find(
            m => m.organization._id.toString() === activeId.toString()
          );
          if (activeMembership) {
            setActiveOrg(activeMembership.organization);
            setOrgRole(activeMembership.role);
            await AsyncStorage.setItem('activeOrgId', activeId);
            apiClient.defaults.headers.common['x-organization-id'] = activeId;
          } else {
            setActiveOrg(null);
            setOrgRole('User');
          }
        } else {
          setActiveOrg(null);
          setOrgRole('User');
        }
      }
    } catch (err) {
      console.error('Error fetching organization memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgContext();
  }, [user, isGuest]);

  const switchOrg = async (orgId: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      if (isGuest) {
        // Guests have no org to switch to — signing in is what grants one.
        setLoading(false);
        return false;
      }

      const res = await apiClient.post(`/api/organizations/switch`, { orgId });
      if (res.data.status === 'Ok') {
        await AsyncStorage.setItem('activeOrgId', orgId);
        apiClient.defaults.headers.common['x-organization-id'] = orgId;
        await fetchOrgContext();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error switching active organization:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshOrgs = async () => {
    await fetchOrgContext();
  };

  return (
    <OrganizationContext.Provider value={{ activeOrg, memberships, orgRole, loading, switchOrg, refreshOrgs }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrg must be used within an OrganizationProvider");
  }
  return context;
};
