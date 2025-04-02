import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../../utils/colors';

const AboutAdminTab = () => {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Admin</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.inactive,
  },
  section: {
    padding: 15,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.bg,
    marginBottom: 20,
  },
  adminPhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
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
  },
  adminContact: {
    fontSize: 14,
    color: colors.bg,
    marginBottom: 5,
  },
});

export default AboutAdminTab;