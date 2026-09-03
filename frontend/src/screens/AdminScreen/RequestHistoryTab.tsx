import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform, StatusBar, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import HistoryCard from './components/HistoryCard';
import LoadingScreen from '../../components/LoadingScreen';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const BASE_URL = API_BASE_URL;

const RequestHistoryTab = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'book-az'>('date-desc');

  const fetchRequestHistory = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/request-history`);
      setRequestHistory(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (error) {
      console.error('Error fetching request history:', error);
      setRequestHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestHistory();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchRequestHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  const getProcessedHistory = () => {
    let result = [...requestHistory];

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(h => h.status === statusFilter);
    }

    // Search Query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(h => 
        (h.book_name || '').toLowerCase().includes(q) ||
        (h.userName || '').toLowerCase().includes(q) ||
        (h.userEmail || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-asc') {
        return new Date(a.processed_at).getTime() - new Date(b.processed_at).getTime();
      } else if (sortBy === 'date-desc') {
        return new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime();
      } else if (sortBy === 'book-az') {
        return (a.book_name || '').localeCompare(b.book_name || '');
      }
      return 0;
    });

    return result;
  };

  if (isLoading) {
    return <LoadingScreen message="Loading history..." />;
  }

  const processed = getProcessedHistory();

  return (
    <SafeAreaView style={styles.outer_container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerText}>Request History</Text>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>History Log</Text>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by book or user..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Status Filter Chips */}
            <Text style={styles.filterLabel}>Filter by status:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.filterScroll}
              contentContainerStyle={styles.filterScrollContent}
            >
              <TouchableOpacity
                style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
                onPress={() => setStatusFilter('all')}
              >
                <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, statusFilter === 'approved' && styles.filterChipActive]}
                onPress={() => setStatusFilter('approved')}
              >
                <Text style={[styles.filterChipText, statusFilter === 'approved' && styles.filterChipTextActive]}>
                  ✅ Approved
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, statusFilter === 'rejected' && styles.filterChipActive]}
                onPress={() => setStatusFilter('rejected')}
              >
                <Text style={[styles.filterChipText, statusFilter === 'rejected' && styles.filterChipTextActive]}>
                  ❌ Rejected
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sort Chips */}
            <Text style={styles.filterLabel}>Sort by:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.filterScroll}
              contentContainerStyle={styles.filterScrollContent}
            >
              <TouchableOpacity
                style={[styles.filterChip, sortBy === 'date-desc' && styles.filterChipActive]}
                onPress={() => setSortBy('date-desc')}
              >
                <Text style={[styles.filterChipText, sortBy === 'date-desc' && styles.filterChipTextActive]}>
                  📅 Date (Newest)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, sortBy === 'date-asc' && styles.filterChipActive]}
                onPress={() => setSortBy('date-asc')}
              >
                <Text style={[styles.filterChipText, sortBy === 'date-asc' && styles.filterChipTextActive]}>
                  📅 Date (Oldest)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, sortBy === 'book-az' && styles.filterChipActive]}
                onPress={() => setSortBy('book-az')}
              >
                <Text style={[styles.filterChipText, sortBy === 'book-az' && styles.filterChipTextActive]}>
                  📖 Book (A-Z)
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {processed.length > 0 ? (
              processed.map((history: any) => (
                <HistoryCard key={`${history.userEmail}-${history.book_id}-${history.processed_at}`} history={history} />
              ))
            ) : (
              <Text style={styles.noDataText}>
                {requestHistory.length === 0 ? 'No request history available' : 'No matching history found'}
              </Text>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  outer_container: {
    flex: 1,
    backgroundColor: colors.linearGradient[0],
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 30,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 15,
  },
  noDataText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterScrollContent: {
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.tint,
    borderColor: colors.tint,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});

export default RequestHistoryTab;