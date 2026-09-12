import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { verseTypography } from '@/utils/verseTypography';
import { PocketVerse, pocketVerseReference } from '@/hooks/usePocketVerse';

/** Short enough to read in the moment, and in the voice of the thing itself. */
export const POCKET_VERSE_BLURB =
  'Keep one verse in your pocket. Carry it through the day, turn it over in ' +
  'your heart, and let it stay with you — “I have hidden your word in my ' +
  'heart.” (Psalm 119:11)';

type Props = {
  visible: boolean;
  verse: PocketVerse | null;
  isStale: boolean;
  onClose: () => void;
  onChangeVerse: () => void;
};

/**
 * The verse in full, opened by tapping the scrolling strip.
 *
 * The strip can only ever show one line at a time, so this is where the whole
 * verse is read — with its book, chapter and verse, and the way back to
 * choosing another.
 */
export default function PocketVerseDetail({
  visible, verse, isStale, onClose, onChangeVerse,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);

  return (
    <Modal
      visible={visible && !!verse}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.card, { marginBottom: insets.bottom }]}>
          <LinearGradient colors={colors.linearGradient} style={styles.cardHeader}>
            <View style={styles.headerRow}>
              <MaterialCommunityIcons name="bookmark" size={18} color={colors.textLight} />
              <Text style={styles.headerLabel}>Pocket Verse</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                <MaterialCommunityIcons name="close" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.reference}>
              {verse ? pocketVerseReference(verse) : ''}
            </Text>
            <Text style={styles.language}>{verse?.language}</Text>
          </LinearGradient>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[styles.verseText, verse ? verseTypography(verse.text, 19) : null]}
            >
              {verse?.text}
            </Text>

            {isStale && (
              <View style={styles.staleNote}>
                <MaterialCommunityIcons name="weather-sunset-up" size={16} color={colors.tint} />
                <Text style={styles.staleText}>
                  A new day has begun. Choose a verse to carry today.
                </Text>
              </View>
            )}

            <View style={styles.blurbBox}>
              <Text style={styles.blurbText}>{POCKET_VERSE_BLURB}</Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.changeButton} onPress={onChangeVerse} activeOpacity={0.85}>
            <MaterialCommunityIcons name="autorenew" size={17} color={colors.textLight} />
            <Text style={styles.changeText}>Change verse</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    card: {
      maxHeight: '80%',
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: colors.cardBg,
    },
    cardHeader: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 18,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    headerLabel: {
      marginLeft: 7,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.textLight,
      opacity: 0.9,
    },
    reference: {
      marginTop: 12,
      fontSize: 21,
      fontWeight: '700',
      color: colors.textLight,
    },
    language: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textLight,
      opacity: 0.75,
    },
    body: { flexGrow: 0 },
    bodyContent: { padding: 20 },
    verseText: {
      fontSize: 19,
      lineHeight: 30,
      color: colors.text,
    },
    staleNote: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 18,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.theme === 'dark'
        ? 'rgba(56, 189, 248, 0.10)'
        : '#DDF2FD',
    },
    staleText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 12,
      lineHeight: 17,
      color: colors.text,
    },
    blurbBox: {
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    blurbText: {
      fontSize: 12.5,
      lineHeight: 19,
      fontStyle: 'italic',
      color: colors.textSecondary,
    },
    changeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      backgroundColor: colors.primary,
    },
    changeText: {
      marginLeft: 8,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textLight,
    },
  });
