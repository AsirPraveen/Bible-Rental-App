// ════════════════════════════════════════════════
//  messageNoteService.ts  —  Service (v2)
// ════════════════════════════════════════════════
import { MessageNote, NoteCategory, ReminderNote, VerseHighlight, VoiceNote } from '../types/MessageNote';
import axios from 'axios';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Local assets for offline Bible
import tamilBibleData from '../../../assets/offline-bible/tamil_bible.json';
import bookTranslations from '../../../assets/offline-bible/book_translations.json';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const STORAGE_KEY = 'MESSAGE_NOTES_V2';

const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
        headers: { Authorization: `Bearer ${token}` }
    };
};

// Clears stale session and signals the caller that auth failed
const handle401 = async (): Promise<never> => {
    await AsyncStorage.multiRemove(['token', 'isLoggedIn', 'userType']);
    const err: any = new Error('Session expired. Please log in again.');
    err.code = 'SESSION_EXPIRED';
    throw err;
};

// ─── Notification setup ───────────────────────────────────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Create channel for Android (required for Firebase / FCM on Android 8+)
const setupNotificationChannel = async () => {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('message-notes', {
            name: 'Message Notes Reminders',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#146C94',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        });
    }
};
setupNotificationChannel();

export const requestNotificationPermission = async (): Promise<boolean> => {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
};


// ─── Auto-generate title ──────────────────────────────────
export const generateTitle = (category: NoteCategory, date: string): string => {
    const d = new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    return `${category} — ${d}`;
};

// ─── GET ALL ──────────────────────────────────────────────
export const getAllNotes = async (isPublic = false): Promise<MessageNote[]> => {
    try {
        let res;
        if (isPublic) {
            // Public endpoint — no auth required (guests can access)
            res = await axios.get(`${API_URL}/api/notes/public`);
        } else {
            const token = await AsyncStorage.getItem('token');
            if (!token) return []; // Guest has no token — skip my-notes fetch
            const headers = await getAuthHeaders();
            res = await axios.get(`${API_URL}/api/notes/my`, headers);
        }

        if (res.data.status === 'ok') {
            const data = res.data.data || [];
            return data.map((n: any) => ({ ...n, id: n._id || n.id }));
        }
        return [];
    } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401) {
            // Expired / invalid JWT — clear stale auth silently
            await AsyncStorage.multiRemove(['token', 'isLoggedIn', 'userType']);
            return [];
        }
        // Other network errors — fall back to local cache
        console.warn('Notes fetch failed, using local cache:', err?.message);
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }
};



// ─── GET ONE ──────────────────────────────────────────────
export const getNoteById = async (id: string): Promise<MessageNote | null> => {
    // Try my notes first (if logged in), then community notes
    const token = await AsyncStorage.getItem('token');
    if (token) {
        const myNotes = await getAllNotes(false);
        const found = myNotes.find(n => n.id === id || (n as any)._id === id);
        if (found) return found;
    }
    // Fall back to public notes
    const publicNotes = await getAllNotes(true);
    return publicNotes.find(n => n.id === id || (n as any)._id === id) ?? null;
};


// ─── CREATE ───────────────────────────────────────────────
export const createNote = async (
    data: Omit<MessageNote, 'id' | 'createdAt' | 'updatedAt' | 'title'> & { isPublic?: boolean }
): Promise<MessageNote | null> => {
    try {
        const headers = await getAuthHeaders();
        const title = generateTitle(data.category, data.date);
        const res = await axios.post(`${API_URL}/api/notes`, { ...data, title }, headers);

        if (res.data.status === 'ok') {
            return res.data.data;
        }
        return null;
    } catch (err: any) {
        if (err?.response?.status === 401) await handle401();
        console.error('Error creating note:', err?.message);
        return null;
    }
};

// ─── UPDATE ───────────────────────────────────────────────
export const updateNote = async (
    id: string,
    data: Partial<Omit<MessageNote, 'id' | 'createdAt'>>
): Promise<MessageNote | null> => {
    try {
        const headers = await getAuthHeaders();
        if (data.category || data.date) {
            // Re-fetch existing to get needed values if partially updating category/date
            const existing = await getNoteById(id);
            if (existing) {
                (data as any).title = generateTitle(data.category || existing.category, data.date || existing.date);
            }
        }

        const res = await axios.put(`${API_URL}/api/notes/${id}`, data, headers);
        if (res.data.status === 'ok') {
            return res.data.data;
        }
        return null;
    } catch (err: any) {
        if (err?.response?.status === 401) await handle401();
        console.error('Error updating note:', err?.message);
        return null;
    }
};

