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

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const FEATURE_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  Bible:           { label: 'Bible',            icon: 'book-outline',          description: 'Read Bible chapters & verses' },
  Songs:           { label: 'Songs',            icon: 'musical-notes-outline', description: 'Browse worship songs' },
  HistoricalMaps:  { label: 'Historical Maps',  icon: 'map-outline',           description: 'View Biblical maps' },
  Notifications:   { label: 'Notifications',    icon: 'notifications-outline', description: 'View posts & announcements' },
  ReadingTracker:  { label: 'Reading Tracker',   icon: 'calendar-outline',      description: 'Track daily Bible reading' },
  ReadingPlanner:  { label: 'Reading Planner',   icon: 'today-outline',         description: 'Plan reading goals' },
  DiscussionForum: { label: 'Discussion Forum', icon: 'chatbubbles-outline',   description: 'Community Q&A' },
  PrayerRequests:  { label: 'Prayer Requests',  icon: 'hand-left-outline',     description: 'Submit & view prayer requests' },
  FastingTracker:  { label: 'Fasting Tracker',  icon: 'timer-outline',         description: 'Track fasting periods' },
  BookRental:      { label: 'Book Rental',      icon: 'library-outline',       description: 'Rent & return physical books' },
  MessageNotes:    { label: 'Message Notes',    icon: 'document-text-outline', description: 'Create & share sermon notes' },
  BookPdf:         { label: 'Book PDFs',        icon: 'reader-outline',        description: 'Read digital books' },
};

export default function GuestSettingsTab() {
  const [guestAccess, setGuestAccess] = useState<Record<string, boolean>>({});
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
      const res = await axios.put(`${API_URL}/api/app-settings`, { guestAccess });
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#146C94" />
        <Text style={{ marginTop: 12, color: '#146C94' }}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.headerBox}>
        <Ionicons name="eye-outline" size={24} color="#0369a1" />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.headerTitle}>Guest Access Control</Text>
          <Text style={styles.headerSub}>
            Choose which features are visible to guest (non-logged-in) users. Disabled features will show a "Sign in required" prompt.
          </Text>
        </View>
      </View>

      {/* Toggle list */}
      {Object.entries(FEATURE_LABELS).map(([key, { label, icon, description }]) => (
        <View key={key} style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconCircle, { backgroundColor: guestAccess[key] ? '#e0f2fe' : '#f1f5f9' }]}>
              <Ionicons
                name={icon as any}
                size={20}
                color={guestAccess[key] ? '#0369a1' : '#94a3b8'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !guestAccess[key] && { color: '#94a3b8' }]}>
                {label}
              </Text>
              <Text style={styles.rowDesc}>{description}</Text>
            </View>
          </View>
          <Switch
            value={!!guestAccess[key]}
            onValueChange={() => handleToggle(key)}
            trackColor={{ false: '#e2e8f0', true: '#7dd3fc' }}
            thumbColor={guestAccess[key] ? '#0369a1' : '#cbd5e1'}
          />
        </View>
      ))}

      {/* Save button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <LinearGradient
          colors={['#146C94', '#19A7CE']}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  headerBox: {
    flexDirection: 'row',
    backgroundColor: '#e0f2fe',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0369a1',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: '#0284c7',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#0f172a',
  },
  rowDesc: {
    fontSize: 12,
    color: '#94a3b8',
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
