# Privacy Policy — Youth Room

**Last updated: [DATE]**

> **Draft.** Everything in square brackets needs a decision from you before this
> is published. It was written from the code — every collection, purpose and
> third party listed below corresponds to something the app actually does — but
> it is not legal advice, and retention periods and contact details are yours to
> set. Have someone qualified read it before you rely on it.

Youth Room ("the app") is operated by **[LEGAL ENTITY NAME]** ("we", "us").
This policy explains what we collect, why, who else sees it, and what you can
ask us to do about it.

Contact us about privacy at **[PRIVACY EMAIL]**.

---

## 1. How the app is organised

Youth Room is used by churches and fellowship groups. Each group is a separate
**organization** inside the app, and almost everything you create belongs to the
organization you are signed in to — not to the app as a whole.

Three things follow from this, and they matter for your privacy:

- **Your organization's administrators can see the content you post to it.** That
  includes prayer requests, forum questions, sermon notes you mark as shared,
  and your book borrowing history.
- **Other organizations cannot see your content.** Data is separated per
  organization and requests are scoped to the organization you belong to.
- **Signed-out visitors** can only reach general Bible content — Bible text,
  historical maps and the 3D museum. They cannot see anything belonging to an
  organization.

## 2. What we collect

### Information you give us

| Data | When | Why |
| --- | --- | --- |
| Name, email address, mobile number | Registration, or from Google when you sign in with Google | To create and identify your account |
| Password | Registration | Stored only as a bcrypt hash — we cannot read it |
| Profile photo | If you choose to add one | Shown to others in your organization |
| Gender, profession | Optional profile fields | Shown in your profile |
| Prayer requests | When you post one | Shared with your organization's prayer wall |
| Forum questions and answers | When you post one | Shared with your organization's forum |
| Sermon notes, verse highlights, voice notes | When you create them | Private to you unless you mark a note as shared |
| Chat messages, poll votes, Q&A answers | In fellowship chat | Visible to that fellowship's members |
| Book rental requests | When you request a book | Shown to your organization's administrators |

**Prayer requests and sermon notes often contain sensitive personal
information** — about health, bereavement, family or money. Please be aware that
prayer requests are visible to everyone in your organization, and that posting
anonymously hides your name from other members but the request itself is still
shared.

### Information collected automatically

| Data | Why |
| --- | --- |
| Notification token | To send you push notifications, if you allow them |
| Last active time | So administrators can see who is active in the organization |
| Bible reading progress, fasting plans, reading streaks | To show your own progress and organization-level totals |
| Game progress (cards, currency, levels) | To save your progress in the in-app game |
| Device timezone | So daily reading reminders arrive at your local time, not ours |

### What we do **not** collect

- We do not collect your location.
- We do not use advertising identifiers, and there is no advertising in the app.
- We do not track you across other apps or websites.
- We do not sell your personal information.

## 3. Camera and photo access

The app asks for camera and photo access only when you choose to add a picture —
a profile photo, or images and voice notes attached to content if you are an
administrator. If you decline, the rest of the app works normally. We do not
access your camera or library in the background.

## 4. Who else sees your data

We use these services to run the app. Each receives only what it needs.

| Service | What it receives | Purpose |
| --- | --- | --- |
| **MongoDB Atlas** ([REGION]) | All app data | Database hosting |
| **Cloudinary** | Images and voice notes you upload | Media storage and delivery |
| **Expo push notifications** | Your notification token and the text of notifications | Delivering push notifications |
| **Google Sign-In** | Handles authentication if you sign in with Google | Sign-in |
| **Stability AI** | The Bible verse text you choose to illustrate | Generating verse illustrations, only when you request one |
| **dictionaryapi.dev** | A single word you tap in the Bible reader | Showing a definition |
| **Gmail (SMTP)** | Your email address and the message | Password reset and invitation emails |

We do not share your data with anyone else, and we do not sell it.

## 5. How long we keep it

| Data | Kept |
| --- | --- |
| Account and profile | Until you ask us to delete your account |
| Invitation codes | Automatically deleted 7 days after they are created |
| Password reset codes | Automatically expire after 10 minutes |
| Prayer requests, forum posts, notes, chat messages | [RETENTION — until deleted by you or your administrator?] |
| Uploaded images and voice notes | [RETENTION — deleted with their content, or kept?] |
| Backups | [BACKUP RETENTION PERIOD] |

## 6. Your choices and rights

- **See or correct your data** — most of it is editable in the app. For anything
  else, email us.
- **Delete your account** — email **[PRIVACY EMAIL]** and we will delete your
  account and personal data within **[NUMBER] days**. Content you posted to an
  organization may be retained where others have replied to it; tell us if you
  want it removed and we will explain what is possible.
- **Leave an organization** — you can be removed from an organization by its
  administrator, or ask us. Leaving stops new content being shared with it.
- **Turn off notifications** — in the app's notification settings, or in your
  device settings.
- **Withdraw camera or photo permission** — in your device settings, at any time.

Depending on where you live you may also have rights to object to processing, to
data portability, or to complain to a regulator. India's Digital Personal Data
Protection Act 2023 and, where it applies, the UK/EU GDPR give you these rights.
Email us and we will help.

## 7. Children

Youth Room is intended for use by youth and adult members of a church or
fellowship group, and may be used by minors as part of that group. We do not
knowingly collect data from children under **[AGE]** without the involvement of
their parent, guardian or group leader. If you believe a child's data has been
collected inappropriately, contact us and we will remove it.

## 8. Security

- Passwords are stored as bcrypt hashes and are never readable by us or anyone else.
- Traffic between the app and our servers uses HTTPS.
- Access is scoped per organization, and administrative actions require an
  administrator role in that specific organization.
- Sign-in attempts and password resets are rate limited.

No system is completely secure. If a breach affects your personal data, we will
notify you and the relevant authority as required by law.

## 9. Changes

If we change this policy we will update the date at the top and, for
significant changes, notify you in the app.

---

**[LEGAL ENTITY NAME]**
[POSTAL ADDRESS]
[PRIVACY EMAIL]
