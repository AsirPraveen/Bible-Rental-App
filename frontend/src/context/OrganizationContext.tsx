import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

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
  features: {
    bookRental: boolean;
    forum: boolean;
    prayerWall: boolean;
    songs: boolean;
    game: boolean;
    imageGeneration: boolean;
    messageNotes: boolean;
    fastingTracker: boolean;
    readingPlanner: boolean;
  };
  guestAccess: Record<string, boolean>;
};

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
      const res = await axios.post(`${API_URL}/api/auth/userdata`, { token });

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
            axios.defaults.headers.common['x-organization-id'] = activeId;
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

      const res = await axios.post(`${API_URL}/api/organizations/switch`, { orgId });
      if (res.data.status === 'Ok') {
        await AsyncStorage.setItem('activeOrgId', orgId);
        axios.defaults.headers.common['x-organization-id'] = orgId;
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
