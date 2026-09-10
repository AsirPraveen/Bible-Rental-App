import { Platform, TextStyle } from 'react-native';

/**
 * Complex scripts that need different typography from Latin.
 *
 * Two things go wrong when Latin settings are applied to them:
 *
 * 1. `fontFamily: 'serif'` resolves to Noto Serif on Android, which has no
 *    coverage for Indic scripts. Android then falls back per-glyph to a
 *    different family, so a Latin word and a Tamil word in the same verse are
 *    set in different typefaces with different metrics. Georgia does the same
 *    on iOS. Leaving the family as the platform default lets the system pick
 *    the correct Noto Sans <Script>, which is designed for it.
 *
 * 2. These scripts stack vowel marks above and below the base glyph, so a
 *    1.5 line-height crowds them and can clip. They want roughly 1.8.
 */
const COMPLEX_SCRIPT = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0600-\u06FF\u4E00-\u9FFF]/

export function isComplexScript(text: string): boolean {
  return COMPLEX_SCRIPT.test(text || '');
}

/**
 * Typography for a verse, chosen from the text itself rather than from a
 * language list -- the set of Bible languages is whatever exists in the
 * database, so a hardcoded list would go stale the moment one is added.
 */
export function verseTypography(text: string, fontSize: number): TextStyle {
  if (isComplexScript(text)) {
    return {
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
      lineHeight: Math.round(fontSize * 1.8),
    };
  }
  return {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight: Math.round(fontSize * 1.5),
  };
}