// ─── DELETE ───────────────────────────────────────────────
export const deleteNote = async (id: string): Promise<void> => {
    try {
        const headers = await getAuthHeaders();
        await axios.delete(`${API_URL}/api/notes/${id}`, headers);
    } catch (err: any) {
        if (err?.response?.status === 401) await handle401();
        console.error('Error deleting note:', err?.message);
    }
};

// ─── HIGHLIGHTS CRUD ──────────────────────────────────────
export const addHighlight = async (noteId: string, highlight: Omit<VerseHighlight, 'id'>): Promise<void> => {
    const note = await getNoteById(noteId);
    if (!note) return;
    const h: VerseHighlight = { ...highlight, id: `hl_${Date.now()}` };
    await updateNote(noteId, { highlights: [...note.highlights, h] });
};

export const updateHighlight = async (noteId: string, hlId: string, data: Partial<VerseHighlight>): Promise<void> => {
    const note = await getNoteById(noteId);
    if (!note) return;
    const highlights = note.highlights.map(h => h.id === hlId ? { ...h, ...data } : h);
    await updateNote(noteId, { highlights });
};

export const deleteHighlight = async (noteId: string, hlId: string): Promise<void> => {
    const note = await getNoteById(noteId);
    if (!note) return;
    await updateNote(noteId, { highlights: note.highlights.filter(h => h.id !== hlId) });
};

// ─── VOICE NOTES CRUD ─────────────────────────────────────
export const addVoiceNote = async (noteId: string, voice: Omit<VoiceNote, 'id'>): Promise<void> => {
    const note = await getNoteById(noteId);
    if (!note) return;
    const v: VoiceNote = { ...voice, id: `vn_${Date.now()}` };
    await updateNote(noteId, { voiceNotes: [...note.voiceNotes, v] });
};

export const deleteVoiceNote = async (noteId: string, vnId: string): Promise<void> => {
    const note = await getNoteById(noteId);
    if (!note) return;
    await updateNote(noteId, { voiceNotes: note.voiceNotes.filter(v => v.id !== vnId) });
};

// ─── REMINDERS CRUD ───────────────────────────────────────
export const scheduleNoteNotification = async (title: string, scheduledTime: string, repeating: boolean, message?: string): Promise<string | undefined> => {
    const trigger = new Date(scheduledTime);
    // Guard: don't schedule in the past for one-off reminders
    if (!repeating && trigger.getTime() <= Date.now()) {
        console.warn('Skipping past reminder:', title);
        return undefined;
    }
    try {
        return await Notifications.scheduleNotificationAsync({
            content: {
                title: title || '📖 Bible Note Reminder',
                body: message || 'You have a reminder for your note.',
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,

                // Android: must match the channel we created
                ...(Platform.OS === 'android' ? { channelId: 'message-notes' } : {}),
            },
            trigger: repeating
                ? {
                    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                    hour: trigger.getHours(),
                    minute: trigger.getMinutes(),
                    repeats: true,
                }
                : {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: trigger,
                },
        });
    } catch (e) {
        console.warn('Notification scheduling failed', e);
        return undefined;
    }
};

export const addReminder = async (noteId: string, reminder: Omit<ReminderNote, 'id' | 'notificationId'>): Promise<void> => {
    const note = await getNoteById(noteId);
    if (!note) return;

    const notificationId = await scheduleNoteNotification(reminder.title, reminder.scheduledTime, reminder.repeating, reminder.message);

    const r: ReminderNote = { ...reminder, id: `rm_${Date.now()}`, notificationId };
    await updateNote(noteId, { reminders: [...note.reminders, r] });
};


export const deleteReminder = async (noteId: string, rmId: string): Promise<void> => {
    const note = await getNoteById(noteId);
    if (!note) return;
    const rem = note.reminders.find(r => r.id === rmId);
    if (rem?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(rem.notificationId).catch(() => { });
    }
    await updateNote(noteId, { reminders: note.reminders.filter(r => r.id !== rmId) });
};

// ─── STANDALONE REMINDERS (not attached to notes) ────────
const getStandaloneRemindersKey = async (): Promise<string> => {
    try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const userId = user._id || user.id || user.email || 'guest';
            return `STANDALONE_REMINDERS_V1_${userId}`;
        }
    } catch (e) {
        console.warn('Error parsing user for reminder key', e);
    }
    return 'STANDALONE_REMINDERS_V1_GUEST';
};

