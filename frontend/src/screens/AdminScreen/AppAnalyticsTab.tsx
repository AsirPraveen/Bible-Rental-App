import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Users, Target, Calendar, HandHeart, MessageSquare } from 'lucide-react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme } from '../../context/ThemeContext';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.13:5001';

interface AnalyticsData {
  prayers: {
    totalRequests: number;
    totalPrayersOffered: number;
  };
  reading: {
    totalChaptersRead: number;
    totalActivePlans: number;
  };
  fasting: {
    totalFasts: number;
    popularTypes: { _id: string; count: number }[];
  };
  forum: {
    totalQuestions: number;
    totalAnswers: number;
  };
}

export default function AppAnalyticsTab() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await axios.get(`${apiUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Could not load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading app analytics..." />;
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No analytics data available.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.outer_container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Text style={styles.headerText}>App Analytics</Text>

            <View style={styles.formCard}>
              {/* 1. Prayer Requests */}
              <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prayer Requests</Text>
        <LinearGradient colors={['#FF9A9E', '#FECFEF']} style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.iconWrapper}>
              <HandHeart color="#FF5252" size={24} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Requests Posted</Text>
              <Text style={styles.statValue}>{data.prayers.totalRequests}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Prayers Offered by Community</Text>
              <Text style={styles.statValue}>{data.prayers.totalPrayersOffered}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* 2. Reading Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bible Reading</Text>
        <LinearGradient colors={['#A18CD1', '#FBC2EB']} style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.iconWrapper}>
              <BookOpen color="#7E57C2" size={24} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Chapters Read (Synced)</Text>
              <Text style={styles.statValue}>{data.reading.totalChaptersRead}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Active Reading Plans</Text>
              <Text style={styles.statValue}>{data.reading.totalActivePlans}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* 3. Fasting Tracker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fasting Tracker</Text>
        <LinearGradient colors={['#84FAB0', '#8FD3F4']} style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.iconWrapper}>
              <Target color="#009688" size={24} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Fasts (Active & Completed)</Text>
              <Text style={styles.statValue}>{data.fasting.totalFasts}</Text>
            </View>
          </View>
          
          {data.fasting.popularTypes && data.fasting.popularTypes.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.statLabel, { paddingHorizontal: 16 }]}>Popular Types:</Text>
              {data.fasting.popularTypes.slice(0, 3).map((type, idx) => (
                <View key={idx} style={styles.listRow}>
                  <Text style={styles.listType}>{type._id}</Text>
                  <Text style={styles.listCount}>{type.count}</Text>
                </View>
              ))}
            </>
          )}
        </LinearGradient>
      </View>

      {/* 4. Discussion Forum */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discussion Forum</Text>
        <LinearGradient colors={['#FFD194', '#70E1F5']} style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.iconWrapper}>
              <MessageSquare color="#FF9800" size={24} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Questions Asked</Text>
              <Text style={styles.statValue}>{data.forum.totalQuestions}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Answers Written</Text>
              <Text style={styles.statValue}>{data.forum.totalAnswers}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
      
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 16,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  listCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  }
});
