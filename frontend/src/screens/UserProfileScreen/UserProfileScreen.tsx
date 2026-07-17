import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Switch, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useOrg } from '../../context/OrganizationContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const cloudinaryCloudName = Constants.expoConfig?.extra?.cloudinaryCloudName ?? '';
const uploadPresentProfiles = Constants.expoConfig?.extra?.uploadPresentProfiles ?? '';

import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

// ═══════════════════════════════════════════════════════════════════
//  Guest Profile — static, read-only, shows "Sign In" prompt
// ═══════════════════════════════════════════════════════════════════
const GuestProfileScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { theme, colors, toggleTheme } = useTheme();
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.header}>
          <View style={{ width: 60 }} />
          <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Your Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <View style={styles.profileCard}>

              {/* Guest Avatar */}
              <LinearGradient
                colors={[colors.secondary, colors.primary]}
                style={styles.profileImageBorder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.profileImageContainer}>
                  <Ionicons name="person-circle-outline" size={120} color={colors.tint} />
                </View>
              </LinearGradient>

              <View style={styles.infoContainer}>
                {/* Guest Info */}
                <View style={styles.guestMessageBox}>
                  <Ionicons name="eye-outline" size={22} color={colors.tint} />
                  <Text style={styles.guestTitle}>You're browsing as a Guest</Text>
                  <Text style={styles.guestSubtitle}>
                    Sign in to access your full profile, rent books, track your reading, and more.
                  </Text>
                </View>

                {/* Read-only fields */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Name</Text>
                  <Text style={styles.value}>Guest User</Text>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Status</Text>
                  <Text style={[styles.value, { color: '#f59e0b', fontWeight: '600' }]}>Read-Only Mode</Text>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] })}
                >
                  <LinearGradient
                    colors={colors.linearGradient}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="log-in-outline" size={20} color={colors.textLight} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Sign In / Create Account</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  Main UserProfileScreen — routes to Guest or Authenticated profile
