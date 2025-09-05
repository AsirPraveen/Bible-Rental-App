import React from 'react';
import { View, StyleSheet, Platform, StatusBar, SafeAreaView, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

export default function BookPdfComponent() {
  return (
    <SafeAreaView style={styles.outer_container}>
      <View style={styles.container}>
        <View style={styles.comingSoonContainer}>
          <Ionicons name="book" size={80} color="#146C94" />
          <Text style={styles.comingSoonTitle}>Book PDFs</Text>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
          <Text style={styles.comingSoonDescription}>
            Christian books and resources will be available for download
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F6F1F1',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#146C94',
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#19A7CE',
    marginBottom: 20,
  },
  comingSoonDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
});