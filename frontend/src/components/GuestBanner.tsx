// ════════════════════════════════════════════════
//  GuestBanner.tsx — Read-Only Banner for Guest Users
//  Show this at the top of any screen when isGuest = true
// ════════════════════════════════════════════════
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

interface GuestBannerProps {
  /** Custom message override */
  message?: string;
}

export default function GuestBanner({ message }: GuestBannerProps) {
  const { isGuest } = useAuth();
  const navigation = useNavigation<any>();

  if (!isGuest) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Ionicons name="eye-outline" size={16} color="#0369a1" />
        </View>
        <View>
          <Text style={styles.title}>Read-Only Mode</Text>
          <Text style={styles.sub}>
            {message ?? 'Login to create, edit & interact'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={() => navigation.navigate('Login')}
        activeOpacity={0.8}
      >
        <Text style={styles.loginBtnText}>Login</Text>
        <Ionicons name="arrow-forward" size={13} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e0f2fe',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
    elevation: 2,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369a1',
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '500',
    marginTop: 1,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0369a1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 2,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
