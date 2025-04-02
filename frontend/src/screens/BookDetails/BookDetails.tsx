import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Star } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig.extra.apiUrl; // Replace with your IP or use .env

const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

export default function BookDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { book: initialBook } = route.params;
  const [book, setBook] = useState(initialBook);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Fetch the latest book data and user data
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

  const fetchCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
      setCurrentUserEmail(user.data.data.email);

      // Check if the user has a pending request for this book
      const userData = user.data.data;
      const pendingRequest = userData.books_rented.find(
        (request: any) => request.book_id === initialBook.book_id && request.status === 'pending'
      );
      setHasPendingRequest(!!pendingRequest);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Fetch data on mount and whenever the book or user data might change
  useEffect(() => {
    fetchBookDetails();
    fetchCurrentUser();
  }, []);

  // Poll for updates every 5 seconds to ensure the button updates dynamically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBookDetails();
      fetchCurrentUser();
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
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
        book_name: book.book_name,
      });

      if (res.data.status === 'Ok') {
        Alert.alert('Success', 'Rent request submitted. Waiting for admin approval.');
        setHasPendingRequest(true); // Update state to reflect pending request
      } else {
        Alert.alert('Error', res.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rent request');
    }
  };

  const handleReturnBook = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/api/return-book`, { book_id: book.book_id });
      if (res.data.status === 'Ok') {
        Alert.alert('Success', 'Book returned successfully');
        fetchBookDetails(); // Refresh book details
        fetchCurrentUser(); // Refresh user data
      } else {
        Alert.alert('Error', res.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to return book');
    }
  };

  // Determine the button state
  const renderButton = () => {
    if (book.available && !hasPendingRequest) {
      return (
        <Pressable style={styles.rentButton} onPress={handleRentRequest}>
          <Text style={styles.rentButtonText}>Rent Now</Text>
        </Pressable>
      );
    } else if (hasPendingRequest) {
      return (
        <View style={[styles.rentButton, styles.pendingButton]}>
          <Text style={[styles.rentButtonText, styles.pendingText]}>Asked for rent</Text>
        </View>
      );
    } else if (!book.available && book.owned_by === currentUserEmail) {
      return (
        <View style={styles.buttonContainer}>
          <View style={[styles.rentButton, styles.readingButton]}>
            <Text style={[styles.rentButtonText, styles.readingText]}>You are reading</Text>
          </View>
          <Pressable style={styles.returnButton} onPress={handleReturnBook}>
            <Text style={styles.returnButtonText}>Return Book</Text>
          </Pressable>
        </View>
      );
    } else if (!book.available) {
      return (
        <View style={[styles.rentButton, styles.rentedButton]}>
          <Text style={[styles.rentButtonText, styles.rentedText]}>
            Rented by {book.owned_by}
          </Text>
        </View>
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.bg} />
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

        {renderButton()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.inactive,
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
    backgroundColor: Colors.active,
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
    backgroundColor: Colors.active,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.bg,
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
    color: Colors.bg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: Colors.inactive,
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
    color: Colors.bg,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.bg,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 24,
    color: Colors.bg,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  rentButton: {
    backgroundColor: Colors.bg,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rentButtonText: {
    color: Colors.inactive,
    fontSize: 16,
    fontWeight: '600',
  },
  pendingButton: {
    backgroundColor: '#FFA500', // Orange for pending
  },
  pendingText: {
    color: Colors.inactive,
  },
  readingButton: {
    backgroundColor: '#28A745', // Green for "You are reading"
    marginBottom: 10,
  },
  readingText: {
    color: Colors.inactive,
  },
  rentedButton: {
    backgroundColor: '#FF6B6B', // Red for "Rented by"
  },
  rentedText: {
    color: Colors.inactive,
  },
  returnButton: {
    backgroundColor: '#19A7CE',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  returnButtonText: {
    color: Colors.inactive,
    fontSize: 16,
    fontWeight: '600',
  },
});