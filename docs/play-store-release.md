# Releasing Youth Room to the Play Store

Continues from the [backend runbook](./deployment-oracle-cloud.md). Do not
start until the API is live on HTTPS at your own domain and verified.

---

## 0. Two policy blockers to fix in code first

Both cause rejection. Fix them before building anything.

### a) There is no way for a user to delete their own account

`backend/routes/userRoutes.js:19` exposes `POST /delete-user`, but it is behind
`adminAuth` — only an admin can delete somebody. Google requires that any app
offering account creation also offers the user a way to **request deletion of
their account and data, from inside the app**, plus a **publicly reachable web
URL** that does the same for people who have uninstalled.

Needed:

- A backend route the authenticated user can call for their own account, which
  removes or anonymises their `UserDetails` record and their authored content
  (`Message`, `PrayerRequest`, `ForumQuestion`, `Post`, `MessageNote`).
- A "Delete my account" action in the profile screen with a confirmation step.
- A web page stating how to request deletion, for the Play listing.

Decide up front whether deletion is a hard delete or an anonymisation. Hard
deleting a member's chat messages leaves holes in other people's fellowship
conversations; replacing the author with "Deleted member" usually reads better
and still satisfies the policy.

### b) There is no privacy policy

There is none anywhere in the repo. Play requires a **publicly hosted URL**,
entered in the console and reachable without logging in. It must honestly
describe what you collect. Based on the code, that is:

| Data | Where it comes from |
|---|---|
| Email, name, profile photo | Sign-up and Google sign-in |
| Photos the user uploads | `expo-image-picker` → Cloudinary |
| Push token | `expo-notifications` |
| User content | Chat messages, prayer requests, forum posts, notes |
| App activity | Reading stats, reading plans |

You can host both pages as static HTML on the same nginx box, on a path like
`https://api.yourdomain.com/privacy`. That costs nothing and it is already
serving TLS.

---

## 1. Create the upload keystore

**Right now every release build is signed with the Android debug key**
(`android/app/build.gradle:115`, `signingConfig signingConfigs.debug`). Play
rejects debug-signed uploads.

```bash
keytool -genkeypair -v \
  -keystore youthroom-upload.keystore \
  -alias youthroom \
  -keyalg RSA -keysize 2048 -validity 10000
```

> **Guard this file and its passwords.** With Play App Signing you can ask
> Google to reset a lost *upload* key, but losing it is still a slow, painful
> support process. Keep the keystore and its passwords in two separate safe
> places, and **never** commit it — it must not go near this public repo.

Store the credentials outside the project, in `~/.gradle/gradle.properties`:

```ini
YOUTHROOM_UPLOAD_STORE_FILE=/absolute/path/to/youthroom-upload.keystore
YOUTHROOM_UPLOAD_KEY_ALIAS=youthroom
YOUTHROOM_UPLOAD_STORE_PASSWORD=...
YOUTHROOM_UPLOAD_KEY_PASSWORD=...
```

---

## 2. Make the signing config survive `prebuild`

`android/` is **gitignored and regenerated**. Editing `android/app/build.gradle`
by hand works exactly until the next `npx expo prebuild --clean`, which silently
reverts you to debug signing.

This project has already been bitten by this twice — once when the APK size
settings were lost, and once when the ABI list reset and doubled the APK to
98 MB. Do not hand-edit generated files. Add a config plugin instead:

`frontend/plugins/withReleaseSigning.js`

