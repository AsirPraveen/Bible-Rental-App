import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ImageBackground, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import getStyles from "./style";
import { useTheme } from "../../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { TextInput, ScrollView, Alert, Modal, Platform } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Bell, Heart } from 'lucide-react-native';
import { useNavigation } from "@react-navigation/native";
import { FlatList } from "react-native-gesture-handler";
import Constants from 'expo-constants';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated } from 'react-native';
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrganizationContext';
import { API_BASE_URL } from '../../config/api';

const API_URL = API_BASE_URL;
const APP_NAME = Constants.expoConfig?.extra?.appName ?? '';

const CATEGORIES = [
  { id: '1', name: 'Bible', color: '#146C94' },
  { id: '2', name: 'Prayer', color: '#146C94' },
  { id: '3', name: 'Fellowship', color: '#146C94' },
  { id: '4', name: 'Faith', color: '#146C94' },
  { id: '5', name: 'Brotherhood', color: '#146C94' },
  { id: '6', name: 'Worship', color: '#146C94' },
  { id: '7', name: 'Grace', color: '#146C94' },
  { id: '8', name: 'Salvation', color: '#146C94' },
  { id: '9', name: 'Hope', color: '#146C94' },
  { id: '10', name: 'Love', color: '#146C94' },
  { id: '11', name: 'Charity', color: '#146C94' },
  { id: '12', name: 'Holiness', color: '#146C94' },
  { id: '13', name: 'Forgiveness', color: '#146C94' },
  { id: '14', name: 'Eternal Life', color: '#146C94' }

];

// Custom Skeleton Animation Component
type SkeletonBoxProps = {
  width: number;
  height: number;
  borderRadius?: number;
  style?: object;
};

const SkeletonBox = ({ width, height, borderRadius = 4, style = {} }: SkeletonBoxProps) => {
  const { colors } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.inputBg],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Skeleton Components
const BookCardSkeleton = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.bookCard, { backgroundColor: 'transparent' }]}>
      <SkeletonBox width={120} height={160} borderRadius={8} style={{ marginBottom: 8 }} />
      <SkeletonBox width={100} height={12} style={{ marginBottom: 4 }} />
      <SkeletonBox width={80} height={10} />
    </View>
  );
};

const AuthorCardSkeleton = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.authorCard, { backgroundColor: 'transparent' }]}>
      <SkeletonBox width={80} height={80} borderRadius={40} style={{ marginBottom: 8 }} />
      <SkeletonBox width={70} height={12} />
    </View>
  );
};

const TopBookCardSkeleton = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.topBookCard, { backgroundColor: 'transparent' }]}>
      <SkeletonBox width={60} height={80} borderRadius={4} style={{ marginRight: 12 }} />
      <View style={styles.topBookInfo}>
        <SkeletonBox width={200} height={16} style={{ marginBottom: 8 }} />
        <SkeletonBox width={120} height={12} style={{ marginBottom: 4 }} />
        <SkeletonBox width={100} height={12} style={{ marginBottom: 8 }} />
        <SkeletonBox width={50} height={14} />
      </View>
    </View>
  );
};