// ═══════════════════════════════════════════════════════════════════
const UserProfileScreen = () => {
  const { isGuest, user, logout } = useAuth();
  const { activeOrg, orgRole } = useOrg();
  const navigation = useNavigation<any>();
  const { theme, colors, toggleTheme } = useTheme();
  const styles = getStyles(colors);

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
  const tempUploadedImages = React.useRef<string[]>([]);

  const handleRemoveProfileImage = async () => {
    if (imageUrl) {
      const publicId = extractPublicIdFromUrl(imageUrl);
      if (publicId) {
        tempUploadedImages.current = tempUploadedImages.current.filter(id => id !== publicId);
      }
      await deleteImageFromCloudinary(imageUrl);
      setImage(null);
      setImageUrl(null);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup unsaved temp uploads on unmount
      if (tempUploadedImages.current.length > 0) {
        tempUploadedImages.current.forEach(async (id) => {
          try {
            const token = await AsyncStorage.getItem('token');
            await axios.post(`${API_URL}/api/cloudinary/delete`, {
              token,
              publicId: id
            });
          } catch (err) {
            console.log('Error cleaning unsaved profile picture:', err);
          }
        });
      }
    };
  }, []);

  // Fetch user data using token from AsyncStorage
  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
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
          setImageUrl(data.image || null);
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
  }, [isGuest]);

  // If guest, render the static Guest Profile
  if (isGuest) {
    return <GuestProfileScreen />;
  }

  // Function to extract public_id from Cloudinary URL
  const extractPublicIdFromUrl = (url: any) => {
    if (!url) return null;

    try {
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1]; // Get the filename with extension
      const publicId = lastPart.split('.')[0]; // Remove the file extension

      const versionIndex = urlParts.findIndex((part: any) => part.startsWith('v') && /^\d+$/.test(part.substring(1)));
      if (versionIndex !== -1 && versionIndex < urlParts.length - 1) {
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
  const deleteImageFromCloudinary = async (imageUrl: any) => {
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
        console.log('Failed to delete old image:', response.data.message);
      }
    } catch (error) {
      console.error('Error deleting old image:', error);
    }
  };

  // Modified uploadImage function
  const uploadImage = async (uri: any) => {
    setIsUploading(true);
    try {
      if (imageUrl) {
        const oldPubId = extractPublicIdFromUrl(imageUrl);
        if (oldPubId) {
          tempUploadedImages.current = tempUploadedImages.current.filter(id => id !== oldPubId);
        }
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
        const newPubId = response.data.public_id;
        tempUploadedImages.current.push(newPubId);
        setImageUrl(response.data.secure_url);
        Alert.alert('Success', 'Profile image uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error.response ? error.response.data : error.message);
      Alert.alert('Error', `Failed to upload image. Details: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
      setImage(null);
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
        image: imageUrl,
      };

      const response = await axios.put(`${API_URL}/api/users/update`, updatedData);
      if (response.data.status === 'Ok') {
        setUserData({ ...userData, ...updatedData });
        setIsEditing(false);
        setImage(null); // Clear local image after successful save
        tempUploadedImages.current = [];
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An error occurred while updating your profile.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (userData) {
      setName(userData.name || '');
      setMobile(userData.mobile || '');
      setGender(userData.gender || '');
      setProfession(userData.profession || '');
      setImageUrl(userData.image || null);
    }
    setImage(null);
  };

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
              await logout();
              await AsyncStorage.removeItem('userType');
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

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  const displayImage = image || imageUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {/* Header with Logout */}
        <View style={styles.header}>
          <View style={{ width: 60 }} />
          <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Your Profile</Text>
          <View style={{ width: 60, alignItems: 'flex-end' }}>
            {!isGuest && (
              <TouchableOpacity
                onPress={handleLogout}
                activeOpacity={0.7}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                }}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <View style={styles.profileCard}>

              <LinearGradient
                colors={[colors.secondary, colors.primary]}
                style={styles.profileImageBorder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.profileImageContainer}>
                  {displayImage ? (
                    <Image source={{ uri: displayImage }} style={styles.profileImage} />
                  ) : (
                    <Ionicons name="person-circle-outline" size={120} color={colors.tint} />
                  )}
                  {isEditing && (
                    <TouchableOpacity
                      style={styles.editImageButton}
                      onPress={pickImage}
                      disabled={isUploading}
                    >
                      <Ionicons name="camera" size={24} color={colors.textLight} />
                    </TouchableOpacity>
                  )}
                  {isEditing && !!displayImage && (
                    <TouchableOpacity
                      style={[styles.editImageButton, { left: 10, right: undefined, backgroundColor: '#FF5252' }]}
                      onPress={handleRemoveProfileImage}
                      disabled={isUploading}
                    >
                      <Ionicons name="trash" size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                  {isUploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color={colors.primary} />
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

                {isEditing ? (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                    <TouchableOpacity
                      style={[styles.editButton, { flex: 1, marginTop: 0 }]}
                      onPress={handleCancelEdit}
                      disabled={isUploading}
                    >
                      <View style={[styles.buttonGradient, { backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#ccc' }]}>
                        <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.editButton, { flex: 1, marginTop: 0 }]}
                      onPress={saveProfile}
                      disabled={isUploading}
                    >
                      <LinearGradient
                        colors={colors.linearGradient}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.buttonText}>Save Profile</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                    disabled={isUploading}
                  >
                    <LinearGradient
                      colors={colors.linearGradient}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.buttonText}>Edit Profile</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* === Organization & SaaS Controls === */}
                {!isGuest && (
                  <View style={styles.orgControlsContainer}>

                    {orgRole === 'Admin' && (
                      <>
                        <TouchableOpacity
                          style={styles.orgControlBtn}
                          onPress={() => navigation.navigate('AdminScreen')}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="book-outline" size={20} color={colors.tint} style={{ marginRight: 10 }} />
                          <Text style={styles.orgControlBtnText}>Book Rental Dashboard</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.orgControlBtn}
                          onPress={() => navigation.navigate('OrgSettings')}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="settings-outline" size={20} color={colors.tint} style={{ marginRight: 10 }} />
                          <Text style={styles.orgControlBtnText}>Organization Settings</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {userData?.globalRole === 'SuperAdmin' && (
                      <TouchableOpacity
                        style={[styles.orgControlBtn, { borderColor: '#FFD700', borderWidth: 1 }]}
                        onPress={() => navigation.navigate('SuperAdmin')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="shield-checkmark-outline" size={20} color="#FFD700" style={{ marginRight: 10 }} />
                        <Text style={[styles.orgControlBtnText, { color: '#FFD700' }]}>SuperAdmin Panel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

              </View>

            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textLight,
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
    backgroundColor: colors.cardBg,
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
    backgroundColor: colors.inputBg,
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
    backgroundColor: colors.primary,
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
    color: colors.tint,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: colors.text,
  },
  disabled: {
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.tint,
  },
  rentedBooksContainer: {
    marginTop: 20,
  },
  bookItem: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  bookText: {
    fontSize: 14,
    color: colors.text,
    paddingRight: 80,
  },
  statusTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bookDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  noBooksText: {
    fontSize: 14,
    color: colors.textSecondary,
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
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.primary,
  },
  // Guest-specific styles
  guestMessageBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 8,
  },
  guestSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  themeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 15,
    marginBottom: 15,
  },
  orgControlsContainer: {
    width: '100%',
    marginVertical: 10,
    gap: 12,
  },
  orgControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  orgControlBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#E6F0FA',
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: colors.primary,
  },
});

export default UserProfileScreen;