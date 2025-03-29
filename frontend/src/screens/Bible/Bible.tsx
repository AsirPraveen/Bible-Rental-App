import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { RadioButton, Text, DropDownPicker } from 'react-native-paper';

export default function BibleComponent() {
  const [language, setLanguage] = useState('english');
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedVerse, setSelectedVerse] = useState('');
  const [currentVerse, setCurrentVerse] = useState('');
  const [verseImage, setVerseImage] = useState('');

  // This would be populated from your CSV file
  const bibleBooks = ['Genesis', 'Exodus', 'Leviticus'];

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.languageSelector}>
          <RadioButton.Group onValueChange={value => setLanguage(value)} value={language}>
            <View style={styles.radioGroup}>
              <View style={styles.radioButton}>
                <RadioButton value="tamil" />
                <Text>Tamil</Text>
              </View>
              <View style={styles.radioButton}>
                <RadioButton value="english" />
                <Text>English</Text>
              </View>
            </View>
          </RadioButton.Group>
        </View>

        {/* Add your dropdowns and verse display here */}
        <View style={styles.verseContainer}>
          {currentVerse ? (
            <Text style={styles.verseText}>{currentVerse}</Text>
          ) : (
            <Text style={styles.placeholder}>Select a verse to display</Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F1F1',
  },
  languageSelector: {
    padding: 16,
    backgroundColor: '#AFD3E2',
    marginBottom: 16,
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
  verseContainer: {
    padding: 16,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    minHeight: 100,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#146C94',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});