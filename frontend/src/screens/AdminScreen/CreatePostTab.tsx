import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, Image, TouchableOpacity, Platform, StatusBar, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { Button, IconButton, Chip, Switch } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker'; // Updated to compatible version
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import LoadingScreen from '../../components/LoadingScreen';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const cloudinaryCloudName = Constants.expoConfig?.extra?.cloudinaryCloudName ?? '';
const uploadPresentPosts = Constants.expoConfig?.extra?.uploadPresentPosts ?? '';

const CreatePostTab = () => {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | null>(null); // Store date as Date object
  const [time, setTime] = useState<Date | null>(null); // Store time as Date object
  const [imageUri, setImageUri] = useState<string | null>(null); // Store local image URI temporarily
  const [imageUrl, setImageUrl] = useState<string | null>(null); // Store Cloudinary URL
  const [imagePublicId, setImagePublicId] = useState('');
  const tempUploadedImages = React.useRef<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false); // Control date picker visibility
  const [showTimePicker, setShowTimePicker] = useState(false); // Control time picker visibility
  const [isUploading, setIsUploading] = useState(false); // Track upload status for loader

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

  const handleRemoveImage = async () => {
    const pubId = imagePublicId;
    setImageUri(null);
    setImageUrl(null);
    setImagePublicId('');
    if (pubId) {
      tempUploadedImages.current = tempUploadedImages.current.filter(id => id !== pubId);
      await deleteImageFromCloudinary(pubId);
    }
  };

  React.useEffect(() => {
    return () => {
      if (tempUploadedImages.current.length > 0) {
        tempUploadedImages.current.forEach(async (id) => {
          await deleteImageFromCloudinary(id);
        });
      }
    };
  }, []);

  // Targeting fields
  const [audienceType, setAudienceType] = useState<'all' | 'specific'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [showInNotification, setShowInNotification] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Post Management state
  const [isManageModalVisible, setIsManageModalVisible] = useState(false);
  const [adminPosts, setAdminPosts] = useState<any[]>([]);
  const [loadingAdminPosts, setLoadingAdminPosts] = useState(false);

  // Function to handle user search
  const handleUserSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await axios.get(`${API_URL}/api/users/search?query=${text}`);
      if (res.data.status === 'Ok') {
        setSearchResults(res.data.data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleUserSelection = (user: any) => {
    if (selectedUsers.some(u => u.email === user.email)) {
      setSelectedUsers(selectedUsers.filter(u => u.email !== user.email));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Function to fetch all posts for management
  const fetchAdminPosts = async () => {
    setLoadingAdminPosts(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/posts`);
      if (res.data.status === 'Ok') {
        setAdminPosts(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching admin posts:', error);
      Alert.alert('Error', 'Failed to fetch posts');
    } finally {
      setLoadingAdminPosts(false);
    }
  };

  // Function to delete a post
  const handleDeletePost = (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post permanentley?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await axios.delete(`${API_URL}/api/posts/${postId}`);
              if (res.data.status === 'Ok') {
                Alert.alert('Success', 'Post deleted successfully');
                fetchAdminPosts(); // Refresh list
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
  };

  // Function to pick an image from the device
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your photos to select an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      await uploadImage(result.assets[0].uri);
    }
  };

  // Function to upload image to Cloudinary using axios
  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const oldPublicId = imagePublicId;
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
        name: `post_image_${Date.now()}.${fileExtension || 'jpg'}`,
      } as any);
      formData.append('upload_preset', uploadPresentPosts);

      console.log('Uploading to:', `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`);
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
        setImageUrl(response.data.secure_url);
        setImagePublicId(newPubId);
        Alert.alert('Success', 'Image uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error.response ? error.response.data : error.message);
      Alert.alert('Error', `Failed to upload image. Details: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
      setImageUri(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Function to handle date change
  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Function to handle time change
  const onTimeChange = (event: any, selectedTime: Date | undefined) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  // Function to format the date and time for submission
  const formatDateTime = () => {
    if (!date) {
      return { formattedDate: null, formattedTime: null };
    }

    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    }).replace(/(\d+)/, '$1').replace(',', ', ');

    let formattedTime = time ? time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase() : null;

    return { formattedDate, formattedTime };
  };

  // Function to save the post to MongoDB via API
  const submitPost = async () => {
    const { formattedDate, formattedTime } = formatDateTime();

    setIsPosting(true);
    try {
      const newPost = {
        title,
        description,
        date: formattedDate,
        time: formattedTime,
        imageUrl: imageUrl || null,
        audienceType,
        targetUsers: audienceType === 'specific' ? selectedUsers.map(u => u.email) : [],
        showInNotification,
      };

      console.log('Sending post data:', newPost);
      const response = await axios.post(`${API_URL}/api/posts`, newPost);
      console.log('Post response:', response.data);
      Alert.alert('Success', 'Post created successfully!');

      setTitle('');
      setDescription('');
      setDate(null);
      setTime(null);
      setImageUri(null);
      setImageUrl(null);
      setImagePublicId('');
      tempUploadedImages.current = [];
      setAudienceType('all');
      setSelectedUsers([]);
      setShowInNotification(false);
    } catch (error) {
      console.error('Error saving post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePost = () => {
    if (!title || !description) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Description).');
      return;
    }

    Alert.alert(
      'Confirm Post',
      'Are you sure you want to create and send this post?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: submitPost,
          style: 'default',
        },
      ],
      { cancelable: true }
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
              <Text style={styles.headerText}>Create New Post</Text>
              <IconButton
                icon="history"
                iconColor="#F6F1F1"
                size={28}
                onPress={() => {
                  fetchAdminPosts();
                  setIsManageModalVisible(true);
                }}
              />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter post title"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter post description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />

              {/* Targeting Section */}
              <Text style={styles.label}>Target Audience</Text>
              <View style={styles.audienceContainer}>
                <TouchableOpacity
                  onPress={() => setAudienceType('all')}
                  style={[styles.audienceButton, audienceType === 'all' && styles.audienceButtonActive]}
                >
                  <Text style={[styles.audienceButtonText, audienceType === 'all' && styles.audienceButtonTextActive]}>All Users</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAudienceType('specific')}
                  style={[styles.audienceButton, audienceType === 'specific' && styles.audienceButtonActive]}
                >
                  <Text style={[styles.audienceButtonText, audienceType === 'specific' && styles.audienceButtonTextActive]}>Specific Users</Text>
                </TouchableOpacity>
              </View>

              {audienceType === 'specific' && (
                <View style={styles.specificUsersSection}>
                  <Text style={styles.subLabel}>Search and Add Users</Text>
                  <TextInput
                    style={styles.input}
                    value={searchQuery}
                    onChangeText={handleUserSearch}
                    placeholder="Enter name or email..."
                    placeholderTextColor="#999"
                  />
                  {isSearching && <ActivityIndicator size="small" color="#146C94" style={{ marginBottom: 10 }} />}

                  {searchResults.length > 0 && (
                    <View style={styles.searchResultsContainer}>
                      {searchResults.map((user) => (
                        <TouchableOpacity
                          key={user._id}
                          style={styles.searchResultItem}
                          onPress={() => toggleUserSelection(user)}
                        >
                          <Text style={styles.searchResultText}>{user.name} ({user.email})</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={styles.chipsContainer}>
                    {selectedUsers.map((user) => (
                      <Chip
                        key={user._id}
                        onClose={() => toggleUserSelection(user)}
                        style={styles.chip}
                        textStyle={styles.chipText}
                      >
                        {user.name}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.notificationToggleContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Keep in notification history</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>Always triggers a push notification</Text>
                </View>
                <Switch
                  value={showInNotification}
                  onValueChange={setShowInNotification}
                  color="#146C94"
                />
              </View>

              <Text style={styles.label}>Date (Optional)</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInput}>
                <Text style={styles.dateText}>
                  {date ? date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : 'Select Date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                Platform.OS === 'ios' ? (
                  <Modal
                    transparent={true}
                    visible={showDatePicker}
                    animationType="fade"
                    onRequestClose={() => setShowDatePicker(false)}
                    statusBarTranslucent={true}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <DateTimePicker
                          value={date || new Date()}
                          mode="date"
                          display="spinner"
                          onChange={onDateChange}
                        />
                        <Button
                          mode="contained"
                          onPress={() => setShowDatePicker(false)}
                          style={styles.modalButton}
                          labelStyle={styles.buttonText}
                        >
                          Close
                        </Button>
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )
              )}

              <Text style={styles.label}>Time (Optional)</Text>
              <TouchableOpacity onPress={() => { setShowTimePicker(true); }} style={styles.dateInput}>
                <Text style={styles.dateText}>
                  {time ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Select Time'}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                Platform.OS === 'ios' ? (
                  <Modal
                    transparent={true}
                    visible={showTimePicker}
                    animationType="fade"
                    onRequestClose={() => setShowTimePicker(false)}
                    statusBarTranslucent={true}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <DateTimePicker
                          value={time || new Date()}
                          mode="time"
                          display="spinner"
                          onChange={onTimeChange}
                        />
                        <Button
                          mode="contained"
                          onPress={() => setShowTimePicker(false)}
                          style={styles.modalButton}
                          labelStyle={styles.buttonText}
                        >
                          Close
                        </Button>
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={time || new Date()}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                  />
                )
              )}

              <Text style={styles.label}>Image (Optional)</Text>
              <Button
                mode="outlined"
                onPress={pickImage}
                style={styles.imagePickerButton}
                labelStyle={styles.imagePickerText}
              >
                Select Image
              </Button>
              {imageUri && (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={handleRemoveImage}
                    disabled={isUploading}
                  >
                    <Ionicons name="close-circle" size={28} color="#FF5252" />
                  </TouchableOpacity>
                  {isUploading && <ActivityIndicator size="large" color="#146C94" style={styles.loader} />}
                </View>
              )}

              <Button
                mode="contained"
                onPress={handlePost}
                style={styles.postButton}
                labelStyle={styles.buttonText}
                disabled={isUploading || isPosting}
                loading={isPosting}
              >
                {isPosting ? 'Posting...' : 'Post'}
              </Button>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Post Management Modal */}
      <Modal
        visible={isManageModalVisible}
        animationType="fade"
        onRequestClose={() => setIsManageModalVisible(false)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.modalFullContainer}>
          <StatusBar barStyle="light-content" backgroundColor={colors.linearGradient[0]} />
          <LinearGradient colors={colors.linearGradient} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <IconButton
                icon="close"
                iconColor="#F6F1F1"
                size={28}
                onPress={() => setIsManageModalVisible(false)}
              />
              <Text style={styles.modalHeaderText}>Manage Posts</Text>
              <View style={{ width: 48 }} />
            </View>

            {loadingAdminPosts ? (
              <LoadingScreen variant="transparent" message="Loading posts..." />
            ) : (
              <ScrollView contentContainerStyle={styles.postsListContainer}>
                {adminPosts.length === 0 ? (
                  <Text style={styles.emptyText}>No posts found</Text>
                ) : (
                  adminPosts.map((item) => (
                    <View key={item._id} style={styles.postManageCard}>
                      <View style={styles.postInfo}>
                        <Text style={styles.postManageTitle}>{item.title}</Text>
                        <Text style={styles.postManageDate}>
                          {item.date || 'No Date'} {item.time ? `at ${item.time}` : ''}
                        </Text>

                        <Text style={styles.postManageDescription} numberOfLines={2}>
                          {item.description}
                        </Text>

                        {item.imageUrl && (
                          <Image source={{ uri: item.imageUrl }} style={styles.postManageThumbnail} />
                        )}

                        {item.audienceType === 'specific' && item.targetUsers?.length > 0 && (
                          <View style={styles.targetUsersList}>
                            <Text style={styles.targetUsersLabel}>Sent to:</Text>
                            <Text style={styles.targetUsersText}>
                              {item.targetUsers.join(', ')}
                            </Text>
                          </View>
                        )}

                        <View style={styles.badgeRow}>
                          <View style={[styles.badge, { backgroundColor: item.audienceType === 'all' ? '#4CAF50' : '#FF9800' }]}>
                            <Text style={styles.badgeText}>
                              {item.audienceType === 'all' ? 'All Users' : `Specific (${item.targetUsers?.length || 0})`}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: item.showInNotification ? '#2196F3' : '#9E9E9E' }]}>
                            <Text style={styles.badgeText}>
                              {item.showInNotification ? 'In History' : 'Push Only'}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: '#E91E63' }]}>
                            <Text style={styles.badgeText}>❤️ {item.likes || 0}</Text>
                          </View>
                        </View>
                      </View>

                      <IconButton
                        icon="delete-outline"
                        iconColor="#FF5252"
                        size={24}
                        onPress={() => handleDeletePost(item._id)}
                      />
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {isPosting && (
        <Modal transparent={false} animationType="fade">
          <LoadingScreen message="Creating post..." />
        </Modal>
      )}

      {isUploading && (
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
  dateInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  dateText: {
    color: colors.text,
  },
  imagePickerButton: {
    borderColor: colors.tint,
    borderRadius: 8,
    marginBottom: 16,
  },
  imagePickerText: {
    fontSize: 16,
    color: colors.tint,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: colors.surface,
    borderRadius: 14,
    zIndex: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  postButton: {
    backgroundColor: colors.tint,
    borderRadius: 8,
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 16,
    color: '#F6F1F1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalButton: {
    backgroundColor: colors.tint,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 20,
  },
  audienceContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 4,
  },
  audienceButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  audienceButtonActive: {
    backgroundColor: colors.tint,
  },
  audienceButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  audienceButtonTextActive: {
    color: '#fff',
  },
  specificUsersSection: {
    marginBottom: 16,
  },
  subLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  searchResultsContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 150,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultText: {
    fontSize: 14,
    color: colors.text,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : '#E6F0FA',
  },
  chipText: {
    color: colors.tint,
    fontSize: 12,
  },
  notificationToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
  },
  modalFullContainer: {
    flex: 1,
    backgroundColor: colors.linearGradient[0],
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F6F1F1',
  },
  postsListContainer: {
    padding: 16,
  },
  postManageCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postInfo: {
    flex: 1,
  },
  postManageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  postManageDate: {
    fontSize: 12,
    color: colors.tint,
    fontWeight: '600',
    marginBottom: 4,
  },
  postManageDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  postManageThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  targetUsersList: {
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  targetUsersLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.tint,
    marginBottom: 2,
  },
  targetUsersText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#F6F1F1',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    opacity: 0.8,
  },
});

export default CreatePostTab;