const HomeView = () => {
  const navigation = useNavigation<any>();
  const { logout, isGuest } = useAuth();
  const { activeOrg, memberships, switchOrg, loading: orgLoading } = useOrg();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [showDropdown, setShowDropdown] = useState(false);
  const [userData, setUserData] = useState("");
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isIconFontReady, setIsIconFontReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIconFontReady(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  type Book = {
    book_id: string | number;
    book_name: string;
    author_name?: string;
    cover_image?: string;
    rent_count?: number;
    year_of_publication?: string | number;
    [key: string]: any;
    likes?: number;
  };

  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [shuffledBooks, setShuffledBooks] = useState<Book[]>([]);

  type Author = {
    author_id: string | number;
    name: string;
    photo?: string;
    [key: string]: any;
  };

  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true);
  const [shuffledAuthors, setShuffledAuthors] = useState<Author[]>([]);
  const [topBooks, setTopBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isGameEnabled, setIsGameEnabled] = useState(false);
  // Book rental can be switched off per organization. The Stuff screen already
  // gated its cards this way; the Home screen — the entry point for the whole
  // rental flow — did not.
  const [isBookRentalEnabled, setIsBookRentalEnabled] = useState(true);

  const fetchAppSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/app-settings`);
      if (res.data.status === 'Success') {
        setIsGameEnabled(res.data.data.isGameEnabled);
        setIsBookRentalEnabled(res.data.data.features?.bookRental !== false);
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchAppSettings();
    }, [])
  );

  async function getUserData() {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      // Guest mode or not logged in — skip user data fetch
      setIsLoadingUserData(false);
      return;
    }
    try {
      setIsLoadingUserData(true);
      const res = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      setUserData(res.data.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoadingUserData(false);
    }
  }


  // Inside HomeView component
  const scrollX = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: -CATEGORIES.length * 120, // width * items
        duration: 27000, // speed (ms)
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const categoryItemWidth = 120; // adjust based on your button width

  async function fetchBooks() {
    try {
      if (!isBookRentalEnabled) { setIsLoadingBooks(false); return; }
      setIsLoadingBooks(true);
      const res = await axios.get(`${API_URL}/api/books`);
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      setBooks(data);
      setShuffledBooks([...data].sort(() => 0.5 - Math.random()).slice(0, 5));

      const sortedBooks = [...data].sort((a, b) =>
        (b.rent_count || 0) - (a.rent_count || 0)
      );
      setTopBooks(sortedBooks);

    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setIsLoadingBooks(false);
    }
  }

  async function fetchAuthors() {
    try {
      setIsLoadingAuthors(true);
      const res = await axios.get(`${API_URL}/api/authors`);
      if (res.data.status === 'Ok') {
        const data = Array.isArray(res.data.data) ? res.data.data : [];
        setAuthors(data);
        setShuffledAuthors([...data].sort(() => 0.5 - Math.random()).slice(0, 5));
      } else {
        console.error('Error fetching authors:', res.data.data);
      }
    } catch (error) {
      console.error('Error fetching authors:', error);
    } finally {
      setIsLoadingAuthors(false);
    }
  }

  useEffect(() => {
    getUserData();
    fetchBooks();
    fetchAuthors();
  }, []);

  const filteredBooks = Array.isArray(books) ? books.filter(book => book.book_name.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  const navigateToBookDetails = (book: any) => {
    navigation.navigate('BookDetails', { book });
  };

  const navigateToAuthorBooks = (authorId: any) => {
    navigation.navigate('AuthorBooks', { id: authorId });
  };

  const navigateToAllBooks = () => {
    navigation.navigate('AllBooks', { books });
  };

  const navigateToAllAuthors = () => {
    navigation.navigate('AllAuthors', { authors });
  };

  return (
    <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stickyHeader}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.logo}>{activeOrg ? activeOrg.name : APP_NAME}</Text>
              {isGameEnabled && (
                <Pressable onPress={() => isGameEnabled && navigation.navigate('GameHome')} style={{ marginLeft: 15 }}>
                  <Ionicons name="game-controller" size={28} color={colors.theme === 'dark' ? colors.tint : "#F6F1F1"} />
                </Pressable>
              )}
            </View>
            {!isGuest && !orgLoading && isIconFontReady && memberships && memberships.length > 0 && (
              <Pressable
                onPress={() => setShowDropdown(true)}
                style={{
                  marginLeft: 10,
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                }}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={20}
                  color={colors.theme === 'dark' ? colors.tint : "#F6F1F1"}
                />
              </Pressable>
            )}
          </View>
          <View style={styles.searchWrapper}>
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search Books..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowSearchResults(text.length > 0);
                }}
              />
              {searchQuery.length > 0 && (
                <Pressable
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                >
                  <View style={styles.clearIconContainer}>
                    <Text style={styles.clearIcon}>✕</Text>
                  </View>
                </Pressable>
              )}
            </View>
            {showSearchResults && searchQuery && (
              <View style={styles.searchResults}>
                {filteredBooks.length > 0 ? (
                  <FlatList
                    data={filteredBooks}
                    keyExtractor={(item) => (item.book_id || item.id).toString()}
                    renderItem={({ item: book }) => (
                      <Pressable
                        style={styles.searchResultItem}
                        onPress={() => {
                          setShowSearchResults(false);
                          setSearchQuery('');
                          navigateToBookDetails(book);
                        }}
                      >
                        <Image
                          source={{ uri: book.cover_image || 'https://images.unsplash.com/photo-1667059634989-bee0954711f4?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
                          style={styles.searchResultImage}
                        />
                        <View style={styles.searchResultText}>
                          <Text style={styles.searchResultTitle}>{book.book_name || book.title}</Text>
                          <Text style={styles.searchResultAuthor}>{book.author_name || book.author}</Text>
                        </View>
                      </Pressable>
                    )}
                    style={[styles.resultsList, { maxHeight: 300 }]}
                  />
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No books found</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <ScrollView style={styles.container}>
          {/* Categories Section (Auto-scrolling) */}
          <View style={{ height: 50, overflow: 'hidden' }}>
            <Animated.View
              style={{
                flexDirection: 'row',
                transform: [{ translateX: scrollX }],
              }}
            >
              {/* Duplicate categories for infinite loop */}
              {[...CATEGORIES, ...CATEGORIES].map((category, index) => (
                <Pressable
                  key={`${category.id}-${index}`}
                  style={[
                    styles.categoryButton,
                    { width: categoryItemWidth },
                  ]}
                >
                  <Text
                    style={styles.categoryText}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          </View>

          {/* Books Section — hidden when the org has book rental switched off */}
          {isBookRentalEnabled && (<>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Books</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={navigateToAllBooks}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {isLoadingBooks ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <BookCardSkeleton key={index} />
                ))
              ) : (
                shuffledBooks && shuffledBooks.length > 0 &&
                shuffledBooks.map((book) => (
                  <Pressable
                    key={book.book_id}
                    style={styles.bookCard}
                    onPress={() => navigateToBookDetails(book)}
                  >
                    <Image
                      source={{ uri: book.cover_image || 'https://images.unsplash.com/photo-1667059634989-bee0954711f4?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
                      style={styles.bookCover}
                    />
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={styles.bookTitle}
                    >
                      {book.book_name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={styles.bookAuthor}
                    >
                      {book.author_name}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>

          {/* Authors Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Authors</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={navigateToAllAuthors}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {isLoadingAuthors ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <AuthorCardSkeleton key={index} />
                ))
              ) : (
                shuffledAuthors && shuffledAuthors.length > 0 &&
                shuffledAuthors.map((author) => (
                  <Pressable
                    key={author.author_id}
                    style={styles.authorCard}
                    onPress={() => navigateToAuthorBooks(author.author_id)}
                  >
                    <Image
                      source={{ uri: author.photo || 'https://plus.unsplash.com/premium_photo-1770559520599-881a099cc6e9?q=80&w=1976&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
                      style={styles.authorPhoto}
                    />
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={styles.authorName}
                    >
                      {author.name}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>

          {/* Top Books Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top 10 Reads</Text>
            {isLoadingBooks ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TopBookCardSkeleton key={index} />
              ))
            ) : (
              topBooks.slice(0, 10).map((book) => (
                <Pressable
                  key={book.book_id}
                  style={styles.topBookCard}
                  onPress={() => navigateToBookDetails(book)}
                >
                  <Image source={{ uri: book.cover_image || 'https://images.unsplash.com/photo-1667059634989-bee0954711f4?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }} style={styles.topBookCover} />
                  <View style={styles.topBookInfo}>
                    <Text style={styles.topBookTitle}>{book.book_name}</Text>
                    <View style={styles.topBookMeta}>
                      <Text style={styles.topBookMetaText}>Published: {book.year_of_publication}</Text>
                      <Text style={styles.topBookMetaText}>Read by: {book.rent_count}</Text>
                    </View>
                    <View style={styles.ratingContainer}>
                      <Text style={styles.likesCount}>{book.likes || 0}</Text>
                      <Heart size={15} color={colors.tint} fill={colors.tint} />
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
          </>)}
        </ScrollView>
      </SafeAreaView>

      {/* Switch Organization Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Switch Workspace</Text>

            {memberships.map((item: any) => {
              const org = item.organization;
              const isCurrent = org._id === activeOrg?._id;

              return (
                <TouchableOpacity
                  key={org._id}
                  style={[styles.dropdownItem, isCurrent && styles.dropdownItemActive]}
                  onPress={async () => {
                    setShowDropdown(false);
                    if (isCurrent) return;

                    const success = await switchOrg(org._id);
                    if (success) {
                      if (item.role === 'Admin') {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'AdminScreen' }]
                        });
                      } else {
                        // Re-render MainApp to update contexts
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'MainApp' }]
                        });
                      }
                    } else {
                      Alert.alert('Error', 'Failed to switch organization.');
                    }
                  }}
                >
                  <MaterialCommunityIcons
                    name="office-building"
                    size={20}
                    color={isCurrent ? colors.tint : colors.textSecondary}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropdownItemText, isCurrent && styles.dropdownItemTextActive]}>
                      {org.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                      Role: {item.role}
                    </Text>
                  </View>
                  {isCurrent && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.tint} />
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.dropdownItem, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 12 }]}
              onPress={() => {
                setShowDropdown(false);
                navigation.navigate('OrgSelection');
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.tint} style={{ marginRight: 10 }} />
              <Text style={[styles.dropdownItemText, { color: colors.tint }]}>
                Add Workspace
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
};

export default HomeView;