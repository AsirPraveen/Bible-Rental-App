import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet, Pressable, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Heart } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const BASE_URL = Constants?.expoConfig?.extra?.apiUrl;

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
};

export default function Wishlist() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [favouriteBooks, setFavouriteBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const userRes = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
      const userData = userRes.data.data;

      const favouriteBookIds = userData.favouriteBooks || [];
      const booksRes = await axios.get(`${BASE_URL}/api/books`);
      const allBooks = booksRes.data.data;
      const favourites = allBooks.filter((book: Book) =>
        favouriteBookIds.includes(parseInt(book.book_id))
      );
      setFavouriteBooks(favourites);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
    const interval = setInterval(fetchWishlist, 5000);
    return () => clearInterval(interval);
  }, [fetchWishlist]);

  const navigateToBookDetails = (book: Book) => {
    navigation.navigate('BookDetails', { book });
  };

  const renderBookCard = ({ item }: { item: Book }) => {
    return (
      <Pressable style={styles.bookCard} onPress={() => navigateToBookDetails(item)}>
        <Image
          source={{ uri: item.cover_image || 'https://images.unsplash.com/photo-1667059634989-bee0954711f4?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
          style={styles.bookCover}
        />
        <View style={styles.bookInfo}>
          <Text numberOfLines={1} style={styles.bookTitle}>{item.book_name}</Text>
          <Text numberOfLines={1} style={styles.bookAuthor}>{item.author_name}</Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading wishlist..." />;
  }

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {/* ── Gradient Header ────────────────────────────────── */}
        <View style={styles.headerContainer}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#F6F1F1" />
          </Pressable>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>Wishlist</Text>
            <Text style={styles.subtitleText}>
              {favouriteBooks.length > 0
                ? `${favouriteBooks.length} favourite ${favouriteBooks.length === 1 ? 'book' : 'books'}`
                : 'Your saved books'}
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* ── Content container ───────────────────────────────── */}
        <View style={styles.container}>
          {favouriteBooks.length > 0 ? (
            <FlatList
              data={favouriteBooks}
              renderItem={renderBookCard}
              keyExtractor={(item) => item.book_id.toString()}
              contentContainerStyle={styles.booksList}
              numColumns={2}
              columnWrapperStyle={styles.bookRow}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Heart color={colors.secondary} size={72} />
              <Text style={styles.emptyTitle}>No Favourites Yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the heart icon on any book to save it here
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },

  // ── Header ─────────────────────────────────────────────────────
  headerContainer: {
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: '#F6F1F1',
    textAlign: 'center',
    opacity: 0.85,
  },

  // ── Main container ─────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // ── Book grid ──────────────────────────────────────────────────
  booksList: {
    padding: 16,
  },
  bookRow: {
    justifyContent: 'space-between',
    gap: 12,
  },
  bookCard: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookCover: {
    width: '100%',
    height: 190,
    resizeMode: 'cover',
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // ── Empty state ────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});