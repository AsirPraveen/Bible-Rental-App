import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

// Configure global axios interceptor to automatically attach JWT token and x-organization-id to all outgoing requests
axios.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const activeOrgId = await AsyncStorage.getItem('activeOrgId');
      if (activeOrgId && config.headers) {
        config.headers['x-organization-id'] = activeOrgId;
      }
    } catch (e) {
      console.error('Failed to attach token/org to request headers', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

type AuthState = {
  isGuest: boolean;
  user: any;
  loading: boolean;
  login: (userData: any, token: string) => void;
  logout: () => void;
  continueAsGuest: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      try {
        const guestMode = await AsyncStorage.getItem('isGuest');
        if (guestMode === 'true') {
          setIsGuest(true);
        }
        
        const token = await AsyncStorage.getItem('token');
        const savedUser = await AsyncStorage.getItem('user');
        
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        if (token) {
          try {
            const res = await axios.post(`${API_URL}/api/auth/userdata`, { token });
            if (res.data.status === 'Ok') {
              const freshUser = res.data.data;
              setUser(freshUser);
              await AsyncStorage.setItem('user', JSON.stringify(freshUser));
            }
          } catch (err) {
            console.log('Error refreshing user session details:', err);
          }
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (userData: any, token: string) => {
    try {
      setUser(userData);
      setIsGuest(false);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('isGuest', 'false');
      if (userData.activeOrganizationId) {
        await AsyncStorage.setItem('activeOrgId', userData.activeOrganizationId);
      }
    } catch (e) {
      console.error('Error during login state update', e);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setIsGuest(false);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.setItem('isGuest', 'false');
      await AsyncStorage.removeItem('activeOrgId');
      await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    } catch (e) {
      console.error('Error during logout', e);
    }
  };

  const continueAsGuest = async () => {
    try {
      setIsGuest(true);
      setUser(null);
      await AsyncStorage.setItem('isGuest', 'true');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      // For guest, let them choose organization inside selection screens
      await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    } catch (e) {
      console.error('Error entering guest mode', e);
    }
  };

  return (
    <AuthContext.Provider value={{ isGuest, user, loading, login, logout, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
