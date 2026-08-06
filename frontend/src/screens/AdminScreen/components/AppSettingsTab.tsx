import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Settings, Gamepad2, Book, Music, Map as MapIcon, Calendar, Target,
  Users, Flame, HandHeart, MessageSquare, FileText, Image as LucideImage,
  BookOpen, ArrowLeft, Menu, Bell
} from 'lucide-react-native';
import { useTheme, ColorsType } from '../../../context/ThemeContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const AppSettingsTab = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [isGameEnabled, setIsGameEnabled] = useState(true);
  const [isImageGenEnabled, setIsImageGenEnabled] = useState(true);
  const [features, setFeatures] = useState<Record<string, boolean>>({
    Bible: true,
    Songs: true,
    HistoricalMaps: true,
    ReadingTracker: true,
    ReadingPlanner: true,
    DiscussionForum: true,
    FastingTracker: true,
    PrayerRequests: true,
    MessageNotes: true,
    BookPdf: true,
    upperRoom: true,
    SongPdf: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/app-settings`);
      if (res.data.status === 'Success') {
        setIsGameEnabled(res.data.data.isGameEnabled);
        setIsImageGenEnabled(res.data.data.isImageGenEnabled !== false);
        if (res.data.data.features) {
          setFeatures(prev => ({ ...prev, ...res.data.data.features }));
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      Alert.alert('Error', 'Failed to load app settings.');
    } finally {
      setLoading(false);
    }
  };

  const autoSaveSettings = async (
    gameEnabled: boolean,
    imageGenEnabled: boolean,
    updatedFeatures: Record<string, boolean>,
    updatedLabel: string
  ) => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/app-settings`,
        { isGameEnabled: gameEnabled, isImageGenEnabled: imageGenEnabled, features: updatedFeatures },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', `${updatedLabel} preference updated successfully!`);
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const featureList = [
    { key: 'Bible', label: 'Bible Study', description: 'Access scripture readings and translations.', icon: Book, iconColor: '#0284C7', iconBg: 'rgba(2, 132, 199, 0.1)' },
    { key: 'Songs', label: 'Worship Songs', description: 'Access lyrics, chords, and music resources.', icon: Music, iconColor: '#9333EA', iconBg: 'rgba(147, 51, 234, 0.1)' },
    { key: 'SongPdf', label: 'Song Sheet PDF Builder', description: 'Enable layout builder to compile, edit and print song sheets.', icon: FileText, iconColor: '#10B981', iconBg: 'rgba(16, 185, 129, 0.1)' },
    { key: 'HistoricalMaps', label: 'Historical Maps', description: 'Explore biblical geography and maps.', icon: MapIcon, iconColor: '#059669', iconBg: 'rgba(5, 150, 105, 0.1)' },
    { key: 'ReadingTracker', label: 'Reading Tracker', description: 'Track your daily Bible reading progress.', icon: Calendar, iconColor: '#D97706', iconBg: 'rgba(217, 119, 6, 0.1)' },
    { key: 'ReadingPlanner', label: 'Reading Planner', description: 'Schedule and plan reading plans.', icon: Target, iconColor: '#DC2626', iconBg: 'rgba(220, 38, 38, 0.1)' },
    { key: 'DiscussionForum', label: 'Discussion Forum', description: 'Participate in group chats and forum boards.', icon: Users, iconColor: '#2563EB', iconBg: 'rgba(37, 99, 235, 0.1)' },
    { key: 'FastingTracker', label: 'Fasting Tracker', description: 'Log fasting details and reflections.', icon: Flame, iconColor: '#EA580C', iconBg: 'rgba(234, 88, 12, 0.1)' },
    { key: 'PrayerRequests', label: 'Prayer Wall', description: 'Post requests and pray for other members.', icon: HandHeart, iconColor: '#DB2777', iconBg: 'rgba(219, 39, 119, 0.1)' },
    { key: 'MessageNotes', label: 'Sermon Notes', description: 'Take notes during messages or study.', icon: MessageSquare, iconColor: '#7C3AED', iconBg: 'rgba(124, 58, 237, 0.1)' },
    { key: 'BookPdf', label: 'Literature Library', description: 'Read and view PDF books/literature.', icon: FileText, iconColor: '#4B5563', iconBg: 'rgba(75, 85, 99, 0.1)' },
    { key: 'upperRoom', label: 'The Upper Room', description: 'Enable group fellowships and real-time chat.', icon: BookOpen, iconColor: '#0D9488', iconBg: 'rgba(13, 148, 136, 0.1)' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.outer_container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.outer_container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {/* ── Header ────────────────────────────────── */}
        <View style={styles.headerContainer}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#F6F1F1" />
          </Pressable>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>Configuration</Text>
            <Text style={styles.subtitleText}>Manage global features</Text>
          </View>
        </View>

        {/* ── Content container ───────────────────────────────── */}
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Section label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={styles.sectionTitle}>GLOBAL SETTINGS</Text>
              {saving && <ActivityIndicator size="small" color={colors.tint} />}
            </View>

            {/* Bible Card Game */}
            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.12)' : '#E3F2FD' }]}>
                  <Gamepad2 color={colors.tint} size={20} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingLabel}>Bible Card Game</Text>
                  <Text style={styles.settingDescription}>Show or hide the game controller icon on the main Home Screen.</Text>
                </View>
              </View>
              <Switch
                value={isGameEnabled}
                onValueChange={(val) => {
                  setIsGameEnabled(val);
                  autoSaveSettings(val, isImageGenEnabled, features, 'Bible Card Game');
                }}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={isGameEnabled ? colors.tint : colors.textSecondary}
              />
            </View>

            {/* AI Image Generation */}
            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: colors.theme === 'dark' ? 'rgba(168, 85, 247, 0.12)' : '#F3E5F5' }]}>
                  <LucideImage color={colors.theme === 'dark' ? '#C084FC' : '#9C27B0'} size={20} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingLabel}>AI Image Generation</Text>
                  <Text style={styles.settingDescription}>Enable or disable AI image generation for verses.</Text>
                </View>
              </View>
              <Switch
                value={isImageGenEnabled}
                onValueChange={(val) => {
                  setIsImageGenEnabled(val);
                  autoSaveSettings(isGameEnabled, val, features, 'AI Image Generation');
                }}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={isImageGenEnabled ? colors.tint : colors.textSecondary}
              />
            </View>

            {/* Section label */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>FEATURES</Text>

            {/* Features Map */}
            {featureList.map((item) => {
              const isEnabled = features[item.key] ?? false;
              const IconComponent = item.icon;

              return (
                <View key={item.key} style={styles.settingCard}>
                  <View style={styles.settingInfo}>
                    <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                      <IconComponent color={item.iconColor} size={20} />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      <Text style={styles.settingDescription}>{item.description}</Text>
                    </View>
                  </View>
                  <Switch
                    value={isEnabled}
                    onValueChange={() => {
                      const updatedFeatures = {
                        ...features,
                        [item.key]: !isEnabled
                      };
                      setFeatures(updatedFeatures);
                      autoSaveSettings(isGameEnabled, isImageGenEnabled, updatedFeatures, item.label);
                    }}
                    trackColor={{ false: colors.border, true: colors.secondary }}
                    thumbColor={isEnabled ? colors.tint : colors.textSecondary}
                  />
                </View>
              );
            })}

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Settings color={colors.tint} size={18} />
              <Text style={styles.infoText}>
                Changes to these settings update immediately for all users in the organization.
              </Text>
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.linearGradient[0],
  },
  gradient: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default AppSettingsTab;
