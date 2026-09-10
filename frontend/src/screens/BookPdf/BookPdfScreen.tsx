import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, ColorsType } from '@/context/ThemeContext';
import { useSystemBars } from '@/hooks/useSystemBars';

export default function BookPdfComponent() {
  const { colors } = useTheme();
  // Matches the shared screen pattern: the gradient runs behind the status bar,
  // so the bar colour comes from the gradient's first stop, not the background.
  useSystemBars({ top: colors.linearGradient[0] });
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerText}>Book PDFs</Text>
            <Text style={styles.subtitleText}>Christian books and resources</Text>
          </View>
        </View>

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
      </LinearGradient>
    </SafeAreaView>
  );
}

// Header block mirrors HistoricalMaps / ReadingPlanner so the screens read as
// one family; only the copy differs.
const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    backgroundColor: colors.linearGradient[0],
  },
  gradient: { flex: 1 },
  headerContainer: { padding: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center' },
  headerTextWrapper: { flex: 1, alignItems: 'center' },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleText: { fontSize: 14, color: colors.textLight, textAlign: 'center', opacity: 0.9 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
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
  },
});
