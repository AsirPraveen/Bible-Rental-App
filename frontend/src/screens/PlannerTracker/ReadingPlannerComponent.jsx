import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, CheckCircle, Circle, Plus, Trash2, X, Shuffle, List, Gem, Trophy, Cloud, History, PlusCircle, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.13:5001';

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

// Generate reading plan with continuous chapters
const generateContinuousReadingPlan = (days, scope = ['Old Testament', 'New Testament']) => {
  const allChapters = [];
  Object.entries(BIBLE_STRUCTURE).forEach(([testament, books]) => {
    if (scope.includes(testament)) {
      Object.entries(books).forEach(([book, chapters]) => {
        for (let i = 1; i <= chapters; i++) {
          allChapters.push({ book, chapter: i, testament });
        }
      });
    }
  });

  const totalChapters = allChapters.length;
  const chaptersPerDay = Math.ceil(totalChapters / days);
  const plan = [];

  for (let day = 1; day <= days; day++) {
    const startIdx = (day - 1) * chaptersPerDay;
    const endIdx = Math.min(startIdx + chaptersPerDay, totalChapters);
    plan.push({
      day,
      readings: allChapters.slice(startIdx, endIdx),
      completed: false
    });
  }

  return plan;
};

// Generate reading plan with mixed chapters from different books
const generateMixedReadingPlan = (days, scope = ['Old Testament', 'New Testament']) => {
  // Create arrays for each book's chapters
  const bookChapters = [];
  Object.entries(BIBLE_STRUCTURE).forEach(([testament, books]) => {
    if (scope.includes(testament)) {
      Object.entries(books).forEach(([book, chapters]) => {
        const chaptersArray = [];
        for (let i = 1; i <= chapters; i++) {
          chaptersArray.push({ book, chapter: i, testament });
        }
        bookChapters.push({
          book,
          testament,
          chapters: chaptersArray,
          currentIndex: 0
        });
      });
    }
  });

  const totalChapters = bookChapters.reduce((sum, b) => sum + b.chapters.length, 0);
  const chaptersPerDay = Math.ceil(totalChapters / days);
  const plan = [];

  // Shuffle books array to randomize starting points
  const shuffledBooks = [...bookChapters].sort(() => Math.random() - 0.5);
  let currentBookIndex = 0;

  for (let day = 1; day <= days; day++) {
    const dayReadings = [];
    let chaptersAssigned = 0;

    while (chaptersAssigned < chaptersPerDay) {
      // Find next book that still has chapters
      let attempts = 0;
      while (attempts < shuffledBooks.length) {
        const book = shuffledBooks[currentBookIndex];
        
        if (book.currentIndex < book.chapters.length) {
          // Add chapter from this book
          dayReadings.push(book.chapters[book.currentIndex]);
          book.currentIndex++;
          chaptersAssigned++;
          break;
        }
        
        // Move to next book
        currentBookIndex = (currentBookIndex + 1) % shuffledBooks.length;
        attempts++;
      }

      // If all books exhausted, break
      if (attempts >= shuffledBooks.length) {
        break;
      }

      // Move to next book for variety
      currentBookIndex = (currentBookIndex + 1) % shuffledBooks.length;
    }

    if (dayReadings.length > 0) {
      plan.push({
        day,
        readings: dayReadings,
        completed: false
      });
    }
  }

  return plan;
};

