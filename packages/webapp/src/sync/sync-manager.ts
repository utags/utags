import { type Unsubscriber } from 'svelte/store'
import {
  type BookmarkTagsAndMetadata,
  type BookmarksData,
  type BookmarksStore,
} from '../types/bookmarks.js'
import { CURRENT_DATABASE_VERSION, DEFAULT_DATE } from '../config/constants.js'
import {
  prettyPrintJson,
  prettyPrintJsonSafe,
} from '../utils/pretty-print-json.js'
import { sortBookmarks } from '../utils/sort-bookmarks.js'
import { normalizeBookmarkData } from '../utils/normalize-bookmark-data.js'
import { calculateBookmarkStatsFromData } from '../utils/bookmark-stats.js'
import { getDeviceInfo } from '../utils/device-utils.js'
import {
  syncConfigStore,
  getSyncServiceById,
  updateSyncService,
  type SyncSettings,
} from '../stores/sync-config-store.js'
import { EventEmitter } from '../lib/event-emitter.js'
import {
  mergeBookmarks,
  type MergeStrategy,
  type SyncOption,
} from '../lib/bookmark-merge-utils.js'
import { bookmarkStorage } from '../lib/bookmark-storage.js'
import { CustomApiSyncAdapter } from './custom-api-sync-adapter.js'
import { GitHubSyncAdapter } from './git-hub-sync-adapter.js'
import { BrowserExtensionSyncAdapter } from './browser-extension-sync-adapter.js'
import { WebDAVSyncAdapter } from './webdav-sync-adapter.js'
import type {
  SyncAdapter,
  SyncServiceConfig,
  SyncStatus,
  SyncEvents,
  SyncMetadata,
  AuthStatus,
} from './types.js'

export class SyncManager extends EventEmitter<SyncEvents> {
  private readonly adapters = new Map<string, SyncAdapter>()
  private currentSettings!: SyncSettings
  private currentSyncStatus: SyncStatus = { type: 'idle' } // Updated initial state
  private readonly unsubscriber: Unsubscriber
  private readonly defaultMergeStrategy: MergeStrategy = {
    meta: 'merge',
    tags: 'union',
    defaultDate: DEFAULT_DATE,
  } // Default merge strategy

  constructor() {
    super()
    this.unsubscriber = syncConfigStore.subscribe((newSettings) => {
      console.log(
        '[SyncManager] Settings updated:',
        prettyPrintJsonSafe(newSettings)
      )
      // This will be called whenever the settings change and the sync manager is subscribed to it
      this.currentSettings = newSettings
      this.emit('settingsChanged', newSettings)
    })
  }

  /**
   * Cleans up resources used by the SyncManager.
   * This includes unsubscribing from stores, destroying cached adapters,
   * and clearing the adapter cache.
   */
  public destroy(): void {
    // Unsubscribe from the settings store to prevent memory leaks and further updates
    if (this.unsubscriber) {
      this.unsubscriber()
    }

    // Destroy all cached adapters
    for (const [id, adapter] of this.adapters.entries()) {
      if (typeof adapter.destroy === 'function') {
        try {
          adapter.destroy()
        } catch (error) {
          console.error(`Error destroying cached adapter (ID: ${id}):`, error)
        }
      }
    }

    this.adapters.clear()

    // Optionally, emit a destroyed event if the EventEmitter supports it
    this.emit('destroyed', '')

    console.log('[SyncManager] Destroyed')
  }

  /**
   * Gets the current sync status object.
   * @returns The current sync status object.
   */
  public getStatus(): SyncStatus {
    return this.currentSyncStatus
  }

  /**
   * Initiates a synchronization operation.
   * If serviceId is provided, it syncs that specific service.
   * Otherwise, it attempts to sync the currently active service from settings.
   *
   * @param serviceId - Optional. The ID of the sync service to use.
   * @returns A promise that resolves with true if sync was successful, false otherwise.
   */
  public async sync(serviceId?: string): Promise<boolean> {
    const targetServiceId =
      serviceId || this.currentSettings?.activeSyncServiceId
    if (!targetServiceId) {
      const errMsg =
        'No sync service ID provided and no active sync service configured.'
      this.emit('error', { message: errMsg })
      this.updateStatus({ type: 'error', error: errMsg })
      return false
    }

    // Call synchronize which handles getting/creating the adapter
    return this.synchronize(targetServiceId)
  }

