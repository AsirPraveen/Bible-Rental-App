// ════════════════════════════════════════════════
//  NoteFormScreen.tsx  —  Enhanced Form (v2)
//  - No title / speaker fields (auto-generated)
//  - Rich text toolbar (Bold, Italic, Bullet, Highlight)
//  - Verse lookup (Book Chapter:Verse → Tamil/English)
//  - Highlight + Note combo with color codes
//  - Reminder scheduler with push notification
//  - Voice note recorder
// ════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import Slider from '@react-native-community/slider';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Platform, KeyboardAvoidingView, Modal,
  ActivityIndicator, StatusBar, SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  createNote, updateNote, addHighlight, deleteHighlight,
  addVoiceNote, deleteVoiceNote, addReminder, deleteReminder,
  lookupVerse, requestNotificationPermission, generateTitle, getLocalBibleData,
  scheduleNoteNotification
} from './services/MessageNoteService';
import { MessageNote, NoteCategory, HighlightColor } from './types/MessageNote';
import { CATEGORY_META } from './components/MessageNoteCard';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const cloudinaryCloudName = Constants.expoConfig?.extra?.cloudinaryCloudName ?? '';
const uploadPresentPosts = Constants.expoConfig?.extra?.uploadPresentPosts ?? '';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const { tamilBibleData, bookTranslations } = getLocalBibleData();

const CATEGORIES: NoteCategory[] = [
  'Sunday Service', 'Bible Study', 'Prayer Cell',
  'Special Meeting', 'Youth Meeting', 'Other',
];

const HIGHLIGHT_COLORS: { key: HighlightColor; label: string; emoji: string; color: string }[] = [
  { key: 'yellow', label: 'Important', emoji: '⭐', color: '#FFF176' },
  { key: 'blue', label: 'Promise', emoji: '💙', color: '#BBDEFB' },
  { key: 'red', label: 'Warning', emoji: '🔴', color: '#FFCDD2' },
];

