import { useEffect, useState, useRef } from 'react';
const {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform,
} = require('react-native');
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getStyles } from './style';
import { useTheme } from '../../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { syncPushTokenWithBackend } from '../../utils/notifications';
import { WebView } from 'react-native-webview';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId;

// ── Detect native Google Sign-In SDK ─────────────────────────────────────────
let GoogleSignin = null;
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
  const navigation = useNavigation();
  const { continueAsGuest, login } = useAuth();
  const { colors } = useTheme();
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

      if (signInResult?.data?.user) {
        const { email, name, photo, id: googleId } = signInResult.data.user;
        if (!email) {
          Alert.alert('Error', 'Could not retrieve your Google email.');
          return;
        }
        await sendGoogleProfileToBackend({
          googleId,
          email,
          name: name || email.split('@')[0],
          photo: photo || '',
        });
      }
    } catch (error) {
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
  const handleWebViewNavigationChange = (navState) => {
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

    const params = {};
    fragment.split('&').forEach(pair => {
      const [key, val] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(val || '');
    });

    const accessToken = params['access_token'];
    if (!accessToken) {
      Alert.alert('Error', 'No access token received from Google.');
      return;
    }

    // Fetch Google profile and send to backend
    fetchGoogleProfileFromToken(accessToken);
  };

  const fetchGoogleProfileFromToken = async (accessToken) => {
    setGoogleLoading(true);
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await res.json();

      if (!profile.email) {
        Alert.alert('Error', 'Could not retrieve your Google email.');
        return;
      }

      await sendGoogleProfileToBackend({
        googleId: profile.id,
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        photo: profile.picture || '',
      });
    } catch (err) {
      console.error('[Google] Profile fetch error:', err);
      Alert.alert('Error', 'Failed to fetch Google profile.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Shared: Send Google profile to backend ──────────────────────────────────
  const sendGoogleProfileToBackend = async ({ googleId, email, name, photo }) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/google-login`, {
        googleId,
        email,
        name,
        photoUrl: photo,
      });

      console.log('[Google] Backend:', res.data);

      if (res.data.status === 'ok') {
        if (res.data.isNewUser) {
          navigation.navigate('GoogleSetPassword', { name, email, image: photo, googleId });
        } else {
          const token = res.data.data;
          const dbName = res.data.userData?.name || name;
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
    } catch (err) {
      if (err.response?.data?.code === 'ORG_SUSPENDED' || err.response?.data?.code === 'ORG_NOT_FOUND') {
        return;
      }
      console.error('[Google] Backend error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.data || err.response?.data?.message || 'Failed to complete sign-in.';
      Alert.alert('Error', errorMsg);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const validateEmail = (v) => /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(v);
  const validatePhone = (v) => /^[6-9][0-9]{9}$/.test(v);
  const validateEmailOrPhone = (v) => validateEmail(v) || validatePhone(v);
  const validatePassword = (v) => v.length >= 6;

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
    axios
      .post(`${API_URL}/api/auth/login-user`, { emailOrPhone, password })
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
          } catch (e) {
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
      const settingsRes = await axios.get(`${API_URL}/api/app-settings`);
      const isGuestLive = settingsRes.data?.data?.isGuestLoginEnabled !== false;

      if (!isGuestLive) {
        Alert.alert('Coming Soon', 'Guest login will be available soon. For now, please sign in or create an account to continue.');
        return;
      }

      await continueAsGuest();
      navigation.replace('MainApp');
    } catch (err) {
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
          <Image style={styles.logo} source={require('../../assets/giver.jpg')} />
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
        visible={showGoogleWebView}
        animationType="fade"
        onRequestClose={() => setShowGoogleWebView(false)}>
        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? 30 : 0, backgroundColor: colors.background }}>
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