  /**
   * Initiates a synchronization operation with the adapter with the specified configId.
   * @param configId The ID of the SyncServiceConfig to use for synchronization.
   * @returns A promise that resolves to true if sync is successful, false otherwise.
   */
  public async synchronize(configId: string): Promise<boolean> {
    const serviceConfig = getSyncServiceById(this.currentSettings, configId)

    if (!this._canStartSync(serviceConfig, configId)) {
      return false
    }

    // Emit initialization event before updating status
    this.emit('syncInitializing', { serviceId: configId })

    this.updateStatus({ type: 'initializing' })

    let adapter: SyncAdapter
    try {
      adapter = await this.getAdapter(serviceConfig!) // serviceConfig is checked in _canStartSync
    } catch (error: any) {
      const errMsg = `Sync adapter for ${serviceConfig!.name} (ID: ${configId}) could not be initialized: ${error.message}`
      console.error(errMsg, error)
      this.emit('error', { message: errMsg, serviceId: configId, error })
      this.updateStatus({ type: 'error', error: errMsg })

      this.emit('syncEnd', {
        serviceId: configId,
        status: 'error',
        error,
      })

      return false
    }

    return this._performSyncOperation(adapter, serviceConfig!)
  }

  /**
   * Checks the authentication status of a sync adapter.
   * If serviceId is provided, it checks that specific service.
   * Otherwise, it attempts to check the currently active service from settings.
   *
   * @param serviceId - Optional. The ID of the sync service to check.
   * @returns A promise that resolves to the authentication status.
   */
  public async checkAuthStatus(serviceId?: string): Promise<AuthStatus> {
    const targetServiceId =
      serviceId || this.currentSettings?.activeSyncServiceId

    if (!targetServiceId) {
      console.warn(
        'No service ID provided and no active adapter available to check auth status.'
      )
      return 'unknown'
    }

    const serviceConfig = getSyncServiceById(
      this.currentSettings,
      targetServiceId
    )
    if (!serviceConfig) {
      console.warn(
        `No service configuration found for ID: ${targetServiceId} to check auth status.`
      )
      return 'unknown'
    }

    let adapter: SyncAdapter
    try {
      adapter = await this.getAdapter(serviceConfig)
    } catch (error) {
      console.error(
        `Error getting adapter for service ${targetServiceId} to check auth status:`,
        error
      )
      this.emit('error', {
        message: `Error getting adapter for auth status check: ${serviceConfig.name}`,
        serviceId: targetServiceId,
        error: error instanceof Error ? error : new Error(String(error)),
      })
      return 'error' // Or 'unknown' depending on desired behavior for adapter init failure
    }

    if (typeof adapter.getAuthStatus !== 'function') {
      console.warn(
        `Adapter ${adapter.constructor.name} for service ${targetServiceId} does not implement getAuthStatus. Returning 'unknown'.`
      )
      return 'unknown'
    }

    try {
      return await adapter.getAuthStatus()
    } catch (error) {
      console.error(
        `Error checking auth status for service ${targetServiceId} in SyncManager:`,
        error
      )
      this.emit('error', {
        message: `Error checking auth status for ${serviceConfig.name}`,
        serviceId: targetServiceId,
        error: error instanceof Error ? error : new Error(String(error)),
      })
      return 'error'
    }
  }

  private async getAdapter(config: SyncServiceConfig): Promise<SyncAdapter> {
    if (this.adapters.has(config.id)) {
      const existingAdapter = this.adapters.get(config.id)!
      // Check if re-initialization is needed (e.g., if config object itself changed, not just values within)
      // Use deep comparison for config objects
      if (
        JSON.stringify(existingAdapter.getConfig()) === JSON.stringify(config)
      ) {
        return existingAdapter
      }

      // If config object changed, or for more robust re-initialization logic:
      console.log(
        `[SyncManager] Re-initializing adapter for ${config.name} due to config change.`
      )
      if (typeof existingAdapter.destroy === 'function') {
        try {
          existingAdapter.destroy()
        } catch (error) {
          console.warn(
            `[SyncManager] Error destroying adapter ${config.id} before re-initialization:`,
            error
          )
        }
      }

      this.adapters.delete(config.id) // Remove old instance before creating new
    }

    let adapter: SyncAdapter
    switch (config.type) {
      case 'github': {
        adapter = new GitHubSyncAdapter()
        break
      }

      case 'webdav': {
        adapter = new WebDAVSyncAdapter()
        break
      }

      case 'customApi': {
        adapter = new CustomApiSyncAdapter()
        break
      }

      case 'browserExtension': {
        adapter = new BrowserExtensionSyncAdapter()
        break
      }

      default: {
        // Ensure that 'never' is asserted for config.type to catch unhandled cases
        const _exhaustiveCheck: never = config.type
        throw new Error(`Unknown sync service type: ${_exhaustiveCheck}`)
      }
    }

    await adapter.init(config)
    this.adapters.set(config.id, adapter)
    return adapter
  }

