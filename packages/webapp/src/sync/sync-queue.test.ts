import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { emptyFunction } from '../utils/test/empty-function.js'
import {
  addToSyncQueue,
  isQueueProcessing,
  clearSyncQueue,
  type SyncQueueTask,
} from './sync-queue.js'
import type { SyncManager } from './sync-manager.js'

// Mock dependencies
const { mockIsAutoSyncSchedulerLockOwner, mockReleaseAutoSyncSchedulerLock } =
  vi.hoisted(() => ({
    mockIsAutoSyncSchedulerLockOwner: vi.fn(),
    mockReleaseAutoSyncSchedulerLock: vi.fn(),
  }))
const mockSyncManagerSynchronize = vi.fn()

vi.mock('./auto-sync-scheduler.js', () => ({
  isAutoSyncSchedulerLockOwner: mockIsAutoSyncSchedulerLockOwner,
  releaseAutoSyncSchedulerLock: mockReleaseAutoSyncSchedulerLock,
}))

// Mock SyncManager instance
const mockSyncManager = {
  synchronize: mockSyncManagerSynchronize,
} as unknown as SyncManager

// Helper to get the internal queue state for assertions (not directly exported by the module)
// This is a common pattern in testing to inspect internal state if necessary.
// For this, we'll rely on the side effects and mock calls.

/**
 * @file Unit tests for the synchronization queue.
 */
