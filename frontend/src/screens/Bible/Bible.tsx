import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image, ScrollView, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { RadioButton, Button } from 'react-native-paper';
import DropDownPicker from 'react-native-dropdown-picker';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Import the JSON data
import bibleData from './test.Bible.json'; // Adjust the path

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
  const [isScrollEnabled, setIsScrollEnabled] = useState(true); // Control ScrollView scrolling

  // Sample Tamil translations
  const tamilTranslations = {
    "Genesis 1:1": "ஆதியில் தேவன் வானத்தையும் பூமியையும் படைத்தார்.",
    "Genesis 1:2": "பூமி வடிவமற்றதாகவும், வெறுமையாகவும் இருந்தது; ஆழத்தின் மேல் இருள் இருந்தது.",
    "Genesis 1:23": "மாலையும் காலையும் ஐந்தாம் நாளாக இருந்தன.",
    "Exodus 1:1": "இஸ்ரவேல் புத்திரரின் பெயர்கள் இவை, அவர்கள் எகிப்திற்கு வந்தவர்கள்; ஒவ்வொருவரும் தங்கள் குடும்பத்துடன் யாக்கோபுடன் வந்தனர்.",
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
        const verseText = language === 'tamil' && tamilTranslations[verseData.citation]
          ? tamilTranslations[verseData.citation]
          : verseData.text;
        setCurrentVerse({
          citation: verseData.citation,
          text: verseText,
        });
      }
    }
  }, [selectedVerse, language]);

  // Common prompt for all verses
  const generatePrompt = (verse) => {
    return `A professional and detailed illustration of a biblical scene inspired by the verse "${verse.text}" (${verse.citation}) from the Holy Bible. Depict a serene and sacred setting with elements of divine creation or redemption, such as a radiant light, ancient landscapes, or spiritual figures, rendered in a classical religious art style with rich, vibrant colors, intricate details, and a sense of divine reverence and peace.`;
  };

  // Handle "Generate Image" button click with AI
  const handleGenerateImage = async () => {
    if (!currentVerse) return;

    Alert.alert(
      'Generate Image',
      `Would you like to generate an AI image for the verse "${currentVerse.citation}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setLoading(true); // Show loading state while generating

              // Hardcode the Stability AI API key
              const apiKey = 'sk-xC3G7XlRQkbHNdIUIJBf5P4p3i1eRcyQrFjqqfa7UiCtflJo';
              if (!apiKey) {
                throw new Error('Stability AI key is missing. Please provide a valid API key.');
              }

              // Generate the common prompt
              const prompt = generatePrompt(currentVerse);
              console.log('Generated Prompt:', prompt);
              const response = await axios.post(
                'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
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
              setVerseImage(imageUrl);
              Alert.alert('Success', 'AI image generated successfully!');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#146C94" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        nestedScrollEnabled={true}
        scrollEnabled={isScrollEnabled} // Dynamically enable/disable scrolling
      >
        <View style={styles.container}>
          {/* Header */}
          <Text style={styles.headerText}>Bible Reader</Text>

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
            <Text style={styles.sectionTitle}>Select Verse</Text>
            <DropDownPicker
              open={openBook}
              value={selectedBook}
              items={books}
              setOpen={(isOpen) => {
                setOpenBook(isOpen);
                setIsScrollEnabled(!isOpen); // Disable ScrollView scrolling when dropdown is open
              }}
              setValue={setSelectedBook}
              setItems={setBooks}
              placeholder="Select Book"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownMenu}
              listMode="SCROLLVIEW" // Use SCROLLVIEW mode for better scrolling
              zIndex={3000}
              zIndexInverse={1000}
            />
            <DropDownPicker
              open={openChapter}
              value={selectedChapter}
              items={chapters}
              setOpen={(isOpen) => {
                setOpenChapter(isOpen);
                setIsScrollEnabled(!isOpen); // Disable ScrollView scrolling when dropdown is open
              }}
              setValue={setSelectedChapter}
              setItems={setChapters}
              placeholder="Select Chapter"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownMenu}
              listMode="SCROLLVIEW" // Use SCROLLVIEW mode for better scrolling
              disabled={!selectedBook}
              zIndex={2000}
              zIndexInverse={2000}
            />
            <DropDownPicker
              open={openVerse}
              value={selectedVerse}
              items={verses}
              setOpen={(isOpen) => {
                setOpenVerse(isOpen);
                setIsScrollEnabled(!isOpen); // Disable ScrollView scrolling when dropdown is open
              }}
              setValue={setSelectedVerse}
              setItems={setVerses}
              placeholder="Select Verse"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownMenu}
              listMode="SCROLLVIEW" // Use SCROLLVIEW mode for better scrolling
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
                <Button
                  mode="contained"
                  onPress={handleGenerateImage}
                  style={styles.generateButton}
                  labelStyle={styles.buttonText}
                >
                  Generate Image
                </Button>
                {verseImage && (
                  <View>
                    <TouchableOpacity onPress={() => setIsFullScreen(true)}>
                      <Image source={{ uri: verseImage }} style={styles.verseImage} resizeMode="contain" />
                    </TouchableOpacity>
                    <Button
                      mode="contained"
                      onPress={handleDownloadImage}
                      style={[styles.generateButton, styles.downloadButton]}
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
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 24,
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
    minHeight: 50, // Ensure enough height for touch area
  },
  dropdownText: {
    fontSize: 16,
    color: '#146C94',
  },
  dropdownMenu: {
    backgroundColor: '#F6F1F1',
    borderRadius: 8,
    borderWidth: 0,
    maxHeight: 300, // Increased max height for better scrolling
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
  generateButton: {
    backgroundColor: '#146C94',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 16,
  },
  downloadButton: {
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
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
});

export default BibleComponent;