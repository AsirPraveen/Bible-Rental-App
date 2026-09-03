import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StatusBar, Keyboard, PanResponder, Animated, Modal, Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Send, Info, Megaphone, ChevronDown, Plus, BarChart2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useOrg } from '../../context/OrganizationContext';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import Lottie from 'lottie-react-native';
import LoadingScreen from '../../components/LoadingScreen';
import { API_BASE_URL } from '../../config/api';

const API_URL = API_BASE_URL;

type MessageType = {
  _id: string;
  text: string;
  type: 'text' | 'system' | 'poll' | 'qna';
  sender: { _id: string; name: string; email?: string; image?: string } | null;
  senderName: string;
  createdAt: string;
  readBy: string[];
  status?: 'sending' | 'sent' | 'error';
  replyTo?: {
    messageId: string;
    senderName: string;
    text: string;
  };
  reactions?: {
    emoji: string;
    user: any;
    username: string;
  }[];
  pollData?: {
    question: string;
    options: {
      optionText: string;
      votes: any[];
    }[];
    allowMultiple: boolean;
  };
  qnaData?: {
    question: string;
    isAnswerVisibleToAll: boolean;
    isOneTimeAnswerable: boolean;
    answers: {
      user: any;
      username: string;
      answerText: string;
      submittedAt: string;
    }[];
  };
};

