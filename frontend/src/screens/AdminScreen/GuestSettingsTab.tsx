import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const FEATURE_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  Bible: { label: 'Bible', icon: 'book-outline', description: 'Read Bible chapters & verses' },
  HistoricalMaps: { label: 'Historical Maps', icon: 'map-outline', description: 'View Biblical maps' },
};

export default function GuestSettingsTab() {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors);
  const [guestAccess, setGuestAccess] = useState<Record<string, boolean>>({});
  const [isGuestLoginEnabled, setIsGuestLoginEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/app-settings`);
      if (res.data.status === 'Success') {
        setGuestAccess(res.data.data.guestAccess || {});
        setIsGuestLoginEnabled(res.data.data.isGuestLoginEnabled !== false);
      }
    } catch (err) {
      console.error('Error fetching guest settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: string) => {
    setGuestAccess(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.put(
        `${API_URL}/api/app-settings`, 
        { guestAccess, isGuestLoginEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.status === 'Success') {
        Alert.alert('✅ Saved', 'Guest access settings updated.');
      } else {
        Alert.alert('Error', 'Failed to save settings.');
      }
    } catch (err) {
      console.error('Error saving guest settings:', err);
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 12, color: colors.tint }}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerBox}>
          <Ionicons name="eye-outline" size={24} color={colors.tint} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.headerTitle}>Guest Access Control</Text>
            <Text style={styles.headerSub}>
              Choose which features are visible to guest (non-logged-in) users. Disabled features will show a "Sign in required" prompt.
            </Text>
          </View>
        </View>

      {/* Global Guest Login Option */}
      <View style={[styles.row, { borderColor: colors.theme === 'dark' ? colors.border : '#bae6fd', backgroundColor: colors.theme === 'dark' ? colors.surface : '#f0f9ff', borderWidth: 1.5 }]}>
        <View style={styles.rowLeft}>
          <View style={[styles.iconCircle, { backgroundColor: isGuestLoginEnabled ? (colors.theme === 'dark' ? colors.border : '#bae6fd') : (colors.theme === 'dark' ? colors.background : '#e2e8f0') }]}>
            <Ionicons
              name="people-outline"
              size={20}
              color={isGuestLoginEnabled ? colors.tint : colors.textSecondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Guest Login Option</Text>
            <Text style={styles.rowDesc}>
              Show or hide the Guest option on the login screen. If disabled, clicking Guest will show "Coming Soon" message.
            </Text>
          </View>
        </View>
        <Switch
          value={isGuestLoginEnabled}
          onValueChange={setIsGuestLoginEnabled}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={isGuestLoginEnabled ? colors.tint : colors.textSecondary}
        />
      </View>

      <View style={{ height: 10 }} />

      {/* Toggle list */}
      {Object.entries(FEATURE_LABELS).map(([key, { label, icon, description }]) => (
        <View key={key} style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconCircle, { backgroundColor: guestAccess[key] ? (colors.theme === 'dark' ? colors.border : '#e0f2fe') : (colors.theme === 'dark' ? colors.background : '#f1f5f9') }]}>
              <Ionicons
                name={icon as any}
                size={20}
                color={guestAccess[key] ? colors.tint : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !guestAccess[key] && { color: colors.textSecondary }]}>
                {label}
              </Text>
              <Text style={styles.rowDesc}>{description}</Text>
            </View>
          </View>
          <Switch
            value={!!guestAccess[key]}
            onValueChange={() => handleToggle(key)}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={guestAccess[key] ? colors.tint : colors.textSecondary}
          />
        </View>
      ))}

      {/* Save button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <LinearGradient
          colors={[colors.tint, colors.secondary || colors.tint]}
          style={styles.saveBtnGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerBox: {
    flexDirection: 'row',
    backgroundColor: colors.theme === 'dark' ? colors.surface : '#e0f2fe',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.theme === 'dark' ? colors.border : '#bae6fd',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.tint,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: colors.theme === 'dark' ? colors.textSecondary : '#0284c7',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
