import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const GameStudyArea = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={colors.linearGradient} style={styles.container}>
        <View style={styles.content}>
          <MaterialCommunityIcons name="book-open-page-variant" size={80} color={colors.theme === 'dark' ? '#DDD6FE' : '#FFF'} />
          <Text style={styles.title}>The Study Area</Text>
          <Text style={styles.desc}>Cards placed here will passively gain XP when you read books in the main app.</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.theme === 'dark' ? '#2E1065' : colors.primary },
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: colors.theme === 'dark' ? '#FFF' : colors.text, fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  desc: { color: colors.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 10 }
});

export default GameStudyArea;
