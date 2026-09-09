import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * The app-wide navigation ref, kept in its own module deliberately.
 *
 * It used to live in app/index.tsx, which created a require cycle:
 *   app/index -> StackNavigation -> Login -> AuthContext -> app/index
 *
 * Metro allows cycles but warns about them, because whichever module is
 * evaluated first sees the other's exports as undefined. AuthContext's 401
 * interceptor calls navigationRef.reset() to send the user back to Login, so
 * an undefined ref there would silently fail exactly when a session expires.
 *
 * This module imports nothing from the app, so nothing can cycle through it.
 */
export const navigationRef = createNavigationContainerRef<any>();

export default navigationRef;
