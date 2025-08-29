/**
 * Options for the processInBatches function.
 */
export type ProcessInBatchesOptions = {
  /**
   * The size of each batch.
   * @default 100
   */
  batchSize?: number
  /**
   * Signal to abort the batch processing.
   */
  signal?: AbortSignal
  /**
   * Callback function for progress reporting.
   * @param progress - The current progress information.
   */
  onProgress?: (progress: {
    processedItems: number
    totalItems: number
    processedBatches: number
    totalBatches: number
  }) => void
  /**
   * Error handling strategy.
   * - 'failFast': Stops processing on the first error and throws the error.
   * - 'continueOnError': Continues processing subsequent batches even if some batches fail, and returns a list of errors.
   * @default 'failFast'
   */
  onErrorStrategy?: 'failFast' | 'continueOnError'
}

/**
 * Executes an asynchronous callback function for each batch of items in an array.
 *
 * @template T The type of items in the array.
 * @template R The type of result from the callback for each batch (if 'continueOnError' is used).
 * @param {T[]} items The array of items to process.
 * @param {(batch: T[]) => Promise<R | void>} callback The async callback function to execute for each batch.
 * @param {ProcessInBatchesOptions} [options] Optional configuration for batch processing.
 * @returns {Promise<{ results?: R[], errors?: Error[] } | void>} A promise that resolves when all batches have been processed.
 * If 'onErrorStrategy' is 'continueOnError', it returns an object with results and errors.
 * If 'onErrorStrategy' is 'failFast' and an error occurs, the promise is rejected with the error.
 * @throws {Error} Propagates any error thrown by the callback function if 'onErrorStrategy' is 'failFast'.
 * @throws {Error} Throws an error if processing is aborted via the AbortSignal.
 */
export async function processInBatches<T, R = void>(
  items: T[],
  callback: (batch: T[]) => Promise<R>,
  options?: ProcessInBatchesOptions
): Promise<{ results: R[]; errors: Error[] } | void> {
  const {
    batchSize = 100,
    signal,
    onProgress,
    onErrorStrategy = 'failFast',
  } = options || {}

  let processedItems = 0
  let processedBatches = 0
  const totalItems = items.length
  const totalBatches = Math.ceil(totalItems / batchSize)
  const results: R[] = []
  const errors: Error[] = []

  for (let i = 0; i < totalItems; i += batchSize) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const batch = items.slice(i, i + Math.min(batchSize, totalItems - i))
    if (batch.length === 0) {
      break // Should not happen if loop condition is correct, but as a safeguard
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await callback(batch)
      if (onErrorStrategy === 'continueOnError') {
        results.push(result)
      }
    } catch (error) {
      if (onErrorStrategy === 'failFast') {
        throw error // Propagate error and stop processing
      }

      if (onErrorStrategy === 'continueOnError') {
        errors.push(error as Error)
        // Optionally, you could push a specific marker or undefined to results for failed batches
      } else {
        // Should not be reached if onErrorStrategy is one of the two valid values
        throw error
      }
    }

    processedItems += batch.length
    processedBatches++

    if (onProgress) {
      onProgress({ processedItems, totalItems, processedBatches, totalBatches })
    }

    // Yield to the event loop to prevent blocking, especially for large datasets
    // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  if (onErrorStrategy === 'continueOnError') {
    return { results, errors }
  }
}
