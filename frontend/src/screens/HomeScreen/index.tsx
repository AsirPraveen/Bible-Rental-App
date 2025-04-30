import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ImageBackground, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from "./style";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { TextInput, ScrollView } from "react-native";
import { Search, Bell } from 'lucide-react-native';
import { useNavigation } from "@react-navigation/native";
import { FlatList } from "react-native-gesture-handler";
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra.apiUrl;
const APP_NAME = Constants.expoConfig.extra.appName;

const CATEGORIES = [
  { id: '1', name: 'Faith', color: '#146C94' },
  { id: '2', name: 'Brotherhood', color: '#146C94' },
  { id: '3', name: 'Prayer', color: '#146C94' },
  { id: '4', name: 'Bible', color: '#146C94' },
  { id: '5', name: 'Fellowship', color: '#146C94' },
];


const HomeView = () => {
  const navigation = useNavigation();

  const [userData, setUserData] = useState("");
  const [books, setBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  async function getUserData() {
    const token = await AsyncStorage.getItem('token');
    try {
      const res = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      setUserData(res.data.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  async function fetchBooks() {
    try {
      const res = await axios.get(`${API_URL}/api/books`);
      setBooks(res.data.data);

      const sortedBooks = [...res.data.data].sort((a, b) => 
        (b.rent_count || 0) - (a.rent_count || 0)
      );
      setTopBooks(sortedBooks);

    } catch (error) {
      console.error('Error fetching books:', error);
    }
  }
  async function fetchAuthors() {
    try {
      const res = await axios.get(`${API_URL}/api/authors`); // New endpoint to list all authors
      if (res.data.status === 'Ok') {
        setAuthors(res.data.data);
      } else {
        console.error('Error fetching authors:', res.data.data);
      }
    } catch (error) {
      console.error('Error fetching authors:', error);
    }
  }

  useEffect(() => {
    getUserData();
    fetchBooks();
    fetchAuthors();
  }, []);
  
  const filteredBooks = books.filter(book => book.book_name.toLowerCase().includes(searchQuery.toLowerCase()));

  const navigateToBookDetails = (book) => {
    navigation.navigate('BookDetails', { book:book });
  };

  const navigateToAuthorBooks = (authorId) => {
    navigation.navigate('AuthorBooks', { id: authorId });
  };

  const navigateToAllBooks = () => {
    navigation.navigate('AllBooks', { books: books });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.stickyHeader}>
        <View style={styles.header}>
          <Text style={styles.logo}>{APP_NAME}</Text>
          <Pressable>
            <Bell size={24} color="#146C94" />
          </Pressable>
        </View>
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#146C94" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Books..."
              placeholderTextColor="#146C94"
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
                        source={{ uri: book.cover_image || 'https://images.unsplash.com/photo-1599179416084-91afc57e96f2?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }} 
                        style={styles.searchResultImage} 
                      />
                      <View style={styles.searchResultText}>
                        <Text style={styles.searchResultTitle}>{book.book_name || book.title}</Text>
                        <Text style={styles.searchResultAuthor}>{book.author_name || book.author}</Text>
                      </View>
                    </Pressable>
                  )}
                  style={styles.resultsList}
                  maxHeight={300}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.id}
              style={[styles.categoryButton, { backgroundColor: category.color }]}
            >
              <Text style={[styles.categoryText, 
                { color: category.color === '#F6F1F1' ? '#146C94' : '#F6F1F1' }
              ]}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

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
            {books && books.length > 0 && 
              [...books]
                .sort(() => 0.5 - Math.random())
                .slice(0, 5)
                .map((book) => (
                  <Pressable 
                    key={book.book_id} 
                    style={styles.bookCard}
                    onPress={() => navigateToBookDetails(book)}
                  >
                    <Image
                      source={{ uri: book.cover_image || 'https://images.unsplash.com/photo-1599179416084-91afc57e96f2?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }} 
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
            }
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authors</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {authors.length > 0 ? (
              authors.map((author) => (
                <Pressable
                  key={author.author_id}
                  style={styles.authorCard}
                  onPress={() => navigateToAuthorBooks(author.author_id)}
                >
                  <Image source={{ uri: author.photo || 'https://via.placeholder.com/150' }} style={styles.authorPhoto} />
                  <Text style={styles.authorName}>{author.name}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.noAuthorsText}>No authors available</Text>
            )}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 10 Reads </Text>
          {topBooks.slice(0,10).map((book) => (
            <Pressable 
              key={book.book_id}
              style={styles.topBookCard}
              onPress={() => navigateToBookDetails(book)}
            >
              <Image source={{ uri: book.cover_image || 'https://images.unsplash.com/photo-1599179416084-91afc57e96f2?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }} style={styles.topBookCover} />
              <View style={styles.topBookInfo}>
                <Text style={styles.topBookTitle}>{book.book_name}</Text>
                <View style={styles.topBookMeta}>
                  <Text style={styles.topBookMetaText}>Published: {book.year_of_publication}</Text>
                  <Text style={styles.topBookMetaText}>Read by: {book.rent_count}</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <Text style={styles.rating}>★ 5</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeView;