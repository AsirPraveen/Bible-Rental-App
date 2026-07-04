import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import LoadingScreen from '../../components/LoadingScreen';
import { useOrg } from '../../context/OrganizationContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const cloudinaryCloudName = Constants.expoConfig?.extra?.cloudinaryCloudName ?? '';
const uploadPresentProfiles = Constants.expoConfig?.extra?.uploadPresentProfiles ?? '';

import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Onboarding: undefined;
  // Add other routes here if needed
};

const AboutAdminTab = () => {
  const navigation = useNavigation<any>();
  const { memberships, activeOrg, switchOrg } = useOrg();
  const [showDropdown, setShowDropdown] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('');
  const [profession, setProfession] = useState('');
  const [image, setImage] = useState<string | null>(null); // Local image URI
  const [imageUrl, setImageUrl] = useState<string | null>(null); // Cloudinary URL
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false); // Track upload status for loader

  // Fetch user data using token from AsyncStorage
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
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
          setImageUrl(data.image || null); // Set the Cloudinary URL from database
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

  // Function to handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              // Clear all stored data
              await AsyncStorage.multiRemove(['token', 'isLoggedIn', 'userType']);
              
              // Reset navigation stack and navigate to Onboarding
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'An error occurred during logout.');
            }
          },
        },
      ]
    );
  };

  // Function to extract public_id from Cloudinary URL
  const extractPublicIdFromUrl = (url: string | null) => {
    if (!url) return null;
    
    try {
      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/{type}/{version}/{public_id}.{format}
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1]; // Get the filename with extension
      const publicId = lastPart.split('.')[0]; // Remove the file extension
      
      // Handle versioned URLs (with v1234567890 in the path)
      const versionIndex = urlParts.findIndex(part => part.startsWith('v') && /^\d+$/.test(part.substring(1)));
      if (versionIndex !== -1 && versionIndex < urlParts.length - 1) {
        // If there's a version, the public_id might include folder structure
        const pathAfterVersion = urlParts.slice(versionIndex + 1);
        return pathAfterVersion.join('/').split('.')[0];
      }
      
      return publicId;
    } catch (error) {
      console.error('Error extracting public_id:', error);
      return null;
    }
  };

  // Function to delete image from Cloudinary
  const deleteImageFromCloudinary = async (imageUrl: string | null) => {
    try {
      const publicId = extractPublicIdFromUrl(imageUrl);
      if (!publicId) {
        console.log('No valid public_id found for deletion');
        return;
      }

      console.log('Attempting to delete image with public_id:', publicId);

      const token = await AsyncStorage.getItem('token');
      
      const response = await axios.post(`${API_URL}/api/cloudinary/delete`, {
        token,
        publicId: publicId
      });

      if (response.data.status === 'Ok') {
        console.log('Old image deleted successfully');
      } else {
        console.log('Failed to delete old image:', response.data.data);
      }
    } catch (error) {
      console.error('Error deleting old image:', error);
      // Don't throw error here as we don't want to block the new upload
    }
  };

  // Function to upload image to Cloudinary using axios
  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      // Delete old image first if it exists
      if (imageUrl) {
        await deleteImageFromCloudinary(imageUrl);
      }

      const fileExtension = uri.split('.').pop()?.toLowerCase();
      const mimeType = fileExtension === 'png' ? 'image/png' : fileExtension === 'gif' ? 'image/gif' : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: mimeType,
        name: `profile_image_${Date.now()}.${fileExtension || 'jpg'}`,
      } as any);
      formData.append('upload_preset', uploadPresentProfiles);

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
        Alert.alert('Success', 'Profile image uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error.response ? error.response.data : error.message);
      Alert.alert('Error', `Failed to upload image. Details: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
      setImage(null); // Clear local image if upload fails
    } finally {
      setIsUploading(false);
    }
  };

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
      await uploadImage(result.assets[0].uri);
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
        image: imageUrl, // Save the Cloudinary URL instead of local URI
      };

      const response = await axios.put(`${API_URL}/api/users/update`, updatedData);
      if (response.data.status === 'Ok') {
        setUserData({ ...userData, ...updatedData });
        setIsEditing(false);
        setImage(null); // Clear local image after successful save
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
    return <LoadingScreen message="Loading profile..." />;
  }

  // Determine which image to display (local or Cloudinary URL)
  const displayImage = image || imageUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        {/* Header with Switch Workspace Dropdown */}
        <View style={styles.header}>
          <View style={{ width: 60 }} />
          <Text style={styles.headerText}>Admin Profile</Text>
          <View style={{ width: 60, alignItems: 'flex-end' }}>
            <TouchableOpacity 
              onPress={() => setShowDropdown(true)}
              activeOpacity={0.7}
              style={{
                padding: 6,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={20} color="#F6F1F1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Switch Organization Dropdown Modal */}
        <Modal
          visible={showDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownTitle}>Switch Workspace</Text>
              
              {memberships.map((item: any) => {
                const org = item.organization;
                const isCurrent = org._id === activeOrg?._id;
                
                return (
                  <TouchableOpacity
                    key={org._id}
                    style={[styles.dropdownItem, isCurrent && styles.dropdownItemActive]}
                    onPress={async () => {
                      setShowDropdown(false);
                      if (isCurrent) return;
                      
                      const success = await switchOrg(org._id);
                      if (success) {
                        if (item.role === 'Admin') {
                          navigation.reset({
                            index: 0,
                            routes: [{ name: 'AdminScreen' }]
                          });
                        } else {
                          navigation.replace('MainApp');
                        }
                      } else {
                        Alert.alert('Error', 'Failed to switch organization.');
                      }
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="office-building" 
                      size={20} 
                      color={isCurrent ? '#146C94' : '#666'} 
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dropdownItemText, isCurrent && styles.dropdownItemTextActive]}>
                        {org.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                        Role: {item.role}
                      </Text>
                    </View>
                    {isCurrent && (
                      <Ionicons name="checkmark-circle" size={18} color="#146C94" />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.dropdownItem, { borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 8, paddingTop: 12 }]}
                onPress={() => {
                  setShowDropdown(false);
                  navigation.navigate('OrgSelection');
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#146C94" style={{ marginRight: 10 }} />
                <Text style={[styles.dropdownItemText, { color: '#146C94' }]}>
                  Add Workspace
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <View style={styles.profileCard}>
              <LinearGradient
                colors={['#19A7CE', '#146C94']}
                style={styles.profileImageBorder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.profileImageContainer}>
                  {displayImage ? (
                    <Image source={{ uri: displayImage }} style={styles.profileImage} />
                  ) : (
                    <Ionicons name="person-circle-outline" size={120} color="#F6F1F1" />
                  )}
                  {isEditing && (
                    <TouchableOpacity 
                      style={styles.editImageButton} 
                      onPress={pickImage}
                      disabled={isUploading}
                    >
                      <Ionicons name="camera" size={24} color="#F6F1F1" />
                    </TouchableOpacity>
                  )}
                  {isUploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color="#146C94" />
                    </View>
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
                  disabled={isUploading}
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

                {!isEditing && (
                  <>
                    <TouchableOpacity
                      style={[styles.editButton, { marginTop: 12 }]}
                      onPress={() => navigation.navigate('AppSettings')}
                    >
                      <LinearGradient
                        colors={['#146C94', '#19A7CE']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <View style={styles.btnRow}>
                          <MaterialCommunityIcons name="cog" size={20} color="#fff" />
                          <Text style={styles.buttonText}>App Configuration</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.editButton, { marginTop: 12 }]}
                      onPress={() => navigation.navigate('MemberManagement')}
                    >
                      <LinearGradient
                        colors={['#146C94', '#19A7CE']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <View style={styles.btnRow}>
                          <MaterialCommunityIcons name="account-group" size={20} color="#fff" />
                          <Text style={styles.buttonText}>Manage Members</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 16,
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
    position: 'relative',
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
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
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
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingRight: 20,
  },
  dropdownContainer: {
    width: 250,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dropdownItemActive: {
    backgroundColor: '#E6F0FA',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: '#146C94',
  },
});

export default AboutAdminTab;