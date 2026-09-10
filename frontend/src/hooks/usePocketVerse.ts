import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const STORAGE_KEY = '@pocket_verse';

export type PocketVerse = {
  /** Local calendar day the verse was chosen for, as YYYY-MM-DD. */
  dateKey: string;
  language: string;
  bookNumber: number;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
};

/** Local (not UTC) day key, so the verse turns over at the reader's midnight. */
export function todayKey(date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function pocketVerseReference(verse: PocketVerse): string {
  return `${verse.bookName} ${verse.chapterNumber}:${verse.verseNumber}`;
}

/**
 * The verse the reader carries for the day, like a slip of paper in a pocket.
 *
 * A verse belongs to the day it was chosen for. Once the date rolls over the
 * stored one is reported as stale rather than deleted, so the strip can keep
 * showing yesterday's words while inviting a fresh pick.
 */
export function usePocketVerse() {
  const [verse, setVerse] = useState<PocketVerse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [today, setToday] = useState(todayKey());

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setVerse(raw ? (JSON.parse(raw) as PocketVerse) : null);
    } catch {
      setVerse(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The app is commonly left open overnight, so re-check the date on focus
  // instead of trusting the value captured when the screen first mounted.
  useFocusEffect(
    useCallback(() => {
      setToday(todayKey());
    }, []),
  );

  const save = useCallback(
    async (next: Omit<PocketVerse, 'dateKey'>) => {
      const stamped: PocketVerse = { ...next, dateKey: todayKey() };
      setVerse(stamped);
      setToday(stamped.dateKey);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
      } catch {
        // A failed write only costs the verse on next launch; it still shows now.
      }
    },
    [],
  );

  return {
    verse,
    isLoading,
    isStale: !!verse && verse.dateKey !== today,
    setPocketVerse: save,
  };
}
