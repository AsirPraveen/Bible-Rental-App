import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet, Pressable, Platform, StatusBar, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Heart } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const BASE_URL = API_BASE_URL;

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
  owned_by?: string[];
};

export default function Wishlist() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const [favouriteBooks, setFavouriteBooks] = useState<Book[]>([]);
  const [likedVerses, setLikedVerses] = useState<any[]>([]);
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'books' | 'verses' | 'songs'>('books');
  const [loading, setLoading] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    type: 'book' | 'verse' | 'song';
    id: string;
    title: string;
  } | null>(null);

  const fetchLocalWishlist = useCallback(async () => {
    try {
      const [savedVerses, savedSongs] = await Promise.all([
        AsyncStorage.getItem('@liked_verses'),
        AsyncStorage.getItem('@liked_songs')
      ]);
      const parsedVerses = savedVerses ? JSON.parse(savedVerses) : [];
      const parsedSongs = savedSongs ? JSON.parse(savedSongs) : [];

      // Sort local lists from newest to oldest based on likedAt timestamp
      parsedVerses.sort((a: any, b: any) => new Date(b.likedAt || 0).getTime() - new Date(a.likedAt || 0).getTime());
      parsedSongs.sort((a: any, b: any) => new Date(b.likedAt || 0).getTime() - new Date(a.likedAt || 0).getTime());

      setLikedVerses(parsedVerses);
      setLikedSongs(parsedSongs);
    } catch (e) {
      console.error('Error fetching local wishlist:', e);
    }
  }, []);

  const fetchBooksWishlist = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const [userRes, booksRes] = await Promise.all([
          axios.post(`${BASE_URL}/api/auth/userdata`, { token }),
          axios.get(`${BASE_URL}/api/books`)
        ]);
        
        if (userRes.data.status === 'Ok' && booksRes.data.status === 'Ok') {
          const userData = userRes.data.data;
          
          // Sync database state to AsyncStorage & local hooks
          if (userData.likedVerses) {
            await AsyncStorage.setItem('@liked_verses', JSON.stringify(userData.likedVerses));
            setLikedVerses(userData.likedVerses);
          }
          if (userData.likedSongs) {
            await AsyncStorage.setItem('@liked_songs', JSON.stringify(userData.likedSongs));
            setLikedSongs(userData.likedSongs);
          }

          const favouriteBookIds = userData.favouriteBooks || [];
          const allBooks = booksRes.data.data;
          const favourites = allBooks.filter((book: Book) =>
            favouriteBookIds.includes(parseInt(book.book_id))
          );
          
          // Sort books from new to old matching the reversed order in favouriteBookIds
          const orderedFavourites = [...favourites].sort((a, b) => {
            const indexA = favouriteBookIds.indexOf(parseInt(a.book_id));
            const indexB = favouriteBookIds.indexOf(parseInt(b.book_id));
            return indexA - indexB;
          });

          setFavouriteBooks(orderedFavourites);
        }
      }
    } catch (error) {
      console.error('Error fetching books wishlist:', error);
    } finally {
      setLoadingBooks(false);
    }
  }, []);

  // Sync data when focused
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadAllData = async () => {
        // Load local data instantly
        await fetchLocalWishlist();
        if (active) setLoading(false);

        // Load remote books/sync liked items in the background
        setLoadingBooks(true);
        await fetchBooksWishlist();
      };
      loadAllData();
      return () => { active = false; };
    }, [fetchLocalWishlist, fetchBooksWishlist])
  );

  const navigateToBookDetails = (book: Book) => {
    navigation.navigate('BookDetails', { book });
  };

  const removeBookFromWishlist = async (bookId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      // The server takes the identity from the bearer token.
      const res = await axios.post(
        `${BASE_URL}/api/toggle-favourite`,
        {
          book_id: bookId,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.data.status === 'Ok') {
        setFavouriteBooks(prev => prev.filter(b => b.book_id.toString() !== bookId.toString()));
      }
    } catch (e) {
      console.error('Error removing book from wishlist:', e);
    }
  };

  const removeLikedVerse = async (key: string) => {
    const target = likedVerses.find((v: any) => v.key === key);
    const updated = likedVerses.filter((v: any) => v.key !== key);
    setLikedVerses(updated);
    try {
      await AsyncStorage.setItem('@liked_verses', JSON.stringify(updated));
      const token = await AsyncStorage.getItem('token');
      if (token && target) {
        await axios.post(
          `${BASE_URL}/api/users/toggle-liked-verse`,
          target,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (e) {
      console.error('Failed to remove liked verse', e);
    }
  };

  const removeLikedSong = async (id: string) => {
    const updated = likedSongs.filter((s: any) => s._id !== id);
    setLikedSongs(updated);
    try {
      await AsyncStorage.setItem('@liked_songs', JSON.stringify(updated));
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await axios.post(
          `${BASE_URL}/api/users/toggle-liked-song`,
          { songId: id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (e) {
      console.error('Failed to remove liked song', e);
    }
  };

  const renderBookCard = ({ item }: { item: Book }) => {
    return (
      <Pressable 
        style={styles.bookCard} 
        onPress={() => navigateToBookDetails(item)}
        onLongPress={() => setDeleteConfirmItem({ type: 'book', id: item.book_id, title: item.book_name })}
      >
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const renderVerseCard = ({ item }: { item: any }) => {
    return (
      <Pressable 
        style={styles.verseCard} 
        onLongPress={() => setDeleteConfirmItem({ type: 'verse', id: item.key, title: item.citation })}
      >
        <View style={styles.verseHeaderRow}>
          <Text style={styles.verseCardCitation}>{item.citation}</Text>
          {item.likedAt ? (
            <Text style={styles.verseCardDate}>{formatDate(item.likedAt)}</Text>
          ) : null}
        </View>
        <Text style={styles.verseCardText}>{item.text}</Text>
      </Pressable>
    );
  };

  const renderSongCard = ({ item }: { item: any }) => {
    return (
      <Pressable 
        style={styles.songCard} 
        onPress={() => {
          navigation.navigate('SongDetails', { songId: item._id });
        }}
        onLongPress={() => setDeleteConfirmItem({ type: 'song', id: item._id, title: item.titleTamil || item.titleEnglish })}
      >
        <Text numberOfLines={1} style={styles.songCardTitle}>{item.titleTamil || item.titleEnglish}</Text>
        {item.author ? <Text style={styles.songCardAuthor}>{item.author}</Text> : null}
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
              {activeTab === 'books' && (
                favouriteBooks.length > 0
                  ? `${favouriteBooks.length} saved ${favouriteBooks.length === 1 ? 'book' : 'books'}`
                  : 'Your saved books'
              )}
              {activeTab === 'verses' && (
                likedVerses.length > 0
                  ? `${likedVerses.length} saved ${likedVerses.length === 1 ? 'verse' : 'verses'}`
                  : 'Your saved verses'
              )}
              {activeTab === 'songs' && (
                likedSongs.length > 0
                  ? `${likedSongs.length} saved ${likedSongs.length === 1 ? 'song' : 'songs'}`
                  : 'Your saved songs'
              )}
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* ── Content container ───────────────────────────────── */}
        <View style={styles.container}>
          {/* Tab Switcher Bar */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'books' && styles.tabButtonActive]}
              onPress={() => setActiveTab('books')}
            >
              <Text style={[styles.tabText, activeTab === 'books' && styles.tabTextActive]}>Books</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'verses' && styles.tabButtonActive]}
              onPress={() => setActiveTab('verses')}
            >
              <Text style={[styles.tabText, activeTab === 'verses' && styles.tabTextActive]}>Verses</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'songs' && styles.tabButtonActive]}
              onPress={() => setActiveTab('songs')}
            >
              <Text style={[styles.tabText, activeTab === 'songs' && styles.tabTextActive]}>Songs</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'books' && (
            loadingBooks && favouriteBooks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.emptyTitle, { marginTop: 10 }]}>Loading Books...</Text>
              </View>
            ) : favouriteBooks.length > 0 ? (
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
            )
          )}

          {activeTab === 'verses' && (
            likedVerses.length > 0 ? (
              <FlatList
                data={likedVerses}
                renderItem={renderVerseCard}
                keyExtractor={(item) => item.key}
                contentContainerStyle={{ paddingVertical: 8 }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Heart color={colors.secondary} size={72} />
                <Text style={styles.emptyTitle}>No Liked Verses</Text>
                <Text style={styles.emptySubtext}>
                  Tap the heart icon on any verse detail modal to save it here
                </Text>
              </View>
            )
          )}

          {activeTab === 'songs' && (
            likedSongs.length > 0 ? (
              <FlatList
                data={likedSongs}
                renderItem={renderSongCard}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingVertical: 8 }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Heart color={colors.secondary} size={72} />
                <Text style={styles.emptyTitle}>No Liked Songs</Text>
                <Text style={styles.emptySubtext}>
                  Tap the heart icon on any song lyrics screen to save it here
                </Text>
              </View>
            )
          )}
        </View>
      </LinearGradient>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmItem !== null}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setDeleteConfirmItem(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setDeleteConfirmItem(null)} />
          <View style={styles.confirmCard}>
            <Heart color="#ff4757" size={48} fill="#ff4757" style={{ marginBottom: 16 }} />
            <Text style={styles.confirmTitle}>Remove from List</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to remove "{deleteConfirmItem?.title}" from your wishlist?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.confirmBtn, styles.confirmBtnCancel]} 
                onPress={() => setDeleteConfirmItem(null)}
              >
                <Text style={styles.confirmBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, styles.confirmBtnYes]} 
                onPress={async () => {
                  const item = deleteConfirmItem;
                  if (item) {
                    setDeleteConfirmItem(null);
                    if (item.type === 'book') {
                      await removeBookFromWishlist(item.id);
                    } else if (item.type === 'verse') {
                      await removeLikedVerse(item.id);
                    } else if (item.type === 'song') {
                      await removeLikedSong(item.id);
                    }
                  }
                }}
              >
                <Text style={styles.confirmBtnTextYes}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
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

  // ── Custom Tabs ────────────────────────────────────────────────
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(20, 108, 148, 0.06)',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.theme === 'dark' ? colors.tint : colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(20, 108, 148, 0.6)',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  verseCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  verseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verseCardCitation: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.tint,
  },
  verseCardDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  verseCardText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  songCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  songCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  songCardAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // ── Confirmation Modal Styles ──────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCard: {
    backgroundColor: colors.surface,
    width: '85%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
  },
  confirmBtnYes: {
    backgroundColor: '#ff4757',
  },
  confirmBtnTextCancel: {
    color: colors.text,
    fontWeight: '600',
  },
  confirmBtnTextYes: {
    color: '#fff',
    fontWeight: '600',
  },
});