const SwipeableMessageBubble = ({ children, onSwipeTriggered, isMe }: { children: React.ReactNode, onSwipeTriggered: () => void, isMe: boolean }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isDraggingCorrectly = isMe ? gestureState.dx < 0 : gestureState.dx > 0;
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 8 && isDraggingCorrectly;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isMe) {
          if (gestureState.dx < 0) {
            translateX.setValue(Math.max(gestureState.dx, -70));
          } else {
            translateX.setValue(0);
          }
        } else {
          if (gestureState.dx > 0) {
            translateX.setValue(Math.min(gestureState.dx, 70));
          } else {
            translateX.setValue(0);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipedCorrectly = isMe
          ? gestureState.dx < -40
          : gestureState.dx > 40;

        if (swipedCorrectly) {
          onSwipeTriggered();
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 6
        }).start();
      }
    })
  ).current;

  return (
    <Animated.View
      style={{ transform: [{ translateX }] }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
};



const getUserStringId = (u: any) => {
  if (!u) return '';
  if (typeof u === 'string') return u;
  if (u._id) return u._id.toString();
  if (u.id) return u.id.toString();
  return u.toString();
};

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { socket } = useSocket();

  const { fellowshipId, fellowshipName, fellowshipType, fellowshipIcon } = route.params || {};

  const { orgRole } = useOrg();
  const isAdmin = orgRole === 'Admin';

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const [isAnnouncement, setIsAnnouncement] = useState(fellowshipType === 'announcement');
  const [isShepherd, setIsShepherd] = useState(isAdmin);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);
  const isQnaInputFocused = useRef(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 150) {
      setShowScrollBottomBtn(true);
    } else {
      setShowScrollBottomBtn(false);
    }
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const [replyToMessage, setReplyToMessage] = useState<MessageType | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [reactMenuMessageId, setReactMenuMessageId] = useState<string | null>(null);
  const replyAnimY = useRef(new Animated.Value(80)).current;

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Polls & Q&As states
  const [showCreationMenu, setShowCreationMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  const [showQnaModal, setShowQnaModal] = useState(false);
  const [qnaQuestion, setQnaQuestion] = useState('');
  const [qnaVisibleToAll, setQnaVisibleToAll] = useState(true);
  const [qnaOneTime, setQnaOneTime] = useState(false);

  const [showQnaAnswersModal, setShowQnaAnswersModal] = useState(false);
  const [selectedQnaMessageId, setSelectedQnaMessageId] = useState<string | null>(null);
  const [qnaAnswersList, setQnaAnswersList] = useState<any[]>([]);
  const [qnaAnswersLoading, setQnaAnswersLoading] = useState(false);

  const [qnaAnswerTextMap, setQnaAnswerTextMap] = useState<{ [messageId: string]: string }>({});

  useEffect(() => {
    if (replyToMessage) {
      replyAnimY.setValue(80);
      Animated.timing(replyAnimY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [replyToMessage]);

  const closeReplyPreview = () => {
    Animated.timing(replyAnimY, {
      toValue: 80,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setReplyToMessage(null);
      }
    });
  };

  const handleQuotePress = (messageId: string) => {
    const index = messages.findIndex(m => m._id === messageId);
    if (index !== -1) {
      try {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        setHighlightedMessageId(messageId);
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 1000);
      } catch (err) {
        console.log('Scroll failed fallback:', err);
      }
    }
  };

  const handleEmojiReact = (emoji: string) => {
    if (!reactMenuMessageId || !socket) return;
    socket.emit('react_message', {
      fellowshipId,
      messageId: reactMenuMessageId,
      emoji
    });
    setReactMenuMessageId(null);
  };

  const handleCreatePoll = () => {
    if (!pollQuestion.trim()) {
      Alert.alert('Validation Error', 'Please enter a poll question.');
      return;
    }
    const filteredOptions = pollOptions.map(o => o.trim()).filter(o => o.length > 0);
    if (filteredOptions.length < 2) {
      Alert.alert('Validation Error', 'Please provide at least 2 options.');
      return;
    }

    if (!socket) return;
    socket.emit('send_message', {
      fellowshipId,
      text: pollQuestion.trim(),
      type: 'poll',
      pollData: {
        question: pollQuestion.trim(),
        options: filteredOptions.map(o => ({ optionText: o, votes: [] })),
        allowMultiple: pollAllowMultiple
      }
    });

    setPollQuestion('');
    setPollOptions(['', '']);
    setPollAllowMultiple(false);
    setShowPollModal(false);
  };

  const handleCreateQna = () => {
    if (!qnaQuestion.trim()) {
      Alert.alert('Validation Error', 'Please enter a question.');
      return;
    }

    if (!socket) return;
    socket.emit('send_message', {
      fellowshipId,
      text: qnaQuestion.trim(),
      type: 'qna',
      qnaData: {
        question: qnaQuestion.trim(),
        isAnswerVisibleToAll: qnaVisibleToAll,
        isOneTimeAnswerable: qnaOneTime,
        answers: []
      }
    });

    setQnaQuestion('');
    setQnaVisibleToAll(true);
    setQnaOneTime(false);
    setShowQnaModal(false);
  };

  const handleVotePoll = (messageId: string, optionIndex: number) => {
    if (!socket) return;
    socket.emit('vote_poll', {
      fellowshipId,
      messageId,
      optionIndex
    });
  };

  const handleQnaAnswerSubmit = (messageId: string) => {
    const answerText = qnaAnswerTextMap[messageId];
    if (!answerText || !answerText.trim()) {
      Alert.alert('Validation Error', 'Please type your answer before submitting.');
      return;
    }

    if (!socket) return;
    socket.emit('submit_qna_answer', {
      fellowshipId,
      messageId,
      answerText: answerText.trim()
    });

    setQnaAnswerTextMap(prev => ({ ...prev, [messageId]: '' }));
  };

  const loadQnaAnswers = async (messageId: string) => {
    try {
      setQnaAnswersLoading(true);
      setSelectedQnaMessageId(messageId);
      setShowQnaAnswersModal(true);

      const res = await axios.get(`${API_URL}/api/fellowships/${fellowshipId}/messages/${messageId}/answers`);
      if (res.data.status === 'Ok') {
        setQnaAnswersList(res.data.data || []);
      } else {
        Alert.alert('Error', 'Failed to fetch answers.');
      }
    } catch (err) {
      console.error('Error loading Q&A answers:', err);
      Alert.alert('Error', 'Could not load answers.');
    } finally {
      setQnaAnswersLoading(false);
    }
  };

  const groupReactions = (reactionsList: any[]) => {
    const groups: { [emoji: string]: { emoji: string; count: number; users: { id: string; username: string }[] } } = {};
    reactionsList.forEach(r => {
      const userRef = getUserStringId(r.user);
      if (!groups[r.emoji]) {
        groups[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      }
      groups[r.emoji].count += 1;
      groups[r.emoji].users.push({ id: userRef, username: r.username || '' });
    });
    return Object.values(groups);
  };

  const fetchMessages = useCallback(async (pageNum: number, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await axios.get(`${API_URL}/api/fellowships/${fellowshipId}/messages`, {
        params: { page: pageNum, limit: 50 }
      });

      if (res.data.status === 'Ok') {
        const fetched = res.data.data;
        const currentUserId = getUserStringId(user);
        const reversedList = [...fetched].reverse();

        // Find oldest unread index (highest index in reversed array)
        let unreadIdx = -1;
        if (pageNum === 1 && !append && currentUserId) {
          for (let i = reversedList.length - 1; i >= 0; i--) {
            const msg = reversedList[i];
            const isUnread = !msg.readBy?.includes(currentUserId) && getUserStringId(msg.sender) !== currentUserId;
            if (isUnread) {
              unreadIdx = i;
              break;
            }
          }
        }

        if (append) {
          setMessages(prev => [...prev, ...reversedList]);
        } else {
          setMessages(reversedList);
        }
        setHasMore(res.data.pagination.hasMore);

        if (unreadIdx !== -1) {
          setTimeout(() => {
            try {
              flatListRef.current?.scrollToIndex({
                index: unreadIdx,
                animated: false,
                viewPosition: 0.5
              });
            } catch (err) {
              console.log('Scroll to unread message index failed, using offset fallback:', err);
              flatListRef.current?.scrollToOffset({
                offset: unreadIdx * 75,
                animated: false
              });
            }
            if (socket) {
              socket.emit('mark_read', { fellowshipId });
            }
          }, 400);
        } else {
          if (socket) {
            socket.emit('mark_read', { fellowshipId });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fellowshipId, user]);

  useFocusEffect(
    useCallback(() => {
      const checkRole = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/fellowships/${fellowshipId}`);
          if (res.data.status === 'Ok') {
            const fellowship = res.data.data;
            setIsAnnouncement(fellowship.type === 'announcement');
            const myMembership = fellowship.members.find((m: any) => {
              const memberUserId = (m.user?._id || m.user)?.toString();
              const currentUserId = (user?._id || user?.id)?.toString();
              const isIdMatch = !!(memberUserId && currentUserId && memberUserId === currentUserId);

              const memberUserEmail = m.user?.email?.toLowerCase();
              const currentUserEmail = user?.email?.toLowerCase();
              const isEmailMatch = !!(memberUserEmail && currentUserEmail && memberUserEmail === currentUserEmail);

              return isIdMatch || isEmailMatch;
            });
            const hasShepherdRole = myMembership?.role === 'shepherd' || orgRole === 'Admin';
            setIsShepherd(hasShepherdRole);
          }
        } catch (err) {
          console.error('Error fetching fellowship details:', err);
        }
      };
      checkRole();
    }, [fellowshipId, user, orgRole])
  );

  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_fellowship', fellowshipId);

    const onNewMessage = (message: MessageType & { tempId?: string }) => {
      setMessages(prev => {
        if (message.tempId && prev.some(m => m._id === message.tempId)) {
          return prev.map(m => m._id === message.tempId ? message : m);
        }
        if (prev.some(m => m._id === message._id)) {
          return prev;
        }
        return [message, ...prev];
      });
      socket.emit('mark_read', { fellowshipId });
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    };

    const onUserTyping = (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId === user?._id) return;
      setTypingUsers(prev => {
        if (data.isTyping) {
          if (!prev.find(u => u.userId === data.userId)) {
            return [...prev, { userId: data.userId, userName: data.userName }];
          }
          return prev;
        } else {
          return prev.filter(u => u.userId !== data.userId);
        }
      });
    };

    const onErrorMessage = (data: { message: string }) => {
      Alert.alert('Notice', data.message);
    };

    const onReactionUpdated = (data: { messageId: string; reactions: any[] }) => {
      setMessages(prev =>
        prev.map(m => (m._id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    };

    const onMessageUpdated = (updatedMessage: MessageType) => {
      setMessages(prev =>
        prev.map(m => (m._id === updatedMessage._id ? { ...m, ...updatedMessage } : m))
      );
    };

    socket.on('new_message', onNewMessage);
    socket.on('user_typing', onUserTyping);
    socket.on('error_message', onErrorMessage);
    socket.on('message_reaction_updated', onReactionUpdated);
    socket.on('message_updated', onMessageUpdated);

    return () => {
      socket.emit('leave_fellowship', fellowshipId);
      socket.off('new_message', onNewMessage);
      socket.off('user_typing', onUserTyping);
      socket.off('error_message', onErrorMessage);
      socket.off('message_reaction_updated', onReactionUpdated);
      socket.off('message_updated', onMessageUpdated);
    };
  }, [socket, fellowshipId, user]);

  const handleSend = () => {
    if (!inputText.trim() || !socket) return;

    const textToSend = inputText.trim();
    const tempId = `temp-${Date.now()}`;
    const isSocketConnected = !!socket.connected;
    const initialStatus = isSocketConnected ? 'sending' : 'error';

    const replyData = replyToMessage ? {
      messageId: replyToMessage._id,
      senderName: replyToMessage.sender?.name || replyToMessage.senderName,
      text: replyToMessage.text
    } : undefined;

    const tempMsg: MessageType = {
      _id: tempId,
      text: textToSend,
      type: 'text',
      sender: {
        _id: user?._id || user?.id || 'me',
        name: user?.name || 'Me',
        email: user?.email,
        image: user?.image
      },
      senderName: user?.name || 'Me',
      createdAt: new Date().toISOString(),
      readBy: [],
      status: initialStatus,
      replyTo: replyData
    };

    setMessages(prev => [tempMsg, ...prev]);

    setReplyToMessage(null);

    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);

    if (isSocketConnected) {
      socket.emit('send_message', {
        fellowshipId,
        text: textToSend,
        tempId,
        replyTo: replyData
      });

      setTimeout(() => {
        setMessages(prev =>
          prev.map(m => (m._id === tempId && m.status === 'sending' ? { ...m, status: 'error' } : m))
        );
      }, 8000);
    }

    socket.emit('typing', { fellowshipId, isTyping: false });
    setInputText('');
  };

  const handleRetry = (failedMsg: MessageType) => {
    if (!socket || !socket.connected) {
      Alert.alert('Connection Error', 'Please check your internet connection and try again.');
      return;
    }

    setMessages(prev =>
      prev.map(m => (m._id === failedMsg._id ? { ...m, status: 'sending' } : m))
    );

    socket.emit('send_message', {
      fellowshipId,
      text: failedMsg.text,
      tempId: failedMsg._id,
      replyTo: failedMsg.replyTo
    });

    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => (m._id === failedMsg._id && m.status === 'sending' ? { ...m, status: 'error' } : m))
      );
    }, 8000);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!socket) return;

    socket.emit('typing', { fellowshipId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { fellowshipId, isTyping: false });
    }, 2000);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage, true);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (!isQnaInputFocused.current && messages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 50);
      }
    });

    return () => {
      showSubscription.remove();
    };
  }, [messages.length]);

  const shouldShowDate = (index: number) => {
    if (index === messages.length - 1) return true;
    const curr = new Date(messages[index].createdAt).toDateString();
    const prev = new Date(messages[index + 1].createdAt).toDateString();
    return curr !== prev;
  };

  const isSameSender = (index: number) => {
    if (index === messages.length - 1) return false;
    const curr = messages[index];
    const prev = messages[index + 1];
    if (curr.type === 'system' || prev.type === 'system') return false;

    const currSenderId = (curr.sender?._id || curr.sender)?.toString();
    const prevSenderId = (prev.sender?._id || prev.sender)?.toString();
    if (currSenderId && prevSenderId && currSenderId === prevSenderId) return true;

    const currSenderEmail = curr.sender?.email?.toLowerCase();
    const prevSenderEmail = prev.sender?.email?.toLowerCase();
    return !!(currSenderEmail && prevSenderEmail && currSenderEmail === prevSenderEmail);
  };

  const canPost = !isAnnouncement || isShepherd;

  const renderMessage = ({ item, index }: { item: MessageType; index: number }) => {
    const itemSenderId = getUserStringId(item.sender);
    const currentUserId = getUserStringId(user);
    const isIdMatch = !!(itemSenderId && currentUserId && itemSenderId === currentUserId);
    const itemSenderEmail = item.sender?.email?.toLowerCase();
    const currentUserEmail = user?.email?.toLowerCase();
    const isEmailMatch = !!(itemSenderEmail && currentUserEmail && itemSenderEmail === currentUserEmail);

    const isMe = isIdMatch || isEmailMatch;
    const showDate = shouldShowDate(index);
    const sameSender = isSameSender(index);
    const isHighlighted = item._id === highlightedMessageId;

    if (item.type === 'system') {
      return (
        <View>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          )}
          <View style={styles.systemMessage}>
            <Text style={[styles.systemText, { color: colors.textSecondary }]}>
              {item.text}
            </Text>
          </View>
        </View>
      );
    }

    if (item.type === 'poll') {
      const poll = item.pollData;
      if (!poll) return null;

      const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes ? opt.votes.length : 0), 0);
      const isMultiple = poll.allowMultiple;

      return (
        <View style={styles.pollCardWrapper}>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            activeOpacity={0.95}
            onLongPress={() => setReactMenuMessageId(item._id)}
            style={[styles.pollCard, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff', borderColor: colors.border }]}
          >
            <View style={styles.pollCardHeader}>
              <BarChart2 size={16} color={colors.secondary} />
              <Text style={[styles.pollCardTag, { color: colors.secondary }]}>POLL</Text>
              <Text style={[styles.pollCardSender, { color: colors.textSecondary }]}>by {item.sender?.name || item.senderName}</Text>
            </View>

            <Text style={[styles.pollCardQuestion, { color: colors.text }]}>{poll.question}</Text>

            <View style={styles.pollOptionsContainer}>
              {poll.options.map((opt, optIdx) => {
                const optVotes = opt.votes || [];
                const hasVoted = optVotes.some(v => getUserStringId(v) === currentUserId);
                const voteCount = optVotes.length;
                const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                return (
                  <Pressable
                    key={optIdx}
                    onPress={() => handleVotePoll(item._id, optIdx)}
                    style={({ pressed }) => [
                      styles.pollOptionBtn,
                      {
                        borderColor: hasVoted ? colors.secondary : colors.border,
                        backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                        opacity: pressed ? 0.7 : 1
                      }
                    ]}
                  >
                    {/* Progress Bar background */}
                    <View
                      style={[
                        styles.pollProgressBar,
                        {
                          width: `${percent}%`,
                          backgroundColor: hasVoted
                            ? (colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 108, 148, 0.12)')
                            : (colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                        }
                      ]}
                    />

                    <View style={styles.pollOptionContentRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={[
                          styles.pollOptionText,
                          { color: colors.text, fontWeight: hasVoted ? '700' : '400' }
                        ]}>
                          {opt.optionText}
                        </Text>
                        {hasVoted && (
                          <Text style={{ marginLeft: 6, color: colors.secondary, fontWeight: 'bold' }}>✓</Text>
                        )}
                      </View>
                      <Text style={[styles.pollOptionVoteMeta, { color: colors.textSecondary }]}>
                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'} ({percent}%)
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.pollCardFooter}>
              <Text style={[styles.pollCardTotalVotes, { color: colors.textSecondary }]}>
                Total: {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
              </Text>
              <Text style={[styles.pollCardChoiceType, { color: colors.textSecondary }]}>
                {isMultiple ? 'Multiple choices allowed' : 'Single choice only'}
              </Text>
            </View>
          </TouchableOpacity>

          {item.reactions && item.reactions.length > 0 && (
            <View style={[styles.bubbleReactionsWrapper, { alignSelf: 'flex-start', marginTop: 4, marginLeft: 4 }]}>
              {groupReactions(item.reactions).map(group => {
                const hasMyReaction = group.users.some(u => {
                  if (u.id && currentUserId && u.id === currentUserId) return true;
                  const rxName = u.username?.toLowerCase().trim();
                  const myName = user?.name?.toLowerCase().trim();
                  return !!(rxName && myName && rxName === myName);
                });
                return (
                  <TouchableOpacity
                    key={group.emoji}
                    onPress={() => {
                      if (socket) {
                        socket.emit('react_message', {
                          fellowshipId,
                          messageId: item._id,
                          emoji: group.emoji
                        });
                      }
                    }}
                    style={[
                      styles.reactionBadge,
                      {
                        backgroundColor: colors.theme === 'dark'
                          ? (hasMyReaction ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.06)')
                          : (hasMyReaction ? 'rgba(20, 108, 148, 0.12)' : 'rgba(0,0,0,0.04)'),
                        borderColor: hasMyReaction ? colors.secondary : 'transparent'
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 11 }}>{group.emoji}</Text>
                    <Text style={[styles.reactionCountText, { color: colors.text, marginLeft: 2 }]}>{group.count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    if (item.type === 'qna') {
      const qna = item.qnaData;
      if (!qna) return null;

      const myExistingAnswer = qna.answers?.find(a => getUserStringId(a.user) === currentUserId);
      const hasAnswered = !!myExistingAnswer;
      const isOneTime = qna.isOneTimeAnswerable;
      const visibleToAll = qna.isAnswerVisibleToAll;
      const totalAnswers = qna.answers?.length || 0;

      const typedAnswer = qnaAnswerTextMap[item._id] || '';

      return (
        <View style={styles.qnaCardWrapper}>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            activeOpacity={0.95}
            onLongPress={() => setReactMenuMessageId(item._id)}
            style={[styles.qnaCard, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff', borderColor: colors.border }]}
          >
            <View style={styles.qnaCardHeader}>
              <Megaphone size={16} color={colors.secondary} />
              <Text style={[styles.qnaCardTag, { color: colors.secondary }]}>Q&A</Text>
              <Text style={[styles.qnaCardSender, { color: colors.textSecondary }]}>by {item.sender?.name || item.senderName}</Text>
            </View>

            <Text style={[styles.qnaCardQuestion, { color: colors.text }]}>{qna.question}</Text>

            {/* Answer Field Section */}
            {hasAnswered && isOneTime ? (
              <View style={[styles.qnaAnsweredBox, { backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F0F4F8' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[styles.qnaAnsweredTitle, { color: colors.secondary }]}>Your Answer (Submitted)</Text>
                  <Text style={[styles.qnaAnsweredDate, { color: colors.textSecondary }]}>{myExistingAnswer ? formatDate(myExistingAnswer.submittedAt) : ''}</Text>
                </View>
                <Text style={[styles.qnaAnsweredText, { color: colors.text }]}>{myExistingAnswer?.answerText}</Text>
              </View>
            ) : (
              <View style={styles.qnaInputRow}>
                <TextInput
                  style={[
                    styles.qnaTextInputField,
                    {
                      backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F5F7FA',
                      color: colors.text,
                      borderColor: colors.border
                    }
                  ]}
                  placeholder={hasAnswered ? "Type another answer..." : "Type your answer..."}
                  placeholderTextColor={colors.textSecondary}
                  value={typedAnswer}
                  onChangeText={(text) => setQnaAnswerTextMap(prev => ({ ...prev, [item._id]: text }))}
                  onFocus={() => { isQnaInputFocused.current = true; }}
                  onBlur={() => { isQnaInputFocused.current = false; }}
                />
                <TouchableOpacity
                  onPress={() => handleQnaAnswerSubmit(item._id)}
                  style={[styles.qnaSendBtn, { backgroundColor: colors.secondary, opacity: typedAnswer.trim() ? 1 : 0.6 }]}
                  disabled={!typedAnswer.trim()}
                >
                  <Send color="#fff" size={14} />
                </TouchableOpacity>
              </View>
            )}

            {/* If not one-time and has answered, list all of their submissions */}
            {hasAnswered && !isOneTime && (
              <View style={{ marginTop: 10, gap: 6 }}>
                <Text style={[styles.qnaAnsweredTitle, { color: colors.secondary }]}>Your Submissions:</Text>
                {qna.answers.filter(a => getUserStringId(a.user) === currentUserId).map((myAns, myAnsIdx) => (
                  <View key={myAnsIdx} style={[styles.qnaAnsweredBox, { backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F0F4F8' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.qnaAnsweredDate, { color: colors.textSecondary }]}>{formatDate(myAns.submittedAt)}</Text>
                    </View>
                    <Text style={[styles.qnaAnsweredText, { color: colors.text }]}>{myAns.answerText}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Admin or Members options to view answers */}
            <View style={styles.qnaCardFooter}>
              {(isShepherd || orgRole === 'Admin' || visibleToAll) ? (
                <TouchableOpacity
                  onPress={() => loadQnaAnswers(item._id)}
                  style={[styles.qnaViewAnswersBtn, { borderColor: colors.secondary }]}
                >
                  <Text style={[styles.qnaViewAnswersBtnText, { color: colors.secondary }]}>
                    View Answers ({totalAnswers})
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.qnaPrivateNotice, { color: colors.textSecondary }]}>
                  🔒 Answers are only visible to Shepherds
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {item.reactions && item.reactions.length > 0 && (
            <View style={[styles.bubbleReactionsWrapper, { alignSelf: 'flex-start', marginTop: 4, marginLeft: 4 }]}>
              {groupReactions(item.reactions).map(group => {
                const hasMyReaction = group.users.some(u => {
                  if (u.id && currentUserId && u.id === currentUserId) return true;
                  const rxName = u.username?.toLowerCase().trim();
                  const myName = user?.name?.toLowerCase().trim();
                  return !!(rxName && myName && rxName === myName);
                });
                return (
                  <TouchableOpacity
                    key={group.emoji}
                    onPress={() => {
                      if (socket) {
                        socket.emit('react_message', {
                          fellowshipId,
                          messageId: item._id,
                          emoji: group.emoji
                        });
                      }
                    }}
                    style={[
                      styles.reactionBadge,
                      {
                        backgroundColor: colors.theme === 'dark'
                          ? (hasMyReaction ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.06)')
                          : (hasMyReaction ? 'rgba(20, 108, 148, 0.12)' : 'rgba(0,0,0,0.04)'),
                        borderColor: hasMyReaction ? colors.secondary : 'transparent'
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 11 }}>{group.emoji}</Text>
                    <Text style={[styles.reactionCountText, { color: colors.text, marginLeft: 2 }]}>{group.count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        )}
        <SwipeableMessageBubble onSwipeTriggered={() => setReplyToMessage(item)} isMe={isMe}>
          <View
            style={[
              styles.messageBubbleWrapper,
              isMe ? styles.myMessageWrapper : styles.otherMessageWrapper,
              sameSender && { marginTop: 2 }
            ]}
          >
            {!isMe && !sameSender && (
              <Text style={[styles.senderName, { color: colors.secondary }]}>
                {item.sender?.name || item.senderName}
              </Text>
            )}
            <TouchableOpacity
              activeOpacity={0.95}
              onLongPress={() => setReactMenuMessageId(item._id)}
              style={[
                styles.messageBubble,
                isMe
                  ? { backgroundColor: colors.secondary }
                  : { backgroundColor: colors.theme === 'dark' ? colors.surface : '#E8F4FD' },
                {
                  borderWidth: 2,
                  borderColor: isHighlighted
                    ? (isMe ? '#FFD700' : colors.secondary)
                    : 'transparent'
                }
              ]}
            >
              {item.replyTo && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleQuotePress(item.replyTo!.messageId)}
                  style={[
                    styles.bubbleReplyContainer,
                    {
                      backgroundColor: isMe
                        ? 'rgba(0, 0, 0, 0.15)'
                        : (colors.theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'),
                      borderLeftColor: isMe ? '#fff' : colors.secondary
                    }
                  ]}
                >
                  <Text style={[
                    styles.bubbleReplySender,
                    { color: isMe ? '#FFD700' : colors.secondary }
                  ]} numberOfLines={1}>
                    {item.replyTo.senderName}
                  </Text>
                  <Text style={[
                    styles.bubbleReplyText,
                    { color: isMe ? 'rgba(255, 255, 255, 0.8)' : colors.textSecondary }
                  ]} numberOfLines={1}>
                    {item.replyTo.text}
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={[
                styles.messageText,
                { color: isMe ? '#fff' : colors.text }
              ]}>
                {item.text}
              </Text>
              {item.status === 'sending' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 4 }}>
                  <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary, marginTop: 0 }]}>
                    Sending...
                  </Text>
                  <Lottie
                    source={require('../../assets/lottie_icon/Sandy Loading.json')}
                    autoPlay
                    loop
                    style={{ width: 14, height: 14 }}
                  />
                </View>
              ) : item.status === 'error' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, marginTop: 4 }}>
                  <Text style={[styles.messageTime, { color: '#FF3B30', fontWeight: '600', marginTop: 0 }]}>
                    Failed to send
                  </Text>
                  <TouchableOpacity onPress={() => handleRetry(item)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 11, color: '#FF3B30', fontWeight: 'bold', textDecorationLine: 'underline' }}>⚠️ Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[
                  styles.messageTime,
                  { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                ]}>
                  {formatTime(item.createdAt)}
                </Text>
              )}
            </TouchableOpacity>

            {item.reactions && item.reactions.length > 0 && (
              <View style={[styles.bubbleReactionsWrapper, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                {groupReactions(item.reactions).map(group => {
                  const hasMyReaction = group.users.some(u => {
                    if (u.id && currentUserId && u.id === currentUserId) return true;
                    const rxName = u.username?.toLowerCase().trim();
                    const myName = user?.name?.toLowerCase().trim();
                    return !!(rxName && myName && rxName === myName);
                  });
                  return (
                    <TouchableOpacity
                      key={group.emoji}
                      onPress={() => {
                        if (socket) {
                          socket.emit('react_message', {
                            fellowshipId,
                            messageId: item._id,
                            emoji: group.emoji
                          });
                        }
                      }}
                      style={[
                        styles.reactionBadge,
                        {
                          backgroundColor: colors.theme === 'dark'
                            ? (hasMyReaction ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.06)')
                            : (hasMyReaction ? 'rgba(20, 108, 148, 0.12)' : 'rgba(0,0,0,0.04)'),
                          borderColor: hasMyReaction ? colors.secondary : 'transparent'
                        }
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 11 }}>{group.emoji}</Text>
                      <Text style={[styles.reactionCountText, { color: colors.text, marginLeft: 2 }]}>{group.count}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </SwipeableMessageBubble>
      </View>
    );
  };

  const typingText = typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].userName} is writing...`
      : `${typingUsers.length} people are writing...`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <LinearGradient
        colors={[colors.secondary, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={22} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => navigation.navigate('FellowshipDetails', { fellowshipId })}
        >
          <Text style={styles.headerIcon}>{fellowshipIcon || '📖'}</Text>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{fellowshipName}</Text>
            {isAnnouncement && (
              <View style={styles.announcementBadge}>
                <Megaphone color="#FFD700" size={10} />
                <Text style={styles.announcementText}>Announcement</Text>
              </View>
            )}
            {typingText && (
              <Text style={styles.typingText}>{typingText}</Text>
            )}
          </View>
        </TouchableOpacity>
        {isShepherd && (
          <TouchableOpacity
            style={[styles.infoBtn, { marginRight: 8 }]}
            onPress={() => setShowCreationMenu(true)}
          >
            <Plus color="#fff" size={20} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => navigation.navigate('FellowshipDetails', { fellowshipId })}
        >
          <Info color="#fff" size={20} />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <LoadingScreen variant="transparent" message="Loading scrolls..." />
      ) : (
        <FlatList
          ref={flatListRef}
          inverted
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesList}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          onScrollToIndexFailed={(info) => {
            try {
              flatListRef.current?.scrollToOffset({ offset: info.index * 60, animated: true });
            } catch (err) {
              console.log('Scroll failed fallback:', err);
            }
          }}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreBtn}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.secondary} />
                ) : (
                  <Text style={[styles.loadMoreText, { color: colors.secondary }]}>
                    ↑ Load earlier scrolls
                  </Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📜</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No scrolls yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Be the first to share in this fellowship
              </Text>
            </View>
          }
        />
      )}

      {showScrollBottomBtn && (
        <TouchableOpacity
          style={[styles.scrollBottomBtn, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}
          onPress={scrollToBottom}
          activeOpacity={0.8}
        >
          <ChevronDown color={colors.secondary} size={20} />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {replyToMessage && (
          <Animated.View style={[
            styles.replyPreviewContainer,
            {
              backgroundColor: colors.theme === 'dark' ? colors.surface : '#F0F2F5',
              borderTopColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E0E0E0',
              transform: [{ translateY: replyAnimY }]
            }
          ]}>
            <View style={[styles.replyPreviewBorder, { backgroundColor: colors.secondary }]} />
            <View style={styles.replyPreviewTextContainer}>
              <Text style={[styles.replyPreviewSender, { color: colors.secondary }]} numberOfLines={1}>
                Replying to {replyToMessage.sender?.name || replyToMessage.senderName}
              </Text>
              <Text style={[styles.replyPreviewText, { color: colors.textSecondary }]} numberOfLines={1}>
                {replyToMessage.text}
              </Text>
            </View>
            <TouchableOpacity onPress={closeReplyPreview} style={styles.replyPreviewCloseBtn}>
              <Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {canPost ? (
          <View style={[styles.inputBar, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#F5F7FA', borderTopColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E0E0E0' }]}>
            <TextInput
              style={[styles.textInput, {
                backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff',
                color: colors.text,
                borderColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E0E0E0'
              }]}
              placeholder="Write a message..."
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={handleTyping}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim()}
              style={[styles.sendBtn, { opacity: inputText.trim() ? 1 : 0.4 }]}
            >
              <LinearGradient
                colors={[colors.secondary, colors.primary]}
                style={styles.sendBtnGradient}
              >
                <Send color="#fff" size={18} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.readOnlyBar, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#F5F7FA' }]}>
            <Megaphone color={colors.textSecondary} size={16} />
            <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
              Only shepherds can post in this fellowship
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={!!reactMenuMessageId}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setReactMenuMessageId(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setReactMenuMessageId(null)}
        >
          <View style={[styles.reactionPickerContainer, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
            {(() => {
              const targetMessage = messages.find(m => m._id === reactMenuMessageId);
              const myExistingReaction = targetMessage?.reactions?.find(r => {
                const reactionUserId = getUserStringId(r.user);
                const myUserId = getUserStringId(user);
                if (reactionUserId && myUserId && reactionUserId === myUserId) return true;

                const rxName = r.username?.toLowerCase().trim();
                const myName = user?.name?.toLowerCase().trim();
                return !!(rxName && myName && rxName === myName);
              });
              const myActiveEmoji = myExistingReaction?.emoji;

              return reactionEmojis.map(emoji => {
                const isSelected = emoji === myActiveEmoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleEmojiReact(emoji)}
                    style={[
                      styles.reactionEmojiButton,
                      isSelected && {
                        backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.22)' : 'rgba(20, 108, 148, 0.15)',
                        borderRadius: 20
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 26 }}>{emoji}</Text>
                  </TouchableOpacity>
                );
              });
            })()}
          </View>
        </Pressable>
      </Modal>

      {/* Creation Menu Selection Modal */}
      <Modal
        visible={showCreationMenu}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowCreationMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreationMenu(false)}>
          <View style={[styles.bottomSheetMenu, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
            <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Fellowship Tools</Text>

            <TouchableOpacity
              onPress={() => {
                setShowCreationMenu(false);
                setShowPollModal(true);
              }}
              style={styles.bottomSheetItem}
            >
              <BarChart2 size={22} color={colors.secondary} />
              <View style={{ marginLeft: 16 }}>
                <Text style={[styles.bottomSheetItemText, { color: colors.text }]}>Create a Poll</Text>
                <Text style={[styles.bottomSheetItemSub, { color: colors.textSecondary }]}>Ask members to vote on options</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowCreationMenu(false);
                setShowQnaModal(true);
              }}
              style={styles.bottomSheetItem}
            >
              <Megaphone size={22} color={colors.secondary} />
              <View style={{ marginLeft: 16 }}>
                <Text style={[styles.bottomSheetItemText, { color: colors.text }]}>Create a Q&A</Text>
                <Text style={[styles.bottomSheetItemSub, { color: colors.textSecondary }]}>Ask questions and receive text answers</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowCreationMenu(false)}
              style={[styles.bottomSheetCancel, { backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#F5F7FA' }]}
            >
              <Text style={[styles.bottomSheetCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Create Poll Modal */}
      <Modal
        visible={showPollModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowPollModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.creationModalContainer, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
            <View style={styles.creationModalHeader}>
              <Text style={[styles.creationModalTitle, { color: colors.text }]}>New Poll</Text>
              <TouchableOpacity onPress={() => setShowPollModal(false)}>
                <Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.creationLabel, { color: colors.text }]}>Question</Text>
              <TextInput
                style={[styles.creationInput, { backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F5F7FA', color: colors.text, borderColor: colors.border }]}
                placeholder="Ask something..."
                placeholderTextColor={colors.textSecondary}
                value={pollQuestion}
                onChangeText={setPollQuestion}
                maxLength={300}
                multiline
              />

              <Text style={[styles.creationLabel, { color: colors.text, marginTop: 16 }]}>Options</Text>
              {pollOptions.map((opt, idx) => (
                <View key={idx} style={styles.optionInputRow}>
                  <TextInput
                    style={[styles.optionTextInput, { backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F5F7FA', color: colors.text, borderColor: colors.border }]}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor={colors.textSecondary}
                    value={opt}
                    onChangeText={(val) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = val;
                      setPollOptions(newOpts);
                    }}
                    maxLength={100}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      onPress={() => {
                        const newOpts = pollOptions.filter((_, oIdx) => oIdx !== idx);
                        setPollOptions(newOpts);
                      }}
                      style={styles.optionDeleteBtn}
                    >
                      <Text style={{ fontSize: 16, color: '#FF5252', fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity
                onPress={() => setPollOptions([...pollOptions, ''])}
                style={[styles.addOptionBtn, { borderColor: colors.secondary }]}
              >
                <Plus size={16} color={colors.secondary} />
                <Text style={[styles.addOptionBtnText, { color: colors.secondary }]}>Add Option</Text>
              </TouchableOpacity>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: colors.text }]}>Allow Multiple Answers</Text>
                  <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Users can vote for multiple options</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPollAllowMultiple(!pollAllowMultiple)}
                  style={[
                    styles.checkboxWrapper,
                    {
                      borderColor: pollAllowMultiple ? colors.secondary : colors.border,
                      backgroundColor: pollAllowMultiple ? colors.secondary : 'transparent'
                    }
                  ]}
                >
                  {pollAllowMultiple && <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleCreatePoll}
                style={[styles.createSubmitBtn, { backgroundColor: colors.secondary }]}
              >
                <Text style={styles.createSubmitBtnText}>Create Poll</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Q&A Modal */}
      <Modal
        visible={showQnaModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowQnaModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.creationModalContainer, { backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
            <View style={styles.creationModalHeader}>
              <Text style={[styles.creationModalTitle, { color: colors.text }]}>New Q&A</Text>
              <TouchableOpacity onPress={() => setShowQnaModal(false)}>
                <Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.creationLabel, { color: colors.text }]}>Question</Text>
              <TextInput
                style={[styles.creationInput, { backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F5F7FA', color: colors.text, borderColor: colors.border }]}
                placeholder="Ask something..."
                placeholderTextColor={colors.textSecondary}
                value={qnaQuestion}
                onChangeText={qnaText => setQnaQuestion(qnaText)}
                maxLength={400}
                multiline
              />

              <View style={[styles.toggleRow, { marginTop: 24 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: colors.text }]}>Answer Visible to All</Text>
                  <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Members can see each other's answers</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setQnaVisibleToAll(!qnaVisibleToAll)}
                  style={[
                    styles.checkboxWrapper,
                    {
                      borderColor: qnaVisibleToAll ? colors.secondary : colors.border,
                      backgroundColor: qnaVisibleToAll ? colors.secondary : 'transparent'
                    }
                  ]}
                >
                  {qnaVisibleToAll && <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                </TouchableOpacity>
              </View>

              <View style={[styles.toggleRow, { marginTop: 16 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: colors.text }]}>One-time Answerable</Text>
                  <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Users can submit their answer only once</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setQnaOneTime(!qnaOneTime)}
                  style={[
                    styles.checkboxWrapper,
                    {
                      borderColor: qnaOneTime ? colors.secondary : colors.border,
                      backgroundColor: qnaOneTime ? colors.secondary : 'transparent'
                    }
                  ]}
                >
                  {qnaOneTime && <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleCreateQna}
                style={[styles.createSubmitBtn, { backgroundColor: colors.secondary, marginTop: 32 }]}
              >
                <Text style={styles.createSubmitBtnText}>Create Q&A</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Q&A Answers Modal */}
      <Modal
        visible={showQnaAnswersModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowQnaAnswersModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowQnaAnswersModal(false)}>
          <View style={[styles.creationModalContainer, { height: '80%', backgroundColor: colors.theme === 'dark' ? colors.surface : '#fff' }]}>
            <View style={styles.creationModalHeader}>
              <Text style={[styles.creationModalTitle, { color: colors.text }]}>Submissions</Text>
              <TouchableOpacity onPress={() => setShowQnaAnswersModal(false)}>
                <Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {qnaAnswersLoading ? (
              <LoadingScreen variant="transparent" message="Loading submissions..." />
            ) : (
              <FlatList
                data={qnaAnswersList}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <View style={[styles.qnaAnswerListItem, { borderBottomColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={[styles.qnaAnswerListUser, { color: colors.text }]}>{item.username}</Text>
                      <Text style={[styles.qnaAnswerListDate, { color: colors.textSecondary }]}>
                        {item.submittedAt ? formatDate(item.submittedAt) + ' ' + formatTime(item.submittedAt) : ''}
                      </Text>
                    </View>
                    <Text style={[styles.qnaAnswerListText, { color: colors.text }]}>{item.answerText}</Text>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ fontSize: 16, color: colors.textSecondary }}>No submissions yet.</Text>
                  </View>
                }
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 14,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerIcon: { fontSize: 28 },
  headerTextContainer: { marginLeft: 10, flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  announcementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  announcementText: {
    fontSize: 10,
    color: '#FFD700',
    marginLeft: 3,
    fontWeight: '600',
  },
  typingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    gap: 12,
  },
  reactionEmojiButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleReactionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reactionCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  infoBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600' },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 6,
  },
  systemText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: '80%',
  },
  messageBubbleWrapper: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  myMessageWrapper: { alignSelf: 'flex-end' },
  otherMessageWrapper: { alignSelf: 'flex-start' },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 60,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    marginLeft: 8,
    marginBottom: 2,
  },
  sendBtnGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  readOnlyText: { fontSize: 13 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, marginTop: 4 },
  scrollBottomBtn: {
    position: 'absolute',
    bottom: 72,
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 10,
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  replyPreviewBorder: {
    width: 3,
    height: '100%',
    borderRadius: 2,
  },
  replyPreviewTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  replyPreviewSender: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyPreviewText: {
    fontSize: 13,
    marginTop: 2,
  },
  replyPreviewCloseBtn: {
    padding: 8,
  },
  bubbleReplyContainer: {
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    marginBottom: 6,
  },
  bubbleReplySender: {
    fontSize: 11,
    fontWeight: '700',
  },
  bubbleReplyText: {
    fontSize: 12,
    marginTop: 2,
  },
  // Polls & Q&As styles
  pollCardWrapper: {
    paddingHorizontal: 12,
    marginVertical: 8,
    alignSelf: 'center',
    width: '100%',
  },
  pollCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  pollCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pollCardTag: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.8,
  },
  pollCardSender: {
    fontSize: 12,
    marginLeft: 8,
  },
  pollCardQuestion: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 16,
  },
  pollOptionsContainer: {
    gap: 10,
  },
  pollOptionBtn: {
    borderRadius: 10,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  pollProgressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  pollOptionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 2,
  },
  pollOptionText: {
    fontSize: 14,
  },
  pollOptionVoteMeta: {
    fontSize: 11,
  },
  pollCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  pollCardTotalVotes: {
    fontSize: 12,
    fontWeight: '500',
  },
  pollCardChoiceType: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Q&A card styles
  qnaCardWrapper: {
    paddingHorizontal: 12,
    marginVertical: 8,
    alignSelf: 'center',
    width: '100%',
  },
  qnaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  qnaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  qnaCardTag: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.8,
  },
  qnaCardSender: {
    fontSize: 12,
    marginLeft: 8,
  },
  qnaCardQuestion: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 16,
  },
  qnaInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qnaTextInputField: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  qnaSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qnaAnsweredBox: {
    padding: 12,
    borderRadius: 10,
  },
  qnaAnsweredTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  qnaAnsweredDate: {
    fontSize: 10,
  },
  qnaAnsweredText: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  qnaCardFooter: {
    marginTop: 14,
    alignItems: 'flex-start',
  },
  qnaViewAnswersBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  qnaViewAnswersBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  qnaPrivateNotice: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  // Creation sheet/modal styles
  bottomSheetMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  bottomSheetItemText: {
    fontSize: 15,
    fontWeight: '700',
  },
  bottomSheetItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  bottomSheetCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  bottomSheetCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  creationModalContainer: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    padding: 24,
  },
  creationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  creationModalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  creationLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  creationInput: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 60,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  optionTextInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  optionDeleteBtn: {
    padding: 10,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
    gap: 8,
  },
  addOptionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    justifyContent: 'space-between',
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 12,
    marginTop: 2,
  },
  checkboxWrapper: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createSubmitBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  createSubmitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Submissions list item styles
  qnaAnswerListItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  qnaAnswerListUser: {
    fontSize: 14,
    fontWeight: '700',
  },
  qnaAnswerListDate: {
    fontSize: 10,
  },
  qnaAnswerListText: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 4,
  },
});
