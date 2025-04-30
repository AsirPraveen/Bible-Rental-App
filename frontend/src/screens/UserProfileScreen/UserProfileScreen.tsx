import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const API_URL = Constants.expoConfig.extra.apiUrl;

const UserProfileScreen = () => {
  const [userData, setUserData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('');
  const [profession, setProfession] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data using token from AsyncStorage
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Error', 'No user token found. Please log in again.');
          return;
        }

        const response = await axios.post(`${API_URL}/api/auth/userdata`, { token });
        if (response.data.status === 'Ok') {
          const data = response.data.data;
          setUserData(data);
          setName(data.name || '');
          setEmail(data.email || '');
          setMobile(data.mobile || '');
          setGender(data.gender || '');
          setProfession(data.profession || '');
          setImage(data.image || null);
        } else {
          Alert.alert('Error', 'Failed to fetch user data.');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'An error occurred while fetching user data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Function to pick a profile image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your photos to select an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Function to save updated user data
  const saveProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No user token found. Please log in again.');
        return;
      }

      const updatedData = {
        token,
        name,
        mobile,
        gender,
        profession,
        image, // In a real app, you'd upload this to a server and store the URL
      };

      const response = await axios.put(`${API_URL}/api/users/update`, updatedData);
      if (response.data.status === 'Ok') {
        setUserData({ ...userData, ...updatedData });
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An error occurred while updating your profile.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.headerText}>Your Profile</Text>

            <View style={styles.profileCard}>
              <LinearGradient
                colors={['#19A7CE', '#146C94']}
                style={styles.profileImageBorder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.profileImageContainer}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.profileImage} />
                  ) : (
                    <Ionicons name="person-circle-outline" size={120} color="#F6F1F1" />
                  )}
                  {isEditing && (
                    <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
                      <Ionicons name="camera" size={24} color="#F6F1F1" />
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>

              <View style={styles.infoContainer}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Name</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your name"
                      placeholderTextColor="#999"
                    />
                  ) : (
                    <Text style={styles.value}>{name || 'Not set'}</Text>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={[styles.value, styles.disabled]}>{email || 'Not set'}</Text>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Mobile</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={mobile}
                      onChangeText={setMobile}
                      placeholder="Enter your mobile number"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <Text style={styles.value}>{mobile || 'Not set'}</Text>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Gender</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={gender}
                      onChangeText={setGender}
                      placeholder="Enter your gender"
                      placeholderTextColor="#999"
                    />
                  ) : (
                    <Text style={styles.value}>{gender || 'Not set'}</Text>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Profession</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={profession}
                      onChangeText={setProfession}
                      placeholder="Enter your profession"
                      placeholderTextColor="#999"
                    />
                  ) : (
                    <Text style={styles.value}>{profession || 'Not set'}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => (isEditing ? saveProfile() : setIsEditing(true))}
                >
                  <LinearGradient
                    colors={['#146C94', '#19A7CE']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.buttonText}>{isEditing ? 'Save Profile' : 'Edit Profile'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.rentedBooksContainer}>
                  <Text style={styles.label}>Books Rented</Text>
                  {userData?.books_rented?.length > 0 ? (
                    userData.books_rented.map((book: any, index: number) => (
                      <View key={index} style={styles.bookItem}>
                        <Text style={styles.bookText}>Book ID: {book.book_id}</Text>
                        <Text style={[styles.bookStatus, { color: book.status === 'approved' ? '#4CAF50' : book.status === 'rejected' ? '#F44336' : '#FF9800' }]}>
                          Status: {book.status}
                        </Text>
                        <Text style={styles.bookDate}>Requested: {new Date(book.requested_at).toLocaleDateString()}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noBooksText}>No books rented yet.</Text>
                  )}
                </View>
              </View>

            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
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
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  profileImageBorder: {
    borderRadius: 75,
    padding: 4,
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#146C94',
    borderRadius: 20,
    padding: 8,
  },
  infoContainer: {
    marginTop: 10,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  disabled: {
    color: '#999',
  },
  input: {
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rentedBooksContainer: {
    marginTop: 20,
  },
  bookItem: {
    backgroundColor: '#E6F0FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  bookText: {
    fontSize: 14,
    color: '#333',
  },
  bookStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  bookDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  noBooksText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  editButton: {
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F6F1F1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F1F1',
  },
  loadingText: {
    fontSize: 16,
    color: '#146C94',
  },
});

export default UserProfileScreen;