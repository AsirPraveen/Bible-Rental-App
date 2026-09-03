import 'dotenv/config';

export default {
  expo: {
    name: process.env.APP_NAME || "Youth Room",
    slug: "youth-room",
    owner: process.env.EXPO_OWNER || "youthrooms-team",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/icons/icon.png",
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
      // expo-image-picker declares the modern granular media permissions
      // itself (READ_MEDIA_IMAGES etc). WRITE_EXTERNAL_STORAGE has had no
      // effect since Android 10 and READ_EXTERNAL_STORAGE was superseded in
      // Android 13 — declaring them only invites extra Play review questions.
      permissions: [
        "android.permission.CAMERA"
      ],
      blockedPermissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
      // Android masks the foreground into a circle or squircle, so it must be
      // a PNG with alpha and the art must stay inside the central safe zone.
      adaptiveIcon: {
        foregroundImage: "./src/assets/icons/adaptive-icon.png",
        backgroundColor: "#146C94",
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./src/assets/icons/icon.png",
    },
    extra: {
      apiUrl: process.env.API_URL ? process.env.API_URL.replace(/\s/g, "").replace(/\/$/, "") : "",
      appName: process.env.APP_NAME,
      eas: {
        projectId: process.env.EAS_PROJECT_ID || "d79a1585-525b-4dcc-baab-34f1253ee623",
      },
      // Cloud name only — the unsigned upload presets are gone. Uploads are
      // signed per request by POST /api/cloudinary/signature so nothing
      // upload-capable ships inside the app bundle.
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,

      // stabilityApiKey deliberately NOT exposed here. Anything placed in
      // `extra` is compiled into the app bundle and readable from a shipped
      // APK, so the Stability key lives only on the server and image
      // generation goes through POST /api/generate-verse-image.

      // Google Sign-In: Add your Web Client ID from Google Cloud Console
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? '',
    },
    plugins: [
      "expo-font",
      "expo-router",
      "expo-web-browser",
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
          image: "./src/assets/icons/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#146C94",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
