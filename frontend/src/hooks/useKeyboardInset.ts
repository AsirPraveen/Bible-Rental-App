import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, KeyboardEvent, Platform } from 'react-native';

/**
 * How much of the screen bottom the on-screen keyboard covers, in dp (0 when
 * hidden).
 *
 * Needed because the app targets SDK 36, where Android enforces edge-to-edge:
 * the window is no longer resized for the IME even with
 * `windowSoftInputMode="adjustResize"`, so content simply sits underneath the
 * keyboard and must be lifted by hand.
 *
 * Measured from the keyboard's TOP edge (`screenY`) down to the bottom of the
 * screen, rather than trusting `endCoordinates.height`. Under edge-to-edge the
 * reported height does not consistently include the navigation-bar strip the
 * keyboard is drawn over, and lifting by a short value leaves the bottom of an
 * input bar hidden behind the keyboard. The gap between the keyboard's top and
 * the screen's bottom is unambiguous: it is exactly what has to be cleared.
 *
 * `keyboardDidShow` is used rather than `keyboardWillShow` because the latter
 * never fires on Android.
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const measure = (e: KeyboardEvent) => {
      const { screenY, height: reported } = e.endCoordinates;

      if (Platform.OS === 'ios' || !screenY) {
        setHeight(reported);
        return;
      }

      // `screen` rather than `window`: under edge-to-edge the app spans the
      // whole display, and screenY is in those same coordinates.
      const screenHeight = Dimensions.get('screen').height;
      const covered = screenHeight - screenY;

      // Never go below what the platform reported. If screenY is measured in a
      // frame this build does not expect, the old value is still a sane floor.
      setHeight(Math.max(covered, reported));
    };

    const show = Keyboard.addListener(showEvent, measure);
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