  /**
   * Updates the current sync status and emits an event if it changes.
   * @param newStatus - The new sync status object.
   */
  private updateStatus(newStatus: SyncStatus): void {
    // Basic check for actual change to avoid redundant events
    // This could be more sophisticated for statuses with progress etc.
    if (this.currentSyncStatus.type !== newStatus.type) {
      this.currentSyncStatus = newStatus
      this.emit('statusChange', this.currentSyncStatus)
    } else if (
      JSON.stringify(this.currentSyncStatus) !== JSON.stringify(newStatus)
    ) {
      // More thorough check for changes in properties within the same type
      this.currentSyncStatus = newStatus
      this.emit('statusChange', this.currentSyncStatus)
    }
  }

  /**
   * Checks if a sync operation can be started for the given service config.
   * Emits info/error events and updates status if sync cannot start.
   * @param serviceConfig The configuration of the service to check.
   * @param specificAdapterCheck Set to true if checking for a specific adapter (synchronize case)
   * @returns True if sync can start, false otherwise.
   * @private
   */
  private _canStartSync(
    serviceConfig: SyncServiceConfig | undefined,
    forServiceId: string
  ): boolean {
    if (this.isSyncInProgress()) {
      this.emit('info', {
        message: `Synchronization already in progress, cannot start sync for ${serviceConfig?.name || 'unkown service'}.`,
        serviceId: forServiceId,
      })
      // Do not update status here, as it's not an error
      return false
    }

    if (!serviceConfig) {
      const errMsg = `Sync configuration for service ID '${forServiceId}' not found.`
      this.emit('error', { message: errMsg, serviceId: forServiceId })
      this.updateStatus({ type: 'error', error: errMsg })
      return false
    }

    if (!serviceConfig.enabled) {
      const infoMsg = `Sync service '${serviceConfig.name}' (ID: ${serviceConfig.id}) is not enabled.`
      this.emit('info', { message: infoMsg, serviceId: serviceConfig.id })
      this.updateStatus({ type: 'disabled' }) // Or a more specific status if needed
      return false
    }

    return true
  }

