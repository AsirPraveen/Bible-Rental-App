import { StyleSheet, Dimensions } from "react-native";
import { Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get("window"); // Get device width and height

export const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  text: {
    color: '#fff',
    textShadowColor: "rgba(0, 0, 0, 0.4)", // Darker shadow for border effect
    textShadowOffset: { width: 1, height: 1 }, // Offset to create the border effect
    textShadowRadius: 2, // Radius for a smoother look
  },
  container_inner: {
    width: "80%",
    position: "absolute",
    top: height * 0.05, // Adjusts dynamically based on screen height
    alignItems: "center",
    alignSelf: "center",
  },
  header: {
    textAlign: "center",
    fontSize: 34,
    lineHeight: 50,
    letterSpacing: 0.5,
    fontFamily: "Sora_600SemiBold",
    color: '#fff',
    textShadowColor: "rgba(0, 0, 0, 0.9)", // Stronger black border effect
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  description: {
    textAlign: "center",
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: '#eee',
    marginTop: 8,
    fontFamily: "Sora_400Regular",
    paddingHorizontal: 20,
    textShadowColor: "rgba(0, 0, 0, 0.6)", // Subtle stroke effect
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  button: {
    position: "absolute", // Positioning at the bottom
    bottom: "10%", // 20px from the bottom
    width: width * 0.9, // 90% of screen width
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: colors.theme === 'dark' ? colors.primary : '#fff',
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 0.5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  button_text: {
    color: colors.theme === 'dark' ? '#fff' : 'rgba(0,0,0,0.7)',
    fontSize: 20,
    fontWeight: '600',
  },
});
