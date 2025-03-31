import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react-native';

const BASE_URL = 'http://192.168.29.46:5001'; // Replace with your IP or use .env

const History = () => {
  const navigation = useNavigation();
  const [rentHistory, setRentHistory] = useState([]);
  const [books, setBooks] = useState<any[]>([]);

  // Fetch user data and rent history
  const fetchRentHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userRes = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
      const user = userRes.data.data;

      // Fetch all books to map book_id to book_name
      const booksRes = await axios.get(`${BASE_URL}/api/books`);
      setBooks(booksRes.data.data);

      // Set the user's rent history
      setRentHistory(user.books_rented || []);
    } catch (error) {
      console.error('Error fetching rent history:', error);
    }
  };

  useEffect(() => {
    fetchRentHistory();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Rent History</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {rentHistory.length === 0 ? (
          <Text style={styles.noDataText}>No rent history available</Text>
        ) : (
          rentHistory.map((request: any, index: number) => {
            const book = books.find((b: any) => b.book_id === request.book_id);
            const bookName = book ? book.book_name : 'Unknown Book';

            return (
              <View key={index} style={styles.historyCard}>
                <View>
                  <Text style={styles.bookTitle}>{bookName}</Text>
                  <Text style={styles.requestDate}>
                    Requested on: {new Date(request.requested_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.statusText,
                    request.status === 'pending' && styles.statusPending,
                    request.status === 'approved' && styles.statusApproved,
                    request.status === 'rejected' && styles.statusRejected,
                  ]}
                >
                  {request.status === 'pending' && 'Request Pending...'}
                  {request.status === 'approved' && 'Request Approved'}
                  {request.status === 'rejected' && 'Request Rejected'}
                </Text>
              </View>
            );
          })
        )}
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
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#146C94',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  historyCard: {
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
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
  },
  requestDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusPending: {
    color: '#FFA500', // Orange tone for pending
  },
  statusApproved: {
    color: '#28A745', // Green tone for approved
  },
  statusRejected: {
    color: '#FF6B6B', // Red tone for rejected
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default History;