  /**
   * Performs the core synchronization logic with a given adapter.
   * @param adapter - The SyncAdapter to use for synchronization.
   * @param serviceConfig - The configuration of the service being synced.
   * @returns A promise that resolves to true if sync is successful, false otherwise.
   * @internal
   */
  private async _performSyncOperation(
    adapter: SyncAdapter,
    serviceConfig: SyncServiceConfig
  ): Promise<boolean> {
    this.emit('syncStart', { serviceId: serviceConfig.id })
    let operationSuccessful = false // Flag to track overall success

    try {
      // Stage 1: Fetch Remote Data
      const fetchResult = await this._fetchRemoteData(adapter, serviceConfig)
      if (!fetchResult.success) {
        return false // Error handling done in _fetchRemoteData
      }

      const { remoteBookmarks, remoteStoreMeta, remoteSyncMeta } = fetchResult

      // Stage 2: Merge Data
      const currentSyncTimestamp = Date.now() // The time of local data fetched
      const mergeResult = await this._mergeData(
        remoteBookmarks,
        serviceConfig,
        this.defaultMergeStrategy,
        currentSyncTimestamp
      )
      if (!mergeResult.success || !mergeResult.mergedBookmarks) {
        return false // Error handling done in _mergeData
      }

      const {
        mergedBookmarks,
        hasChangesForRemote,
        hasChangesForLocal,
        updatesForLocal,
        updatesForRemote,
        localDeletions,
        remoteDeletions,
      } = mergeResult

      // Stage 3: Upload Data
      const uploadSuccess = await this._uploadData(
        adapter,
        serviceConfig,
        mergedBookmarks,
        remoteStoreMeta,
        remoteSyncMeta,
        hasChangesForRemote!,
        hasChangesForLocal!,
        currentSyncTimestamp
      )

      if (uploadSuccess && (hasChangesForRemote || hasChangesForLocal)) {
        this.logMergeHistory(
          serviceConfig,
          hasChangesForRemote!,
          hasChangesForLocal!,
          currentSyncTimestamp,
          updatesForLocal!,
          updatesForRemote!,
          localDeletions!,
          remoteDeletions!
        )
      }

      operationSuccessful = uploadSuccess // uploadSuccess is true if successful
      return operationSuccessful
    } catch (error: any) {
      console.error(`Synchronization failed for ${serviceConfig.name}:`, error)
      const errorMessage = `Synchronization failed for ${serviceConfig.name}: ${error.message}`
      this.emit('error', {
        message: errorMessage,
        serviceId: serviceConfig.id,
        error,
      })
      this.updateStatus({
        type: 'error',
        error: errorMessage,
        lastAttemptTime: Date.now(),
      })
      return false // Explicitly return false on caught error
    } finally {
      let finalEventType: 'success' | 'error' | 'conflict' = 'error' // Default to error
      if (operationSuccessful && this.currentSyncStatus.type === 'success') {
        finalEventType = 'success'
      } else if (this.currentSyncStatus.type === 'conflict') {
        finalEventType = 'conflict'
      } // Otherwise, it remains 'error' due to earlier failure or the catch block
      // If it's still a transient state, it means an unhandled error occurred or logic is incomplete
      // and it defaulted to 'error' or was set by a catch block.

      this.emit('syncEnd', {
        serviceId: serviceConfig.id,
        status: finalEventType,
        error:
          finalEventType === 'success'
            ? undefined
            : (this.currentSyncStatus as any).error ||
              (this.currentSyncStatus as any).details,
      })

      // Reset to idle only if the operation was successful.
      // If it was an error or conflict, the status should remain as such.
      if (finalEventType === 'success') {
        this.updateStatus({
          type: 'idle',
          lastSyncTime: (this.currentSyncStatus as any).lastSyncTime,
        })
      } else if (
        !this.isSyncInProgress() &&
        this.currentSyncStatus.type !== 'error' &&
        this.currentSyncStatus.type !== 'conflict'
      ) {
        // If sync is not in progress (e.g. checking, downloading etc.) and not already an error/conflict,
        // but operationSuccessful is false, it implies an issue not setting a final error/conflict state.
        // This case should ideally be covered by explicit error/conflict states from sub-operations.
        // However, as a fallback, if it's some other transient state, reset to idle.
        // This might need refinement based on how sub-operations guarantee final state setting on failure.
        this.updateStatus({ type: 'idle' })
      }
    }
  }

