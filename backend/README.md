# 🖥️ Youth Room — Backend API

> RESTful API server powering the Youth Room mobile application. Built with **Node.js**, **Express**, and **MongoDB (Mongoose)**.

---

## 📁 Project Structure

```
backend/
├── app.js                  # Entry point: Express setup, route mounting, cron jobs
├── app.config.js           # Expo-compatible env config (APP_NAME, email creds)
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables (not committed)
├── .gitignore
│
├── config/
│   └── emailTemplate.js    # HTML email templates (OTP reset, book approval/rejection)
│
├── controllers/            # Business logic (18 controllers)
│   ├── authController.js           # Register, login, OTP, password reset
│   ├── userController.js           # Profile, search, push token, notification settings
│   ├── bookController.js           # Book CRUD, rent/return, approve/reject, favorites
│   ├── postController.js           # Notification posts, likes, targeted delivery
│   ├── bibleController.js          # Bible chapters, verses, multi-language support
│   ├── gameController.js           # Card game: battle, survival, shop, crafting, deck
│   ├── songController.js           # Song CRUD, search, likes
│   ├── fastingController.js        # Fasting plan CRUD, status updates
│   ├── forumController.js          # Discussion Q&A, threaded answers
│   ├── prayerController.js         # Prayer requests, "prayed for" toggle
│   ├── mapController.js            # Historical maps and locations CRUD
│   ├── moderationController.js     # Content review and moderation actions
│   ├── adminAnalyticsController.js # Dashboard statistics and trends
│   ├── readingStatController.js    # Bible reading stats sync
│   ├── readingTrackerController.js # Reading progress tracking
│   ├── cloudinaryController.js     # Cloudinary upload signature generation
│   ├── emailTemplateController.js  # Email template CRUD
│   └── appSettingsController.js    # Global feature toggles
│
├── models/                 # Mongoose schemas (17 models)
│   ├── UserDetails.js      # User: auth, profile, game state, notifications
│   ├── Book.js             # Physical books for rental
│   ├── author.js           # Book author profiles
│   ├── Post.js             # Admin notification posts
│   ├── BibleChapter.js     # Bible text (language, book, chapter, verses)
│   ├── Card.js             # Game cards with stats and abilities
│   ├── Song.js             # Worship songs (Tamil/English)
│   ├── FastingPlan.js      # Fasting schedules
│   ├── ForumQuestion.js    # Forum threads with nested answers
│   ├── PrayerRequest.js    # Prayer requests with "prayed by" tracking
│   ├── HistoricalMap.js    # Biblical map images
│   ├── HistoricalLocation.js # Map location coordinates
│   ├── ReadingStat.js      # Reading plan progress
│   ├── PendingRentRequest.js # Rental request queue
│   ├── RequestHistory.js   # Rental approval/rejection log
│   ├── EmailTemplate.js    # Configurable email templates
│   └── AppSettings.js      # App-wide feature flags
│
├── routes/                 # Express route definitions (19 route files)
│   ├── authRoutes.js       # POST /api/auth/register, /login, /userdata, /send-otp, /reset-password
│   ├── userRoutes.js       # GET /api/users/search, PUT /profile, /push-token, /notification-settings
│   ├── bookRoutes.js       # GET/POST/PUT/DELETE /api/books, /rent, /return, /approve, /reject
│   ├── authorRoutes.js     # GET/POST/PUT/DELETE /authors
│   ├── postRoutes.js       # GET/POST/PUT/DELETE /api/posts, /likes
│   ├── bibleRoutes.js      # GET /api/bible/chapters, /languages
│   ├── gameRoutes.js       # POST /api/game/battle, /survival, /shop, /craft, /refine, /equip
│   ├── songRoutes.js       # GET/POST/PUT/DELETE /api/songs
│   ├── fastingRoutes.js    # GET/POST/PUT/DELETE /api/fasting
│   ├── forumRoutes.js      # GET/POST /api/forum, /answers
│   ├── prayerRoutes.js     # GET/POST/PUT /api/prayer
│   ├── mapRoutes.js        # GET/POST/PUT/DELETE /api/maps, /locations
│   ├── moderationRoutes.js # GET/PUT/DELETE /api/moderation
│   ├── adminAnalyticsRoutes.js  # GET /api/admin-analytics
│   ├── readingStatRoutes.js     # POST /api/reading-stats/sync
│   ├── readingTrackerRoutes.js  # GET/POST /api/reading-tracker
│   ├── cloudinaryRoutes.js      # GET /api/cloudinary/signature
│   ├── emailTemplateRoutes.js   # GET/PUT /api/email-templates
│   └── appSettingsRoutes.js     # GET/PUT /api/app-settings
│
└── utils/
    └── notificationService.js  # Expo Push API: sendPushNotification, notifyUserById, notifyAdmins
```

---

## 🛠️ Tech Stack

| Package | Version | Purpose |
|---|---|---|
| `express` | 4.21 | HTTP server and routing |
| `mongoose` | 8.12 | MongoDB ODM |
| `jsonwebtoken` | 9.0 | JWT authentication |
| `bcrypt` / `bcryptjs` | 5.1 / 3.0 | Password hashing |
| `nodemailer` | 7.0 | Email delivery (OTP, approvals) |
| `cloudinary` | 2.7 | Image upload management |
| `axios` | 1.14 | Outbound HTTP (Expo Push API) |
| `node-cron` | 3.0 | Scheduled tasks (reading reminders) |
| `dotenv` | 16.5 | Environment variable loading |
| `nodemon` | 3.1 | Development auto-restart |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** — local instance or MongoDB Atlas cluster
- **Gmail App Password** — for Nodemailer (or another SMTP provider)
- **Cloudinary Account** — for image storage

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>

