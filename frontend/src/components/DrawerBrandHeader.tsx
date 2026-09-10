import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

/**
 * App icon in a circle, shown at the top of the drawer above the first item.
 *
 * Lives here rather than being inlined because more than one drawer needs it
 * and they should not drift apart.
 */
export function DrawerBrandHeader() {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.circle,
          {
            // The drawer sits on the dark gradient, so a translucent white
            // keeps the ring visible in both themes without hardcoding either.
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderColor: colors.secondary,
          },
        ]}
      >
        <Image
          source={require('@/assets/icons/icon.png')}
          style={styles.icon}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 18 },
  circle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // clip the square icon to the circle
    overflow: 'hidden',
  },
  icon: { width: 62, height: 62, borderRadius: 31 },
});

export default DrawerBrandHeader;