const ReadingPlannerComponent = () => {
  const [activePlans, setActivePlans] = useState([]);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showPlanTypeModal, setShowPlanTypeModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [selectedDayReading, setSelectedDayReading] = useState(null);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [selectedScope, setSelectedScope] = useState(['Old Testament', 'New Testament']);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    loadSavedPlans();
  }, []);

  const loadSavedPlans = async () => {
    try {
      const savedPlans = await AsyncStorage.getItem('bibleReadingPlans');
      if (savedPlans) setActivePlans(JSON.parse(savedPlans));
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const savePlans = async (plans) => {
    try {
      await AsyncStorage.setItem('bibleReadingPlans', JSON.stringify(plans));
      setActivePlans(plans);
      
      // Perform silent background sync of reading stats to the cloud for Admin Analytics
      syncReadingStatsToCloud(plans);
    } catch (error) {
      console.error('Error saving plans:', error);
    }
  };

  const syncReadingStatsToCloud = async (plans) => {
    try {
      // Calculate total chapters read across all plans
      let totalChaptersRead = 0;
      plans.forEach(p => {
        p.plan.forEach(day => {
          if (day.completed) {
            totalChaptersRead += day.readings.length;
          }
        });
      });

      // Fetch user ID (defaulting back to anonymous storage if needed, though this helps Admins see active user count)
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // First get user ID
        const userRes = await axios.get(`${apiUrl}/api/auth/userdata`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (userRes.data && userRes.data.data && userRes.data.data._id) {
          const planProgress = plans.map(p => {
            const completedDays = p.plan.filter(d => d.completed).length;
            const currentDay = Math.min(completedDays + 1, p.days);
            const isCompletedToday = p.plan.find(d => d.day === currentDay)?.completed || false;
            
            return {
              planId: p.id,
              currentDay: currentDay,
              completedToday: isCompletedToday,
              lastStatusUpdate: new Date().toISOString().split('T')[0]
            };
          });

          await axios.post(`${apiUrl}/api/reading-tracker/sync`, {
            userId: userRes.data.data._id,
            totalChaptersRead: totalChaptersRead,
            activePlans: plans.length,
            planProgress: planProgress
          });
        }
      }
    } catch (error) {
      // Fail silently to not disrupt the user's offline reading experience
      console.log('Background sync skipped:', error.message);
    }
  };

  const selectScope = (scope) => {
    setSelectedScope(scope);
    setShowScopeModal(false);
    setShowNewPlanModal(true);
  };

  const selectDuration = (duration) => {
    setSelectedDuration(duration);
    setShowNewPlanModal(false);
    setShowPlanTypeModal(true);
  };

  const getApproxChaptersPerDay = (duration) => {
    const daysMap = { '1 Month': 30, '3 Months': 90, '6 Months': 180, '1 Year': 365 };
    const days = daysMap[duration];
    
    let totalChapters = 0;
    Object.entries(BIBLE_STRUCTURE).forEach(([testament, books]) => {
      if (selectedScope.includes(testament)) {
        Object.values(books).forEach(ch => {
          totalChapters += ch;
        });
      }
    });

    const perDay = Math.ceil(totalChapters / days);
    return `~${perDay} chapters/day`;
  };

  const createNewPlan = (planType) => {
    const daysMap = { '1 Month': 30, '3 Months': 90, '6 Months': 180, '1 Year': 365 };
    const days = daysMap[selectedDuration];
    
    const plan = planType === 'mixed' 
      ? generateMixedReadingPlan(days, selectedScope)
      : generateContinuousReadingPlan(days, selectedScope);
    
    // Create Scope Name (Whole Bible, OT only, NT only)
    let scopeName = "Whole Bible";
    if (selectedScope.length === 1) {
      scopeName = selectedScope[0];
    }

    const planTypeName = planType === 'mixed' ? 'Mixed' : 'Continuous';
    
    const newPlan = {
      id: Date.now().toString(),
      name: `${scopeName}: ${selectedDuration} (${planTypeName})`,
      duration: selectedDuration,
      scope: selectedScope,
      planType,
      days,
      startDate: new Date().toISOString(),
      plan: plan,
      currentDay: 1
    };

    savePlans([newPlan, ...activePlans]);
    setShowPlanTypeModal(false);
    setSelectedDuration(null);
    Alert.alert('Success', `${scopeName}: ${selectedDuration} ${planTypeName.toLowerCase()} plan created!`);
  };

  const toggleDayComplete = (planId, day, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    const updatedPlans = activePlans.map(plan => {
      if (plan.id === planId) {
        const updatedPlan = plan.plan.map(d => 
          d.day === day ? { ...d, completed: !d.completed } : d
        );
        return { ...plan, plan: updatedPlan };
      }
      return plan;
    });
    savePlans(updatedPlans);
  };

  const openReadingModal = (dayPlan, planId) => {
    setSelectedDayReading({ ...dayPlan, planId });
    setShowReadingModal(true);
  };

  const deletePlan = (planId) => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this reading plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = activePlans.filter(p => p.id !== planId);
            savePlans(updated);
            if (expandedPlanId === planId) setExpandedPlanId(null);
          }
        }
      ]
    );
  };

  const getDaysToShow = (plan) => {
    const completedDays = plan.plan.filter(d => d.completed).length;
    const currentDayIndex = completedDays;
    
    const startIndex = Math.max(0, currentDayIndex - 5);
    const endIndex = Math.min(plan.plan.length, startIndex + 10);
    
    return plan.plan.slice(startIndex, endIndex);
  };

  const groupReadingsByTestament = (readings) => {
    const grouped = { 'Old Testament': [], 'New Testament': [] };
    readings.forEach(reading => {
      grouped[reading.testament].push(reading);
    });
    return grouped;
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <Text style={styles.headerText}>Reading Plans</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerIconBtn} 
                onPress={() => setShowScopeModal(true)}
              >
                <Plus color="#F6F1F1" size={26} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIconBtn} 
                onPress={() => setShowHistoryModal(true)}
              >
                <History color="#F6F1F1" size={26} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.subtitleText}>Complete the Bible with structured daily readings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            {activePlans.filter(p => {
              const completedDays = p.plan.filter(d => d.completed).length;
              return Math.round((completedDays / p.days) * 100) < 100;
            }).length === 0 ? (
              <View style={styles.emptyState}>
                <BookOpen color="#F6F1F1" size={80} />
                <Text style={styles.emptyStateText}>No Active Plans</Text>
                <Text style={styles.emptyStateSubtext}>
                  {activePlans.length > 0 ? "You've finished all your plans! Check history." : "Start your Bible reading journey today!"}
                </Text>
              </View>
            ) : (
              activePlans.filter(p => {
                const completedDays = p.plan.filter(d => d.completed).length;
                return Math.round((completedDays / p.days) * 100) < 100;
              }).map(plan => {
                const completedDays = plan.plan.filter(d => d.completed).length;
                const progress = Math.round((completedDays / plan.days) * 100);
                const isExpanded = expandedPlanId === plan.id;
                const daysToShow = isExpanded ? plan.plan : getDaysToShow(plan);

                return (
                  <View key={plan.id} style={styles.planCard}>
                    <View style={styles.planHeader}>
                      <View style={styles.planTitleContainer}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planDays}>
                          Day {Math.min(completedDays + 1, plan.days)} of {plan.days}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => deletePlan(plan.id)}
                        style={styles.deleteButton}
                      >
                        <Trash2 color="#E74C3C" size={20} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${progress}%` }]} />
                      </View>
                      <Text style={styles.progressLabel}>{progress}% Complete</Text>
                    </View>

                    <View style={styles.daysContainer}>
                      {daysToShow.map(dayPlan => (
                        <TouchableOpacity
                          key={dayPlan.day}
                          style={[
                            styles.dayItem,
                            dayPlan.completed && styles.dayItemCompleted
                          ]}
                          onPress={() => openReadingModal(dayPlan, plan.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.dayInfo}>
                            <TouchableOpacity 
                              style={styles.checkboxContainer}
                              onPress={(e) => {
                                e.stopPropagation();
                                toggleDayComplete(plan.id, dayPlan.day);
                              }}
                            >
                              {dayPlan.completed ? (
                                <CheckCircle color="#4CAF50" size={24} />
                              ) : (
                                <Circle color="#146C94" size={24} />
                              )}
                            </TouchableOpacity>
                            <View style={styles.dayTextContainer}>
                              <Text style={styles.dayNumber}>Day {dayPlan.day}</Text>
                              <Text style={styles.readingText} numberOfLines={2}>
                                {dayPlan.readings.slice(0, 3).map(r => `${r.book} ${r.chapter}`).join(', ')}
                                {dayPlan.readings.length > 3 && ` +${dayPlan.readings.length - 3} more`}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {!isExpanded && plan.plan.length > 10 && (
                      <TouchableOpacity
                        style={styles.showMoreButton}
                        onPress={() => setExpandedPlanId(plan.id)}
                      >
                        <Text style={styles.showMoreText}>Show All Days ({plan.plan.length})</Text>
                      </TouchableOpacity>
                    )}

                    {isExpanded && (
                      <TouchableOpacity
                        style={styles.showMoreButton}
                        onPress={() => setExpandedPlanId(null)}
                      >
                        <Text style={styles.showMoreText}>Show Less</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Reading Details Modal */}
        <Modal
          visible={showReadingModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowReadingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.readingModalContainer}>
              <View style={styles.readingModalHeader}>
                <View style={styles.readingModalTitleContainer}>
                  <Text style={styles.readingModalTitle}>
                    Day {selectedDayReading?.day} Reading
                  </Text>
                  <Text style={styles.readingModalSubtitle}>
                    {selectedDayReading?.readings.length} chapters to read
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowReadingModal(false)}
                  style={styles.closeButton}
                >
                  <X color="#146C94" size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.readingModalContent}>
                {selectedDayReading && (() => {
                  const grouped = groupReadingsByTestament(selectedDayReading.readings);
                  return (
                    <>
                      {Object.entries(grouped).map(([testament, readings]) => (
                        readings.length > 0 && (
                          <View key={testament} style={styles.testamentSection}>
                            <Text style={styles.testamentTitle}>{testament}</Text>
                            <View style={styles.chaptersGrid}>
                              {readings.map((reading, idx) => (
                                <View key={idx} style={styles.chapterCard}>
                                  <Text style={styles.chapterBookName}>{reading.book}</Text>
                                  <Text style={styles.chapterNumber}>Chapter {reading.chapter}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )
                      ))}
                    </>
                  );
                })()}
              </ScrollView>

              <View style={styles.readingModalFooter}>
                {(() => {
                  const plan = activePlans.find(p => p.id === selectedDayReading?.planId);
                  const completedDays = plan?.plan.filter(d => d.completed).length || 0;
                  const isFinished = Math.round((completedDays / (plan?.days || 1)) * 100) === 100;
                  
                  if (isFinished) return null;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.markCompleteButton,
                        selectedDayReading?.completed && styles.markCompleteButtonActive
                      ]}
                      onPress={() => {
                        if (selectedDayReading) {
                          toggleDayComplete(selectedDayReading.planId, selectedDayReading.day);
                          setSelectedDayReading({
                            ...selectedDayReading,
                            completed: !selectedDayReading.completed
                          });
                        }
                      }}
                    >
                      {selectedDayReading?.completed ? (
                        <CheckCircle color="#FFFFFF" size={20} />
                      ) : (
                        <Circle color="#FFFFFF" size={20} />
                      )}
                      <Text style={styles.markCompleteButtonText}>
                        {selectedDayReading?.completed ? 'Completed' : 'Mark as Complete'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </View>
          </View>
        </Modal>

        {/* Testament Scope Selection Modal */}
        <Modal
          visible={showScopeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowScopeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>What would you like to read?</Text>
              <Text style={styles.modalSubtitle}>Choose the scope of your reading journey</Text>
              
              <TouchableOpacity
                style={[
                  styles.scopeButton,
                  selectedScope.length === 2 && styles.scopeButtonActive
                ]}
                onPress={() => selectScope(['Old Testament', 'New Testament'])}
              >
                <View style={styles.scopeIconContainer}>
                  <BookOpen color="#FFFFFF" size={28} />
                </View>
                <View style={styles.scopeTextContainer}>
                  <Text style={styles.scopeTitle}>Whole Bible</Text>
                  <Text style={styles.scopeDescription}>All 66 books from Genesis to Revelation</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeButton,
                  selectedScope.length === 1 && selectedScope[0] === 'Old Testament' && styles.scopeButtonActive
                ]}
                onPress={() => selectScope(['Old Testament'])}
              >
                <View style={styles.scopeIconContainer}>
                  <Trophy color="#FFFFFF" size={28} />
                </View>
                <View style={styles.scopeTextContainer}>
                  <Text style={styles.scopeTitle}>Old Testament Only</Text>
                  <Text style={styles.scopeDescription}>Genesis to Malachi (39 books)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeButton,
                  selectedScope.length === 1 && selectedScope[0] === 'New Testament' && styles.scopeButtonActive
                ]}
                onPress={() => selectScope(['New Testament'])}
              >
                <View style={styles.scopeIconContainer}>
                  <Gem color="#FFFFFF" size={28} />
                </View>
                <View style={styles.scopeTextContainer}>
                  <Text style={styles.scopeTitle}>New Testament Only</Text>
                  <Text style={styles.scopeDescription}>Matthew to Revelation (27 books)</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowScopeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Duration Selection Modal */}
        <Modal
          visible={showNewPlanModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowNewPlanModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Choose Your Reading Plan</Text>
              <Text style={styles.modalSubtitle}>Select a duration to complete the entire Bible</Text>
              
              {['1 Month', '3 Months', '6 Months', '1 Year'].map(duration => (
                <TouchableOpacity
                  key={duration}
                  style={styles.durationButton}
                  onPress={() => selectDuration(duration)}
                >
                  <Text style={styles.durationButtonText}>{duration}</Text>
                  <Text style={styles.durationSubtext}>
                    {getApproxChaptersPerDay(duration)}
                  </Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNewPlanModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Plan Type Selection Modal */}
        <Modal
          visible={showPlanTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowPlanTypeModal(false);
            setSelectedDuration(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Choose Reading Style</Text>
              <Text style={styles.modalSubtitle}>
                How would you like your chapters organized?
              </Text>

              <TouchableOpacity
                style={styles.planTypeButton}
                onPress={() => createNewPlan('continuous')}
              >
                <View style={styles.planTypeIconContainer}>
                  <List color="#FFFFFF" size={28} />
                </View>
                <View style={styles.planTypeTextContainer}>
                  <Text style={styles.planTypeTitle}>Continuous Chapters</Text>
                  <Text style={styles.planTypeDescription}>
                    Read books sequentially from beginning to end
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.planTypeButton}
                onPress={() => createNewPlan('mixed')}
              >
                <View style={styles.planTypeIconContainer}>
                  <Shuffle color="#FFFFFF" size={28} />
                </View>
                <View style={styles.planTypeTextContainer}>
                  <Text style={styles.planTypeTitle}>Mixed Chapters</Text>
                  <Text style={styles.planTypeDescription}>
                    Read from different books each day for variety and engagement
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPlanTypeModal(false);
                  setSelectedDuration(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* History / Completed Plans Modal */}
        <Modal
          visible={showHistoryModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowHistoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.historyModalContainer}>
              <View style={styles.historyHeader}>
                <View style={styles.historyTitleRow}>
                  <History color="#146C94" size={24} />
                  <Text style={styles.historyTitle}>Finished Journeys</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowHistoryModal(false)}
                  style={styles.historyCloseBtn}
                >
                  <X color="#146C94" size={20} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
                {activePlans.filter(p => {
                  const completedDays = p.plan.filter(d => d.completed).length;
                  return Math.round((completedDays / p.days) * 100) === 100;
                }).length === 0 ? (
                  <View style={styles.emptyHistory}>
                    <Trophy color="#AFD3E2" size={80} />
                    <Text style={styles.emptyHistoryText}>Your First Trophy Awaits!</Text>
                    <Text style={styles.emptyHistorySub}>Finish any reading plan to see it archived here as a heavenly treasure.</Text>
                  </View>
                ) : (
                  activePlans.filter(p => {
                    const completedDays = p.plan.filter(d => d.completed).length;
                    return Math.round((completedDays / p.days) * 100) === 100;
                  }).map(plan => (
                    <View key={plan.id} style={styles.historyPlanCard}>
                      <View style={styles.historyCardTop}>
                        <View style={styles.historyIconWrapper}>
                          <CheckCircle color="#FFFFFF" size={24} />
                        </View>
                        <View style={styles.historyInfo}>
                          <Text style={styles.historyPlanName}>{plan.name}</Text>
                          <View style={styles.historyDateRow}>
                            <Calendar color="#888" size={12} />
                            <Text style={styles.historyPlanDetail}>Completed Today</Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.historyDeleteAction}
                          onPress={() => deletePlan(plan.id)}
                        >
                          <Trash2 color="#E74C3C" size={18} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.historyCardDivider} />

                      <View style={styles.historyCardBottom}>
                        <TouchableOpacity 
                          style={styles.historyViewBtn}
                          onPress={() => setExpandedPlanId(plan.id === expandedPlanId ? null : plan.id)}
                        >
                          <Text style={styles.historyViewText}>
                            {expandedPlanId === plan.id ? "Hide Journey" : "View Journey Details"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {expandedPlanId === plan.id && (
                        <View style={styles.historyExpandedSection}>
                           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyDaysRow}>
                             {plan.plan.map(dayPlan => (
                               <TouchableOpacity 
                                 key={dayPlan.day} 
                                 style={styles.historyDayBadge}
                                 onPress={() => openReadingModal(dayPlan, plan.id)}
                                >
                                 <CheckCircle color="#4CAF50" size={12} />
                                 <Text style={styles.historyDayBadgeText}>Day {dayPlan.day}</Text>
                               </TouchableOpacity>
                             ))}
                           </ScrollView>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
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
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#F6F1F1',
    textAlign: 'center',
    opacity: 0.9,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6F1F1',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#F6F1F1',
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 4,
  },
  planDays: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 14,
    color: '#146C94',
    fontWeight: '600',
    textAlign: 'right',
  },
  daysContainer: {
    marginBottom: 12,
  },
  dayItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#19A7CE',
  },
  dayItemCompleted: {
    backgroundColor: '#E8F5E9',
    borderLeftColor: '#4CAF50',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 12,
    padding: 4,
  },
  dayTextContainer: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#146C94',
    marginBottom: 4,
  },
  readingText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  showMoreButton: {
    backgroundColor: '#AFD3E2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  showMoreText: {
    color: '#146C94',
    fontSize: 14,
    fontWeight: '600',
  },
  newPlanButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F6F1F1',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  newPlanButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F6F1F1',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#146C94',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  durationButton: {
    backgroundColor: '#146C94',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
  },
  durationButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F6F1F1',
    marginBottom: 4,
  },
  durationSubtext: {
    fontSize: 12,
    color: '#AFD3E2',
  },
  scopeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  scopeButtonActive: {
    borderColor: '#146C94',
    backgroundColor: '#E3F2FD',
  },
  scopeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#146C94',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scopeTextContainer: {
    flex: 1,
  },
  scopeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 2,
  },
  scopeDescription: {
    fontSize: 12,
    color: '#666',
  },
  planTypeButton: {
    backgroundColor: '#146C94',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  planTypeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  planTypeTextContainer: {
    flex: 1,
  },
  planTypeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F6F1F1',
    marginBottom: 6,
  },
  planTypeDescription: {
    fontSize: 13,
    color: '#AFD3E2',
    lineHeight: 18,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  historyModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    width: '98%',
    maxHeight: '90%',
    padding: 20,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#146C94',
  },
  historyCloseBtn: {
    backgroundColor: '#F0F9FF',
    padding: 6,
    borderRadius: 15,
  },
  historyScroll: {
    flexGrow: 0,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyHistorySub: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyPlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  historyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyPlanName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#146C94',
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  historyPlanDetail: {
    fontSize: 11,
    color: '#888',
  },
  historyDeleteAction: {
    padding: 8,
  },
  historyCardDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  historyCardBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  historyViewBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  historyViewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#146C94',
    textDecorationLine: 'underline',
  },
  historyExpandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  historyDaysRow: {
    flexDirection: 'row',
  },
  historyDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  historyDayBadgeText: {
    fontSize: 11,
    color: '#146C94',
    fontWeight: '600',
  },
  readingModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  readingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  readingModalTitleContainer: {
    flex: 1,
  },
  readingModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 4,
  },
  readingModalSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 4,
  },
  readingModalContent: {
    padding: 20,
    maxHeight: 400,
  },
  testamentSection: {
    marginBottom: 24,
  },
  testamentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 12,
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  chapterCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    margin: 6,
    minWidth: '28%',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#19A7CE',
  },
  chapterBookName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#146C94',
    marginBottom: 4,
    textAlign: 'center',
  },
  chapterNumber: {
    fontSize: 11,
    color: '#666',
  },
  readingModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  markCompleteButton: {
    backgroundColor: '#146C94',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCompleteButtonActive: {
    backgroundColor: '#4CAF50',
  },
  markCompleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default ReadingPlannerComponent;