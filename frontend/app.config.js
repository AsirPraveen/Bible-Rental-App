import 'dotenv/config';

export default {
  expo: {
    name: process.env.APP_NAME || "Youth Room",
    // Add this for the new architecture warning
    newArchEnabled: true,
    // Add this for the linking warning
    scheme: "youthroom",
    // Keep your existing extra section for environment variables
    extra: {
      apiUrl: process.env.API_URL,
      appName: process.env.APP_NAME,
    },
  },
};