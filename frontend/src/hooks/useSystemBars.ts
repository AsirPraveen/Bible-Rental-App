import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';

import { barStyleFor } from '../theme/systemBars';

type SystemBarColors = {
  /** Colour the screen paints behind the status bar. */
  top: string;
  /**
   * Colour the screen paints behind the Android navigation bar. Defaults to
   * `top`, which is right for the common case of one root background. Pass it
   * explicitly when the bottom of the screen differs -- a tab child (whose tab
   * bar supplies the colour) or a screen with its own footer.
   */
  bottom?: string;
};

/**
 * Keeps both system bars legible against what THIS screen actually paints.
 *
 * Applied on focus rather than on mount, because a stack keeps previous screens
 * mounted: without useFocusEffect the last-mounted screen would keep ownership
 * of the bars after a back-navigation.
 *
 * There is deliberately no cleanup that restores a previous value. Each screen
 * sets the bars when it gains focus, so the screen being returned TO overwrites
 * them itself; restoring on blur would fight that and flicker.
 */
export function useSystemBars({ top, bottom }: SystemBarColors) {
  const bottomColor = bottom ?? top;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(barStyleFor(top));

      if (Platform.OS === 'android') {
        NavigationBar.setButtonStyleAsync(barStyleFor(bottomColor)).catch(() => {
          // Unsupported on some OEM skins; the system default stays readable.
        });
      }
    }, [top, bottomColor]),
  );
}
