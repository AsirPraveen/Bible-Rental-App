import 'dotenv/config';

export default {
  expo: {
    name: process.env.APP_NAME || "Youth Room",
    slug: "youth-room",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/jesus-holding-bible.jpg",
    scheme: "youthroom",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.asirpraveen.youthroom",
      adaptiveIcon: {
        foregroundImage: "./src/assets/jesus-holding-bible.jpg",
        backgroundColor: "#ffffff",
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./src/assets/jesus-holding-bible.jpg",
    },
    extra: {
      apiUrl: process.env.API_URL,
      appName: process.env.APP_NAME,
      secretText: process.env.SECRET_TEXT,
      eas: {
        projectId: "dc5bfe26-226c-478d-b178-14a74d6a4194",
      },
    },
    plugins: [
      "expo-font",
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./src/assets/jesus-holding-bible.jpg",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    permissions: [
      "camera",
      "mediaLibrary",
    ],
  },
};
