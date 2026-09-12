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
      permissions: [],
      blockedPermissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        // expo-image-picker declares CAMERA in its own manifest, so it has to
        // be blocked rather than merely not requested. Nothing calls
        // launchCameraAsync and the picker is configured for photos only.
        "android.permission.CAMERA"
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
      // Must run before anything else touches build.gradle.
      "./plugins/withReleaseSigning",
      "./plugins/withNavigationBarContrast",
    [
      "expo-build-properties",
      {
        android: {
          // R8 defaults to off in the generated project, which shipped five
          // unshrunk dex files (~48 MB). Enabling it cut the release APK by
          // roughly a third.
          // Real Android phones are ARM. x86/x86_64 exist for emulators and a
          // handful of ChromeOS devices, and shipping them doubled the APK:
          // four copies of every .so, 68 MB of native libraries. Written into
          // gradle.properties as reactNativeArchitectures, so unlike editing
          // that generated file by hand this survives a prebuild.
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // Reached reflectively, so R8 cannot see the references.
          extraProguardRules: [
            "-keep class com.google.firebase.** { *; }",
            "-dontwarn com.google.firebase.**",
            "-keep public class com.horcrux.svg.** { *; }",
            "-keep class com.facebook.hermes.unicode.** { *; }",
            "-keep class com.facebook.jni.** { *; }",
            "-keepclassmembers class * {",
            "  @com.facebook.react.uimanager.annotations.ReactProp <methods>;",
            "  @com.facebook.react.bridge.ReactMethod <methods>;",
            "}",
            "-keep class * extends com.facebook.react.bridge.NativeModule { *; }",
            "-keep class * extends com.facebook.react.uimanager.ViewManager { *; }",
          ].join("\n"),
          packagingOptions: {
            // ML Kit's barcode model arrives through expo-dev-launcher's AAR.
            // The launcher's code is excluded from release builds but its
            // native artefacts are merged regardless, and nothing in this app
            // scans barcodes.
            exclude: ["**/libbarhopper_v3.so"],
          },
        },
      },
    ],
      "expo-font",
      "expo-router",
      "expo-web-browser",
      "expo-notifications",
      "@react-native-community/datetimepicker",
      "expo-asset",
      "@react-native-google-signin/google-signin",
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
