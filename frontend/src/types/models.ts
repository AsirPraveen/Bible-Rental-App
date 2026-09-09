/**
 * Shared shapes for the entities the backend returns.
 *
 * These mirror backend/models/*.js. They are deliberately hand-written rather
 * than generated: the API is small and stable, and a generated client would be
 * another build step for the next person to learn.
 *
 * Fields the server may omit are optional here. Do not "fix" a compile error by
 * widening one to `any` -- if the server really can omit it, the screen has to
 * handle that.
 */

export type ThemeName = 'light' | 'dark';
export type GlobalRole = 'SuperAdmin' | 'User';
export type OrgRole = 'admin' | 'member';

export interface Book {
  _id: string;
  organization: string;
  book_id: string;
  book_name: string;
  author_name: string;
  author_id?: string;
  pages?: number;
  preface?: string;
  cover_image?: string;
  year_of_publication?: number;
  /** Invariant: total_copies === available_count + owned_by.length */
  total_copies: number;
  available_count: number;
  owned_by: string[];
  rent_count: number;
  rent_from?: string;
  likes?: string[];
  showInOrg?: boolean;
}

export interface UserDetails {
  _id: string;
  name: string;
  email: string;
  image?: string;
  globalRole: GlobalRole;
  organization?: string;
  orgRole?: OrgRole;
  lastActiveAt?: string;
}

export interface Organization {
  _id: string;
  name: string;
  code?: string;
  logo?: string;
  /** Feature flags; a key set to false disables that feature for the org. */
  features?: Record<string, boolean>;
}

export interface Fellowship {
  _id: string;
  organization: string;
  name: string;
  description?: string;
  /** Emoji shown in the drawer list. */
  icon?: string;
  type?: string;
  createdBy?: string;
  members: { user?: string; email?: string; role?: string }[];
  /** Denormalised on the Fellowship document for the drawer's preview row. */
  lastMessage?: {
    text?: string;
    sender?: string;
    senderName?: string;
    sentAt?: string;
  };
  /** Computed per-caller by the list endpoint; absent on a single fetch. */
  unreadCount?: number;
}

export interface MessageNote {
  _id: string;
  organization: string;
  title: string;
  content?: string;
  speaker?: string;
  date?: string;
  tags?: string[];
}

export interface PrayerRequest {
  _id: string;
  organization: string;
  title: string;
  description?: string;
  isAnonymous?: boolean;
  prayedBy?: string[];
  createdAt?: string;
}

/** The envelope most endpoints wrap their payload in. */
export interface ApiEnvelope<T> {
  status?: 'Ok' | 'error';
  data: T;
  message?: string;
}
