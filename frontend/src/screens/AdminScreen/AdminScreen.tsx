import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Check, LogOut, Plus, X } from 'lucide-react-native';

  const BASE_URL = Constants.expoConfig.extra.apiUrl; // Replace with your IP or use .env

const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

const AdminScreen = () => {
  const navigation = useNavigation();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const [analytics, setAnalytics] = useState({ totalBooks: 0, totalRented: 0, popularBooks: [] });
  const [newBook, setNewBook] = useState({
    book_name: '',
    author_name: '',
    pages: '',
    preface: '',
    year_of_publication: '',
    author_id: '',
    book_id: '',
  });
  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch pending rent requests
  const fetchPendingRequests = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/pending-rent-requests`);
      setPendingRequests(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setPendingRequests([]);
    }
  };

  // Fetch request history
  const fetchRequestHistory = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/request-history`);
      setRequestHistory(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (error) {
      console.error('Error fetching request history:', error);
      setRequestHistory([]);
    }
  };

  // Fetch book analytics
  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/book-analytics`);
      console.log('Analytics API Response:', res.data); // Debug the response
      const data = res.data.data || { totalBooks: 0, totalRented: 0, popularBooks: [] };
      setAnalytics({
        totalBooks: data.totalBooks || 0,
        totalRented: data.totalRented || 0,
        popularBooks: Array.isArray(data.popularBooks) ? data.popularBooks : [],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({ totalBooks: 0, totalRented: 0, popularBooks: [] });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPendingRequests(), fetchRequestHistory(), fetchAnalytics()]);
    };
    fetchData();
  }, []);

  // Polling for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingRequests();
      fetchRequestHistory();
      fetchAnalytics();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Approve a rent request
  const handleApproveRequest = (userEmail: string, book_id: number) => {
    Alert.alert(
      'Confirm Approval',
      `Are you sure you want to approve the rent request for book ID ${book_id} by ${userEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await axios.post(`${BASE_URL}/api/approve-rent-request`, { userEmail, book_id });
              Alert.alert('Success', 'Rent request approved');
              await fetchPendingRequests();
              await fetchRequestHistory();
              await fetchAnalytics();
            } catch (error) {
              Alert.alert('Error', 'Failed to approve request');
            }
          },
        },
      ]
    );
  };

  // Reject a rent request
  const handleRejectRequest = (userEmail: string, book_id: number) => {
    Alert.alert(
      'Confirm Rejection',
      `Are you sure you want to reject the rent request for book ID ${book_id} by ${userEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async () => {
            try {
              await axios.post(`${BASE_URL}/api/reject-rent-request`, { userEmail, book_id });
              Alert.alert('Success', 'Rent request rejected');
              await fetchPendingRequests();
              await fetchRequestHistory();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  // Add a new book directly
  const handleAddBook = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/api/add-book`, newBook);
      if (res.data.status === 'Ok') {
        Alert.alert('Success', 'Book added successfully');
        setNewBook({
          book_name: '',
          author_name: '',
          pages: '',
          preface: '',
          year_of_publication: '',
          author_id: '',
          book_id: '',
        });
        setShowAddBookForm(false);
        await fetchAnalytics();
      } else {
        Alert.alert('Error', res.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add book');
    }
  };

  // Logout
  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('userType');
    navigation.navigate('Login');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.bg} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Pressable onPress={handleLogout}>
          <LogOut size={24} color={Colors.inactive} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Analytics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Book Analytics</Text>
          <View style={styles.analyticsContainer}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{analytics.totalBooks}</Text>
              <Text style={styles.analyticsLabel}>Total Books</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{analytics.totalRented}</Text>
              <Text style={styles.analyticsLabel}>Total Rented</Text>
            </View>
          </View>
          <Text style={styles.subSectionTitle}>Popular Books</Text>
          {analytics.popularBooks?.length > 0 ? (
            analytics.popularBooks.map((book: any) => (
              <View key={book.book_id} style={styles.popularBookCard}>
                <Text style={styles.popularBookTitle}>{book.book_name}</Text>
                <Text style={styles.popularBookDetail}>Rented: {book.rent_count} times</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No popular books available</Text>
          )}
        </View>

        {/* Pending Rent Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Rent Requests</Text>
          {pendingRequests.length > 0 ? (
            pendingRequests.map((request: any) => (
              <View key={`${request.userEmail}-${request.book_id}`} style={styles.requestCard}>
                <View style={styles.requestContent}>
                  <View style={styles.requestIndicator} />
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestTitle}>{request.book_name}</Text>
                    <Text style={styles.requestDetail}>Requested by: {request.userEmail}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <Pressable onPress={() => handleApproveRequest(request.userEmail, request.book_id)} style={styles.actionButton}>
                    <Check size={20} color={Colors.inactive} />
                  </Pressable>
                  <Pressable onPress={() => handleRejectRequest(request.userEmail, request.book_id)} style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}>
                    <X size={20} color={Colors.inactive} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No pending requests</Text>
          )}
        </View>

        {/* Request History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request History</Text>
          {requestHistory.length > 0 ? (
            requestHistory.map((history: any) => (
              <View key={`${history.userEmail}-${history.book_id}-${history.processed_at}`} style={styles.historyCard}>
                <View style={styles.historyContent}>
                  <View style={styles.historyIndicator} />
                  <View style={styles.historyDetails}>
                    <Text style={styles.historyTitle}>{history.book_name}</Text>
                    <Text style={styles.historyDetail}>User: {history.userEmail}</Text>
                    <Text style={styles.historyDetail}>
                      Processed on: {new Date(history.processed_at).toLocaleString()}
                    </Text>
                    <Text
                      style={[
                        styles.statusText,
                        history.status === 'approved' && styles.statusApproved,
                        history.status === 'rejected' && styles.statusRejected,
                      ]}
                    >
                      {history.status === 'approved' ? 'Approved' : 'Rejected'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No request history available</Text>
          )}
        </View>

        {/* Add New Book */}
        <View style={styles.section}>
          <Pressable onPress={() => setShowAddBookForm(!showAddBookForm)} style={styles.addButton}>
            <Plus size={20} color={Colors.inactive} />
            <Text style={styles.addButtonText}>Add New Book</Text>
          </Pressable>
          {showAddBookForm && (
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Book Name"
                placeholderTextColor="#999"
                value={newBook.book_name}
                onChangeText={(text) => setNewBook({ ...newBook, book_name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Author Name"
                placeholderTextColor="#999"
                value={newBook.author_name}
                onChangeText={(text) => setNewBook({ ...newBook, author_name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Pages"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={newBook.pages}
                onChangeText={(text) => setNewBook({ ...newBook, pages: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Preface"
                placeholderTextColor="#999"
                value={newBook.preface}
                onChangeText={(text) => setNewBook({ ...newBook, preface: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Year of Publication"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={newBook.year_of_publication}
                onChangeText={(text) => setNewBook({ ...newBook, year_of_publication: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Author ID"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={newBook.author_id}
                onChangeText={(text) => setNewBook({ ...newBook, author_id: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Book ID"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={newBook.book_id}
                onChangeText={(text) => setNewBook({ ...newBook, book_id: text })}
              />
              <Pressable onPress={handleAddBook} style={styles.submitButton}>
                <Text style={styles.submitButtonText}>Add Book</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.bg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.inactive,
  },
  scrollView: {
    flex: 1,
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
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.bg,
    marginTop: 10,
    marginBottom: 5,
  },
  analyticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.bg,
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#666',
  },
  popularBookCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  popularBookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.bg,
  },
  popularBookDetail: {
    fontSize: 14,
    color: '#666',
  },
  requestCard: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.active,
    marginRight: 15,
  },
  requestDetails: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.bg,
  },
  requestDetail: {
    fontSize: 14,
    color: '#666',
  },
  requestActions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#19A7CE',
    borderRadius: 5,
    padding: 8,
    marginLeft: 5,
  },
  historyCard: {
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
    borderLeftColor: Colors.bg,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.bg,
    marginRight: 15,
  },
  historyDetails: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.bg,
  },
  historyDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },
  statusApproved: {
    color: '#28A745',
  },
  statusRejected: {
    color: '#FF6B6B',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.inactive,
    fontSize: 16,
    marginLeft: 5,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  input: {
    backgroundColor: Colors.inactive,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#19A7CE',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.inactive,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminScreen;