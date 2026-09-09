/**
 * The app's network layer.
 *
 * Screens import from here, never from `axios` directly. Each module owns one
 * backend domain and returns plain typed data; the shared client in
 * ./apiClient attaches auth and normalises errors into ApiError.
 */
export { apiClient, ApiError } from './apiClient';
export { booksService, authorsService } from './books';
export { organizationsService } from './organizations';
export { appSettingsService } from './appSettings';
