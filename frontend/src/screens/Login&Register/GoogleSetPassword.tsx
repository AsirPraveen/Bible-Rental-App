import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPushTokenWithBackend } from '../../utils/notifications';
import { useAuth } from '../../context/AuthContext';
import { getStyles } from './style'; // ← Use the same shared styles as Login
import { useTheme } from '../../context/ThemeContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const GoogleSetPassword = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // Params passed from Login when isNewUser === true
  const { name, email, image, googleId } = route.params || {};

  const [displayName, setDisplayName] = useState(name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (v: string) => v.length >= 6;

  const handleSetPassword = async () => {
    setPasswordError('');
    setConfirmError('');

    if (!password) { setPasswordError('Password is required'); return; }
    if (!validatePassword(password)) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (!confirmPassword) { setConfirmError('Please confirm your password'); return; }
    if (password !== confirmPassword) { setConfirmError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/google-set-password`, {
        email,
        newPassword: password,
        name: displayName.trim() || email?.split('@')[0],
        googleId: googleId || '',
        image: image || '',
      });

      if (res.data.status === 'ok') {
        const token = res.data.data;

        // Update AuthContext state (sets user, token, clears isGuest)
        await login({ email, name: displayName.trim() || name, image }, token);
        await AsyncStorage.setItem('userType', res.data.userType);

        // Sync push token
        const pushToken = await AsyncStorage.getItem('expoPushToken');
        if (pushToken) await syncPushTokenWithBackend(pushToken);

        Alert.alert(
          '🎉 Welcome!',
          `Account created! Welcome, ${displayName.trim() || 'friend'}!`,
          [{ text: 'Let\'s Go!', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'OrgSelection' }] }) }]
        );
      } else {
        Alert.alert('Error', res.data.error || 'Failed to create account');
      }
    } catch (error: any) {
      console.error('Set password error:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="always">
      <View style={styles.mainContainer}>
        {/* Same logo as Login */}
        <View style={styles.logoContainer}>
          <Image style={styles.logo} source={require('../../assets/giver.jpg')} />
        </View>

        {/* Form area — uses loginContainer like Login screen */}
        <View style={styles.loginContainer}>
          <Text style={styles.text_header}>Set Password</Text>

          {/* Google profile info */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.primary, marginBottom: 8 }}
              />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <FontAwesome name="google" size={26} color="#fff" />
              </View>
            )}
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
              Signing in as{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{email}</Text>
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
              Set a password so you can also log in with your email.
            </Text>
          </View>

          {/* Name (editable — prefilled from Google) */}
          <View style={styles.action}>
            <FontAwesome name="user-o" color={colors.primary} style={styles.smallIcon} />
            <TextInput
              placeholder="Your Name"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          {/* Password */}
          <View style={styles.action}>
            <FontAwesome name="lock" color={colors.primary} style={styles.smallIcon} />
            <TextInput
              placeholder="Set a Password (min 6 chars)"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={password}
              onChangeText={v => { setPassword(v); setPasswordError(''); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                style={{ marginRight: -10 }}
                color={passwordError ? 'red' : colors.primary}
                size={23}
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          {/* Confirm Password */}
          <View style={styles.action}>
            <FontAwesome name="lock" color={colors.primary} style={styles.smallIcon} />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={v => { setConfirmPassword(v); setConfirmError(''); }}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Feather
                name={showConfirm ? 'eye' : 'eye-off'}
                style={{ marginRight: -10 }}
                color={confirmError ? 'red' : colors.primary}
                size={23}
              />
            </TouchableOpacity>
          </View>
          {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
        </View>

        {/* Submit button — same layout as Login */}
        <View style={styles.button}>
          <TouchableOpacity style={styles.inBut} onPress={handleSetPassword} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#F6F1F1" />
            ) : (
              <Text style={styles.textSign}>Create My Account</Text>
            )}
          </TouchableOpacity>

          {/* Back link */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
              ← Use a different account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default GoogleSetPassword;
