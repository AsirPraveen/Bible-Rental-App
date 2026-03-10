import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, Image, TouchableOpacity, Platform, StatusBar, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker'; // Updated to compatible version

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const cloudinaryCloudName = Constants.expoConfig?.extra?.cloudinaryCloudName ?? '';
const uploadPresentPosts = Constants.expoConfig?.extra?.uploadPresentPosts ?? '';

const CreatePostTab = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | null>(null); // Store date as Date object
  const [time, setTime] = useState<Date | null>(null); // Store time as Date object
  const [imageUri, setImageUri] = useState<string | null>(null); // Store local image URI temporarily
  const [imageUrl, setImageUrl] = useState<string | null>(null); // Store Cloudinary URL
  const [showDatePicker, setShowDatePicker] = useState(false); // Control date picker visibility
  const [showTimePicker, setShowTimePicker] = useState(false); // Control time picker visibility
  const [isUploading, setIsUploading] = useState(false); // Track upload status for loader

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
        setImageUrl(response.data.secure_url);
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
      Alert.alert('Error', 'Please select a date.');
      return { formattedDate: '', formattedTime: null };
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
  const handlePost = async () => {
    if (!title || !description || !date) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Description, Date).');
      return;
    }

    const { formattedDate, formattedTime } = formatDateTime();

    if (!formattedDate) {
      return;
    }

    try {
      const newPost = {
        title,
        description,
        date: formattedDate,
        time: formattedTime,
        imageUrl: imageUrl || null,
      };

      await axios.post(`${API_URL}/api/posts`, newPost);
      Alert.alert('Success', 'Post created successfully!');

      setTitle('');
      setDescription('');
      setDate(null);
      setTime(null);
      setImageUri(null);
      setImageUrl(null);
    } catch (error) {
      console.error('Error saving post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.headerText}>Create New Post</Text>

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

              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity onPress={() => { console.log('Opening Date Picker'); setShowDatePicker(true); }} style={styles.dateInput}>
                <Text style={styles.dateText}>
                  {date ? date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : 'Select Date'}
                </Text>
              </TouchableOpacity>
              <Modal
                transparent={true}
                visible={showDatePicker}
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
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

              <Text style={styles.label}>Time (Optional)</Text>
              <TouchableOpacity onPress={() => { console.log('Opening Time Picker'); setShowTimePicker(true); }} style={styles.dateInput}>
                <Text style={styles.dateText}>
                  {time ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Select Time'}
                </Text>
              </TouchableOpacity>
              <Modal
                transparent={true}
                visible={showTimePicker}
                animationType="fade"
                onRequestClose={() => setShowTimePicker(false)}
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
                  {isUploading && <ActivityIndicator size="large" color="#146C94" style={styles.loader} />}
                </View>
              )}

              <Button
                mode="contained"
                onPress={handlePost}
                style={styles.postButton}
                labelStyle={styles.buttonText}
                disabled={isUploading}
              >
                Post
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
  dateInput: {
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 10,
    justifyContent: 'center',
  },
  dateText: {
    color: '#333',
  },
  imagePickerButton: {
    borderColor: '#146C94',
    borderRadius: 8,
    marginBottom: 16,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#146C94',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
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
    backgroundColor: '#146C94',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#146C94',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 20,
  },
});

export default CreatePostTab;