export default function NoteFormScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editNote: MessageNote | undefined = route.params?.note;
  const isEdit = !!editNote;

  // ── Core state ────────────────────────────────
  const [category, setCategory] = useState<NoteCategory>(editNote?.category ?? 'Sunday Service');
  const [date] = useState(editNote?.date ?? new Date().toISOString());
  const [content, setContent] = useState(editNote?.content ?? '');
  const [verse, setVerse] = useState(editNote?.verse ?? '');
  const [isPublic, setIsPublic] = useState(editNote?.isPublic ?? false);
  const [saving, setSaving] = useState(false);
  const { isGuest } = useAuth();

  // ── Rich text selection ───────────────────────
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);

  // ── Verse lookup ──────────────────────────────
  const [verseBook, setVerseBook] = useState('');
  const [verseChapter, setVerseChapter] = useState('');
  const [verseNum, setVerseNum] = useState('');
  const [verseLang, setVerseLang] = useState<'English' | 'Tamil'>('Tamil');
  const [verseResult, setVerseResult] = useState('');
  const [verseLooking, setVerseLooking] = useState(false);
  const [showVerseModal, setShowVerseModal] = useState(false);

  // New Bible Picker state
  const [availableBooks, setAvailableBooks] = useState<any[]>([]);
  const [availableChapters, setAvailableChapters] = useState<any[]>([]);
  const [availableVerses, setAvailableVerses] = useState<any[]>([]);
  const [selectedBookNum, setSelectedBookNum] = useState<number | null>(null);
  const [selectedChapterNum, setSelectedChapterNum] = useState<number | null>(null);
  const [selectedVerseNum, setSelectedVerseNum] = useState<number | null>(null);

  // ── Highlight state ───────────────────────────
  const [highlights, setHighlights] = useState(editNote?.highlights ?? []);
  const [showHlModal, setShowHlModal] = useState(false);
  const [hlColor, setHlColor] = useState<HighlightColor>('yellow');
  const [hlNote, setHlNote] = useState('');

  // ── Voice note state ──────────────────────────
  const [voiceNotes, setVoiceNotes] = useState(editNote?.voiceNotes ?? []);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const tempUploadedVoiceNotes = useRef<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playTime, setPlayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const deleteVoiceNoteFromCloudinary = async (publicId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/cloudinary/delete`, {
        token,
        publicId,
        resourceType: 'video'
      });
    } catch (err) {
      console.log('Error deleting voice note from Cloudinary:', err);
    }
  };

  const handleRemoveVoiceNote = async (vn: any) => {
    setVoiceNotes(prev => prev.filter(v => v.id !== vn.id));
    if (vn.publicId) {
      tempUploadedVoiceNotes.current = tempUploadedVoiceNotes.current.filter(id => id !== vn.publicId);
      await deleteVoiceNoteFromCloudinary(vn.publicId);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup unsaved temp voice recordings on unmount
      if (tempUploadedVoiceNotes.current.length > 0) {
        tempUploadedVoiceNotes.current.forEach(async (id) => {
          await deleteVoiceNoteFromCloudinary(id);
        });
      }
    };
  }, []);

  // ── Reminder state ────────────────────────────
  const [reminders, setReminders] = useState(editNote?.reminders ?? []);
  const [showRmModal, setShowRmModal] = useState(false);
  const [rmTitle, setRmTitle] = useState('');
  const [rmTime, setRmTime] = useState(new Date());
  const [rmRepeat, setRmRepeat] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const accentColor = CATEGORY_META[category]?.color ?? '#1565C0';
  const autoTitle = generateTitle(category, date);

  // ── Rich Text Helpers ─────────────────────────
  const wrapSelection = (open: string, close: string) => {
    const { start, end } = selection;
    const selected = content.slice(start, end);
    const before = content.slice(0, start);
    const after = content.slice(end);
    setContent(`${before}${open}${selected}${close}${after}`);
  };

  // ── Bible Picker Logic ────────────────────────
  useEffect(() => {
    // Populate books based on language
    const booksArr: any[] = [];
    const booksMap = new Map();
    tamilBibleData.forEach((item: any) => {
      if (!booksMap.has(item.bookNumber)) {
        const bookName = bookTranslations[verseLang]?.[item.bookNumber] || item.bookName;
        booksMap.set(item.bookNumber, { label: bookName, value: item.bookNumber });
        booksArr.push({ label: bookName, value: item.bookNumber });
      }
    });
    setAvailableBooks(booksArr.sort((a, b) => a.value - b.value));
  }, [verseLang]);

  useEffect(() => {
    if (selectedBookNum !== null) {
      const chaptersArr = Array.from(new Set(
        tamilBibleData
          .filter(c => c.bookNumber === selectedBookNum)
          .map(c => c.chapterNumber)
      ))
      .sort((a, b) => a - b)
      .map(c => ({ label: `Chapter ${c}`, value: c }));
      setAvailableChapters(chaptersArr);
      setSelectedChapterNum(null);
      setSelectedVerseNum(null);
    }
  }, [selectedBookNum]);

  useEffect(() => {
    if (selectedBookNum !== null && selectedChapterNum !== null) {
      const chapter = tamilBibleData.find(c => c.bookNumber === selectedBookNum && c.chapterNumber === selectedChapterNum);
      if (chapter) {
        const versesArr = (chapter.verses || []).map((v: any) => ({ label: `Verse ${v.verseNumber}`, value: v.verseNumber, text: v.text }));
        setAvailableVerses(versesArr);
        setSelectedVerseNum(null);
      }
    }
  }, [selectedChapterNum]);

  // ── Verse Lookup ──────────────────────────────
  const handleVerseSearch = async () => {
    if (selectedBookNum === null || selectedChapterNum === null || selectedVerseNum === null) return;
    setVerseLooking(true);
    const text = await lookupVerse(selectedBookNum, selectedChapterNum, selectedVerseNum, verseLang);
    setVerseResult(text);
    setVerseLooking(false);
  };

  const insertVerse = () => {
    if (!verseResult) return;
    const { start, end } = selection;
    const before = content.slice(0, start);
    const after = content.slice(end);
    setContent(`${before}${verseResult}${after}`);
    setVerseResult('');
    setShowVerseModal(false);
  };
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  // ── Add Highlight ─────────────────────────────
  // (Logic moved to the Modal's onPress handler to use picker state)

  // ── Voice Note ────────────────────────────────
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordTime(0);



      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch {
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();
    if (uri) {
      setIsUploadingVoice(true);
      try {
        const fileExtension = uri.split('.').pop()?.toLowerCase();
        const mimeType = fileExtension === 'm4a' ? 'audio/m4a' : fileExtension === 'caf' ? 'audio/caf' : 'audio/mpeg';

        const formData = new FormData();
        formData.append('file', {
          uri,
          type: mimeType,
          name: `voice_note_${Date.now()}.${fileExtension || 'm4a'}`,
        } as any);
        formData.append('upload_preset', uploadPresentPosts);

        // Upload to Cloudinary auto/video endpoint
        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/video/upload`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        if (response.data && response.data.secure_url) {
          const newPubId = response.data.public_id;
          tempUploadedVoiceNotes.current.push(newPubId);

          const vn = {
            id: `vn_${Date.now()}`,
            uri: response.data.secure_url,
            publicId: newPubId,
            durationMs: (status as any).durationMillis ?? 0,
            createdAt: new Date().toISOString(),
            label: `Recording ${voiceNotes.length + 1}`,
          };
          setVoiceNotes(prev => [...prev, vn]);
          Alert.alert('Success', 'Voice recording uploaded successfully!');
        } else {
          throw new Error('Cloudinary response did not contain secure_url');
        }
      } catch (error: any) {
        console.error('Error uploading voice note to Cloudinary:', error);
        Alert.alert('Error', 'Failed to upload voice note to server.');
      } finally {
        setIsUploadingVoice(false);
      }
    }
    setRecording(null);
  };

  const playVoice = async (id: string, uri: string) => {
    if (soundRef.current) {
      if (playingId === id) {
        const status = await soundRef.current.getStatusAsync();

        if (!status.isLoaded) return;

        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
        return;
      }

      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );

    soundRef.current = sound;
    setPlayingId(id);

    sound.setOnPlaybackStatusUpdate((s: any) => {
      if (s.isLoaded) {
        setPlayTime(Math.floor(s.positionMillis / 1000));
        setDuration(Math.floor(s.durationMillis / 1000));
      }

      if (s.didJustFinish) {
        setPlayingId(null);
        setPlayTime(0);
      }
    });
  };

  // ── Add Reminder ──────────────────────────────
  const confirmAddReminder = async () => {
    if (!rmTitle.trim()) { Alert.alert('Required', 'Enter reminder title'); return; }
    const granted = await requestNotificationPermission();
    if (!granted) { Alert.alert('Permission denied', 'Enable notifications in settings.'); return; }
    const rm = {
      title: rmTitle.trim(),
      scheduledTime: rmTime.toISOString(),
      repeating: rmRepeat,
    };
    const fullRm = { ...rm, id: `rm_${Date.now()}`, notificationId: undefined };
    setReminders(prev => [...prev, fullRm]);
    setShowRmModal(false);
    setRmTitle(''); setRmRepeat(false);
  };

  // ── Save ──────────────────────────────────────
  const handleSave = async () => {
    if (!content.trim()) { Alert.alert('Required', 'Please enter note content.'); return; }
    setSaving(true);
    try {
      // Functional Fix: Schedule notifications for any reminder that doesn't have an ID yet
      const processedReminders = await Promise.all(reminders.map(async r => {
        if (!r.notificationId) {
          const nid = await scheduleNoteNotification(r.title, r.scheduledTime, r.repeating);
          return { ...r, notificationId: nid };
        }
        return r;
      }));

      const payload = {
        date, category, content: content.trim(),
        verse: verse.trim(), highlights, voiceNotes, reminders: processedReminders,
        isPublic
      };
      if (isEdit) {
        await updateNote((editNote as any)._id || editNote!.id, payload);
        tempUploadedVoiceNotes.current = [];
        Alert.alert('Updated ✓', 'Note updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await createNote(payload);
        tempUploadedVoiceNotes.current = [];
        Alert.alert('Saved ✓', 'Note added.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (err: any) {
      if (err?.code === 'SESSION_EXPIRED') {
        Alert.alert(
          'Session Expired',
          'Your login session has expired. Please log in again.',
          [{ text: 'Login', onPress: () => navigation.navigate('Login' as never) }]
        );
      } else {
        Alert.alert('Error', 'Could not save. Try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const fmtDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  // ══════════════════════════════════════════════
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <LinearGradient colors={colors.linearGradient} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{isEdit ? 'Update Note' : 'Create Note'}</Text>
            <Text style={styles.headerSub}>{autoTitle}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveHeaderBtn}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        {/* Public Toggle in Header */}
        <View style={styles.headerToggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="earth" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.toggleText}>Share with community</Text>
          </View>
          <TouchableOpacity 
            style={[styles.switch, isPublic && styles.switchActive]} 
            onPress={() => setIsPublic(!isPublic)}
          >
            <View style={[styles.switchThumb, isPublic && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Category ── */}
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 2 }}>
          {CATEGORIES.map(cat => {
            const m = CATEGORY_META[cat];
            const active = category === cat;
            return (
              <TouchableOpacity key={cat}
                style={[styles.catChip,
                active ? { backgroundColor: m.color, borderColor: m.color }
                  : { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => setCategory(cat)}>
                <Ionicons name={m.icon} size={11} color={active ? '#fff' : m.color} />
                <Text style={[styles.catChipText, { color: active ? '#fff' : colors.textSecondary }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Bible Verse Reference ── */}
        <Text style={styles.label}>Bible Verse (optional)</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="e.g. James 1:2-4"
            value={verse} onChangeText={setVerse} placeholderTextColor="#bbb" />
          <TouchableOpacity style={[styles.iconActionBtn, { backgroundColor: accentColor }]}
            onPress={() => setShowVerseModal(true)}>
            <Ionicons name="search" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Rich Text Toolbar ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 8 }}>
            <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Notes / Content </Text>
            <TouchableOpacity onPress={() => setIsFullScreen(true)}>
                <Ionicons name="expand" size={18} color={accentColor} />
            </TouchableOpacity>
        </View>

        {/* ── Content TextInput ── */}
        <TextInput
          ref={inputRef}
          style={[styles.input, styles.textarea]}
          placeholder="Write your notes here…"
          value={content}
          onChangeText={setContent}
          onSelectionChange={e => setSelection(e.nativeEvent.selection)}
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={10}
          textAlignVertical="top"
        />

        {/* ── Highlights Section ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="color-palette-outline" size={15} color={accentColor} />
          <Text style={[styles.sectionTitle, { color: accentColor }]}>Verse Highlights</Text>
          <TouchableOpacity onPress={() => setShowHlModal(true)} style={[styles.addSmallBtn, { borderColor: accentColor }]}>
            <Ionicons name="add" size={13} color={accentColor} />
            <Text style={[styles.addSmallText, { color: accentColor }]}>Add</Text>
          </TouchableOpacity>
        </View>
        {highlights.map(h => {
          const hc = HIGHLIGHT_COLORS.find(x => x.key === h.color)!;
          return (
            <View key={h.id} style={[styles.hlCard, { borderLeftColor: hc.color, backgroundColor: colors.theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : hc.color + '33' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hlRef}>{hc.emoji} {h.book} {h.chapter}:{h.verse} ({h.language})</Text>
                <Text style={styles.hlText} numberOfLines={2}>{h.verseText}</Text>
                {h.note ? <Text style={styles.hlNote}>📝 {h.note}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => setHighlights(prev => prev.filter(x => x.id !== h.id))}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* ── Voice Notes Section ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="mic-outline" size={15} color={accentColor} />
          <Text style={[styles.sectionTitle, { color: accentColor }]}>Voice Notes 🎙️</Text>
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            style={[styles.addSmallBtn, {
              borderColor: isRecording ? '#C62828' : accentColor,
              backgroundColor: isRecording ? '#FFEBEE' : 'transparent'
            }]}>
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={13} color={isRecording ? '#C62828' : accentColor} />
            <Text style={[styles.addSmallText, { color: isRecording ? '#C62828' : accentColor }]}>
              {isRecording ? 'Stop' : 'Record'}
            </Text>
          </TouchableOpacity>
        </View>
        {isRecording && (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              Recording… {Math.floor(recordTime / 60)}:
              {String(recordTime % 60).padStart(2, '0')}
            </Text>
          </View>
        )}
        {isUploadingVoice && (
          <View style={[styles.recordingBar, { backgroundColor: '#E0F2FE' }]}>
            <ActivityIndicator size="small" color="#0284C7" style={{ marginRight: 8 }} />
            <Text style={[styles.recordingText, { color: '#0284C7' }]}>
              Uploading to Cloudinary...
            </Text>
          </View>
        )}
        {voiceNotes.map(vn => (
          <View key={vn.id} style={styles.voiceCard}>
            <TouchableOpacity onPress={() => playVoice(vn.id, vn.uri)} style={styles.playBtn}>
              <Ionicons name={playingId === vn.id ? 'pause' : 'play'} size={16} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TextInput 
                style={styles.voiceLabelInput} 
                value={vn.label} 
                onChangeText={(txt) => setVoiceNotes(prev => prev.map(v => v.id === vn.id ? { ...v, label: txt } : v))}
                placeholder="Recording name" 
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.voiceDur}>
                  {playingId === vn.id
                    ? `${Math.floor(playTime / 60)}:${String(playTime % 60).padStart(2, '0')}`
                    : fmtDuration(vn.durationMs)}
                </Text>
                {playingId === vn.id && (
                    <Slider
                        minimumValue={0}
                        maximumValue={duration || 1}
                        value={playTime}
                        onSlidingComplete={async (value) => {
                            if (soundRef.current) {
                                await soundRef.current.setPositionAsync(value * 1000);
                            }
                        }}
                        style={{ height: 20, width: '100%' }}
                    />
                )}
            </View>
            <TouchableOpacity onPress={() => handleRemoveVoiceNote(vn)}>
              <Ionicons name="trash-outline" size={16} color="#C62828" />
            </TouchableOpacity>
          </View>
        ))}

        {/* (Reminders removed from view per request) */}

        {/* ── Save Button ── */}
        <TouchableOpacity 
            style={[styles.bigSaveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave} 
            disabled={saving}
        >
          <Ionicons name={isEdit ? 'checkmark-done' : 'save'} size={20} color="#fff" />
          <Text style={styles.bigSaveBtnText}>{saving ? 'Saving...' : isEdit ? 'Update My Note' : 'Create Note'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ══ VERSE LOOKUP MODAL ══ */}
      <Modal visible={showVerseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📖 Holy Bible Picker</Text>
              <TouchableOpacity onPress={() => setShowVerseModal(false)}>
                <Ionicons name="close" size={24} color="#aaa" />
              </TouchableOpacity>
            </View>

            {/* Language Selection */}
            <View style={styles.pickerRow}>
              {(['English', 'Tamil'] as const).map(l => (
                <TouchableOpacity key={l}
                  style={[styles.langChip, verseLang === l && styles.langChipActive]}
                  onPress={() => setVerseLang(l)}>
                  <Text style={[styles.langChipText, verseLang === l && styles.langChipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Picker Buttons */}
            <View style={styles.selectionGrid}>
              <View style={styles.selectionItem}>
                <Text style={styles.selectionLabel}>Book</Text>
                <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                  {availableBooks.map(b => (
                    <TouchableOpacity 
                      key={`vl-bk-${b.value}`} 
                      style={[styles.selectBtn, selectedBookNum === b.value && styles.selectBtnActive]}
                      onPress={() => setSelectedBookNum(b.value)}
                    >
                      <Text style={[styles.selectText, selectedBookNum === b.value && styles.selectTextActive]} numberOfLines={1}>{b.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.selectionItem}>
                <Text style={styles.selectionLabel}>Ch.</Text>
                <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                  {availableChapters.map(c => (
                    <TouchableOpacity 
                      key={`vl-ch-${c.value}`}
                      style={[styles.selectBtn, selectedChapterNum === c.value && styles.selectBtnActive]}
                      onPress={() => setSelectedChapterNum(c.value)}
                    >
                      <Text style={[styles.selectText, selectedChapterNum === c.value && styles.selectTextActive]}>{c.value}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.selectionItem}>
                <Text style={styles.selectionLabel}>Vs.</Text>
                <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                  {availableVerses.map(v => (
                    <TouchableOpacity 
                      key={`vl-vs-${v.value}`}
                      style={[styles.selectBtn, selectedVerseNum === v.value && styles.selectBtnActive]}
                      onPress={() => setSelectedVerseNum(v.value)}
                    >
                      <Text style={[styles.selectText, selectedVerseNum === v.value && styles.selectTextActive]}>{v.value}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.modalActionBtn, { backgroundColor: colors.primary, opacity: selectedVerseNum ? 1 : 0.6 }]} 
              onPress={handleVerseSearch}
              disabled={!selectedVerseNum || verseLooking}
            >
              {verseLooking ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalActionText}>Fetch Verse Content</Text>}
            </TouchableOpacity>

            {verseResult ? (
              <View style={styles.verseResultBox}>
                <Text style={styles.verseResultText} numberOfLines={4}>{verseResult}</Text>
                <TouchableOpacity onPress={() => { 
                    const bookName = availableBooks.find(b => b.value === selectedBookNum)?.label || '';
                    setVerse(`${bookName} ${selectedChapterNum}:${selectedVerseNum}`); 
                    setShowVerseModal(false); 
                }}>
                  <Text style={[styles.useVerseBtn, { color: colors.tint }]}>Insert Reference ✓</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ══ HIGHLIGHT MODAL ══ (Simplified to use the same picker logic) */}
      <Modal visible={showHlModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✨ Highlight Verse</Text>
              <TouchableOpacity onPress={() => setShowHlModal(false)}>
                <Ionicons name="close" size={24} color="#aaa" />
              </TouchableOpacity>
            </View>

            {/* Quick selectors for Highlight (Reuse the same grid logic) */}
            <View style={styles.selectionGrid}>
              <View style={styles.selectionItem}>
                <Text style={styles.selectionLabel}>Book</Text>
                <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                  {availableBooks.map(b => (
                    <TouchableOpacity 
                      key={`hl-bk-${b.value}`} 
                      style={[styles.smallSelectBtn, selectedBookNum === b.value && styles.selectBtnActive]}
                      onPress={() => setSelectedBookNum(b.value)}
                    >
                      <Text style={[styles.smallSelectText, selectedBookNum === b.value && styles.selectTextActive]} numberOfLines={1}>{b.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.selectionItem}><Text style={styles.selectionLabel}>Ch.</Text>
                <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                  {availableChapters.map(c => (
                    <TouchableOpacity key={`hl-ch-${c.value}`} style={[styles.smallSelectBtn, selectedChapterNum === c.value && styles.selectBtnActive]} onPress={() => setSelectedChapterNum(c.value)}>
                      <Text style={[styles.smallSelectText, selectedChapterNum === c.value && styles.selectTextActive]}>{c.value}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.selectionItem}><Text style={styles.selectionLabel}>Vs.</Text>
                <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                  {availableVerses.map(v => (
                    <TouchableOpacity key={`hl-vs-${v.value}`} style={[styles.smallSelectBtn, selectedVerseNum === v.value && styles.selectBtnActive]} onPress={() => setSelectedVerseNum(v.value)}>
                      <Text style={[styles.smallSelectText, selectedVerseNum === v.value && styles.selectTextActive]}>{v.value}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Color picker */}
            <Text style={[styles.label, { marginTop: 15 }]}>Highlight Color</Text>
            <View style={styles.row}>
              {HIGHLIGHT_COLORS.map(hc => (
                <TouchableOpacity key={hc.key}
                  style={[styles.hlColorBtn, { backgroundColor: hc.color },
                  hlColor === hc.key && styles.hlColorActive]}
                  onPress={() => setHlColor(hc.key)}>
                  <Text style={{ fontSize: 11, fontWeight: '700' }}>{hc.emoji} {hc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Optional note */}
            <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Your personal reflection (optional)"
              value={hlNote} onChangeText={setHlNote} placeholderTextColor="#bbb" />

            <TouchableOpacity 
                style={[styles.modalActionBtn, { backgroundColor: colors.primary, marginTop: 15 }]} 
                onPress={async () => {
                    const bookName = availableBooks.find(b => b.value === selectedBookNum)?.label || '';
                    const hlText = availableVerses.find(v => v.value === selectedVerseNum)?.text || '';
                    const newHl = {
                        id: `hl_${Date.now()}`,
                        book: bookName, chapter: selectedChapterNum!, verse: selectedVerseNum!,
                        verseText: hlText, color: hlColor, note: hlNote, language: verseLang,
                    };
                    setHighlights(prev => [...prev, newHl]);
                    setShowHlModal(false);
                }}
                disabled={!selectedVerseNum}
            >
              <Text style={styles.modalActionText}>Add Highlight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ FULLSCREEN EDITOR ══ */}
      <Modal visible={isFullScreen} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Write Note</Text>
                <TouchableOpacity onPress={() => setIsFullScreen(false)}>
                    <Text style={{ fontSize: 16, color: colors.tint, fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
            </View>
            <TextInput
                style={{ flex: 1, padding: 20, fontSize: 16, color: colors.text, backgroundColor: colors.background, textAlignVertical: 'top', lineHeight: 28 }}
                placeholder="Write your notes here…"
                placeholderTextColor={colors.textSecondary}
                value={content}
                onChangeText={setContent}
                multiline
                autoFocus
            />
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────
const getStyles = (colors: ColorsType) => StyleSheet.create({
  header: {
    paddingTop: 45, paddingBottom: 20,
    paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  saveHeaderBtn: { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, elevation: 2 },
  saveBtnText: { color: colors.theme === 'dark' ? colors.tint : '#146C94', fontWeight: '800', fontSize: 14 },
  
  headerToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 15 },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  
  switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.3)', padding: 2 },
  switchActive: { backgroundColor: '#4ADE80' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  switchThumbActive: { alignSelf: 'flex-end' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 15, textTransform: 'uppercase', letterSpacing: 1 },
  
  input: {
    backgroundColor: colors.cardBg, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
  },
  textarea: { minHeight: 180, lineHeight: 24, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, width: 140, height: 45,
    borderRadius: 25, borderWidth: 1.5, marginRight: 8, marginBottom: 5, backgroundColor: colors.cardBg, elevation: 2,
    justifyContent: 'center'
  },
  catChipText: { fontSize: 12, fontWeight: '800' },
  
  iconActionBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 25, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', flex: 1, color: colors.text },
  addSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  addSmallText: { fontSize: 12, fontWeight: '700' },

  hlCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 16, padding: 15, marginBottom: 10, elevation: 1 },
  hlRef: { fontSize: 14, fontWeight: '800', marginBottom: 4, color: colors.text },
  hlText: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  hlNote: { fontSize: 12, color: colors.tint, marginTop: 5, fontWeight: '600' },
  
  recordingBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', borderRadius: 16, padding: 15, marginBottom: 10 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444' },
  recordingText: { color: colors.theme === 'dark' ? '#fca5a5' : '#b91c1c', fontWeight: '800', fontSize: 14 },
  
  voiceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cardBg, borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: colors.border, elevation: 2 },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  voiceLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  voiceDur: { fontSize: 12, color: colors.textSecondary },

  reminderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: colors.border, elevation: 2 },
  rmTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rmTime: { fontSize: 12, color: colors.textSecondary },

  bigSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 30, borderRadius: 20, paddingVertical: 18, elevation: 5, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10 },
  bigSaveBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.cardBg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  
  pickerRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  langChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  langChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langChipText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  langChipTextActive: { color: '#fff' },

  selectionGrid: { flexDirection: 'row', gap: 12, height: 200, marginBottom: 20 },
  selectionItem: { flex: 1 },
  selectionLabel: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, marginBottom: 8, textAlign: 'center' },
  selectorScroll: { backgroundColor: colors.inputBg, borderRadius: 15, borderWidth: 1, borderColor: colors.border },
  selectBtn: { paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  selectBtnActive: { backgroundColor: colors.primary },
  selectText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  selectTextActive: { color: '#fff', fontWeight: '800' },

  smallSelectBtn: { paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  smallSelectText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  modalActionBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', elevation: 3 },
  modalActionText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  
  verseResultBox: { backgroundColor: colors.inputBg, borderRadius: 16, padding: 15, marginTop: 15, borderWidth: 1, borderColor: colors.border },
  verseResultText: { fontSize: 14, color: colors.text, lineHeight: 22, fontStyle: 'italic' },
  useVerseBtn: { fontWeight: '800', marginTop: 10, fontSize: 14, textAlign: 'right' },
  
  hlColorBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  hlColorActive: { borderColor: colors.text },

  timePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.theme === 'dark' ? colors.border : '#e0f2fe', padding: 12, borderRadius: 12, marginTop: 5 },
  modalClose: { marginTop: 15, padding: 10, alignItems: 'center' },
  modalCloseText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  voiceLabelInput: {
    fontSize: 14, fontWeight: '700', color: colors.text, 
    backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4 
  }
});
