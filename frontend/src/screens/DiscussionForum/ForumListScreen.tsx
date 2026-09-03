import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Switch, Platform, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Users, PlusCircle, Search, Clock, TrendingUp, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { Alert } from 'react-native';
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

type SortMode = 'newest' | 'mostReplies';

export default function ForumListScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { isGuest } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [visibility, setVisibility] = useState<'org' | 'public'>('org');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const navigation = useNavigation<any>();

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/forum/questions`);
      if (res.data.status === 'Success') {
        setQuestions(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching questions', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserId = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const res = await axios.post(`${BASE_URL}/api/auth/userdata`, { token });
        if (res.data.status === 'Ok' && res.data.data) {
          setCurrentUserId(res.data.data._id);
        }
      }
    } catch (error) {
      console.error('Error fetching user data for forum', error);
    }
  };

  useEffect(() => {
    fetchUserId();
    fetchQuestions();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/forum/questions`);
      if (res.data.status === 'Success') {
        setQuestions(res.data.data);
      }
    } catch (error) {
      console.error('Error refreshing questions', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Filtered + sorted questions
  const displayedQuestions = useMemo(() => {
    let filtered = questions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.questionText?.toLowerCase().includes(q) ||
        item.user?.name?.toLowerCase().includes(q)
      );
    }
    if (sortMode === 'mostReplies') {
      return [...filtered].sort((a, b) => (b.answers?.length || 0) - (a.answers?.length || 0));
    }
    return filtered;
  }, [questions, searchQuery, sortMode]);

  const handleAskQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      setSubmitLoading(true);

      const res = await axios.post(`${BASE_URL}/api/forum/questions`, {
        questionText: newQuestion,
        isAnonymous,
        visibility
      });

      if (res.data.status === 'Success') {
        setNewQuestion('');
        setIsAnonymous(false);
        setVisibility('org');
        setModalVisible(false);
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error asking question', error);
      Alert.alert('Error', 'Failed to post question.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Avatar Initial ─────────────────────────────────────────────
  const AvatarInitial = ({ name, isMine }: { name: string; isMine: boolean }) => {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    return (
      <View style={[styles.avatar, isMine && styles.avatarMine]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMine = item.user?._id && item.user?._id === currentUserId;
    const authorName = item.user?.name || 'Unknown';
    const replyCount = item.answers?.length || 0;
    const isAnon = item.isAnonymous;

    return (
      <TouchableOpacity
        style={[styles.card, isMine && styles.myCard]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('QuestionDetails', { question: item, currentUserId })}
      >
        {/* Card accent bar is handled via borderLeftWidth in styles */}
        <View style={styles.cardContent}>
          {/* Top row: avatar + author + time */}
          <View style={styles.cardHeader}>
            <AvatarInitial name={isAnon ? '?' : authorName} isMine={!!isMine} />
            <View style={styles.authorInfo}>
              <View style={styles.authorRow}>
                <Text style={[styles.authorName, isMine && styles.myAuthorName]} numberOfLines={1}>
                  {isAnon ? 'Anonymous' : authorName}
                </Text>
                {isMine && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>You</Text>
                  </View>
                )}
              </View>
              <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>

          {/* Question text */}
          <Text style={styles.questionText} numberOfLines={3}>{item.questionText}</Text>

          {/* Footer: reply chip */}
          <View style={styles.cardFooter}>
            <View style={styles.replyChip}>
              <MessageCircle size={14} color={colors.tint} />
              <Text style={styles.replyChipText}>
                {replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}
              </Text>
            </View>
            {isAnon && !isMine && (
              <View style={styles.anonBadge}>
                <Text style={styles.anonBadgeText}>Anonymous</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Sort Pill ──────────────────────────────────────────────────
  const SortPill = ({ mode, label, icon }: { mode: SortMode; label: string; icon: React.ReactNode }) => {
    const isActive = sortMode === mode;
    return (
      <TouchableOpacity
        style={[styles.sortPill, isActive && styles.sortPillActive]}
        activeOpacity={0.7}
        onPress={() => setSortMode(mode)}
      >
        {icon}
        <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {/* ── Gradient Header ────────────────────────────────── */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <Text style={styles.headerText}>Discussion Forum</Text>
            <TouchableOpacity
              style={styles.headerIconBtn}
              activeOpacity={0.7}
              onPress={() => {
                if (isGuest) {
                  Alert.alert('Login Required', 'Please login to post a question.', [{ text: 'OK' }]);
                  return;
                }
                setModalVisible(true);
              }}
            >
              <PlusCircle color="#F6F1F1" size={28} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitleText}>Ask questions and share knowledge</Text>
        </View>

        {/* ── Main Content ───────────────────────────────────── */}
        <View style={styles.container}>
          {loading ? (
            <LoadingScreen variant="transparent" message="Loading discussions..." />
          ) : (
            <>
              {/* Search bar */}
              <View style={styles.searchContainer}>
                <Search size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search discussions..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Sort pills */}
              <View style={styles.sortRow}>
                <SortPill
                  mode="newest"
                  label="Newest"
                  icon={<Clock size={14} color={sortMode === 'newest' ? '#fff' : colors.textSecondary} />}
                />
                <SortPill
                  mode="mostReplies"
                  label="Most Replies"
                  icon={<TrendingUp size={14} color={sortMode === 'mostReplies' ? '#fff' : colors.textSecondary} />}
                />
                {searchQuery.trim().length > 0 && (
                  <Text style={styles.resultCount}>
                    {displayedQuestions.length} result{displayedQuestions.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>

              {/* Questions list */}
              <FlatList
                data={displayedQuestions}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.tint}
                    colors={[colors.secondary]}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MessageCircle color={colors.secondary} size={80} />
                    <Text style={styles.emptyStateText}>
                      {searchQuery.trim() ? 'No Matches Found' : 'No Discussions Yet'}
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      {searchQuery.trim()
                        ? 'Try a different search term'
                        : 'Be the first to ask a question!'}
                    </Text>
                  </View>
                }
              />
            </>
          )}
        </View>

        {/* ── Ask Question Modal ─────────────────────────────── */}
        <Modal visible={modalVisible} animationType="fade" transparent={true} statusBarTranslucent={true} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ask the Community</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Ask, and it shall be given you; seek, and ye shall find. Type your question here..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                value={newQuestion}
                onChangeText={setNewQuestion}
              />

              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Ask Anonymously</Text>
                <Switch
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={isAnonymous ? colors.tint : colors.textSecondary}
                />
              </View>

              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Make Question Public</Text>
                <Switch
                  value={visibility === 'public'}
                  onValueChange={(val) => setVisibility(val ? 'public' : 'org')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={visibility === 'public' ? colors.tint : colors.textSecondary}
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, !newQuestion.trim() && styles.disabledBtn]}
                  onPress={handleAskQuestion}
                  disabled={!newQuestion.trim() || submitLoading}
                >
                  {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Post Question</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  gradient: {
    flex: 1,
  },

  // ── Header ─────────────────────────────────────────────────────
  headerContainer: {
    padding: 20,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIconBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 12,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
  },
  subtitleText: {
    fontSize: 16,
    color: '#F6F1F1',
    opacity: 0.9,
  },

  // ── Main container ─────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // ── Search bar ─────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: 44,
    paddingVertical: 0,
  },

  // ── Sort pills ─────────────────────────────────────────────────
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 8,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  sortPillActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  sortPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortPillTextActive: {
    color: '#fff',
  },
  resultCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 'auto',
    fontStyle: 'italic',
  },

  // ── Question cards ─────────────────────────────────────────────
  list: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.tint,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  myCard: {
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#F0F8FA',
    borderLeftColor: colors.secondary,
    elevation: 3,
    shadowColor: colors.secondary,
    shadowOpacity: 0.12,
  },
  cardContent: {
    padding: 16,
  },

  // ── Card header (avatar + author + time) ───────────────────────
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMine: {
    backgroundColor: colors.tint,
  },
  avatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  authorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  myAuthorName: {
    color: colors.tint,
  },
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
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Question text ──────────────────────────────────────────────
  questionText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 23,
    marginBottom: 14,
  },

  // ── Card footer ────────────────────────────────────────────────
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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
  anonBadge: {
    backgroundColor: colors.theme === 'dark' ? colors.border : '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  anonBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // ── Empty state ────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },

  // ── Modal styles ───────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.cardBg,
    padding: 22,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    fontSize: 16,
    backgroundColor: colors.inputBg,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  submitBtn: {
    flex: 1,
    padding: 13,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  disabledBtn: {
    backgroundColor: colors.theme === 'dark' ? colors.border : '#B0C4CE',
    opacity: 0.7,
  },
});