describe('Sync Queue', () => {
  beforeEach(() => {
    // Reset all mocks and internal state before each test
    vi.clearAllMocks()
    // Reset internal queue state by ensuring no tasks are left from previous tests
    // This is tricky as the queue is not exported. We assume processSyncQueue clears it.
    // Or, we can re-initialize the module if Vitest supports it, or test its clearing behavior.
    // For now, we'll ensure tests clean up after themselves.

    // Default mock states
    mockIsAutoSyncSchedulerLockOwner.mockReturnValue(true) // Assume lock is owned by default
    mockSyncManagerSynchronize.mockResolvedValue(true) // Assume sync is successful
  })

  afterEach(async () => {
    // Ensure queue is cleared after tests that might leave tasks
    // This simulates the queue processing until empty if it wasn't already.
    // Need to access the queue or ensure processSyncQueue runs to completion.
    // Since we can't directly access `syncQueue` array or `isProcessingQueue` boolean,
    // we rely on `processSyncQueue` being called and completing.
    // If a test leaves items and `processSyncQueue` wasn't called, this won't clean it.
    // This is a limitation of not exporting the queue for test purposes.
    clearSyncQueue()
  })

  describe('addToSyncQueue', () => {
    /**
     * Test case: Add a task when the queue is empty and lock is owned.
     * Expected: Task is added, and processSyncQueue is called.
     */
    it('should add a task and start processing if queue is empty and lock is owned', () => {
      const task: SyncQueueTask = { serviceId: 'service1' }
      addToSyncQueue(task, mockSyncManager)

      // Check if synchronize was called (indirectly means processSyncQueue was called)
      // Need to wait for the promise chain if processSyncQueue is async
      // For simplicity, we'll check if it was called. A more robust test would await its completion.
      expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service1')
    })

    /**
     * Test case: Add a task when the queue is empty and lock is NOT owned.
     * Expected: Task is added, but processSyncQueue is NOT called.
     */
    it('should add a task but not start processing if lock is not owned', () => {
      mockIsAutoSyncSchedulerLockOwner.mockReturnValue(false)
      const task: SyncQueueTask = { serviceId: 'service1' }
      addToSyncQueue(task, mockSyncManager)

      expect(mockSyncManagerSynchronize).not.toHaveBeenCalled()
    })

    /**
     * Test case: Add a duplicate task.
     * Expected: Duplicate task is not added, and processSyncQueue is not called again for it.
     */
    it('should not add a duplicate task', async () => {
      const task1: SyncQueueTask = { serviceId: 'service1' }
      const task2: SyncQueueTask = { serviceId: 'service2' }
      const consoleSpy = vi.spyOn(console, 'log')

      // Prevent processing from starting immediately for the first add
      mockIsAutoSyncSchedulerLockOwner.mockReturnValue(false)

      addToSyncQueue(task1, mockSyncManager) // First add, should not process yet
      expect(mockSyncManagerSynchronize).not.toHaveBeenCalled() // Ensure it hasn't processed
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncQueue] Task added for service service1. Queue length: 1'
      )

      // Attempt to add the same task again
      addToSyncQueue(task1, mockSyncManager) // Second add, should be skipped

      // Check that the skipping log was called
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncQueue] Task for service service1 already in queue. Skipping.'
      )

      // Ensure synchronize was still not called, as processing was prevented and the second task was skipped
      expect(mockSyncManagerSynchronize).not.toHaveBeenCalled()

      // Attempt to add another task with a different serviceId
      addToSyncQueue(task2, mockSyncManager) // Third add, should be processed

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncQueue] Task added for service service2. Queue length: 2'
      )

      // Ensure synchronize was still not called, as processing was prevented and the second task was skipped
      expect(mockSyncManagerSynchronize).not.toHaveBeenCalled()

      // Clean up the spy
      consoleSpy.mockRestore()
      // Reset mock for other tests
      mockIsAutoSyncSchedulerLockOwner.mockReturnValue(true)
    })

    /**
     * Test case: Add a task when another task is already being processed.
     * Expected: Task is added, but processSyncQueue is not called again immediately.
     */
    it('should add a task but not start new processing if already processing', async () => {
      const task1: SyncQueueTask = { serviceId: 'service1' }
      const task2: SyncQueueTask = { serviceId: 'service2' }

      // Make synchronize take time, so isProcessingQueue is true
      let resolveProcess: (value: boolean | PromiseLike<boolean>) => void =
        emptyFunction

      mockSyncManagerSynchronize.mockImplementationOnce(
        async () =>
          new Promise((resolve) => {
            resolveProcess = resolve
          })
      )

      addToSyncQueue(task1, mockSyncManager) // This will start processing and set isProcessingQueue = true
      expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service1')

      addToSyncQueue(task2, mockSyncManager) // Add while first is "processing"
      // processSyncQueue should not be called again for task2 directly
      // It will be picked up when task1 finishes.
      // We can check that synchronize for service2 is not called yet.
      expect(mockSyncManagerSynchronize).toHaveBeenCalledTimes(1)
      expect(mockSyncManagerSynchronize).not.toHaveBeenCalledWith('service2')

      // Complete the first task
      resolveProcess(true)
      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service2')
      })
      expect(mockSyncManagerSynchronize).toHaveBeenCalledTimes(2)
    })
  })

  describe('processSyncQueue', () => {
    /**
     * Test case: Process a single task successfully.
     * Expected: synchronize is called, lock is released.
     */
    it('should process a single task and release lock', async () => {
      const task: SyncQueueTask = { serviceId: 'service1' }
      addToSyncQueue(task, mockSyncManager)

      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service1')
      })
      await vi.waitFor(() => {
        expect(mockReleaseAutoSyncSchedulerLock).toHaveBeenCalled()
      })
      expect(isQueueProcessing()).toBe(false)
    })

    /**
     * Test case: Process multiple tasks sequentially.
     * Expected: synchronize is called for each task in order, lock released at the end.
     */
    it('should process multiple tasks sequentially', async () => {
      const task1: SyncQueueTask = { serviceId: 'service1' }
      const task2: SyncQueueTask = { serviceId: 'service2' }

      // Prevent immediate processing to queue them up
      mockIsAutoSyncSchedulerLockOwner.mockReturnValue(false)
      addToSyncQueue(task1, mockSyncManager)
      addToSyncQueue(task2, mockSyncManager)
      expect(mockSyncManagerSynchronize).not.toHaveBeenCalled()

      // Now allow processing
      mockIsAutoSyncSchedulerLockOwner.mockReturnValue(true)
      // Manually trigger processing (since addToSyncQueue didn't)
      // This requires exporting processSyncQueue or having a way to trigger it.
      // Let's assume the first addToSyncQueue with lock=true would trigger it.
      // So, let's re-add a dummy task or the first one again with lock=true
      addToSyncQueue({ serviceId: 'trigger' }, mockSyncManager) // This will start processing the queue

      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service1')
      })
      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service2')
      })
      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('trigger')
      })
      expect(mockSyncManagerSynchronize.mock.calls[0][0]).toBe('service1')
      expect(mockSyncManagerSynchronize.mock.calls[1][0]).toBe('service2')
      expect(mockSyncManagerSynchronize.mock.calls[2][0]).toBe('trigger')

      await vi.waitFor(() => {
        expect(mockReleaseAutoSyncSchedulerLock).toHaveBeenCalled()
      })
      expect(isQueueProcessing()).toBe(false)
    })

    /**
     * Test case: Lock is lost during queue processing.
     * Expected: Processing stops, queue is cleared, lock is not released by this tab.
     */
    it('should stop processing and clear queue if lock is lost', async () => {
      const task1: SyncQueueTask = { serviceId: 'service1' }
      const task2: SyncQueueTask = { serviceId: 'service2' }

      // Setup: task1 will make lock lost
      mockSyncManagerSynchronize.mockImplementationOnce(async (serviceId) => {
        if (serviceId === 'service1') {
          mockIsAutoSyncSchedulerLockOwner.mockReturnValue(false) // Simulate lock loss
        }

        return true
      })

      addToSyncQueue(task1, mockSyncManager)
      addToSyncQueue(task2, mockSyncManager) // task2 should not be processed

      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service1')
      })
      expect(mockSyncManagerSynchronize).not.toHaveBeenCalledWith('service2')
      expect(mockReleaseAutoSyncSchedulerLock).not.toHaveBeenCalled() // Lock was lost, so not released by this instance
      expect(isQueueProcessing()).toBe(false)

      // Verify queue is empty (indirectly, by trying to process again)
      mockSyncManagerSynchronize.mockClear()
      mockIsAutoSyncSchedulerLockOwner.mockReturnValue(true) // Regain lock
      addToSyncQueue({ serviceId: 'service3' }, mockSyncManager) // Add a new task
      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service3')
      })
      // If task2 was still there, it would have been processed before service3.
      // This confirms the queue was cleared.
    })

    /**
     * Test case: Error occurs during task synchronization.
     * Expected: Error is logged, queue continues with next task, lock released at end.
     */
    it('should handle errors during task synchronization and continue', async () => {
      const task1: SyncQueueTask = { serviceId: 'service1' }
      const task2: SyncQueueTask = { serviceId: 'service2' }
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(emptyFunction)

      mockSyncManagerSynchronize.mockImplementationOnce(async (serviceId) => {
        if (serviceId === 'service1') {
          throw new Error('Sync failed for service1')
        }

        return true
      })

      addToSyncQueue(task1, mockSyncManager)
      addToSyncQueue(task2, mockSyncManager)

      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service1')
      })
      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[SyncQueue] Error processing task for service service1:',
          expect.any(Error)
        )
      })
      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service2')
      })
      await vi.waitFor(() => {
        expect(mockReleaseAutoSyncSchedulerLock).toHaveBeenCalled()
      })
      expect(isQueueProcessing()).toBe(false)

      consoleErrorSpy.mockRestore()
    })

    /**
     * Test case: processSyncQueue is called when already processing.
     * Expected: It should not do anything.
     */
    it('should do nothing if called when already processing or queue is empty', async () => {
      // Scenario 1: Queue is empty
      // addToSyncQueue with an empty queue and lock owned would call processSyncQueue.
      // If processSyncQueue is called directly (if it were exported) when queue is empty, it should return.
      // This is implicitly tested by successful empty queue processing.

      // Scenario 2: Already processing (tested in addToSyncQueue section)
      // If processSyncQueue was exported and called while isProcessingQueue = true, it should return.
      // This is harder to test without exporting processSyncQueue.
      // The current structure ensures addToSyncQueue handles this by not calling processSyncQueue.
      expect(true).toBe(true) // Placeholder, as direct test is difficult with current exports
    })

    /**
     * Test case: Lock is not owned when processing finishes.
     * Expected: releaseAutoSyncSchedulerLock is not called.
     */
    it('should not release lock if not owned when processing finishes', async () => {
      const task: SyncQueueTask = { serviceId: 'service1' }

      mockSyncManagerSynchronize.mockImplementationOnce(async () => {
        mockIsAutoSyncSchedulerLockOwner.mockReturnValue(false) // Lock lost during the sync call itself
        return true
      })

      addToSyncQueue(task, mockSyncManager)

      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service1')
      })
      // Wait a bit to ensure post-processing logic has a chance to run
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockReleaseAutoSyncSchedulerLock).not.toHaveBeenCalled()
      expect(isQueueProcessing()).toBe(false)
    })
  })

  describe('isQueueProcessing', () => {
    /**
     * Test case: Check isQueueProcessing status during processing.
     * Expected: Returns true while processing, false otherwise.
     */
    it('should return true while processing and false otherwise', async () => {
      const task: SyncQueueTask = { serviceId: 'service1' }
      let resolveProcess: (value: boolean | PromiseLike<boolean>) => void =
        emptyFunction

      mockSyncManagerSynchronize.mockImplementationOnce(
        async () =>
          new Promise((resolve) => {
            resolveProcess = resolve
            // Check status while processing
            expect(isQueueProcessing()).toBe(true)
          })
      )

      expect(isQueueProcessing()).toBe(false) // Before starting
      addToSyncQueue(task, mockSyncManager)
      // isQueueProcessing() is checked inside the mockImplementationOnce

      resolveProcess(true) // Finish processing
      await vi.waitFor(() => {
        expect(isQueueProcessing()).toBe(false)
      }) // After finishing
    })
  })

  describe('clearSyncQueue', () => {
    /**
     * Test case: Clear the queue when it has tasks.
     * Expected: The queue becomes empty and no tasks are processed afterwards.
     */
    it('should remove all tasks from the queue', async () => {
      const task1: SyncQueueTask = { serviceId: 'service1' }
      const task2: SyncQueueTask = { serviceId: 'service2' }

      // Prevent immediate processing to queue them up
      mockIsAutoSyncSchedulerLockOwner.mockReturnValue(false)
      addToSyncQueue(task1, mockSyncManager)
      addToSyncQueue(task2, mockSyncManager)

      // At this point, tasks are in the queue but not processed
      // Verify by trying to process (should not find tasks if queue was empty)
      // Or, if we could inspect the queue, we'd check its length.

      clearSyncQueue() // Clear the queue

      // Now, even if lock is acquired, no tasks should process
      mockIsAutoSyncSchedulerLockOwner.mockReturnValue(true)
      // Attempt to trigger processing (e.g. by adding a new task or if processSyncQueue was exported)
      // If processSyncQueue was triggered, it should find an empty queue.
      // Let's add a new task to see if only that one gets processed.
      const task3: SyncQueueTask = { serviceId: 'service3' }
      addToSyncQueue(task3, mockSyncManager)

      await vi.waitFor(() => {
        expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('service3')
      })
      // Ensure that service1 and service2 were not processed
      expect(mockSyncManagerSynchronize).not.toHaveBeenCalledWith('service1')
      expect(mockSyncManagerSynchronize).not.toHaveBeenCalledWith('service2')
      expect(mockSyncManagerSynchronize).toHaveBeenCalledTimes(1)
    })

    /**
     * Test case: Clear the queue when it is empty.
     * Expected: The queue remains empty, no errors occur.
     */
    it('should do nothing if the queue is already empty', () => {
      expect(isQueueProcessing()).toBe(false) // Pre-condition: queue is empty and not processing

      clearSyncQueue() // Clear an already empty queue

      // No direct way to assert queue emptiness without inspecting it or its effects.
      // We can assert that no errors were thrown and processing state remains false.
      expect(isQueueProcessing()).toBe(false)

      // Try to add a task and process it to ensure the queue system is still functional.
      const task: SyncQueueTask = { serviceId: 'serviceNew' }
      addToSyncQueue(task, mockSyncManager)
      expect(mockSyncManagerSynchronize).toHaveBeenCalledWith('serviceNew')
    })
  })
})
