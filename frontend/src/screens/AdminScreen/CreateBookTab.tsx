import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Platform, StatusBar, SafeAreaView, Image, ActivityIndicator, Modal, FlatList, Pressable } from 'react-native';
import { Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const cloudinaryCloudName = Constants.expoConfig?.extra?.cloudinaryCloudName ?? '';
const uploadPresentBibleBooks = Constants.expoConfig?.extra?.uploadPresentBibleBooks ?? '';

const CreateBookTab = () => {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors);
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
  const [coverImagePublicId, setCoverImagePublicId] = useState('');
  const [thumbnail1PublicId, setThumbnail1PublicId] = useState('');
  const [thumbnail2PublicId, setThumbnail2PublicId] = useState('');
  const tempUploadedImages = React.useRef<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState('');

  const deleteImageFromCloudinary = async (publicId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/cloudinary/delete`, {
        token,
        publicId
      });
    } catch (err) {
      console.log('Error deleting image from Cloudinary:', err);
    }
  };

  const handleRemoveImage = async (imageType: 'cover' | 'thumbnail1' | 'thumbnail2') => {
    let pubId = '';
    switch (imageType) {
      case 'cover':
        pubId = coverImagePublicId;
        setCoverImageUri('');
        setCoverImageUrl('');
        setCoverImagePublicId('');
        break;
      case 'thumbnail1':
        pubId = thumbnail1PublicId;
        setThumbnail1Uri('');
        setThumbnail1Url('');
        setThumbnail1PublicId('');
        break;
      case 'thumbnail2':
        pubId = thumbnail2PublicId;
        setThumbnail2Uri('');
        setThumbnail2Url('');
        setThumbnail2PublicId('');
        break;
    }
    if (pubId) {
      tempUploadedImages.current = tempUploadedImages.current.filter(id => id !== pubId);
      await deleteImageFromCloudinary(pubId);
    }
  };

  const [authorsList, setAuthorsList] = useState<any[]>([]);
  const [showAuthorSelectModal, setShowAuthorSelectModal] = useState(false);
  const [authorSearchText, setAuthorSearchText] = useState('');
  const [showAddAuthorModal, setShowAddAuthorModal] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newAuthorBio, setNewAuthorBio] = useState('');
  const [newAuthorMinistry, setNewAuthorMinistry] = useState('');
  const [savingAuthor, setSavingAuthor] = useState(false);

  useEffect(() => {
    fetchAuthors();
    return () => {
      // Cleanup unsaved temp uploads on unmount
      if (tempUploadedImages.current.length > 0) {
        tempUploadedImages.current.forEach(async (id) => {
          await deleteImageFromCloudinary(id);
        });
      }
    };
  }, []);

  const fetchAuthors = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/authors`);
      if (res.data.status === 'Ok') {
        setAuthorsList(res.data.data || []);
      }
    } catch (error) {
      console.log('Error fetching authors:', error);
    }
  };

  const handleCreateAuthor = async () => {
    if (!newAuthorName.trim()) {
      Alert.alert('Error', 'Please enter author name.');
      return;
    }
    setSavingAuthor(true);
    try {
      const res = await axios.post(`${API_URL}/api/authors`, {
        name: newAuthorName.trim(),
        bio: newAuthorBio.trim(),
        ministry: newAuthorMinistry.trim(),
      });
      if (res.data.status === 'Ok' && res.data.data) {
        const newlyCreated = res.data.data;
        setAuthorsList(prev => [...prev, newlyCreated]);
        setAuthorId(newlyCreated.author_id.toString());
        setAuthorName(newlyCreated.name);
        
        // Reset states and close modals
        setNewAuthorName('');
        setNewAuthorBio('');
        setNewAuthorMinistry('');
        setShowAddAuthorModal(false);
        setShowAuthorSelectModal(false);
        
        Alert.alert('Success', 'Author created successfully!');
      } else {
        Alert.alert('Error', 'Failed to create author.');
      }
    } catch (error) {
      console.log('Error creating author:', error);
      Alert.alert('Error', 'Failed to create author. Please try again.');
    } finally {
      setSavingAuthor(false);
    }
  };

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
      Alert.alert('Error', 'Please select or create an author first.');
      return false;
    }
    if (!availableCount.trim() || isNaN(Number(availableCount)) || Number(availableCount) <= 0) {
      Alert.alert('Error', 'Please enter a valid available count.');
      return false;
    }
    return true;
  };

  // Function to upload image to Cloudinary
  const uploadImage = async (uri:any, imageType:any) => {
    setUploadingImage(imageType);
    try {
      // If replacing an existing image, delete the old one first
      let oldPublicId = '';
      if (imageType === 'cover' && coverImagePublicId) {
        oldPublicId = coverImagePublicId;
      } else if (imageType === 'thumbnail1' && thumbnail1PublicId) {
        oldPublicId = thumbnail1PublicId;
      } else if (imageType === 'thumbnail2' && thumbnail2PublicId) {
        oldPublicId = thumbnail2PublicId;
      }

      if (oldPublicId) {
        tempUploadedImages.current = tempUploadedImages.current.filter(id => id !== oldPublicId);
        await deleteImageFromCloudinary(oldPublicId);
      }

      const fileExtension = uri.split('.').pop()?.toLowerCase();
      const mimeType = fileExtension === 'png' ? 'image/png' : fileExtension === 'gif' ? 'image/gif' : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: mimeType,
        name: `book_${imageType}_${Date.now()}.${fileExtension || 'jpg'}`,
      } as any);
      formData.append('upload_preset', uploadPresentBibleBooks);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.data && response.data.secure_url) {
        const newPubId = response.data.public_id;
        tempUploadedImages.current.push(newPubId);

        switch (imageType) {
          case 'cover':
            setCoverImageUrl(response.data.secure_url);
            setCoverImagePublicId(newPubId);
            break;
          case 'thumbnail1':
            setThumbnail1Url(response.data.secure_url);
            setThumbnail1PublicId(newPubId);
            break;
          case 'thumbnail2':
            setThumbnail2Url(response.data.secure_url);
            setThumbnail2PublicId(newPubId);
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
  const pickImage = async (imageType:any) => {
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
        setCoverImagePublicId('');
        setThumbnail1PublicId('');
        setThumbnail2PublicId('');
        tempUploadedImages.current = [];
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

  const renderImagePicker = (imageType:any, uri:any, label:any) => (
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
        <View style={[styles.imageContainer, imageType === 'cover' ? { width: 120, height: 160 } : { width: 80, height: 80 }]}>
          <Image source={{ uri }} style={imageType === 'cover' ? styles.coverImage : styles.thumbnailImage} resizeMode="cover" />
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => handleRemoveImage(imageType)}
            disabled={uploadingImage === imageType}
          >
            <Ionicons name="close-circle" size={24} color="#FF5252" />
          </TouchableOpacity>
          {uploadingImage === imageType && (
            <ActivityIndicator size="large" color="#146C94" style={styles.loader} />
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.outer_container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
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

              <Text style={styles.label}>Author *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowAuthorSelectModal(true)}
              >
                <Text style={[styles.pickerButtonText, { color: authorName ? colors.text : colors.textSecondary }]}>
                  {authorName ? `${authorName} (ID: ${authorId})` : 'Select Author'}
                </Text>
              </TouchableOpacity>

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

              <Text style={styles.label}>Book ID</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#E0E0E0', color: '#666' }]}
                value="Auto-generated by system"
                editable={false}
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

              {/* Author Select Modal */}
              <Modal
                visible={showAuthorSelectModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAuthorSelectModal(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Author</Text>
                      <TouchableOpacity onPress={() => setShowAuthorSelectModal(false)} style={styles.closeModalBtn}>
                        <Text style={styles.closeModalBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.modalSearchContainer}>
                      <TextInput
                        style={styles.modalSearchInput}
                        placeholder="Search authors..."
                        placeholderTextColor="#999"
                        value={authorSearchText}
                        onChangeText={setAuthorSearchText}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.addAuthorItem}
                      onPress={() => setShowAddAuthorModal(true)}
                    >
                      <Text style={styles.addAuthorItemText}>➕ Add New Author...</Text>
                    </TouchableOpacity>

                    <FlatList
                      data={authorsList.filter(a => a.name.toLowerCase().includes(authorSearchText.toLowerCase()))}
                      keyExtractor={(item) => item.author_id.toString()}
                      style={styles.authorsFlatList}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.authorItem}
                          onPress={() => {
                            setAuthorId(item.author_id.toString());
                            setAuthorName(item.name);
                            setShowAuthorSelectModal(false);
                          }}
                        >
                          <Text style={styles.authorItemName}>{item.name}</Text>
                          <Text style={styles.authorItemDetail}>ID: {item.author_id} • {item.ministry || 'Unknown'}</Text>
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <View style={styles.emptyListContainer}>
                          <Text style={styles.emptyListText}>No authors found</Text>
                        </View>
                      }
                    />
                  </View>
                </View>
              </Modal>

              {/* Add Author Modal */}
              <Modal
                visible={showAddAuthorModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowAddAuthorModal(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, styles.addAuthorModalContent]}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Add New Author</Text>
                      <TouchableOpacity onPress={() => setShowAddAuthorModal(false)} style={styles.closeModalBtn}>
                        <Text style={styles.closeModalBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.addAuthorForm}>
                      <Text style={styles.modalLabel}>Author Name *</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Enter author name"
                        placeholderTextColor="#999"
                        value={newAuthorName}
                        onChangeText={setNewAuthorName}
                      />

                      <Text style={styles.modalLabel}>Ministry / Fellowship (Optional)</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. Billy Graham Ministries"
                        placeholderTextColor="#999"
                        value={newAuthorMinistry}
                        onChangeText={setNewAuthorMinistry}
                      />

                      <Text style={styles.modalLabel}>Biography (Optional)</Text>
                      <TextInput
                        style={[styles.modalInput, styles.modalBioInput]}
                        placeholder="Write a short biography..."
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={3}
                        value={newAuthorBio}
                        onChangeText={setNewAuthorBio}
                      />

                      <TouchableOpacity
                        style={styles.saveAuthorButton}
                        onPress={handleCreateAuthor}
                        disabled={savingAuthor}
                      >
                        {savingAuthor ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.saveAuthorButtonText}>Save Author</Text>
                        )}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
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
    color: colors.tint,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageSection: {
    marginBottom: 16,
  },
  imagePickerButton: {
    borderColor: colors.tint,
    borderRadius: 8,
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: colors.tint,
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    zIndex: 10,
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
    backgroundColor: colors.tint,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    color: '#F6F1F1',
  },
  pickerButton: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  addAuthorModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.tint,
  },
  closeModalBtn: {
    padding: 4,
  },
  closeModalBtnText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  modalSearchContainer: {
    marginBottom: 10,
  },
  modalSearchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addAuthorItem: {
    backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 108, 148, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  addAuthorItemText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.tint,
  },
  authorsFlatList: {
    marginTop: 8,
  },
  authorItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  authorItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  authorItemDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyListContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyListText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  addAuthorForm: {
    marginTop: 10,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.tint,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveAuthorButton: {
    backgroundColor: colors.tint,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveAuthorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateBookTab;