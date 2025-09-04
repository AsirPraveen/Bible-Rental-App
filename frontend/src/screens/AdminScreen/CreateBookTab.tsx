import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Platform, StatusBar, SafeAreaView } from 'react-native';
import { Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

const CreateBookTab = () => {
  const [bookName, setBookName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [pages, setPages] = useState('');
  const [preface, setPreface] = useState('');
  const [yearOfPublication, setYearOfPublication] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [bookId, setBookId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to validate form inputs
  const validateForm = () => {
    if (!bookName.trim()) {
      Alert.alert('Error', 'Please enter book name.');
      return false;
    }
    if (!authorName.trim()) {
      Alert.alert('Error', 'Please enter author name.');
      return false;
    }
    if (!pages.trim() || isNaN(Number(pages)) || Number(pages) <= 0) {
      Alert.alert('Error', 'Please enter a valid number of pages.');
      return false;
    }
    if (!yearOfPublication.trim() || isNaN(Number(yearOfPublication))) {
      Alert.alert('Error', 'Please enter a valid year of publication.');
      return false;
    }
    if (!authorId.trim()) {
      Alert.alert('Error', 'Please enter author ID.');
      return false;
    }
    if (!bookId.trim()) {
      Alert.alert('Error', 'Please enter book ID.');
      return false;
    }
    return true;
  };

  // Function to handle adding a book
  const handleAddBook = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newBook = {
        book_name: bookName.trim(),
        author_name: authorName.trim(),
        pages: pages.trim(),
        preface: preface.trim(),
        year_of_publication: yearOfPublication.trim(),
        author_id: authorId.trim(),
        book_id: bookId.trim(),
      };

      const response = await axios.post(`${API_URL}/api/add-book`, newBook);
      
      if (response.data.status === 'Ok') {
        Alert.alert('Success', 'Book added successfully!');
        // Reset form
        setBookName('');
        setAuthorName('');
        setPages('');
        setPreface('');
        setYearOfPublication('');
        setAuthorId('');
        setBookId('');
      } else {
        Alert.alert('Error', response.data.data || 'Failed to add book.');
      }
    } catch (error) {
      console.error('Error adding book:', error);
      Alert.alert('Error', 'Failed to add book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.headerText}>Add New Book</Text>

            <View style={styles.formCard}>
              <Text style={styles.label}>Book Name *</Text>
              <TextInput
                style={styles.input}
                value={bookName}
                onChangeText={setBookName}
                placeholder="Enter book name"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Author Name *</Text>
              <TextInput
                style={styles.input}
                value={authorName}
                onChangeText={setAuthorName}
                placeholder="Enter author name"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Number of Pages *</Text>
              <TextInput
                style={styles.input}
                value={pages}
                onChangeText={setPages}
                placeholder="Enter number of pages"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Preface (Optional)</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                value={preface}
                onChangeText={setPreface}
                placeholder="Enter book preface or description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Year of Publication *</Text>
              <TextInput
                style={styles.input}
                value={yearOfPublication}
                onChangeText={setYearOfPublication}
                placeholder="Enter year of publication"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Author ID *</Text>
              <TextInput
                style={styles.input}
                value={authorId}
                onChangeText={setAuthorId}
                placeholder="Enter author ID"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Book ID *</Text>
              <TextInput
                style={styles.input}
                value={bookId}
                onChangeText={setBookId}
                placeholder="Enter unique book ID"
                placeholderTextColor="#999"
              />

              <Button
                mode="contained"
                onPress={handleAddBook}
                style={styles.addButton}
                labelStyle={styles.buttonText}
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? 'Adding Book...' : 'Add Book'}
              </Button>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#146C94',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    color: '#F6F1F1',
  },
});

export default CreateBookTab;