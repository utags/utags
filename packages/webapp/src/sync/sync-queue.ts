import {
  releaseAutoSyncSchedulerLock,
  isAutoSyncSchedulerLockOwner,
} from './auto-sync-scheduler.js'
// Attempt to import SyncManager type for better type safety.
// Assumes SyncManager is exported from './SyncManager.js'.
// If not, the previous inline type is acceptable, or it should be created and exported.
import type { SyncManager } from './sync-manager.js'

/**
 * @file Manages a global queue for synchronization tasks.
 * Ensures that sync operations are processed sequentially and only by the tab holding the auto-sync lock.
 */

/**
 * Defines the structure of a task in the synchronization queue.
 */
export type SyncQueueTask = {
  serviceId: string // The ID of the SyncServiceConfig to be processed.
  // Future task-specific details like priority or trigger type could be added here.
}

// Global synchronization queue.
const syncQueue: SyncQueueTask[] = []

// Flag to indicate if the queue is currently being processed.
let isProcessingQueue = false

/**
 * Adds a synchronization task to the global queue.
 * If the queue is not currently being processed and this tab holds the lock,
 * it starts processing the queue.
 *
 * @param task - The synchronization task to add.
 * @param syncManagerInstance - An instance of SyncManager to perform the sync operations.
 */
export function addToSyncQueue(
  task: SyncQueueTask,
  syncManagerInstance: SyncManager
): void {
  // Avoid adding duplicate tasks for the same service if it's already queued.
  if (syncQueue.some((t) => t.serviceId === task.serviceId)) {
    console.log(
      `[SyncQueue] Task for service ${task.serviceId} already in queue. Skipping.`
    )
    return
  }

  syncQueue.push(task)
  console.log(
    `[SyncQueue] Task added for service ${task.serviceId}. Queue length: ${syncQueue.length}`
  )

  // Start processing if not already doing so and this tab holds the auto-sync lock.
  // This check ensures that only the lock holder initiates queue processing.
  if (!isProcessingQueue && isAutoSyncSchedulerLockOwner()) {
    // Intentionally not awaiting processSyncQueue as it manages its own lifecycle.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    processSyncQueue(syncManagerInstance)
  }
}

/**
 * Processes the synchronization queue one task at a time.
 * Ensures that sync operations for different services are performed sequentially.
 * This function should only be called by the tab holding the auto-sync lock.
 *
 * @async
 * @param syncManagerInstance - An instance of SyncManager to perform the sync operations.
 * @returns A promise that resolves when the queue processing is complete or stopped.
 */
async function processSyncQueue(
  syncManagerInstance: SyncManager
): Promise<void> {
  if (isProcessingQueue || syncQueue.length === 0) {
    return
  }

  isProcessingQueue = true
  console.log('[SyncQueue] Starting to process queue.')

  while (syncQueue.length > 0) {
    // Crucially, check for lock ownership before processing each task.
    // If the lock is lost, stop processing and clear the queue to prevent conflicts
    // with another tab that might have acquired the lock.
    if (!isAutoSyncSchedulerLockOwner()) {
      console.warn(
        '[SyncQueue] Auto-sync scheduler lock lost. Clearing sync queue and stopping processing.'
      )
      syncQueue.length = 0 // Clear the queue immediately to prevent further processing.
      break // Exit the processing loop.
    }

    const task = syncQueue.shift() // Get the next task (FIFO).

    if (task) {
      console.log(`[SyncQueue] Processing task for service ${task.serviceId}`)
      try {
        // Delegate the actual synchronization logic to the SyncManager's synchronize method.
        // eslint-disable-next-line no-await-in-loop
        await syncManagerInstance.synchronize(task.serviceId)
        console.log(
          `[SyncQueue] Finished processing task for service ${task.serviceId}`
        )
      } catch (error) {
        console.error(
          `[SyncQueue] Error processing task for service ${task.serviceId}:`,
          error
        )
        // Future enhancement: Consider implementing retry logic or specific error handling here,
        // such as re-queueing the task with a delay or marking it as failed.
      }
    }
  }

  isProcessingQueue = false
  console.log('[SyncQueue] Finished processing queue.')

  // If this tab still holds the lock after the queue is empty or processing was stopped (e.g., due to lock loss),
  // release the lock. This allows other tabs or the scheduler in this tab to re-evaluate and potentially acquire it.
  if (isAutoSyncSchedulerLockOwner()) {
    console.log(
      '[SyncQueue] Releasing auto-sync scheduler lock as queue is now empty (or processing stopped) and this tab holds the lock.'
    )
    releaseAutoSyncSchedulerLock()
  }
}

/**
 * Checks if the synchronization queue is currently being processed.
 *
 * @returns True if the queue is being processed, false otherwise.
 */
export function isQueueProcessing(): boolean {
  return isProcessingQueue
}

/**
 * Clears all tasks from the synchronization queue.
 * This is typically used for testing or in scenarios where a reset of the queue is necessary,
 * for example, if the lock is lost and processing needs to be halted definitively.
 */
export function clearSyncQueue(): void {
  syncQueue.length = 0
  // Optionally, if isProcessingQueue should also be reset when the queue is forcibly cleared:
  // isProcessingQueue = false;
  // However, current logic in processSyncQueue already sets isProcessingQueue to false when the queue is empty or lock is lost.
}
