import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, Alert, Modal, Dimensions, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Star, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { AdvancedImage } from 'cloudinary-react-native';
import { Cloudinary } from '@cloudinary/url-gen';

const BASE_URL = Constants.expoConfig.extra.apiUrl;

const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

// Initialize Cloudinary instance
const cld = new Cloudinary({
  cloud: {
    cloudName: 'darllfja9',
  },
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH * 0.6; // 60% of screen width for carousel items

export default function BookDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { book: initialBook } = route.params;
  const [book, setBook] = useState(initialBook);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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

      const userData = user.data.data;
      const pendingRequest = userData.books_rented.find(
        (request: any) => request.book_id === initialBook.book_id && request.status === 'pending'
      );
      setHasPendingRequest(!!pendingRequest);
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
        setHasPendingRequest(true);
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
        fetchBookDetails();
        fetchCurrentUser();
      } else {
        Alert.alert('Error', res.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to return book');
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

  // Extract public ID from Cloudinary URL or use fallback
  const getPublicId = (url: string | undefined) => {
    if (!url) return 'default_image'; // Fallback public ID
    const regex = /\/upload\/v\d+\/(.+)\.\w+$/;
    const match = url.match(regex);
    return match ? match[1] : 'default_image';
  };

  // Prepare image data for carousel
  const images = [
    { url: book.cover_image, publicId: getPublicId(book.cover_image) },
    { url: book.thumbnail1, publicId: getPublicId(book.thumbnail1) },
    { url: book.thumbnail2, publicId: getPublicId(book.thumbnail2) },
  ].filter(img => img.url); // Filter out undefined URLs

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.bg} />
          </Pressable>
        </View>

        <View style={styles.carouselContainer}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              snapToInterval={CAROUSEL_ITEM_WIDTH + 16} // Item width + margin
              decelerationRate="fast"
            >
              {images.map((item, index) => {
                const cldImg = cld.image(item.publicId);
                return (
                  <Pressable
                    key={index}
                    style={styles.carouselItem}
                    onPress={() => {
                      setSelectedImage(item);
                      setModalVisible(true);
                    }}
                  >
                    <AdvancedImage
                      cldImg={cldImg}
                      style={styles.carouselImage}
                      onError={(error) => console.log(`Image ${index} error:`, error)}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Image
              source={{
              uri: 'https://images.unsplash.com/photo-1599179416084-91afc57e96f2?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
              }}
              style={styles.cover}
            />
          )}
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

      {/* Full-screen image modal */}
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
              <AdvancedImage
                cldImg={cld.image(selectedImage.publicId)}
                style={styles.fullScreenImage}
                onError={(error) => console.log('Full screen image error:', error)}
              />
            </View>
          )}
        </View>
      </Modal>
    </>
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
  carouselContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CAROUSEL_ITEM_WIDTH) / 2, // Center items
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
    height: SCREEN_WIDTH * 1.5, // Adjust aspect ratio as needed
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