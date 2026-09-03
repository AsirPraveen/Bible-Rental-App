import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const BASE_URL = API_BASE_URL;

// ── Time-ago helper ──────────────────────────────────────────────
function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export default function QuestionDetailsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  // Initial state from navigation route, then we update it from server when an answer is added
  const [question, setQuestion] = useState(route.params.question);
  const currentUserId = route.params.currentUserId;
  const [answerText, setAnswerText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const isQuestionMine = question.user?._id && question.user?._id === currentUserId;
  const replyCount = question.answers?.length || 0;

  // ── Avatar Initial ─────────────────────────────────────────────
  const AvatarInitial = ({ name, isMine, size = 'normal' }: { name: string; isMine: boolean; size?: 'normal' | 'large' }) => {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const isLarge = size === 'large';
    return (
      <View style={[
        styles.avatar,
        isMine && styles.avatarMine,
        isLarge && styles.avatarLarge,
      ]}>
        <Text style={[styles.avatarText, isLarge && styles.avatarTextLarge]}>{initial}</Text>
      </View>
    );
  };

  const handlePostAnswer = async () => {
    if (!answerText.trim()) return;

    try {
      setLoading(true);

      const res = await axios.post(`${BASE_URL}/api/forum/questions/${question._id}/answers`, {
        answerText
      });

      if (res.data.status === 'Success') {
        setQuestion(res.data.data); // Update question with new populated answers
        setAnswerText('');
      }
    } catch (error) {
      console.error('Error posting answer', error);
      Alert.alert('Error', 'Failed to post reply.');
    } finally {
      setLoading(false);
    }
  };

  const renderAnswer = ({ item }: { item: any }) => {
    const isMineAnswer = item.user?._id && item.user?._id === currentUserId;
    const authorName = item.user?.name || 'Unknown';
    return (
      <View style={[styles.answerCard, isMineAnswer && styles.myAnswerCard]}>
        <View style={styles.answerHeader}>
          <AvatarInitial name={authorName} isMine={!!isMineAnswer} />
          <View style={styles.answerAuthorInfo}>
            <View style={styles.answerAuthorRow}>
              <Text style={[styles.answerAuthorName, isMineAnswer && styles.myAuthorText]} numberOfLines={1}>
                {authorName}
              </Text>
              {isMineAnswer && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
            <Text style={styles.answerTime}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.answerText}>{item.answerText}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#F6F1F1" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerText}>Discussion</Text>
            <Text style={styles.subtitleText}>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* ── Content ─────────────────────────────────────────── */}
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            data={question.answers || []}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={renderAnswer}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                {/* ── Hero Question Card ──────────────────────── */}
                <View style={[styles.questionCard, isQuestionMine && styles.myQuestionCard]}>
                  {/* Author row */}
                  <View style={styles.qAuthorRow}>
                    <AvatarInitial
                      name={question.isAnonymous ? '?' : (question.user?.name || 'U')}
                      isMine={!!isQuestionMine}
                      size="large"
                    />
                    <View style={styles.qAuthorInfo}>
                      <View style={styles.qAuthorNameRow}>
                        <Text style={[styles.qAuthorName, isQuestionMine && styles.myAuthorText]} numberOfLines={1}>
                          {question.isAnonymous ? 'Anonymous' : (question.user?.name || 'Unknown')}
                        </Text>
                        {isQuestionMine && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.qTime}>{timeAgo(question.createdAt)}</Text>
                    </View>
                  </View>

                  {/* Question text */}
                  <Text style={styles.qText}>{question.questionText}</Text>

                  {/* Question footer */}
                  <View style={styles.qFooter}>
                    <View style={styles.replyChip}>
                      <MessageCircle size={14} color={colors.tint} />
                      <Text style={styles.replyChipText}>
                        {replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* ── Section divider ─────────────────────────── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>COMMUNITY REPLIES ({replyCount})</Text>
                  <View style={styles.sectionDivider} />
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MessageCircle color={colors.textSecondary} size={48} />
                <Text style={styles.emptyTitle}>No Replies Yet</Text>
                <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
              </View>
            }
          />

          {/* ── Input area ────────────────────────────────────── */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Write a reply..."
              placeholderTextColor={colors.textSecondary}
              value={answerText}
              onChangeText={setAnswerText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !answerText.trim() && styles.sendBtnDisabled]} 
              onPress={handlePostAnswer}
              disabled={!answerText.trim() || loading}
              activeOpacity={0.7}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={18} />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: { flex: 1 },

  // ── Header ─────────────────────────────────────────────────────
  headerContainer: {
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
  },
  headerTextWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: '#F6F1F1',
    textAlign: 'center',
    opacity: 0.85,
  },

  // ── Main container ─────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },

  // ── Avatar ─────────────────────────────────────────────────────
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMine: {
    backgroundColor: colors.tint,
  },
  avatarLarge: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  avatarTextLarge: {
    fontSize: 19,
  },

  // ── "You" badge ────────────────────────────────────────────────
  youBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Reply chip ─────────────────────────────────────────────────
  replyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(20, 108, 148, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  replyChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tint,
  },

  // ── Hero Question Card ─────────────────────────────────────────
  questionCard: { 
    backgroundColor: colors.cardBg, 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 8, 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: colors.tint,
  },
  myQuestionCard: { 
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#F0F8FA', 
    borderLeftColor: colors.secondary, 
    elevation: 5,
  },
  qAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  qAuthorInfo: {
    flex: 1,
  },
  qAuthorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qAuthorName: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
  },
  myAuthorText: {
    color: colors.tint,
  },
  qTime: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  qText: {
    fontSize: 18,
    color: colors.text,
    lineHeight: 27,
    fontWeight: '500',
    marginBottom: 16,
  },
  qFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  
  // ── Section header ─────────────────────────────────────────────
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  
  // ── Answer cards ───────────────────────────────────────────────
  answerCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  myAnswerCard: {
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#F0F8FA',
    borderLeftColor: colors.secondary,
    elevation: 2,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  answerAuthorInfo: {
    flex: 1,
  },
  answerAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  answerAuthorName: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.text,
  },
  answerTime: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  answerText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    paddingLeft: 46, // aligned with text after avatar
  },
  
  // ── Empty state ────────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 14,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  
  // ── Input area ─────────────────────────────────────────────────
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
    gap: 10,
    // subtle top shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 45,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    backgroundColor: colors.secondary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.theme === 'dark' ? colors.border : '#B0C4CE',
    opacity: 0.6,
  },
});
