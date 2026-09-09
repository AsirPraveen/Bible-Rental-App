import { View, Text, Image, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from "react";
import { useFonts, Sora_600SemiBold } from "@expo-google-fonts/sora";
import { getStyles } from "./styles";
import { useTheme } from '@/context/ThemeContext';
import { useSystemBars } from '@/hooks/useSystemBars';

type OnboardingViewProps = {
  onGetStarted: () => void;
  loading: boolean;
};

export default function OnboardingView({ onGetStarted, loading }: OnboardingViewProps) {
  const { colors } = useTheme();
  // The status bar sits on background.jpg under a black scrim: rgba(0,0,0,.65)
  // in dark theme, rgba(0,0,0,.1) in light. The image cannot be sampled from
  // code, so these stand in for the composited result.
  useSystemBars({ top: colors.theme === 'dark' ? '#111111' : '#E8E8E8' });
  const styles = getStyles(colors);

  let [fontsLoaded] = useFonts({
    Sora_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ImageBackground
        source={require("../../assets/background.jpg")}
        style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center" }}
        resizeMode="cover"
      >
        {/* Dynamic theme-responsive overlay */}
        <View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.theme === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.1)'
        }} />

        <View style={styles.container_inner}>
          <Text style={[styles.text, styles.header]}>
            Your word is a lamp to my feet and a light to my path.
          </Text>
          <Text style={styles.description}>
            A library for the soul, a path to wisdom.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { width: '80%' }]}
          onPress={onGetStarted}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator 
              size={Platform.OS === 'ios' ? 'small' : 24} 
              color={colors.theme === 'dark' ? '#fff' : 'rgba(0,0,0,0.7)'} 
              style={Platform.OS === 'ios' ? { transform: [{ scale: 1.25 }] } : {}}
            />
          ) : (
            <Text style={styles.button_text}>Get Started</Text>
          )}
        </TouchableOpacity>
      </ImageBackground>
    </SafeAreaView>
  );
}
