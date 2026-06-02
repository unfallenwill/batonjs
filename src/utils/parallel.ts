/** Options for parallel execution */
export interface ParallelOptions {
  /** Called when a thunk rejects, before the slot resolves to null. */
  onError?: (error: unknown, index: number) => void
}

/**
 * Execute thunks concurrently without a shared semaphore.
 * Barrier semantics: waits for all thunks to settle before returning.
 * A thunk that rejects resolves to `null` in the result array.
 *
 * Note: concurrency is controlled by `executeAgent()`'s semaphore,
 * not here. Double-acquiring would cause deadlocks.
 */
export async function parallelExecute(
  thunks: ReadonlyArray<() => Promise<unknown>>,
  options?: ParallelOptions,
): Promise<unknown[]> {
  return Promise.all(
    thunks.map(async (thunk, index) => {
      try {
        return await thunk()
      } catch (error: unknown) {
        options?.onError?.(error, index)
        return null
      }
    }),
  )
}