  /**
   * Fetches remote data and metadata from the adapter.
   * @param adapter The sync adapter.
   * @param serviceConfig The sync service configuration.
   * @returns An object containing success status, remote bookmarks, and remote metadata.
   */
  private async _fetchRemoteData(
    adapter: SyncAdapter,
    serviceConfig: SyncServiceConfig
  ): Promise<{
    success: boolean
    remoteBookmarks?: BookmarksData
    remoteStoreMeta?: BookmarksStore['meta']
    remoteSyncMeta?: SyncMetadata
  }> {
    try {
      this.updateStatus({ type: 'checking' })
      console.log(
        `[SyncManager] Fetching remote metadata for ${serviceConfig.name}...`
      )
      const initialRemoteSyncMeta = await adapter.getRemoteMetadata()

      this.updateStatus({ type: 'downloading' })
      console.log(
        `[SyncManager] Downloading remote data for ${serviceConfig.name}...`
      )
      const { data: remoteDataString, remoteMeta: downloadRemoteSyncMeta } =
        await adapter.download()

      // Validate data integrity if this is not the first sync
      if (
        serviceConfig.lastDataChangeTimestamp &&
        serviceConfig.lastDataChangeTimestamp > 0
      ) {
        const missingData: string[] = []

        if (!initialRemoteSyncMeta) {
          missingData.push('initialRemoteSyncMeta')
        }

        if (!downloadRemoteSyncMeta) {
          missingData.push('downloadRemoteSyncMeta')
        }

        if (!remoteDataString || remoteDataString.trim() === '') {
          missingData.push('remoteDataString')
        }

        if (missingData.length > 0) {
          const errorMessage = `Data validation failed for ${serviceConfig.name}: Missing required data - ${missingData.join(', ')}. This may indicate communication issues or other anomalies.`
          console.error(errorMessage)
          this.emit('error', {
            message: errorMessage,
            serviceId: serviceConfig.id,
            error: new Error(errorMessage),
          })
          this.updateStatus({
            type: 'error',
            error: errorMessage,
            lastAttemptTime: Date.now(),
          })
          return { success: false }
        }
      }

      let remoteBookmarks: BookmarksData | undefined
      let remoteStoreMeta: BookmarksStore['meta'] | undefined

      if (remoteDataString && remoteDataString.trim() !== '') {
        try {
          const remoteStore = JSON.parse(remoteDataString) as BookmarksStore
          remoteBookmarks = remoteStore.data
          remoteStoreMeta = remoteStore.meta

          // Additional validation for non-first sync: remoteStoreMeta should not be empty
          if (
            serviceConfig.lastDataChangeTimestamp &&
            serviceConfig.lastDataChangeTimestamp > 0 &&
            !remoteStoreMeta
          ) {
            const errorMessage = `Data validation failed for ${serviceConfig.name}: Missing remoteStoreMeta. This may indicate communication issues or other anomalies.`
            console.error(errorMessage)
            this.emit('error', {
              message: errorMessage,
              serviceId: serviceConfig.id,
              error: new Error(errorMessage),
            })
            this.updateStatus({
              type: 'error',
              error: errorMessage,
              lastAttemptTime: Date.now(),
            })
            return { success: false }
          }
        } catch (error: any) {
          console.error(
            `Failed to parse remote data for ${serviceConfig.name}:`,
            error
          )
          const errorMessage = `Failed to parse remote data for ${serviceConfig.name}: ${error.message}`
          this.emit('error', {
            message: errorMessage,
            serviceId: serviceConfig.id,
            error: error instanceof Error ? error : new Error(String(error)),
          })
          this.updateStatus({
            type: 'error',
            error: errorMessage,
            lastAttemptTime: Date.now(),
          })
          return { success: false }
        }
      }

      return {
        success: true,
        remoteBookmarks,
        remoteStoreMeta,
        remoteSyncMeta: downloadRemoteSyncMeta || initialRemoteSyncMeta,
      }
    } catch (error: any) {
      console.error(
        `Error fetching remote data for ${serviceConfig.name}:`,
        error
      )
      const errorMessage = `Failed to fetch remote data for ${serviceConfig.name}: ${error.message}`
      this.emit('error', {
        message: errorMessage,
        serviceId: serviceConfig.id,
        error: error instanceof Error ? error : new Error(String(error)),
      })
      this.updateStatus({
        type: 'error',
        error: errorMessage,
        lastAttemptTime: Date.now(),
      })
      return { success: false }
    }
  }

