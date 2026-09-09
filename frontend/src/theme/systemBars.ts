/**
 * Deciding status-bar / navigation-bar appearance from the colour behind them.
 *
 * Under Android edge-to-edge (the Expo SDK 54 default) neither system bar has a
 * background of its own -- `setBackgroundColorAsync` is a documented no-op, and
 * the screen's own pixels show through both bars. The only thing an app can
 * control is the ICON colour, and that has to contrast with whatever the screen
 * happens to paint underneath.
 *
 * That is why a global rule cannot work: the colour is a per-screen decision, so
 * the icon colour has to be derived from it rather than from the route name or
 * the theme.
 */

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (full.length !== 6) return 0;
  const channel = (pair: string) => {
    const v = parseInt(pair, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(full.slice(0, 2)) +
    0.7152 * channel(full.slice(2, 4)) +
    0.0722 * channel(full.slice(4, 6))
  );
}

/** WCAG contrast ratio between two hex colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Which icon colour reads best on top of `background`.
 *
 * Returns the expo-status-bar / expo-navigation-bar convention, where 'light'
 * means light-coloured ICONS (for a dark background) and 'dark' means dark
 * icons.
 *
 * The threshold is the exact crossover where white and black contrast equally
 * against the background, i.e. where (L + 0.05)^2 = 1.05 * 0.05, so
 * L = sqrt(0.0525) - 0.05 ~= 0.1792. Picking it by eye gets the app's own
 * secondary #19A7CE (L 0.323) wrong: it looks "mid-dark" but black scores
 * 7.46:1 on it against white's 2.81:1.
 */
export const ICON_CROSSOVER_LUMINANCE = Math.sqrt(1.05 * 0.05) - 0.05;

export function barStyleFor(background: string): 'light' | 'dark' {
  return relativeLuminance(background) < ICON_CROSSOVER_LUMINANCE ? 'light' : 'dark';
}
