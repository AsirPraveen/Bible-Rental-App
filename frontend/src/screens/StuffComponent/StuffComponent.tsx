import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, Platform, StatusBar, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Book, Music, FileText, MessageSquare, Target, Calendar, HandHeart, Map as MapIcon, Users, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

// Map card titles → guestAccess keys
const GUEST_KEY_MAP: Record<string, string> = {
  'Bible': 'Bible',
  'Songs': 'Songs',
  'HistoricalMaps': 'HistoricalMaps',
  'ReadingTracker': 'ReadingTracker',
  'ReadingPlanner': 'ReadingPlanner',
  'DiscussionForum': 'DiscussionForum',
  'FastingTracker': 'FastingTracker',
  'PrayerRequests': 'PrayerRequests',
  'BookPdf': 'BookPdf',
  'MessageNotes': 'MessageNotes',
};

export default function StuffComponent() {
  const navigation = useNavigation<any>();
  const { isGuest } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [guestAccess, setGuestAccess] = useState<Record<string, boolean>>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  // Fetch settings on mount (features for all, guestAccess for guests)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/app-settings`);
        if (res.data.status === 'Success') {
          if (res.data.data.features) {
            setFeatures(res.data.data.features);
          }
          if (res.data.data.guestAccess) {
            setGuestAccess(res.data.data.guestAccess);
          }
        }
      } catch (err) {
        console.log('Error fetching settings in StuffComponent:', err);
      }
    };
    fetchSettings();
  }, [isGuest]);

  const iconColor = colors.tint;
  const cardBg = colors.theme === 'dark' ? colors.surface : '#AFD3E2';

  let cards = [
    {
      title: 'Bible',
      icon: <Book color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: false,
    },
    {
      title: 'Songs',
      icon: <Music color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: false,
      isComingSoon: false,
    },
    {
      title: 'HistoricalMaps',
      icon: <MapIcon color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: true,
    },
    {
      title: 'ReadingTracker',
      icon: <Calendar color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: true,
    },
    {
      title: 'ReadingPlanner',
      icon: <Target color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: true,
    },
    {
      title: 'DiscussionForum',
      icon: <Users color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: true,
    },
    {
      title: 'FastingTracker',
      icon: <Calendar color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: true,
    },
    {
      title: 'PrayerRequests',
      icon: <HandHeart color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: true,
    },
    {
      title: 'MessageNotes',
      icon: <MessageSquare color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: true,
    },
    {
      title: 'BookPdf',
      icon: <FileText color={iconColor} size={32} />,
      bgColor: cardBg,
      isNew: false,
      isComingSoon: true,
    },
  ];

  if (isGuest) {
    const mapsIndex = cards.findIndex(c => c.title === 'HistoricalMaps');
    const songsIndex = cards.findIndex(c => c.title === 'Songs');
    if (mapsIndex !== -1 && songsIndex !== -1) {
      const temp = cards[songsIndex];
      cards[songsIndex] = cards[mapsIndex];
      cards[mapsIndex] = temp;
    }
  }

  const handleCardPress = (card: any) => {
    // Check if the feature is disabled (freezed) by the admin
    const isEnabled = features[card.title] !== false;
    if (!isEnabled) {
      Alert.alert(
        'Feature Freezed',
        'Admin has freezed this feature.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isLocked(card.title)) {
      Alert.alert(
        '🔒 Sign In Required',
        `"${card.title}" requires an account. Sign in to access this feature.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    navigation.navigate(card.title);
  };

  // Check if a card is locked for guests
  const isLocked = (title: string): boolean => {
    if (!isGuest) return false;
    const guestKey = GUEST_KEY_MAP[title];
    if (!guestKey) return false;

    // Only Bible and HistoricalMaps are global guest features configured by the SuperAdmin
    if (guestKey === 'Bible' || guestKey === 'HistoricalMaps') {
      return guestAccess[guestKey] === false;
    }

    // All other features are organization-scoped or user-scoped, so they are always locked for guests
    return true;
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {isGuest && (
          <View style={styles.guestBanner}>
            <Text style={styles.guestBannerText}>Guest Mode</Text>
          </View>
        )}
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {cards.map((card, index) => {
              const locked = isLocked(card.title);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.card, { backgroundColor: card.bgColor }, locked && styles.lockedCard]}
                  onPress={() => handleCardPress(card)}>
                  {card.isNew && !locked && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                  {card.isComingSoon && !locked && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                    </View>
                  )}
                  {locked && (
                    <View style={styles.lockBadge}>
                      <Lock color="#fff" size={10} />
                      <Text style={styles.lockBadgeText}>SIGN IN</Text>
                    </View>
                  )}
                  <View style={[styles.cardContent, locked && { opacity: 0.4 }]}>
                    {card.icon}
                    <Text style={styles.cardTitle}>{card.title}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    width: '47.5%',
    aspectRatio: 0.760,
    borderRadius: 16,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  lockedCard: {
    // subtle visual difference for locked cards
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.tint,
    textAlign: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 12,
    zIndex: 1,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#9E9E9E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 12,
    zIndex: 1,
  },
  comingSoonBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  lockBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 12,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  guestBanner: {
    position: 'absolute',
    top: 25,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: '#146C94',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 18,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  guestBannerText: {
    color: '#146C94',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});