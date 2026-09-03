import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronDown, ChevronUp, RotateCcw, Gem, Trophy, Plus, Minus, X, Cloud } from 'lucide-react-native';
import { Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const apiUrl = API_BASE_URL;

// Bible books structure with chapters
const BIBLE_STRUCTURE = {
  'Old Testament': {
    Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
    Joshua: 24, Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24,
    '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
    Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150,
    Proverbs: 31, Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66,
    Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14,
    Joel: 3, Amos: 9, Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3,
    Habakkuk: 3, Zephaniah: 3, Haggai: 2, Zechariah: 14, Malachi: 4
  },
  'New Testament': {
    Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28,
    Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6,
    Ephesians: 6, Philippians: 4, Colossians: 4, '1 Thessalonians': 5,
    '2 Thessalonians': 3, '1 Timothy': 6, '2 Timothy': 4, Titus: 3,
    Philemon: 1, Hebrews: 13, James: 5, '1 Peter': 5, '2 Peter': 3,
    '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1, Revelation: 22
  }
};

const ReadingTrackerComponent = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [completedChapters, setCompletedChapters] = useState({});
  const [expandedBook, setExpandedBook] = useState(null);
  const [expandedTestament, setExpandedTestament] = useState('Old Testament');

  // Treasures in Heaven states
  const [treasuresInHeaven, setTreasuresInHeaven] = useState(0);
  const [showTreasuresModal, setShowTreasuresModal] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadCompletedChapters();
  }, []);

  const loadCompletedChapters = async () => {
    try {
      // 1. Try to load from Local Storage first for immediate UI
      const savedCompleted = await AsyncStorage.getItem('completedChapters');
      if (savedCompleted) setCompletedChapters(JSON.parse(savedCompleted));

      const token = await AsyncStorage.getItem('token');
      if (token) {
        // 2. Fetch fresh data from MongoDB
        const response = await axios.post(`${apiUrl}/api/auth/userdata`, { token });
        if (response.data.status === 'Ok') {
          const userData = response.data.data;
          setUserId(userData._id);

          if (userData.readingProgress) {
            setCompletedChapters(userData.readingProgress);
            await AsyncStorage.setItem('completedChapters', JSON.stringify(userData.readingProgress));
          }

          if (userData.treasuresInHeaven !== undefined && userData.treasuresInHeaven !== null) {
            setTreasuresInHeaven(userData.treasuresInHeaven);
            // If it's the very first time (null/undefined in DB), show initial setup
            if (userData.treasuresInHeaven === 0 && !await AsyncStorage.getItem('hasAnsweredInitialSetup')) {
              setShowInitialSetup(true);
            }
          } else {
            // Field doesn't exist yet for this user
            setShowInitialSetup(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading tracker data:', error);
    }
  };

  const saveCompletedChapters = async (chapters) => {
    try {
      setCompletedChapters(chapters);
      await AsyncStorage.setItem('completedChapters', JSON.stringify(chapters));

      const progress = getTotalProgressInternal(chapters);

      // Perform background sync to MongoDB
      syncProgressToCloud(chapters, treasuresInHeaven, progress.completed);

      // Check for Bible Completion (1189 chapters)
      if (progress.completed === 1189) {
        handleBibleCompletion();
      }
    } catch (error) {
      console.error('Error saving completed chapters:', error);
    }
  };

  const syncProgressToCloud = async (chapters, treasures, totalRead) => {
    try {
      if (!userId) return;
      // userId is no longer sent — the server syncs the authenticated caller.
      setIsSyncing(true);
      await axios.post(`${apiUrl}/api/reading-tracker/sync`, {
        readingProgress: chapters,
        treasuresInHeaven: treasures,
        totalChaptersRead: totalRead
      });
      setIsSyncing(false);
    } catch (error) {
      console.log('Progress sync failed:', error.message);
      setIsSyncing(false);
    }
  };

  const handleBibleCompletion = () => {
    const newCount = treasuresInHeaven + 1;
    setTreasuresInHeaven(newCount);
    syncProgressToCloud(completedChapters, newCount, 1189);

    Alert.alert(
      '🌟 Treasure Stored in Heaven! 🌟',
      'Congratulations! You have completed the entire Bible. A new treasure has been stored for you in the heavenly realms.',
      [
        {
          text: 'Glory to God!',
          onPress: () => {
            // Optional: Show celebration effect or ask to reset
            askForResetAfterCompletion();
          }
        }
      ]
    );
  };

  const askForResetAfterCompletion = () => {
    Alert.alert(
      'Begin New Journey?',
      'You have finished all chapters. Would you like to reset your progress to start reading from Genesis again? (Your Treasures will remain safe!)',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Reset & Start Again',
          onPress: () => {
            saveCompletedChapters({});
          }
        }
      ]
    );
  };

  const submitInitialTreasures = async (count) => {
    const finalCount = parseInt(count) || 0;
    setTreasuresInHeaven(finalCount);
    setShowInitialSetup(false);
    await AsyncStorage.setItem('hasAnsweredInitialSetup', 'true');
    syncProgressToCloud(completedChapters, finalCount, getTotalProgressInternal(completedChapters).completed);
  };

  const toggleChapterComplete = (book, chapter) => {
    const key = `${book}-${chapter}`;
    const updated = { ...completedChapters, [key]: !completedChapters[key] };
    saveCompletedChapters(updated);
  };

  const toggleAllChaptersInBook = (book, chapterCount) => {
    const bookChapters = Array.from({ length: chapterCount }, (_, i) => i + 1);
    const allCompleted = bookChapters.every(ch => completedChapters[`${book}-${ch}`]);

    const updated = { ...completedChapters };
    bookChapters.forEach(ch => {
      updated[`${book}-${ch}`] = !allCompleted;
    });

    saveCompletedChapters(updated);
  };

  const resetAllProgress = () => {
    Alert.alert(
      'Reset All Progress',
      'Are you sure you want to reset all reading progress? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            saveCompletedChapters({});
            Alert.alert('Success', 'All progress has been reset.');
          }
        }
      ]
    );
  };

  const getTotalProgressInternal = (chapters) => {
    const total = 1189; // Fixed total chapters in Protestant Bible
    const completed = Object.values(chapters).filter(v => v).length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const getTotalProgress = () => {
    return getTotalProgressInternal(completedChapters);
  };

  const getTestamentProgress = (testament) => {
    const books = BIBLE_STRUCTURE[testament];
    const total = Object.values(books).reduce((sum, ch) => sum + ch, 0);
    const completed = Object.entries(books).reduce((sum, [book, chapterCount]) => {
      return sum + Array.from({ length: chapterCount }, (_, i) =>
        completedChapters[`${book}-${i + 1}`]
      ).filter(Boolean).length;
    }, 0);
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const getProgressColor = (percentage, colors) => {
    if (percentage === 100) return '#4CAF50'; // Green
    if (percentage >= 75) return '#8BC34A'; // Light green
    if (percentage >= 50) return '#FF9800'; // Orange
    if (percentage >= 25) return '#FFC107'; // Amber
    if (percentage > 0) return '#2196F3'; // Blue
    return colors.theme === 'dark' ? colors.secondary : '#AFD3E2'; // Light blue (default)
  };

  const progress = getTotalProgress();

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.treasureHeaderIcon}
            onPress={() => setShowTreasuresModal(true)}
          >
            <Trophy color="#F1C40F" size={28} />
            {treasuresInHeaven > 0 && (
              <View style={styles.treasureBadge}>
                <Text style={styles.treasureBadgeText}>{treasuresInHeaven}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.headerText}>Reading Tracker</Text>
          <Text style={styles.subtitleText}>Track every chapter of the Bible</Text>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progress.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progress.total - progress.completed}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progress.percentage}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.overallProgressContainer}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, {
              width: `${progress.percentage}%`,
              backgroundColor: getProgressColor(progress.percentage, colors)
            }]} />
          </View>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetAllProgress}
          >
            <RotateCcw color="#E74C3C" size={20} />
            <Text style={styles.resetButtonText}>Reset All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            {Object.entries(BIBLE_STRUCTURE).map(([testament, books]) => {
              const testamentProgress = getTestamentProgress(testament);
              const isExpanded = expandedTestament === testament;
              const isTestamentComplete = testamentProgress.percentage === 100;

              return (
                <View key={testament} style={styles.testamentSection}>
                  <TouchableOpacity
                    style={styles.testamentHeader}
                    onPress={() => setExpandedTestament(isExpanded ? null : testament)}
                  >
                    {isTestamentComplete && (
                      <View style={styles.finishedBadge}>
                        <Text style={styles.finishedBadgeText}>✓ Finished</Text>
                      </View>
                    )}
                    <View style={styles.testamentTitleContainer}>
                      <Text style={styles.testamentTitle}>{testament}</Text>
                      <Text style={styles.testamentProgress}>
                        {testamentProgress.completed}/{testamentProgress.total} chapters ({testamentProgress.percentage}%)
                      </Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp color="#F6F1F1" size={24} />
                    ) : (
                      <ChevronDown color="#F6F1F1" size={24} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.booksContainer}>
                      {Object.entries(books).map(([book, chapterCount]) => {
                        const completedInBook = Array.from({ length: chapterCount }, (_, i) =>
                          completedChapters[`${book}-${i + 1}`]
                        ).filter(Boolean).length;
                        const bookProgress = Math.round((completedInBook / chapterCount) * 100);
                        const isBookExpanded = expandedBook === book;
                        const isBookComplete = bookProgress === 100;

                        return (
                          <View key={book} style={styles.bookCard}>
                            <TouchableOpacity
                              style={styles.bookHeader}
                              onPress={() => setExpandedBook(isBookExpanded ? null : book)}
                            >
                              {isBookComplete && (
                                <View style={styles.bookFinishedBadge}>
                                  <Text style={styles.bookFinishedBadgeText}>✓ Finished</Text>
                                </View>
                              )}
                              <View style={styles.bookTitleContainer}>
                                <Text style={styles.bookName}>{book}</Text>
                                <Text style={styles.bookSubtitle}>
                                  {completedInBook}/{chapterCount} chapters
                                </Text>
                              </View>
                              <View style={styles.bookProgressContainer}>
                                <View style={[
                                  styles.bookProgressCircle,
                                  { backgroundColor: getProgressColor(bookProgress, colors) }
                                ]}>
                                  <Text style={styles.bookProgressText}>{bookProgress}%</Text>
                                </View>
                                {isBookExpanded ? (
                                  <ChevronUp color={colors.tint} size={20} />
                                ) : (
                                  <ChevronDown color={colors.tint} size={20} />
                                )}
                              </View>
                            </TouchableOpacity>

                            {isBookExpanded && (
                              <>
                                <TouchableOpacity
                                  style={styles.markAllButton}
                                  onPress={() => toggleAllChaptersInBook(book, chapterCount)}
                                >
                                  <Text style={styles.markAllButtonText}>
                                    {completedInBook === chapterCount ? 'Unmark All' : 'Mark All Complete'}
                                  </Text>
                                </TouchableOpacity>

                                <View style={styles.chaptersGrid}>
                                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map(chapter => {
                                    const key = `${book}-${chapter}`;
                                    const isCompleted = completedChapters[key];

                                    return (
                                      <TouchableOpacity
                                        key={chapter}
                                        style={[
                                          styles.chapterBox,
                                          isCompleted && styles.chapterBoxCompleted
                                        ]}
                                        onPress={() => toggleChapterComplete(book, chapter)}
                                      >
                                        <Text style={[
                                          styles.chapterNumber,
                                          isCompleted && styles.chapterNumberCompleted
                                        ]}>
                                          {chapter}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Treasures in Heaven Modal */}
      <Modal
        visible={showTreasuresModal}
        transparent={true}
        statusBarTranslucent={true}
        animationType="fade"
        onRequestClose={() => setShowTreasuresModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient colors={colors.theme === 'dark' ? ['#1A2229', '#12161A'] : ['#E3F2FD', '#FFFFFF']} style={styles.heavenlyModalContent}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowTreasuresModal(false)}
            >
              <X color={colors.tint} size={24} />
            </TouchableOpacity>

            <Cloud color="rgba(255,255,255,0.8)" size={100} style={styles.bgCloud1} />
            <Cloud color="rgba(255,255,255,0.5)" size={150} style={styles.bgCloud2} />

            <View style={styles.heavenlyContent}>
              <Trophy color="#F1C40F" size={80} style={styles.mainTreasureIcon} />
              <Text style={styles.heavenlyTitle}>Treasures in Heaven</Text>
              <Text style={styles.heavenlySubtitle}>"Do not store up for yourselves treasures on earth... but store up for yourselves treasures in heaven."</Text>

              <View style={styles.treasureDisplay}>
                <Text style={styles.treasureCountText}>{treasuresInHeaven}</Text>
                <Text style={styles.treasureLabel}>Bible Completions</Text>
              </View>

              <View style={styles.starsContainer}>
                {Array.from({ length: Math.min(treasuresInHeaven, 50) }).map((_, i) => (
                  <Gem key={i} color="#F1C40F" size={20} fill="#F1C40F" style={styles.miniStar} />
                ))}
              </View>

              <View style={styles.manualControls}>
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={() => {
                    const next = Math.max(0, treasuresInHeaven - 1);
                    setTreasuresInHeaven(next);
                    syncProgressToCloud(completedChapters, next, getTotalProgress().completed);
                  }}
                >
                  <Minus color={colors.tint} size={24} />
                </TouchableOpacity>
                <View style={styles.controlLabelContainer}>
                  <Text style={styles.controlValue}>{treasuresInHeaven}</Text>
                </View>
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={() => {
                    const next = treasuresInHeaven + 1;
                    setTreasuresInHeaven(next);
                    syncProgressToCloud(completedChapters, next, getTotalProgress().completed);
                  }}
                >
                  <Plus color={colors.tint} size={24} />
                </TouchableOpacity>
              </View>

              <Text style={styles.footerNote}>Each full Bible completion adds a treasure.</Text>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Initial Setup Modal */}
      <Modal
        visible={showInitialSetup}
        transparent={true}
        statusBarTranslucent={true}
        animationType="fade"
      >
        <View style={styles.setupOverlay}>
          <View style={styles.setupCard}>
            <Trophy color="#F1C40F" size={60} style={{ alignSelf: 'center', marginBottom: 15 }} />
            <Text style={styles.setupTitle}>Welcome to your Heavenly Record</Text>
            <Text style={styles.setupText}>How many times have you already completed the whole Bible in your life?</Text>

            <View style={styles.manualControls}>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => setTreasuresInHeaven(prev => Math.max(0, prev - 1))}
              >
                <Minus color={colors.tint} size={24} />
              </TouchableOpacity>
              <View style={styles.controlLabelContainer}>
                <Text style={styles.controlValue}>{treasuresInHeaven}</Text>
              </View>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => setTreasuresInHeaven(prev => prev + 1)}
              >
                <Plus color={colors.tint} size={24} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => submitInitialTreasures(treasuresInHeaven)}
            >
              <Text style={styles.submitBtnText}>Confirm Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  outer_container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
    paddingTop: 16,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#F6F1F1',
    textAlign: 'center',
    opacity: 0.9,
  },
  statsCard: {
    backgroundColor: colors.theme === 'dark' ? colors.cardBg : 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.tint,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  overallProgressContainer: {
    backgroundColor: colors.theme === 'dark' ? colors.cardBg : 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  resetButtonText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  testamentSection: {
    marginBottom: 20,
  },
  testamentHeader: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  finishedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 1,
  },
  finishedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  testamentTitleContainer: {
    flex: 1,
  },
  testamentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6F1F1',
    marginBottom: 4,
  },
  testamentProgress: {
    fontSize: 13,
    color: '#F6F1F1',
    opacity: 0.9,
  },
  booksContainer: {
    gap: 12,
  },
  bookCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'relative',
  },
  bookFinishedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 1,
  },
  bookFinishedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  bookTitleContainer: {
    flex: 1,
  },
  bookName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.tint,
    marginBottom: 4,
  },
  bookSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bookProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookProgressCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookProgressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  markAllButton: {
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#AFD3E2',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  markAllButtonText: {
    color: colors.tint,
    fontSize: 14,
    fontWeight: '600',
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    paddingTop: 0,
    gap: 8,
  },
  chapterBox: {
    width: 46,
    height: 46,
    backgroundColor: colors.theme === 'dark' ? colors.inputBg : '#F0F0F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  chapterBoxCompleted: {
    backgroundColor: colors.theme === 'dark' ? colors.secondary : colors.primary,
    borderColor: colors.theme === 'dark' ? colors.tint : colors.secondary,
  },
  chapterNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chapterNumberCompleted: {
    color: '#F6F1F1',
  },
  // Heavenly Modal Styles
  treasureHeaderIcon: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  treasureBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F6F1F1',
  },
  treasureBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heavenlyModalContent: {
    width: '90%',
    height: '70%',
    borderRadius: 30,
    padding: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  closeModalButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 20,
    backgroundColor: colors.theme === 'dark' ? colors.border : 'rgba(20, 108, 148, 0.1)',
    padding: 8,
    borderRadius: 20,
  },
  heavenlyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  mainTreasureIcon: {
    marginBottom: 16,
  },
  heavenlyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.tint,
    textAlign: 'center',
  },
  heavenlySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  treasureDisplay: {
    alignItems: 'center',
    marginVertical: 10,
  },
  treasureCountText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#F1C40F',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  treasureLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.tint,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 20,
    maxHeight: 120,
  },
  miniStar: {
    margin: 2,
  },
  manualControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  controlBtn: {
    backgroundColor: colors.theme === 'dark' ? colors.border : '#AFD3E2',
    padding: 12,
    borderRadius: 20,
    elevation: 2,
  },
  controlLabelContainer: {
    minWidth: 40,
    alignItems: 'center',
  },
  controlValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.tint,
  },
  footerNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 30,
  },
  bgCloud1: {
    position: 'absolute',
    top: 40,
    left: -20,
    opacity: 0.8,
  },
  bgCloud2: {
    position: 'absolute',
    bottom: -30,
    right: -40,
    opacity: 0.6,
  },
  // Setup Overlay
  setupOverlay: {
    flex: 1,
    backgroundColor: colors.theme === 'dark' ? 'rgba(26, 34, 41, 0.8)' : 'rgba(20, 108, 148, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  setupCard: {
    backgroundColor: colors.cardBg,
    width: '100%',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.tint,
    textAlign: 'center',
    marginBottom: 10,
  },
  setupText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  submitBtn: {
    backgroundColor: colors.theme === 'dark' ? colors.secondary : colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 30,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReadingTrackerComponent;