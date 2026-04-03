import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform, StatusBar, SafeAreaView } from 'react-native';
import axios from 'axios';
import RequestCard from './components/RequestCard';
import EmailTemplateModal from './components/EmailTemplateModal';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

const PendingRequestsTab = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.bg} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
            <MaterialIcons name="email" size={24} color={Colors.bg} />
            <Text style={styles.tuneButtonText}>Edit Email</Text>
          </TouchableOpacity>
        </View>
        {pendingRequests.length > 0 ? (
          pendingRequests.map((request: any) => (
            <RequestCard
              key={`${request.userEmail}-${request.book_id}`}
              request={request}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          ))
        ) : (
          <Text style={styles.noDataText}>No pending requests</Text>
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
    // justifyContent: 'center',
    // alignItems: 'center',
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
  },
});

export default PendingRequestsTab;