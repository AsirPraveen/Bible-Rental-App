import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { verseTypography } from '@/utils/verseTypography';
import { PocketVerse, pocketVerseReference } from '@/hooks/usePocketVerse';

/** Pixels the text travels per second. Slow enough to read while glancing. */
const SPEED = 34;
const FONT_SIZE = 15;

type Props = {
  verse: PocketVerse | null;
  isStale: boolean;
  onPress: () => void;
};

/**
 * The pocket verse, scrolling end to end forever.
 *
 * The line is rendered twice and the pair is translated by exactly one copy's
 * width, so the second copy is in the first one's place at the moment the loop
 * restarts and the seam is invisible. The width is measured rather than assumed
 * because verses vary from a few words to a long sentence, in any script.
 */
export default function PocketVerseStrip({ verse, isStale, onPress }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const translateX = useRef(new Animated.Value(0)).current;
  const [copyWidth, setCopyWidth] = useState(0);

  const line = verse ? `“${verse.text}”   —   ${pocketVerseReference(verse)}` : '';

  const onCopyLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width > 0 && width !== copyWidth) setCopyWidth(width);
  };

  useEffect(() => {
    if (!copyWidth) return;
    translateX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -copyWidth,
        // Constant speed, so a long verse takes longer rather than racing past.
        duration: (copyWidth / SPEED) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [copyWidth, translateX, line]);

  if (!verse) {
    return (
      <Pressable style={[styles.strip, styles.empty]} onPress={onPress}>
        <MaterialCommunityIcons name="bookmark-plus-outline" size={18} color={colors.tint} />
        <Text style={styles.emptyText}>Set today&apos;s Pocket Verse</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.strip} onPress={onPress}>
      <View style={styles.badge}>
        <MaterialCommunityIcons
          name="bookmark-outline"
          size={15}
          color={colors.theme === 'dark' ? colors.tint : colors.textLight}
        />
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.row, { transform: [{ translateX }] }]}>
          {/* Only the first copy is measured; both render identical content. */}
          <Text
            onLayout={onCopyLayout}
            numberOfLines={1}
            style={[styles.text, verseTypography(verse.text, FONT_SIZE)]}
          >
            {line}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.text, verseTypography(verse.text, FONT_SIZE)]}
          >
            {line}
          </Text>
        </Animated.View>
      </View>

      {isStale && (
        <View style={styles.newDay}>
          <Text style={styles.newDayText}>New day</Text>
        </View>
      )}
    </Pressable>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    strip: {
      height: 52,
      marginHorizontal: 16,
      marginBottom: 4,
      paddingLeft: 10,
      paddingRight: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.10)' : colors.cardBg,
      borderWidth: 1,
      borderColor: colors.theme === 'dark' ? colors.border : 'rgba(20, 108, 148, 0.18)',
    },
    badge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.16)' : colors.primary,
    },
    track: {
      flex: 1,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
    },
    text: {
      fontSize: FONT_SIZE,
      // A gap after each copy so the end of one does not touch the next.
      paddingRight: 48,
      color: colors.theme === 'dark' ? colors.textLight : colors.text,
    },
    empty: {
      justifyContent: 'center',
      borderStyle: 'dashed',
      backgroundColor: 'transparent',
    },
    emptyText: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.tint,
    },
    newDay: {
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.16)' : colors.primary,
    },
    newDayText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.theme === 'dark' ? colors.tint : colors.textLight,
    },
  });
