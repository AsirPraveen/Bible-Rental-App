import React from 'react';
import { View, StyleSheet, Platform, StatusBar, SafeAreaView, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ColorsType } from '../../context/ThemeContext';

export default function BookPdfComponent() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.outer_container}>
      <View style={styles.container}>
        <View style={styles.comingSoonContainer}>
          <Ionicons name="book" size={80} color={colors.tint} />
          <Text style={styles.comingSoonTitle}>Book PDFs</Text>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
          <Text style={styles.comingSoonDescription}>
            Christian books and resources will be available for reading and download
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.tint,
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 20,
  },
  comingSoonDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
});