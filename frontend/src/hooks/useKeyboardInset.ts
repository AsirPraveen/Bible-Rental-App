import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height the on-screen keyboard currently covers, in dp (0 when hidden).
 *
 * Needed because the app targets SDK 36, where Android enforces edge-to-edge:
 * the window is no longer resized for the IME even with
 * `windowSoftInputMode="adjustResize"`, so content simply sits underneath the
 * keyboard. Adding this as bottom padding on a scrollable form keeps the
 * focused field reachable.
 *
 * `keyboardDidShow` is used rather than `keyboardWillShow` because the latter
 * never fires on Android.
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, e => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
