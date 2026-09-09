import React from 'react';
import {
  View, Text, Pressable, StyleSheet, StyleProp, ViewStyle, TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

type ScreenHeaderProps = {
  title: string;
  /** The screen's own `styles.header`. Passed through untouched so migrating to
   *  this component cannot change how a screen looks. */
  style?: StyleProp<ViewStyle>;
  /** The screen's own `styles.headerTitle`. */
  titleStyle?: StyleProp<TextStyle>;
  /**
   * The back glyph. Screens supply their own because the app uses two icon sets
   * at different sizes and colours (lucide `ArrowLeft` at 24 on content
   * screens, MaterialCommunityIcons `arrow-left` at 28 on the game screens).
   */
  backIcon?: React.ReactNode;
  /** The screen's own `styles.backButton`, when it has one. */
  backStyle?: StyleProp<ViewStyle>;
  onBack?: () => void;
  /** Trailing control. When omitted a spacer of `spacerWidth` keeps the title
   *  optically centred, which is what the hand-written headers did with an
   *  explicit `<View style={{ width: 28 }} />`. */
  right?: React.ReactNode;
  spacerWidth?: number;
  /** Set false on a root screen that cannot go back. */
  showBack?: boolean;
};

/**
 * The shared screen header.
 *
 * 43 screens hand-rolled this same row. The visual tokens genuinely differ
 * between them, so this component owns only the parts that were duplicated and
 * inconsistent -- the three-slot layout, the goBack wiring, a touch target big
 * enough to hit, an accessibility label, and title truncation. Colours, sizes
 * and spacing stay with the screen, which is why adopting it is a no-op
 * visually.
 */
export function ScreenHeader({
  title, style, titleStyle, backIcon, backStyle, onBack, right,
  spacerWidth = 28, showBack = true,
}: ScreenHeaderProps) {
  const navigation = useNavigation();

  return (
    <View style={style}>
      {showBack ? (
        <Pressable
          onPress={onBack ?? (() => navigation.goBack())}
          // Most of the migrated screens used TouchableOpacity, which dims to
          // 0.2 while held. Pressable has no feedback by default, so match it
          // rather than silently removing the press affordance.
          style={({ pressed }) => [backStyle, pressed && { opacity: 0.2 }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          {backIcon}
        </Pressable>
      ) : (
        <View style={{ width: spacerWidth }} />
      )}

      <Text numberOfLines={1} style={titleStyle}>
        {title}
      </Text>

      {right ?? <View style={{ width: spacerWidth }} />}
    </View>
  );
}

export default ScreenHeader;
