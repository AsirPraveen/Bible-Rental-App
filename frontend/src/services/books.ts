import { apiClient } from './apiClient';
import type { Book } from '../types/models';

/**
 * Book catalogue and rental endpoints.
 *
 * Copy accounting lives on the server: `total_copies` is the invariant
 * (`available_count + owned_by.length`), and approve/return use guarded atomic
 * updates. Nothing here should try to compute availability client-side.
 */
export const booksService = {
  async list(): Promise<Book[]> {
    const { data } = await apiClient.get('/api/books');
    return data.data ?? data;
  },

  async get(bookId: string): Promise<Book> {
    const { data } = await apiClient.get(`/api/books/${bookId}`);
    return data.data ?? data;
  },

  async create(book: Partial<Book>): Promise<Book> {
    const { data } = await apiClient.post('/api/add-book', book);
    return data.data ?? data;
  },

  /** `total_copies` is the TOTAL, not the delta; the server refuses a value
   *  below the number currently on loan. */
  async update(bookId: string, changes: Partial<Book>): Promise<Book> {
    const { data } = await apiClient.put(`/api/books/${bookId}`, changes);
    return data.data ?? data;
  },

  async remove(bookId: string): Promise<void> {
    await apiClient.delete(`/api/books/${bookId}`);
  },
};

export const authorsService = {
  async list() {
    const { data } = await apiClient.get('/api/authors');
    return data.data ?? data;
  },
  async get(authorId: string) {
    const { data } = await apiClient.get(`/api/authors/${authorId}`);
    return data.data ?? data;
  },
  async books(authorId: string): Promise<Book[]> {
    const { data } = await apiClient.get(`/api/authors/${authorId}/books`);
    return data.data ?? data;
  },
};
