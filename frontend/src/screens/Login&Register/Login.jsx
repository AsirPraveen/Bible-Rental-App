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
  StatusBar,
} = require('react-native');
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import styles from './style';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { syncPushTokenWithBackend } from '../../utils/notifications';
import { WebView } from 'react-native-webview';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { firebaseAuth } from '../../config/firebasecofig';

const API_URL             = Constants.expoConfig?.extra?.apiUrl;
const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId;

// Google redirects here after auth — intercepted by the WebView (never actually loaded)
// ⚠️  Add  http://localhost  as an Authorized Redirect URI in Google Cloud Console
const GOOGLE_REDIRECT_URI = 'http://localhost';

// Build Google OAuth URL — prompt=select_account forces the full account picker
const buildGoogleAuthUrl = () =>
  'https://accounts.google.com/o/oauth2/auth' +
  `?client_id=${encodeURIComponent(GOOGLE_WEB_CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
  `&response_type=token` +
  `&scope=${encodeURIComponent('openid profile email')}` +
  `&prompt=select_account` +
  `&access_type=online`;

// Spoof a real Chrome user-agent so Google doesn't block the embedded browser
const CHROME_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36';

function LoginPage() {
  const navigation = useNavigation();
  const { continueAsGuest, login } = useAuth();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailOrPhoneError, setEmailOrPhoneError] = useState('');
  const [passwordError, setPasswordError]         = useState('');

  // ── Google WebView modal state ────────────────────────────────────────────
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [webViewKey, setWebViewKey]           = useState(0); // force-remount on retry
  const tokenProcessed = useRef(false);          // prevent double-processing

  const openGoogleSignIn = () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert('Config Error', 'GOOGLE_WEB_CLIENT_ID is not set in .env');
      return;
    }
    tokenProcessed.current = false;
    setWebViewKey(k => k + 1);   // fresh WebView each time (clears cookies/state)
    setShowGoogleModal(true);
  };

  const closeGoogleModal = () => {
    setShowGoogleModal(false);
    setGoogleLoading(false);
  };

  // Called when WebView is about to navigate — intercept the localhost redirect
  const handleShouldStartLoad = (request) => {
    if (request.url.startsWith(GOOGLE_REDIRECT_URI)) {
      processGoogleRedirect(request.url);
      return false; // block the WebView from loading localhost
    }
    return true;
  };

  // Backup: also catch via onNavigationStateChange (Android safety net)
  const handleNavStateChange = (navState) => {
    if (navState.url.startsWith(GOOGLE_REDIRECT_URI)) {
      processGoogleRedirect(navState.url);
    }
  };

  // Extract access_token from the redirect URL fragment and kick off login
  const processGoogleRedirect = (url) => {
    if (tokenProcessed.current) return;   // already handled
    tokenProcessed.current = true;

    setShowGoogleModal(false);
    setGoogleLoading(true);

    // Token is in the hash fragment:  http://localhost#access_token=TOKEN&...
    const hash = url.split('#')[1] || '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const error       = params.get('error');

    if (error) {
      Alert.alert('Google Sign-In Error', decodeURIComponent(error));
      setGoogleLoading(false);
      return;
    }
    if (!accessToken) {
      Alert.alert('Error', 'No access token received from Google. Please try again.');
      setGoogleLoading(false);
      return;
    }

    fetchGoogleProfile(accessToken);
  };

  // Use Firebase to verify the Google access token & get user info
  const fetchGoogleProfile = async (accessToken) => {
    try {
      // Step 1: Create a Firebase credential from the Google access token
      // GoogleAuthProvider.credential(idToken, accessToken)
      // We have an access_token (not id_token) from the implicit flow,
      // so we pass null for idToken and the accessToken as second arg.
      const googleCredential = GoogleAuthProvider.credential(null, accessToken);

      // Step 2: Sign in to Firebase with that credential
      const firebaseResult = await signInWithCredential(firebaseAuth, googleCredential);
      const firebaseUser   = firebaseResult.user;
      console.log('[Firebase] Signed in:', firebaseUser.email);

      if (!firebaseUser.email) {
        Alert.alert('Error', 'Could not retrieve your Google email. Please try again.');
        setGoogleLoading(false);
        return;
      }

      // Step 3: Send verified info to our backend — finds or creates the user
      const res = await axios.post(`${API_URL}/api/auth/google-login`, {
        googleId: firebaseUser.uid,          // Firebase UID (unique & stable)
        email:    firebaseUser.email,
        name:     firebaseUser.displayName || firebaseUser.email.split('@')[0],
        photoUrl: firebaseUser.photoURL || '',
      });

      console.log('[Google] Backend response:', res.data);

      if (res.data.status === 'ok') {
        if (res.data.isNewUser) {
          // Brand-new Google user → let them set an app password
          navigation.navigate('GoogleSetPassword', {
            name:  firebaseUser.displayName,
            email: firebaseUser.email,
            image: firebaseUser.photoURL,
          });
        } else {
          // Existing user → straight into the app
          const token = res.data.data;
          login({ email: firebaseUser.email, name: firebaseUser.displayName }, token);
          await AsyncStorage.setItem('userType', res.data.userType);

          const pushToken = await AsyncStorage.getItem('expoPushToken');
          if (pushToken) syncPushTokenWithBackend(pushToken);

          Alert.alert('✅ Welcome!', `Signed in as ${firebaseUser.displayName}`);
          if (res.data.userType === 'Admin') {
            navigation.replace('AdminScreen');
          } else {
            navigation.replace('Home');
          }
        }
      } else {
        Alert.alert('Error', res.data.error || 'Google sign-in failed. Please try again.');
      }
    } catch (err) {
      console.error('[Google/Firebase] Error:', err?.code, err?.message);
      // Friendly messages for common Firebase errors
      if (err?.code === 'auth/invalid-credential') {
        Alert.alert('Sign-In Error', 'Google credential is invalid or expired. Please try again.');
      } else if (err?.code === 'auth/network-request-failed') {
        Alert.alert('Network Error', 'Check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'An error occurred during Google sign-in. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const validateEmail        = (v) => /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(v);
  const validatePhone        = (v) => /^[6-9][0-9]{9}$/.test(v);
  const validateEmailOrPhone = (v) => validateEmail(v) || validatePhone(v);
  const validatePassword     = (v) => v.length >= 6;

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
      .then(res => {
        if (res.data.status === 'ok') {
          Alert.alert('Success', 'Logged in successfully!');
          const token = res.data.data;
          login({ email: emailOrPhone }, token);
          AsyncStorage.setItem('userType',   res.data.userType);
          AsyncStorage.getItem('expoPushToken').then(pt => {
            if (pt) syncPushTokenWithBackend(pt);
          });
          if (res.data.userType === 'Admin') {
            navigation.replace('AdminScreen');
          } else {
            navigation.replace('Home');
          }
        } else {
          Alert.alert('Error', res.data.error || 'Invalid credentials!!!');
        }
      })
      .catch(err => {
        console.error('Login error:', err);
        Alert.alert('Error', 'An error occurred during login');
      })
      .finally(() => setLoading(false));
  };

  const handleGuestLogin = async () => {
    try {
      await continueAsGuest();
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Error', 'Failed to continue as guest');
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('isLoggedIn').then(v =>
      console.log('LoginPage - isLoggedIn:', v)
    );
  }, []);

  return (
    <>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="always">
        <View style={styles.mainContainer}>
          <View style={styles.logoContainer}>
            <Image style={styles.logo} source={require('../../assets/giver.jpg')} />
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.text_header}>Login !!!</Text>

            <View style={styles.action}>
              <FontAwesome name="user-o" color="#146C94" style={styles.smallIcon} />
              <TextInput
                placeholder="Mobile or Email"
                style={styles.textInput}
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {emailOrPhoneError ? <Text style={styles.errorText}>{emailOrPhoneError}</Text> : null}

            <View style={styles.action}>
              <FontAwesome name="lock" color="#146C94" style={styles.smallIcon} />
              <TextInput
                placeholder="Password"
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  style={{ marginRight: -10 }}
                  color={passwordError ? 'red' : '#146C94'}
                  size={23}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <View style={{ justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: 8, marginRight: 10 }}>
              <Text
                style={{ color: '#146C94', fontWeight: '700' }}
                onPress={() => navigation.navigate('Forgot Password')}>
                Forgot Password
              </Text>
            </View>
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
                <TouchableOpacity style={styles.inBut2} onPress={handleGuestLogin}>
                  <FontAwesome name="user-circle-o" color="white" style={styles.smallIcon2} />
                </TouchableOpacity>
                <Text style={styles.bottomText}>Guest</Text>
              </View>

              {/* Sign Up */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity style={styles.inBut2} onPress={() => navigation.navigate('Register')}>
                  <FontAwesome name="user-plus" color="white" style={[styles.smallIcon2, { fontSize: 30 }]} />
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
                    ? <ActivityIndicator size="small" color="white" />
                    : <FontAwesome name="google" color="white" style={[styles.smallIcon2, { fontSize: 30 }]} />
                  }
                </TouchableOpacity>
                <Text style={styles.bottomText}>Google</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Google Sign-In WebView Modal ────────────────────────────────── */}
      <Modal
        visible={showGoogleModal}
        animationType="slide"
        onRequestClose={closeGoogleModal}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#146C94' }}>
          <StatusBar backgroundColor="#146C94" barStyle="light-content" />

          {/* Header bar */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#146C94',
          }}>
            <FontAwesome name="google" color="white" size={20} />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', marginLeft: 10, flex: 1 }}>
              Sign in with Google
            </Text>
            <TouchableOpacity onPress={closeGoogleModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" color="white" size={24} />
            </TouchableOpacity>
          </View>

          {/* Google OAuth WebView */}
          <WebView
            key={webViewKey}
            source={{ uri: buildGoogleAuthUrl() }}
            userAgent={CHROME_UA}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onNavigationStateChange={handleNavStateChange}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView Error:', nativeEvent);
              
              // If the error is about localhost, it's just the redirect completing - process it!
              if (nativeEvent.url && nativeEvent.url.startsWith(GOOGLE_REDIRECT_URI)) {
                processGoogleRedirect(nativeEvent.url);
                return;
              }
              
              Alert.alert(
                'Connection Error', 
                `Failed to load Google Sign-In. Please check your internet connection.\n\nDetails: ${nativeEvent.description}`
              );
              closeGoogleModal();
            }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#146C94" />
                <Text style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>
                  Loading Google Sign-In...
                </Text>
              </View>
            )}
            style={{ flex: 1 }}
          />
        </SafeAreaView>
      </Modal>
      {/* ──────────────────────────────────────────────────────────────────── */}
    </>
  );
}

export default LoginPage;