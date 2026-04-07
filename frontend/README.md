# 📱 Youth Room — Frontend (React Native / Expo)

> Cross-platform mobile application for the Youth Room community, built with **React Native 0.76**, **Expo SDK 52**, and **TypeScript**.

---

## 📁 Project Structure

```
frontend/
├── index.tsx                  # App entry point (registerRootComponent)
├── app.config.js              # Expo configuration (env vars, plugins, permissions)
├── eas.json                   # EAS Build configuration profiles
├── google-services.json       # Firebase config for Android push notifications
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
├── .env                       # Environment variables (not committed)
│
└── src/
    ├── app/                   # Expo Router app directory
    │
    ├── assets/                # Static assets (images, icons)
    │
    ├── components/            # Shared reusable components
    │   └── LoadingScreen.tsx   # Adaptive loading screen (default/transparent variants)
    │
    ├── navigation/            # Navigation configuration
    │   ├── StackNavigation.tsx      # Main stack navigator (40+ screens)
    │   ├── TabNavigator.tsx         # Bottom tab navigator (Home, Bible, Notifications, Profile)
    │   ├── DrawerNavigator.js       # Side drawer (Dashboard, Wishlist, History, Generated Images, Notification Settings)
    │   └── AdminTabsNavigation.tsx  # Admin dashboard tab navigator
    │
    ├── screens/               # Screen directories (24 modules)
    │   ├── AdminScreen/       # Admin dashboard with 13 sub-screens
    │   │   ├── AdminScreen.tsx          # Main admin layout
    │   │   ├── CreateBookTab.tsx        # Book creation form
    │   │   ├── CreatePostTab.tsx        # Post creation with targeting & push notifications
    │   │   ├── ManageSongsTab.tsx       # Song CRUD management
    │   │   ├── ManageMapsTab.tsx        # Historical map management
    │   │   ├── PendingRequestsTab.tsx   # Rental request queue
    │   │   ├── RequestHistoryTab.tsx    # Rental approval history
    │   │   ├── BookAnalyticsTab.tsx     # Book analytics with charts
    │   │   ├── AppAnalyticsTab.tsx      # App-wide analytics
    │   │   ├── ModerationTab.tsx        # Content moderation
    │   │   ├── AboutAdminTab.tsx        # Admin profile settings
    │   │   ├── CreateScreen.tsx         # Create content hub
    │   │   ├── PendingScreen.tsx        # Pending requests hub
    │   │   └── components/             # Admin-specific components
    │   │       └── AppSettingsTab.tsx   # Feature toggle settings
    │   │
    │   ├── AllBooks/          # Book catalog browsing
    │   ├── AllAuthors/        # Author listing
    │   ├── AuthorBooks/       # Books by a specific author
    │   ├── Bible/             # Full Bible reader (42KB — feature-rich)
    │   │   ├── Bible.tsx              # Multi-language reader with verse interactions
    │   │   └── GeneratedImages.tsx    # AI-generated verse images gallery
    │   ├── BookDetails/       # Individual book view with rent flow
    │   ├── BookPdf/           # PDF viewer for books
    │   ├── DiscussionForum/   # Q&A forum with threaded answers
    │   ├── FastingTracker/    # Fasting plan management
    │   ├── GameScreen/        # Faith-based card game (11 sub-screens)
    │   │   ├── GameHome.tsx           # Game hub and daily login
    │   │   ├── GameBattle.tsx         # Turn-based PvE battle arena
    │   │   ├── GameSurvival.tsx       # Endless survival mode
    │   │   ├── GameDeck.tsx           # Deck management
    │   │   ├── GameCrafting.tsx       # Card refinement and armor equipping
    │   │   ├── GameShop.tsx           # Merchant tent with chest animations
    │   │   ├── GameCardLibrary.tsx    # Full card collection browser
    │   │   ├── GameScrollRoom.tsx     # Card lore and unlockables
    │   │   ├── GameFruitsTree.tsx     # Fruits of the Spirit skill tree
    │   │   ├── GameLevelSelect.tsx    # Campaign level selection
    │   │   └── GameStudyArea.tsx      # Passive card XP area
    │   ├── HistoricalMaps/    # Interactive biblical map explorer
    │   ├── History/           # User rental history
    │   ├── HomeScreen/        # Main dashboard
    │   ├── InitialScreen/     # Welcome/splash screen
    │   ├── Login&Register/    # Auth screens (login, register, OTP, reset)
    │   ├── MessageNotes/      # Sermon notes
    │   ├── NotificationScreen/# Notification feed with double-tap-to-like
    │   ├── PlannerTracker/    # Bible reading plan tracker
    │   ├── PrayerRequests/    # Community prayer wall
    │   ├── Settings/          # Notification preferences
    │   ├── Songs/             # Worship song library
    │   │   ├── Songs.tsx              # Song list with search
    │   │   └── SongDetails.tsx        # Lyrics display with YouTube link
    │   ├── StuffComponent/    # Supporting UI components
    │   ├── UserProfileScreen/ # User profile editing
    │   └── WishList/          # Favorited books
    │
    └── utils/                 # Utility modules
        ├── colors.js          # App color palette constants
        ├── mapData.ts         # Historical map default data and location info
        └── notifications.ts   # Push notification registration and token management
```

---

## 🛠️ Tech Stack

### Core
| Package | Version | Purpose |
|---|---|---|
| `react` | 18.3.1 | UI framework |
| `react-native` | 0.76.9 | Native mobile bridge |
| `expo` | ~52.0.47 | Development platform and toolchain |
| `typescript` | 5.7+ | Type safety |

### Navigation
| Package | Purpose |
|---|---|
| `@react-navigation/stack` | Screen-to-screen navigation |
| `@react-navigation/bottom-tabs` | Main tab bar (Home, Bible, Notifications, Profile) |
| `@react-navigation/drawer` | Side drawer menu |

### UI & Styling
| Package | Purpose |
|---|---|
| `react-native-paper` | Material Design components (Buttons, Chips, Switch, etc.) |
| `expo-linear-gradient` | Gradient backgrounds throughout the app |
| `@expo/vector-icons` | Ionicons, MaterialCommunityIcons |
| `lucide-react-native` | Additional icons |
| `react-native-chart-kit` | Analytics charts and visualizations |
| `react-native-snap-carousel` | Horizontal carousels |
| `lottie-react-native` | Animated loading/splash screens |
| `react-native-toast-message` | Toast notifications |
| `react-native-skeleton-placeholder` | Skeleton loading states |
| `expo-blur` | Blur effects |

### Data & State
| Package | Purpose |
|---|---|
| `axios` | HTTP client for backend API |
| `@react-native-async-storage/async-storage` | Persistent local storage (auth tokens, preferences) |
| `zustand` | Lightweight global state management |

### Media & Files
| Package | Purpose |
|---|---|
| `expo-image-picker` | Camera and gallery access |
| `expo-camera` | Camera integration |
| `expo-av` | Audio playback (songs) |
| `expo-file-system` | File system operations |
| `expo-sharing` | Share content externally |
| `expo-clipboard` | Copy to clipboard |
| `react-native-webview` | PDF viewer and web content |

### Notifications
| Package | Purpose |
|---|---|
| `expo-notifications` | Push notification handling |
| `expo-device` | Device info for notification registration |

### Date/Time
| Package | Purpose |
|---|---|
| `@react-native-community/datetimepicker` | Native date and time pickers |
| `react-native-date-picker` | Alternative date picker |
| `react-native-modal-datetime-picker` | Modal-style date picker |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **Expo CLI** — `npm install -g expo-cli`
- **Expo Go** app on your physical device (for development)
- **EAS CLI** — `npm install -g eas-cli` (for production builds)

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# Backend API
API_URL=http://<your-local-ip>:5001

# Application
APP_NAME=Youth Room
SECRET_TEXT=your_admin_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
UPLOAD_PRESENT_POSTS=your_posts_preset
UPLOAD_PRESENT_PROFILES=your_profiles_preset
UPLOAD_PRESENT_BIBLEBOOKS=your_books_preset

# AI Image Generation (Stability AI)
STABILITY_API_KEY=your_stability_api_key
STABILITY_API_URL=https://api.stability.ai/v2beta/stable-image/generate/sd3
```

### Running the App

```bash
# Start Expo development server
npx expo start

# Platform-specific
npx expo start --android
npx expo start --ios
npx expo start --web
```

### Building for Production

```bash
eas build:configure

# Android APK/AAB
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview
```

---

## 📱 Navigation Architecture

```
StackNavigator (Root)
│
├── InitialScreen         → Welcome page
├── Login                 → Email/password login
├── Register              → Account creation (with admin secret option)
├── OtpVerification       → OTP input for password reset
├── ResetPassword         → New password entry
│
└── DrawerNavigator       → Main app shell
    │
    ├── TabNavigator      → Primary navigation
    │   ├── Home          → Dashboard with feature cards
    │   ├── Bible         → 18-language Bible reader
    │   ├── Notifications → Admin posts feed
    │   └── Profile       → User profile
    │
    ├── Wishlist          → Favorited books
    ├── History           → Rental history
    ├── Generated Images  → AI-generated verse images
    └── Notification Settings → Push notification preferences
    
Additional Stack Screens (pushed on top)
├── AllBooks / BookDetails / BookPdf
├── AllAuthors / AuthorBooks  
├── Songs / SongDetails
├── ForumList
├── PrayerRequests
├── FastingTracker
├── HistoricalMaps
├── MessageNotes
├── PlannerTracker
├── Game (11 screens)
└── Admin (AdminTabsNavigation → 13 tabs)
```

---

## 🎨 Design System

### Color Palette
| Color | Hex | Usage |
|---|---|---|
| Primary Dark | `#146C94` | Headers, buttons, accents |
| Primary Light | `#19A7CE` | Gradients, highlights |
| Surface Light | `#AFD3E2` | Active drawer items, badges |
| Background | `#F6F1F1` | Text on dark backgrounds, input fields |
| White | `#FFFFFF` | Card backgrounds |
| Error/Like | `#FF4D4F` | Heart icons, destructive actions |

### Design Patterns
- **Linear Gradients**: Used extensively for headers and backgrounds (`#146C94` → `#19A7CE`)
- **Card-Based Layouts**: White rounded cards with shadow elevation on gradient backgrounds
- **Adaptive Loading**: `LoadingScreen` with `variant="transparent"` for content areas
- **Double-Tap Interactions**: Notification likes, similar to Instagram
- **Skeleton Placeholders**: Used during data loading for premium feel

---

## 🔐 Authentication Flow

```
App Start
  ↓
Check AsyncStorage for JWT token
  ↓
┌─── Token exists ────→ Decode & validate → DrawerNavigator (main app)
│
└─── No token ────────→ InitialScreen → Login/Register
                                            ↓
                                     On success: save token → navigate to Dashboard
```

---

## 📬 Push Notifications

### Registration Flow
1. On app startup / login, `registerForPushNotificationsAsync()` is called
2. Device token is obtained from Expo Notifications API
3. Token is synced to backend via `PUT /api/users/push-token`
4. Token is stored in `UserDetails.expoPushToken`

### Notification Types
| Type | Setting Key | Trigger |
|---|---|---|
| Reading Reminders | `readingReminders` | Cron job at user-preferred time |
| Forum Activity | `forumActivity` | New answer on user's question |
| Prayer Activity | `prayerActivity` | Someone prays for user's request |
| Rental Updates | `rentalUpdates` | Book approved/rejected |
| Admin Posts | — | Admin creates targeted notification |

### Configuration
- Firebase is configured via `google-services.json` for Android FCM
- `expo-notifications` plugin is registered in `app.config.js`
- EAS Build is configured in `eas.json` for production notification support

---

## 🎮 Game Module — *Sword of the Spirit*

The game occupies **11 dedicated screens** and implements a full collectible card game:

| Screen | File | Description |
|---|---|---|
| Home | `GameHome.tsx` | Hub with daily login rewards, navigation |
| Battle Arena | `GameBattle.tsx` | Turn-based PvE with type advantages |
| Survival Arena | `GameSurvival.tsx` | Endless wave-based combat |
| Deck Builder | `GameDeck.tsx` | 5-card active deck management |
| Crafting | `GameCrafting.tsx` | Refinement (+10% stats/level) and armor equipping |
| Merchant Tent | `GameShop.tsx` | Card purchases with chest-opening animation |
| Card Library | `GameCardLibrary.tsx` | Full collection browser |
| Scroll Room | `GameScrollRoom.tsx` | Card lore and verse context |
| Fruits Tree | `GameFruitsTree.tsx` | 9 Fruits of the Spirit skill tree |
| Level Select | `GameLevelSelect.tsx` | Campaign progression |
| Study Area | `GameStudyArea.tsx` | Passive XP for cards |

---

## 📖 Bible Reader Features

The Bible reader (`Bible.tsx` — 42KB) is the largest single component and includes:

- **18 Language Support** — Full Bible text stored in MongoDB
- **Continuous Scrolling** — Smooth chapter-by-chapter navigation
- **Verse Interactions**:
  - Tap a verse to select it
  - **AI Image Generation** — Generate artwork for selected verses via Stability AI
  - **Cross-Language Comparison** — Compare verse translations side-by-side
  - **Copy & Share** — Quick verse sharing
- **Reading Progress** — Persistent scroll position saved per chapter
- **Treasures in Heaven** — Reward system for completed chapters
- **Generated Images Gallery** — Browse all AI-generated verse artwork

---

## 🧪 Testing

```bash
# Run Jest tests
npm test

# Lint
npm run lint
```

---

## 📦 Building

### EAS Build Profiles (eas.json)

| Profile | Platform | Description |
|---|---|---|
| `development` | Android/iOS | Dev client builds |
| `preview` | Android | Internal testing APK |
| `production` | Android/iOS | Store-ready builds |

```bash
# Development build
eas build --profile development --platform android

# Preview (APK for testing)
eas build --profile preview --platform android

# Production
eas build --profile production --platform android
```

---

## 📄 License

ISC License

---

## 👨‍💻 Author

**Asir Praveen** — [GitHub](https://github.com/AsirPraveen)