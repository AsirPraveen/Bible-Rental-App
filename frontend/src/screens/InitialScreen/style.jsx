import { StyleSheet, Dimensions } from "react-native";
import { colors } from "../../utils/colors";

const { width, height } = Dimensions.get("window"); // Get device width and height

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
  text: {
    color: colors.white,
    textShadowColor: "rgba(0, 0, 0, 0.1)", // Darker shadow for border effect
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
    color: colors.white,
    textShadowColor: "rgba(0, 0, 0, 0.8)", // Stronger black border effect
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  description: {
    textAlign: "center",
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: colors.white,
    marginTop: 8,
    fontFamily: "Sora_400Regular",
    paddingHorizontal: 20,
    textShadowColor: "rgba(0, 0, 0, 0.3)", // Subtle stroke effect
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  button: {
    position: "absolute", // Positioning at the bottom
    bottom: "10%", // 20px from the bottom
    width: width * 0.9, // 90% of screen width
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    borderRadius: 16,
    borderColor: colors.black,
    borderWidth: 0.5,
  },
  button_text: {
    color: "rgba(0,0,0,0.54)",
    fontSize: 20,
  },
});

export default styles;
