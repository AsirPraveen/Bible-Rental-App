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

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

interface NotificationSettingsState {
  readingReminders: boolean;
  readingReminderTime: string;
  forumActivity: boolean;
  prayerActivity: boolean;
  rentalUpdates: boolean;
}

const NotificationSettings = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsState>({
    readingReminders: true,
    readingReminderTime: '18:00',
    forumActivity: true,
    prayerActivity: true,
    rentalUpdates: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

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
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${BASE_URL}/api/users/notification-settings`,
        { settings: newSettings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
      setSettings(oldSettings);
    } finally {
      setSaving(false);
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
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${BASE_URL}/api/users/notification-settings`,
        { settings: newSettings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error updating reminder time:', error);
      Alert.alert('Error', 'Failed to update reminder time.');
      setSettings(oldSettings);
    } finally {
      setSaving(false);
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <LinearGradient colors={[Colors.bg, '#19A7CE']} style={styles.gradient}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.inactive} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                <BookOpen color="#146C94" size={22} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingLabel}>Bible Reading</Text>
                <TouchableOpacity onPress={showTimePicker} style={styles.timePickerBtn}>
                  <Text style={styles.settingDescription}>
                    Reminders at <Text style={styles.timeHighlight}>{formatTimeDisplay(settings.readingReminderTime)}</Text> to finish daily portions. [Reading Planner]
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <Switch
              value={settings.readingReminders}
              onValueChange={() => toggleSetting('readingReminders')}
              trackColor={{ false: '#D1D1D1', true: Colors.active }}
              thumbColor={settings.readingReminders ? Colors.bg : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                <MessageSquare color="#9C27B0" size={22} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingLabel}>Forum Activity</Text>
                <Text style={styles.settingDescription}>Alerts when someone answers your questions.</Text>
              </View>
            </View>
            <Switch
              value={settings.forumActivity}
              onValueChange={() => toggleSetting('forumActivity')}
              trackColor={{ false: '#D1D1D1', true: Colors.active }}
              thumbColor={settings.forumActivity ? Colors.bg : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#FCE4EC' }]}>
                <HandHeart color="#E91E63" size={22} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingLabel}>Prayer Alerts</Text>
                <Text style={styles.settingDescription}>Notifications when others pray for your requests.</Text>
              </View>
            </View>
            <Switch
              value={settings.prayerActivity}
              onValueChange={() => toggleSetting('prayerActivity')}
              trackColor={{ false: '#D1D1D1', true: Colors.active }}
              thumbColor={settings.prayerActivity ? Colors.bg : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                <ShieldCheck color="#4CAF50" size={22} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingLabel}>Rental Updates</Text>
                <Text style={styles.settingDescription}>Status updates on your book rent requests.</Text>
              </View>
            </View>
            <Switch
              value={settings.rentalUpdates}
              onValueChange={() => toggleSetting('rentalUpdates')}
              trackColor={{ false: '#D1D1D1', true: Colors.active }}
              thumbColor={settings.rentalUpdates ? Colors.bg : '#F4F3F4'}
            />
          </View>

          <View style={styles.infoBox}>
            <Bell color={Colors.inactive} size={18} />
            <Text style={styles.infoText}>
              Stay connected with the community and maintain your spiritual routines.
            </Text>
          </View>
        </ScrollView>
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

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: Colors.inactive,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.bg,
  },
  backButton: {
    padding: 8,
    backgroundColor: Colors.active,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.inactive,
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.inactive,
    marginBottom: 15,
    marginLeft: 5,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: Colors.active,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    color: Colors.bg,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  timeHighlight: {
    color: '#146C94',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.inactive,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default NotificationSettings;
