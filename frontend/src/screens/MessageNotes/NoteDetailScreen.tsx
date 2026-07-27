// ════════════════════════════════════════════════
//  NoteDetailScreen.tsx  —  Enhanced Detail (v3)
//  - Rich Text Rendering
//  - Verse Highlight List  (tap to view full verse)
//  - Voice Note Playback
//  - Reminder Management
//  - Share / Export functionality
// ════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share, Platform, ActivityIndicator, Linking, Modal, StatusBar,
  Pressable
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import {
  getNoteById, deleteNote, addReminder, deleteReminder,
  generateTitle, exportNoteAsText
} from './services/MessageNoteService';
import { MessageNote, VoiceNote, VerseHighlight } from './types/MessageNote';
import { CATEGORY_META } from './components/MessageNoteCard';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import LoadingScreen from '../../components/LoadingScreen';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

export default function NoteDetailScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { noteId } = route.params;

  const [note, setNote] = useState<MessageNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const { isGuest, user } = useAuth();
  const [selectedHighlight, setSelectedHighlight] = useState<VerseHighlight | null>(null);

  // ── Cloudinary cleanup helper ─────────────────
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

  const isOwner = user && note && (
    note.authorEmail === user.email ||
    (note as any).user === user._id ||
    (note as any).user?._id === user._id
  );

  useEffect(() => {
    loadNote();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [noteId]);

  const loadNote = async () => {
    try {
      const data = await getNoteById(noteId);
      if (data) setNote(data);
      else {
        Alert.alert('Error', 'Note not found');
        navigation.goBack();
      }
    } catch {
      Alert.alert('Error', 'Failed to load note');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!note) return;
    try {
      const title = generateTitle(note.category, note.date);
      const dateStr = new Date(note.date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      let message = `══════════════════════════════\n`;
      message += `📖 *${title}*\n`;
      message += `📅 ${dateStr}\n`;
      if (note.verse) message += `📌 *Reference:* ${note.verse}\n`;
      if (note.isPublic) message += `🌍 _Shared publicly_\n`;
      message += `══════════════════════════════\n\n`;

      // Content
      message += `✍️ *Notes:*\n${note.content.replace(/\*\*/g, '*').replace(/==/g, '')}\n`;

      // Highlights
      if (note.highlights && note.highlights.length > 0) {
        message += `\n─── ✨ *Linked Verses* ───\n`;
        for (const h of note.highlights) {
          const emoji = h.color === 'yellow' ? '⭐' : h.color === 'blue' ? '💙' : '🔴';
          const label = h.color === 'yellow' ? 'Important' : h.color === 'blue' ? 'Promise' : 'Warning';
          message += `${emoji} *${h.book} ${h.chapter}:${h.verse}* (${label})\n`;
          if (h.verseText) message += `  _"${h.verseText}"_\n`;
          if (h.note) message += `  ✍️ ${h.note}\n`;
        }
      }

      // Voice Recordings
      if (note.voiceNotes && note.voiceNotes.length > 0) {
        message += `\n─── 🎙️ *Voice Recordings* ───\n`;
        for (const vn of note.voiceNotes) {
          const dur = Math.round(vn.durationMs / 1000);
          message += `🎧 ${vn.label || 'Recording'} (${dur}s)\n`;
          message += `  🔗 ${vn.uri}\n`;
        }
      }

      message += `\n──────────────────────────────\n_✨ Shared via Bible Rental App_`;
      await Share.share({ title, message });
    } catch (error) {
      Alert.alert('Error', 'Could not share note');
    }
  };

  const handleExport = async () => {
    if (!note) return;
    try {
      await exportNoteAsText(note);
    } catch (error) {
      Alert.alert('Export Failed', 'An error occurred while saving the text file.');
    }
  };

  const handleDelete = () => {
    if (isGuest) return;
    Alert.alert(
      'Delete Note',
      'This will permanently remove this note and all attachments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete voice notes from Cloudinary first
              if (note?.voiceNotes?.length) {
                for (const vn of note.voiceNotes) {
                  if ((vn as any).publicId) {
                    await deleteVoiceNoteFromCloudinary((vn as any).publicId);
                  }
                }
              }
              await deleteNote((note as any)._id || noteId);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Could not delete note');
            }
          }
        }
      ]
    );
  };

  const playVoice = async (voice: VoiceNote) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        if (playingId === voice.id) {
          setPlayingId(null);
          return;
        }
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: voice.uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(voice.id);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) setPlayingId(null);
      });
    } catch {
      Alert.alert('Error', 'Playback failed');
    }
  };

  const scheduleQuick = async (hours: number) => {
    if (!note) return;
    const trigger = new Date(Date.now() + hours * 60 * 60 * 1000);
    try {
      await addReminder((note as any)._id || noteId, {
        title: note.category || 'Reminder',
        scheduledTime: trigger.toISOString(),
        repeating: false
      });
      Alert.alert('Success', `Reminder set for ${hours} hour${hours > 1 ? 's' : ''} from now.`);
    } catch {
      Alert.alert('Error', 'Could not set reminder.');
    }
  };

  const handleRemind = () => {
    Alert.alert(
      'Set Reminder',
      'Choose a quick reminder:',
      [
        { text: 'In 1 Hour', onPress: () => scheduleQuick(1) },
        { text: 'In 24 Hours', onPress: () => scheduleQuick(24) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleEmail = async () => {
    if (!note) return;
    const title = generateTitle(note.category, note.date);
    const dateStr = new Date(note.date).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    let message = `📖 ${title}\n`;
    message += `📅 ${dateStr}\n`;
    if (note.verse) message += `📌 Reference: ${note.verse}\n`;
    message += `\n--- Notes ---\n${note.content.replace(/\*\*/g, '').replace(/==/g, '')}\n`;

    // Highlights
    if (note.highlights && note.highlights.length > 0) {
      message += `\n--- Linked Verses ---\n`;
      for (const h of note.highlights) {
        const emoji = h.color === 'yellow' ? '⭐' : h.color === 'blue' ? '💙' : '🔴';
        const label = h.color === 'yellow' ? 'Important' : h.color === 'blue' ? 'Promise' : 'Warning';
        message += `${emoji} ${h.book} ${h.chapter}:${h.verse} (${label})\n`;
        if (h.verseText) message += `  "${h.verseText}"\n`;
        if (h.note) message += `  Note: ${h.note}\n`;
      }
    }

    // Voice Recordings
    if (note.voiceNotes && note.voiceNotes.length > 0) {
      message += `\n--- Voice Recordings ---\n`;
      for (const vn of note.voiceNotes) {
        const dur = Math.round(vn.durationMs / 1000);
        message += `🎙️ ${vn.label || 'Recording'} (${dur}s): ${vn.uri}\n`;
      }
    }

    message += `\n---\nShared via Bible Rental App`;
    const url = `mailto:?subject=${encodeURIComponent('Bible Note: ' + title)}&body=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open email app'));
  };

  if (loading) {
    return <LoadingScreen message="Loading note..." />;
  }

  if (!note) return null;

  const meta = CATEGORY_META[note.category];
  const displayTitle = generateTitle(note.category, note.date);
  const metaColor = colors.theme === 'dark' ? colors.tint : (meta?.color || colors.primary);
  const metaBg = colors.theme === 'dark' ? colors.inputBg : (meta?.bg || '#F6F1F1');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
            <Text style={styles.headerSubtitle}>
              {new Date(note.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Action Bar */}
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
            <LinearGradient colors={['#4ADE80', '#22C55E']} style={styles.actionIcon}>
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={handleExport}>
            <LinearGradient colors={['#94a3b8', '#64748b']} style={styles.actionIcon}>
              <Ionicons name="document-text" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Txt Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={handleEmail}>
            <LinearGradient colors={['#FCA5A5', '#EF4444']} style={styles.actionIcon}>
              <Ionicons name="mail" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Email</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity style={styles.actionItem} onPress={handleRemind}>
              <LinearGradient colors={['#BAE6FD', '#0EA5E9']} style={styles.actionIcon}>
                <Ionicons name="notifications" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Remind</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content Card */}
        <View style={styles.mainCard}>
          <View style={[styles.statusRow, { borderBottomColor: metaColor + '20' }]}>
            <View style={[styles.badge, { backgroundColor: metaBg }]}>
              <Ionicons name={meta.icon} size={12} color={metaColor} />
              <Text style={[styles.badgeText, { color: metaColor }]}>{note.category}</Text>
            </View>
            {note.isPublic && (
              <View style={[styles.badge, { backgroundColor: colors.theme === 'dark' ? 'rgba(46, 125, 50, 0.2)' : '#E8F5E9' }]}>
                <Ionicons name="earth" size={12} color={colors.theme === 'dark' ? '#4ADE80' : '#2E7D32'} />
                <Text style={[styles.badgeText, { color: colors.theme === 'dark' ? '#4ADE80' : '#2E7D32' }]}>Public</Text>
              </View>
            )}
          </View>

          {note.verse && (
            <View style={[styles.verseBox, { borderLeftColor: metaColor }]}>
              <Text style={[styles.verseRef, { color: metaColor }]}>{note.verse}</Text>
              <Ionicons name="bookmark" size={16} color={metaColor} />
            </View>
          )}

          <Text style={styles.content}>{note.content}</Text>
        </View>

        {/* Verse Highlights */}
        {note.highlights && note.highlights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Linked Verses</Text>
            {note.highlights.map((hl, index) => (
              <TouchableOpacity
                key={(hl as any)._id || hl.id || index}
                style={[styles.hlCard, { borderLeftColor: getHlColor(hl.color) }]}
                onPress={() => setSelectedHighlight(hl)}
                activeOpacity={0.75}
              >
                <View style={styles.hlCardHeader}>
                  <Text style={styles.hlRef}>{hl.book} {hl.chapter}:{hl.verse}</Text>
                  <View style={[styles.hlColorPill, { backgroundColor: getHlColor(hl.color) }]}>
                    <Text style={styles.hlColorPillText}>{getHlLabel(hl.color)}</Text>
                  </View>
                </View>
                <Text style={styles.hlText} numberOfLines={2}>{hl.verseText}</Text>
                {hl.note ? <Text style={styles.hlUserNote}>{hl.note}</Text> : null}
                <Text style={styles.hlTapHint}>Tap to read full verse →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Voice Recordings */}
        {note.voiceNotes && note.voiceNotes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Voice Memos</Text>
            {note.voiceNotes.map((vn, index) => (
              <View key={(vn as any)._id || vn.id || index} style={styles.voiceCard}>
                <TouchableOpacity
                  onPress={() => playVoice(vn)}
                  style={[styles.playBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name={playingId === vn.id ? 'pause' : 'play'} size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.voiceLabel}>{vn.label || 'Voice recording'}</Text>
                  <Text style={styles.voiceDur}>{Math.round(vn.durationMs / 1000)} seconds</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Reminders - Only visible to note owner */}
        {isOwner && note.reminders && note.reminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Scheduled Reminders</Text>
            {note.reminders.map((rm, index) => (
              <View key={rm.id || index} style={styles.reminderCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rmTitle}>{rm.title}</Text>
                  {rm.message ? <Text style={styles.rmMessage}>{rm.message}</Text> : null}
                  <Text style={styles.rmTime}>
                    {new Date(rm.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {rm.repeating ? ' (Daily)' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => {
                  Alert.alert('Delete Reminder', `Delete "${rm.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteReminder(noteId, rm.id).then(loadNote) }
                  ]);
                }}>
                  <Ionicons name="trash-outline" size={18} color="#FF5252" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {isOwner && (
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: colors.primary, borderWidth: 0, marginBottom: 12 }]}
              onPress={() => navigation.navigate('NoteForm', { note })}
            >
              <Ionicons name="create" size={18} color="#fff" />
              <Text style={[styles.deleteBtnText, { color: '#fff' }]}>Update Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash" size={18} color="#FF5252" />
              <Text style={styles.deleteBtnText}>Delete Note</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Full Verse Modal ── */}
      <Modal
        visible={!!selectedHighlight}
        transparent
        statusBarTranslucent={true}
        animationType="fade"
        onRequestClose={() => setSelectedHighlight(null)}
      >
        <Pressable style={styles.verseModalOverlay} onPress={() => setSelectedHighlight(null)}>
          <Pressable style={styles.verseModalBox} onPress={(e) => e.stopPropagation()}>
            {selectedHighlight && (
              <>
                {/* Accent header */}
                <View style={[styles.verseModalHeader, { backgroundColor: getHlColor(selectedHighlight.color) }]}>
                  <View>
                    <Text style={styles.verseModalRef}>
                      {selectedHighlight.book} {selectedHighlight.chapter}:{selectedHighlight.verse}
                    </Text>
                    <Text style={styles.verseModalLang}>{selectedHighlight.language}</Text>
                  </View>
                  <View style={styles.verseColorBadge}>
                    <Text style={styles.verseColorBadgeText}>{getHlLabel(selectedHighlight.color)}</Text>
                  </View>
                </View>

                {/* Full verse text */}
                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                  <Text style={styles.verseModalText}>
                    {selectedHighlight.verseText || 'Verse text not available.'}
                  </Text>
                  {selectedHighlight.note ? (
                    <View style={styles.verseNoteBox}>
                      <Text style={styles.verseNoteLabel}>✍️  My Note</Text>
                      <Text style={styles.verseNoteText}>{selectedHighlight.note}</Text>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Close button */}
                <TouchableOpacity
                  style={styles.verseModalCloseBtn}
                  onPress={() => setSelectedHighlight(null)}
                >
                  <Text style={styles.verseModalCloseTxt}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────
const getHlColor = (key: string) => {
  switch (key) {
    case 'blue': return '#BBDEFB';
    case 'red': return '#FFCDD2';
    default: return '#FFF176';
  }
};

const getHlLabel = (key: string) => {
  switch (key) {
    case 'blue': return 'Promise';
    case 'red': return 'Warning';
    default: return 'Important';
  }
};

// ─── Styles ───────────────────────────────────────────────
const getStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  header: {
    paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  editBtn: { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  actionItem: { alignItems: 'center', gap: 6 },
  actionIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  actionLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },

  mainCard: { backgroundColor: colors.cardBg, borderRadius: 20, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, marginBottom: 25 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 15 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },

  verseBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.inputBg, padding: 12, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4 },
  verseRef: { fontSize: 14, fontWeight: '800', color: colors.text },

  content: { fontSize: 16, color: colors.text, lineHeight: 28, fontWeight: '500' },

  section: { marginBottom: 25 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  // Highlight cards
  hlCard: { backgroundColor: colors.cardBg, padding: 15, borderRadius: 16, borderLeftWidth: 5, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  hlCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  hlRef: { fontSize: 13, fontWeight: '800', color: colors.text },
  hlColorPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  hlColorPillText: { fontSize: 9, fontWeight: '800', color: '#1e293b' },
  hlText: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  hlUserNote: { fontSize: 13, marginTop: 8, color: colors.tint, fontWeight: '700' },
  hlTapHint: { fontSize: 11, color: colors.textSecondary, marginTop: 6, fontWeight: '600' },

  voiceCard: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: colors.cardBg, padding: 15, borderRadius: 16, marginBottom: 10, elevation: 2 },
  playBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  voiceLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  voiceDur: { fontSize: 12, color: colors.textSecondary },

  reminderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, padding: 15, borderRadius: 16, marginBottom: 10, elevation: 2 },
  rmTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rmMessage: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  rmTime: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 12, borderWidth: 1.5, borderColor: '#FF5252', backgroundColor: colors.theme === 'dark' ? colors.cardBg : '#fff' },
  deleteBtnText: { color: '#FF5252', fontWeight: '800', fontSize: 15 },

  // Full Verse Modal
  verseModalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.75)', justifyContent: 'flex-end' },
  verseModalBox: { backgroundColor: colors.cardBg, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', paddingBottom: 30 },
  verseModalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verseModalRef: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  verseModalLang: { fontSize: 12, color: '#475569', fontWeight: '600', marginTop: 2 },
  verseColorBadge: { backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  verseColorBadgeText: { fontSize: 11, fontWeight: '800', color: '#1E293B' },
  verseModalText: { fontSize: 18, color: colors.text, lineHeight: 30, fontStyle: 'italic', fontWeight: '500' },
  verseNoteBox: { marginTop: 20, backgroundColor: colors.inputBg, padding: 15, borderRadius: 14, borderLeftWidth: 4, borderLeftColor: colors.primary },
  verseNoteLabel: { fontSize: 12, fontWeight: '800', color: colors.tint, marginBottom: 6 },
  verseNoteText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  verseModalCloseBtn: { marginHorizontal: 20, marginTop: 10, backgroundColor: colors.primary, padding: 15, borderRadius: 14, alignItems: 'center' },
  verseModalCloseTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});