import { get } from 'svelte/store'
import {
  syncConfigStore,
  type SyncSettings,
} from '../stores/sync-config-store.js'
import { bookmarkStorage } from '../lib/bookmark-storage.js'
import { addToSyncQueue, isQueueProcessing } from './sync-queue.js'
import type { SyncManager } from './sync-manager.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
const CHECK_INTERVAL = 10 * 1000 // 10 seconds
// eslint-disable-next-line @typescript-eslint/naming-convention
const LOCK_KEY = 'utags_auto_sync_lock_owner'
// eslint-disable-next-line @typescript-eslint/naming-convention
const LOCK_HEARTBEAT_KEY = 'utags_auto_sync_lock_heartbeat'
// eslint-disable-next-line @typescript-eslint/naming-convention
const LOCK_TIMEOUT = 30 * 1000 // 30 seconds for lock timeout
// eslint-disable-next-line @typescript-eslint/naming-convention
const SYNC_COMPLETION_BUFFER_MS = 3000

let intervalId: number | undefined
const currentTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`
let lockHeartbeatIntervalId: number | undefined

// Flag to track if event listeners are already bound
let isEventListenersBound = false

// Handler for beforeunload event
const handleBeforeUnload = () => {
  console.log(
    `[AutoSyncScheduler] Tab ${currentTabId} is closing. Releasing resources.`
  )
  stopAutoSyncScheduler() // Call stopAutoSyncScheduler to handle cleanup
}

// Handler for visibilitychange event
let handleVisibilityChange: () => void = () => {
  console.error('[AutoSyncScheduler] Visibility change handler not initialized')
}

// Initialize the visibility change handler with the sync manager instance
const initVisibilityChangeHandler = (syncManager: SyncManager) => {
  handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log(`[AutoSyncScheduler] Tab ${currentTabId} became visible.`)
      // If tab becomes visible and doesn't have the lock, try to acquire it.
      // This helps if this tab was in the background and lost the lock, or another tab crashed.
      if (checkHasLock()) {
        // If already holding the lock, still perform a sync check on visibility change
        console.log(
          '[AutoSyncScheduler] Already holding lock, performing sync check on visibility.'
        )
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        checkAndScheduleSync(syncManager, true)
      } else {
        console.log(
          '[AutoSyncScheduler] Attempting to acquire lock on visibility.'
        )
        if (acquireLock()) {
          // If lock acquired, perform a sync check.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          checkAndScheduleSync(syncManager, true)
        }
      }
    } else if (document.visibilityState === 'hidden') {
      console.log(`[AutoSyncScheduler] Tab ${currentTabId} became hidden.`)
      // Optional: Consider releasing the lock if the tab is hidden, not processing the queue,
      // and holds the lock. This could allow a visible tab to take over sooner.
      // This behavior might be too aggressive and lead to lock flapping, so it's commented out.
      // if (checkHasLock() && !isQueueProcessing()) {
      //   console.log('[AutoSyncScheduler] Releasing lock as tab is hidden and queue is idle.');
      //   releaseLock();
      // }
    }
  }
}

/**
 * Checks if the current tab holds the synchronization lock by inspecting localStorage.
 * @returns {boolean} True if the current tab owns the lock, false otherwise.
 */
function checkHasLock(): boolean {
  try {
    // Check if localStorage is available (e.g., not in a private browsing session that blocks it)
    if (typeof localStorage === 'undefined') {
      // console.warn('[AutoSyncScheduler] localStorage is not available.');
      return false
    }

    return localStorage.getItem(LOCK_KEY) === currentTabId
  } catch (error) {
    console.error('[AutoSyncScheduler] Error checking lock status:', error)
    return false // Assume no lock if localStorage is inaccessible
  }
}

/**
 * Attempts to acquire the synchronization lock using localStorage.
 * Includes a basic timeout and heartbeat mechanism.
 * @returns {boolean} True if the lock was acquired, false otherwise.
 */
function acquireLock(): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      // console.warn('[AutoSyncScheduler] localStorage is not available for acquiring lock.');
      return false
    }

    const lockOwner = localStorage.getItem(LOCK_KEY)
    const lastHeartbeatString = localStorage.getItem(LOCK_HEARTBEAT_KEY)
    const lastHeartbeat = Number.parseInt(lastHeartbeatString || '0', 10)

    if (
      !lockOwner || // No current owner
      lockOwner === currentTabId || // This tab already owns the lock (e.g., re-acquiring after visibility change)
      Date.now() - lastHeartbeat > LOCK_TIMEOUT // Lock has expired
    ) {
      localStorage.setItem(LOCK_KEY, currentTabId)
      localStorage.setItem(LOCK_HEARTBEAT_KEY, Date.now().toString())
      console.log(`[AutoSyncScheduler] Tab ${currentTabId} acquired lock.`)

      // Clear any existing heartbeat interval before starting a new one
      if (lockHeartbeatIntervalId) clearInterval(lockHeartbeatIntervalId)
      lockHeartbeatIntervalId = setInterval(() => {
        if (checkHasLock()) {
          try {
            localStorage.setItem(LOCK_HEARTBEAT_KEY, Date.now().toString())
          } catch (error) {
            console.error(
              '[AutoSyncScheduler] Error updating lock heartbeat:',
              error
            )
            // If heartbeat fails, it's critical. Release the lock to allow another tab to take over.
            // This prevents a situation where a tab thinks it has the lock but cannot maintain it.
            releaseLock()
          }
        }
      }, LOCK_TIMEOUT / 3) as any as number // Heartbeat at 1/3 of timeout duration

      return true
    }

    // console.log(`[AutoSyncScheduler] Tab ${currentTabId} failed to acquire lock. Current owner: ${lockOwner}, Last heartbeat: ${new Date(lastHeartbeat).toISOString()}`);
    return false
  } catch (error) {
    console.error('[AutoSyncScheduler] Error acquiring lock:', error)
    return false
  }
}

/**
 * Releases the synchronization lock and clears the heartbeat interval.
 */
function releaseLock(): void {
  try {
    if (typeof localStorage === 'undefined') {
      // console.warn('[AutoSyncScheduler] localStorage is not available for releasing lock.');
      return
    }

    // Only remove lock items if this tab is the current owner
    if (localStorage.getItem(LOCK_KEY) === currentTabId) {
      localStorage.removeItem(LOCK_KEY)
      localStorage.removeItem(LOCK_HEARTBEAT_KEY)
      console.log(`[AutoSyncScheduler] Tab ${currentTabId} released lock.`)
    }
  } catch (error) {
    console.error('[AutoSyncScheduler] Error releasing lock:', error)
  }

  // Always clear the heartbeat interval for this tab, regardless of lock ownership status
  if (lockHeartbeatIntervalId) {
    clearInterval(lockHeartbeatIntervalId)
    lockHeartbeatIntervalId = undefined
  }
}

/**
 * Checks sync services based on their configuration and adds them to the sync queue if necessary.
 * This function will only proceed if the current tab holds the auto-sync lock.
 * @param {SyncManager} syncManagerInstance - An instance of SyncManager to pass to addToSyncQueue.
 * @param {boolean} isFromVisibilityChange - Whether this call is triggered by a visibility change event.
 */
async function checkAndScheduleSync(
  syncManagerInstance: SyncManager,
  isFromVisibilityChange = false
): Promise<void> {
  // Ensure this tab holds the lock before proceeding.
  // Attempt to acquire if not held, but don't proceed if acquisition fails.
  if (!checkHasLock() && !acquireLock()) {
    console.log(
      `[AutoSyncScheduler] Tab ${currentTabId} does not have lock, skipping sync check.`
    )
    return
  }

  console.log(
    `[AutoSyncScheduler] Tab ${currentTabId} checking for pending sync tasks...`
  )
  try {
    const currentSettings: SyncSettings = syncConfigStore
      ? get(syncConfigStore)
      : { syncServices: [], activeSyncServiceId: undefined } // Fallback if store is not available

    if (
      !currentSettings.syncServices ||
      currentSettings.syncServices.length === 0
    ) {
      // console.log('[AutoSyncScheduler] No sync services configured.');
      return
    }

    const bookmarksStore = await bookmarkStorage.getBookmarksStore()
    const lastBookmarksUpdateTime = bookmarksStore.meta.updated || 0
    const currentTime = Date.now()

    for (const config of currentSettings.syncServices) {
      if (!config.id || !config.enabled || !config.autoSyncEnabled) {
        // console.log(`[AutoSyncScheduler] Service ${config.id || 'Unknown'} is disabled, auto sync disabled, or invalid, skipping.`);
        continue
      }

      let shouldSync = false
      const lastSyncTime = config.lastSyncTimestamp || 0

      // Special case: If triggered by visibility change and adapter type is browserExtension,
      // immediately sync without checking intervals
      if (isFromVisibilityChange && config.type === 'browserExtension') {
        console.log(
          `[AutoSyncScheduler] Service ${config.id} (browserExtension) triggered by visibility change, syncing immediately.`
        )
        shouldSync = true
      } else {
        // 1. Check based on autoSyncOnChanges and autoSyncDelayOnChanges
        if (
          config.autoSyncOnChanges &&
          config.autoSyncDelayOnChanges &&
          config.autoSyncDelayOnChanges > 0 &&
          lastBookmarksUpdateTime > 0 // Only if bookmarks have been updated
        ) {
          const delayMillis = config.autoSyncDelayOnChanges * 60 * 1000
          // Sync if enough time has passed since last update AND since last sync for this service

          // --- On-changes sync check ---
          // This block determines if a sync should be triggered due to local bookmark changes
          // since the last successful sync for this specific service.

          // Condition 1: Local bookmarks have been updated since the last sync.
          // `lastBookmarksUpdateTime` is the timestamp of the most recent local bookmark modification.
          // `lastSyncTime` is the timestamp when the last sync for this service started.
          // A buffer of `SYNC_COMPLETION_BUFFER_MS` (e.g., 3000ms) is added to `lastSyncTime`
          // to ensure that the comparison accounts for the time taken by the previous sync to complete.
          // If `lastBookmarksUpdateTime` is greater, it means new changes have occurred after the previous sync concluded.
          const localChangesSinceLastSync =
            lastBookmarksUpdateTime > lastSyncTime + SYNC_COMPLETION_BUFFER_MS

          // Condition 2: Sufficient time has passed since the last local bookmark update.
          // This prevents syncing too frequently if changes are happening in rapid succession.
          // `currentTime - delayMillis` represents the earliest time a sync should be considered based on the configured delay.
          const enoughTimeSinceLastUpdate =
            currentTime - delayMillis > lastBookmarksUpdateTime

          // Condition 3: Sufficient time has passed since the last sync for this service.
          // This also helps in respecting the configured sync interval/delay, ensuring we don't sync too often
          // even if local changes are detected.
          const enoughTimeSinceLastServiceSync =
            currentTime - delayMillis > lastSyncTime
          if (
            localChangesSinceLastSync &&
            enoughTimeSinceLastUpdate &&
            enoughTimeSinceLastServiceSync
          ) {
            console.log(
              `[AutoSyncScheduler] Service ${config.id} due for on-changes sync. Last local update: ${new Date(lastBookmarksUpdateTime).toISOString()}, Last service sync: ${new Date(lastSyncTime).toISOString()}`
            )
            shouldSync = true
          } else if (localChangesSinceLastSync) {
            // console.log(
            //   `[AutoSyncScheduler] Service ${config.id} not due for on-changes sync. Last local update: ${new Date(lastBookmarksUpdateTime).toISOString()}, Last service sync: ${new Date(lastSyncTime).toISOString()}`
            // )
            shouldSync = false
            continue
          }
        }

        // 2. Check based on autoSyncInterval
        if (
          !shouldSync &&
          config.autoSyncInterval &&
          config.autoSyncInterval > 0
        ) {
          const intervalMillis = config.autoSyncInterval * 60 * 1000
          if (currentTime - intervalMillis > lastSyncTime) {
            console.log(
              `[AutoSyncScheduler] Service ${config.id} due for interval sync. Last sync: ${new Date(lastSyncTime).toISOString()}`
            )
            shouldSync = true
          }
        }
      }

      if (shouldSync) {
        console.log(
          `[AutoSyncScheduler] Adding service ${config.id} to sync queue.`
        )
        addToSyncQueue({ serviceId: config.id }, syncManagerInstance)
      }
    }
  } catch (error) {
    console.error(
      '[AutoSyncScheduler] Error during checkAndScheduleSync:',
      error
    )
    // If a critical error occurs (e.g., accessing settings or bookmarks storage fails),
    // it might be safer to release the lock to allow another, potentially healthier, tab to take over.
    // However, this needs careful consideration to avoid lock flapping if the error is persistent across tabs.
    // For now, we log the error and let the heartbeat/timeout mechanism handle stale locks.
  }
}

/**
 * Initializes the auto-sync scheduler.
 * Sets up intervals for checking sync tasks and manages the synchronization lock.
 * @param {SyncManager} syncManagerInstance - An instance of SyncManager.
 */
export function initAutoSyncScheduler(syncManagerInstance: SyncManager): void {
  // If event listeners are already bound, we don't need to initialize again
  if (isEventListenersBound) {
    return
  }

  // eslint-disable-next-line unicorn/prefer-global-this
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn(
      '[AutoSyncScheduler] Environment not suitable for initialization (no window or localStorage).'
    )
    return
  }

  console.log(`[AutoSyncScheduler] Initializing for tab ${currentTabId}...`)

  // Attempt to acquire lock immediately if not already held by this tab.
  if (!checkHasLock()) {
    acquireLock()
  }

  // Perform an initial check if this tab now holds the lock.
  if (checkHasLock()) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    checkAndScheduleSync(syncManagerInstance)
  }

  // Clear any existing main interval before starting a new one.
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(() => {
    // The checkAndScheduleSync function itself handles lock acquisition/checking.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    checkAndScheduleSync(syncManagerInstance)
  }, CHECK_INTERVAL) as any as number

  // Only bind event listeners if they haven't been bound yet
  if (!isEventListenersBound) {
    // Add event listener for when the tab is about to be unloaded.
    // Initialize visibility change handler with sync manager instance
    initVisibilityChangeHandler(syncManagerInstance)
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    isEventListenersBound = true
  }
}

/**
 * Stops the auto-sync scheduler, releasing any held locks and clearing intervals.
 */
export function stopAutoSyncScheduler(): void {
  console.log(`[AutoSyncScheduler] Stopping for tab ${currentTabId}...`)
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = undefined
  }

  // releaseLock handles clearing lockHeartbeatIntervalId and removing localStorage items if lock is held.
  if (checkHasLock()) {
    releaseLock()
  }

  // Ensure heartbeat is cleared even if lock wasn't held (e.g., if releaseLock wasn't called by checkHasLock() being false)
  // or if releaseLock itself failed to clear it for some reason (though it should).
  if (lockHeartbeatIntervalId) {
    clearInterval(lockHeartbeatIntervalId)
    lockHeartbeatIntervalId = undefined
  }

  // Remove event listeners
  window.removeEventListener('beforeunload', handleBeforeUnload)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  isEventListenersBound = false

  console.log('[AutoSyncScheduler] Stopped.')
}

// Exported functions for use by sync-queue.ts or other modules.
// These names are used by sync-queue.ts as per previous modifications.
export {
  releaseLock as releaseAutoSyncSchedulerLock,
  checkHasLock as isAutoSyncSchedulerLockOwner,
}
