import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import React from "react";
import { useFonts, Sora_600SemiBold } from "@expo-google-fonts/sora";
import styles from "./style";
import { ImageBackground } from "react-native";

export default function OnboardingView({ onGetStarted }) {
  let [fontsLoaded] = useFonts({
    Sora_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const { width, height } = Dimensions.get("window"); // Get screen dimensions

  return (
    <ImageBackground
      source={require("../../assets/background.jpg")}
      style={{ width, height, justifyContent: "center", alignItems: "center" }}
      resizeMode="cover"
    >
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
      >
        <Text style={styles.button_text}>Get Started</Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}
