import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

const BASE_URL = Constants?.expoConfig?.extra?.apiUrl;

const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

const History = () => {
  const navigation = useNavigation<any>();
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
      <LinearGradient colors={[Colors.bg, '#19A7CE']} style={styles.gradient}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.inactive} />
          </Pressable>
          <Text style={styles.headerTitle}>Rent History</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          {rentHistory.length > 0 ? (
            rentHistory.map((request: any, index: number) => {
              const book = books.find((b: any) => b.book_id === request.book_id);
              const bookName = book ? book.book_name : 'Unknown Book';

              return (
                <View key={`${request.book_id}-${request.requested_at}`} style={styles.historyCard}>
                  <View style={styles.historyContent}>
                    <View style={styles.historyIndicator} />
                    <View style={styles.historyDetails}>
                      <Text style={styles.bookTitle}>{bookName}</Text>
                      <Text style={styles.requestDate}>
                        Requested on: {new Date(request.requested_at).toLocaleString()}
                      </Text>
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
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No rent history available</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: Colors.inactive,
  },
  gradient: {
    flex: 1,
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
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.bg,
  },
  backButton: {
    padding: 8,
    backgroundColor: Colors.active,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.inactive,
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
    padding: 15,
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
    borderLeftColor: Colors.active,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.active,
    marginRight: 15,
  },
  historyDetails: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.bg,
    marginBottom: 5,
  },
  requestDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusPending: {
    color: '#FFA500',
  },
  statusApproved: {
    color: '#28A745',
  },
  statusRejected: {
    color: '#FF6B6B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default History;