# Server
PORT=5001

# Authentication
SECRET_KEY=your_jwt_secret_key

# Application
APP_NAME=Youth Room

# Email (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
HEADER_IMAGE=https://your-cloudinary-url/email-header.png

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Running the Server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

The server will start on `http://localhost:5001` (or the port specified in `.env`).

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register` | Create a new user account |
| `POST` | `/login-user` | Authenticate and receive JWT token |
| `POST` | `/update-push-token` | Sync Expo push notification token |
| `POST` | `/userdata` | Decode token and return user data |
| `POST` | `/send-otp` | Send OTP to email for password reset |
| `POST` | `/reset-password` | Verify OTP and update password |

### Users (`/api/users`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/search?query=` | Search users by name or email |
| `PUT` | `/profile` | Update user profile fields |
| `PUT` | `/push-token` | Save Expo push notification token |
| `PUT` | `/notification-settings` | Update per-category notification preferences |

### Books (`/api`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/books` | List all books |
| `POST` | `/books` | Create a new book (admin) |
| `PUT` | `/books/:id` | Update book details |
| `DELETE` | `/books/:id` | Delete a book |
| `POST` | `/books/rent` | Submit a rent request |
| `POST` | `/books/return` | Return a rented book |
| `POST` | `/books/approve` | Approve a rental request (admin) |
| `POST` | `/books/reject` | Reject a rental request (admin) |

### Posts/Notifications (`/api`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/posts` | Fetch posts (filtered by user targeting) |
| `POST` | `/posts` | Create a new post with optional push notification |
| `PUT` | `/posts/:id/likes` | Toggle like on a post |
| `DELETE` | `/posts/:id` | Delete a post (admin) |
| `GET` | `/admin/posts` | Fetch all posts for admin management |

### Bible (`/api/bible`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chapters` | Fetch Bible chapters by language, book, chapter |
| `GET` | `/languages` | List available Bible languages |

### Game (`/api/game`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/battle` | Initiate a turn-based battle |
| `POST` | `/survival` | Start a survival arena run |
| `POST` | `/shop/buy` | Purchase cards from the merchant |
| `POST` | `/craft/refine` | Refine a card to increase stats |
| `POST` | `/craft/equip` | Equip Armor of God to a card |
| `GET` | `/cards` | Fetch all available cards |
| `POST` | `/deck/update` | Update active battle deck |

### Songs (`/api`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/songs` | List all songs with search support |
| `POST` | `/songs` | Create a new song (admin) |
| `PUT` | `/songs/:id` | Update a song |
| `DELETE` | `/songs/:id` | Delete a song |

### Other Endpoints
| Prefix | Description |
|---|---|
| `/api/prayer` | Prayer request CRUD and "prayed for" toggle |
| `/api/forum` | Discussion questions and threaded answers |
| `/api/fasting` | Fasting plan management |
| `/api/maps` | Historical map and location CRUD |
| `/api/moderation` | Content review and moderation actions |
| `/api/admin-analytics` | Dashboard statistics |
| `/api/reading-stats` | Bible reading stats sync |
| `/api/reading-tracker` | Reading progress tracking |
| `/api/cloudinary` | Upload signature generation |
| `/api/email-templates` | Email template management |
| `/api/app-settings` | Feature toggles |

---

## ⏰ Scheduled Tasks (Cron Jobs)

| Schedule | Task | Description |
|---|---|---|
| `0 * * * *` (Every hour) | **Bible Reading Reminder** | Checks all users with incomplete daily reading plans. If the current hour matches their preferred reminder time, sends an Expo push notification. |

---

## 🗄️ Database Schema Overview

### Core Models

**UserDetails** — Central user document containing:
- Authentication (email, password hash, OTP)
- Profile (name, image, gender, profession)
- Book rentals and favorites
- Game state (card inventory, deck, talents, manna, fruits tree, etc.)
- Notification settings and Expo push token
- Bible reading progress and "Treasures in Heaven" count

**Book** — Physical book with rental tracking:
- Metadata (name, author, pages, year, cover image, thumbnails)
- Availability (count, owned_by, rent_from)
- Social (likes count)

**BibleChapter** — Multi-language Bible text:
- Compound unique index: `(language, bookNumber, chapterNumber)`
- Array of `{ verseNumber, text }` per chapter

**Card** — Game character cards:
- Combat stats (HP, Attack, Defense, Speed)
- Type system (Spiritual Trait vs. Sin Weakness)
- Classes, factions, rarities
- Verse-based mechanics (mainVerse, missingWord)
- Ascension system

---

## 🔐 Authentication Flow

1. User registers with email, password, and optional admin secret text
2. Password is hashed with `bcrypt` before storage
3. On login, a JWT token is issued and returned
4. Frontend stores token in `AsyncStorage`
5. Token is sent with each authenticated request
6. Password reset uses OTP sent via Nodemailer

---

## 📬 Push Notification Architecture

```
Admin creates post → postController.js
    ↓
    Determines audience (all / specific users)
    ↓
    Fetches Expo push tokens from UserDetails
    ↓
    notificationService.js → sendPushNotification()
    ↓
    Expo Push API (https://exp.host/--/api/v2/push/send)
    ↓
    Batched in chunks of 100 tokens
    ↓
    Delivered to user devices
```

The `notifyUserById` helper also respects per-user notification settings before sending.

---

## 📄 License

ISC License

---

## 👨‍💻 Author

**Asir Praveen** — [GitHub](https://github.com/AsirPraveen)
