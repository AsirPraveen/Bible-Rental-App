/**
 * Tracks in-flight "liked song/verse" writes so readers can wait for them.
 *
 * Liking a song writes to AsyncStorage immediately and to the server in the
 * background. The wishlist treats the server as the source of truth, so if it
 * loads while that write is still travelling it reads the pre-toggle list and
 * the song appears to be missing until a later visit. Readers await this first.
 */
let pending: Promise<unknown> = Promise.resolve();

/** Registers a like write. Failures are swallowed: waiters only need it settled. */
export function trackLikeSync<T>(promise: Promise<T>): Promise<T> {
  pending = pending.then(() => promise).catch(() => undefined);
  return promise;
}

/** Resolves once every registered like write has settled. */
export function awaitLikeSync(): Promise<void> {
  return pending.then(
    () => undefined,
    () => undefined,
  );
}
