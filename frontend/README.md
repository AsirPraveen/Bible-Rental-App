## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).


# Comments to start locally

frontend - npx expo start
backend - nodemon start

# Build commands

```bash
eas build:configure
eas build -p android --profile preview
```

---

# 🔔 Push Notifications Setup (Android APK)

To make push notifications work in your standalone `.apk` build (not just Expo Go), you must connect your app to Firebase (FCM).

### **1. Firebase Console Setup**
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project (e.g., `YouthRoomApp`).
3.  Add an **Android App** to the project.
4.  **Package Name**: This **must** match your `app.config.js`: `com.asirpraveen.youthroom`.
5.  Download the **`google-services.json`** file and place it in the `frontend/` root folder.

### **2. Frontend Configuration**
1.  Ensure your `app.config.js` includes the path to your config file:
    ```javascript
    android: {
      package: "com.asirpraveen.youthroom",
      googleServicesFile: "./google-services.json",
      ...
    }
    ```

### **3. Link EAS to Firebase (The "Handshake")**
1.  **Get the Key from Firebase:**
    -   In Firebase Console, go to **Project Settings** > **Cloud Messaging**.
    -   Enable **Firebase Cloud Messaging API (V1)**.
    -   Generate a **Service Account Key (JSON file)** and download it.
2.  **Open your terminal** in the `frontend` directory:
    ```bash
    d:
    cd "d:\Bible Rental App\Bible-Rental-App\frontend"
    ```
3.  **Link your project to EAS:**
    -   Run `eas project:init` and select the correct project (e.g., `@asirpraveen/youthroom`).
4.  **Upload Credentials:**
    -   Run `eas credentials`
    -   Select: `Android` -> `preview` -> `Push Notifications`.
    -   When asked, upload the **Service Account Key (JSON)** you downloaded from Firebase.

### **4. Rebuild the App**
Now you can create your updated APK:
```bash
eas build -p android --profile preview
```

---

# Not Picked:
*Enhance admin ui and all possible crud for admin.
*Game - all logics testing, upload images, etc.,

*Notepad.
*Instant bible answers.
*Meeting messages/notes available.
*BookPdf for reading and downloading.

# In progress:
*Upload all known/required songs
*All books and authors images and content check

*Complete end-to-end testing - before production build.
*Clean the basic data in db - before production build.

# Finished:
*Add bilingual bible alongside if possible - done
*give updates about meeting date and time - done
*Wednesday/Thursday meeting or special meeting remainder - done
*Daily bible reading progress noter - done
*Bible historical map locations - done
*Share prayer request - done
*Fasting tracker or Fasting plan - done
*Discussion forum for asking and discussing questions - done
*Bible tamil and English terms meaning. - done
*Push notify all possible - done