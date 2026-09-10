import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { apiClient } from '@/services';
import { Alert, NativeModules } from 'react-native';
import { navigationRef } from '../navigation/navigationRef';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

let GoogleSignin: any = null;
try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
} catch (e) {
  console.log('[Auth] Native Google Sign-In not available in this environment');
}

// Auth and org headers are attached by apiClient's own request interceptor
// (src/services/apiClient.ts). A duplicate interceptor on the GLOBAL axios
// instance used to live here; it is gone because every call to our backend now
// goes through apiClient, and a second mechanism only invites the two to drift.
// Requests to third parties must keep using bare axios precisely so that they
// do NOT receive our credentials.

type AuthState = {
  isGuest: boolean;
  user: any;
  loading: boolean;
  login: (userData: any, token: string) => void;
  logout: () => void;
  exitGuest: () => Promise<void>;
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
            const res = await apiClient.post(`/api/auth/userdata`, { token });
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

      // Fetch populated user data immediately to ensure user._id is available
      try {
        const res = await apiClient.post(`/api/auth/userdata`, { token });
        if (res.data.status === 'Ok') {
          const freshUser = res.data.data;
          setUser(freshUser);
          await AsyncStorage.setItem('user', JSON.stringify(freshUser));
        }
      } catch (err) {
        console.log('Error populating user details during login:', err);
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
      // OrganizationContext also sets this as an axios default. Clearing storage
      // alone left the previous org id riding along on subsequent requests.
      delete apiClient.defaults.headers.common['x-organization-id'];
      await Notifications.cancelAllScheduledNotificationsAsync().catch(() => { });

      // Native Google Sign-Out.
      //
      // signOut() is called unconditionally. It is a no-op when nobody is
      // signed in, and the guard that used to wrap it -- GoogleSignin.isSignedIn()
      // -- was removed from the library in v13 (this project is on v16, where the
      // equivalent is hasPreviousSignIn). Calling it threw, the catch below
      // swallowed it as "bypassed", and sign-out silently never happened -- so
      // the next Google login skipped the account chooser and reused the
      // previous account.
      try {
        if (GoogleSignin) {
          await GoogleSignin.signOut();
          console.log('[Auth] Native Google Sign-Out completed successfully.');
        } else {
          console.log('[Auth] Native Google Sign-In not loaded (bypassed).');
        }
      } catch (googleError) {
        console.log('[Auth] Google Sign-Out bypassed:', googleError);
      }
    } catch (e) {
      console.error('Error during logout', e);
    }
  };

  /**
   * Leave guest mode deliberately, e.g. tapping "Sign In / Create Account".
   *
   * The flag has to be cleared here, not on a successful login: it is persisted,
   * so a guest who taps Sign In and then closes the app would still be flagged
   * as a guest, and Onboarding's Get Started would route them straight back
   * into guest mode instead of the login screen.
   */
  const exitGuest = async () => {
    try {
      setIsGuest(false);
      setUser(null);
      await AsyncStorage.setItem('isGuest', 'false');
      await AsyncStorage.removeItem('activeOrgId');
      delete apiClient.defaults.headers.common['x-organization-id'];
    } catch (e) {
      console.error('Error leaving guest mode', e);
    }
  };

  const continueAsGuest = async () => {
    try {
      setIsGuest(true);
      setUser(null);
      await AsyncStorage.setItem('isGuest', 'true');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      // Clear the org too. A guest reaches only global content, and leaving a
      // stale activeOrgId behind made OrganizationContext call a members-only
      // endpoint, whose 401 the interceptor turned into a false "Session
      // Expired" logout.
      await AsyncStorage.removeItem('activeOrgId');
      delete apiClient.defaults.headers.common['x-organization-id'];
      await Notifications.cancelAllScheduledNotificationsAsync().catch(() => { });
    } catch (e) {
      console.error('Error entering guest mode', e);
    }
  };

  useEffect(() => {
    const interceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        // apiClient normalises to ApiError before this runs; fall back to the
        // raw AxiosError shape in case an un-normalised error ever reaches here.
        const status = error?.status ?? error.response?.status;
        const code = error?.code ?? error.response?.data?.code;

        // A guest has no session to expire. Without this check any 401 from a
        // members-only route would eject them from guest mode with a
        // misleading message — the root cause of the F-1 report.
        const hadToken = await AsyncStorage.getItem('token');

        if (status === 401 && !hadToken) {
          return Promise.reject(error);
        }

        if (status === 401) {
          await logout();
          Alert.alert(
            'Session Expired',
            'Your session has expired or is invalid. Please log in again.',
            [{ text: 'OK' }]
          );
          if (navigationRef.isReady()) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        } else if (status === 403 && code === 'ORG_SUSPENDED') {
          await logout();
          Alert.alert(
            'Organization freezed',
            'Your organization has been freezed by the platform administrator. You have been logged out.',
            [{ text: 'OK' }]
          );
          if (navigationRef.isReady()) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        } else if (status === 404 && code === 'ORG_NOT_FOUND') {
          await logout();
          Alert.alert(
            'Organization Inactive',
            'Your organization has been freezed or is inactive. You have been logged out.',
            [{ text: 'OK' }]
          );
          if (navigationRef.isReady()) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isGuest, user, loading, login, logout, continueAsGuest, exitGuest }}>
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
