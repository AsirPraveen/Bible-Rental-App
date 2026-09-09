// ════════════════════════════════════════════════
//  messageNote.ts  —  Types (v2 — Enhanced)
// ════════════════════════════════════════════════

export type NoteCategory =
  | 'Sunday Service'
  | 'Bible Study'
  | 'Prayer Cell'
  | 'Special Meeting'
  | 'Youth Meeting'
  | 'Other';

export type HighlightColor = 'yellow' | 'blue' | 'red';

export interface VerseHighlight {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  verseText: string;
  color: HighlightColor; // yellow=Important, blue=Promise, red=Warning
  note?: string;         // optional annotation on highlight
  language: 'English' | 'Tamil';
}

export interface VoiceNote {
  id: string;
  uri: string;          // local file URI
  durationMs: number;
  createdAt: string;
  label?: string;
}

export interface ReminderNote {
  id: string;
  title: string;        // e.g. "Study at 7 AM"
  message?: string;     // simple detail message (optional)
  scheduledTime: string; // ISO string
  repeating: boolean;
  notificationId?: string;
}


// Rich-text content uses simple markdown-like markers stored as plain string
// **bold** _italic_ • bullet  ==highlight==
export interface MessageNote {
  id: string;
  title: string;        // auto-generated: category + date
  date: string;         // ISO string — auto-set to now
  category: NoteCategory;
  content: string;      // rich-text string
  verse?: string;       // quick reference e.g. "John 3:16"
  highlights: VerseHighlight[];
  voiceNotes: VoiceNote[];
  reminders: ReminderNote[];
  isPublic?: boolean;    // shared with community
  authorEmail?: string;  // to identify public notes
  createdAt: string;
  updatedAt: string;
}