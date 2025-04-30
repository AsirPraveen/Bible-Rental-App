import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra.apiUrl;

export default function AuthorBooks() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id: authorId } = route.params;
  const [author, setAuthor] = useState(null);
  const [authorBooks, setAuthorBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAuthor = async () => {
    try {
      console.log(`Fetching author with ID: ${authorId}`);
      const res = await axios.get(`${API_URL}/api/authors/${authorId}`);
      console.log('Author API Response:', res.data);
      if (res.data.status === 'Ok') {
        setAuthor(res.data.data);
      } else {
        console.warn('Author not found, falling back to books data');
        const booksRes = await axios.get(`${API_URL}/api/authors/${authorId}/books`);
        if (booksRes.data.status === 'Ok' && booksRes.data.data.length > 0) {
          const firstBook = booksRes.data.data[0];
          setAuthor({
            author_id: authorId,
            name: firstBook.author_name,
            photo: 'https://via.placeholder.com/120',
            bio: 'No bio available',
            books: booksRes.data.data.length,
            followers: 'Unknown',
          });
        } else {
          setError('No author or books found');
        }
      }
    } catch (error) {
      console.error('Error fetching author:', error.message);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      setError('Failed to load author. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthorBooks = async () => {
    try {
      console.log(`Fetching books for author ID: ${authorId}`);
      const res = await axios.get(`${API_URL}/api/authors/${authorId}/books`);
      console.log('Books API Response:', res.data);
      if (res.data.status === 'Ok') {
        setAuthorBooks(res.data.data);
      } else {
        console.error('Error fetching author books:', res.data.data);
      }
    } catch (error) {
      console.error('Error fetching author books:', error.message);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
    }
  };

  useEffect(() => {
    fetchAuthor();
    fetchAuthorBooks();
  }, [authorId]);

  const navigateToBookDetails = (book) => {
    navigation.navigate('BookDetails', { book: book });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#146C94" />
        <Text style={styles.loadingText}>Loading author...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView} // Style for the ScrollView container
      contentContainerStyle={styles.contentContainer} // Style for the content inside ScrollView
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#146C94" />
        </Pressable>
      </View>

      <View style={styles.profileContainer}>
        <Image source={{ uri: author.photo || 'https://via.placeholder.com/120' }} style={styles.profilePhoto} />
        <Text style={styles.name}>{author.name}</Text>
        <Text style={styles.bio}>{author.bio || 'No bio available'}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{author.books || 0}</Text>
            <Text style={styles.statLabel}>Books</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{author.followers || '0'}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>
      </View>

      <View style={styles.booksContainer}>
        <Text style={styles.sectionTitle}>Books by {author.name}</Text>
        <View style={styles.booksGrid}>
          {authorBooks.length > 0 ? (
            authorBooks.map((book) => (
              <Pressable
                key={book.book_id}
                style={styles.bookCard}
                onPress={() => navigateToBookDetails(book)}
              >
                <Image source={{ uri: book.cover_image || 'https://images.unsplash.com/photo-1599179416084-91afc57e96f2?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }} style={styles.bookCover} />
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle}>{book.book_name}</Text>
                  <Text style={styles.bookYear}>{book.year_of_publication || 'N/A'}</Text>
                  <Text style={styles.bookRating}>★ {book.rating || 'N/A'}</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.noBooksText}>No books available</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F6F1F1',
  },
  contentContainer: {
    justifyContent: 'center', // Moved here
    alignItems: 'center',     // Moved here
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 0,
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#AFD3E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    padding: 24,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#146C94',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#19A7CE',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#AFD3E2',
    borderRadius: 12,
    padding: 16,
    width: '80%',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#19A7CE',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#146C94',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#19A7CE',
  },
  booksContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#146C94',
    marginBottom: 16,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bookCard: {
    width: '48%',
    backgroundColor: '#AFD3E2',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  bookCover: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#146C94',
    marginBottom: 4,
  },
  bookYear: {
    fontSize: 12,
    color: '#19A7CE',
    marginBottom: 4,
  },
  bookRating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#146C94',
  },
  noBooksText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#146C94',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
});