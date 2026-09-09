import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { getStyles } from './styles';
import { useTheme } from '@/context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { apiClient } from '@/services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { syncPushTokenWithBackend } from '@/utils/notifications';
import { WebView } from 'react-native-webview';
import { API_BASE_URL } from '@/config/api';
import { useSystemBars } from '@/hooks/useSystemBars';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** Routes these auth screens navigate to. Declared locally, matching the
 *  pattern the rest of the codebase already uses; a single shared param list
 *  is listed as debt in ARCHITECTURE.md. */
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  GoogleSetPassword: {
    name?: string;
    email?: string;
    image?: string;
    signupTicket?: string;
  };
  SuperAdmin: undefined;
  AdminScreen: undefined;
  MainApp: undefined;
  OrgSelection: undefined;
  'Forgot Password': { email?: string };
};

const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId;

// ── Detect native Google Sign-In SDK ─────────────────────────────────────────
// Absent in Expo Go; loaded via require() below, so untyped by nature.
let GoogleSignin: any = null;
let isNativeGoogleAvailable = false;
try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
    scopes: ['profile', 'email'],
  });
  isNativeGoogleAvailable = true;
  console.log('[Auth] Native Google Sign-In loaded ✓');
} catch (_) {
  console.log('[Auth] Expo Go detected — using WebView Google Sign-In fallback');
}

// Google OAuth URL — redirect to http://localhost (intercepted by WebView before it loads)
const buildGoogleAuthUrl = () =>
  'https://accounts.google.com/o/oauth2/v2/auth' +
  `?client_id=${encodeURIComponent(GOOGLE_WEB_CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent('http://localhost')}` +
  '&response_type=token' +
  `&scope=${encodeURIComponent('openid profile email')}` +
  '&prompt=select_account';

