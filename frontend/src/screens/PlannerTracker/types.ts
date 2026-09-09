/**
 * Shapes for the Bible reading planner.
 *
 * Plans live in AsyncStorage under `bibleReadingPlans` and are synced to the
 * server (`/api/reading-tracker/sync`) only as aggregate progress, so this is
 * the authoritative description of the on-device format.
 */

/** The four preset plan lengths offered in the UI. */
export type PlanDuration = '1 Month' | '3 Months' | '6 Months' | '1 Year';

/** One chapter to read. */
export interface ChapterReading {
  book: string;
  chapter: number;
  testament: string;
}

/** One day's assignment within a plan. */
export interface PlanDay {
  day: number;
  readings: ChapterReading[];
  completed: boolean;
}

export interface ReadingPlan {
  id: string;
  name: string;
  duration: PlanDuration;
  /** Testaments/sections the plan covers. */
  scope: string[];
  planType: string;
  days: number;
  /** ISO timestamp of when the plan was started. */
  startDate: string;
  plan: PlanDay[];
  currentDay: number;
}

/** Per-book cursor used by the mixed-plan generator to interleave books. */
export interface BookCursor {
  book: string;
  testament: string;
  chapters: ChapterReading[];
  currentIndex: number;
}
