import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Star } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BASE_URL = 'http://192.168.29.46:5001'; // Replace with your IP or use .env

export default function BookDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { book: initialBook } = route.params;
  const [book, setBook] = useState(initialBook);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Fetch the latest book data to ensure availability status is up-to-date
  const fetchBookDetails = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/books`);
      const updatedBook = res.data.data.find((b: any) => b.book_id === initialBook.book_id);
      if (updatedBook) {
        setBook(updatedBook);
      }
    } catch (error) {
      console.error('Error fetching book details:', error);
    }
  };

  // Fetch the current user's email
  const fetchCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
      setCurrentUserEmail(user.data.data.email);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    fetchBookDetails();
    fetchCurrentUser();
  }, []);

  if (!book) {
    return (
      <View style={styles.container}>
        <Text>Book not found</Text>
      </View>
    );
  }

  const handleRentRequest = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
      const userEmail = user.data.data.email;

      const res = await axios.post(`${BASE_URL}/api/submit-rent-request`, {
        userEmail,
        book_id: book.book_id,
        book_name: book.book_name
      });

      if (res.data.status === 'Ok') {
        Alert.alert('Success', 'Rent request submitted. Waiting for admin approval.');
      } else {
        Alert.alert('Error', res.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rent request');
    }
  };

  // Optional: Add a return book function (if the current user is the one who rented it)
  const handleReturnBook = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/api/return-book`, { book_id: book.book_id });
      if (res.data.status === 'Ok') {
        Alert.alert('Success', 'Book returned successfully');
        fetchBookDetails(); // Refresh book details
      } else {
        Alert.alert('Error', res.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to return book');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#146C94" />
        </Pressable>
      </View>

      <View style={styles.coverContainer}>
        <Image
          source={{
            uri: book.cover_image || 'https://images.unsplash.com/photo-1599179416084-91afc57e96f2?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
          }}
          style={styles.cover}
        />
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{book.book_name}</Text>
        <Text style={styles.author}>{book.author_name}</Text>

        <View style={styles.ratingContainer}>
          <Star size={20} color="#FFB800" fill="#FFB800" />
          <Text style={styles.rating}>5</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Year</Text>
            <Text style={styles.statValue}>{book.year_of_publication}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Pages</Text>
            <Text style={styles.statValue}>{book.pages}</Text>
          </View>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>About the Book</Text>
          <Text style={styles.description}>{book.preface}</Text>
        </View>

        {book.available ? (
          <Pressable style={styles.rentButton} onPress={handleRentRequest}>
            <Text style={styles.rentButtonText}>Rent Now</Text>
          </Pressable>
        ) : (
          <View style={styles.readingContainer}>
            <Text style={styles.readingText}>
              Reading by {book.owned_by === currentUserEmail ? 'You' : book.owned_by}
            </Text>
            {book.owned_by === currentUserEmail && (
              <Pressable style={styles.returnButton} onPress={handleReturnBook}>
                <Text style={styles.returnButtonText}>Return Book</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F1F1',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#AFD3E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cover: {
    width: 200,
    height: 300,
    borderRadius: 12,
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: '#AFD3E2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#146C94',
    marginBottom: 8,
  },
  author: {
    fontSize: 16,
    color: '#19A7CE',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  rating: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: '#F6F1F1',
    borderRadius: 12,
    padding: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#19A7CE',
  },
  statLabel: {
    fontSize: 12,
    color: '#19A7CE',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#146C94',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 24,
    color: '#146C94',
  },
  rentButton: {
    backgroundColor: '#146C94',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rentButtonText: {
    color: '#F6F1F1',
    fontSize: 16,
    fontWeight: '600',
  },
  readingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  readingText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 10,
  },
  returnButton: {
    backgroundColor: '#19A7CE',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#F6F1F1',
    fontSize: 16,
    fontWeight: '600',
  },
});