function LoginPage() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { continueAsGuest, login } = useAuth();
  const { colors } = useTheme();
  useSystemBars({ top: colors.background });
  const styles = getStyles(colors);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [emailOrPhoneError, setEmailOrPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // WebView Google Sign-In modal (Expo Go fallback)
  const [showGoogleWebView, setShowGoogleWebView] = useState(false);
  const webviewRef = useRef(null);

  // ── Google Sign-In Entry Point ──────────────────────────────────────────────
  const openGoogleSignIn = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert('Config Error', 'GOOGLE_WEB_CLIENT_ID is not set in .env');
      return;
    }

    if (isNativeGoogleAvailable) {
      // Dev build → native "Choose an account" bottom sheet
      await handleNativeGoogleSignIn();
    } else {
      // Expo Go → open WebView modal with Google OAuth
      setShowGoogleWebView(true);
    }
  };

  // ── Path A: Native SDK (dev build) ──────────────────────────────────────────
  const handleNativeGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();

      // The server verifies this token with Google and derives the email from
      // it. Nothing the client asserts about identity is trusted any more.
      const idToken = signInResult?.data?.idToken ?? signInResult?.idToken;
      if (!idToken) {
        Alert.alert('Error', 'Google did not return a sign-in token. Please try again.');
        return;
      }
      await sendGoogleCredentialToBackend({ idToken });
    } catch (error: any) {
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501') {
        console.log('[GoogleSignIn] Cancelled');
      } else if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Error', 'Google Play Services not available. Please update.');
      } else {
        console.error('[GoogleSignIn Native]', error?.code, error?.message);
        Alert.alert('Error', error?.message || 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Path B: WebView fallback (Expo Go) ──────────────────────────────────────
  // The WebView intercepts the http://localhost redirect BEFORE loading it,
  // extracts the access_token from the URL fragment, and closes the modal.
  const handleWebViewNavigationChange = (navState: { url?: string }) => {
    const { url } = navState;
    if (!url || !url.startsWith('http://localhost')) return;

    // Close the WebView immediately
    setShowGoogleWebView(false);

    // Extract access_token from URL fragment: http://localhost#access_token=TOKEN&...
    const fragment = url.split('#')[1];
    if (!fragment) {
      Alert.alert('Error', 'No authentication data received from Google.');
      return;
    }

    const params: Record<string, string> = {};
    fragment.split('&').forEach((pair: string) => {
      const [key, val] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(val || '');
    });

    const accessToken = params['access_token'];
    if (!accessToken) {
      Alert.alert('Error', 'No access token received from Google.');
      return;
    }

    // The server exchanges this for the profile itself, so the client never
    // gets to choose which account it is signing in as.
    sendGoogleCredentialToBackend({ accessToken });
  };

  // ── Shared: hand the Google credential to the backend for verification ─────
  const sendGoogleCredentialToBackend = async (
    { idToken, accessToken }: { idToken?: string; accessToken?: string },
  ) => {
    setGoogleLoading(true);
    try {
      const res = await apiClient.post(`/api/auth/google-login`, {
        idToken,
        accessToken,
      });

      if (res.data.status === 'ok') {
        const email = res.data.userData?.email;
        if (res.data.isNewUser) {
          // signupTicket is the server's proof that it verified this Google
          // account; GoogleSetPassword hands it straight back.
          navigation.navigate('GoogleSetPassword', {
            name: res.data.userData?.name,
            email,
            image: res.data.userData?.image,
            signupTicket: res.data.signupTicket,
          });
        } else {
          const token = res.data.data;
          const dbName = res.data.userData?.name;
          const activeOrgId = res.data.activeOrganizationId;
          const userType = res.data.userType;

          await login({
            email,
            name: dbName,
            globalRole: res.data.globalRole
          }, token);
          await AsyncStorage.setItem('userType', userType);
          if (activeOrgId) {
            await AsyncStorage.setItem('activeOrgId', activeOrgId);
          }

          const pushToken = await AsyncStorage.getItem('expoPushToken');
          if (pushToken) syncPushTokenWithBackend(pushToken);

          Alert.alert('Welcome!', `Signed in as ${dbName || email}`);

          if (res.data.globalRole === 'SuperAdmin') {
            navigation.replace('SuperAdmin');
          } else if (activeOrgId) {
            if (userType === 'Admin') {
              navigation.replace('AdminScreen');
            } else {
              navigation.replace('MainApp');
            }
          } else {
            navigation.replace('OrgSelection');
          }
        }
      } else {
        Alert.alert('Error', res.data.error || 'Google sign-in failed.');
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'ORG_SUSPENDED' || err.response?.data?.code === 'ORG_NOT_FOUND') {
        return;
      }
      console.error('[Google] Backend error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.data || err.response?.data?.message || 'Failed to complete sign-in.';
      Alert.alert('Error', errorMsg);
    } finally {
      setGoogleLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const validateEmail = (v: string) => /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(v);
  const validatePhone = (v: string) => /^[6-9][0-9]{9}$/.test(v);
  const validateEmailOrPhone = (v: string) => validateEmail(v) || validatePhone(v);
  const validatePassword = (v: string) => v.length >= 6;

  const handleSubmit = () => {
    setEmailOrPhoneError('');
    setPasswordError('');

    if (!emailOrPhone) { setEmailOrPhoneError('Email or phone is required'); return; }
    if (!validateEmailOrPhone(emailOrPhone)) {
      setEmailOrPhoneError('Please enter a valid email or 10-digit phone number starting with 6-9');
      return;
    }
    if (!password) { setPasswordError('Password is required'); return; }
    if (!validatePassword(password)) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    apiClient.post(`/api/auth/login-user`, { emailOrPhone, password })
      .then(async (res) => {
        if (res.data.status === 'ok') {
          Alert.alert('Success', 'Logged in successfully!');
          const token = res.data.data;
          const activeOrgId = res.data.activeOrganizationId;
          const userType = res.data.userType;

          await login({
            email: emailOrPhone,
            globalRole: res.data.globalRole
          }, token);

          if (activeOrgId) {
            await AsyncStorage.setItem('activeOrgId', activeOrgId);
          }

          try {
            const pt = await AsyncStorage.getItem('expoPushToken');
            if (pt) syncPushTokenWithBackend(pt);
          } catch (e: any) {
            console.log('Error syncing push token:', e);
          }

          if (res.data.globalRole === 'SuperAdmin') {
            navigation.replace('SuperAdmin');
          } else if (activeOrgId) {
            if (userType === 'Admin') {
              navigation.replace('AdminScreen');
            } else {
              navigation.replace('MainApp');
            }
          } else {
            navigation.replace('OrgSelection');
          }
        } else {
          Alert.alert('Error', res.data.error || 'Invalid credentials!!!');
        }
      })
      .catch(err => {
        if (err.response?.data?.code === 'ORG_SUSPENDED' || err.response?.data?.code === 'ORG_NOT_FOUND') {
          return;
        }
        if (err.response && (err.response.status === 401 || err.response.status === 400)) {
          console.log('Login failed (auth/validation error):', err.response.data?.data || err.response.statusText);
        } else {
          console.error('Login error:', err);
        }
        const errorMsg = err.response?.data?.data || err.response?.data?.message || 'An error occurred during login';
        Alert.alert('Error', errorMsg);
      })
      .finally(() => setLoading(false));
  };

  const handleGuestLogin = async () => {
    try {
      setGuestLoading(true);
      const settingsRes = await apiClient.get(`/api/app-settings`);
      const isGuestLive = settingsRes.data?.data?.isGuestLoginEnabled !== false;

      if (!isGuestLive) {
        Alert.alert('Coming Soon', 'Guest login will be available soon. For now, please sign in or create an account to continue.');
        return;
      }

      await continueAsGuest();
      navigation.replace('MainApp');
    } catch (err: any) {
      console.error('Guest login verification error:', err);
      Alert.alert('Error', 'Failed to verify guest access. Please check your internet connection.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="always">
      <View style={styles.mainContainer}>
        <View style={styles.logoContainer}>
          <Image style={styles.logo} source={require('@/assets/giver.jpg')} />
        </View>

        <View style={styles.loginContainer}>
          <Text style={styles.text_header}>Login !!!</Text>

          <View style={styles.action}>
            <FontAwesome name="user-o" color={colors.tint} style={styles.smallIcon} />
            <TextInput
              placeholder="Mobile or Email"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {emailOrPhoneError ? <Text style={styles.errorText}>{emailOrPhoneError}</Text> : null}

          <View style={styles.action}>
            <FontAwesome name="lock" color={colors.tint} style={styles.smallIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                style={{ marginRight: -10 }}
                color={passwordError ? 'red' : colors.tint}
                size={23}
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          <View style={{ justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: 8, marginRight: 10 }}>
            <Text
              style={{ color: colors.tint, fontWeight: '700' }}
              onPress={() => {
                const prefilledEmail = validateEmail(emailOrPhone) ? emailOrPhone : '';
                navigation.navigate('Forgot Password', { email: prefilledEmail });
              }}>
              Forgot Password
            </Text>
          </View>

          <View style={styles.button}>
            <TouchableOpacity style={styles.inBut} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color="#F6F1F1" />
                : <Text style={styles.textSign}>Log in</Text>
              }
            </TouchableOpacity>

            <View style={{ padding: 15 }}>
              <Text style={styles.text_footer}>----Or Continue as----</Text>
            </View>

            <View style={styles.bottomButton}>
              {/* Guest */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                  style={[styles.inBut2, guestLoading && { opacity: 0.6 }]}
                  onPress={handleGuestLogin}
                  disabled={guestLoading}>
                  {guestLoading
                    ? <ActivityIndicator size="small" color={colors.theme === 'dark' ? colors.tint : 'white'} />
                    : <FontAwesome name="user-circle-o" color={colors.theme === 'dark' ? colors.tint : 'white'} style={styles.smallIcon2} />
                  }
                </TouchableOpacity>
                <Text style={styles.bottomText}>Guest</Text>
              </View>

              {/* Sign Up */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity style={styles.inBut2} onPress={() => navigation.navigate('Register')}>
                  <FontAwesome name="user-plus" color={colors.theme === 'dark' ? colors.tint : 'white'} style={[styles.smallIcon2, { fontSize: 30 }]} />
                </TouchableOpacity>
                <Text style={styles.bottomText}>Sign Up</Text>
              </View>

              {/* Google */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                  style={[styles.inBut2, googleLoading && { opacity: 0.6 }]}
                  onPress={openGoogleSignIn}
                  disabled={googleLoading}>
                  {googleLoading
                    ? <ActivityIndicator size="small" color={colors.theme === 'dark' ? colors.tint : 'white'} />
                    : <FontAwesome name="google" color={colors.theme === 'dark' ? colors.tint : 'white'} style={[styles.smallIcon2, { fontSize: 30 }]} />
                  }
                </TouchableOpacity>
                <Text style={styles.bottomText}>Google</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── Google OAuth WebView Modal (Expo Go fallback) ─────────────────────── */}
      <Modal
        statusBarTranslucent
        navigationBarTranslucent
        visible={showGoogleWebView}
        animationType="fade"
        onRequestClose={() => setShowGoogleWebView(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Close button */}
          <TouchableOpacity
            onPress={() => setShowGoogleWebView(false)}
            style={{
              padding: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
            }}>
            <FontAwesome name="times" size={20} color={colors.text} />
            <Text style={{ marginLeft: 10, fontSize: 16, fontWeight: '600', color: colors.text }}>
              Cancel Sign-In
            </Text>
          </TouchableOpacity>

          <WebView
            ref={webviewRef}
            source={{ uri: buildGoogleAuthUrl() }}
            userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36"
            onNavigationStateChange={handleWebViewNavigationChange}
            onShouldStartLoadWithRequest={(req) => {
              // Intercept the localhost redirect before the WebView tries to load it
              if (req.url.startsWith('http://localhost')) {
                handleWebViewNavigationChange({ url: req.url });
                return false; // Block the navigation
              }
              return true; // Allow all other URLs (Google's login pages)
            }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading Google Sign-In...</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

export default LoginPage;