export const getStandaloneReminders = async (): Promise<ReminderNote[]> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return [];
        const headers = await getAuthHeaders();
        const res = await axios.get(`${API_URL}/api/reminders`, headers);
        if (res.data.status === 'ok') {
            const data = res.data.data || [];
            const mapped = data.map((n: any) => ({ ...n, id: n._id || n.id }));
            // Cache locally
            const key = await getStandaloneRemindersKey();
            await AsyncStorage.setItem(key, JSON.stringify(mapped));
            return mapped;
        }
        return [];
    } catch (err: any) {
        if (err?.response?.status === 401) {
            await handle401();
            return [];
        }
        console.warn('Reminders fetch failed, using local cache:', err?.message);
        const key = await getStandaloneRemindersKey();
        const raw = await AsyncStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    }
};

export const syncStandaloneReminders = async (): Promise<void> => {
    // 1. Cancel all OS-level scheduled notifications (clears previous user's notifications)
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    
    // 2. Fetch the current user's reminders
    const reminders = await getStandaloneReminders();
    let updated = false;
    
    // 3. Re-schedule them and update their notificationIds
    const syncedReminders = await Promise.all(reminders.map(async (r) => {
        const nid = await scheduleNoteNotification(r.title, r.scheduledTime, r.repeating, r.message);
        if (nid && nid !== r.notificationId) {
            updated = true;
            return { ...r, notificationId: nid };
        }
        return r;
    }));
    
    // 4. Save back to storage if any IDs changed
    if (updated) {
        const key = await getStandaloneRemindersKey();
        await AsyncStorage.setItem(key, JSON.stringify(syncedReminders));
    }
};

export const addStandaloneReminder = async (
    reminder: Omit<ReminderNote, 'id' | 'notificationId'>
): Promise<void> => {
    const notificationId = await scheduleNoteNotification(
        reminder.title,
        reminder.scheduledTime,
        reminder.repeating,
        reminder.message
    );
    
    try {
        const headers = await getAuthHeaders();
        await axios.post(`${API_URL}/api/reminders`, {
            ...reminder,
            notificationId
        }, headers);
    } catch (err: any) {
        if (err?.response?.status === 401) await handle401();
        console.error('Error adding standalone reminder to backend:', err?.message);
        throw err;
    }
};

export const deleteStandaloneReminder = async (rmId: string): Promise<void> => {
    const existing = await getStandaloneReminders();
    const rem = existing.find(r => r.id === rmId);
    if (rem?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(rem.notificationId).catch(() => { });
    }
    
    try {
        const headers = await getAuthHeaders();
        await axios.delete(`${API_URL}/api/reminders/${rmId}`, headers);
    } catch (err: any) {
        if (err?.response?.status === 401) await handle401();
        console.error('Error deleting standalone reminder from backend:', err?.message);
        throw err;
    }
};

export const clearAllStandaloneReminders = async (): Promise<void> => {
    const existing = await getStandaloneReminders();
    for (const r of existing) {
        if (r.notificationId) {
            await Notifications.cancelScheduledNotificationAsync(r.notificationId).catch(() => { });
        }
    }
    
    try {
        const headers = await getAuthHeaders();
        await axios.delete(`${API_URL}/api/reminders/all`, headers);
        const key = await getStandaloneRemindersKey();
        await AsyncStorage.removeItem(key);
    } catch (err: any) {
        if (err?.response?.status === 401) await handle401();
        console.error('Error clearing standalone reminders from backend:', err?.message);
    }
};

// ─── CLEAR ALL DATA (dev reset) ───────────────────────────
export const clearAllNotesData = async (): Promise<{ deleted: number }> => {
    // 1. Cancel all scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});

    // 2. Wipe AsyncStorage local caches
    const rmKey = await getStandaloneRemindersKey();
    await AsyncStorage.multiRemove([STORAGE_KEY, rmKey]);

    // 3. Delete all notes from MongoDB via backend
    try {
        const headers = await getAuthHeaders();
        const res = await axios.delete(`${API_URL}/api/notes/all`, headers);
        const deleted = res.data?.data?.deletedCount ?? 0;
        return { deleted };
    } catch (err: any) {
        if (err?.response?.status === 401) await handle401();
        console.error('Error clearing all notes:', err?.message);
        return { deleted: 0 };
    }
};


