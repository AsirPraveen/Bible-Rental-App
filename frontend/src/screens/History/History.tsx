import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ArrowLeft, BookOpen, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const BASE_URL = Constants?.expoConfig?.extra?.apiUrl;

// ── Time-ago helper ──────────────────────────────────────────────
function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  if (isNaN(then)) return dateString;
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(dateString).toLocaleDateString();
}

const statusConfig: Record<string, { label: string; color: string; darkColor: string; icon: any }> = {
  pending: { label: 'Pending', color: '#F59E0B', darkColor: '#FBBF24', icon: Clock },
  approved: { label: 'Approved', color: '#10B981', darkColor: '#34D399', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#EF4444', darkColor: '#F87171', icon: XCircle },
  returned: { label: 'Returned', color: '#6366F1', darkColor: '#818CF8', icon: RotateCcw },
};

const History = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [rentHistory, setRentHistory] = useState([]);
  type Book = { book_id: string | number; book_name: string };
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRentHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userRes = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
      const user = userRes.data.data;

      const booksRes = await axios.get(`${BASE_URL}/api/books`);
      setBooks(Array.isArray(booksRes.data.data) ? booksRes.data.data : []);

      const sortedHistory = (Array.isArray(user.books_rented) ? user.books_rented : []).sort(
        (a: any, b: any) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
      );
      setRentHistory(sortedHistory);
    } catch (error) {
      console.error('Error fetching rent history:', error);
      setRentHistory([]);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRentHistory();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchRentHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Loading history..." />;
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
            <Text style={styles.headerTitle}>Rent History</Text>
            <Text style={styles.subtitleText}>
              {rentHistory.length > 0
                ? `${rentHistory.length} ${rentHistory.length === 1 ? 'request' : 'requests'}`
                : 'Your rental records'}
            </Text>
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
            {rentHistory.length > 0 ? (
              rentHistory.map((request: any, index: number) => {
                const book = books.find((b: any) => b.book_id === request.book_id);
                const bookName = book ? book.book_name : 'Unknown Book';
                const status = statusConfig[request.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                const statusColor = colors.theme === 'dark' ? status.darkColor : status.color;

                return (
                  <View key={`${request.book_id}-${request.requested_at}`} style={styles.historyCard}>
                    {/* Status indicator strip */}
                    <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.bookTitle} numberOfLines={2}>{bookName}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                          <StatusIcon size={12} color={statusColor} />
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {status.label}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardFooter}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.requestDate}>
                          {timeAgo(request.requested_at)}
                        </Text>
                        <Text style={styles.requestDateFull}>
                          · {new Date(request.requested_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <BookOpen color={colors.secondary} size={72} />
                <Text style={styles.emptyTitle}>No History Yet</Text>
                <Text style={styles.emptySubtext}>
                  Your rental history will appear here
                </Text>
              </View>
            )}
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
    paddingBottom: 24,
  },

  // ── History cards ──────────────────────────────────────────────
  historyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  requestDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  requestDateFull: {
    fontSize: 13,
    color: colors.textSecondary,
    opacity: 0.7,
  },

  // ── Empty state ────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default History;