import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Platform, StatusBar, SafeAreaView, Image, ActivityIndicator, Modal, FlatList, Pressable } from 'react-native';
import { Button, IconButton, Switch } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import LoadingScreen from '../../components/LoadingScreen';

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

  // Author selection state
  const [authorsList, setAuthorsList] = useState<any[]>([]);
  const [showAuthorSelectModal, setShowAuthorSelectModal] = useState(false);
  const [authorSearchText, setAuthorSearchText] = useState('');
  const [showAddAuthorModal, setShowAddAuthorModal] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newAuthorBio, setNewAuthorBio] = useState('');
  const [newAuthorMinistry, setNewAuthorMinistry] = useState('');
  const [savingAuthor, setSavingAuthor] = useState(false);

  // ========== Manage Books state ==========
  const [isManageModalVisible, setIsManageModalVisible] = useState(false);
  const [adminBooks, setAdminBooks] = useState<any[]>([]);
  const [loadingAdminBooks, setLoadingAdminBooks] = useState(false);
  const [manageSearchQuery, setManageSearchQuery] = useState('');

  // Edit Book state
  const [editingBook, setEditingBook] = useState<any>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editBookName, setEditBookName] = useState('');
  const [editAuthorName, setEditAuthorName] = useState('');
  const [editPages, setEditPages] = useState('');
  const [editPreface, setEditPreface] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editAvailableCount, setEditAvailableCount] = useState('');
  const [editCoverImageUrl, setEditCoverImageUrl] = useState('');
  const [editThumbnail1Url, setEditThumbnail1Url] = useState('');
  const [editThumbnail2Url, setEditThumbnail2Url] = useState('');
  const [editCoverImageUri, setEditCoverImageUri] = useState('');
  const [editThumbnail1Uri, setEditThumbnail1Uri] = useState('');
  const [editThumbnail2Uri, setEditThumbnail2Uri] = useState('');
  const [editUploadingImage, setEditUploadingImage] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null);

  // Track images uploaded during edit that need cleanup on cancel
  const editTempUploadedImages = React.useRef<string[]>([]);
  // Track original image URLs to know which ones were replaced
  const editOriginalImages = React.useRef<{ cover: string, thumb1: string, thumb2: string }>({ cover: '', thumb1: '', thumb2: '' });

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

  // Extract public ID from a Cloudinary URL
  const getPublicIdFromUrl = (url: string): string => {
    if (!url) return '';
    try {
      const urlParts = url.split('/');
      const versionIndex = urlParts.findIndex(part => part.startsWith('v') && /^\d+$/.test(part.substring(1)));
      if (versionIndex !== -1 && versionIndex < urlParts.length - 1) {
        return urlParts.slice(versionIndex + 1).join('/').split('.')[0];
      }
      return urlParts[urlParts.length - 1].split('.')[0];
    } catch {
      return '';
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
  const uploadImage = async (uri: any, imageType: any) => {
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
  const pickImage = async (imageType: any) => {
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

  // ========== Manage Books functions ==========

  const fetchAdminBooks = async () => {
    setLoadingAdminBooks(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/books`);
      if (res.data.status === 'Ok') {
        setAdminBooks(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching admin books:', error);
      Alert.alert('Error', 'Failed to fetch books');
    } finally {
      setLoadingAdminBooks(false);
    }
  };

  const handleToggleVisibility = async (book: any) => {
    setTogglingVisibility(book._id);
    try {
      const res = await axios.put(`${API_URL}/api/books/${book._id}`, {
        showInOrg: !book.showInOrg
      });
      if (res.data.status === 'Ok') {
        setAdminBooks(prev =>
          prev.map(b => b._id === book._id ? { ...b, showInOrg: !b.showInOrg } : b)
        );
      } else {
        Alert.alert('Error', 'Failed to update visibility');
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      Alert.alert('Error', 'Failed to update visibility');
    } finally {
      setTogglingVisibility(null);
    }
  };

  const handleDeleteBook = (book: any) => {
    Alert.alert(
      'Delete Book',
      `Are you sure you want to permanently delete "${book.book_name}"? This will also remove associated images from storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await axios.delete(`${API_URL}/api/books/${book._id}`);
              if (res.data.status === 'Ok') {
                Alert.alert('Success', 'Book deleted successfully');
                setAdminBooks(prev => prev.filter(b => b._id !== book._id));
              } else {
                Alert.alert('Error', res.data.data || 'Failed to delete book');
              }
            } catch (error) {
              console.error('Error deleting book:', error);
              Alert.alert('Error', 'Failed to delete book');
            }
          }
        }
      ]
    );
  };

  // Open the edit modal with pre-filled data
  const openEditModal = (book: any) => {
    setEditingBook(book);
    setEditBookName(book.book_name || '');
    setEditAuthorName(book.author_name || '');
    setEditPages(book.pages?.toString() || '');
    setEditPreface(book.preface || '');
    setEditYear(book.year_of_publication?.toString() || '');
    setEditAvailableCount(book.available_count?.toString() || '');
    setEditCoverImageUrl(book.cover_image || '');
    setEditThumbnail1Url(book.thumbnail1 || '');
    setEditThumbnail2Url(book.thumbnail2 || '');
    setEditCoverImageUri('');
    setEditThumbnail1Uri('');
    setEditThumbnail2Uri('');
    editTempUploadedImages.current = [];
    editOriginalImages.current = {
      cover: book.cover_image || '',
      thumb1: book.thumbnail1 || '',
      thumb2: book.thumbnail2 || ''
    };
    setIsEditModalVisible(true);
  };

  const handleCancelEdit = () => {
    // Cleanup any images uploaded during this edit session
    if (editTempUploadedImages.current.length > 0) {
      editTempUploadedImages.current.forEach(async (id) => {
        await deleteImageFromCloudinary(id);
      });
      editTempUploadedImages.current = [];
    }
    setIsEditModalVisible(false);
    setEditingBook(null);
  };

  // Upload image for edit form
  const uploadEditImage = async (uri: string, imageType: 'cover' | 'thumbnail1' | 'thumbnail2') => {
    setEditUploadingImage(imageType);
    try {
      const fileExtension = uri.split('.').pop()?.toLowerCase();
      const mimeType = fileExtension === 'png' ? 'image/png' : fileExtension === 'gif' ? 'image/gif' : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: mimeType,
        name: `book_edit_${imageType}_${Date.now()}.${fileExtension || 'jpg'}`,
      } as any);
      formData.append('upload_preset', uploadPresentBibleBooks);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data && response.data.secure_url) {
        const newPubId = response.data.public_id;
        editTempUploadedImages.current.push(newPubId);

        switch (imageType) {
          case 'cover':
            // If a previous temp upload was done for cover, delete it
            if (editCoverImageUri && editCoverImageUrl !== editOriginalImages.current.cover) {
              const oldPubId = getPublicIdFromUrl(editCoverImageUrl);
              if (oldPubId) {
                editTempUploadedImages.current = editTempUploadedImages.current.filter(id => id !== oldPubId);
                await deleteImageFromCloudinary(oldPubId);
              }
            }
            setEditCoverImageUrl(response.data.secure_url);
            setEditCoverImageUri(uri);
            break;
          case 'thumbnail1':
            if (editThumbnail1Uri && editThumbnail1Url !== editOriginalImages.current.thumb1) {
              const oldPubId = getPublicIdFromUrl(editThumbnail1Url);
              if (oldPubId) {
                editTempUploadedImages.current = editTempUploadedImages.current.filter(id => id !== oldPubId);
                await deleteImageFromCloudinary(oldPubId);
              }
            }
            setEditThumbnail1Url(response.data.secure_url);
            setEditThumbnail1Uri(uri);
            break;
          case 'thumbnail2':
            if (editThumbnail2Uri && editThumbnail2Url !== editOriginalImages.current.thumb2) {
              const oldPubId = getPublicIdFromUrl(editThumbnail2Url);
              if (oldPubId) {
                editTempUploadedImages.current = editTempUploadedImages.current.filter(id => id !== oldPubId);
                await deleteImageFromCloudinary(oldPubId);
              }
            }
            setEditThumbnail2Url(response.data.secure_url);
            setEditThumbnail2Uri(uri);
            break;
        }
        Alert.alert('Success', `${imageType === 'cover' ? 'Cover' : imageType === 'thumbnail1' ? 'Thumbnail 1' : 'Thumbnail 2'} image updated!`);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading edit image:', error);
      Alert.alert('Error', `Failed to upload ${imageType} image.`);
    } finally {
      setEditUploadingImage('');
    }
  };

  const pickEditImage = async (imageType: 'cover' | 'thumbnail1' | 'thumbnail2') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: imageType === 'cover' ? [3, 4] : [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadEditImage(result.assets[0].uri, imageType);
    }
  };

  const handleRemoveEditImage = async (imageType: 'cover' | 'thumbnail1' | 'thumbnail2') => {
    switch (imageType) {
      case 'cover':
        // If the current URL was uploaded during this edit, delete from Cloudinary
        if (editCoverImageUrl && editCoverImageUrl !== editOriginalImages.current.cover) {
          const pubId = getPublicIdFromUrl(editCoverImageUrl);
          if (pubId) {
            editTempUploadedImages.current = editTempUploadedImages.current.filter(id => id !== pubId);
            await deleteImageFromCloudinary(pubId);
          }
        }
        setEditCoverImageUrl('');
        setEditCoverImageUri('');
        break;
      case 'thumbnail1':
        if (editThumbnail1Url && editThumbnail1Url !== editOriginalImages.current.thumb1) {
          const pubId = getPublicIdFromUrl(editThumbnail1Url);
          if (pubId) {
            editTempUploadedImages.current = editTempUploadedImages.current.filter(id => id !== pubId);
            await deleteImageFromCloudinary(pubId);
          }
        }
        setEditThumbnail1Url('');
        setEditThumbnail1Uri('');
        break;
      case 'thumbnail2':
        if (editThumbnail2Url && editThumbnail2Url !== editOriginalImages.current.thumb2) {
          const pubId = getPublicIdFromUrl(editThumbnail2Url);
          if (pubId) {
            editTempUploadedImages.current = editTempUploadedImages.current.filter(id => id !== pubId);
            await deleteImageFromCloudinary(pubId);
          }
        }
        setEditThumbnail2Url('');
        setEditThumbnail2Uri('');
        break;
    }
  };

  const handleSaveEdit = async () => {
    if (!editBookName.trim()) {
      Alert.alert('Error', 'Book name is required');
      return;
    }
    if (!editAuthorName.trim()) {
      Alert.alert('Error', 'Author name is required');
      return;
    }
    if (!editPages.trim() || isNaN(Number(editPages)) || Number(editPages) <= 0) {
      Alert.alert('Error', 'Please enter a valid number of pages');
      return;
    }

    if (editUploadingImage) {
      Alert.alert('Please wait', 'Image upload is in progress.');
      return;
    }

    setIsSavingEdit(true);
    try {
      // Delete old images from Cloudinary if they were replaced
      if (editOriginalImages.current.cover && editCoverImageUrl !== editOriginalImages.current.cover) {
        const oldPubId = getPublicIdFromUrl(editOriginalImages.current.cover);
        if (oldPubId) await deleteImageFromCloudinary(oldPubId);
      }
      if (editOriginalImages.current.thumb1 && editThumbnail1Url !== editOriginalImages.current.thumb1) {
        const oldPubId = getPublicIdFromUrl(editOriginalImages.current.thumb1);
        if (oldPubId) await deleteImageFromCloudinary(oldPubId);
      }
      if (editOriginalImages.current.thumb2 && editThumbnail2Url !== editOriginalImages.current.thumb2) {
        const oldPubId = getPublicIdFromUrl(editOriginalImages.current.thumb2);
        if (oldPubId) await deleteImageFromCloudinary(oldPubId);
      }

      const updateData: any = {
        book_name: editBookName.trim(),
        author_name: editAuthorName.trim(),
        pages: editPages.trim(),
        preface: editPreface.trim(),
        year_of_publication: editYear.trim(),
        available_count: editAvailableCount.trim(),
        cover_image: editCoverImageUrl || null,
        thumbnail1: editThumbnail1Url || null,
        thumbnail2: editThumbnail2Url || null,
      };

      const res = await axios.put(`${API_URL}/api/books/${editingBook._id}`, updateData);

      if (res.data.status === 'Ok') {
        // Clear temp tracking since save was successful
        editTempUploadedImages.current = [];
        // Update local state
        setAdminBooks(prev =>
          prev.map(b => b._id === editingBook._id ? res.data.data : b)
        );
        Alert.alert('Success', 'Book updated successfully');
        setIsEditModalVisible(false);
        setEditingBook(null);
      } else {
        Alert.alert('Error', res.data.data || 'Failed to update book');
      }
    } catch (error) {
      console.error('Error updating book:', error);
      Alert.alert('Error', 'Failed to update book');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filter books by search query
  const filteredBooks = adminBooks.filter(book => {
    const query = manageSearchQuery.toLowerCase();
    if (!query) return true;
    return (
      book.book_name?.toLowerCase().includes(query) ||
      book.author_name?.toLowerCase().includes(query) ||
      book.book_id?.toString().includes(query)
    );
  });

  // ========== Render Helpers ==========

  const renderImagePicker = (imageType: any, uri: any, label: any) => (
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

  const renderEditImagePicker = (imageType: 'cover' | 'thumbnail1' | 'thumbnail2', currentUrl: string, label: string) => (
    <View style={styles.imageSection}>
      <Text style={styles.editLabel}>{label}</Text>
      <Button
        mode="outlined"
        onPress={() => pickEditImage(imageType)}
        style={styles.editImagePickerButton}
        labelStyle={styles.editImagePickerText}
        disabled={editUploadingImage === imageType}
      >
        {editUploadingImage === imageType ? 'Uploading...' : currentUrl ? 'Change Image' : 'Add Image'}
      </Button>
      {currentUrl ? (
        <View style={[styles.editImagePreviewContainer, imageType === 'cover' ? { width: 100, height: 133 } : { width: 70, height: 70 }]}>
          <Image source={{ uri: currentUrl }} style={imageType === 'cover' ? styles.editCoverPreview : styles.editThumbPreview} resizeMode="cover" />
          <TouchableOpacity
            style={styles.editRemoveImageBtn}
            onPress={() => handleRemoveEditImage(imageType)}
            disabled={editUploadingImage === imageType}
          >
            <Ionicons name="close-circle" size={22} color="#FF5252" />
          </TouchableOpacity>
          {editUploadingImage === imageType && (
            <ActivityIndicator size="small" color="#146C94" style={styles.editImageLoader} />
          )}
        </View>
      ) : null}
    </View>
  );

  const renderBookCard = (book: any) => {
    const isHidden = book.showInOrg === false;
    return (
      <View key={book._id} style={[styles.bookManageCard, isHidden && styles.bookManageCardHidden]}>
        {/* Cover Image */}
        {book.cover_image ? (
          <Image source={{ uri: book.cover_image }} style={styles.bookManageCover} resizeMode="cover" />
        ) : (
          <View style={[styles.bookManageCover, styles.bookManageCoverPlaceholder]}>
            <Ionicons name="book-outline" size={28} color={colors.textSecondary} />
          </View>
        )}

        {/* Book Info */}
        <View style={styles.bookManageInfo}>
          <Text style={styles.bookManageTitle} numberOfLines={2}>{book.book_name}</Text>
          <Text style={styles.bookManageAuthor} numberOfLines={1}>by {book.author_name}</Text>

          <View style={styles.bookManageMeta}>
            <View style={styles.bookManageMetaItem}>
              <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.bookManageMetaText}>{book.pages} pages</Text>
            </View>
            <View style={styles.bookManageMetaItem}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.bookManageMetaText}>{book.year_of_publication}</Text>
            </View>
          </View>

          <View style={styles.bookManageBadgeRow}>
            <View style={[styles.bookManageBadge, { backgroundColor: book.available ? '#4CAF50' : '#FF9800' }]}>
              <Text style={styles.bookManageBadgeText}>
                {book.available_count || 0} available
              </Text>
            </View>
            <View style={[styles.bookManageBadge, { backgroundColor: '#E91E63' }]}>
              <Text style={styles.bookManageBadgeText}>❤️ {book.likes || 0}</Text>
            </View>
            {isHidden && (
              <View style={[styles.bookManageBadge, { backgroundColor: '#9E9E9E' }]}>
                <Text style={styles.bookManageBadgeText}>Hidden</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.bookManageActions}>
          <View style={styles.visibilityToggle}>
            <Ionicons
              name={isHidden ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={isHidden ? '#9E9E9E' : colors.tint}
            />
            {togglingVisibility === book._id ? (
              <ActivityIndicator size="small" color={colors.tint} style={{ marginLeft: 4 }} />
            ) : (
              <Switch
                value={book.showInOrg !== false}
                onValueChange={() => handleToggleVisibility(book)}
                color={colors.tint}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            )}
          </View>
          <IconButton
            icon="pencil-outline"
            iconColor={colors.tint}
            size={20}
            onPress={() => openEditModal(book)}
            style={styles.bookManageActionBtn}
          />
          <IconButton
            icon="delete-outline"
            iconColor="#FF5252"
            size={20}
            onPress={() => handleDeleteBook(book)}
            style={styles.bookManageActionBtn}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <View style={styles.headerRow}>
              <View style={{ width: 40 }} />
              <Text style={styles.headerText}>Add New Book</Text>
              <IconButton
                icon="library-shelves"
                iconColor="#F6F1F1"
                size={28}
                onPress={() => {
                  fetchAdminBooks();
                  setIsManageModalVisible(true);
                }}
              />
            </View>

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
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowAuthorSelectModal(false)}
                statusBarTranslucent={true}
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
                statusBarTranslucent={true}
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

      {/* ========== Manage Books Modal ========== */}
      <Modal
        visible={isManageModalVisible}
        animationType="fade"
        onRequestClose={() => setIsManageModalVisible(false)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.manageModalContainer}>
          <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
          <LinearGradient colors={colors.linearGradient} style={styles.manageModalGradient}>
            <View style={styles.manageModalHeader}>
              <IconButton
                icon="close"
                iconColor="#F6F1F1"
                size={28}
                onPress={() => setIsManageModalVisible(false)}
              />
              <Text style={styles.manageModalHeaderText}>Manage Books</Text>
              <View style={{ width: 48 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.manageSearchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.manageSearchIcon} />
              <TextInput
                style={styles.manageSearchInput}
                placeholder="Search by name, author, or book ID..."
                placeholderTextColor={colors.textSecondary}
                value={manageSearchQuery}
                onChangeText={setManageSearchQuery}
              />
              {manageSearchQuery ? (
                <TouchableOpacity onPress={() => setManageSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingAdminBooks ? (
              <LoadingScreen variant="transparent" message="Loading books..." />
            ) : (
              <ScrollView contentContainerStyle={styles.manageBooksList}>
                {filteredBooks.length === 0 ? (
                  <View style={styles.manageEmptyContainer}>
                    <Ionicons name="book-outline" size={48} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.manageEmptyText}>
                      {manageSearchQuery ? 'No books match your search' : 'No books found'}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.manageBookCount}>
                      {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
                      {manageSearchQuery ? ` matching "${manageSearchQuery}"` : ''}
                    </Text>
                    {filteredBooks.map(renderBookCard)}
                  </>
                )}
              </ScrollView>
            )}
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {/* ========== Edit Book Modal ========== */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        onRequestClose={handleCancelEdit}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.manageModalContainer}>
          <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
          <LinearGradient colors={colors.linearGradient} style={styles.manageModalGradient}>
            <View style={styles.manageModalHeader}>
              <IconButton
                icon="close"
                iconColor="#F6F1F1"
                size={28}
                onPress={handleCancelEdit}
              />
              <Text style={styles.manageModalHeaderText}>Edit Book</Text>
              <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.editFormScrollContent}>
              <View style={styles.editFormCard}>
                <Text style={styles.editLabel}>Book Name *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editBookName}
                  onChangeText={setEditBookName}
                  placeholder="Enter book name"
                  placeholderTextColor="#999"
                />

                <Text style={styles.editLabel}>Author Name *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editAuthorName}
                  onChangeText={setEditAuthorName}
                  placeholder="Enter author name"
                  placeholderTextColor="#999"
                />

                <Text style={styles.editLabel}>Number of Pages *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editPages}
                  onChangeText={setEditPages}
                  placeholder="Enter number of pages"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />

                <Text style={styles.editLabel}>Available Count</Text>
                <TextInput
                  style={styles.editInput}
                  value={editAvailableCount}
                  onChangeText={setEditAvailableCount}
                  placeholder="Enter available count"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />

                <Text style={styles.editLabel}>Preface</Text>
                <TextInput
                  style={[styles.editInput, styles.editDescriptionInput]}
                  value={editPreface}
                  onChangeText={setEditPreface}
                  placeholder="Enter preface"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.editLabel}>Year of Publication</Text>
                <TextInput
                  style={styles.editInput}
                  value={editYear}
                  onChangeText={setEditYear}
                  placeholder="Enter year"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />

                {renderEditImagePicker('cover', editCoverImageUrl, 'Cover Image')}
                {renderEditImagePicker('thumbnail1', editThumbnail1Url, 'Thumbnail 1')}
                {renderEditImagePicker('thumbnail2', editThumbnail2Url, 'Thumbnail 2')}

                <View style={styles.editButtonRow}>
                  <TouchableOpacity
                    style={styles.editCancelButton}
                    onPress={handleCancelEdit}
                    disabled={isSavingEdit}
                  >
                    <Text style={styles.editCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editSaveButton, (isSavingEdit || editUploadingImage !== '') && styles.editSaveButtonDisabled]}
                    onPress={handleSaveEdit}
                    disabled={isSavingEdit || editUploadingImage !== ''}
                  >
                    {isSavingEdit ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.editSaveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {isSubmitting && (
        <Modal transparent={false} animationType="fade">
          <LoadingScreen message="Adding book..." />
        </Modal>
      )}

      {uploadingImage !== '' && (
        <Modal transparent={false} animationType="fade">
          <LoadingScreen message="Uploading image..." />
        </Modal>
      )}
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.linearGradient[0],
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
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

  // ========== Manage Books Modal Styles ==========
  manageModalContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.linearGradient[0],
  },
  manageModalGradient: {
    flex: 1,
  },
  manageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  manageModalHeaderText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
  },
  manageSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  manageSearchIcon: {
    marginRight: 8,
  },
  manageSearchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 8,
  },
  manageBooksList: {
    padding: 16,
    paddingTop: 4,
  },
  manageBookCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    marginLeft: 4,
  },
  manageEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  manageEmptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },

  // Book card in manage list
  bookManageCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bookManageCardHidden: {
    opacity: 0.6,
  },
  bookManageCover: {
    width: 56,
    height: 75,
    borderRadius: 6,
    marginRight: 12,
  },
  bookManageCoverPlaceholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookManageInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookManageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  bookManageAuthor: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bookManageMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  bookManageMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bookManageMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bookManageBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  bookManageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bookManageBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  bookManageActions: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookManageActionBtn: {
    margin: 0,
    padding: 0,
  },

  // ========== Edit Book Modal Styles ==========
  editFormScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  editFormCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.tint,
    marginBottom: 6,
  },
  editInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editDescriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  editImagePickerButton: {
    borderColor: colors.tint,
    borderRadius: 8,
    marginBottom: 6,
  },
  editImagePickerText: {
    fontSize: 13,
    color: colors.tint,
  },
  editImagePreviewContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  editCoverPreview: {
    width: 100,
    height: 133,
    borderRadius: 6,
  },
  editThumbPreview: {
    width: 70,
    height: 70,
    borderRadius: 6,
  },
  editRemoveImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.surface,
    borderRadius: 11,
    zIndex: 10,
  },
  editImageLoader: {
    position: 'absolute',
    top: '40%',
    left: '30%',
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editCancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  editSaveButton: {
    flex: 2,
    backgroundColor: colors.tint,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  editSaveButtonDisabled: {
    opacity: 0.6,
  },
  editSaveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default CreateBookTab;