// ─── BIBLE EXPORT & SHARING ───────────────────────────────
export const exportNoteAsText = async (note: MessageNote) => {
    try {
        const text = buildShareText(note);
        const fileName = `${note.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, text);

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
        } else {
            alert('Sharing is not available on this device');
        }
    } catch (err) {
        console.error('Error exporting note:', err);
        alert('Failed to export note');
    }
};

// ─── BIBLE VERSE PICKER (LOCAL JSON) ──────────────────────
export const getLocalBibleData = () => {
    return {
        tamilBibleData: tamilBibleData as any[],
        bookTranslations: bookTranslations as any
    };
};

export const lookupVerse = async (
    book: string | number,
    chapter: number,
    verse: number,
    language: 'English' | 'Tamil'
): Promise<string> => {
    const isNum = typeof book === 'number';

    // Priority: Tamil (Offline JSON)
    if (language === 'Tamil') {
        const chapterData = (tamilBibleData as any[]).find(c => {
            if (isNum) return c.bookNumber === book && c.chapterNumber === chapter;
            // Case-insensitive comparison for book name
            return c.bookName.toLowerCase() === (book as string).toLowerCase() && c.chapterNumber === chapter;
        });

        if (chapterData) {
            const v = chapterData.verses.find((v: any) => v.verseNumber === verse);
            if (v) return v.text;
        }
    }


    // Fallback/English: API lookup
    try {
        let bookName = 'Genesis';
        if (!isNum) {
            bookName = book as string;
        } else {
            const books = (bookTranslations as any)['English'] || {};
            bookName = books[book] || (tamilBibleData as any[]).find((c: any) => c.bookNumber === book)?.bookName || 'Genesis';
        }
        const translation = language === 'Tamil' ? 'tamil' : 'kjv';
        const url = `https://bible-api.com/${bookName}+${chapter}:${verse}?translation=${translation}`;

        const res = await fetch(url);
        const data = await res.json();
        return data.text ? data.text.trim() : 'Verse not found';
    } catch {
        return 'Could not load verse.';
    }
};

// ─── EXPORT / SHARE ───────────────────────────────────────
export const buildShareText = (note: MessageNote): string => {
    const lines: string[] = [];
    lines.push(`📖 ${note.title}`);
    lines.push(`📅 ${new Date(note.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`);
    if (note.verse) lines.push(`📌 ${note.verse}`);
    lines.push('');
    lines.push(note.content);
    if (note.highlights.length > 0) {
        lines.push('\n─── Verse Highlights ───');
        for (const h of note.highlights) {
            const colorLabel = h.color === 'yellow' ? '⭐ Important' : h.color === 'blue' ? '💙 Promise' : '🔴 Warning';
            lines.push(`${colorLabel}: ${h.book} ${h.chapter}:${h.verse}`);
            lines.push(`  "${h.verseText}"`);
            if (h.note) lines.push(`  Note: ${h.note}`);
        }
    }
    return lines.join('\n');
};

/* ─── SEED SAMPLE DATA ─────────────────────────────────────
export const seedSampleNotes = async (): Promise<void> => {
    const existing = await getAllNotes();
    if (existing.length > 0) return;

    const samples: Omit<MessageNote, 'id' | 'createdAt' | 'updatedAt' | 'title'>[] = [
        {
            date: '2026-04-13T10:00:00.000Z',
            category: 'Sunday Service',
            content: '**Faith in Trials**\n\nFaith is not the absence of doubt, but courage to trust God.\n• Trials reveal what we are made of\n• Faith grows strongest under pressure\n• God\'s purpose: bring us to maturity',
            verse: 'James 1:2-4',
            highlights: [{ id: 'hl1', book: 'James', chapter: 1, verse: 2, verseText: 'Count it all joy, my brothers, when you meet trials of various kinds', color: 'yellow', language: 'English' }],
            voiceNotes: [],
            reminders: [],
        },
        {
            date: '2026-04-10T18:00:00.000Z',
            category: 'Prayer Cell',
            content: '**Fasting & Intercession**\n\nFasting combined with prayer breaks spiritual strongholds.\n• Isaiah 58 — the fast God has chosen\n• Focus: families, healing, youth\n\n_Key: Fasting shifts hunger from physical to spiritual_',
            verse: 'Isaiah 58:6',
            highlights: [],
            voiceNotes: [],
            reminders: [],
        },
        {
            date: '2026-04-06T16:00:00.000Z',
            category: 'Youth Meeting',
            content: '**Identity in Christ**\n\nYou are chosen, holy, and dearly loved.\n• Not what you do — who God says you are\n• ==Write 3 lies you believed, find Bible verse replacing each==',
            verse: 'Colossians 3:12',
            highlights: [{ id: 'hl2', book: 'Colossians', chapter: 3, verse: 12, verseText: 'Put on then, as God\'s chosen ones, holy and beloved, compassionate hearts', color: 'blue', language: 'English' }],
            voiceNotes: [],
            reminders: [],
        },
    ];

    for (const s of samples) {
        await createNote(s);
    }
};*/