import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image, ScrollView, Modal, TouchableOpacity, Dimensions, SafeAreaView, Platform, StatusBar, Animated, FlatList, Pressable } from 'react-native';
import { Button } from 'react-native-paper';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import DropDownPicker from 'react-native-dropdown-picker';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import LoadingScreen from '../../components/LoadingScreen';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import _tamilBibleData from '../../assets/offline-bible/tamil_bible.json';
const tamilBibleData = _tamilBibleData as any[];
import _bookTranslations from '../../assets/offline-bible/book_translations.json';
const bookTranslations = _bookTranslations as any;
import * as Speech from 'expo-speech';
import Svg, { Rect, Path } from 'react-native-svg';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const STABILITY_API_KEY = Constants.expoConfig?.extra?.stabilityApiKey ?? '';
const STABILITY_API_URL = Constants.expoConfig?.extra?.stabilityApiUrl ?? '';

const HIGHLIGHT_COLORS = [
  { name: 'yellow', colorVal: 'rgba(250, 204, 21, 0.3)' },
  { name: 'green', colorVal: 'rgba(74, 222, 128, 0.3)' },
  { name: 'blue', colorVal: 'rgba(56, 189, 248, 0.3)' },
  { name: 'pink', colorVal: 'rgba(244, 114, 182, 0.3)' },
  { name: 'orange', colorVal: 'rgba(251, 146, 60, 0.3)' },
];

const BibleComponent = () => {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const { isGuest } = useAuth();

  // State for Dropdowns
  const [language, setLanguage] = useState('Tamil');
  const [availableLanguages, setAvailableLanguages] = useState<{ label: string, value: string }[]>([]);

  const [books, setBooks] = useState<{ label: string, value: number, chapterCount: number }[]>([]);
  const [selectedBookNumber, setSelectedBookNumber] = useState(0); // Genesis default

  const [chapters, setChapters] = useState<{ label: string, value: number }[]>([]);
  const [selectedChapter, setSelectedChapter] = useState(1); // Chapter 1 default

  // Data State — versesCache stores fetched verses keyed by chapter number
  const [chapterVerses, setChapterVerses] = useState<{ verseNumber: number, text: string }[]>([]);
  const versesCache = useRef<Map<string, { verseNumber: number, text: string }[]>>(new Map());
  const [chapterListData, setChapterListData] = useState<number[]>([1]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Restoring persistent state flag
  const [isRestoring, setIsRestoring] = useState(true);

  // UI State for Modals & Dropdowns
  const [openLanguage, setOpenLanguage] = useState(false);
  const [openBook, setOpenBook] = useState(false);
  const [openChapter, setOpenChapter] = useState(false);

  const [selectedVerse, setSelectedVerse] = useState<{ verseNumber: number, text: string, citation: string } | null>(null);
  const [isVerseModalVisible, setIsVerseModalVisible] = useState(false);

  // Compare State
  const [isCompareModalVisible, setIsCompareModalVisible] = useState(false);
  const [compareLanguage, setCompareLanguage] = useState('English');
  const [compareVerseData, setCompareVerseData] = useState<{ text: string } | null>(null);
  const [openCompareLanguage, setOpenCompareLanguage] = useState(false);

  // Custom Dictionary Modal State
  const [isDictModalVisible, setIsDictModalVisible] = useState(false);
  const [dictWord, setDictWord] = useState('');
  const [dictMeaning, setDictMeaning] = useState('');
  const [dictSource, setDictSource] = useState('');
  const [confirmWord, setConfirmWord] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Generate Image State
  const [verseImage, setVerseImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [loadingMeaning, setLoadingMeaning] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [imageGenerationCredits, setImageGenerationCredits] = useState(5);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [underlinedWordIndices, setUnderlinedWordIndices] = useState<number[]>([]);
  const [verseFontSize, setVerseFontSize] = useState<number>(18);
  const [isImageGenEnabled, setIsImageGenEnabled] = useState(true);
  const [showProgressBarSetting, setShowProgressBarSetting] = useState(true);

  // Copied state
  const [isCopied, setIsCopied] = useState(false);

  // Local saved generated images state
  const [localImageVerses, setLocalImageVerses] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [likedVerses, setLikedVerses] = useState<any[]>([]);

  // FlatList Swipe Paging Ref
  const flatListRef = useRef<FlatList>(null);
  const lastScrolledChapterRef = useRef(1);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ──────────────── TTS Audio Player State ────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cardLayout, setCardLayout] = useState({ width: 0, height: 0 });
  const [speechRate, setSpeechRate] = useState(0.9); // TTS speed: 0.5 slow → 1.5 fast
  const speechRateRef = useRef(0.9); // stable ref for inside speakVerse callback
  const isSpeakingRef = useRef(false);
  const playRequestRef = useRef(false); // tracks if we want speech to continue
  const currentVerseIndexRef = useRef(0);
  const autoPlayPendingRef = useRef(false); // signals next chapter should auto-start
  const playerBarAnim = useRef(new Animated.Value(100)).current;
  // stable ref so handleVerseSelect can call speakVerse before it's declared
  const speakVerseRef = useRef<((verses: { verseNumber: number; text: string }[], index: number) => void) | null>(null);
  // stores real Y position of each verse row measured via onLayout
  const verseLayoutsRef = useRef<number[]>([]);
  const scrollViewHeightRef = useRef(400); // visible height of the reader card

  // Initialize Data (Token, Credits, Languages, Saved Progress)
  useEffect(() => {
    const initialize = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          setUserToken(token);
          fetchUserData(token);
        } else {
          // Guest mode — Bible works without a token, just no image credits
          console.log('[Bible] Guest mode — skipping user data fetch');
        }

        // Fetch App Settings
        try {
          const settingsRes = await axios.get(`${API_URL}/api/app-settings`);
          if (settingsRes.data.status === 'Success') {
            setIsImageGenEnabled(settingsRes.data.data.isImageGenEnabled !== false);
          }
        } catch (settingsError) {
          console.log('Error fetching settings, defaulting to enabled:', settingsError);
        }

        // Fetch Languages
        try {
          const langRes = await axios.get(`${API_URL}/api/bible/languages`);
          if (langRes.data.status === 'Ok') {
            const rawLangs = Array.isArray(langRes.data.data) ? langRes.data.data : [];
            const langs = rawLangs.map((l: any) => ({ label: l === 'Tamil' ? 'Tamil (Offline)' : l, value: l }));

            // Always ensure Tamil (Offline) is present in the list
            if (!langs.some((l: any) => l.value === 'Tamil')) {
              langs.push({ label: 'Tamil (Offline)', value: 'Tamil' });
            }

            langs.sort((a: any, b: any) => {
              const valA = a.value;
              const valB = b.value;
              if (valA === 'Tamil') return -1;
              if (valB === 'Tamil') return 1;
              if (valA === 'English') return -1;
              if (valB === 'English') return 1;
              return valA.localeCompare(valB);
            });
            setAvailableLanguages(langs);
          }
        } catch (langError) {
          console.log('Error fetching languages (offline mode active):', langError);
          setAvailableLanguages([{ label: 'Tamil (Offline)', value: 'Tamil' }]);
        }

        // Check AsyncStorage for saved position
        const savedProgressStr = await AsyncStorage.getItem('@bible_last_reading');
        if (savedProgressStr) {
          const savedProgress = JSON.parse(savedProgressStr);
          if (savedProgress.language && savedProgress.bookNumber !== undefined && savedProgress.chapterNumber !== undefined) {
            setLanguage(savedProgress.language);
            setSelectedBookNumber(savedProgress.bookNumber);
            setSelectedChapter(savedProgress.chapterNumber);
            scrollPositionRef.current = savedProgress.scrollY || 0;
          }
        }

        // Check AsyncStorage for saved font size
        const savedFontSize = await AsyncStorage.getItem('@bible_font_size');
        if (savedFontSize) {
          setVerseFontSize(parseInt(savedFontSize, 10));
        }

        // Fetch saved generated images
        const savedGenImages = await AsyncStorage.getItem('@bible_generated_images');
        if (savedGenImages) {
          setLocalImageVerses(JSON.parse(savedGenImages));
        }

        // Fetch saved highlights
        const savedHighlights = await AsyncStorage.getItem('@bible_highlights');
        if (savedHighlights) {
          setHighlights(JSON.parse(savedHighlights));
        }

        // Fetch saved liked verses
        const savedLikedVerses = await AsyncStorage.getItem('@liked_verses');
        if (savedLikedVerses) {
          setLikedVerses(JSON.parse(savedLikedVerses));
        }
      } catch (error) {
        console.error('Error during initialization:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    initialize();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadProgressSetting = async () => {
        try {
          const savedShowProgress = await AsyncStorage.getItem('@bible_show_progress_bar');
          if (savedShowProgress !== null) {
            setShowProgressBarSetting(savedShowProgress === 'true');
          } else {
            setShowProgressBarSetting(true);
          }
        } catch (e) {
          console.error('[Bible] Error loading show progress setting:', e);
        }
      };
      loadProgressSetting();
    }, [])
  );

  const fetchUserData = async (token: any) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      if (response.data.status === 'Ok') {
        const data = response.data.data;
        setImageGenerationCredits(data.image_generation_credits_available ?? 5);
        if (data.likedVerses) {
          setLikedVerses(data.likedVerses);
          await AsyncStorage.setItem('@liked_verses', JSON.stringify(data.likedVerses));
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Logic: When language changes -> Reset book to Genesis, chapter to 1 
  // ONLY if not restoring from AsyncStorage
  const handleLanguageChange = (val: any) => {
    if (val !== language && !isRestoring) {
      versesCache.current.clear();
      setLanguage(val);
      setSelectedBookNumber(0);
      setSelectedChapter(1);
      setChapterListData([1]);
      lastScrolledChapterRef.current = 1;
      scrollPositionRef.current = 0; // Reset scroll
    } else {
      setLanguage(val);
    }
  };

  // Logic: When book changes -> Reset chapter to 1
  const handleBookChange = (val: any) => {
    if (val !== selectedBookNumber && !isRestoring) {
      versesCache.current.clear();
      setSelectedBookNumber(val);
      setSelectedChapter(1);
      setChapterListData([1]);
      lastScrolledChapterRef.current = 1;
      scrollPositionRef.current = 0; // Reset scroll
    } else {
      setSelectedBookNumber(val);
    }
  };

  // Fetch books when language changes
  useEffect(() => {
    const fetchBooks = async () => {
      if (!language || isRestoring) return;

      if (language === 'Tamil') {
        const booksMap = new Map();
        tamilBibleData.forEach((chapter: any) => {
          if (!booksMap.has(chapter.bookNumber)) {
            const localizedName = bookTranslations['Tamil'] ? bookTranslations['Tamil'][chapter.bookNumber] : chapter.bookName;
            booksMap.set(chapter.bookNumber, {
              label: localizedName || chapter.bookName,
              value: chapter.bookNumber,
              chapterCount: chapter.chapterNumber
            });
          } else {
            const existing = booksMap.get(chapter.bookNumber);
            if (chapter.chapterNumber > existing.chapterCount) {
              existing.chapterCount = chapter.chapterNumber;
            }
          }
        });
        const booksData = Array.from(booksMap.values())
          .sort((a: any, b: any) => a.value - b.value)
          .map((b: any) => ({
            ...b,
            containerStyle: b.value === 38 ? { borderBottomWidth: 2, borderBottomColor: colors.secondary, paddingBottom: 8, marginBottom: 4 } : undefined
          }));
        setBooks(booksData);
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/api/bible/books`, { params: { language } });
        if (res.data.status === 'Ok') {
          const booksData = res.data.data.map((b: any) => {
            const localizedName = bookTranslations[language] ? bookTranslations[language][b.bookNumber] : b.bookName;
            return {
              label: localizedName || b.bookName,
              value: b.bookNumber,
              chapterCount: b.chapterCount,
              containerStyle: b.bookNumber === 38 ? { borderBottomWidth: 2, borderBottomColor: colors.secondary, paddingBottom: 8, marginBottom: 4 } : undefined
            };
          });
          setBooks(booksData);
        }
      } catch (error) {
        console.error('Error fetching books:', error);
      }
    };
    fetchBooks();
  }, [language, isRestoring]);

  // Update chapters when a book is selected
  useEffect(() => {
    if (selectedBookNumber !== null && books.length > 0) {
      const selectedBook = books.find((b: any) => b.value === selectedBookNumber);
      if (selectedBook) {
        const chapterList = Array.from({ length: selectedBook.chapterCount }, (_, i) => ({
          label: `Chapter ${i + 1}`,
          value: i + 1,
        }));
        setChapters(chapterList);
        // Build array of chapter numbers for FlatList
        setChapterListData(Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1));
      }
    }
  }, [selectedBookNumber, books]);

  // Fetch verses
  useEffect(() => {
    let active = true;
    const fetchChapter = async () => {
      if (isRestoring) return;

      if (language && selectedBookNumber !== null && selectedChapter !== null) {
        const cacheKey = (ch: number) => `${language}_${selectedBookNumber}_${ch}`;
        
        // Only show loading if we don't have cached data for the current chapter
        const cachedCurrent = versesCache.current.get(cacheKey(selectedChapter));
        if (!cachedCurrent) {
          if (language !== 'Tamil') {
            setLoading(true);
            setChapterVerses([]); // Clear verses so spinner displays instantly
          }
        } else {
          // Use cached data immediately
          setChapterVerses(cachedCurrent);
        }

        if (language === 'Tamil') {
          // Current chapter
          const chapter = tamilBibleData.find((c: any) => c.language === 'Tamil' && c.bookNumber === selectedBookNumber && c.chapterNumber === selectedChapter);
          const currentVerses = chapter ? chapter.verses || [] : [];
          if (!active) return;
          versesCache.current.set(cacheKey(selectedChapter), currentVerses);
          setChapterVerses(currentVerses);

          // Previous chapter
          if (selectedChapter > 1) {
            const prevCh = tamilBibleData.find((c: any) => c.language === 'Tamil' && c.bookNumber === selectedBookNumber && c.chapterNumber === selectedChapter - 1);
            versesCache.current.set(cacheKey(selectedChapter - 1), prevCh ? prevCh.verses || [] : []);
          }

          // Next chapter
          const selectedBook = books.find((b: any) => b.value === selectedBookNumber);
          if (selectedBook && selectedChapter < selectedBook.chapterCount) {
            const nextCh = tamilBibleData.find((c: any) => c.language === 'Tamil' && c.bookNumber === selectedBookNumber && c.chapterNumber === selectedChapter + 1);
            versesCache.current.set(cacheKey(selectedChapter + 1), nextCh ? nextCh.verses || [] : []);
          }

          setSelectedVerse(null);
          setLoading(false);
          setInitialLoadDone(true);
          setTimeout(() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({ y: scrollPositionRef.current || 0, animated: false });
            }
          }, 100);
          return;
        }

        try {
          // Build requests — skip already-cached adjacent chapters
          const reqs: Promise<any>[] = [
            cachedCurrent
              ? Promise.resolve('__cached__')
              : axios.get(`${API_URL}/api/bible/chapter`, {
                  params: { language, bookNumber: selectedBookNumber, chapterNumber: selectedChapter }
                })
          ];

          if (selectedChapter > 1 && !versesCache.current.has(cacheKey(selectedChapter - 1))) {
            reqs.push(
              axios.get(`${API_URL}/api/bible/chapter`, {
                params: { language, bookNumber: selectedBookNumber, chapterNumber: selectedChapter - 1 }
              }).catch(() => null)
            );
          } else {
            reqs.push(Promise.resolve(null));
          }

          const selectedBook = books.find((b: any) => b.value === selectedBookNumber);
          if (selectedBook && selectedChapter < selectedBook.chapterCount && !versesCache.current.has(cacheKey(selectedChapter + 1))) {
            reqs.push(
              axios.get(`${API_URL}/api/bible/chapter`, {
                params: { language, bookNumber: selectedBookNumber, chapterNumber: selectedChapter + 1 }
              }).catch(() => null)
            );
          } else {
            reqs.push(Promise.resolve(null));
          }

          const results = await Promise.all(reqs);
          if (!active) return;

          // Current
          if (results[0] !== '__cached__') {
            if (results[0] && results[0].data && results[0].data.status === 'Ok') {
              const verses = results[0].data.data.verses || [];
              versesCache.current.set(cacheKey(selectedChapter), verses);
              setChapterVerses(verses);
            } else {
              versesCache.current.set(cacheKey(selectedChapter), []);
              setChapterVerses([]);
            }
          }

          // Prev
          if (results[1] && results[1].data && results[1].data.status === 'Ok') {
            versesCache.current.set(cacheKey(selectedChapter - 1), results[1].data.data.verses || []);
          }

          // Next
          if (results[2] && results[2].data && results[2].data.status === 'Ok') {
            versesCache.current.set(cacheKey(selectedChapter + 1), results[2].data.data.verses || []);
          }

          setSelectedVerse(null); // Clear selected verse on chapter switch
        } catch (error) {
          console.error('Error fetching chapters:', error);
          if (active) {
            setChapterVerses([]);
          }
        } finally {
          if (active) {
            setLoading(false);
            setInitialLoadDone(true);
            // Restore scroll position if any is pending
            setTimeout(() => {
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ y: scrollPositionRef.current || 0, animated: false });
              }
            }, 100);
          }
        }
      } else {
        if (active) {
          setLoading(false);
          setInitialLoadDone(true);
        }
      }
    };
    fetchChapter();
    return () => {
      active = false;
    };
  }, [language, selectedBookNumber, selectedChapter, isRestoring]);

  // Save current progress to AsyncStorage
  const saveProgress = async (scrollY: any) => {
    if (language && selectedBookNumber !== null && selectedChapter !== null) {
      try {
        const progress = {
          language,
          bookNumber: selectedBookNumber,
          chapterNumber: selectedChapter,
          scrollY
        };
        await AsyncStorage.setItem('@bible_last_reading', JSON.stringify(progress));
      } catch (e) {
        console.error('Failed to save progress', e);
      }
    }
  };

  const stateRef = useRef({ language, selectedBookNumber, selectedChapter });
  useEffect(() => {
    stateRef.current = { language, selectedBookNumber, selectedChapter };
  }, [language, selectedBookNumber, selectedChapter]);

  // Automatically save progress instantly whenever the reader state changes (e.g. on horizontal swipe)
  useEffect(() => {
    if (language && selectedBookNumber !== null && selectedChapter !== null && !isRestoring) {
      const saveStateProgress = async () => {
        try {
          const progress = {
            language,
            bookNumber: selectedBookNumber,
            chapterNumber: selectedChapter,
            scrollY: scrollPositionRef.current || 0
          };
          await AsyncStorage.setItem('@bible_last_reading', JSON.stringify(progress));
        } catch (e) {
          console.error('Failed to save progress on change', e);
        }
      };

      saveStateProgress();
    }
  }, [language, selectedBookNumber, selectedChapter, isRestoring]);

  // Save progress one final time on component unmount to catch any unsaved vertical scrolls
  useEffect(() => {
    return () => {
      const { language: currentLang, selectedBookNumber: currentBook, selectedChapter: currentCh } = stateRef.current;
      if (currentLang && currentBook !== null && currentCh !== null) {
        const progress = {
          language: currentLang,
          bookNumber: currentBook,
          chapterNumber: currentCh,
          scrollY: scrollPositionRef.current || 0
        };
        AsyncStorage.setItem('@bible_last_reading', JSON.stringify(progress)).catch((e) =>
          console.error('Failed to save progress on unmount', e)
        );
      }
    };
  }, []);

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    scrollPositionRef.current = scrollY; // Update ref immediately with latest scroll position
    const contentHeight = event.nativeEvent.contentSize.height;
    const containerHeight = event.nativeEvent.layoutMeasurement.height;

    if (contentHeight > containerHeight) {
      const progress = (scrollY / (contentHeight - containerHeight)) * 100;
      setScrollProgress(Math.max(0, Math.min(100, progress)));
    } else {
      setScrollProgress(0);
    }

    // Debounce the save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress(scrollY);
    }, 500);
  };

  const handleVerseSelect = (verse: any, index: number) => {
    const bookName = books.find((b: any) => b.value === selectedBookNumber)?.label || '';
    setVerseImage(null);
    setSelectedVerse({
      ...verse,
      citation: `${bookName} ${selectedChapter}:${verse.verseNumber}`
    });

    // Always update current verse index when selected
    currentVerseIndexRef.current = index;
    setCurrentVerseIndex(index);

    // Only start TTS if audio mode (showPlayer) is toggled ON
    if (showPlayer) {
      Speech.stop();
      playRequestRef.current = true;
      setIsPlaying(true);
      speakVerseRef.current?.(chapterVerses, index);
    }
    // Otherwise, just highlight the verse (selectedVerse is already set above)
  };

  const handleVerseLongPress = (verse: any) => {
    const bookName = books.find((b: any) => b.value === selectedBookNumber)?.label || '';
    setVerseImage(null); // Reset previous image
    setUnderlinedWordIndices([]); // Reset underlines when opening new modal
    setSelectedVerse({
      ...verse,
      citation: `${bookName} ${selectedChapter}:${verse.verseNumber}`
    });
    setIsVerseModalVisible(true);
    setIsCopied(false);
  };

  const openSavedImage = (verse: any) => {
    const savedImg = localImageVerses.find(img =>
      img.language === language &&
      img.bookNumber === selectedBookNumber &&
      img.chapterNumber === selectedChapter &&
      img.verseNumber === verse.verseNumber
    );
    if (savedImg) {
      setVerseImage(savedImg.localUri);
      setIsFullScreen(true);
    }
  };

  const deductCredit = async () => {
    if (!userToken) return false;
    try {
      const response = await axios.post(`${API_URL}/api/users/deduct-credit`, {}, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (response.data.status === 'Ok') {
        setImageGenerationCredits(response.data.remainingCredits ?? response.data.image_generation_credits_available ?? 5);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const handleGenerateImage = async () => {
    if (isGuest) {
      setIsVerseModalVisible(false);
      setTimeout(() => {
        Alert.alert(
          '🔒 Sign In Required',
          'Image generation requires an account. Sign in to access this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
          ]
        );
      }, 100);
      return;
    }
    if (!selectedVerse) return;

    if (imageGenerationCredits <= 0) {
      Alert.alert('No Credits Available', 'You have used all your image generation credits.', [{ text: 'OK' }]);
      return;
    }

    Alert.alert(
      'Generate Image',
      `Generate AI image for "${selectedVerse.citation}"? This will use 1 of your ${imageGenerationCredits} remaining credits.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setIsGeneratingImage(true);
              const apiKey = STABILITY_API_KEY;

              let promptText = selectedVerse.text;
              if (language.toLowerCase() !== 'english') {
                try {
                  const enRes = await axios.get(`${API_URL}/api/bible/verse`, {
                    params: { language: 'English', bookNumber: selectedBookNumber, chapterNumber: selectedChapter, verseNumber: selectedVerse.verseNumber }
                  });
                  if (enRes.data.status === 'Ok') promptText = enRes.data.data.text;
                } catch (e) { }
              }

              const prompt = `A professional and detailed illustration of a biblical scene inspired by the verse "${promptText}" (${selectedVerse.citation}) from the Holy Bible.`;

              const response = await axios.post(
                STABILITY_API_URL,
                {
                  text_prompts: [{ text: prompt, weight: 1 }],
                  cfg_scale: 7, height: 1024, width: 1024, steps: 50, samples: 1,
                },
                {
                  headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                }
              );

              const imageBase64 = response.data.artifacts[0].base64;
              const imageUrl = `data:image/png;base64,${imageBase64}`;

              const creditDeducted = await deductCredit();
              if (creditDeducted) {
                // Save to local FileSystem
                const fileName = `verse_img_${Date.now()}.png`;
                const fileUri = FileSystem.documentDirectory + fileName;
                await FileSystem.writeAsStringAsync(fileUri, imageBase64, { encoding: FileSystem.EncodingType.Base64 });

                const newGenImage = {
                  id: Date.now().toString(),
                  citation: selectedVerse.citation,
                  text: selectedVerse.text,
                  localUri: fileUri,
                  date: new Date().toISOString(),
                  language,
                  bookNumber: selectedBookNumber,
                  chapterNumber: selectedChapter,
                  verseNumber: selectedVerse.verseNumber
                };

                const existingStr = await AsyncStorage.getItem('@bible_generated_images');
                const existing = existingStr ? JSON.parse(existingStr) : [];
                const updated = [newGenImage, ...existing];
                await AsyncStorage.setItem('@bible_generated_images', JSON.stringify(updated));
                setLocalImageVerses(updated);

                setVerseImage(imageUrl);
                // Do not close modal, image will show below button
                Alert.alert('Success', `Image generated! ${imageGenerationCredits - 1} credits left.`);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to generate image.');
            } finally {
              setIsGeneratingImage(false);
            }
          },
        },
      ]
    );
  };

  const handleDownloadImage = async () => {
    if (!verseImage) return;
    try {
      if (verseImage.startsWith('file://')) {
        await Sharing.shareAsync(verseImage, { mimeType: 'image/png', dialogTitle: 'Share Verse Image' });
      } else {
        const fileUri = FileSystem.cacheDirectory + `verse_image_${Date.now()}.png`;
        const base64Data = verseImage.includes(',') ? verseImage.split(',')[1] : verseImage;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(fileUri, { mimeType: 'image/png', dialogTitle: 'Share Verse Image' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download image.');
    }
  };

  const handleCompare = () => {
    if (isGuest) {
      setIsVerseModalVisible(false);
      setTimeout(() => {
        Alert.alert(
          '🔒 Sign In Required',
          'Comparing translations requires an account. Sign in to access this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
          ]
        );
      }, 100);
      return;
    }
    setIsVerseModalVisible(false);
    setIsCompareModalVisible(true);
    fetchCompareVerse(compareLanguage);
  };

  const fetchCompareVerse = async (lang: string) => {
    if (!selectedVerse || selectedBookNumber === null || selectedChapter === null) return;

    if (lang === 'Tamil') {
      const chapter = tamilBibleData.find((c: any) => c.language === 'Tamil' && c.bookNumber === selectedBookNumber && c.chapterNumber === selectedChapter);
      if (chapter) {
        const vNum = parseInt(selectedVerse.verseNumber as any, 10);
        const verse = chapter.verses.find((v: any) => v.verseNumber === vNum);
        setCompareVerseData({ text: verse ? verse.text : 'Translation not available.' });
      } else {
        setCompareVerseData({ text: 'Translation not available.' });
      }
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/api/bible/verse`, {
        params: { language: lang, bookNumber: selectedBookNumber, chapterNumber: selectedChapter, verseNumber: selectedVerse.verseNumber }
      });
      if (res.data.status === 'Ok') {
        setCompareVerseData(res.data.data);
      }
    } catch (e) {
      setCompareVerseData({ text: 'Translation not available.' });
    }
  };

  useEffect(() => {
    if (isCompareModalVisible) {
      fetchCompareVerse(compareLanguage);
    }
  }, [compareLanguage, isCompareModalVisible]);

  // Clear selected verse when modal is closed
  const closeVerseModal = () => {
    setIsVerseModalVisible(false);
    setUnderlinedWordIndices([]);
    setIsCopied(false);
  };

  const toggleWordUnderline = (index: number) => {
    setUnderlinedWordIndices(prev =>
      prev.includes(index) ? [] : [index]
    );
  };

  const handleZoomIn = () => {
    setVerseFontSize(prev => {
      const newSize = Math.min(prev + 2, 40);
      AsyncStorage.setItem('@bible_font_size', newSize.toString()).catch(() => { });
      return newSize;
    });
  };

  const handleZoomOut = () => {
    setVerseFontSize(prev => {
      const newSize = Math.max(prev - 2, 12);
      AsyncStorage.setItem('@bible_font_size', newSize.toString()).catch(() => { });
      return newSize;
    });
  };

  const handleWordLongPress = (word: string) => {
    if (isGuest) {
      setIsVerseModalVisible(false);
      setTimeout(() => {
        Alert.alert(
          '🔒 Sign In Required',
          'Looking up word meanings requires an account. Sign in to access this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
          ]
        );
      }, 100);
      return;
    }
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"]/g, "").trim();
    if (!cleanWord) return;
    setConfirmWord(cleanWord);
  };

  const fetchWordMeaning = async (word: string) => {
    try {
      setLoadingMeaning(true);
      setLookupError(null);
      const res = await axios.post(`${API_URL}/api/bible/dictionary`, {
        word,
        verseContext: selectedVerse?.text || '',
        language
      });
      if (res.data.status === 'Ok') {
        const { meaning, source } = res.data.data;
        setDictWord(word);
        setDictMeaning(meaning);
        setDictSource(source);
        setIsDictModalVisible(true);
      } else {
        setLookupError(res.data.message || 'Failed to fetch meaning.');
      }
    } catch (e) {
      setLookupError('Failed to fetch meaning. Please check your internet connection.');
    } finally {
      setLoadingMeaning(false);
    }
  };

  const handleCopyVerse = async () => {
    if (selectedVerse) {
      const copyText = `${selectedVerse.citation}\n${selectedVerse.text}`;
      await Clipboard.setStringAsync(copyText);
      setIsCopied(true);
    }
  };

  const clearSelection = () => {
    setSelectedVerse(null);
  };

  const highlightVerse = async (color: string | null) => {
    if (!selectedVerse || selectedBookNumber === null || selectedChapter === null) return;
    const key = `${language}_${selectedBookNumber}_${selectedChapter}_${selectedVerse.verseNumber}`;
    const updated = { ...highlights };
    if (color) {
      updated[key] = color;
    } else {
      delete updated[key];
    }
    setHighlights(updated);
    try {
      await AsyncStorage.setItem('@bible_highlights', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save highlights', e);
    }
    closeVerseModal();
  };

  const toggleLikeVerse = async () => {
    if (!selectedVerse || selectedBookNumber === null || selectedChapter === null) return;
    const key = `${language}_${selectedBookNumber}_${selectedChapter}_${selectedVerse.verseNumber}`;
    const targetVerse = {
      key,
      language,
      bookNumber: selectedBookNumber,
      chapterNumber: selectedChapter,
      verseNumber: selectedVerse.verseNumber,
      text: selectedVerse.text,
      citation: selectedVerse.citation,
    };

    let updatedList = [...likedVerses];
    const exists = updatedList.some((v: any) => v.key === key);
    if (exists) {
      updatedList = updatedList.filter((v: any) => v.key !== key);
    } else {
      updatedList.push({
        ...targetVerse,
        likedAt: new Date().toISOString()
      });
    }
    setLikedVerses(updatedList);
    try {
      await AsyncStorage.setItem('@liked_verses', JSON.stringify(updatedList));
      if (userToken) {
        await axios.post(
          `${API_URL}/api/users/toggle-liked-verse`,
          targetVerse,
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
      }
    } catch (e) {
      console.error('Failed to save liked verses', e);
    }
  };

  // ──────────────── TTS Functions ────────────────

  // Keep ref synced with state
  useEffect(() => {
    currentVerseIndexRef.current = currentVerseIndex;
  }, [currentVerseIndex]);

  const stopReading = useCallback(() => {
    playRequestRef.current = false;
    Speech.stop();
    setIsPlaying(false);
    isSpeakingRef.current = false;
  }, []);

  // Stop speech when chapter/book changes (but preserve autoPlayPending)
  useEffect(() => {
    // Don't clear autoPlayPendingRef here — it's consumed by the verses effect below
    playRequestRef.current = false;
    Speech.stop();
    setIsPlaying(false);
    isSpeakingRef.current = false;
    setCurrentVerseIndex(0);
    currentVerseIndexRef.current = 0;
    verseLayoutsRef.current = []; // clear stale layout measurements
    setScrollProgress(0);
  }, [selectedBookNumber, selectedChapter]);

  // Auto-start playback when new chapter verses load (after auto-play advance)
  useEffect(() => {
    if (autoPlayPendingRef.current && chapterVerses.length > 0 && !isPlaying) {
      autoPlayPendingRef.current = false;
      playRequestRef.current = true;
      setIsPlaying(true);
      setTimeout(() => speakVerse(chapterVerses, 0), 300);
    }
  }, [chapterVerses]);

  const speakVerse = useCallback((verses: { verseNumber: number; text: string }[], index: number) => {
    if (!playRequestRef.current) return;
    if (index >= verses.length) {
      // Chapter finished
      setIsPlaying(false);
      isSpeakingRef.current = false;
      if (autoPlayNext) {
        // Signal that the next chapter should auto-play once it loads
        autoPlayPendingRef.current = true;
        setSelectedChapter(prev => {
          const currentBook = books.find((b: any) => b.value === selectedBookNumber);
          if (currentBook && prev < currentBook.chapterCount) {
            scrollPositionRef.current = 0;
            return prev + 1;
          }
          autoPlayPendingRef.current = false; // no next chapter available
          return prev;
        });
      }
      return;
    }
    setCurrentVerseIndex(index);
    currentVerseIndexRef.current = index;
    // Auto-scroll: center the speaking verse in the visible reader area
    if (scrollViewRef.current && verseLayoutsRef.current[index] !== undefined) {
      const verseY = verseLayoutsRef.current[index];
      const verseApproxHeight = 60;
      const scrollY = Math.max(0, verseY - scrollViewHeightRef.current / 2 + verseApproxHeight / 2);
      scrollViewRef.current.scrollTo({ y: scrollY, animated: true });
    }
    const verseText = verses[index].text;
    Speech.speak(verseText, {
      language: language === 'Tamil' ? 'ta-IN' : 'en-US',
      rate: speechRateRef.current,
      pitch: 1.0,
      onStart: () => { isSpeakingRef.current = true; },
      onDone: () => {
        isSpeakingRef.current = false;
        if (playRequestRef.current) {
          speakVerse(verses, currentVerseIndexRef.current + 1);
        }
      },
      onStopped: () => { isSpeakingRef.current = false; },
      onError: () => {
        isSpeakingRef.current = false;
        if (playRequestRef.current) {
          speakVerse(verses, currentVerseIndexRef.current + 1);
        }
      },
    });
  }, [language, autoPlayNext, books, selectedBookNumber]);

  // Keep speakVerseRef in sync so handleVerseSelect can call it before declaration
  useEffect(() => {
    speakVerseRef.current = speakVerse;
  }, [speakVerse]);

  const handlePlayPause = useCallback(() => {
    if (chapterVerses.length === 0) return;
    if (isPlaying) {
      // Pause
      playRequestRef.current = false;
      Speech.stop();
      setIsPlaying(false);
    } else {
      // Play from current verse
      setShowPlayer(true);
      Animated.spring(playerBarAnim, { toValue: 0, useNativeDriver: true }).start();
      playRequestRef.current = true;
      setIsPlaying(true);
      speakVerse(chapterVerses, currentVerseIndexRef.current);
    }
  }, [isPlaying, chapterVerses, speakVerse, playerBarAnim]);

  const handlePrevChapter = useCallback(() => {
    stopReading();
    setSelectedChapter(prev => {
      if (prev > 1) {
        scrollPositionRef.current = 0;
        return prev - 1;
      }
      return prev;
    });
    setCurrentVerseIndex(0);
  }, [stopReading]);

  const handleNextChapter = useCallback(() => {
    stopReading();
    setSelectedChapter(prev => {
      const currentBook = books.find((b: any) => b.value === selectedBookNumber);
      if (currentBook && prev < currentBook.chapterCount) {
        scrollPositionRef.current = 0;
        return prev + 1;
      }
      return prev;
    });
    setCurrentVerseIndex(0);
  }, [stopReading, books, selectedBookNumber]);

  const selectedChapterRef = useRef(selectedChapter);
  const selectedBookNumberRef = useRef(selectedBookNumber);
  const booksRef = useRef(books);
  const handlePrevChapterRef = useRef(handlePrevChapter);
  const handleNextChapterRef = useRef(handleNextChapter);

  useEffect(() => {
    selectedChapterRef.current = selectedChapter;
    selectedBookNumberRef.current = selectedBookNumber;
    booksRef.current = books;
    handlePrevChapterRef.current = handlePrevChapter;
    handleNextChapterRef.current = handleNextChapter;
  });

  // Scroll FlatList to target chapter index when selectedChapter is changed programmatically or when list data is ready
  useEffect(() => {
    const panelWidth = cardLayout.width || Dimensions.get('window').width - 32;
    const targetIndex = selectedChapter - 1;
    if (
      panelWidth > 0 && 
      targetIndex >= 0 && 
      targetIndex < chapterListData.length
    ) {
      if (lastScrolledChapterRef.current !== selectedChapter) {
        lastScrolledChapterRef.current = selectedChapter;
        flatListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
      }
    }
  }, [selectedChapter, cardLayout.width, chapterListData.length]);


  const handleClosePlayer = useCallback(() => {
    stopReading();
    Animated.timing(playerBarAnim, { toValue: 100, duration: 250, useNativeDriver: true }).start(() => {
      setShowPlayer(false);
    });
  }, [stopReading, playerBarAnim]);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlayNext(prev => !prev);
  }, []);

  const SPEED_OPTIONS = [
    { label: '0.5×', value: 0.5 },
    { label: '0.75×', value: 0.75 },
    { label: '1×', value: 1.0 },
    { label: '1.25×', value: 1.25 },
    { label: '1.5×', value: 1.5 },
  ];

  const handleSpeedChange = useCallback((rate: number) => {
    speechRateRef.current = rate;
    setSpeechRate(rate);
    // If currently playing, restart current verse at new speed
    if (playRequestRef.current && isSpeakingRef.current) {
      Speech.stop();
      setTimeout(() => {
        if (playRequestRef.current) {
          speakVerse(chapterVerses, currentVerseIndexRef.current);
        }
      }, 100);
    }
  }, [chapterVerses, speakVerse]);

  if (!initialLoadDone) {
    return <LoadingScreen message="Loading Bible..." />;
  }

  // Use MODAL mode for dropdowns to prevent ScrollView trapping issues
  const ModalProps = {
    animationType: "fade",
    transparent: false,
    statusBarTranslucent: false,
  };

  const currentBook = books.find((b: any) => b.value === selectedBookNumber);
  const totalVerses = chapterVerses.length;
  const progressPercent = totalVerses > 0 ? ((currentVerseIndex + 1) / totalVerses) * 100 : 0;

  const currentKey = selectedVerse && selectedBookNumber !== null && selectedChapter !== null
    ? `${language}_${selectedBookNumber}_${selectedChapter}_${selectedVerse.verseNumber}`
    : '';
  const currentHighlight = highlights[currentKey] || null;
  const isVerseLiked = likedVerses.some((v: any) => v.key === currentKey);

  const insetWidth = cardLayout.width > 8 ? cardLayout.width - 8 : 0;
  const insetHeight = cardLayout.height > 8 ? cardLayout.height - 8 : 0;
  const insetR = 8;
  const perimeter = insetWidth > 0 && insetHeight > 0
    ? 2 * insetWidth + 2 * insetHeight - insetR * (8 - 2 * Math.PI)
    : 0;

  const startX = 4 + insetR - insetR * 0.7071;
  const startY = 4 + insetR - insetR * 0.7071;
  const endX = 4 + insetWidth - insetR + insetR * 0.7071;
  const endY = 4 + insetHeight - insetR + insetR * 0.7071;

  const pathTopRight = `M ${startX} ${startY} A ${insetR} ${insetR} 0 0 1 ${4 + insetR} 4 H ${4 + insetWidth - insetR} A ${insetR} ${insetR} 0 0 1 ${4 + insetWidth} ${4 + insetR} V ${4 + insetHeight - insetR} A ${insetR} ${insetR} 0 0 1 ${endX} ${endY}`;
  const pathLeftBottom = `M ${startX} ${startY} A ${insetR} ${insetR} 0 0 0 4 ${4 + insetR} V ${4 + insetHeight - insetR} A ${insetR} ${insetR} 0 0 0 ${4 + insetR} ${4 + insetHeight} H ${4 + insetWidth - insetR} A ${insetR} ${insetR} 0 0 0 ${endX} ${endY}`;

  const pathLength = perimeter / 2;

  const isDark = colors.theme === 'dark';
  const strokeColorGlow = isDark ? '#00E5FF' : colors.tint;
  const strokeColorCore = isDark ? '#E0F2FE' : '#FFFFFF';
  const strokeOpacityGlowOuter = 0.18;
  const strokeOpacityGlowMed = 0.4;
  const strokeOpacityCore = 1.0;
  const shadowOpacityValue = 0.8;
  const selectedLangIdx = availableLanguages.findIndex(item => item.value === language);
  const safeLangIdx = selectedLangIdx >= 0 ? selectedLangIdx : 0;

  const selectedBookIdx = books.findIndex(item => item.value === selectedBookNumber);
  const safeBookIdx = selectedBookIdx >= 0 ? selectedBookIdx : 0;

  const selectedChapterIdx = chapters.findIndex(item => item.value === selectedChapter);
  const safeChapterIdx = selectedChapterIdx >= 0 ? selectedChapterIdx : 0;

  const compareItems = availableLanguages.filter(l => l.value !== language);
  const selectedCompareIdx = compareItems.findIndex(item => item.value === compareLanguage);
  const safeCompareIdx = selectedCompareIdx >= 0 ? selectedCompareIdx : 0;

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        <View style={styles.container}>

          {/* Transparent click-outside overlay to close open dropdowns */}
          {(openLanguage || openBook || openChapter) && (
            <Pressable
              style={[StyleSheet.absoluteFillObject, { zIndex: 999 }]}
              onPress={() => {
                setOpenLanguage(false);
                setOpenBook(false);
                setOpenChapter(false);
              }}
            />
          )}

          <View style={styles.headerRow}>
            {/* 🔊 Audio Mode Toggle — Top Left */}
            <TouchableOpacity
              onPress={() => {
                if (showPlayer) {
                  // Toggling OFF — stop any active playback and hide player
                  stopReading();
                  Animated.timing(playerBarAnim, { toValue: 100, duration: 250, useNativeDriver: true }).start(() => {
                    setShowPlayer(false);
                  });
                } else {
                  // Toggling ON — show player bar (paused), wait for verse tap to play
                  setShowPlayer(true);
                  Animated.spring(playerBarAnim, { toValue: 0, useNativeDriver: true }).start();
                }
              }}
              style={styles.headerPlayBtn}
            >
              <Icon name={showPlayer ? 'headphones' : 'headphones-off'} size={34} color={colors.textLight} />
            </TouchableOpacity>

            <Text style={styles.headerText}>Bible Reader</Text>
            <View style={styles.zoomControls}>
              <TouchableOpacity onPress={handleZoomOut} style={styles.zoomButton}>
                <Icon name="minus-circle-outline" size={24} color={colors.textLight} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleZoomIn} style={styles.zoomButton}>
                <Icon name="plus-circle-outline" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Top Controls: Dropdowns */}
          {/* Fix for Android touch overflow blocking Dropdown scrolls by artificially inflating container height */}
          <View
            style={[
              styles.dropdownContainer,
              { zIndex: 5000, elevation: 5000 },
              Platform.OS === 'android' && (openLanguage || openBook || openChapter) ? { height: 300, marginBottom: -239 } : {}
            ]}
            pointerEvents="box-none"
          >
            <View style={{ flex: 1, marginRight: 5, zIndex: 3000, elevation: 3000 }}>
              <DropDownPicker
                open={openLanguage}
                value={language}
                items={availableLanguages.map(item => ({ ...item, disabled: item.value === language }))}
                setOpen={setOpenLanguage}
                setValue={handleLanguageChange}
                placeholder="Language"
                style={styles.dropdown}
                textStyle={styles.dropdownText}
                labelProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}
                disabledItemContainerStyle={styles.dropdownSelectedItemContainer}
                disabledItemLabelStyle={styles.dropdownSelectedItemLabel}
                dropDownContainerStyle={styles.dropdownMenu}
                listMode="FLATLIST"
                listItemContainerStyle={{ height: 50 }}
                flatListProps={{
                  nestedScrollEnabled: true,
                  keyboardShouldPersistTaps: 'handled',
                  initialScrollIndex: safeLangIdx,
                  getItemLayout: (data, index) => ({ length: 50, offset: 50 * index, index })
                }}
                showTickIcon={false}
                ArrowDownIconComponent={({ style }) => (
                  <Icon name="chevron-down" size={18} color={colors.text} style={style as any} />
                )}
                ArrowUpIconComponent={({ style }) => (
                  <Icon name="chevron-up" size={18} color={colors.text} style={style as any} />
                )}
                zIndex={3000}
                zIndexInverse={1000}
              />
            </View>
            <View style={{ flex: 1.5, marginRight: 5, zIndex: 2000, elevation: 2000 }}>
              <DropDownPicker
                open={openBook}
                value={selectedBookNumber}
                items={books.map(item => ({ ...item, disabled: item.value === selectedBookNumber }))}
                setOpen={setOpenBook}
                setValue={handleBookChange}
                placeholder="Book"
                style={styles.dropdown}
                textStyle={styles.dropdownText}
                labelProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}
                disabledItemContainerStyle={styles.dropdownSelectedItemContainer}
                disabledItemLabelStyle={styles.dropdownSelectedItemLabel}
                dropDownContainerStyle={styles.dropdownMenu}
                listMode="FLATLIST"
                listItemContainerStyle={{ height: 50 }}
                flatListProps={{
                  nestedScrollEnabled: true,
                  keyboardShouldPersistTaps: 'handled',
                  initialScrollIndex: safeBookIdx,
                  getItemLayout: (data, index) => ({ length: 50, offset: 50 * index, index })
                }}
                showTickIcon={false}
                ArrowDownIconComponent={({ style }) => (
                  <Icon name="chevron-down" size={18} color={colors.text} style={style as any} />
                )}
                ArrowUpIconComponent={({ style }) => (
                  <Icon name="chevron-up" size={18} color={colors.text} style={style as any} />
                )}
                zIndex={2000}
                zIndexInverse={2000}
              />
            </View>
            <View style={{ flex: 1, zIndex: 1000, elevation: 1000 }}>
              <DropDownPicker
                open={openChapter}
                value={selectedChapter}
                items={chapters.map(item => ({ ...item, disabled: item.value === selectedChapter }))}
                setOpen={setOpenChapter}
                setValue={(val) => {
                  setSelectedChapter(val);
                  scrollPositionRef.current = 0; // Reset scroll on chapter change
                }}
                placeholder="Ch."
                style={styles.dropdown}
                labelStyle={{ color: 'transparent' }}
                placeholderStyle={{ color: 'transparent' }}
                textStyle={styles.dropdownText}
                disabledItemContainerStyle={styles.dropdownSelectedItemContainer}
                disabledItemLabelStyle={styles.dropdownSelectedItemLabel}
                dropDownContainerStyle={styles.dropdownMenu}
                listMode="FLATLIST"
                listItemContainerStyle={{ height: 50 }}
                flatListProps={{
                  nestedScrollEnabled: true,
                  keyboardShouldPersistTaps: 'handled',
                  initialScrollIndex: safeChapterIdx,
                  getItemLayout: (data, index) => ({ length: 50, offset: 50 * index, index })
                }}
                showTickIcon={false}
                ArrowDownIconComponent={({ style }) => (
                  <Icon name="chevron-down" size={18} color={colors.text} style={style as any} />
                )}
                ArrowUpIconComponent={({ style }) => (
                  <Icon name="chevron-up" size={18} color={colors.text} style={style as any} />
                )}
                zIndex={1000}
                zIndexInverse={3000}
                disabled={selectedBookNumber === null || chapters.length === 0}
              />
              <View 
                pointerEvents="none" 
                style={{ 
                  position: 'absolute', 
                  left: 12, 
                  right: 35,
                  top: 0, 
                  height: 45,
                  justifyContent: 'center',
                  zIndex: 2000,
                  elevation: 2000,
                }}
              >
                <Text style={styles.dropdownText}>
                  {selectedChapter ? `Ch. ${selectedChapter}` : 'Ch.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Verses Scroll Reader */}
          <View
            style={styles.readerCard}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              scrollViewHeightRef.current = height;
              setCardLayout({ width, height });
            }}
          >
            {showProgressBarSetting && cardLayout.width > 0 && cardLayout.height > 0 && (
              <Svg
                width={cardLayout.width}
                height={cardLayout.height}
                style={[
                  StyleSheet.absoluteFill,
                  {
                    zIndex: 10,
                    pointerEvents: 'none',
                    shadowColor: strokeColorGlow,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: shadowOpacityValue,
                    shadowRadius: 5,
                  }
                ]}
              >
                {/* Layer 1: Outer wide glow */}
                <Path
                  d={pathTopRight}
                  fill="none"
                  stroke={strokeColorGlow}
                  strokeWidth={8}
                  strokeOpacity={strokeOpacityGlowOuter}
                  strokeDasharray={`${(scrollProgress / 100) * pathLength}, ${pathLength}`}
                  strokeLinecap="round"
                />
                <Path
                  d={pathLeftBottom}
                  fill="none"
                  stroke={strokeColorGlow}
                  strokeWidth={8}
                  strokeOpacity={strokeOpacityGlowOuter}
                  strokeDasharray={`${(scrollProgress / 100) * pathLength}, ${pathLength}`}
                  strokeLinecap="round"
                />

                {/* Layer 2: Medium glow */}
                <Path
                  d={pathTopRight}
                  fill="none"
                  stroke={strokeColorGlow}
                  strokeWidth={5}
                  strokeOpacity={strokeOpacityGlowMed}
                  strokeDasharray={`${(scrollProgress / 100) * pathLength}, ${pathLength}`}
                  strokeLinecap="round"
                />
                <Path
                  d={pathLeftBottom}
                  fill="none"
                  stroke={strokeColorGlow}
                  strokeWidth={5}
                  strokeOpacity={strokeOpacityGlowMed}
                  strokeDasharray={`${(scrollProgress / 100) * pathLength}, ${pathLength}`}
                  strokeLinecap="round"
                />

                {/* Layer 3: Core */}
                <Path
                  d={pathTopRight}
                  fill="none"
                  stroke={strokeColorCore}
                  strokeWidth={2.5}
                  strokeOpacity={strokeOpacityCore}
                  strokeDasharray={`${(scrollProgress / 100) * pathLength}, ${pathLength}`}
                  strokeLinecap="round"
                />
                <Path
                  d={pathLeftBottom}
                  fill="none"
                  stroke={strokeColorCore}
                  strokeWidth={2.5}
                  strokeOpacity={strokeOpacityCore}
                  strokeDasharray={`${(scrollProgress / 100) * pathLength}, ${pathLength}`}
                  strokeLinecap="round"
                />
              </Svg>
            )}

            <FlatList
              key={`flatlist_${language}_${selectedBookNumber}_${chapterListData.length}`}
              ref={flatListRef}
              data={chapterListData}
              keyExtractor={(item) => `chapter_${selectedBookNumber}_${item}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              windowSize={3}
              removeClippedSubviews={Platform.OS === 'android'}
              initialScrollIndex={
                selectedChapter - 1 >= 0 && selectedChapter - 1 < chapterListData.length
                  ? selectedChapter - 1
                  : 0
              }
              getItemLayout={(_data, index) => ({
                length: cardLayout.width || Dimensions.get('window').width - 32,
                offset: (cardLayout.width || Dimensions.get('window').width - 32) * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const panelWidth = cardLayout.width || Dimensions.get('window').width - 32;
                if (panelWidth <= 0) return;
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / panelWidth);
                const newChapter = newIndex + 1;
                if (newChapter !== lastScrolledChapterRef.current && newChapter >= 1 && newChapter <= chapterListData.length) {
                  lastScrolledChapterRef.current = newChapter;
                  scrollPositionRef.current = 0;
                  scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                  // Update selectedChapter — this triggers fetchChapter useEffect which populates cache
                  const cacheKey = `${language}_${selectedBookNumber}_${newChapter}`;
                  let cached = versesCache.current.get(cacheKey);
                  if (language === 'Tamil' && !cached) {
                    const chapter = tamilBibleData.find((c: any) => c.language === 'Tamil' && c.bookNumber === selectedBookNumber && c.chapterNumber === newChapter);
                    cached = chapter ? chapter.verses || [] : [];
                  }
                  if (cached) {
                    setChapterVerses(cached);
                  }
                  setSelectedChapter(newChapter);
                  setSelectedVerse(null);
                  setCurrentVerseIndex(0);
                }
              }}
              style={{ flex: 1 }}
              renderItem={({ item: chapterNum }) => {
                const panelWidth = cardLayout.width || Dimensions.get('window').width - 32;
                const isCurrentChapter = chapterNum === selectedChapter;
                const cacheKey = `${language}_${selectedBookNumber}_${chapterNum}`;
                let cachedVerses = versesCache.current.get(cacheKey) || [];
                if (language === 'Tamil' && cachedVerses.length === 0) {
                  const chapter = tamilBibleData.find((c: any) => c.language === 'Tamil' && c.bookNumber === selectedBookNumber && c.chapterNumber === chapterNum);
                  cachedVerses = chapter ? chapter.verses || [] : [];
                }

                // Current chapter — full interactive rendering
                if (isCurrentChapter) {
                  return (
                    <View style={{ width: panelWidth, height: '100%' }}>
                      <ScrollView
                        ref={scrollViewRef}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.readerScrollContent}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                      >
                        <TouchableOpacity activeOpacity={1} onPress={clearSelection}>
                          {chapterVerses.length > 0 ? (
                            chapterVerses.map((verse, index) => {
                              const isSelected = selectedVerse?.verseNumber === verse.verseNumber;

                              const hasImage = localImageVerses.some(img =>
                                img.language === language &&
                                img.bookNumber === selectedBookNumber &&
                                img.chapterNumber === selectedChapter &&
                                img.verseNumber === verse.verseNumber
                              );

                              const isSpeaking = isPlaying && currentVerseIndex === index;

                              const verseHighlightKey = `${language}_${selectedBookNumber}_${selectedChapter}_${verse.verseNumber}`;
                              const highlightColor = highlights[verseHighlightKey];
                              const isLiked = likedVerses.some((v: any) => v.key === verseHighlightKey);

                              return (
                                <TouchableOpacity
                                  key={`${selectedBookNumber}_${selectedChapter}_${index}`}
                                  onPress={() => handleVerseSelect(verse, index)}
                                  onLongPress={() => handleVerseLongPress(verse)}
                                  onLayout={(e) => { verseLayoutsRef.current[index] = e.nativeEvent.layout.y; }}
                                  style={[
                                    styles.verseRow,
                                    highlightColor && { backgroundColor: highlightColor },
                                    isSelected && !highlightColor && styles.selectedVerseRow,
                                    isSpeaking && styles.speakingVerseRow,
                                  ]}
                                >
                                  <Text style={[styles.verseNumberText, isLiked && { color: '#ff4757' }]}>{verse.verseNumber}</Text>
                                  <Text style={[
                                    styles.verseBodyText,
                                    isSelected && styles.selectedVerseText,
                                    { fontSize: verseFontSize, lineHeight: verseFontSize * 1.5 }
                                  ]}>
                                    {verse.text}
                                  </Text>
                                  {hasImage && (
                                    <TouchableOpacity
                                      style={{ marginLeft: 6, alignSelf: 'flex-start', marginTop: 2, padding: 4 }}
                                      onPress={() => openSavedImage(verse)}
                                    >
                                      <Icon name="image-outline" size={20} color={colors.secondary} />
                                    </TouchableOpacity>
                                  )}
                                </TouchableOpacity>
                              );
                            })
                          ) : (
                            selectedBookNumber !== null && selectedChapter !== null ? (
                              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                                <ActivityIndicator size="large" color={colors.tint} />
                              </View>
                            ) : (
                              <Text style={styles.placeholder}>Select a book and chapter to read</Text>
                            )
                          )}
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  );
                }

                // Adjacent / non-current chapter — read-only preview from cache
                return (
                  <View style={{ width: panelWidth, height: '100%' }}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.readerScrollContent}>
                      {cachedVerses.length > 0 ? (
                        cachedVerses.map((verse, index) => (
                          <View key={`ch${chapterNum}_${index}`} style={styles.verseRow}>
                            <Text style={styles.verseNumberText}>{verse.verseNumber}</Text>
                            <Text style={[styles.verseBodyText, { fontSize: verseFontSize, lineHeight: verseFontSize * 1.5 }]}>
                              {verse.text}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                          <ActivityIndicator size="large" color={colors.tint} />
                        </View>
                      )}
                    </ScrollView>
                  </View>
                );
              }}
            />
          </View>

          {/* ──────── TTS Audio Player Bar ──────── */}
          {showPlayer && (
            <Animated.View
              style={[
                styles.playerBar,
                { transform: [{ translateY: playerBarAnim }] },
              ]}
            >
              {/* Progress bar */}
              <View style={styles.playerProgressBg}>
                <View style={[styles.playerProgressFill, { width: `${progressPercent}%` as any }]} />
              </View>

              {/* Verse label */}
              <Text style={styles.playerVerseLabel} numberOfLines={1}>
                {currentBook?.label || ''} {selectedChapter}:{chapterVerses[currentVerseIndex]?.verseNumber || 1}
                {'  '}
                <Text style={styles.playerVerseCount}>
                  ({currentVerseIndex + 1}/{totalVerses})
                </Text>
              </Text>

              {/* Controls Row */}
              <View style={styles.playerControls}>
                {/* Prev Chapter */}
                <TouchableOpacity onPress={handlePrevChapter} style={styles.playerBtn}>
                  <Icon name="skip-previous" size={28} color={theme === 'light' ? '#fff' : colors.text} />
                </TouchableOpacity>

                {/* Play / Pause */}
                <TouchableOpacity onPress={handlePlayPause} style={styles.playerPlayBtn}>
                  <Icon name={isPlaying ? 'pause' : 'play'} size={32} color={theme === 'light' ? '#146C94' : colors.textLight} />
                </TouchableOpacity>

                {/* Next Chapter */}
                <TouchableOpacity onPress={handleNextChapter} style={styles.playerBtn}>
                  <Icon name="skip-next" size={28} color={theme === 'light' ? '#fff' : colors.text} />
                </TouchableOpacity>

                {/* Auto-play toggle */}
                <TouchableOpacity onPress={toggleAutoPlay} style={[styles.playerBtn, styles.autoPlayBtn]}>
                  <Icon
                    name={autoPlayNext ? 'repeat' : 'repeat-off'}
                    size={22}
                    color={autoPlayNext ? '#FFD700' : (theme === 'light' ? 'rgba(255,255,255,0.5)' : colors.textSecondary)}
                  />
                </TouchableOpacity>

                {/* Close */}
                <TouchableOpacity onPress={handleClosePlayer} style={styles.playerBtn}>
                  <Icon name="close" size={22} color={theme === 'light' ? 'rgba(255,255,255,0.7)' : colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Speed Control Row */}
              <View style={styles.speedRow}>
                <Icon name="speedometer" size={14} color="rgba(255,255,255,0.6)" style={{ marginRight: 6 }} />
                {SPEED_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.speedBtn,
                      speechRate === opt.value && styles.speedBtnActive,
                    ]}
                    onPress={() => handleSpeedChange(opt.value)}
                  >
                    <Text style={[
                      styles.speedBtnText,
                      speechRate === opt.value && styles.speedBtnTextActive,
                    ]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Verse Action Modal */}
        <Modal
          visible={isVerseModalVisible}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => {
            if (confirmWord) {
              setConfirmWord(null);
            } else if (lookupError) {
              setLookupError(null);
            } else if (isDictModalVisible) {
              setIsDictModalVisible(false);
            } else {
              closeVerseModal();
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={closeVerseModal} />
            <View style={styles.actionModalContainer}>
              {loadingMeaning && (
                <View style={styles.meaningLoader}>
                  <ActivityIndicator size="small" color={colors.tint} />
                  <Text style={styles.meaningLoaderText}>Looking up meaning...</Text>
                </View>
              )}
              {selectedVerse && (
                <>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalCitation}>{selectedVerse.citation}</Text>
                    <TouchableOpacity onPress={toggleLikeVerse} style={styles.modalLikeBtn}>
                      <Icon
                        name={isVerseLiked ? "heart" : "heart-outline"}
                        size={24}
                        color={isVerseLiked ? "#ff4757" : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Wrapping the text to allow individual word long-press interaction */}
                  <View style={styles.modalVerseTextWrapper}>
                    {selectedVerse.text.split(' ').map((word: string, index: number) => {
                      const isUnderlined = underlinedWordIndices.includes(index);
                      return (
                        <Text
                          key={index}
                          style={[
                            styles.modalVerseWord,
                            isUnderlined && { textDecorationLine: 'underline', color: colors.tint, fontWeight: 'bold' }
                          ]}
                          onPress={() => toggleWordUnderline(index)}
                          onLongPress={() => handleWordLongPress(word)}
                          suppressHighlighting={true}
                        >
                          {word}{' '}
                        </Text>
                      );
                    })}
                  </View>

                  <View style={styles.buttonContainer}>
                    {(isImageGenEnabled || isGuest) && (
                      <Button
                        mode="contained"
                        onPress={handleGenerateImage}
                        loading={isGeneratingImage}
                        style={[styles.actionButton, styles.generateButton]}
                        labelStyle={styles.buttonText}
                        disabled={isGuest ? false : (imageGenerationCredits <= 0 || isGeneratingImage)}
                      >
                        {isGuest ? "Generate Image" : `Generate Image (${imageGenerationCredits} left)`}
                      </Button>
                    )}
                    <Button
                      mode="contained"
                      onPress={handleCompare}
                      style={[styles.actionButton, styles.compareButton]}
                      labelStyle={styles.buttonText}
                    >
                      Compare
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleCopyVerse}
                      style={[styles.actionButton, styles.copyButton, isCopied && styles.disabledButton]}
                      labelStyle={styles.buttonText}
                      disabled={isCopied}
                    >
                      {isCopied ? 'Copied !' : 'Copy Verse'}
                    </Button>
                  </View>

                  {/* Color Highlighter Row */}
                  <View style={styles.highlightRow}>
                    <View style={styles.colorOptions}>
                      {HIGHLIGHT_COLORS.map((color) => (
                        <TouchableOpacity
                          key={color.name}
                          onPress={() => highlightVerse(color.colorVal)}
                          style={[
                            styles.colorCircle,
                            { backgroundColor: color.colorVal, borderColor: colors.border },
                            currentHighlight === color.colorVal && styles.colorCircleActive
                          ]}
                        />
                      ))}
                      {currentHighlight && (
                        <TouchableOpacity
                          onPress={() => highlightVerse(null)}
                          style={[styles.colorCircle, styles.clearHighlightBtn, { borderColor: colors.border }]}
                        >
                          <Icon name="format-color-text" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Thumbnail Image display when generated */}
                  {verseImage && (
                    <TouchableOpacity
                      onPress={() => setIsFullScreen(true)}
                      style={styles.thumbnailContainer}
                    >
                      <Image
                        source={{ uri: verseImage }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.thumbnailHint}>Tap to view full screen</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* Custom Word Confirmation Dialog inside the same native Modal window */}
            {confirmWord && (
              <View style={[StyleSheet.absoluteFillObject, styles.confirmOverlay]}>
                <TouchableOpacity
                  style={styles.modalDismissArea}
                  activeOpacity={1}
                  onPress={() => setConfirmWord(null)}
                />
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmTitle}>Dictionary Lookup</Text>
                  <Text style={styles.confirmMessage}>
                    Find the biblical meaning of "{confirmWord}"?
                  </Text>
                  <View style={styles.confirmButtons}>
                    <TouchableOpacity
                      style={[styles.confirmBtn, styles.confirmBtnCancel]}
                      onPress={() => setConfirmWord(null)}
                    >
                      <Text style={styles.confirmBtnTextCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmBtn, styles.confirmBtnYes]}
                      onPress={() => {
                        const wordToFetch = confirmWord;
                        setConfirmWord(null);
                        fetchWordMeaning(wordToFetch);
                      }}
                    >
                      <Text style={styles.confirmBtnTextYes}>Yes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Custom Error Dialog overlay inside the same native Modal window */}
            {lookupError && (
              <View style={[StyleSheet.absoluteFillObject, styles.confirmOverlay]}>
                <TouchableOpacity
                  style={styles.modalDismissArea}
                  activeOpacity={1}
                  onPress={() => setLookupError(null)}
                />
                <View style={styles.confirmCard}>
                  <Text style={[styles.confirmTitle, { color: '#ef4444' }]}>Error</Text>
                  <Text style={styles.confirmMessage}>
                    {lookupError}
                  </Text>
                  <TouchableOpacity
                    style={[styles.confirmBtn, styles.confirmBtnYes, { backgroundColor: colors.primary, width: '100%', marginTop: 10 }]}
                    onPress={() => setLookupError(null)}
                  >
                    <Text style={styles.confirmBtnTextYes}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Dictionary View (Rendered inside parent modal to bypass native Modal conflict bugs) */}
            {isDictModalVisible && (
              <View style={[StyleSheet.absoluteFillObject, styles.modalOverlay]}>
                <TouchableOpacity
                  style={styles.modalDismissArea}
                  activeOpacity={1}
                  onPress={() => setIsDictModalVisible(false)}
                />
                <View style={styles.dictModalContainer}>
                  {/* Blue AI Tag in the top-right corner */}
                  {dictSource === 'ai' && (
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagText}>AI</Text>
                    </View>
                  )}

                  <Text style={styles.dictModalTitle}>Meaning of "{dictWord}"</Text>

                  <ScrollView style={styles.dictModalScroll} showsVerticalScrollIndicator={true}>
                    <Text style={styles.dictModalText}>{dictMeaning}</Text>
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.dictCloseButton}
                    onPress={() => setIsDictModalVisible(false)}
                  >
                    <Text style={styles.dictCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>

        {/* Compare Modal */}
        <Modal
          visible={isCompareModalVisible}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setIsCompareModalVisible(false)}
        >
          <View style={styles.compareModalOverlay}>
            <View style={styles.compareModalContainer}>
              <View style={styles.compareModalHeader}>
                <Text style={styles.compareModalTitle}>Compare Versions</Text>
                <TouchableOpacity
                  style={styles.compareCloseButton}
                  onPress={() => setIsCompareModalVisible(false)}
                >
                  <Text style={styles.compareCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedVerse && (
                <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
                  <Text style={styles.compareCitationText}>{selectedVerse.citation}</Text>

                  {/* Primary Version */}
                  <View style={[styles.compareVersionContainer, { marginBottom: 0 }]}>
                    <Text style={styles.compareVersionTitle}>{language}</Text>
                    <View style={styles.compareTextContainer}>
                      <Text style={styles.compareVerseText}>{selectedVerse.text}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Dropdown in between with Android Touch/Scroll fix */}
              <View
                style={[
                  { marginHorizontal: 20, zIndex: 4000, elevation: 4000 },
                  Platform.OS === 'android' && openCompareLanguage ? { height: 200, marginBottom: -150 } : { marginBottom: 15 }
                ]}
              >
                <DropDownPicker
                  open={openCompareLanguage}
                  value={compareLanguage}
                  items={availableLanguages.filter(l => l.value !== language).map(item => ({ ...item, disabled: item.value === compareLanguage }))}
                  setOpen={setOpenCompareLanguage}
                  setValue={setCompareLanguage}
                  placeholder="Select Language to Compare"
                  style={styles.dropdown}
                  textStyle={styles.dropdownText}
                  labelProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}
                  disabledItemContainerStyle={styles.dropdownSelectedItemContainer}
                  disabledItemLabelStyle={styles.dropdownSelectedItemLabel}
                  dropDownContainerStyle={[styles.dropdownMenu, { maxHeight: 150 }]}
                  listMode="FLATLIST"
                  listItemContainerStyle={{ height: 50 }}
                  flatListProps={{
                    nestedScrollEnabled: true,
                    keyboardShouldPersistTaps: 'handled',
                    initialScrollIndex: safeCompareIdx,
                    getItemLayout: (data, index) => ({ length: 50, offset: 50 * index, index })
                  }}
                  showTickIcon={false}
                  ArrowDownIconComponent={({ style }) => (
                    <Icon name="chevron-down" size={18} color={colors.text} style={style as any} />
                  )}
                  ArrowUpIconComponent={({ style }) => (
                    <Icon name="chevron-up" size={18} color={colors.text} style={style as any} />
                  )}
                  zIndex={4000}
                  zIndexInverse={1000}
                />
              </View>

              <ScrollView style={styles.compareScrollContainer} showsVerticalScrollIndicator={false}>
                {selectedVerse && (
                  <View style={{ paddingBottom: 20 }}>
                    {/* Compared Version */}
                    <View style={styles.compareVersionContainer}>
                      <Text style={styles.compareVersionTitle}>{compareLanguage}</Text>
                      <View style={styles.compareTextContainer}>
                        <Text style={styles.compareVerseText}>
                          {compareVerseData ? compareVerseData.text : 'Loading...'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Full-Screen Image Modal */}
        <Modal
          visible={isFullScreen}
          transparent={false}
          statusBarTranslucent={true}
          onRequestClose={() => setIsFullScreen(false)}
        >
          <View style={styles.fullScreenContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsFullScreen(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            {verseImage && (
              <Image source={{ uri: verseImage }} style={styles.fullScreenImage} resizeMode="contain" />
            )}
            <Button
              mode="contained"
              onPress={handleDownloadImage}
              style={styles.fullScreenDownloadButton}
              labelStyle={styles.buttonText}
            >
              Download
            </Button>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  headerPlayBtn: {
    position: 'absolute',
    left: 0,
    padding: 2,
    zIndex: 10,
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.textLight,
    textAlign: 'center',
  },
  zoomControls: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
  },
  zoomButton: {
    marginLeft: 15,
    padding: 4,
  },
  // ─── Player Bar ───
  playerBar: {
    backgroundColor: colors.theme === 'light' ? 'rgba(14, 55, 80, 0.97)' : colors.surface,
    borderRadius: 18,
    padding: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  playerProgressBg: {
    height: 3,
    backgroundColor: colors.theme === 'light' ? 'rgba(255,255,255,0.2)' : colors.border,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  playerProgressFill: {
    height: 3,
    backgroundColor: colors.secondary,
    borderRadius: 3,
  },
  playerVerseLabel: {
    fontSize: 12,
    color: colors.theme === 'light' ? 'rgba(255,255,255,0.85)' : colors.text,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  playerVerseCount: {
    fontSize: 11,
    color: colors.theme === 'light' ? 'rgba(255,255,255,0.5)' : colors.textSecondary,
    fontWeight: 'normal',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playerBtn: {
    padding: 8,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoPlayBtn: {
    marginLeft: 4,
  },
  playerPlayBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.theme === 'light' ? '#fff' : colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    zIndex: 5000,
    elevation: 5000, // Ensure dropdown flows over flatlist
  },
  dropdown: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 0,
    height: 45,
  },
  dropdownText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownMenu: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 0,
    maxHeight: 250,
    elevation: 10,
    zIndex: 4000,
  },
  dropdownSelectedItemContainer: {
    backgroundColor: colors.tint + '15',
  },
  dropdownSelectedItemLabel: {
    color: colors.tint,
    fontWeight: 'bold',
  },
  modalTitle: {
    color: colors.primary,
    fontWeight: 'bold'
  },
  readerCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden', // Prevent swipe translation from rendering outside boundaries
  },

  readerScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  verseRow: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
  },
  selectedVerseRow: {
    backgroundColor: colors.theme === 'light' ? '#DDEEFE' : '#2A3C4D',
  },
  speakingVerseRow: {
    backgroundColor: colors.theme === 'light' ? 'rgba(25, 167, 206, 0.12)' : 'rgba(56, 189, 248, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  verseNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.tint,
    marginRight: 8,
    marginTop: 2,
  },
  verseBodyText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  selectedVerseText: {
    color: colors.theme === 'light' ? '#003366' : colors.tint,
    textDecorationLine: 'underline',
  },
  placeholder: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDismissArea: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0
  },
  actionModalContainer: {
    backgroundColor: colors.surface,
    width: '85%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  modalLikeBtn: {
    padding: 6,
  },
  modalCitation: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.tint,
  },
  modalVerseTextWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalVerseWord: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 28,
  },
  meaningLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(26, 34, 41, 0.9)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  meaningLoaderText: {
    marginTop: 10,
    color: colors.tint,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
  },
  actionButton: {
    borderRadius: 8,
    width: '100%',
  },
  generateButton: {
    backgroundColor: colors.secondary,
  },
  compareButton: {
    backgroundColor: colors.theme === 'dark' ? colors.secondary : colors.primary,
  },
  copyButton: {
    backgroundColor: colors.theme === 'dark' ? colors.secondary : colors.primary,
    marginTop: 5,
  },
  disabledButton: {
    backgroundColor: colors.theme === 'light' ? '#A9A9A9' : '#475569',
  },
  buttonText: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  thumbnailImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
    fontStyle: 'italic',
  },
  // Compare Modal
  compareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  compareModalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  compareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 15,
  },
  compareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.tint,
  },
  compareCloseButton: {
    padding: 5,
  },
  compareCloseButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  compareScrollContainer: {
    paddingHorizontal: 20,
  },
  compareCitationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 20,
    textAlign: 'center',
  },
  compareVersionContainer: {
    marginBottom: 20,
  },
  compareVersionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  compareTextContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  compareVerseText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.tint,
  },
  // Full screen Modal
  fullScreenContainer: {
    flex: 1,
    backgroundColor: colors.theme === 'light' ? '#1C2526' : '#090D0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height - 150,
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  fullScreenDownloadButton: {
    backgroundColor: colors.theme === 'dark' ? colors.secondary : colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 20,
    width: '80%',
  },
  // ── TTS Speed Row ──
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.theme === 'light' ? 'rgba(255,255,255,0.12)' : colors.border,
    borderWidth: 1,
    borderColor: colors.theme === 'light' ? 'rgba(255,255,255,0.2)' : colors.border,
  },
  speedBtnActive: {
    backgroundColor: colors.theme === 'light' ? '#fff' : colors.secondary,
    borderColor: colors.theme === 'light' ? '#fff' : colors.secondary,
  },
  speedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.theme === 'light' ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
  },
  speedBtnTextActive: {
    color: colors.theme === 'light' ? colors.primary : colors.textLight,
  },
  // Dictionary Modal styles
  dictModalContainer: {
    backgroundColor: colors.surface,
    width: '85%',
    maxHeight: '75%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  aiTag: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  },
  aiTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dictModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 15,
    textAlign: 'center',
    paddingRight: 35,
  },
  dictModalScroll: {
    marginBottom: 15,
  },
  dictModalText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  dictCloseButton: {
    backgroundColor: colors.theme === 'dark' ? colors.secondary : colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dictCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    elevation: 2000,
  },
  confirmCard: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmBtnYes: {
    backgroundColor: colors.primary,
  },
  confirmBtnTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmBtnTextYes: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: colors.tint,
  },
  clearHighlightBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
  },
});

export default BibleComponent;