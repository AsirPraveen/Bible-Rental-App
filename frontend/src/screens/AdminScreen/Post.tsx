import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';

const API_URL = Constants.expoConfig.extra.apiUrl;

const Post = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(''); // Store date as string
  const [time, setTime] = useState(''); // Store time as string
  const [imageUri, setImageUri] = useState<string | null>(null); // Store local image URI

  // Function to pick an image from the device
  const pickImage = async () => {
    // Request permission to access media library
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
      setImageUri(result.assets[0].uri); // Set the local URI of the selected image
    }
  };

  // Function to format the date and time for submission
  const formatDateTime = (date: string, time: string) => {
    let formattedDate = date.trim();
    let formattedTime = time.trim() || null;

    // Basic validation for date (e.g., "Month Day, Year" format)
    const dateRegex = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2},\s\d{4}$/i;
    if (date && !dateRegex.test(date)) {
      formattedDate = ''; // Reset if invalid
      Alert.alert('Invalid Date', 'Please enter date as "Month Day, Year" (e.g., "May 01, 2025").');
    }

    // Basic validation for time (e.g., "HH:MM AM/PM" format)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM|am|pm)?$/;
    if (time && !timeRegex.test(time)) {
      formattedTime = null;
      Alert.alert('Invalid Time', 'Please enter time as "HH:MM AM/PM" (e.g., "02:30 PM").');
    }

    return { formattedDate, formattedTime };
  };

  // Function to save the post to MongoDB via API
  const handlePost = async () => {
    if (!title || !description || !date) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Description, Date).');
      return;
    }

    const { formattedDate, formattedTime } = formatDateTime(date, time);

    if (!formattedDate) {
      return; // Stop if date is invalid
    }

    try {
      const newPost = {
        title,
        description,
        date: formattedDate,
        time: formattedTime,
        imageUrl: imageUri || null, // Use local URI for now; in a real app, upload to a server
      };

      await axios.post(`${API_URL}/api/posts`, newPost);
      Alert.alert('Success', 'Post created successfully!');

      // Reset the form
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setImageUri(null);
    } catch (error) {
      console.error('Error saving post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  return (
    <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.headerText}>Create a New Post</Text>

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
            <TextInput
              style={styles.dateInput}
              value={date}
              onChangeText={setDate}
              placeholder="e.g., May 01, 2025"
              placeholderTextColor="#999"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Time (Optional)</Text>
            <TextInput
              style={styles.dateInput}
              value={time}
              onChangeText={setTime}
              placeholder="e.g., 02:30 PM"
              placeholderTextColor="#999"
              keyboardType="default" // Could use 'numeric' for time entry
            />

            <Text style={styles.label}>Image (Optional)</Text>
            <Button
              mode="outlined"
              onPress={pickImage}
              style={styles.imagePickerButton}
              labelStyle={styles.imagePickerText}
            >
              Select Image
            </Button>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            ) : null}

            <Button
              mode="contained"
              onPress={handlePost}
              style={styles.postButton}
              labelStyle={styles.buttonText}
            >
              Post
            </Button>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
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
    paddingVertical: 10, // Adjusted padding for better look
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
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
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
});

export default Post;