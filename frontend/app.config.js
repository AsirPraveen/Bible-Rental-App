import 'dotenv/config';

export default {
  expo: {
    name: process.env.APP_NAME || "Youth Room",
    newArchEnabled: true,
    scheme: "youthroom",
    extra: {
      apiUrl: process.env.API_URL,
      appName: process.env.APP_NAME,
      secretText: process.env.SECRET_TEXT,
      eas: {
        projectId: "dc5bfe26-226c-478d-b178-14a74d6a4194"
      }
    },
    android: {
      package: "com.asirpraveen.youthroom" // 👈 must be unique
    },
    plugins: [
      "expo-font",
      "expo-router"
    ]
  },
};
