import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar, Pressable } from 'react-native';
import { Bell, BookOpen, MessageSquare, HandHeart, ShieldCheck, ArrowLeft, Clock } from 'lucide-react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

interface NotificationSettingsState {
  readingReminders: boolean;
  readingReminderTime: string;
  forumActivity: boolean;
  prayerActivity: boolean;
  rentalUpdates: boolean;
}

const NotificationSettings = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [loading, setLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState<{ [key: string]: boolean }>({});
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsState>({
    readingReminders: true,
    readingReminderTime: '18:00',
    forumActivity: true,
    prayerActivity: true,
    rentalUpdates: true,
  });
  const [showBibleProgress, setShowBibleProgress] = useState(true);

  useEffect(() => {
    fetchSettings();
    loadBibleProgressSetting();
  }, []);

  const loadBibleProgressSetting = async () => {
    try {
      const val = await AsyncStorage.getItem('@bible_show_progress_bar');
      if (val !== null) {
        setShowBibleProgress(val === 'true');
      }
    } catch (e) {
      console.error('Error loading bible progress setting', e);
    }
  };

  const toggleBibleProgress = async () => {
    try {
      const newValue = !showBibleProgress;
      setShowBibleProgress(newValue);
      await AsyncStorage.setItem('@bible_show_progress_bar', String(newValue));
      Alert.alert('Success', 'Reader progress border preference updated successfully!');
    } catch (e) {
      console.error('Error saving bible progress setting', e);
      Alert.alert('Error', 'Failed to update reader progress border preference.');
    }
  };

  const fetchSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/users/notification-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'Ok') {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof NotificationSettingsState) => {
    if (key === 'readingReminderTime') return;

    const newSettings = { ...settings, [key]: !settings[key] as any };
    const oldSettings = { ...settings };
    setSettings(newSettings);

    try {
      setSavingKeys(prev => ({ ...prev, [key]: true }));
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${BASE_URL}/api/users/notification-settings`,
        { settings: newSettings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Notification preference updated successfully!');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
      setSettings(oldSettings);
    } finally {
      setSavingKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  const showTimePicker = () => setTimePickerVisibility(true);
  const hideTimePicker = () => setTimePickerVisibility(false);

  const handleTimeConfirm = async (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    const newSettings = { ...settings, readingReminderTime: timeString };
    const oldSettings = { ...settings };
    setSettings(newSettings);
    hideTimePicker();

    try {
      setSavingKeys(prev => ({ ...prev, readingReminderTime: true }));
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${BASE_URL}/api/users/notification-settings`,
        { settings: newSettings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Daily reminder time updated successfully!');
    } catch (error) {
      console.error('Error updating reminder time:', error);
      Alert.alert('Error', 'Failed to update reminder time.');
      setSettings(oldSettings);
    } finally {
      setSavingKeys(prev => ({ ...prev, readingReminderTime: false }));
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  if (loading) {
    return <LoadingScreen message="Loading settings..." />;
  }

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {/* ── Gradient Header ────────────────────────────────── */}
        <View style={styles.headerContainer}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#F6F1F1" />
          </Pressable>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.subtitleText}>App Preferences</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* ── Content container ───────────────────────────────── */}
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Section label */}
            <Text style={styles.sectionTitle}>NOTIFICATION SETTINGS</Text>

            {/* Bible Reading */}
            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.12)' : '#E3F2FD' }]}>
                  <BookOpen color={colors.tint} size={20} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingLabel}>Bible Reading</Text>
                  <TouchableOpacity
                    onPress={showTimePicker}
                    style={styles.timePickerBtn}
                    disabled={savingKeys.readingReminderTime}
                  >
                    {savingKeys.readingReminderTime ? (
                      <View style={styles.inlineTimeLoaderContainer}>
                        <ActivityIndicator size="small" color={colors.tint} style={styles.inlineTimeLoader} />
                        <Text style={styles.settingDescription}>Updating reminder time...</Text>
                      </View>
                    ) : (
                      <Text style={styles.settingDescription}>
                        Reminders at <Text style={styles.timeHighlight}>{formatTimeDisplay(settings.readingReminderTime)}</Text> to finish daily portions. [Reading Planner]
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              {savingKeys.readingReminders ? (
                <View style={styles.switchPlaceholder}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : (
                <Switch
                  value={settings.readingReminders}
                  onValueChange={() => toggleSetting('readingReminders')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={settings.readingReminders ? colors.tint : colors.textSecondary}
                />
              )}
            </View>

            {/* Forum Activity */}
            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: colors.theme === 'dark' ? 'rgba(168, 85, 247, 0.12)' : '#F3E5F5' }]}>
                  <MessageSquare color={colors.theme === 'dark' ? '#C084FC' : '#9C27B0'} size={20} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingLabel}>Forum Activity</Text>
                  <Text style={styles.settingDescription}>Alerts when someone answers your questions.</Text>
                </View>
              </View>
              {savingKeys.forumActivity ? (
                <View style={styles.switchPlaceholder}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : (
                <Switch
                  value={settings.forumActivity}
                  onValueChange={() => toggleSetting('forumActivity')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={settings.forumActivity ? colors.tint : colors.textSecondary}
                />
              )}
            </View>

            {/* Prayer Alerts */}
            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: colors.theme === 'dark' ? 'rgba(244, 63, 94, 0.12)' : '#FCE4EC' }]}>
                  <HandHeart color={colors.theme === 'dark' ? '#FB7185' : '#E91E63'} size={20} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingLabel}>Prayer Alerts</Text>
                  <Text style={styles.settingDescription}>Notifications when others pray for your requests.</Text>
                </View>
              </View>
              {savingKeys.prayerActivity ? (
                <View style={styles.switchPlaceholder}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : (
                <Switch
                  value={settings.prayerActivity}
                  onValueChange={() => toggleSetting('prayerActivity')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={settings.prayerActivity ? colors.tint : colors.textSecondary}
                />
              )}
            </View>

            {/* Rental Updates */}
            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: colors.theme === 'dark' ? 'rgba(52, 211, 153, 0.12)' : '#E8F5E9' }]}>
                  <ShieldCheck color={colors.theme === 'dark' ? '#34D399' : '#4CAF50'} size={20} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingLabel}>Rental Updates</Text>
                  <Text style={styles.settingDescription}>Status updates on your book rent requests.</Text>
                </View>
              </View>
              {savingKeys.rentalUpdates ? (
                <View style={styles.switchPlaceholder}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : (
                <Switch
                  value={settings.rentalUpdates}
                  onValueChange={() => toggleSetting('rentalUpdates')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={settings.rentalUpdates ? colors.tint : colors.textSecondary}
                />
              )}
            </View>

            {/* Section label */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>BIBLE PREFERENCES</Text>

            {/* Bible Progress Bar Toggle */}
            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.12)' : '#E3F2FD' }]}>
                  <BookOpen color={colors.tint} size={20} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingLabel}>Reader Progress Border</Text>
                  <Text style={styles.settingDescription}>Show glowing scroll progress around the Bible reader card.</Text>
                </View>
              </View>
              <Switch
                value={showBibleProgress}
                onValueChange={toggleBibleProgress}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={showBibleProgress ? colors.tint : colors.textSecondary}
              />
            </View>

            {/* Info box */}
            <View style={styles.infoBox}>
              <Bell color={colors.tint} size={18} />
              <Text style={styles.infoText}>
                Stay connected with the community and maintain your spiritual routines.
              </Text>
            </View>
          </ScrollView>
        </View>
      </LinearGradient>

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={hideTimePicker}
        date={(() => {
          const [h, m] = (settings.readingReminderTime || '18:00').split(':').map(Number);
          const date = new Date();
          date.setHours(h, m, 0, 0);
          return date;
        })()}
      />
    </SafeAreaView>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },

  // ── Header ─────────────────────────────────────────────────────
  headerContainer: {
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: '#F6F1F1',
    textAlign: 'center',
    opacity: 0.85,
  },

  // ── Main container ─────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // ── Section label ──────────────────────────────────────────────
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 14,
    marginLeft: 4,
    letterSpacing: 1.2,
  },

  // ── Setting cards ──────────────────────────────────────────────
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  timePickerBtn: {
    marginTop: 2,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  timeHighlight: {
    color: colors.tint,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },

  // ── Info box ───────────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(20, 108, 148, 0.06)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 108, 148, 0.1)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
    fontStyle: 'italic',
    lineHeight: 19,
  },

  // ── Saving loaders ─────────────────────────────────────────────
  switchPlaceholder: {
    width: 50,
    height: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineTimeLoaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  inlineTimeLoader: {
    marginRight: 6,
  }
});

export default NotificationSettings;
