import { writable } from 'svelte/store'
import { syncManager } from '../sync/sync-manager.js'

/**
 * Global store for tracking the currently syncing service
 * This allows the sync status to persist even when the SyncSettingsModal is closed
 */
export const currentSyncingService = writable<string | undefined>(undefined)

// Set up global listeners for sync events
function initializeSyncListeners() {
  // Handle sync initializing event
  const onSyncInitializing = (data: { serviceId: string }) => {
    console.log('[sync-status-store] sync initializing', data.serviceId)
    currentSyncingService.set(data.serviceId)
  }

  // Handle sync start event
  const onSyncStart = (data: { serviceId: string }) => {
    console.log('[sync-status-store] sync start', data.serviceId)
    currentSyncingService.set(data.serviceId)
  }

  // Handle sync end event
  const onSyncEnd = (data: { serviceId: string }) => {
    console.log('[sync-status-store] sync end', data.serviceId)
    currentSyncingService.update((current) => {
      if (current === data.serviceId) {
        return undefined
      }

      return current
    })
  }

  // Register event listeners
  syncManager.on('syncInitializing', onSyncInitializing)
  syncManager.on('syncStart', onSyncStart)
  syncManager.on('syncEnd', onSyncEnd)

  // No need to return cleanup function as this is a global store
  // that should listen for events throughout the application lifecycle
}

// Initialize the listeners
initializeSyncListeners()
