import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ImageBackground, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from "./style";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { TextInput, ScrollView } from "react-native";
import { Search, Bell } from 'lucide-react-native';
import { useNavigation } from "@react-navigation/native";

const CATEGORIES = [
  { id: '1', name: 'Faith', color: '#146C94' },
  { id: '2', name: 'Brotherhood', color: '#146C94' },
  { id: '3', name: 'Prayer', color: '#146C94' },
  { id: '4', name: 'Bible', color: '#146C94' },
  { id: '5', name: 'Fellowship', color: '#146C94' },
];

const FEATURED_BOOKS = [
  {
    id: '1',
    title: 'Pulang',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500',
    author: 'Tere Liye',
    description: 'A compelling story about finding one\'s way back home.',
    rating: 4.8,
    publishedYear: 2022,
    pages: 320,
  },
  {
    id: '2',
    title: 'Heart',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500',
    author: 'Alyssa Dafina',
    description: 'An emotional journey through love and loss.',
    rating: 4.6,
    publishedYear: 2021,
    pages: 280,
  },
  {
    id: '3',
    title: 'Di Bawah Bumi',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500',
    author: 'J. Pratama',
    description: 'Explore the mysteries that lie beneath the earth.',
    rating: 4.7,
    publishedYear: 2023,
    pages: 400,
  },
];

const AUTHORS = [
  {
    id: '1',
    name: 'J. Patterson',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    books: 45,
    followers: '2.3M',
  },
  {
    id: '2',
    name: 'J.K Rowling',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    books: 12,
    followers: '15M',
  },
  {
    id: '3',
    name: 'Marchella FP',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    books: 8,
    followers: '980K',
  },
  {
    id: '4',
    name: 'Raditya Dika',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    books: 15,
    followers: '4.2M',
  },
];

const TOP_BOOKS = [
  {
    id: '1',
    title: 'Perahu Kertas',
    cover: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=150',
    rating: 4.8,
    publishedYear: 2022,
    reads: '1.2M',
    author: 'Dee Lestari',
    description: 'A beautiful story about dreams and determination.',
    pages: 288,
  },
  {
    id: '2',
    title: 'Nanti Kita Cerita Tentang Hari Ini',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=150',
    rating: 4.7,
    publishedYear: 2018,
    reads: '10M',
    author: 'Marchella FP',
    description: 'A collection of stories about life\'s precious moments.',
    pages: 256,
  },
  {
    id: '3',
    title: 'Bumi Manusia',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=150',
    rating: 4.5,
    publishedYear: 2019,
    reads: '8M',
    author: 'Pramoedya Ananta Toer',
    description: 'A historical masterpiece about Indonesian society.',
    pages: 544,
  },
];

const HomeView = () => {
  const navigation = useNavigation();

  const [userData, setUserData] = useState("");
  
  async function getData() {
    const token = await AsyncStorage.getItem('token');
    console.log(token);
    axios
      .post('http://192.168.29.46:5001/userdata', {token: token})
      .then(res => {
        console.log(res.data);
        setUserData(res.data.data);
      });
  }
  useEffect(() => {
    getData();
  },[]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const allBooks = [...FEATURED_BOOKS, ...TOP_BOOKS];
  
  const filteredBooks = allBooks.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToBookDetails = (bookId:any) => {
    navigation.navigate('BookDetails', { id: bookId });
  };

  const navigateToAuthorBooks = (authorId:any) => {
    navigation.navigate('AuthorBooks', { id: authorId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.stickyHeader}>
        <View style={styles.header}>
          <Text style={styles.logo}>YOUTH ROOM</Text>
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
          </View>
          {showSearchResults && searchQuery && (
            <View style={styles.searchResults}>
              {filteredBooks.map((book) => (
                <Pressable
                  key={book.id}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                >
                  <Image source={{ uri: book.cover }} style={styles.searchResultImage} />
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultTitle}>{book.title}</Text>
                    <Text style={styles.searchResultAuthor}>{book.author}</Text>
                  </View>
                </Pressable>
              ))}
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
          <Text style={styles.sectionTitle}>Books</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FEATURED_BOOKS.map((book) => (
              <Pressable 
                key={book.id} 
                style={styles.bookCard}
                onPress={() => navigateToBookDetails(book.id)}
              >
                <Image source={{ uri: book.cover }} style={styles.bookCover} />
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>{book.author}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authors</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {AUTHORS.map((author) => (
              <Pressable 
                key={author.id} 
                style={styles.authorCard}
                onPress={() => navigateToAuthorBooks(author.id)}
              >
                <Image source={{ uri: author.photo }} style={styles.authorPhoto} />
                <Text style={styles.authorName}>{author.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 10 Reads </Text>
          {TOP_BOOKS.map((book) => (
            <Pressable 
              key={book.id} 
              style={styles.topBookCard}
            >
              <Image source={{ uri: book.cover }} style={styles.topBookCover} />
              <View style={styles.topBookInfo}>
                <Text style={styles.topBookTitle}>{book.title}</Text>
                <View style={styles.topBookMeta}>
                  <Text style={styles.topBookMetaText}>Published: {book.publishedYear}</Text>
                  <Text style={styles.topBookMetaText}>Read by: {book.reads}</Text>
                  <Text style={styles.topBookDetail}>Detail</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <Text style={styles.rating}>★ {book.rating}</Text>
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