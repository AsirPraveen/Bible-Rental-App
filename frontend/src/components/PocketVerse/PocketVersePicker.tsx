import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services';
import { verseTypography } from '@/utils/verseTypography';
import { PocketVerse } from '@/hooks/usePocketVerse';

type Book = { bookNumber: number; bookName: string; chapterCount: number };
type Verse = { verseNumber: number; text: string };
type Step = 'language' | 'book' | 'chapter' | 'verse';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (verse: Omit<PocketVerse, 'dateKey'>) => void;
};

/**
 * Four-step picker for the verse of the day: language, book, chapter, verse.
 *
 * Each step only loads what the previous one made relevant, so opening the
 * picker costs a single small request for the language list.
 */
export default function PocketVersePicker({ visible, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);

  const [step, setStep] = useState<Step>('language');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [languages, setLanguages] = useState<string[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);

  const [language, setLanguage] = useState('');
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState(0);

  const request = useCallback(async function <T>(path: string, onOk: (data: T) => void) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(path);
      if (res.data.status === 'Ok') onOk(res.data.data as T);
      else setError('Could not load that. Please try again.');
    } catch {
      setError('Could not load that. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Start clean each time it opens: the point is to choose today's verse.
    setStep('language');
    setBook(null);
    setChapter(0);
    setVerses([]);
    request<string[]>('/api/bible/languages', setLanguages);
  }, [visible, request]);

  const chooseLanguage = (value: string) => {
    setLanguage(value);
    setStep('book');
    request<Book[]>(`/api/bible/books?language=${encodeURIComponent(value)}`, setBooks);
  };

  const chooseBook = (value: Book) => {
    setBook(value);
    setStep('chapter');
  };

  const chooseChapter = (value: number) => {
    setChapter(value);
    setStep('verse');
    request<{ verses: Verse[] }>(
      `/api/bible/chapter?language=${encodeURIComponent(language)}&bookNumber=${book?.bookNumber}&chapterNumber=${value}`,
      (data) => setVerses(data.verses || []),
    );
  };

  const chooseVerse = (value: Verse) => {
    if (!book) return;
    onSelect({
      language,
      bookNumber: book.bookNumber,
      bookName: book.bookName,
      chapterNumber: chapter,
      verseNumber: value.verseNumber,
      text: value.text,
    });
    onClose();
  };

  const goBack = () => {
    if (step === 'verse') setStep('chapter');
    else if (step === 'chapter') setStep('book');
    else if (step === 'book') setStep('language');
    else onClose();
  };

  const title =
    step === 'language' ? 'Choose a language'
      : step === 'book' ? 'Choose a book'
        : step === 'chapter' ? `${book?.bookName} chapter`
          : `${book?.bookName} ${chapter}`;

  const retry = () => {
    if (step === 'language') request<string[]>('/api/bible/languages', setLanguages);
    else if (step === 'book') chooseLanguage(language);
    else if (step === 'verse') chooseChapter(chapter);
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'language') {
      return (
        <FlatList
          data={languages}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => chooseLanguage(item)}>
              <Text style={styles.rowText}>{item}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        />
      );
    }

    if (step === 'book') {
      return (
        <FlatList
          data={books}
          keyExtractor={(item) => `${item.bookNumber}`}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => chooseBook(item)}>
              <Text style={styles.rowText}>{item.bookName}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        />
      );
    }

    if (step === 'chapter') {
      const chapters = Array.from({ length: book?.chapterCount || 0 }, (_, i) => i + 1);
      return (
        <FlatList
          data={chapters}
          keyExtractor={(item) => `${item}`}
          numColumns={5}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chip} onPress={() => chooseChapter(item)}>
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      );
    }

    return (
      <FlatList
        data={verses}
        keyExtractor={(item) => `${item.verseNumber}`}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.verseRow} onPress={() => chooseVerse(item)}>
            <Text style={styles.verseNumber}>{item.verseNumber}</Text>
            <Text style={[styles.verseText, verseTypography(item.text, 15)]}>{item.text}</Text>
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goBack}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={step === 'language' ? 'Close' : 'Back'}
            >
              <Ionicons
                name={step === 'language' ? 'close' : 'chevron-back'}
                size={22}
                color={colors.tint}
              />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <Text style={styles.subtitle}>Carry it with you for the day</Text>
          <View style={styles.body}>{renderBody()}</View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      maxHeight: '82%',
      minHeight: '55%',
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    header: { flexDirection: 'row', alignItems: 'center' },
    headerSpacer: { width: 22 },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700',
      color: colors.tint,
      marginHorizontal: 8,
    },
    subtitle: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: 10,
    },
    body: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
    retryButton: {
      marginTop: 12,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    retryText: { color: colors.textLight, fontWeight: '600' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    grid: { paddingBottom: 8 },
    gridRow: { justifyContent: 'flex-start' },
    chip: {
      width: 52,
      height: 44,
      margin: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: { fontSize: 15, fontWeight: '600', color: colors.text },
    verseRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    verseNumber: {
      width: 28,
      fontSize: 13,
      fontWeight: '700',
      color: colors.tint,
      marginTop: 2,
    },
    verseText: { flex: 1, fontSize: 15, color: colors.text },
  });
