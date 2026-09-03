import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Heart } from 'lucide-react-native';
import axios from 'axios';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const API_URL = API_BASE_URL;

type AuthorBooksRouteParams = {
  id: string;
};

export default function AuthorBooks() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: AuthorBooksRouteParams }, 'params'>>();
  const { id: authorId } = route.params;
  type Author = {
    author_id: string;
    name: string;
    photo: string;
    bio: string;
    books: number;
    followers?: string;
    ministry?: string;
  };
  
  const [author, setAuthor] = useState<Author | null>(null);
  type Book = {
    book_id: string;
    book_name: string;
    cover_image?: string;
    year_of_publication?: string;
    rating?: number | string;
    author_name?: string;
    likes?: number;
  };
  const [authorBooks, setAuthorBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            photo: 'https://plus.unsplash.com/premium_photo-1770559520599-881a099cc6e9?q=80&w=1976&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            bio: 'No bio available',
            books: booksRes.data.data.length,
            followers: 'Unknown',
          });
        } else {
          setError('No author or books found');
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching author:', error.message);
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const err = error as { response: any };
            console.error('Error response data:', err.response.data);
            console.error('Error response status:', err.response.status);
        }
      } else {
        console.error('Error fetching author:', error);
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
      if (typeof error === 'object' && error !== null && 'message' in error) {
        // @ts-ignore
        console.error('Error fetching author books:', error.message);
      } else {
        console.error('Error fetching author books:', error);
      }
      if (typeof error === 'object' && error !== null && 'response' in error) {
        // @ts-ignore
        console.error('Error response data:', error.response.data);
        // @ts-ignore
        console.error('Error response status:', error.response.status);
      }
    }
  };

  useEffect(() => {
    fetchAuthor();
    fetchAuthorBooks();
  }, [authorId]);

  const navigateToBookDetails = (book:any) => {
    navigation.navigate('BookDetails', { book: book });
  };

  if (loading) {
    return <LoadingScreen message="Loading author..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.outer_container}>
    <ScrollView
      style={styles.scrollView} // Style for the ScrollView container
      contentContainerStyle={styles.contentContainer} // Style for the content inside ScrollView
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.tint} />
        </Pressable>
      </View>

      <View style={styles.profileContainer}>
        <Image source={{ uri: author?.photo || 'https://plus.unsplash.com/premium_photo-1770559520599-881a099cc6e9?q=80&w=1976&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }} style={styles.profilePhoto} />
        <Text style={styles.name}>{author?.name ?? ''}</Text>
        <Text style={styles.bio}>{author?.bio || 'No bio available'}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{author?.books || 0}</Text>
            <Text style={styles.statLabel}>Available Books</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{author?.ministry || '0'}</Text>
            <Text style={styles.statLabel}>Ministry</Text>
          </View>
        </View>
      </View>

      <View style={styles.booksContainer}>
        <Text style={styles.sectionTitle}>Books by {author?.name}</Text>
        <View style={styles.booksGrid}>
          {authorBooks.length > 0 ? (
            authorBooks.map((book) => (
              <Pressable
                key={book.book_id}
                style={styles.bookCard}
                onPress={() => navigateToBookDetails(book)}
              >
                <Image source={{ uri: book.cover_image || 'https://images.unsplash.com/photo-1667059634989-bee0954711f4?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }} style={styles.bookCover} />
                <View style={styles.bookInfo}>
                  <Text 
                    numberOfLines={2} 
                    ellipsizeMode="tail" 
                    style={styles.bookTitle}
                  >
                    {book.book_name}
                  </Text>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text style={styles.bookYear}>{book.year_of_publication || 'N/A'}</Text>
                    <View style={styles.likesContainer}>
                      <Heart size={15} color={colors.primary} fill={colors.primary} />
                      <Text style={styles.bookRating}>{book.likes || 0}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.noBooksText}>No books available</Text>
          )}
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  outer_container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  likesContainer: {
    top: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: colors.theme === 'dark' ? colors.surface : '#AFD3E2',
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
    color: colors.tint,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#AFD3E2',
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
    backgroundColor: colors.secondary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.tint,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.secondary,
  },
  booksContainer: {
    padding: 24,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.tint,
    marginBottom: 16,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bookCard: {
    width: '48%',
    backgroundColor: colors.theme === 'dark' ? colors.surface : '#AFD3E2',
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
    color: colors.tint,
    marginBottom: 4,
    height: 40,
  },
  bookYear: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  bookRating: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.tint,
  },
  noBooksText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.tint,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
});