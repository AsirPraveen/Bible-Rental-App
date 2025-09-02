import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Platform, StatusBar, SafeAreaView } from 'react-native';
import { colors } from '../../utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NavigationProp } from '@react-navigation/native';

const AboutAdminTab = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();

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

  return (
    <SafeAreaView style={styles.outer_container}>
    <View style={styles.container}>
      {/* Header with Logout Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>About Admin</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.bg} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Image
          source={{ uri: 'https://via.placeholder.com/150' }} // Replace with admin's photo
          style={styles.adminPhoto}
        />
        <Text style={styles.adminName}>John Doe</Text>
        <Text style={styles.adminRole}>Admin</Text>
        <Text style={styles.adminBio}>
          John Doe has been managing the library system for over 5 years. He is passionate about books and technology, ensuring that the library runs smoothly and efficiently.
        </Text>
        <Text style={styles.adminContact}>Email: john.doe@library.com</Text>
        <Text style={styles.adminContact}>Phone: +1 234 567 890</Text>
      </View>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
    // justifyContent: 'center',
    // alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.inactive,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(20, 108, 148, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 108, 148, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.bg,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 108, 148, 0.1)',
  },
  section: {
    padding: 15,
    alignItems: 'center',
  },
  adminPhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.bg,
    marginBottom: 5,
  },
  adminRole: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  adminBio: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  adminContact: {
    fontSize: 14,
    color: colors.bg,
    marginBottom: 5,
  },
});

export default AboutAdminTab;