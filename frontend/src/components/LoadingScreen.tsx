import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, ColorsType } from "../context/ThemeContext";

interface LoadingScreenProps {
  message?: string;
  variant?: "default" | "transparent";
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading...",
  variant = "default",
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  const isTransparent = variant === "transparent";

  const content = (
    <View style={styles.content}>
      <LottieView
        source={require("../assets/lottie_icon/Sandy Loading.json")}
        autoPlay
        loop
        style={styles.lottie}
      />
      {message ? (
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.1],
              outputRange: [0.7, 1],
            }),
          }}
        >
          <Text style={[styles.text, isTransparent && styles.transparentText]}>
            {message}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );

  if (isTransparent) {
    return <View style={styles.transparentContainer}>{content}</View>;
  }

  return (
    <LinearGradient colors={colors.linearGradient} style={styles.container}>
      {content}
    </LinearGradient>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  transparentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  content: {
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    width: 200,
    height: 200,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textLight,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  transparentText: {
    color: colors.primary,
  },
});

export default LoadingScreen;

