import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, SafeAreaView, ImageBackground, ActivityIndicator, Platform } from "react-native";
import React from "react";
import { useFonts, Sora_600SemiBold } from "@expo-google-fonts/sora";
import { getStyles } from "./style";
import { useTheme } from "../../context/ThemeContext";

export default function OnboardingView({ onGetStarted, loading }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  let [fontsLoaded] = useFonts({
    Sora_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const { width, height } = Dimensions.get("window"); // Get screen dimensions

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../../assets/background.jpg")}
        style={{ width, height, justifyContent: "center", alignItems: "center" }}
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
          style={[styles.button, { width: width * 0.8 }]} // Button width is 80% of screen width
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
