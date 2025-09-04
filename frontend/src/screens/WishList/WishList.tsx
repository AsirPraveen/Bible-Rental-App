import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet, Pressable, ActivityIndicator, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

const BASE_URL = Constants?.expoConfig?.extra?.apiUrl;

const Colors = {
  bg: '#146C94',
  active: '#AFD3E2',
  inactive: '#F6F1F1',
  transparent: 'transparent',
};

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
  const [favouriteBooks, setFavouriteBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('No token found');
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
          source={{ uri: item.cover_image || 'https://images.unsplash.com/photo-1599179416084-91afc57e96f2?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
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
          <Text style={styles.headerTitle}>Wishlist</Text>
        </View>

        {favouriteBooks.length > 0 ? (
          <FlatList
            data={favouriteBooks}
            renderItem={renderBookCard}
            keyExtractor={(item) => item.book_id.toString()}
            contentContainerStyle={styles.booksList}
            numColumns={2}
            columnWrapperStyle={styles.bookRow}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No favourite books yet</Text>
              </View>
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No favourite books yet</Text>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

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
  booksList: {
    padding: 15,
    paddingTop: 0, // Adjust padding to account for header
  },
  bookRow: {
    justifyContent: 'space-between',
  },
  bookCard: {
    width: '48%',
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
  bookCover: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
  },
  bookInfo: {
    paddingTop: 10,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.bg,
    marginBottom: 5,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
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