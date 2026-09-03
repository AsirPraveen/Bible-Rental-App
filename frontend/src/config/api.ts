import Constants from 'expo-constants';

/**
 * The single source of truth for the backend base URL.
 *
 * There is deliberately no fallback. Several screens previously defaulted to a
 * developer's LAN address (`http://192.168.1.13:5001`), which meant a build with
 * a missing API_URL pointed those screens at a machine that no longer answers —
 * and cleartext HTTP is blocked by default on modern Android and iOS anyway.
 * Failing loudly at startup is easier to diagnose than a handful of screens
 * quietly talking to nothing.
 */
export const API_BASE_URL: string = Constants.expoConfig?.extra?.apiUrl ?? '';

if (!API_BASE_URL) {
  console.error(
    '[config] API_URL is not set. Add it to frontend/.env and rebuild — ' +
    'every network request will fail until it is.'
  );
}

export default API_BASE_URL;
