import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

// Configure global axios interceptor to automatically attach JWT token to all outgoing requests
axios.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Failed to attach token to request headers', e);
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
        
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
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
