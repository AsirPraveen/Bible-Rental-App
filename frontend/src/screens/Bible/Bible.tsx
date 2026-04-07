import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image, ScrollView, Modal, TouchableOpacity, Dimensions, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Button } from 'react-native-paper';
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
import _tamilBibleData from '../../assets/offline-bible/tamil_bible.json';
const tamilBibleData = _tamilBibleData as any[];
import _bookTranslations from '../../assets/offline-bible/book_translations.json';
const bookTranslations = _bookTranslations as any;

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const STABILITY_API_KEY = Constants.expoConfig?.extra?.stabilityApiKey ?? ''; 
const STABILITY_API_URL = Constants.expoConfig?.extra?.stabilityApiUrl ?? '';

const BibleComponent = () => {
  // State for Dropdowns
  const [language, setLanguage] = useState('Tamil');
  const [availableLanguages, setAvailableLanguages] = useState<{label: string, value: string}[]>([]);
  
  const [books, setBooks] = useState<{label: string, value: number, chapterCount: number}[]>([]);
  const [selectedBookNumber, setSelectedBookNumber] = useState(0); // Genesis default
  
  const [chapters, setChapters] = useState<{label: string, value: number}[]>([]);
  const [selectedChapter, setSelectedChapter] = useState(1); // Chapter 1 default
  
  // Data State
  const [chapterVerses, setChapterVerses] = useState<{verseNumber: number, text: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Restoring persistent state flag
  const [isRestoring, setIsRestoring] = useState(true);
  
  // UI State for Modals & Dropdowns
  const [openLanguage, setOpenLanguage] = useState(false);
  const [openBook, setOpenBook] = useState(false);
  const [openChapter, setOpenChapter] = useState(false);
  
  const [selectedVerse, setSelectedVerse] = useState<{verseNumber: number, text: string, citation: string} | null>(null);
  const [isVerseModalVisible, setIsVerseModalVisible] = useState(false);
  
  // Compare State
  const [isCompareModalVisible, setIsCompareModalVisible] = useState(false);
  const [compareLanguage, setCompareLanguage] = useState('English');
  const [compareVerseData, setCompareVerseData] = useState<{text: string} | null>(null);
  const [openCompareLanguage, setOpenCompareLanguage] = useState(false);
  
  // Generate Image State
  const [verseImage, setVerseImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [loadingMeaning, setLoadingMeaning] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [imageGenerationCredits, setImageGenerationCredits] = useState(5);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [underlinedWordIndices, setUnderlinedWordIndices] = useState<number[]>([]);
  const [verseFontSize, setVerseFontSize] = useState<number>(18);
  
  // Copied state
  const [isCopied, setIsCopied] = useState(false);
  
  // Local saved generated images state
  const [localImageVerses, setLocalImageVerses] = useState<any[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Data (Token, Credits, Languages, Saved Progress)
  useEffect(() => {
    const initialize = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          setUserToken(token);
          fetchUserData(token);
        } else {
          Alert.alert('Error', 'No user token found. Please log in again.');
        }

        // Fetch Languages
        try {
          const langRes = await axios.get(`${API_URL}/api/bible/languages`);
          if (langRes.data.status === 'Ok') {
            const langs = langRes.data.data.map((l:any) => ({ label: l === 'Tamil' ? 'Tamil (Offline)' : l, value: l }));
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
      } catch (error) {
        console.error('Error during initialization:', error);
      } finally {
        setIsRestoring(false);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const fetchUserData = async (token:any) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      if (response.data.status === 'Ok') {
        const data = response.data.data;
        setImageGenerationCredits(data.image_generation_credits_available ?? 5);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Logic: When language changes -> Reset book to Genesis, chapter to 1 
  // ONLY if not restoring from AsyncStorage
  const handleLanguageChange = (val:any) => {
    if (val !== language && !isRestoring) {
      setLanguage(val);
      setSelectedBookNumber(0);
      setSelectedChapter(1);
      scrollPositionRef.current = 0; // Reset scroll
    } else {
      setLanguage(val);
    }
  };

  // Logic: When book changes -> Reset chapter to 1
  const handleBookChange = (val:any) => {
    if (val !== selectedBookNumber && !isRestoring) {
      setSelectedBookNumber(val);
      setSelectedChapter(1);
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
        const booksData = Array.from(booksMap.values()).sort((a: any, b: any) => a.value - b.value);
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
              chapterCount: b.chapterCount
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
      }
    }
  }, [selectedBookNumber, books]);

  // Fetch verses
  useEffect(() => {
    const fetchChapter = async () => {
      if (language && selectedBookNumber !== null && selectedChapter !== null && !isRestoring) {
        // Clear old verses while loading to show fresh state
        setLoading(true);

        if (language === 'Tamil') {
          const chapter = tamilBibleData.find((c: any) => c.language === 'Tamil' && c.bookNumber === selectedBookNumber && c.chapterNumber === selectedChapter);
          if (chapter) {
            setChapterVerses(chapter.verses || []);
            setSelectedVerse(null);
          } else {
            setChapterVerses([]);
          }
          setLoading(false);
          setTimeout(() => {
            if (scrollViewRef.current && scrollPositionRef.current > 0) {
              scrollViewRef.current.scrollTo({ y: scrollPositionRef.current, animated: false });
            }
          }, 100);
          return;
        }

        try {
          const res = await axios.get(`${API_URL}/api/bible/chapter`, {
            params: {
              language,
              bookNumber: selectedBookNumber,
              chapterNumber: selectedChapter
            }
          });
          if (res.data.status === 'Ok') {
            setChapterVerses(res.data.data.verses || []);
            setSelectedVerse(null); // Clear selected verse on chapter switch
          }
        } catch (error) {
          console.error('Error fetching chapter:', error);
          setChapterVerses([]);
        } finally {
          setLoading(false);
          // Restore scroll position if any is pending
          setTimeout(() => {
            if (scrollViewRef.current && scrollPositionRef.current > 0) {
              scrollViewRef.current.scrollTo({ y: scrollPositionRef.current, animated: false });
            }
          }, 100);
        }
      }
    };
    fetchChapter();
  }, [language, selectedBookNumber, selectedChapter, isRestoring]);

  // Save current progress to AsyncStorage
  const saveProgress = async (scrollY:any) => {
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

  const handleScroll = (event:any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    // Debounce the save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress(scrollY);
    }, 500);
  };

  const handleVerseSelect = (verse: any) => {
    const bookName = books.find((b: any) => b.value === selectedBookNumber)?.label || '';
    setVerseImage(null); // Reset previous image
    setSelectedVerse({
      ...verse,
      citation: `${bookName} ${selectedChapter}:${verse.verseNumber}`
    });
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
                } catch (e) {}
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
      AsyncStorage.setItem('@bible_font_size', newSize.toString()).catch(() => {});
      return newSize;
    });
  };

  const handleZoomOut = () => {
    setVerseFontSize(prev => {
      const newSize = Math.max(prev - 2, 12);
      AsyncStorage.setItem('@bible_font_size', newSize.toString()).catch(() => {});
      return newSize;
    });
  };

  const handleWordLongPress = (word: string) => {
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"]/g, "").trim();
    if (!cleanWord) return;

    Alert.alert(
      'Dictionary Lookup',
      `Find the biblical meaning of "${cleanWord}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => fetchWordMeaning(cleanWord) 
        }
      ]
    );
  };

  const fetchWordMeaning = async (word: string) => {
    try {
      setLoadingMeaning(true);
      const res = await axios.post(`${API_URL}/api/bible/dictionary`, {
        word,
        verseContext: selectedVerse?.text || '',
        language
      });
      if (res.data.status === 'Ok') {
        Alert.alert(`Meaning of "${word}"`, res.data.data.meaning);
      } else {
        Alert.alert('Error', res.data.message || 'Failed to fetch meaning.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch meaning. Please check your internet connection.');
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

  if (loading && !chapterVerses.length) {
    return <LoadingScreen message="Loading Bible..." />;
  }

  // Use MODAL mode for dropdowns to prevent ScrollView trapping issues
  const ModalProps = {
    animationType: "fade",
    transparent: false,
    statusBarTranslucent: false,
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
        <View style={styles.container}>
          
          <View style={styles.headerRow}>
            <Text style={styles.headerText}>Bible Reader</Text>
            <View style={styles.zoomControls}>
              <TouchableOpacity onPress={handleZoomOut} style={styles.zoomButton}>
                <Icon name="minus-circle-outline" size={24} color="#F6F1F1" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleZoomIn} style={styles.zoomButton}>
                <Icon name="plus-circle-outline" size={24} color="#F6F1F1" />
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
                items={availableLanguages}
                setOpen={setOpenLanguage}
                setValue={handleLanguageChange}
                placeholder="Language"
                style={styles.dropdown}
                textStyle={styles.dropdownText}
                dropDownContainerStyle={styles.dropdownMenu}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true, keyboardShouldPersistTaps: 'handled' }}
                zIndex={3000}
                zIndexInverse={1000}
              />
            </View>
            <View style={{ flex: 1.5, marginRight: 5, zIndex: 2000, elevation: 2000 }}>
              <DropDownPicker
                open={openBook}
                value={selectedBookNumber}
                items={books}
                setOpen={setOpenBook}
                setValue={handleBookChange}
                placeholder="Book"
                style={styles.dropdown}
                textStyle={styles.dropdownText}
                dropDownContainerStyle={styles.dropdownMenu}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true, keyboardShouldPersistTaps: 'handled' }}
                zIndex={2000}
                zIndexInverse={2000}
              />
            </View>
            <View style={{ flex: 1, zIndex: 1000, elevation: 1000 }}>
              <DropDownPicker
                open={openChapter}
                value={selectedChapter}
                items={chapters}
                setOpen={setOpenChapter}
                setValue={(val) => {
                  setSelectedChapter(val);
                  scrollPositionRef.current = 0; // Reset scroll on chapter change
                }}
                placeholder="Ch."
                style={styles.dropdown}
                textStyle={styles.dropdownText}
                dropDownContainerStyle={styles.dropdownMenu}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true, keyboardShouldPersistTaps: 'handled' }}
                zIndex={1000}
                zIndexInverse={3000}
                disabled={selectedBookNumber === null || chapters.length === 0}
              />
            </View>
          </View>

          {/* Verses Scroll Reader */}
          <View style={styles.readerCard}>
            <ScrollView 
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.readerScrollContent}
              onScroll={handleScroll}
              scrollEventThrottle={16} // smooth tracking
            >
              {loading && chapterVerses.length > 0 && (
                <View style={{ padding: 10 }}>
                  <ActivityIndicator size="small" color="#146C94" />
                </View>
              )}
              
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

                    return (
                      <TouchableOpacity 
                        key={index} 
                        onPress={() => handleVerseSelect(verse)}
                        onLongPress={() => handleVerseLongPress(verse)}
                        style={[
                          styles.verseRow,
                          isSelected && styles.selectedVerseRow
                        ]}
                      >
                        <Text style={styles.verseNumberText}>{verse.verseNumber}</Text>
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
                            <Icon name="image-outline" size={20} color="#19A7CE" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.placeholder}>Select a book and chapter to read</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {/* Verse Action Modal */}
        <Modal
          visible={isVerseModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeVerseModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={closeVerseModal} />
            <View style={styles.actionModalContainer}>
              {loadingMeaning && (
                <View style={styles.meaningLoader}>
                  <ActivityIndicator size="small" color="#146C94" />
                  <Text style={styles.meaningLoaderText}>Looking up meaning...</Text>
                </View>
              )}
              {selectedVerse && (
                <>
                  <Text style={styles.modalCitation}>{selectedVerse.citation}</Text>
                  
                  {/* Wrapping the text to allow individual word long-press interaction */}
                  <View style={styles.modalVerseTextWrapper}>
                    {selectedVerse.text.split(' ').map((word: string, index: number) => {
                      const isUnderlined = underlinedWordIndices.includes(index);
                      return (
                        <Text 
                          key={index} 
                          style={[
                            styles.modalVerseWord,
                            isUnderlined && { textDecorationLine: 'underline', color: '#146C94', fontWeight: 'bold' }
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
                    <Button
                      mode="contained"
                      onPress={handleGenerateImage}
                      loading={isGeneratingImage}
                      style={[styles.actionButton, styles.generateButton]}
                      labelStyle={styles.buttonText}
                      disabled={imageGenerationCredits <= 0 || isGeneratingImage}
                    >
                      Generate Image ({imageGenerationCredits} left)
                    </Button>
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
          </View>
        </Modal>

        {/* Compare Modal */}
        <Modal
          visible={isCompareModalVisible}
          transparent={true}
          animationType="fade"
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
              
              <View style={{ marginHorizontal: 20, marginBottom: 10, zIndex: 4000, elevation: 4000 }}>
                <DropDownPicker
                  open={openCompareLanguage}
                  value={compareLanguage}
                  items={availableLanguages.filter(l => l.value !== language)}
                  setOpen={setOpenCompareLanguage}
                  setValue={setCompareLanguage}
                  placeholder="Select Language to Compare"
                  style={styles.dropdown}
                  textStyle={styles.dropdownText}
                  dropDownContainerStyle={styles.dropdownMenu}
                  listMode="SCROLLVIEW"
                  scrollViewProps={{ nestedScrollEnabled: true, keyboardShouldPersistTaps: 'handled' }}
                  zIndex={4000}
                  zIndexInverse={1000}
                />
              </View>

              <ScrollView style={styles.compareScrollContainer} showsVerticalScrollIndicator={false}>
                {selectedVerse && (
                  <>
                    <Text style={styles.compareCitationText}>{selectedVerse.citation}</Text>
                    
                    {/* Primary Version */}
                    <View style={styles.compareVersionContainer}>
                      <Text style={styles.compareVersionTitle}>{language}</Text>
                      <View style={styles.compareTextContainer}>
                        <Text style={styles.compareVerseText}>{selectedVerse.text}</Text>
                      </View>
                    </View>
                    
                    {/* Compared Version */}
                    <View style={styles.compareVersionContainer}>
                      <Text style={styles.compareVersionTitle}>{compareLanguage}</Text>
                      <View style={styles.compareTextContainer}>
                        <Text style={styles.compareVerseText}>
                          {compareVerseData ? compareVerseData.text : 'Loading...'}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Full-Screen Image Modal */}
        <Modal
          visible={isFullScreen}
          transparent={false}
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

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
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
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F6F1F1',
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
  dropdownContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    zIndex: 5000,
    elevation: 5000, // Ensure dropdown flows over flatlist
  },
  dropdown: {
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    borderWidth: 0,
    minHeight: 45,
  },
  dropdownText: {
    fontSize: 14,
    color: '#146C94',
  },
  dropdownMenu: {
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    borderWidth: 0,
    maxHeight: 250,
    elevation: 10,
    zIndex: 4000,
  },
  modalTitle: {
    color: '#146C94',
    fontWeight: 'bold'
  },
  readerCard: {
    flex: 1,
    backgroundColor: '#FAF9F6', 
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  readerScrollContent: {
    paddingBottom: 20,
  },
  verseRow: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
  },
  selectedVerseRow: {
    backgroundColor: '#DDEEFE', // Light blue highlight
  },
  verseNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#146C94',
    marginRight: 8,
    marginTop: 2,
  },
  verseBodyText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  selectedVerseText: {
    color: '#003366',
    textDecorationLine: 'underline',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
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
    backgroundColor: '#fff',
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
  modalCitation: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalVerseTextWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalVerseWord: {
    fontSize: 16,
    color: '#444',
    lineHeight: 28,
  },
  meaningLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  meaningLoaderText: {
    marginTop: 10,
    color: '#146C94',
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
    backgroundColor: '#19A7CE',
  },
  compareButton: {
    backgroundColor: '#146C94',
  },
  copyButton: {
    backgroundColor: '#146C94',
    marginTop: 5,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
  buttonText: {
    fontSize: 14,
    color: '#F6F1F1',
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
    borderColor: '#E0E0E0',
  },
  thumbnailHint: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#F6F1F1',
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
    borderBottomColor: '#E0E0E0',
    marginBottom: 15,
  },
  compareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#146C94',
  },
  compareCloseButton: {
    padding: 5,
  },
  compareCloseButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  compareScrollContainer: {
    paddingHorizontal: 20,
  },
  compareCitationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 20,
    textAlign: 'center',
  },
  compareVersionContainer: {
    marginBottom: 20,
  },
  compareVersionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  compareTextContainer: {
    backgroundColor: '#FFFFFF',
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
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F1F1',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#146C94',
  },
  // Full screen Modal
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#1C2526',
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
    backgroundColor: '#146C94',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 20,
    width: '80%',
  },
});

export default BibleComponent;