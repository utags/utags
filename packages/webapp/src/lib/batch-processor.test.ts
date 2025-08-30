import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processInBatches } from './batch-processor.js'

describe('processInBatches', () => {
  // Mock callback function for testing
  const mockCallback = vi.fn(async (batch: number[]) => {
    // Simulate async operation
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 10))
    return batch.reduce((sum, num) => sum + num, 0)
  })

  beforeEach(() => {
    mockCallback.mockClear()
  })

  it('should process all items in batches correctly', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i + 1)
    const batchSize = 3

    const result = await processInBatches(items, mockCallback, { batchSize })

    // Expect callback to be called for each batch
    expect(mockCallback).toHaveBeenCalledTimes(4) // 10 items, batchSize 3 -> 3,3,3,1
    expect(mockCallback).toHaveBeenCalledWith([1, 2, 3])
    expect(mockCallback).toHaveBeenCalledWith([4, 5, 6])
    expect(mockCallback).toHaveBeenCalledWith([7, 8, 9])
    expect(mockCallback).toHaveBeenCalledWith([10])

    // For 'failFast' (default), no results are returned directly
    expect(result).toBeUndefined()
  })

  it('should handle an empty array without calling the callback', async () => {
    const items: number[] = []
    const batchSize = 5

    await processInBatches(items, mockCallback, { batchSize })

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('should process items when batchSize is larger than total items', async () => {
    const items = [1, 2, 3]
    const batchSize = 5

    await processInBatches(items, mockCallback, { batchSize })

    expect(mockCallback).toHaveBeenCalledTimes(1)
    expect(mockCallback).toHaveBeenCalledWith([1, 2, 3])
  })

  it('should report progress correctly', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i + 1)
    const batchSize = 3
    const mockOnProgress = vi.fn()

    await processInBatches(items, mockCallback, {
      batchSize,
      onProgress: mockOnProgress,
    })

    expect(mockOnProgress).toHaveBeenCalledTimes(4)
    expect(mockOnProgress).toHaveBeenCalledWith({
      processedItems: 3,
      totalItems: 10,
      processedBatches: 1,
      totalBatches: 4,
    })
    expect(mockOnProgress).toHaveBeenCalledWith({
      processedItems: 6,
      totalItems: 10,
      processedBatches: 2,
      totalBatches: 4,
    })
    expect(mockOnProgress).toHaveBeenCalledWith({
      processedItems: 9,
      totalItems: 10,
      processedBatches: 3,
      totalBatches: 4,
    })
    expect(mockOnProgress).toHaveBeenCalledWith({
      processedItems: 10,
      totalItems: 10,
      processedBatches: 4,
      totalBatches: 4,
    })
  })

  it('should stop processing and throw error if onErrorStrategy is failFast and callback throws', async () => {
    const items = [1, 2, 3, 4, 5]
    const batchSize = 2
    const errorCallback = vi.fn(async (batch: number[]) => {
      if (batch[0] === 3) {
        throw new Error('Test error')
      }

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))
      return batch.reduce((sum, num) => sum + num, 0)
    })

    await expect(
      processInBatches(items, errorCallback, {
        batchSize,
        onErrorStrategy: 'failFast',
      })
    ).rejects.toThrow('Test error')

    expect(errorCallback).toHaveBeenCalledTimes(2) // Should stop after the second batch (items [3,4])
    expect(errorCallback).toHaveBeenCalledWith([1, 2])
    expect(errorCallback).toHaveBeenCalledWith([3, 4])
  })

  it('should continue processing and collect errors if onErrorStrategy is continueOnError', async () => {
    const items = [1, 2, 3, 4, 5, 6]
    const batchSize = 2
    const errorCallback = vi.fn(async (batch: number[]) => {
      if (batch[0] === 3 || batch[0] === 5) {
        throw new Error(`Error for batch starting with ${batch[0]}`)
      }

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))
      return batch.reduce((sum, num) => sum + num, 0)
    })

    const result = await processInBatches(items, errorCallback, {
      batchSize,
      onErrorStrategy: 'continueOnError',
    })

    expect(errorCallback).toHaveBeenCalledTimes(3) // All batches should be attempted
    expect(errorCallback).toHaveBeenCalledWith([1, 2])
    expect(errorCallback).toHaveBeenCalledWith([3, 4])
    expect(errorCallback).toHaveBeenCalledWith([5, 6])

    expect(result).toBeDefined()
    expect(result).toHaveProperty('results')
    expect(result).toHaveProperty('errors')
    expect((result as any).results).toEqual([3]) // Only the first successful batch result
    expect((result as any).errors).toHaveLength(2)
    expect((result as any).errors[0]).toBeInstanceOf(Error)
    expect((result as any).errors[0].message).toBe(
      'Error for batch starting with 3'
    )
    expect((result as any).errors[1]).toBeInstanceOf(Error)
    expect((result as any).errors[1].message).toBe(
      'Error for batch starting with 5'
    )
  })

  it('should abort processing when signal is aborted', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i + 1)
    const batchSize = 2
    const abortController = new AbortController()
    const abortCallback = vi.fn(async (batch: number[]) => {
      if (batch[0] === 5) {
        abortController.abort() // Abort during the third batch
      }

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))
      return batch.reduce((sum, num) => sum + num, 0)
    })

    await expect(
      processInBatches(items, abortCallback, {
        batchSize,
        signal: abortController.signal,
      })
    ).rejects.toThrow('Aborted')

    expect(abortCallback).toHaveBeenCalledTimes(3) // Should stop after the third batch (items [5,6])
    expect(abortCallback).toHaveBeenCalledWith([1, 2])
    expect(abortCallback).toHaveBeenCalledWith([3, 4])
    expect(abortCallback).toHaveBeenCalledWith([5, 6])
  })

  it('should throw Aborted immediately if signal is already aborted', async () => {
    const items = [1, 2, 3]
    const abortController = new AbortController()
    abortController.abort() // Abort before calling processInBatches

    await expect(
      processInBatches(items, mockCallback, { signal: abortController.signal })
    ).rejects.toThrow('Aborted')

    expect(mockCallback).not.toHaveBeenCalled()
  })
})
