import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

import { useSystemBars } from '../hooks/useSystemBars';

type ScreenContainerProps = {
  /**
   * Colour painted behind the status bar. This is the screen's own root
   * background, and it also decides the status bar icon colour.
   */
  background: string;
  /**
   * Colour behind the Android navigation bar, when it differs from
   * `background` -- e.g. a screen whose footer is a different colour.
   */
  bottomBackground?: string;
  /**
   * True for screens rendered inside a bottom tab navigator. The tab bar
   * already sizes itself `60 + insets.bottom` and paints that area, so the
   * screen must NOT claim the bottom inset as well -- doing so reserves the
   * space twice and shows as an empty band above the tab bar.
   */
  isTabChild?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];
const TAB_EDGES: readonly Edge[] = ['top', 'right', 'left'];

/**
 * The standard root for a screen: real safe-area insets plus system bars whose
 * icon colours are derived from the colour this screen actually paints.
 *
 * Prefer this over a bare SafeAreaView. The bars cannot be managed centrally --
 * under edge-to-edge they are transparent and show the screen's own pixels, so
 * only the screen knows what is behind them.
 */
export function ScreenContainer({
  background,
  bottomBackground,
  isTabChild = false,
  edges,
  style,
  children,
}: ScreenContainerProps) {
  // A tab child's nav-bar area belongs to the tab bar, so that colour -- not
  // this screen's background -- is what the nav buttons must contrast with.
  useSystemBars({ top: background, bottom: bottomBackground ?? background });

  return (
    <SafeAreaView
      edges={edges ?? (isTabChild ? TAB_EDGES : ALL_EDGES)}
      style={[{ flex: 1, backgroundColor: background }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

export default ScreenContainer;
