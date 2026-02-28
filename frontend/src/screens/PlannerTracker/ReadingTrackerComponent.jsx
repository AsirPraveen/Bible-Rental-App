import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [completedChapters, setCompletedChapters] = useState({});
  const [expandedBook, setExpandedBook] = useState(null);
  const [expandedTestament, setExpandedTestament] = useState('Old Testament');

  useEffect(() => {
    loadCompletedChapters();
  }, []);

  const loadCompletedChapters = async () => {
    try {
      const savedCompleted = await AsyncStorage.getItem('completedChapters');
      if (savedCompleted) setCompletedChapters(JSON.parse(savedCompleted));
    } catch (error) {
      console.error('Error loading completed chapters:', error);
    }
  };

  const saveCompletedChapters = async (chapters) => {
    try {
      await AsyncStorage.setItem('completedChapters', JSON.stringify(chapters));
      setCompletedChapters(chapters);
    } catch (error) {
      console.error('Error saving completed chapters:', error);
    }
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

  const getTotalProgress = () => {
    const total = Object.values(BIBLE_STRUCTURE).reduce((sum, books) => 
      sum + Object.values(books).reduce((s, ch) => s + ch, 0), 0
    );
    const completed = Object.values(completedChapters).filter(v => v).length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
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

  const getProgressColor = (percentage) => {
    if (percentage === 100) return '#4CAF50'; // Green
    if (percentage >= 75) return '#8BC34A'; // Light green
    if (percentage >= 50) return '#FF9800'; // Orange
    if (percentage >= 25) return '#FFC107'; // Amber
    if (percentage > 0) return '#2196F3'; // Blue
    return '#AFD3E2'; // Light blue (default)
  };

  const progress = getTotalProgress();

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Chapter Tracker</Text>
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
              backgroundColor: getProgressColor(progress.percentage)
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
                                  { backgroundColor: getProgressColor(bookProgress) }
                                ]}>
                                  <Text style={styles.bookProgressText}>{bookProgress}%</Text>
                                </View>
                                {isBookExpanded ? (
                                  <ChevronUp color="#146C94" size={20} />
                                ) : (
                                  <ChevronDown color="#146C94" size={20} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    elevation: 6,
    shadowColor: '#000',
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
    color: '#146C94',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  overallProgressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E0E0E0',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
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
    color: '#146C94',
    marginBottom: 4,
  },
  bookSubtitle: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: '#AFD3E2',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  markAllButtonText: {
    color: '#146C94',
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
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  chapterBoxCompleted: {
    backgroundColor: '#146C94',
    borderColor: '#19A7CE',
  },
  chapterNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  chapterNumberCompleted: {
    color: '#F6F1F1',
  },
});

export default ReadingTrackerComponent;