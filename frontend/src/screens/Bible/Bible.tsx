import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image, ScrollView, Modal, TouchableOpacity, Dimensions, SafeAreaView, Platform, StatusBar } from 'react-native';
import { RadioButton, Button } from 'react-native-paper';
import DropDownPicker from 'react-native-dropdown-picker';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';

import bibleData from './test.Bible.json';
import tamilBibleData from './test.Tamil Bible.json';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? '';
const STABILITY_API_KEY = Constants.expoConfig?.extra?.stabilityApiKey ?? ''; 
const STABILITY_API_URL = Constants.expoConfig?.extra?.stabilityApiUrl ?? '';

const BibleComponent = () => {
  const [language, setLanguage] = useState('english');
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [verses, setVerses] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [currentVerse, setCurrentVerse] = useState(null);
  const [verseImage, setVerseImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openBook, setOpenBook] = useState(false);
  const [openChapter, setOpenChapter] = useState(false);
  const [openVerse, setOpenVerse] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCompareModalVisible, setIsCompareModalVisible] = useState(false);
  const [imageGenerationCredits, setImageGenerationCredits] = useState(5);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);

  // Create a lookup map for Tamil translations
  const [tamilTranslationsMap, setTamilTranslationsMap] = useState({});

  // Get user token and data on component mount
  useEffect(() => {
    const initializeUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          setUserToken(token);
          await fetchUserData(token);
        } else {
          Alert.alert('Error', 'No user token found. Please log in again.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing user data:', error);
        setLoading(false);
      }
    };

    initializeUserData();
  }, []);

  // Process Tamil Bible data into a lookup map
  useEffect(() => {
    try {
      const tamilMap = {};
      tamilBibleData.forEach(item => {
        if (item['Book Name'] && item.Chapter && item.Verse && item.Text) {
          const citation = `${item['Book Name']} ${item.Chapter}:${item.Verse}`;
          tamilMap[citation] = item.Text;
        }
      });
      setTamilTranslationsMap(tamilMap);
    } catch (error) {
      console.error('Error processing Tamil Bible data:', error);
    }
  }, []);

  // Fetch user data and credits from backend
  const fetchUserData = async (token) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/userdata`, { token });
      if (response.data.status === 'Ok') {
        const data = response.data.data;
        setUserData(data);
        // Assuming credits are stored in user data, adjust field name as needed
        setImageGenerationCredits(data.image_generation_credits_available || 5);
      } else {
        Alert.alert('Error', 'Failed to fetch user data.');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'An error occurred while fetching user data.');
    }
  };

  // Load books from the JSON data
  useEffect(() => {
    try {
      const validData = bibleData.filter(item => item.citation && item.book && item.chapter !== undefined && item.verse !== undefined && item.text);
      const uniqueBooks = [...new Set(validData.map(item => item.book))].map(book => ({
        label: book,
        value: book,
      }));
      setBooks(uniqueBooks);
      setLoading(false);
    } catch (error) {
      console.error('Error processing Bible data:', error);
      setLoading(false);
    }
  }, []);

  // Update chapters when a book is selected
  useEffect(() => {
    if (selectedBook) {
      const data = bibleData.filter(item => item.book === selectedBook);
      const uniqueChapters = [...new Set(data.map(item => item.chapter))].map(chapter => ({
        label: `Chapter ${chapter}`,
        value: chapter,
      }));
      setChapters(uniqueChapters);
      setSelectedChapter(null);
      setVerses([]);
      setSelectedVerse(null);
      setCurrentVerse(null);
    }
  }, [selectedBook]);

  // Update verses when a chapter is selected
  useEffect(() => {
    if (selectedBook && selectedChapter) {
      const data = bibleData.filter(
        item => item.book === selectedBook && item.chapter === selectedChapter
      );
      const availableVerses = data.map(item => ({
        label: `Verse ${item.verse}`,
        value: item.verse,
        text: item.text.trim(),
        citation: item.citation,
      }));
      setVerses(availableVerses);
      setSelectedVerse(null);
      setCurrentVerse(null);
    }
  }, [selectedChapter]);

  // Update the displayed verse when a verse is selected
  useEffect(() => {
    if (selectedVerse) {
      const verseData = verses.find(item => item.value === selectedVerse);
      if (verseData) {
        const tamilText = tamilTranslationsMap[verseData.citation];
        const verseText = language === 'tamil' && tamilText
          ? tamilText
          : verseData.text;
        setCurrentVerse({
          citation: verseData.citation,
          text: verseText,
          englishText: verseData.text, // Always keep the English text
          tamilText: tamilText || 'Tamil translation not available',
        });
      }
    }
  }, [selectedVerse, language, tamilTranslationsMap]);

  // Common prompt for all verses - always use English text
  const generatePrompt = (verse) => {
    return `A professional and detailed illustration of a biblical scene inspired by the verse "${verse.englishText}" (${verse.citation}) from the Holy Bible.`;
  };

  // Deduct credit from backend
  const deductCredit = async () => {
    if (!userToken) {
      Alert.alert('Error', 'User token not found. Please log in again.');
      return false;
    }

    try {
      console.log('Deducting credit with token:', userToken, API_URL);
      const response = await axios.post(`${API_URL}/api/users/deduct-credit`, {}, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      
      if (response.data.status === 'Ok') {
        setImageGenerationCredits(response.data.remainingCredits || response.data.image_generation_credits_available);
        return true;
      } else {
        Alert.alert('Error', response.data.message || 'Failed to deduct credit.');
        return false;
      }
    } catch (error) {
      console.error('Error deducting credit:', error);
      Alert.alert('Error', 'Failed to deduct credit. Please try again.');
      return false;
    }
  };

  // Handle "Generate Image" button click with AI
  const handleGenerateImage = async () => {
    if (!currentVerse) return;

    // Check if user has credits
    if (imageGenerationCredits <= 0) {
      Alert.alert(
        'No Credits Available',
        'You have used all your image generation credits. Please contact admin to get more credits.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Generate Image',
      `Would you like to generate an AI image for the verse "${currentVerse.citation}"? This will use 1 of your ${imageGenerationCredits} remaining credits.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setLoading(true); // Show loading state while generating

              // Hardcode the Stability AI API key
              const apiKey = STABILITY_API_KEY;
              if (!apiKey) {
                throw new Error('Stability AI key is missing. Please provide a valid API key.');
              }

              // Generate the common prompt using English text
              const prompt = generatePrompt(currentVerse);
              console.log('Generated Prompt:', prompt);
              
              const response = await axios.post(
                STABILITY_API_URL,
                {
                  text_prompts: [
                    {
                      text: prompt,
                      weight: 1,
                    },
                  ],
                  cfg_scale: 7,
                  height: 1024,
                  width: 1024,
                  steps: 50,
                  samples: 1,
                },
                {
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                  },
                }
              );

              const imageBase64 = response.data.artifacts[0].base64;
              const imageUrl = `data:image/png;base64,${imageBase64}`;
              
              // Only deduct credit after successful image generation
              const creditDeducted = await deductCredit();
              if (creditDeducted) {
                setVerseImage(imageUrl);
                Alert.alert(
                  'Success', 
                  `AI image generated successfully! You have ${imageGenerationCredits - 1} credits remaining.`
                );
              }
            } catch (error) {
              console.error('Error generating AI image:', error);
              if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
              }
              Alert.alert(
                'Error',
                error.message || 'Failed to generate AI image. Please check your API key or try again.'
              );
            } finally {
              setLoading(false); // Hide loading state
            }
          },
        },
      ]
    );
  };

  // Handle downloading the image
  const handleDownloadImage = async () => {
    if (!verseImage) return;

    try {
      const fileUri = FileSystem.cacheDirectory + `verse_image_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(fileUri, verseImage.split(',')[1], {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(fileUri, { mimeType: 'image/png', dialogTitle: 'Download Verse Image' });
      Alert.alert('Success', 'Image downloaded and shared!');
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to download image. Please try again.');
    }
  };

  // Handle compare button click
  const handleCompare = () => {
    setIsCompareModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#146C94" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.outer_container}>
    <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Header */}
          <Text style={styles.headerText}>Bible Reader</Text>

          {/* Credits Display */}
          <View style={styles.creditsContainer}>
            <Text style={styles.creditsText}>
              Image Generation Credits Remaining: {imageGenerationCredits}/5
            </Text>
          </View>

          {/* Language Selector */}
          <View style={styles.languageSelector}>
            <Text style={styles.sectionTitle}>Select Language</Text>
            <RadioButton.Group onValueChange={value => setLanguage(value)} value={language}>
              <View style={styles.radioGroup}>
                <View style={styles.radioButton}>
                  <RadioButton value="tamil" color="#F6F1F1" uncheckedColor="#F6F1F1" />
                  <Text style={styles.radioText}>Tamil</Text>
                </View>
                <View style={styles.radioButton}>
                  <RadioButton value="english" color="#F6F1F1" uncheckedColor="#F6F1F1" />
                  <Text style={styles.radioText}>English</Text>
                </View>
              </View>
            </RadioButton.Group>
          </View>

          {/* Dropdowns for Book, Chapter, and Verse */}
          <View style={styles.dropdownContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Verse</Text>
              <TouchableOpacity 
                  onPress={handleCompare}
                  style={styles.compareButton}
              >
                  <Text style={styles.compareText}>Compare</Text>
              </TouchableOpacity>
            </View>
            <DropDownPicker
              open={openBook}
              value={selectedBook}
              items={books}
              setOpen={setOpenBook}
              setValue={setSelectedBook}
              setItems={setBooks}
              placeholder="Select Book"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownMenu}
              listMode="MODAL"
              modalProps={{
                animationType: "slide",
                transparent: false,
                statusBarTranslucent: false,
              }}
              modalContentContainerStyle={styles.modalContent}
              modalTitle="Select Book"
              modalTitleStyle={styles.modalTitle}
              searchable={true}
              searchPlaceholder="Search books..."
              searchTextInputStyle={styles.searchInput}
              zIndex={3000}
              zIndexInverse={1000}
            />
            <DropDownPicker
              open={openChapter}
              value={selectedChapter}
              items={chapters}
              setOpen={setOpenChapter}
              setValue={setSelectedChapter}
              setItems={setChapters}
              placeholder="Select Chapter"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownMenu}
              listMode="MODAL"
              modalProps={{
                animationType: "slide",
                transparent: false,
                statusBarTranslucent: false,
              }}
              modalContentContainerStyle={styles.modalContent}
              modalTitle="Select Chapter"
              modalTitleStyle={styles.modalTitle}
              searchable={true}
              searchPlaceholder="Search chapters..."
              searchTextInputStyle={styles.searchInput}
              disabled={!selectedBook}
              zIndex={2000}
              zIndexInverse={2000}
            />
            <DropDownPicker
              open={openVerse}
              value={selectedVerse}
              items={verses}
              setOpen={setOpenVerse}
              setValue={setSelectedVerse}
              setItems={setVerses}
              placeholder="Select Verse"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownMenu}
              listMode="MODAL"
              modalProps={{
                animationType: "slide",
                transparent: false,
                statusBarTranslucent: false,
              }}
              modalContentContainerStyle={styles.modalContent}
              modalTitle="Select Verse"
              modalTitleStyle={styles.modalTitle}
              searchable={true}
              searchPlaceholder="Search verses..."
              searchTextInputStyle={styles.searchInput}
              disabled={!selectedChapter}
              zIndex={1000}
              zIndexInverse={3000}
            />
          </View>

          {/* Verse Display */}
          <View style={styles.verseCard}>
            {currentVerse ? (
              <>
                <Text style={styles.citationText}>{currentVerse.citation}</Text>
                <Text style={styles.verseText}>{currentVerse.text}</Text>
                
                {/* Button Container */}
                <View style={styles.buttonContainer}>
                  <Button
                    mode="contained"
                    onPress={handleGenerateImage}
                    style={[
                      styles.actionButton,
                      styles.generateButton,
                      imageGenerationCredits <= 0 && styles.disabledButton
                    ]}
                    labelStyle={styles.buttonText}
                    disabled={imageGenerationCredits <= 0}
                  >
                    Generate Image ({imageGenerationCredits} credits left)
                  </Button>
                </View>
                
                {verseImage && (
                  <View>
                    <TouchableOpacity onPress={() => setIsFullScreen(true)}>
                      <Image source={{ uri: verseImage }} style={styles.verseImage} resizeMode="contain" />
                    </TouchableOpacity>
                    <Button
                      mode="contained"
                      onPress={handleDownloadImage}
                      style={[styles.actionButton, styles.downloadButton]}
                      labelStyle={styles.buttonText}
                    >
                      Download Image
                    </Button>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.placeholder}>Select a verse to display</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Compare Modal */}
      <Modal
        visible={isCompareModalVisible}
        transparent={true}
        animationType="slide"
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
            
            <ScrollView style={styles.compareScrollContainer} showsVerticalScrollIndicator={false}>
              {currentVerse && (
                <>
                  <Text style={styles.compareCitationText}>{currentVerse.citation}</Text>
                  
                  {/* English Version */}
                  <View style={styles.compareVersionContainer}>
                    <Text style={styles.compareVersionTitle}>English</Text>
                    <View style={styles.compareTextContainer}>
                      <Text style={styles.compareVerseText}>{currentVerse.englishText}</Text>
                    </View>
                  </View>
                  
                  {/* Tamil Version */}
                  <View style={styles.compareVersionContainer}>
                    <Text style={styles.compareVersionTitle}>Tamil</Text>
                    <View style={styles.compareTextContainer}>
                      <Text style={styles.compareVerseText}>{currentVerse.tamilText}</Text>
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
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F6F1F1',
    textAlign: 'center',
    marginBottom: 16,
  },
  userInfoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
  },
  creditsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  creditsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#146C94',
  },
  languageSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F6F1F1',
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  radioText: {
    fontSize: 16,
    color: '#F6F1F1',
  },
  dropdownContainer: {
    marginBottom: 24,
  },
  dropdown: {
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 0,
    minHeight: 50,
  },
  dropdownText: {
    fontSize: 16,
    color: '#146C94',
  },
  dropdownMenu: {
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    borderWidth: 0,
    maxHeight: 300,
  },
  modalContent: {
    backgroundColor: '#F6F1F1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
    textAlign: 'center',
    paddingVertical: 15,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#146C94',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 10,
    fontSize: 16,
  },
  verseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  citationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 8,
    textAlign: 'center',
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 120,
  },
  generateButton: {
    backgroundColor: '#146C94',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  downloadButton: {
    backgroundColor: '#146C94',
    marginTop: 8,
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    color: '#F6F1F1',
  },
  verseImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compareButton: {
    backgroundColor: '#AFD3E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  compareText: {
    color: '#146C94',
    fontSize: 14,
    fontWeight: '500',
  },
  // Compare Modal Styles
  compareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  compareModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  compareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  compareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#146C94',
  },
  compareCloseButton: {
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compareCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  compareScrollContainer: {
    padding: 20,
  },
  compareCitationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146C94',
    textAlign: 'center',
    marginBottom: 20,
  },
  compareVersionContainer: {
    marginBottom: 20,
  },
  compareVersionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#146C94',
    marginBottom: 8,
    paddingLeft: 4,
  },
  compareTextContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#19A7CE',
  },
  compareVerseText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    textAlign: 'justify',
  },
});

export default BibleComponent;