  /**
   * Merges local and remote bookmark data.
   * @param localData Local bookmarks data.
   * @param remoteBookmarks Remote bookmarks data.
   * @param serviceConfig The sync service configuration.
   * @param defaultMergeStrategy The default merge strategy.
   * @returns An object containing success status, merged bookmarks, deleted URLs, and changes.
   */
  private async _mergeData(
    remoteBookmarks: BookmarksData | undefined,
    serviceConfig: SyncServiceConfig,
    defaultMergeStrategy: MergeStrategy,
    currentSyncTimestamp: number
  ): Promise<{
    success: boolean
    mergedBookmarks?: BookmarksData
    hasChangesForRemote?: boolean
    hasChangesForLocal?: boolean
    updatesForLocal?: BookmarksData
    updatesForRemote?: BookmarksData
    localDeletions?: string[]
    remoteDeletions?: string[]
  }> {
    const mergeStrategy = {
      ...defaultMergeStrategy,
      ...serviceConfig.mergeStrategy,
    }
    const syncOption: SyncOption = {
      currentSyncTime: currentSyncTimestamp,
      lastSyncTime: serviceConfig.lastDataChangeTimestamp || 0,
    }

    this.updateStatus({ type: 'merging' })
    console.log(
      `[SyncManager] Merging local and remote data for ${serviceConfig.name}: with merge strategy ${JSON.stringify(mergeStrategy)} and sync option ${JSON.stringify(syncOption)} ...`
    )

    try {
      const localData = await bookmarkStorage.getBookmarksData()

      // If there's no remote data, return local data as is
      if (!remoteBookmarks) {
        return {
          success: true,
          mergedBookmarks: localData,
          hasChangesForRemote: Object.keys(localData).length > 0,
          hasChangesForLocal: false,
          updatesForLocal: {},
          updatesForRemote: localData,
          localDeletions: [],
          remoteDeletions: [],
        }
      }

      const mergedDataResult = await mergeBookmarks(
        localData,
        remoteBookmarks,
        mergeStrategy,
        syncOption
      )

      const {
        updatesForLocal,
        updatesForRemote,
        localDeletions,
        remoteDeletions,
        finalRemoteData,
      } = mergedDataResult

      // Check for conflicts, not supported yet
      const conflicts: string[] = []

      console.log('mergedDataResult', mergedDataResult)

      if (conflicts && conflicts.length > 0) {
        console.warn(
          `Merge conflicts identified for ${serviceConfig.name}:`,
          conflicts
        )
        this.updateStatus({
          type: 'conflict',
          details: conflicts,
          lastAttemptTime: Date.now(),
        })
        this.emit('syncConflict', {
          serviceId: serviceConfig.id,
          details: conflicts,
        })
        return { success: false }
      }

      const hasChangesForLocal =
        localDeletions.length > 0 || Object.keys(updatesForLocal).length > 0
      const hasChangesForRemote =
        remoteDeletions.length > 0 || Object.keys(updatesForRemote).length > 0

      if (hasChangesForLocal) {
        // Update bookmarks
        await bookmarkStorage.batchUpdateBookmarks(
          localDeletions,
          Object.entries(updatesForLocal)
        )
      }

      this.updateStatus({ type: 'merging', progress: 100 })
      return {
        success: true,
        mergedBookmarks: finalRemoteData,
        hasChangesForRemote,
        hasChangesForLocal,
        updatesForLocal,
        updatesForRemote,
        localDeletions,
        remoteDeletions,
      }
    } catch (error: any) {
      if (error.name === 'MergeConflictError') {
        console.warn(
          `Merge conflict detected for ${serviceConfig.name}:`,
          error.details
        )
        this.updateStatus({
          type: 'conflict',
          details: error.details,
          lastAttemptTime: Date.now(),
        })
        this.emit('syncConflict', {
          serviceId: serviceConfig.id,
          details: error.details,
          error,
        })
        return { success: false }
      }

      const errorMessage = `Bookmark merging failed for ${serviceConfig.name}: ${error.message}`
      console.warn(errorMessage, error)
      this.emit('error', {
        message: errorMessage,
        serviceId: serviceConfig.id,
        error,
      })
      this.updateStatus({
        type: 'error',
        error: errorMessage,
        lastAttemptTime: Date.now(),
      })
      return { success: false }
    }
  }

