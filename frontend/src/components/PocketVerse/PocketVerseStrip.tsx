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
 *
 * Styled as a solid blue pill in light mode, matching the category strip this
 * replaced and the header gradient it sits on. A white surface here read as a
 * second search bar.
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
        <MaterialCommunityIcons name="bookmark-plus-outline" size={17} color={styles.text.color} />
        <Text style={styles.emptyText}>Set today&apos;s Pocket Verse</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.strip} onPress={onPress}>
      <View style={styles.badge}>
        <MaterialCommunityIcons name="bookmark" size={14} color={styles.text.color} />
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.row, { transform: [{ translateX }] }]}>
          {/* Only the first copy is measured; both render identical content.
              flexShrink: 0 keeps the line at its natural width — inside a row
              it was otherwise squeezed to the track and ellipsised, which is
              where the "..." came from. */}
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

const getStyles = (colors: any) => {
  const onBlue = colors.theme === 'dark' ? colors.tint : colors.textLight;

  return StyleSheet.create({
    strip: {
      height: 50,
      marginHorizontal: 16,
      marginBottom: 6,
      paddingLeft: 10,
      paddingRight: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 25,
      overflow: 'hidden',
      // Matches the category pills this replaced: a solid blue pill in light
      // mode, a tinted glass pill in dark.
      backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.12)' : colors.primary,
      borderWidth: 1.5,
      borderColor: colors.theme === 'dark' ? colors.tint : 'rgba(255,255,255,0.25)',
    },
    badge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      backgroundColor: colors.theme === 'dark'
        ? 'rgba(56, 189, 248, 0.16)'
        : 'rgba(255, 255, 255, 0.18)',
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
      flexShrink: 0,
      // A gap after each copy so the end of one does not touch the next.
      paddingRight: 48,
      color: onBlue,
    },
    empty: {
      justifyContent: 'center',
      borderStyle: 'dashed',
    },
    emptyText: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '600',
      color: onBlue,
    },
    newDay: {
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: colors.theme === 'dark'
        ? 'rgba(56, 189, 248, 0.16)'
        : 'rgba(255, 255, 255, 0.2)',
    },
    newDayText: {
      fontSize: 10,
      fontWeight: '700',
      color: onBlue,
    },
  });
};
