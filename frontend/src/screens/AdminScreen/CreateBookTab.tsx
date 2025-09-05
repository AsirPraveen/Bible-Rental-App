import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Platform, StatusBar, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const cloudinaryCloudName = Constants.expoConfig?.extra?.cloudinaryCloudName ?? '';
const uploadPresentBibleBooks = Constants.expoConfig?.extra?.uploadPresentBibleBooks ?? '';

const CreateBookTab = () => {
  const [bookName, setBookName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [pages, setPages] = useState('');
  const [preface, setPreface] = useState('');
  const [yearOfPublication, setYearOfPublication] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [bookId, setBookId] = useState('');
  const [availableCount, setAvailableCount] = useState('');
  const [coverImageUri, setCoverImageUri] = useState('');
  const [thumbnail1Uri, setThumbnail1Uri] = useState('');
  const [thumbnail2Uri, setThumbnail2Uri] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [thumbnail1Url, setThumbnail1Url] = useState('');
  const [thumbnail2Url, setThumbnail2Url] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState('');

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
    if (!availableCount.trim() || isNaN(Number(availableCount)) || Number(availableCount) <= 0) {
      Alert.alert('Error', 'Please enter a valid available count.');
      return false;
    }
    return true;
  };

  // Function to upload image to Cloudinary
  const uploadImage = async (uri, imageType) => {
    setUploadingImage(imageType);
    try {
      const fileExtension = uri.split('.').pop()?.toLowerCase();
      const mimeType = fileExtension === 'png' ? 'image/png' : fileExtension === 'gif' ? 'image/gif' : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: mimeType,
        name: `book_${imageType}_${Date.now()}.${fileExtension || 'jpg'}`,
      });
      formData.append('upload_preset', uploadPresentBibleBooks);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.data && response.data.secure_url) {
        switch (imageType) {
          case 'cover':
            setCoverImageUrl(response.data.secure_url);
            break;
          case 'thumbnail1':
            setThumbnail1Url(response.data.secure_url);
            break;
          case 'thumbnail2':
            setThumbnail2Url(response.data.secure_url);
            break;
        }
        Alert.alert('Success', `${imageType} image uploaded successfully!`);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to upload ${imageType} image.`);
      // Reset the URI if upload failed
      switch (imageType) {
        case 'cover':
          setCoverImageUri('');
          break;
        case 'thumbnail1':
          setThumbnail1Uri('');
          break;
        case 'thumbnail2':
          setThumbnail2Uri('');
          break;
      }
    } finally {
      setUploadingImage('');
    }
  };

  // Function to pick an image
  const pickImage = async (imageType) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your photos to select an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: imageType === 'cover' ? [3, 4] : [1, 1], // Cover image taller, thumbnails square
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      switch (imageType) {
        case 'cover':
          setCoverImageUri(uri);
          break;
        case 'thumbnail1':
          setThumbnail1Uri(uri);
          break;
        case 'thumbnail2':
          setThumbnail2Uri(uri);
          break;
      }
      await uploadImage(uri, imageType);
    }
  };

  // Function to handle adding a book
  const handleAddBook = async () => {
    if (!validateForm()) {
      return;
    }

    if (uploadingImage) {
      Alert.alert('Please wait', 'Image upload is in progress. Please wait for it to complete.');
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
        available_count: availableCount.trim(),
        cover_image: coverImageUrl || null,
        thumbnail1: thumbnail1Url || null,
        thumbnail2: thumbnail2Url || null,
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
        setAvailableCount('');
        setCoverImageUri('');
        setThumbnail1Uri('');
        setThumbnail2Uri('');
        setCoverImageUrl('');
        setThumbnail1Url('');
        setThumbnail2Url('');
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

  const renderImagePicker = (imageType, uri, label) => (
    <View style={styles.imageSection}>
      <Text style={styles.label}>{label}</Text>
      <Button
        mode="outlined"
        onPress={() => pickImage(imageType)}
        style={styles.imagePickerButton}
        labelStyle={styles.imagePickerText}
        disabled={uploadingImage === imageType}
      >
        {uploadingImage === imageType ? 'Uploading...' : `Select ${label}`}
      </Button>
      {uri && (
        <View style={styles.imageContainer}>
          <Image source={{ uri }} style={imageType === 'cover' ? styles.coverImage : styles.thumbnailImage} resizeMode="cover" />
          {uploadingImage === imageType && (
            <ActivityIndicator size="large" color="#146C94" style={styles.loader} />
          )}
        </View>
      )}
    </View>
  );

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

              <Text style={styles.label}>Available Count *</Text>
              <TextInput
                style={styles.input}
                value={availableCount}
                onChangeText={setAvailableCount}
                placeholder="Enter number of copies available"
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

              {renderImagePicker('cover', coverImageUri, 'Cover Image (Optional)')}
              {renderImagePicker('thumbnail1', thumbnail1Uri, 'Thumbnail 1 (Optional)')}
              {renderImagePicker('thumbnail2', thumbnail2Uri, 'Thumbnail 2 (Optional)')}

              <Button
                mode="contained"
                onPress={handleAddBook}
                style={styles.addButton}
                labelStyle={styles.buttonText}
                disabled={isSubmitting || uploadingImage !== ''}
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
  imageSection: {
    marginBottom: 16,
  },
  imagePickerButton: {
    borderColor: '#146C94',
    borderRadius: 8,
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#146C94',
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  coverImage: {
    width: 120,
    height: 160,
    borderRadius: 8,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
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