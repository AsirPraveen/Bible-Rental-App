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
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPushTokenWithBackend } from '../../utils/notifications';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const GoogleSetPassword = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Params passed from Login when isNewUser === true
  const { name, email, image } = route.params || {};

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
      });

      if (res.data.status === 'ok') {
        const token = res.data.data;
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('isLoggedIn', JSON.stringify(true));
        await AsyncStorage.setItem('userType', res.data.userType);

        // Sync push token
        const pushToken = await AsyncStorage.getItem('expoPushToken');
        if (pushToken) await syncPushTokenWithBackend(pushToken);

        Alert.alert(
          '🎉 Welcome!',
          `Account created! Welcome, ${name || 'friend'}!`,
          [{ text: 'Let\'s Go!', onPress: () => navigation.replace('Home') }]
        );
      } else {
        Alert.alert('Error', res.data.error || 'Failed to set password');
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
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image style={styles.logo} source={require('../../assets/giver.jpg')} />
        </View>

        <View style={styles.card}>
          {/* Google avatar or icon */}
          <View style={styles.avatarRow}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <FontAwesome name="google" size={30} color="#fff" />
              </View>
            )}
          </View>

          <Text style={styles.title}>Almost There!</Text>
          <Text style={styles.subtitle}>
            You're signing in with Google as{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
          <Text style={styles.infoText}>
            Please set an app password so you can also log in with your email later.
          </Text>

          {/* Name (read-only display) */}
          <View style={styles.infoRow}>
            <FontAwesome name="user-o" color="#146C94" size={18} style={styles.rowIcon} />
            <Text style={styles.infoValue}>{name || 'Google User'}</Text>
          </View>

          {/* Password */}
          <View style={[styles.action, passwordError ? styles.actionError : null]}>
            <FontAwesome name="lock" color="#146C94" size={20} style={styles.smallIcon} />
            <TextInput
              placeholder="Set a Password (min 6 chars)"
              placeholderTextColor="#94a3b8"
              style={styles.textInput}
              value={password}
              onChangeText={v => { setPassword(v); setPasswordError(''); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#146C94" />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>⚠ {passwordError}</Text> : null}

          {/* Confirm Password */}
          <View style={[styles.action, confirmError ? styles.actionError : null]}>
            <FontAwesome name="lock" color="#146C94" size={20} style={styles.smallIcon} />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#94a3b8"
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={v => { setConfirmPassword(v); setConfirmError(''); }}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Feather name={showConfirm ? 'eye' : 'eye-off'} size={20} color="#146C94" />
            </TouchableOpacity>
          </View>
          {confirmError ? <Text style={styles.errorText}>⚠ {confirmError}</Text> : null}

          {/* Submit Button */}
          <TouchableOpacity style={styles.button} onPress={handleSetPassword} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create My Account</Text>
            )}
          </TouchableOpacity>

          {/* Back link */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
            <Text style={styles.backText}>← Use a different account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  logo: {
    height: 160,
    width: 160,
    borderRadius: 20,
  },
  card: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#146C94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#146C94',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#146C94',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#146C94',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  emailHighlight: {
    color: '#146C94',
    fontWeight: '700',
  },
  infoText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  rowIcon: {
    marginRight: 10,
  },
  infoValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#146C94',
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 6,
  },
  actionError: {
    borderColor: '#ef4444',
  },
  smallIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginLeft: 8,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#146C94',
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  backRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  backText: {
    color: '#146C94',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default GoogleSetPassword;