  /**
   * Uploads merged data to the remote server.
   * @param adapter The sync adapter.
   * @param serviceConfig The sync service configuration.
   * @param mergedBookmarks The merged bookmarks data.
   * @param localData The original local data (for comparison).
   * @param downloadRemoteMeta Metadata from the download step.
   * @param changes Calculated changes (added, updated, removed).
   * @param deletedUrls URLs that were deleted during the merge.
   * @returns A promise that resolves to true if upload is successful, false otherwise.
   */
  private async _uploadData(
    adapter: SyncAdapter,
    serviceConfig: SyncServiceConfig,
    mergedBookmarks: BookmarksData,
    remoteStoreMeta: BookmarksStore['meta'] | undefined,
    remoteSyncMeta: SyncMetadata | undefined,
    hasChangesForRemote: boolean,
    hasChangesForLocal: boolean,
    currentSyncTimestamp: number
  ): Promise<boolean> {
    // Create a single timestamp for consistency across the function
    const operationTimestamp = Date.now()

    // if remote was empty (first sync) as a reason to upload
    const isFirstSync = !remoteSyncMeta && !(await adapter.getRemoteMetadata()) // More robust check for first sync

    // If there are changes or if it's the first sync (implied by !downloadRemoteMeta if remote was empty)
    if (
      hasChangesForRemote ||
      (isFirstSync && Object.keys(mergedBookmarks).length > 0)
    ) {
      this.updateStatus({ type: 'uploading' })
      console.log(
        `[SyncManager] Uploading merged data for ${serviceConfig.name}...`
      )

      try {
        // Sort bookmarks before uploading to maintain a consistent order
        const sortedBookmarks = Object.fromEntries(
          sortBookmarks(Object.entries(mergedBookmarks), 'createdDesc')
        )

        const stats = calculateBookmarkStatsFromData(sortedBookmarks)
        const deviceInfo = getDeviceInfo()
        const bookmarksStore: BookmarksStore = {
          data: sortedBookmarks,
          meta: {
            ...(remoteStoreMeta || {
              databaseVersion: CURRENT_DATABASE_VERSION,
              created: operationTimestamp,
            }),
            updated: operationTimestamp,
            stats,
            lastUploadDevice: {
              deviceId: deviceInfo.deviceId,
              browser: deviceInfo.browser,
              os: deviceInfo.os,
              deviceType: deviceInfo.deviceType,
              uploadTimestamp: operationTimestamp,
              userAgent: navigator.userAgent,
              origin: globalThis.location.origin,
              lastDataChangeTimestamp: serviceConfig.lastDataChangeTimestamp,
              currentSyncTimestamp,
            },
          },
        }

        // console.log('Uploading', prettyPrintJson(bookmarksStore))
        const newRemoteMeta = await adapter.upload(
          prettyPrintJson(normalizeBookmarkData(bookmarksStore)),
          remoteSyncMeta // Pass metadata for conditional upload
        )

        const updatedServiceConfig: SyncServiceConfig = {
          ...serviceConfig,
          lastSyncTimestamp: currentSyncTimestamp,
          lastDataChangeTimestamp: currentSyncTimestamp,
          lastSyncMeta: newRemoteMeta,
        }
        updateSyncService(updatedServiceConfig)

        this.updateStatus({
          type: 'success',
          lastSyncTime: currentSyncTimestamp,
        })
        this.emit('syncSuccess', {
          serviceId: serviceConfig.id,
        })
        console.log(`[SyncManager] Sync successful for ${serviceConfig.name}.`)
        return true
      } catch (error: any) {
        if (
          error.name === 'UploadConflictError' ||
          (error.status && [409, 412].includes(error.status))
        ) {
          console.warn(
            `Upload conflict detected for ${serviceConfig.name}:`,
            error.message
          )
          const conflictDetails = error.details || error.message
          this.updateStatus({
            type: 'conflict',
            details: conflictDetails,
            lastAttemptTime: operationTimestamp,
          })
          this.emit('syncConflict', {
            serviceId: serviceConfig.id,
            details: conflictDetails,
            error,
          })
          return false // Stop sync process on upload conflict
        }

        console.error(`Error uploading data for ${serviceConfig.name}:`, error)
        const errorMessage = `Failed to upload data for ${serviceConfig.name}: ${error.message}`
        this.emit('error', {
          message: errorMessage,
          serviceId: serviceConfig.id,
          error,
        })
        this.updateStatus({
          type: 'error',
          error: errorMessage,
          lastAttemptTime: operationTimestamp,
        })
        return false
      }
    } else {
      console.log(
        `[SyncManager] No changes to upload for ${serviceConfig.name}. Sync complete.`
      )
      const updatedServiceConfig: SyncServiceConfig = {
        ...serviceConfig,
        lastSyncTimestamp: currentSyncTimestamp,
        lastDataChangeTimestamp: hasChangesForLocal
          ? currentSyncTimestamp
          : serviceConfig.lastDataChangeTimestamp,
        lastSyncMeta: remoteSyncMeta || serviceConfig.lastSyncMeta,
      }
      updateSyncService(updatedServiceConfig)

      this.updateStatus({ type: 'success', lastSyncTime: currentSyncTimestamp })
      this.emit('syncSuccess', {
        serviceId: serviceConfig.id,
        noUploadNeeded: true,
      })
      return true
    }
  }

