import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import RequestCard from './components/RequestCard';

const BASE_URL = 'http://192.168.29.46:5001';
const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

const PendingRequestsTab = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Rent Requests</Text>
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
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 10,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default PendingRequestsTab;