```js
const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Points the release build at the upload keystore.
 *
 * The generated build.gradle signs release with the DEBUG key, which Play
 * rejects. Credentials are read from ~/.gradle/gradle.properties so nothing
 * secret enters the repo, and the release config falls back to debug signing
 * when they are absent, so a contributor without the keystore can still build.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    gradle = gradle.replace(
      /signingConfigs \{\s*debug \{/,
      `signingConfigs {
        release {
            if (project.hasProperty('YOUTHROOM_UPLOAD_STORE_FILE')) {
                storeFile file(YOUTHROOM_UPLOAD_STORE_FILE)
                storePassword YOUTHROOM_UPLOAD_STORE_PASSWORD
                keyAlias YOUTHROOM_UPLOAD_KEY_ALIAS
                keyPassword YOUTHROOM_UPLOAD_KEY_PASSWORD
            }
        }
        debug {`
    );

    gradle = gradle.replace(
      /(release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig project.hasProperty('YOUTHROOM_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`
    );

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
```

Register it in `app.config.js`, in the `plugins` array:

```js
"./plugins/withReleaseSigning",
```

Then regenerate and **verify** rather than assume:

```bash
cd frontend
npx expo prebuild --platform android --clean
grep -n "signingConfigs.release" android/app/build.gradle
```

---

## 3. Set the version, point at the domain, build the AAB

### Version numbers

`app.config.js` has `version: "1.0.0"` and `versionCode: 1`. Every upload needs
a **higher `versionCode` than the last one ever uploaded** — Play rejects a
repeat, and the number can never go down. Bump `versionCode` on every single
upload, including ones you throw away in testing.

`eas.json` sets `appVersionSource: "remote"` with `autoIncrement`, which only
applies to EAS builds. Building locally with Gradle, **you own the number** —
bump it by hand in `app.config.js`.

### Point the app at production

`frontend/.env`:

```ini
API_URL=https://api.yourdomain.com
```

Compiled in at build time. Getting this wrong ships an app that talks to
nothing, and fixing it needs another release.

### Build

Play wants an **AAB**, not an APK. Google re-signs per-device APKs from it, so
each user downloads only their own architecture — roughly half the size.

```bash
cd frontend
npx expo prebuild --platform android --clean
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Verify the signature before uploading

```bash
jarsigner -verify -verbose -certs \
  app/build/outputs/bundle/release/app-release.aab | head -20
```

The certificate must **not** say `CN=Android Debug`. If it does, the plugin did
not take effect — stop and fix it rather than uploading.

Keep building a sideloadable APK (`./gradlew assembleRelease`) for your own
device testing; it is the same code, just a different package format.

---

## 4. Create the Play Console account

<https://play.google.com/console> — **one-time $25 fee**.

Choose the account type carefully:

- **Personal** — cheaper and quicker to open, but subject to the 12-tester /
  14-day closed testing requirement in §7.
- **Organisation** — needs a D-U-N-S number and takes longer to verify, but is
  **exempt** from that requirement.

If the church or ministry is a registered entity and you are not in a hurry,
the organisation account skips two weeks of waiting.

Identity verification (address, phone, sometimes ID) happens here and can take
a few days. Start it early.

---

## 5. Create the app and fill the declarations

**Create app** → name, default language, "App", "Free".

Then work through **Policy → App content**. All of it is mandatory:

| Declaration | Your answer |
|---|---|
| Privacy policy | The URL from §0b |
| Data safety | See below |
| Ads | No ads |
| Content rating | Fill the IARC questionnaire honestly. A social/chat feature raises the rating |
| Target audience | Choose carefully — targeting under-13s triggers Families Policy and much stricter rules. "13+" is the simpler answer for a youth fellowship app |
| News app | No |
| Government app | No |
| Financial features | No |
| Health | No |
| Data deletion | The in-app path and the web URL from §0a |

### Data safety — declare truthfully

Under-declaring is a common cause of rejection and of later enforcement. From
the code, you **collect and transmit**:

- **Personal info:** name, email address, photos
- **Messages:** in-app chat, prayer requests, forum posts
- **Photos:** uploaded to Cloudinary
- **App activity:** reading progress and stats
- **Device identifiers:** the Expo push token

For each: state whether it is *collected* (leaves the device) and *shared*
(passed to third parties). Cloudinary and Groq are processors — read Google's
definition of "shared" before answering, since sending text to Groq for
dictionary lookups may need declaring.

Also state that data is encrypted in transit (true once TLS is set up) and that
users can request deletion (true once §0a is done).

---

## 6. Store listing

**Main store listing** needs:

| Asset | Requirement |
|---|---|
| App name | ≤ 30 characters |
| Short description | ≤ 80 characters |
| Full description | ≤ 4000 characters |
| App icon | 512 × 512 PNG, 32-bit |
| Feature graphic | 1024 × 500 |
| Phone screenshots | 2-8, min 320px on the short side |

Screenshots are the single biggest driver of installs. Use real screens — the
home screen with a Pocket Verse scrolling, the Bible reader, a fellowship chat,
reading plans.

Avoid anything in the icon or graphics that you do not own the rights to.

---

## 7. Closed testing (personal accounts)

Google requires a personal developer account to run a closed test with at least
**12 testers opted in continuously for 14 days** before production access
unlocks.

1. **Testing → Closed testing → Create track.**
2. Create an email list of at least 12 real Google accounts. Your fellowship is
   the obvious source of testers.
3. Upload the AAB, add release notes, roll out.
4. Send testers the opt-in link. **They must actually accept and install** —
   an invited-but-not-opted-in tester does not count.
5. Keep them opted in for the full 14 days. The count dropping below 12 can
   restart the clock.

Do not waste the fortnight — collect real feedback, and use `internal testing`
(no tester minimum, near-instant) for your own rapid checks in parallel.

---

## 8. Production release

1. **Production → Create new release.**
2. Upload the AAB, or promote the tested build from the closed track.
3. Write release notes.
4. **Roll out at a staged percentage** — start at 20%. If something is wrong,
   a staged rollout can be halted; a full one cannot be recalled.
5. Submit for review. First reviews take longest — anywhere from hours to a
   week.

After it is live, watch **Quality → Android vitals** for the crash-free rate,
and your server with `journalctl -u youthroom -f`.

---

## 9. Post-release: what breaks first

- **Your server is a single free VM.** Watch RAM and disk. `df -h` and
  `free -m` on the box.
- **Atlas M0 is 512 MB.** The Bible collections dominate it. Watch the Atlas
  storage metric — running out is a hard stop on writes.
- **A backend outage is total.** There is no failover; the app has no offline
  mode for most screens.
- **Certificate renewal.** Certbot automates it, but verify after 60 days that
  the timer fired.

---

## 10. Shipping an update, end to end

```bash
# 1. Backend
ssh ubuntu@<vm> 'cd /srv/youthroom && git pull && cd backend && npm ci --omit=dev && sudo systemctl restart youthroom'

# 2. Bump versionCode in frontend/app.config.js  (never reuse a number)

# 3. Rebuild
cd frontend && npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease

# 4. Verify it is not debug-signed
jarsigner -verify -certs app/build/outputs/bundle/release/app-release.aab | head

# 5. Upload to internal testing, check on a device, then promote to production
```

**Ship backend changes before app changes**, and keep the API backward
compatible for at least one version. Users update on their own schedule, so an
old app and a new server must coexist — often for weeks.