  /**
   * Logs merge history for debugging and audit purposes.
   * Records the merge operation details and persists them to localStorage.
   * @param serviceId - The ID of the sync service
   * @param hasChangesForRemote - Whether there are changes to upload to remote
   * @param hasChangesForLocal - Whether there are changes to apply locally
   * @param syncTimestamp - The timestamp of the sync operation
   */
  private logMergeHistory(
    serviceConfig: SyncServiceConfig,
    hasChangesForRemote: boolean,
    hasChangesForLocal: boolean,
    syncTimestamp: number,
    updatesForLocal: BookmarksData,
    updatesForRemote: BookmarksData,
    localDeletions: string[],
    remoteDeletions: string[]
  ): void {
    const mergeHistoryEntry = {
      serviceId: serviceConfig.id,
      serviceType: serviceConfig.type,
      serviceName: serviceConfig.name,
      timestamp: syncTimestamp,
      date: new Date(syncTimestamp).toISOString(),
      lastDataChangeTimestamp: serviceConfig.lastDataChangeTimestamp,
      lastDataChangeDate: serviceConfig.lastDataChangeTimestamp
        ? new Date(serviceConfig.lastDataChangeTimestamp).toISOString()
        : null,
      hasChangesForRemote,
      hasChangesForLocal,
      updatesForLocal: {
        count: Object.keys(updatesForLocal).length,
        bookmarks: Object.keys(updatesForLocal),
      },
      updatesForRemote: {
        count: Object.keys(updatesForRemote).length,
        bookmarks: Object.keys(updatesForRemote),
      },
      localDeletions: {
        count: localDeletions.length,
        urls: localDeletions,
      },
      remoteDeletions: {
        count: remoteDeletions.length,
        urls: remoteDeletions,
      },
      deviceInfo: {
        userAgent: navigator.userAgent,
        origin: globalThis.location?.origin || 'unknown',
      },
    }

    // Console log for immediate debugging with enhanced timestamp information
    const lastSyncTimestamp = serviceConfig.lastDataChangeTimestamp || 0
    const lastSyncFormatted = lastSyncTimestamp
      ? new Date(lastSyncTimestamp).toLocaleString()
      : 'Never'
    const currentTimestampFormatted = new Date(syncTimestamp).toLocaleString()

    console.log(
      `[SyncManager] Merge History\n` +
        `  Service: ${serviceConfig.id} (${serviceConfig.type}: ${serviceConfig.name})\n` +
        `  Remote Changes: ${hasChangesForRemote} (${mergeHistoryEntry.updatesForRemote.count} updates, ${mergeHistoryEntry.remoteDeletions.count} deletions)\n` +
        `  Local Changes: ${hasChangesForLocal} (${mergeHistoryEntry.updatesForLocal.count} updates, ${mergeHistoryEntry.localDeletions.count} deletions)\n` +
        `  Last Sync: ${lastSyncFormatted} (timestamp: ${lastSyncTimestamp})\n` +
        `  Current Timestamp: ${currentTimestampFormatted} (timestamp: ${syncTimestamp})`
    )

    try {
      // Persist to localStorage for historical tracking
      const storageKey = 'utags-merge-history'
      const existingHistory = JSON.parse(
        localStorage.getItem(storageKey) || '[]'
      ) as Array<typeof mergeHistoryEntry>

      // Add new entry to the beginning of the array
      existingHistory.unshift(mergeHistoryEntry)

      // Keep only the last 100 entries to prevent localStorage bloat
      const maxHistoryEntries = 100
      if (existingHistory.length > maxHistoryEntries) {
        existingHistory.splice(maxHistoryEntries)
      }

      // Save back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(existingHistory))

      console.log(
        `[SyncManager] Merge history saved. Total entries: ${existingHistory.length}`
      )
    } catch (error) {
      console.warn(
        '[SyncManager] Failed to persist merge history to localStorage:',
        error
      )
    }
  }

  private isSyncInProgress(): boolean {
    if (
      this.currentSyncStatus.type === 'initializing' ||
      this.currentSyncStatus.type === 'checking' ||
      this.currentSyncStatus.type === 'downloading' ||
      this.currentSyncStatus.type === 'uploading' ||
      this.currentSyncStatus.type === 'merging'
    ) {
      return true
    }

    return false
  }
}

// It's common to export a singleton instance of the manager
export const syncManager = new SyncManager()

// TODO:
// - 数据库版本不一致时处理逻辑：
//   - 本地版本较新，自动升级远程下载的数据，合并，上传
//   - 远程版本较新，同步停止，提示用户需要更新 WebApp 客户端
// - download 没有数据时处理逻辑
//   - 如果没有文件，lastSyncTime 应该是 0
//   - 如果有文件，是一个空文件，说明远程已经清空数据，而且 lastSyncTime 不是 0 时，需要提示用户，是否合并数据。
//     因为同步后 lastSyncTime 之前的本地数据会被清空。
// - 同步时如果删除 50% 以上的数据时，停止同步，需要用户确认
