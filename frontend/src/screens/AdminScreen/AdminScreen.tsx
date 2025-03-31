import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { LogOut, Plus, Check, X } from 'lucide-react-native';

const BASE_URL = 'http://192.168.29.46:5001'; // Replace with your IP or use .env

const AdminScreen = () => {
  const navigation = useNavigation();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [analytics, setAnalytics] = useState({ totalBooks: 0, totalRented: 0, popularBooks: [] });
  const [newBook, setNewBook] = useState({
    book_name: '', author_name: '', pages: '', preface: '', year_of_publication: '', author_id: '', book_id: ''
  });
  const [showAddBookForm, setShowAddBookForm] = useState(false);

  // Fetch pending rent requests
  const fetchPendingRequests = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/pending-rent-requests`);
      setPendingRequests(res.data.data);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  // Fetch book analytics
  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/book-analytics`);
      setAnalytics(res.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    fetchAnalytics();
  }, []);

  // Approve a rent request
  const handleApproveRequest = async (userEmail: string, book_id: number) => {
    try {
      await axios.post(`${BASE_URL}/api/approve-rent-request`, { userEmail, book_id });
      Alert.alert('Success', 'Rent request approved');
      fetchPendingRequests(); // Refresh the list
      fetchAnalytics(); // Update analytics
    } catch (error) {
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  // Reject a rent request
  const handleRejectRequest = async (userEmail: string, book_id: number) => {
    try {
      await axios.post(`${BASE_URL}/api/reject-rent-request`, { userEmail, book_id });
      Alert.alert('Success', 'Rent request rejected');
      fetchPendingRequests(); // Refresh the list
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  // Add a new book directly
  const handleAddBook = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/api/add-book`, newBook);
      if (res.data.status === 'Ok') {
        Alert.alert('Success', 'Book added successfully');
        setNewBook({
          book_name: '', author_name: '', pages: '', preface: '', year_of_publication: '', author_id: '', book_id: ''
        });
        setShowAddBookForm(false);
        fetchAnalytics(); // Update analytics
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Pressable onPress={handleLogout}>
          <LogOut size={24} color="#fff" />
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
          {analytics.popularBooks.map((book: any) => (
            <View key={book.book_id} style={styles.popularBookCard}>
              <Text style={styles.popularBookTitle}>{book.book_name}</Text>
              <Text style={styles.popularBookDetail}>Rented: {book.rent_count} times</Text>
            </View>
          ))}
        </View>

        {/* Pending Rent Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Rent Requests</Text>
          {pendingRequests.length === 0 ? (
            <Text style={styles.noDataText}>No pending requests</Text>
          ) : (
            pendingRequests.map((request: any) => (
                <View key={`${request.userEmail}-${request.book_id}`} style={styles.requestCard}>
                  <View>
                    <Text style={styles.requestTitle}>{request.book_name}</Text>
                    <Text style={styles.requestDetail}>Requested by: {request.userEmail}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <Pressable onPress={() => handleApproveRequest(request.userEmail, request.book_id)} style={styles.actionButton}>
                      <Check size={20} color="#fff" />
                    </Pressable>
                    <Pressable onPress={() => handleRejectRequest(request.userEmail, request.book_id)} style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}>
                      <X size={20} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              ))
          )}
        </View>

        {/* Add New Book */}
        <View style={styles.section}>
          <Pressable onPress={() => setShowAddBookForm(!showAddBookForm)} style={styles.addButton}>
            <Plus size={20} color="#fff" />
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
    backgroundColor: '#F6F1F1',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#146C94',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#146C94',
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
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
    color: '#146C94',
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
    color: '#146C94',
  },
  popularBookDetail: {
    fontSize: 14,
    color: '#666',
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
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
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#146C94',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
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
    backgroundColor: '#F6F1F1',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminScreen;