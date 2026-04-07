# ✝️ Youth Room — Bible Rental & Community App

> A comprehensive, full-stack mobile application built for a Christian youth community. Youth Room brings together Bible reading, book rentals, worship songs, community features, and even a faith-based card game — all in one polished Expo + Node.js application.

---

## 📸 Overview

Youth Room is designed to serve as a one-stop spiritual hub for youth groups. Members can rent physical Bible-related books, read the Bible in 18 languages, track fasting plans, share prayer requests, discuss faith topics in a forum, explore historical Bible maps, listen to worship songs, and engage in a faith-themed collectible card game.

Admins have a full-featured dashboard for managing books, posts, maps, songs, user requests, content moderation, analytics, and targeted push notifications.

---

## ✨ Key Features

### 📖 Core Features
| Feature | Description |
|---|---|
| **Bible Reader** | Full Bible reader supporting **18 languages** with verse-level interactions, AI image generation, cross-language comparison, and persistent reading progress |
| **Book Rental System** | Browse, rent, and return physical Bible-related books with admin approval workflows and email notifications |
| **Notification System** | Admin-created posts with targeted push notifications (All Users / Specific Users), double-tap-to-like, and event scheduling with 3-box date/weekday/time display |
| **Songs Library** | Tamil/English worship songs with lyrics, topic categorization, YouTube links, and text search |

### 🙏 Community Features
| Feature | Description |
|---|---|
| **Prayer Requests** | Submit anonymous or public prayer requests; community members can mark "I prayed for this" |
| **Discussion Forum** | Q&A-style forum with anonymous posting, threaded answers, and moderation |
| **Fasting Tracker** | Create and track fasting plans (type, duration, notes) with status management |

### 🗺️ Exploration
| Feature | Description |
|---|---|
| **Historical Maps** | Interactive biblical maps with historical locations and time-period filtering |
| **Reading Planner** | Daily Bible reading plans with progress tracking, "Treasures in Heaven" rewards, and hourly cron-based reminders |

### 🎮 Game System — *Sword of the Spirit*
| Feature | Description |
|---|---|
| **Card Collection** | Biblical character cards with HP, Attack, Defense, Speed, abilities, and verse-based mechanics |
| **Battle Arena** | Turn-based PvE battles with type advantages (Spiritual Trait vs. Sin Weakness) |
| **Survival Arena** | Endless wave-based combat mode |
| **Crafting & Refinement** | Upgrade cards via refinement levels; equip Armor of God pieces |
| **Merchant Tent** | In-game shop with Clash Royale-style chest opening animations |
| **Scroll Room** | Unlock card lore and biblical context |
| **Fruits of the Spirit Tree** | Skill tree system based on the 9 Fruits of the Spirit |

### 🔐 Admin Dashboard
| Feature | Description |
|---|---|
| **Book Management** | Create, edit books; approve/reject rental requests |
| **Post Management** | Create targeted notifications with date/time, images, and audience selection |
| **Song Management** | CRUD operations for worship songs |
| **Map Management** | Upload and manage historical Bible maps via Cloudinary |
| **Content Moderation** | Review and moderate forum and prayer request content |
| **App Analytics** | User statistics, popular books, rental trends, and chart visualizations |
| **App Settings** | Global feature toggles (e.g., enable/disable game) |

---

## 🏗️ Architecture

```
Bible-Rental-App/
├── backend/           # Node.js + Express REST API server
│   ├── app.js         # Entry point, route registration, cron jobs
│   ├── config/        # Email templates (OTP, approval, rejection)
│   ├── controllers/   # 18 controller modules (business logic)
│   ├── models/        # 17 Mongoose schemas
│   ├── routes/        # 19 Express route files
│   └── utils/         # Push notification service (Expo API)
│
├── frontend/          # React Native (Expo SDK 52) mobile app
│   ├── src/
│   │   ├── app/       # Expo Router app directory
│   │   ├── assets/    # Images, icons
│   │   ├── components/# Shared components (LoadingScreen)
│   │   ├── navigation/# Stack, Tab, Drawer, Admin navigators
│   │   ├── screens/   # 24 screen directories
│   │   └── utils/     # Colors, map data, notification helpers
│   ├── app.config.js  # Expo configuration with env vars
│   └── google-services.json  # Firebase config for Android
│
└── README.md          # This file
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | Runtime environment |
| **Express.js** | REST API framework |
| **MongoDB + Mongoose** | Database and ODM |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcrypt / bcryptjs** | Password hashing |
| **Nodemailer** | Transactional emails (OTP, approvals) |
| **Cloudinary** | Image hosting and CDN |
| **Expo Push API** | Native push notifications |
| **node-cron** | Scheduled background tasks (reading reminders) |

### Frontend
| Technology | Purpose |
|---|---|
| **React Native 0.76** | Cross-platform mobile framework |
| **Expo SDK 52** | Development toolchain and managed workflow |
| **TypeScript** | Type-safe development |
| **React Navigation 7** | Stack, Tab, Drawer navigation |
| **React Native Paper** | Material Design UI components |
| **Expo Notifications** | Push notification handling |
| **Expo AV** | Audio playback (songs) |
| **Expo Image Picker** | Camera and gallery integration |
| **Expo Linear Gradient** | Gradient backgrounds |
| **Zustand** | Lightweight state management |
| **Axios** | HTTP client for API communication |
| **React Native Chart Kit** | Analytics visualizations |
| **Lottie** | Animated loading screens |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **npm** or **yarn**
- **MongoDB** instance (local or Atlas)
- **Expo CLI** — `npm install -g expo-cli`
- **Cloudinary** account (for image hosting)
- **EAS CLI** — `npm install -g eas-cli` (for production builds)

### 1. Clone the Repository
```bash
git clone https://github.com/AsirPraveen/Bible-Rental-App.git
cd Bible-Rental-App
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
MONGO_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>
PORT=5001
SECRET_KEY=<your_jwt_secret>
APP_NAME=Youth Room
EMAIL_USER=<your_email@gmail.com>
EMAIL_PASS=<your_app_password>
HEADER_IMAGE=<url_to_email_header_image>
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
```

Start the server:
```bash
npm run dev    # Development (with nodemon)
npm start      # Production
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
API_URL=http://<your-ip>:5001
APP_NAME=Youth Room
SECRET_TEXT=<admin_secret>
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
UPLOAD_PRESENT_POSTS=<cloudinary_upload_preset_posts>
UPLOAD_PRESENT_PROFILES=<cloudinary_upload_preset_profiles>
UPLOAD_PRESENT_BIBLEBOOKS=<cloudinary_upload_preset_books>
STABILITY_API_KEY=<stability_ai_key>
STABILITY_API_URL=<stability_api_url>
```

Start the Expo dev server:
```bash
npx expo start
```

---

## 📱 Navigation Structure

```
App
├── InitialScreen (Welcome)
├── Login / Register / OTP / Reset Password
└── DrawerNavigator
    ├── Dashboard (TabNavigator)
    │   ├── Home
    │   ├── Bible Reader
    │   ├── Notifications
    │   └── Profile
    ├── Wishlist
    ├── History
    ├── Generated Images
    └── Notification Settings
    
Stack Screens
├── All Books / Book Details / Book PDF
├── All Authors / Author Books
├── Songs / Song Details
├── Discussion Forum
├── Prayer Requests
├── Fasting Tracker
├── Historical Maps
├── Message Notes
├── Reading Planner
├── Game (Home → Battle → Survival → Crafting → Shop → Library → Scroll Room → Fruits Tree → Level Select → Study Area → Deck)
└── Admin Dashboard
    ├── Pending Requests / Request History
    ├── Create Book / Create Post
    ├── Book Analytics / App Analytics
    ├── Manage Maps / Manage Songs
    ├── Moderation
    ├── About Admin
    └── App Settings
```

---

## 🗄️ Database Models (17 Schemas)

| Model | Collection | Description |
|---|---|---|
| `UserDetails` | UserInfo | Users with auth, profile, game state, notification prefs |
| `Book` | Bible Books | Physical books available for rental |
| `Author` | Authors | Book author profiles |
| `Post` | Posts | Admin notifications with targeting and likes |
| `BibleChapter` | BibleChapters | Bible text (18 languages, verse-level) |
| `Card` | Cards | Game character cards with stats and abilities |
| `Song` | Songs | Tamil/English worship songs |
| `FastingPlan` | FastingPlans | User fasting schedules |
| `ForumQuestion` | ForumQuestions | Discussion threads with nested answers |
| `PrayerRequest` | PrayerRequests | Community prayer requests |
| `HistoricalMap` | HistoricalMaps | Biblical map images |
| `HistoricalLocation` | HistoricalLocations | Map location coordinates and periods |
| `ReadingStat` | ReadingStats | Bible reading plan progress |
| `PendingRentRequest` | PendingRentRequests | Book rental queue |
| `RequestHistory` | RequestHistories | Rental approval/rejection history |
| `EmailTemplate` | EmailTemplates | Configurable email templates |
| `AppSettings` | AppSettings | Global feature toggles |

---

## 🔌 API Endpoints Summary

| Prefix | Routes | Description |
|---|---|---|
| `/api/auth` | Login, Register, OTP, Reset Password, User Data | Authentication |
| `/api/users` | Search, Profile, Push Token, Notification Settings | User management |
| `/api/books` | CRUD, Rent/Return, Favorites, Approve/Reject | Book rental |
| `/api/posts` | CRUD, Likes, Admin Management | Notifications |
| `/api/bible` | Chapters, Verses, Languages | Bible reader |
| `/api/game` | Cards, Battle, Survival, Shop, Crafting | Card game |
| `/api/songs` | CRUD, Search, Likes | Song library |
| `/api/prayer` | CRUD, "Prayed For" toggle | Prayer requests |
| `/api/forum` | Questions, Answers | Discussion forum |
| `/api/fasting` | Plans CRUD, Status updates | Fasting tracker |
| `/api/maps` | CRUD, Locations | Historical maps |
| `/api/cloudinary` | Signature generation | Image uploads |
| `/api/reading-tracker` | Progress sync | Bible reading |
| `/api/moderation` | Content review, Actions | Moderation |
| `/api/admin-analytics` | Dashboard stats | Analytics |
| `/api/app-settings` | Feature toggles | Settings |
| `/api/email-templates` | Template CRUD | Email config |
| `/api/reading-stats` | Sync stats | Reading stats |

---

## 👤 User Roles

| Role | Access |
|---|---|
| **User** | Browse books, rent, Bible reader, songs, forum, prayer, fasting, game, notifications |
| **Admin** | Full dashboard: manage books, posts, songs, maps, moderate content, view analytics, send targeted push notifications |

Admin access is granted by entering the correct `SECRET_TEXT` during registration.

---

## 📬 Push Notifications

The app uses **Expo Push Notifications** with:
- **Token Sync**: Saved on login and app startup
- **User Preferences**: Per-category toggles (reading reminders, forum activity, prayer activity, rental updates)
- **Cron-Based Reminders**: Hourly checks for Bible reading reminders at user-preferred times
- **Targeted Delivery**: Admin can send to all users or specific selected users

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👨‍💻 Author

**Asir Praveen** — [GitHub](https://github.com/AsirPraveen)

---

<p align="center">
  <em>Your word is a lamp to my feet and a light to my path.</em>
</p>
