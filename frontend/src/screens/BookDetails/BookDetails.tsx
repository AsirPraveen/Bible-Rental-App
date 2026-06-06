import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, Alert, Modal, Dimensions, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Star, X, Heart } from 'lucide-react-native'; // Changed Star to Heart for likes display
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = Constants?.expoConfig?.extra?.apiUrl;
const cloudinaryCloudName = Constants.expoConfig?.extra?.cloudinaryCloudName ?? '';

const getCloudinaryUrl = (publicId: string) => {
  return `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${publicId}`;
};

const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH * 0.6; // 60% of screen width for carousel items

type Book = {
  book_id: string;
  book_name: string;
  author_name: string;
  year_of_publication: string;
  pages: number;
  preface: string;
  cover_image?: string;
  thumbnail1?: string;
  thumbnail2?: string;
  available: boolean;
  owned_by?: string;
  likes?: number; // Added likes field
};

type RouteParams = {
  book: Book;
};

export default function BookDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { book: initialBook } = route.params as { book: Book };
  const { isGuest } = useAuth();
  const [book, setBook] = useState(initialBook);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string | undefined; publicId: string } | null>(null);
  const [isFavourite, setIsFavourite] = useState(false); // Track if book is in wishlist

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

      const userData = user.data.data;
      const pendingRequest = userData.books_rented.find(
        (request: any) => request.book_id === initialBook.book_id && request.status === 'pending'
      );
      setHasPendingRequest(!!pendingRequest);

      // Check if book is in favouriteBooks
      setIsFavourite(userData.favouriteBooks.includes(parseInt(initialBook.book_id)));
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    fetchBookDetails();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchBookDetails();
      fetchCurrentUser();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!book) {
    return (
      <View style={styles.container}>
        <Text>Book not found</Text>
      </View>
    );
  }

  const handleRentRequest = async () => {
    // Block guests
    if (isGuest) {
      Alert.alert(
        '🔒 Login Required',
        'Guests cannot rent books. Please login to unlock full features.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => (navigation as any).navigate('Login') },
        ]
      );
      return;
    }
    Alert.alert(
      'Confirm Rent Request',
      'Are you sure you want to request this book?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
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
                Alert.alert('Success', 'Rent request submitted. Waiting for admin approval. Email will be sent to you once approved or rejected.');
                setHasPendingRequest(true);
              } else {
                Alert.alert('Error', res.data.data);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to submit rent request');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleReturnBook = async () => {
    if (isGuest) return; // guests cannot return books they don't own
    Alert.alert(
      'Confirm Return',
      'Are you sure you want to return this book?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const res = await axios.post(`${BASE_URL}/api/return-book`, { book_id: book.book_id });
              if (res.data.status === 'Ok') {
                Alert.alert('Success', 'Book returned successfully');
                fetchBookDetails();
                fetchCurrentUser();
              } else {
                Alert.alert('Error', res.data.data);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to return book');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleFavourite = async () => {
    if (isGuest) {
      Alert.alert(
        '🔒 Login Required',
        'Please login to save books to your wishlist.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => (navigation as any).navigate('Login') },
        ]
      );
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/toggle-favourite`, {
        userEmail: currentUserEmail,
        book_id: book.book_id,
      });

      if (res.data.status === 'Ok') {
        setIsFavourite(!isFavourite);
        Alert.alert('Success', `Book ${isFavourite ? 'removed from' : 'added to'} wishlist.`);
        // Refresh both book details and user data to get updated likes count
        await fetchBookDetails();
        await fetchCurrentUser();
      } else {
        Alert.alert('Error', res.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

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

  const getPublicId = (url: string | undefined) => {
    if (!url) return 'default_image';
    const regex = /\/upload\/v\d+\/(.+)\.\w+$/;
    const match = url.match(regex);
    return match ? match[1] : 'default_image';
  };

  const images = [
    { url: book.cover_image, publicId: getPublicId(book.cover_image) },
    { url: book.thumbnail1, publicId: getPublicId(book.thumbnail1) },
    { url: book.thumbnail2, publicId: getPublicId(book.thumbnail2) },
  ].filter(img => img.url);

  return (
    <SafeAreaView style={styles.outer_container}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.bg} />
          </Pressable>
          <Pressable onPress={toggleFavourite} style={styles.favouriteButton}>
            <Heart size={24} color={isFavourite ? Colors.bg : '#666'} fill={isFavourite ? Colors.bg : 'none'} />
          </Pressable>
        </View>

        <View style={styles.carouselContainer}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              snapToInterval={CAROUSEL_ITEM_WIDTH + 16}
              decelerationRate="fast"
            >
              {images.map((item, index) => {
                // const cldImg = cld.image(item.publicId);
                return (
                  <Pressable
                    key={index}
                    style={styles.carouselItem}
                    onPress={() => {
                      setSelectedImage(item);
                      setModalVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: getCloudinaryUrl(item.publicId) }}
                      style={styles.carouselImage}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1667059634989-bee0954711f4?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
              }}
              style={styles.cover}
            />
          )}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{book.book_name}</Text>
          <Text style={styles.author}>{book.author_name}</Text>

          {/* Updated to show likes instead of rating */}
          <View style={styles.likesContainer}>
            <Heart size={20} color="#FF6B6B" fill="#FF6B6B" />
            <Text style={styles.likesCount}>{book.likes || 0}</Text>
            <Text style={styles.likesLabel}>likes</Text>
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

      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <X size={30} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <View style={styles.fullScreenImageContainer}>
              <Image
                source={{ uri: getCloudinaryUrl(selectedImage.publicId) }}
                style={styles.fullScreenImage}
              />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.active,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favouriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.active,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CAROUSEL_ITEM_WIDTH) / 2,
  },
  carouselItem: {
    width: CAROUSEL_ITEM_WIDTH,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  carouselImage: {
    width: CAROUSEL_ITEM_WIDTH,
    height: 300,
    borderRadius: 12,
  },
  cover: {
    width: 200,
    height: 300,
    borderRadius: 12,
  },
  noImageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 5,
  },
  fullScreenImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
    height: '100%',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.5,
    resizeMode: 'contain',
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
  // Updated styles for likes instead of rating
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  likesCount: {
    marginLeft: 8,
    marginRight: 4,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.bg,
  },
  likesLabel: {
    fontSize: 14,
    color: '#19A7CE',
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
    backgroundColor: '#FFA500',
  },
  pendingText: {
    color: Colors.inactive,
  },
  readingButton: {
    backgroundColor: '#28A745',
    marginBottom: 10,
  },
  readingText: {
    color: Colors.inactive,
  },
  rentedButton: {
    backgroundColor: '#FF6B6B',
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