import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform, StatusBar, SafeAreaView } from 'react-native';
import axios from 'axios';
import HistoryCard from './components/HistoryCard';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

const RequestHistoryTab = () => {
  const [requestHistory, setRequestHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
        <Text style={styles.sectionTitle}>Request History</Text>
        {requestHistory.length > 0 ? (
          requestHistory.map((history: any) => (
            <HistoryCard key={`${history.userEmail}-${history.book_id}-${history.processed_at}`} history={history} />
          ))
        ) : (
          <Text style={styles.noDataText}>No request history available</Text>
        )}
      </View>
    </ScrollView>
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
    marginBottom: 10,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default RequestHistoryTab;