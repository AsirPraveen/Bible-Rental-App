import 'dotenv/config';

export default {
  expo: {
    name: process.env.APP_NAME || "Youth Room",
    slug: "youth-room",
    owner: process.env.EXPO_OWNER || "youthrooms-team",
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
      package: process.env.ANDROID_PACKAGE || "com.asirpraveen.youthroom",
      googleServicesFile: "./google-services.json",
      versionCode: 1,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
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
      apiUrl: process.env.API_URL ? process.env.API_URL.replace(/\s/g, "").replace(/\/$/, "") : "",
      appName: process.env.APP_NAME,
      secretText: process.env.SECRET_TEXT,
      eas: {
        projectId: process.env.EAS_PROJECT_ID || "d79a1585-525b-4dcc-baab-34f1253ee623",
      },
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadPresentPosts: process.env.UPLOAD_PRESENT_POSTS,
      uploadPresentProfiles: process.env.UPLOAD_PRESENT_PROFILES,
      uploadPresentBibleBooks: process.env.UPLOAD_PRESENT_BIBLEBOOKS,

      stabilityApiKey: process.env.STABILITY_API_KEY,
      stabilityApiUrl: process.env.STABILITY_API_URL,

      // Google Sign-In: Add your Web Client ID from Google Cloud Console
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? '',
    },
    plugins: [
      "expo-font",
      "expo-router",
      "expo-notifications",
      "@react-native-community/datetimepicker",
      "expo-asset",
      "@react-native-google-signin/google-signin",
      [
        "expo-camera",
        {
          cameraPermission: "Allow Youth Room to access your camera"
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Youth Room to access your photos",
          savePhotosPermission: "Allow Youth Room to save photos to your library"
        }
      ],
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
  },
};
