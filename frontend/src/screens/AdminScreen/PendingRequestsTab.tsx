import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform, StatusBar, SafeAreaView, TextInput } from 'react-native';
import axios from 'axios';
import RequestCard from './components/RequestCard';
import EmailTemplateModal from './components/EmailTemplateModal';
import Constants from 'expo-constants';
import LoadingScreen from '../../components/LoadingScreen';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

const PendingRequestsTab = () => {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'book-az' | 'user-az'>('date-asc');

  const fetchPendingRequests = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/pending-rent-requests`);
      setPendingRequests(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchPendingRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveRequest = async (userEmail: string, book_id: number) => {
    try {
      await axios.post(`${BASE_URL}/api/approve-rent-request`, { userEmail, book_id });
      alert('Rent request approved');
      await fetchPendingRequests();
    } catch (error) {
      alert('Failed to approve request');
    }
  };

  const handleRejectRequest = async (userEmail: string, book_id: number) => {
    try {
      await axios.post(`${BASE_URL}/api/reject-rent-request`, { userEmail, book_id });
      alert('Rent request rejected');
      await fetchPendingRequests();
    } catch (error) {
      alert('Failed to reject request');
    }
  };

  const getProcessedRequests = () => {
    let result = [...pendingRequests];
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        (r.book_name || '').toLowerCase().includes(q) ||
        (r.userName || '').toLowerCase().includes(q) ||
        (r.userEmail || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy === 'date-asc') {
        return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
      } else if (sortBy === 'date-desc') {
        return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
      } else if (sortBy === 'book-az') {
        return (a.book_name || '').localeCompare(b.book_name || '');
      } else if (sortBy === 'user-az') {
        return (a.userName || '').localeCompare(b.userName || '');
      }
      return 0;
    });
    return result;
  };

  if (isLoading) {
    return <LoadingScreen message="Loading requests..." />;
  }

  const processed = getProcessedRequests();

  return (
    <SafeAreaView style={styles.outer_container}>
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Pending Rent Requests</Text>
          <TouchableOpacity 
            style={styles.tuneButton} 
            onPress={() => setIsTemplateModalVisible(true)}
          >
            <MaterialIcons name="email" size={20} color={Colors.bg} />
            <Text style={styles.tuneButtonText}>Edit Email</Text>
          </TouchableOpacity>
        </View>

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

        {/* Sort Chips */}
        <Text style={styles.filterLabel}>Sort by:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, sortBy === 'date-asc' && styles.filterChipActive]}
            onPress={() => setSortBy('date-asc')}
          >
            <Text style={[styles.filterChipText, sortBy === 'date-asc' && styles.filterChipTextActive]}>
              📅 Date (Oldest)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, sortBy === 'date-desc' && styles.filterChipActive]}
            onPress={() => setSortBy('date-desc')}
          >
            <Text style={[styles.filterChipText, sortBy === 'date-desc' && styles.filterChipTextActive]}>
              📅 Date (Newest)
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

          <TouchableOpacity
            style={[styles.filterChip, sortBy === 'user-az' && styles.filterChipActive]}
            onPress={() => setSortBy('user-az')}
          >
            <Text style={[styles.filterChipText, sortBy === 'user-az' && styles.filterChipTextActive]}>
              👤 User (A-Z)
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {processed.length > 0 ? (
          processed.map((request: any) => (
            <RequestCard
              key={`${request.userEmail}-${request.book_id}`}
              request={request}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          ))
        ) : (
          <Text style={styles.noDataText}>
            {pendingRequests.length === 0 ? 'No pending requests' : 'No matching requests found'}
          </Text>
        )}
      </View>
    </ScrollView>
    <EmailTemplateModal 
      isVisible={isTemplateModalVisible} 
      onClose={() => setIsTemplateModalVisible(false)} 
    />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.inactive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.bg,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tuneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.bg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  tuneButtonText: {
    marginLeft: 5,
    color: Colors.bg,
    fontWeight: '600',
    fontSize: 14,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.bg,
    borderColor: Colors.bg,
  },
  filterChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});

export default PendingRequestsTab;