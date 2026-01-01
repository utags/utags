import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest'
import { get } from 'svelte/store'
import {
  CURRENT_DATABASE_VERSION,
  DELETED_BOOKMARK_TAG,
  DEFAULT_DATE,
} from '../config/constants.js'
import {
  type MergeMetaStrategy,
  type MergeTagsStrategy,
} from '../config/merge-options.js'
import {
  type BookmarkMetadata,
  type BookmarkTagsAndMetadata,
  type BookmarksData,
  type BookmarksStore,
} from '../types/bookmarks.js'
import { mockEventListener } from '../utils/test/mock-event-listener.js'
import { prettyPrintJson } from '../utils/pretty-print-json.js'
import { sortBookmarks } from '../utils/sort-bookmarks.js'
import { sortMetaProperties } from '../utils/sort-meta-properties.js'
import { normalizeBookmarkData } from '../utils/normalize-bookmark-data.js'
import { calculateBookmarkStatsFromData } from '../utils/bookmark-stats.js'
import { getDeviceInfo } from '../utils/device-utils.js'
import { bookmarkStorage } from '../lib/bookmark-storage.js'
import {
  mergeBookmarks,
  type MergeStrategy,
} from '../lib/bookmark-merge-utils.js'
import * as bookmarkMergeUtils from '../lib/bookmark-merge-utils.js'
import {
  syncConfigStore,
  addSyncService,
  updateSyncService,
  setActiveSyncService,
  removeSyncService,
  getSyncServiceById,
  type SyncSettings,
} from '../stores/sync-config-store.js'
import type {
  SyncAdapter,
  SyncEvents,
  AuthStatus,
  SyncStatus,
  SyncMetadata,
  SyncServiceConfig,
  BrowserExtensionCredentials,
  BrowserExtensionTarget,
} from './types.js'
import { CustomApiSyncAdapter } from './custom-api-sync-adapter.js'
import { BrowserExtensionSyncAdapter } from './browser-extension-sync-adapter.js'
import { SyncManager } from './sync-manager.js'

const GET_AUTH_STATUS_MESSAGE_TYPE = 'GET_AUTH_STATUS'

// Define MockSyncAdapter
class MockSyncAdapter implements SyncAdapter {
  private config!: SyncServiceConfig

  constructor(config?: SyncServiceConfig) {
    if (config) {
      this.config = config
    }

    // Initialize spies for all methods to allow per-test mocking
    this.init = vi.fn(async (config: SyncServiceConfig) => {
      this.config = config
    })
    this.upload = vi
      .fn()
      .mockResolvedValue({ version: 'mock-version', timestamp: Date.now() })
    this.download = vi
      .fn()
      .mockResolvedValue({ data: undefined, remoteMeta: undefined })
    this.getRemoteMetadata = vi.fn().mockResolvedValue(undefined)
    this.getAuthStatus = vi.fn().mockResolvedValue('authenticated')
    this.destroy = vi.fn()
  }

  getConfig(): SyncServiceConfig {
    if (!this.config) {
      throw new Error('Adapter not initialized')
    }

    return this.config
  }

  // Mocked methods - these will be spied on and customized in tests
  init: any
  upload: any
  download: any
  getRemoteMetadata: any
  getAuthStatus: any
  destroy: any

  // Optional methods from SyncAdapter, can be added if needed for specific tests
  // acquireLock?: () => Promise<boolean>;
  // releaseLock?: () => Promise<void>;
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem(key: string, value: string) {
      store[key] = value.toString()
    },
    removeItem(key: string) {
      delete store[key]
    },
    clear() {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

// Add dispatchEvent mock to prevent errors
Object.defineProperty(globalThis, 'dispatchEvent', {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  value() {},
})

// Mock parts of SettingsStore or specific dependencies if needed further
// vi.mock('../stores/SettingsStore') // Example if deeper mocking is needed

// Mock CustomApiSyncAdapter if its internal fetch calls need to be controlled
// vi.mock('./CustomApiSyncAdapter')
// vi.mock('../lib/event-emitter') // SyncManager extends EventEmitter

// Default timestamps
const now = Date.now()
const oneHourAgo = now - 3600 * 1000
const twoHoursAgo = now - 2 * 3600 * 1000
const threeHoursAgo = now - 3 * 3600 * 1000
const defaultDateTimestamp = oneHourAgo - 1000 // new Date('2023-01-01T00:00:00.000Z').getTime()

const defaultStoreMeta = {
  databaseVersion: CURRENT_DATABASE_VERSION,
  created: threeHoursAgo,
  updated: threeHoursAgo,
}

function convertToDownloadData(remoteData: BookmarksData): string {
  const bookmarksStore: BookmarksStore = {
    data: remoteData,
    meta: defaultStoreMeta,
  }
  return JSON.stringify(bookmarksStore)
}

function setUpdated3ForBookmarks(
  bookmarksData: BookmarksData,
  currentSyncTime: number,
  exceptions: string[]
) {
  const exceptionsSet = new Set(exceptions)
  for (const key of Object.keys(bookmarksData)) {
    if (bookmarksData[key] && !exceptionsSet.has(key)) {
      bookmarksData[key].meta.updated3 = currentSyncTime
    }
  }
}

function convertToUploadData(
  remoteData: BookmarksData,
  meta?: { created?: number; updated?: number },
  lastDataChangeTimestamp?: number,
  currentSyncTimestamp?: number
): string {
  // Sort bookmarks before uploading to maintain a consistent order
  const sortedBookmarks = Object.fromEntries(
    sortBookmarks(Object.entries(remoteData), 'createdDesc').map(
      ([url, tagsAndMetadta]) => [
        url,
        {
          tags: tagsAndMetadta.tags,
          deletedMeta: tagsAndMetadta.deletedMeta,
          meta: sortMetaProperties(tagsAndMetadta.meta),
        },
      ]
    )
  )

  const stats = calculateBookmarkStatsFromData(sortedBookmarks)
  const deviceInfo = getDeviceInfo()
  const bookmarksStore: BookmarksStore = {
    data: sortedBookmarks,
    meta: {
      ...defaultStoreMeta,
      stats,
      lastUploadDevice: {
        deviceId: deviceInfo.deviceId,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
        uploadTimestamp: now,
        userAgent: navigator.userAgent,
        origin: globalThis.location.origin,
        lastDataChangeTimestamp,
        currentSyncTimestamp: currentSyncTimestamp ?? now,
      },
      updated: now,
      ...meta,
    },
  }

  return prettyPrintJson(normalizeBookmarkData(bookmarksStore))
}

describe('SyncManager', () => {
  let syncManager: SyncManager
  // let customAdapter: CustomApiSyncAdapter; // Will be created by SyncManager

  const mockSyncServiceConfig: SyncServiceConfig = {
    id: 'custom-test-id',
    type: 'customApi',
    name: 'Test Custom API Service',
    enabled: true,
    scope: 'all',
    credentials: { apiKey: 'test-api-key' },
    target: { url: 'http://localhost:3000/sync', path: 'bookmarks.json' },
  }

  // Helper function to get the actual adapter instance used by SyncManager
  // This is a bit of a workaround for testing private/internal behavior.
  // In a real scenario, you might expose a way to get an adapter for testing
  // or rely purely on public interface interactions.
  async function getCreatedAdapterInstance(
    sm: SyncManager,
    serviceId: string
  ): Promise<SyncAdapter | undefined> {
    // Attempt to trigger adapter creation if not already cached
    // This relies on the internal caching mechanism of SyncManager
    // @ts-expect-error - Accessing private member for testing
    if (!sm.adapters.has(serviceId)) {
      const config = getSyncServiceById(get(syncConfigStore), serviceId)
      if (config) {
        // @ts-expect-error - Accessing private member for testing
        await sm.getAdapter(config) // This will create and cache it
      }
    }

    // @ts-expect-error - Accessing private member for testing
    return sm.adapters.get(serviceId)
  }

  beforeEach(() => {
    vi.setSystemTime(new Date(now))
    localStorageMock.clear()
    // It's important to get a fresh instance or reset the store for each test
    // Assuming SettingsStore is a singleton or its state can be reset
    // For simplicity, we'll re-initialize, but in a real app, you might need a reset method
    syncConfigStore.set({
      syncServices: [mockSyncServiceConfig],
      activeSyncServiceId: undefined, // Start with no active adapter
      // ... other default settings
    })

    // SyncManager reads from the global syncConfigStore upon instantiation
    syncManager = new SyncManager()

    // customAdapter will be instantiated by SyncManager if settings point to it
    // We can retrieve it via syncManager.getActiveAdapter() after setting activeSyncServiceId
  })

  afterEach(() => {
    // Reset any mocks or settings after each test
    vi.useRealTimers()
    vi.restoreAllMocks() // Restore all mocks
    vi.clearAllMocks()
    syncManager.destroy()
  })

  describe('Constructor and Initialization', () => {
    it('should create an instance of SyncManager', () => {
      expect(syncManager).toBeInstanceOf(SyncManager)
    })

    it("should initialize with default syncStatus as { type: 'idle' }", () => {
      expect(syncManager.getStatus()).toEqual({ type: 'idle' })
    })
  })

  describe('Adapter Management and Auth Status', () => {
    it('should correctly get and initialize an adapter for a given service ID', async () => {
      // @ts-expect-error - Accessing private member for testing
      const getAdapterSpy = vi.spyOn(syncManager, 'getAdapter')
      await syncManager.checkAuthStatus(mockSyncServiceConfig.id)
      expect(getAdapterSpy).toHaveBeenCalledWith(mockSyncServiceConfig)
      // @ts-expect-error - Accessing private member for testing
      const adapterInstance = syncManager.adapters.get(mockSyncServiceConfig.id)
      expect(adapterInstance).toBeDefined()
      expect(adapterInstance?.getConfig()).toEqual(mockSyncServiceConfig)
    })

    it('should return "unknown" auth status if service config does not exist', async () => {
      const authStatus = await syncManager.checkAuthStatus('non-existent-id')
      expect(authStatus).toBe('unknown')
      expect(syncManager.getStatus().type).toBe('idle') // Should not change status for a non-existent config check
    })

    it('should return "error" auth status if adapter initialization fails', async () => {
      const errorConfig = { ...mockSyncServiceConfig, id: 'error-config' }
      addSyncService(errorConfig)

      // Mock getAdapter to throw an error for this specific config
      // This is tricky because getAdapter is called internally. We might need to mock the adapter's init method.
      // A more direct way: spy on the specific adapter's init method if we know its type.
      // For this example, let's assume CustomApiSyncAdapter is used and its init will be made to fail.

      // This requires a more involved setup to mock the constructor or init of the specific adapter type
      // For simplicity, we'll check the event emission and status update based on the current implementation
      // which catches errors from getAdapter.

      const errorSpy = vi.fn()
      syncManager.on('error', errorSpy)

      // To make getAdapter fail, we can temporarily modify the config to be invalid for the adapter type
      // or mock the adapter's init method to throw.
      // Let's assume the adapter's init will throw.
      // We need to ensure the adapter instance is created and then its init is spied upon.

      // This test needs careful mocking of the adapter's init method.
      // One way is to spy on the prototype of the adapter if we know which one will be created.
      const initSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'init')
        .mockRejectedValueOnce(new Error('Init failed'))

      const authStatus = await syncManager.checkAuthStatus(errorConfig.id)

      expect(authStatus).toBe('error')
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            `Error getting adapter for auth status check: ${errorConfig.name}`
          ),
          serviceId: errorConfig.id,
        })
      )
      initSpy.mockRestore() // Clean up the spy
    })

    it('should call getAuthStatus on the correct adapter and return its status', async () => {
      const authStatusExpected = 'authenticated'
      // Get the adapter instance that SyncManager will create
      // This is a bit indirect. We rely on checkAuthStatus to call getAdapter.
      // Then we get the cached adapter and spy on its getAuthStatus.

      // Call it once to ensure adapter is created and cached
      await syncManager.checkAuthStatus(mockSyncServiceConfig.id)
      const adapter = (await getCreatedAdapterInstance(
        syncManager,
        mockSyncServiceConfig.id
      )) as CustomApiSyncAdapter

      if (!adapter || typeof adapter.getAuthStatus !== 'function') {
        throw new Error(
          'Test setup: Adapter not found or getAuthStatus not a function'
        )
      }

      const getAuthStatusSpy = vi
        .spyOn(adapter, 'getAuthStatus')
        .mockResolvedValue(authStatusExpected)

      const status = await syncManager.checkAuthStatus(mockSyncServiceConfig.id)
      expect(status).toBe(authStatusExpected)
      expect(getAuthStatusSpy).toHaveBeenCalled()
    })

    it('should have authStatus as "unknown" or relevant status after switching to a new, unauthenticated adapter', async () => {
      setActiveSyncService(mockSyncServiceConfig.id)
      const currentSyncManager = new SyncManager()
      const initialAdapter =
        // @ts-expect-error - access private method to get the adapter
        (await currentSyncManager.getAdapter(
          mockSyncServiceConfig
        )) as CustomApiSyncAdapter

      // @ts-expect-error - we're mocking the method
      if (initialAdapter?.getAuthStatus) {
        vi.spyOn(initialAdapter, 'getAuthStatus').mockResolvedValueOnce(
          'authenticated'
        )
        await currentSyncManager.checkAuthStatus()
      }

      const newServiceConfig: SyncServiceConfig = {
        id: 'new-custom-api-2',
        type: 'customApi',
        name: 'New Test Custom API Service 2',
        enabled: true,
        scope: 'all',
        credentials: { apiKey: 'new-test-api-key-2' },
        target: {
          url: 'http://localhost:3002/sync',
          path: 'bookmarks_new_2.json',
        },
      }
      addSyncService(newServiceConfig)
      setActiveSyncService(newServiceConfig.id) // Switch to the new service

      // currentSyncManager = new SyncManager() // Re-create to pick up new adapter
      const newAdapter =
        // @ts-expect-error - access private method to get the adapter
        (await currentSyncManager.getAdapter(
          newServiceConfig
        )) as CustomApiSyncAdapter

      // @ts-expect-error - we're mocking the method
      if (newAdapter?.getAuthStatus) {
        vi.spyOn(newAdapter, 'getAuthStatus').mockResolvedValueOnce('unknown')
      }

      const authStatus = await currentSyncManager.checkAuthStatus()
      expect(['unknown', 'requires_config', 'unauthenticated']).toContain(
        authStatus
      )
      currentSyncManager.destroy()
    })
  })

  // More test suites for checkAuthStatus, sync operations, event emissions etc. will go here

  describe('Sync Operations', () => {
    let serviceConfigWithStrategy: SyncServiceConfig
    const initialLocalBookmarks: BookmarksData = {
      'http://example.com/local1': {
        tags: ['local'],
        meta: {
          created: now - 2000,
          updated: now - 1000,
          title: 'Local Item 1',
        },
      },
    }

    beforeEach(async () => {
      // Clear localStorage and bookmarkStorage before each test in this suite
      localStorageMock.clear()
      await bookmarkStorage.overwriteBookmarks({}) // Ensure a clean state

      serviceConfigWithStrategy = {
        ...mockSyncServiceConfig,
        id: 'sync-op-service',
        mergeStrategy: {
          meta: 'local',
          tags: 'local',
          defaultDate: DEFAULT_DATE,
        }, // Define the strategy for tests
      }

      // Update the settings store with this specific config for the active service
      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: undefined, // No active service ID needed for direct sync calls
      })

      syncManager.destroy() // Clean up the one from the outer beforeEach
      syncManager = new SyncManager() // Re-create to pick up new settings

      // Setup initial local data for most tests in this suite
      await bookmarkStorage.overwriteBookmarks(initialLocalBookmarks)
    })

    afterEach(async () => {
      syncManager.destroy() // Clean up
      await bookmarkStorage.overwriteBookmarks({}) // Clean up after each test
      vi.restoreAllMocks() // Restore all mocks
    })

    it('should perform a successful first-time sync (upload only when local data exists)', async () => {
      // Arrange: Add some initial local data to bookmarkStorage
      const localBookmarksToSync: BookmarksData = {
        'http://example.com/local1': {
          tags: ['local'],
          meta: {
            created: now - 2000,
            updated: now - 1000,
            title: 'Local Item 1',
          },
        },
      }
      // Save initial data
      await bookmarkStorage.overwriteBookmarks(localBookmarksToSync)

      // Arrange: Mock adapter for a first-time sync scenario
      // The mergeStrategy is now part of the serviceConfig
      const getRemoteMetadataSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'getRemoteMetadata')
        .mockResolvedValue(undefined)
      const downloadSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'download')
        .mockResolvedValue({ data: undefined, remoteMeta: undefined })
      const uploadSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'upload')
        .mockResolvedValue({ version: 'remote-v1', timestamp: now })

      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const getBookmarksDataSpy = vi.spyOn(bookmarkStorage, 'getBookmarksData')

      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()
      const syncStartHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)
      syncManager.on('syncStart', syncStartHandler)

      // Act
      const result = await syncManager.synchronize(serviceConfigWithStrategy.id)

      // Assert
      expect(result).toBe(true)
      expect(getBookmarksDataSpy).toHaveBeenCalled() // Ensure local data is fetched
      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      // Since getRemoteMetadata is undefined, download might be skipped or quick
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      // Then merging (which would be trivial if no remote data)
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'merging',
        // progress: 0,
      }) // Assuming progress starts at 0
      expect(statusChangeHandler).not.toHaveBeenCalledWith({
        type: 'merging',
        progress: 100,
      })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'success',
        lastSyncTime: expect.any(Number),
      })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      }) // Final state

      // Check events
      expect(syncStartHandler).toHaveBeenCalledWith({
        serviceId: serviceConfigWithStrategy.id,
      })
      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: serviceConfigWithStrategy.id,
        status: 'success',
        error: undefined,
      })

      // Check interactions
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(localBookmarksToSync, { created: now }),
        undefined
      ) // No remoteMeta for first upload
      expect(saveStoreSpy).toHaveBeenCalledTimes(0) // Should save the (potentially merged) data
      // The data saved should be the localBookmarksToSync as it's a local_wins and no remote data
      // expect(saveStoreSpy).toHaveBeenCalledWith(
      //   expect.objectContaining({
      //     data: localBookmarksToSync,
      //   }),
      //   true
      // )

      // Check final status
      expect(syncManager.getStatus()).toEqual({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      getRemoteMetadataSpy.mockRestore()
      downloadSpy.mockRestore()
      uploadSpy.mockRestore()
    })

    it('should fail sync if service config is not found', async () => {
      const errorSpy = vi.fn()
      syncManager.on('error', errorSpy)
      const statusChangeHandler = vi.fn()
      syncManager.on('statusChange', statusChangeHandler)

      const result = await syncManager.synchronize('non-existent-service-id')

      expect(result).toBe(false)
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Sync configuration for service ID 'non-existent-service-id' not found.",
          serviceId: 'non-existent-service-id',
        })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error:
            "Sync configuration for service ID 'non-existent-service-id' not found.",
        })
      )
      expect(syncManager.getStatus().type).toBe('error')
    })

    it('should fail sync if service is not enabled', async () => {
      const disabledConfig = {
        ...mockSyncServiceConfig,
        id: 'disabled-service',
        enabled: false,
      }
      addSyncService(disabledConfig)

      const infoSpy = vi.fn()
      syncManager.on('info', infoSpy)
      const statusChangeHandler = vi.fn()
      syncManager.on('statusChange', statusChangeHandler)

      const result = await syncManager.synchronize(disabledConfig.id)

      expect(result).toBe(false)
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Sync service '${disabledConfig.name}' (ID: ${disabledConfig.id}) is not enabled.`,
          serviceId: disabledConfig.id,
        })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'disabled' })
      expect(syncManager.getStatus().type).toBe('disabled')
    })

    it('should handle sync with "local" merge strategy, local data should overwrite remote and succeed', async () => {
      // Arrange: Local data has one version, remote has a potentially conflicting version
      const localDataToWin: BookmarksData = {
        'http://example.com/conflict': {
          tags: ['local-tag', 'updated-local'],
          meta: {
            created: 1_672_531_200_000,
            updated: 1_672_531_201_000, // Updated later locally
            title: 'Local Title - Wins',
          },
        },
      }
      const remoteDataToOverwrite: BookmarksData = {
        'http://example.com/conflict': {
          tags: ['remote-tag'],
          meta: {
            created: 1_672_531_200_000,
            updated: 1_672_531_200_500, // Updated at a different time remotely
            title: 'Remote Title - Overwritten',
          },
        },
        'http://example.com/remote-only': {
          tags: ['remote-only-tag'],
          meta: {
            created: 1_672_531_300_000,
            updated: 1_672_531_300_000,
            title: 'Remote Only Title',
          },
        },
      }

      await bookmarkStorage.overwriteBookmarks(localDataToWin)

      const getRemoteMetadataSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'getRemoteMetadata')
        .mockResolvedValue({
          version: 'remote-version-old',
          timestamp: now - 10_000,
        })
      const downloadSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'download')
        .mockResolvedValue({
          data: convertToDownloadData(remoteDataToOverwrite),
          remoteMeta: {
            version: 'remote-version-old',
            timestamp: now - 10_000,
          },
        })
      const uploadSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'upload')
        .mockResolvedValue({ version: 'new-remote-version', timestamp: now })

      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      const statusChangeHandler = vi.fn()
      const syncConflictHandler = vi.fn()
      const syncEndHandler = vi.fn()
      const syncSuccessHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncConflict', syncConflictHandler)
      syncManager.on('syncEnd', syncEndHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)

      // Act
      const syncResult = await syncManager.sync(serviceConfigWithStrategy.id)

      // Assert
      expect(syncResult).toBe(true) // Sync should succeed with local wins

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates for successful sync with local wins
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'merging',
        progress: 100,
      })
      // With local wins, it proceeds to uploading the 'merged' (local) data
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })
      expect(statusChangeHandler).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'conflict' })
      )

      // Check events
      expect(syncConflictHandler).not.toHaveBeenCalled() // No conflict event with local wins

      const expectedMergedData: BookmarksData = {
        ...localDataToWin, // Local data for conflicting item wins
        'http://example.com/remote-only':
          remoteDataToOverwrite['http://example.com/remote-only'], // New remote items are added
      }

      const expectedRemoteData = structuredClone(expectedMergedData)

      // Add updated3 for merged items
      const exceptionsForLocal = [
        // local
        'http://example.com/conflict',
      ]
      setUpdated3ForBookmarks(
        expectedMergedData,
        currentSyncTime,
        exceptionsForLocal
      )

      const exceptionsForRemote = [
        // remote
        'http://example.com/remote-only',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
          // Changes should reflect what was uploaded/saved
          // changes: {
          //   // Depending on how `calculateChanges` is implemented, this might be more detailed
          //   // For a 'local' strategy, it might show local items as 'changed' or 'added' if they overwrote remote
          //   // and new remote items as 'added'.
          //   // For simplicity here, we'll check the overall data that should have been uploaded/saved.
          //   // This part might need refinement based on actual `calculateChanges` output.
          //   added: 1, // remote-only item
          //   updated: 1, // conflict item, local version kept/uploaded
          //   removed: 0,
          // },
          // remoteMeta: {
          //   version: 'new-remote-version',
          //   timestamp: expect.any(Number),
          // },
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: serviceConfigWithStrategy.id,
        status: 'success',
        error: undefined,
      })

      // Check interactions - upload should be called with local data, store should be saved with local data
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(expectedRemoteData),
        {
          version: 'remote-version-old',
          timestamp: expect.any(Number),
        }
      )
      expect(saveStoreSpy).toHaveBeenCalledTimes(1)
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expectedMergedData,
          meta: expect.objectContaining({ updated: expect.any(Number) }),
        }),
        true
      )

      // Check final status
      expect(syncManager.getStatus()).toEqual({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })
    })

    it('should successfully sync when remote file does not exist (first sync)', async () => {
      // Arrange: Local data is already set in beforeEach
      const getRemoteMetadataSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'getRemoteMetadata')
        .mockResolvedValue(undefined) // Simulate no remote file metadata
      const downloadSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'download')
        .mockResolvedValue({ data: undefined, remoteMeta: undefined }) // Simulate no remote file
      const uploadSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'upload')
        .mockResolvedValue({ version: 'new-remote-v1', timestamp: now })

      const statusChangeHandler = vi.fn()
      syncManager.on('statusChange', statusChangeHandler)
      const syncSuccessHandler = vi.fn()
      syncManager.on('syncSuccess', syncSuccessHandler)

      // Act
      const result = await syncManager.synchronize(serviceConfigWithStrategy.id)

      // Assert
      expect(result).toBe(true)
      expect(getRemoteMetadataSpy).toHaveBeenCalledTimes(2) // first call: _fetchRemoteData(), second call: _uploadData()
      expect(downloadSpy).toHaveBeenCalledTimes(1)
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(initialLocalBookmarks, { created: now }),
        undefined // No remote metadata expected for the first upload
      )
      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'merging',
      })
      expect(statusChangeHandler).not.toHaveBeenCalledWith({
        type: 'merging',
        progress: 100,
      })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'success',
        lastSyncTime: expect.any(Number),
      })
      expect(syncManager.getStatus().type).toBe('idle')
    })

    it('should successfully sync when remote file is empty', async () => {
      // Arrange: Local data is already set in beforeEach
      const remoteMeta: SyncMetadata = {
        version: 'empty-v0',
        timestamp: now - 5000,
      }
      const getRemoteMetadataSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'getRemoteMetadata')
        .mockResolvedValue(remoteMeta) // Simulate remote file exists
      const downloadSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'download')
        .mockResolvedValue({ data: '\n', remoteMeta }) // Simulate empty remote file
      const uploadSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'upload')
        .mockResolvedValue({ version: 'local-data-v1', timestamp: now })

      const statusChangeHandler = vi.fn()
      syncManager.on('statusChange', statusChangeHandler)
      const syncSuccessHandler = vi.fn()
      syncManager.on('syncSuccess', syncSuccessHandler)

      // Act
      const result = await syncManager.synchronize(serviceConfigWithStrategy.id)

      // Assert
      expect(result).toBe(true)
      expect(getRemoteMetadataSpy).toHaveBeenCalledTimes(1) // first call: _fetchRemoteData()
      expect(downloadSpy).toHaveBeenCalledTimes(1)
      // Since remote is empty, local data (initialLocalBookmarks) should be uploaded.
      // The expectedRemoteMeta for upload should be the one from download.
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(initialLocalBookmarks, { created: now }),
        remoteMeta
      )
      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'merging',
      })
      expect(statusChangeHandler).not.toHaveBeenCalledWith({
        type: 'merging',
        progress: 100,
      })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'success',
        lastSyncTime: expect.any(Number),
      })
      expect(syncManager.getStatus().type).toBe('idle')

      // Verify bookmarkStorage still contains the initial local bookmarks as merge strategy is 'local'
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(initialLocalBookmarks)
    })

    it('should fail sync and emit error when remote file is not valid JSON', async () => {
      // Arrange: Local data is already set in beforeEach
      const remoteMeta: SyncMetadata = {
        version: 'invalid-v0',
        timestamp: now - 6000,
      }
      const getRemoteMetadataSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'getRemoteMetadata')
        .mockResolvedValue(remoteMeta) // Simulate remote file exists
      const downloadSpy = vi
        .spyOn(CustomApiSyncAdapter.prototype, 'download')
        .mockResolvedValue({ data: 'This is not JSON', remoteMeta }) // Simulate non-JSON remote content
      const uploadSpy = vi.spyOn(CustomApiSyncAdapter.prototype, 'upload')

      const errorHandler = vi.fn()
      syncManager.on('error', errorHandler)
      const statusChangeHandler = vi.fn()
      syncManager.on('statusChange', statusChangeHandler)
      const syncEndHandler = vi.fn()
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.synchronize(serviceConfigWithStrategy.id)

      // Assert
      expect(result).toBe(false)
      expect(getRemoteMetadataSpy).toHaveBeenCalledTimes(1) // first call: _fetchRemoteData()
      expect(downloadSpy).toHaveBeenCalledTimes(1)
      expect(uploadSpy).not.toHaveBeenCalled() // Upload should not occur

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            `Failed to parse remote data for ${serviceConfigWithStrategy.name}`
          ),
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'error',
        error: expect.stringContaining(
          `Failed to parse remote data for ${serviceConfigWithStrategy.name}`
        ),
        lastAttemptTime: expect.any(Number),
      })
      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: serviceConfigWithStrategy.id,
        status: 'error',
        error: expect.stringContaining(
          `Failed to parse remote data for ${serviceConfigWithStrategy.name}`
        ),
      })
      expect(syncManager.getStatus().type).toBe('error')
    })

    it('should successfully download and merge newer remote data when no local conflicts (remote wins strategy)', async () => {
      // Arrange: Setup local data
      const initialLocalData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['local-tag1'],
          meta: {
            created: now - 50_000,
            updated: now - 40_000,
            title: 'Local Item 1 Old',
          },
        },
        'http://example.com/item2': {
          tags: ['shared'],
          meta: {
            created: now - 50_000,
            updated: now - 45_000,
            title: 'Shared Item Local',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(initialLocalData)

      // Setup remote data that is newer or has new items
      const newerRemoteData: BookmarksData = {
        'http://example.com/item1': {
          // Updated version of item1
          tags: ['remote-tag1', 'updated'],
          meta: {
            created: now - 50_000,
            updated: now - 30_000,
            title: 'Remote Item 1 New',
          },
        },
        'http://example.com/item2': {
          // No change, but present to test merging
          tags: ['shared'],
          meta: {
            created: now - 50_000,
            updated: now - 45_000,
            title: 'Shared Item Local',
          },
        },
        'http://example.com/item3': {
          // New item from remote
          tags: ['remote-new'],
          meta: {
            created: now - 20_000,
            updated: now - 20_000,
            title: 'Remote New Item 3',
          },
        },
      }
      const remoteMeta: SyncMetadata = {
        version: 'remote-v2',
        timestamp: now - 1000,
      }

      // Configure merge strategy for remote to win for meta, and union for tags
      serviceConfigWithStrategy.mergeStrategy = {
        meta: 'remote', // Remote metadata wins
        tags: 'union', // Tags are combined
        defaultDate: DEFAULT_DATE,
      }
      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })
      // Re-initialize syncManager if settings change requires it, or ensure it picks up the change.
      // Our current setup re-creates syncManager in beforeEach, but if a test changes syncConfigStore,
      // it might need a new SyncManager instance or a way for SyncManager to react to mid-test settings changes.
      // For this test, we assume the beforeEach setup is sufficient or SyncManager reacts to syncConfigStore updates.
      syncManager.destroy()
      syncManager = new SyncManager() // Ensure it picks up the new merge strategy
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )
      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue(
        remoteMeta
      )
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(newerRemoteData),
        remoteMeta,
      })
      // const uploadSpy = vi.spyOn(currentAdapter, 'upload') // Should be called with merged data
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-version',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      // Expected merged data
      const expectedMergedData: BookmarksData = {
        'http://example.com/item1': newerRemoteData['http://example.com/item1'], // Remote version wins for meta
        'http://example.com/item2': {
          ...initialLocalData['http://example.com/item2'], // Meta could be local/remote/merged based on strategy
          tags: ['shared'], // Assuming 'union' keeps it as is if identical, or combines if different
        },
        'http://example.com/item3': newerRemoteData['http://example.com/item3'], // New remote item added
      }
      // Adjust item2 tags based on 'union' if they were different. Here they are the same.
      if (serviceConfigWithStrategy.mergeStrategy?.tags === 'union') {
        expectedMergedData['http://example.com/item1'].tags = [
          'local-tag1',
          'remote-tag1',
          'updated',
        ] // Union of tags
      }

      const expectedRemoteData = structuredClone(expectedMergedData)

      // Add updated3 for merged items
      const exceptionsForLocal = [
        // local
        'http://example.com/item2',
      ]
      setUpdated3ForBookmarks(
        expectedMergedData,
        currentSyncTime,
        exceptionsForLocal
      )

      const exceptionsForRemote = [
        // remote
        'http://example.com/item2',
        'http://example.com/item3',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      // Check that upload was called with the correctly merged data
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(expectedRemoteData),
        remoteMeta // Previous remoteMeta is passed to upload
      )

      // Check that bookmarkStorage was updated with the merged data
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: expectedMergedData }),
        true
      )

      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
          // changes: { added: 1, updated: 1, removed: 0 }, // This needs careful calculation
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )

      // Verify final state of bookmarkStorage
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)
    })

    it('should successfully merge newer remote data with local data using merge strategy', async () => {
      // Arrange: Setup local data with older timestamps
      const initialLocalData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['local-tag1', 'shared-tag'],
          meta: {
            created: now - 50_000,
            updated: now - 40_000,
            title: 'Local Item 1',
            description: 'Local description', // Local-only field
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(initialLocalData)

      // Setup remote data with newer timestamps and additional fields
      const newerRemoteData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['remote-tag1', 'shared-tag'],
          meta: {
            created: now - 50_000, // Same creation time
            updated: now - 30_000, // Newer update time
            title: 'Remote Item 1',
            url: 'http://example.com/item1-updated', // Remote-only field
          },
        },
      }
      const remoteMeta: SyncMetadata = {
        version: 'remote-v2',
        timestamp: now - 1000,
      }

      // Configure merge strategy to merge meta and union tags
      serviceConfigWithStrategy.mergeStrategy = {
        meta: 'merge', // Merge metadata fields
        tags: 'union', // Combine tags from both sources
        defaultDate: DEFAULT_DATE,
      }
      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })

      // Re-initialize syncManager with new settings
      syncManager.destroy()
      syncManager = new SyncManager()
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )

      // Mock adapter methods
      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue(
        remoteMeta
      )
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(newerRemoteData),
        remoteMeta,
      })
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-version',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      // Setup event handlers
      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      // Expected merged data
      const expectedMergedData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['local-tag1', 'shared-tag', 'remote-tag1'], // Union of all tags
          meta: {
            created: now - 50_000, // Original creation time
            updated: now - 30_000, // Newer update time from remote
            title: 'Remote Item 1', // Remote title (newer)
            description: 'Local description', // Preserved local field
            url: 'http://example.com/item1-updated', // Added remote field
            updated3: currentSyncTime, // Updated3 should be currentSyncTime
          },
        },
      }

      // Check that upload was called with the correctly merged data
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(expectedMergedData),
        remoteMeta
      )

      // Check that bookmarkStorage was updated with the merged data
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: expectedMergedData }),
        true
      )

      // Check success events
      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )

      // Verify final state of bookmarkStorage
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)
    })

    it('should handle sync with local data having newer update time than remote', async () => {
      // Arrange: Setup local data with newer update time
      const localData: BookmarksData = {
        'http://example.com/shared-item': {
          tags: ['local-tag', 'shared-tag'],
          meta: {
            created: now - 50_000,
            updated: now - 1000, // Newer update time
            title: 'Local Title',
            description: 'Local description',
          },
        },
        'http://example.com/local-only': {
          tags: ['local-only'],
          meta: {
            created: now - 40_000,
            updated: now - 2000,
            title: 'Local Only Item',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(localData)

      // Setup remote data with older update time
      const remoteData: BookmarksData = {
        'http://example.com/shared-item': {
          tags: ['remote-tag', 'shared-tag'],
          meta: {
            created: now - 50_000,
            updated: now - 5000, // Older update time
            title: 'Remote Title',
            url: 'http://example.com/shared-item-updated',
          },
        },
        'http://example.com/remote-only': {
          tags: ['remote-only'],
          meta: {
            created: now - 30_000,
            updated: now - 3000,
            title: 'Remote Only Item',
          },
        },
      }

      // Configure merge strategy to prefer local data
      serviceConfigWithStrategy.mergeStrategy = {
        meta: 'local', // Prefer local metadata
        tags: 'local', // Prefer local tags
        defaultDate: DEFAULT_DATE,
      }
      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })

      // Reinitialize syncManager to apply new merge strategy
      syncManager.destroy()
      syncManager = new SyncManager()
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )

      // Mock adapter methods
      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue({
        version: 'remote-v1',
        timestamp: now - 5000,
      })
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta: {
          version: 'remote-v1',
          timestamp: now - 5000,
        },
      })
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-version',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      // Setup event handlers
      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      // Expected merged data
      const expectedMergedData: BookmarksData = {
        'http://example.com/shared-item':
          localData['http://example.com/shared-item'], // Prefer local data
        'http://example.com/remote-only':
          remoteData['http://example.com/remote-only'], // Add remote-only items
        'http://example.com/local-only':
          localData['http://example.com/local-only'], // Keep local-only items
      }

      const expectedRemoteData = structuredClone(expectedMergedData)

      // Add updated3 for merged items
      const exceptionsForLocal = [
        // local
        'http://example.com/shared-item',
        'http://example.com/local-only',
      ]
      setUpdated3ForBookmarks(
        expectedMergedData,
        currentSyncTime,
        exceptionsForLocal
      )

      const exceptionsForRemote = [
        // remote
        'http://example.com/remote-only',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      // Verify uploaded data
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(expectedRemoteData),
        expect.objectContaining({
          version: 'remote-v1',
          timestamp: expect.any(Number),
        })
      )

      // Verify local storage data
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expectedMergedData,
          meta: expect.objectContaining({ updated: expect.any(Number) }),
        }),
        true
      )

      // Verify event triggers
      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: serviceConfigWithStrategy.id,
        status: 'success',
        error: undefined,
      })

      // Verify final local data state
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)
    })

    it('should handle sync with lastDataChangeTimestamp set in serviceConfig', async () => {
      // Arrange: Setup local data with timestamps after lastSyncTimestamp
      const lastSyncTimestamp = now - 100_000 // Set a past timestamp for last sync
      const localData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['local-tag'],
          meta: {
            created: lastSyncTimestamp + 1000,
            updated: lastSyncTimestamp + 2000, // Modified after last sync
            title: 'Local Item 1',
          },
        },
        'http://example.com/unchanged': {
          tags: ['unchanged'],
          meta: {
            created: lastSyncTimestamp - 5000, // Created before last sync
            updated: lastSyncTimestamp - 1000, // Not modified since last sync
            title: 'Unchanged Item',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(localData)

      // Setup remote data with some changes after lastSyncTimestamp
      const remoteData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['remote-tag'],
          meta: {
            created: lastSyncTimestamp + 1000,
            updated: lastSyncTimestamp + 3000, // Remote has newer update
            title: 'Remote Item 1',
          },
        },
        'http://example.com/unchanged': {
          tags: ['unchanged'],
          meta: {
            created: lastSyncTimestamp - 5000,
            updated: lastSyncTimestamp - 1000,
            title: 'Unchanged Item',
          },
        },
        'http://example.com/new-remote': {
          tags: ['remote-new'],
          meta: {
            created: lastSyncTimestamp + 4000, // Created after last sync
            updated: lastSyncTimestamp + 4000,
            title: 'New Remote Item',
          },
        },
      }

      // Configure merge strategy to prefer remote data
      serviceConfigWithStrategy.mergeStrategy = {
        meta: 'remote', // Remote metadata wins
        tags: 'union', // Combine tags from both sources
        defaultDate: DEFAULT_DATE,
      }
      // Set lastDataChangeTimestamp in service config
      serviceConfigWithStrategy.lastDataChangeTimestamp = lastSyncTimestamp
      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })

      // Reinitialize syncManager to apply new settings
      syncManager.destroy()
      syncManager = new SyncManager()
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )

      // Mock adapter methods
      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue({
        version: 'remote-v1',
        timestamp: now,
      })
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta: {
          version: 'remote-v1',
          timestamp: now,
        },
      })
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-version',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      // Setup event handlers
      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      // Expected merged data
      const expectedMergedData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['local-tag', 'remote-tag'], // Union of tags
          meta: remoteData['http://example.com/item1'].meta, // Remote meta wins
        },
        'http://example.com/unchanged':
          localData['http://example.com/unchanged'], // Unchanged item remains as is
        'http://example.com/new-remote':
          remoteData['http://example.com/new-remote'], // New remote item added
      }

      const expectedRemoteData = structuredClone(expectedMergedData)

      // Add updated3 for merged items
      const exceptionsForLocal = [
        // local
        'http://example.com/unchanged',
      ]
      setUpdated3ForBookmarks(
        expectedMergedData,
        currentSyncTime,
        exceptionsForLocal
      )

      const exceptionsForRemote = [
        // remote
        'http://example.com/unchanged',
        'http://example.com/new-remote',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      // Verify uploaded data
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(
          expectedRemoteData,
          undefined,
          lastSyncTimestamp,
          currentSyncTime
        ),
        expect.objectContaining({
          version: 'remote-v1',
          timestamp: expect.any(Number),
        })
      )

      // Verify local storage data
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expectedMergedData,
          meta: expect.objectContaining({ updated: expect.any(Number) }),
        }),
        true
      )

      // Verify event triggers
      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: serviceConfigWithStrategy.id,
        status: 'success',
        error: undefined,
      })

      // Verify final local data state
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)

      // Verify that the lastSyncTimestamp was considered
      expect(syncManager.getStatus()).toEqual({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })
    })

    it('should handle sync with lastDataChangeTimestamp when both local and remote have changes', async () => {
      // Arrange: Setup initial local data
      const initialLocalData: BookmarksData = {
        'http://example.com/modified-both': {
          tags: ['local-tag', 'shared-tag'],
          meta: {
            created: now - 50_000,
            updated: now - 40_000,
            title: 'Initial Title',
          },
        },
        'http://example.com/modified-local': {
          tags: ['local-only'],
          meta: {
            created: now - 50_000,
            updated: now - 40_000,
            title: 'Local Modified',
          },
        },
        'http://example.com/unmodified': {
          tags: ['stable'],
          meta: {
            created: now - 60_000,
            updated: now - 60_000,
            title: 'Unmodified Item',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(initialLocalData)

      // Set lastDataChangeTimestamp in service config
      const lastSyncTime = now - 45_000
      serviceConfigWithStrategy = {
        ...serviceConfigWithStrategy,
        lastDataChangeTimestamp: lastSyncTime,
        mergeStrategy: {
          meta: 'remote',
          tags: 'union',
          defaultDate: DEFAULT_DATE,
        },
      }
      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })

      // Setup remote data with changes after lastSyncTimestamp
      const remoteData: BookmarksData = {
        'http://example.com/modified-both': {
          tags: ['remote-tag', 'shared-tag'],
          meta: {
            created: now - 50_000,
            updated: now - 35_000, // Modified after lastSyncTime
            title: 'Remote Updated Title',
          },
        },
        'http://example.com/modified-local': {
          tags: ['local-only'],
          meta: {
            created: now - 50_000, // updated earlier than created
            updated: now - 60_000, // Not modified after lastSyncTime, staled
            title: 'Local Modified',
          },
        },
        'http://example.com/unmodified': {
          tags: ['stable'],
          meta: {
            created: now - 60_000,
            updated: now - 60_000,
            title: 'Unmodified Item',
          },
        },
        'http://example.com/new-remote': {
          tags: ['remote-new'],
          meta: {
            created: now - 30_000,
            updated: now - 30_000,
            title: 'New Remote Item',
          },
        },
      }

      // Re-initialize syncManager with new settings
      syncManager.destroy()
      syncManager = new SyncManager()
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )

      // Mock adapter methods
      const remoteMeta: SyncMetadata = {
        version: 'remote-v2',
        timestamp: now - 1000,
      }
      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue(
        remoteMeta
      )
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta,
      })
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-version',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      // Setup event handlers
      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      // Expected merged data
      const expectedMergedData: BookmarksData = {
        'http://example.com/modified-both': {
          tags: ['local-tag', 'shared-tag', 'remote-tag'], // Union of tags
          meta: remoteData['http://example.com/modified-both'].meta, // Remote meta wins
        },
        'http://example.com/modified-local':
          initialLocalData['http://example.com/modified-local'], // Local changes kept
        'http://example.com/unmodified':
          initialLocalData['http://example.com/unmodified'], // Unmodified data kept
        'http://example.com/new-remote':
          remoteData['http://example.com/new-remote'], // New remote item added
      }

      expectedMergedData['http://example.com/modified-local'].meta.created =
        remoteData['http://example.com/modified-local'].meta.updated // updated earlier than created

      const expectedRemoteData = structuredClone(expectedMergedData)

      // Add updated3 for merged items
      const exceptionsForLocal = [
        // local
        'http://example.com/unmodified',
        // 'http://example.com/modified-local',
      ]
      setUpdated3ForBookmarks(
        expectedMergedData,
        currentSyncTime,
        exceptionsForLocal
      )

      const exceptionsForRemote = [
        'http://example.com/unmodified',
        'http://example.com/new-remote',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      // Check that upload was called with the correctly merged data
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(
          expectedRemoteData,
          undefined,
          lastSyncTime,
          currentSyncTime
        ),
        remoteMeta
      )

      // Check that bookmarkStorage was updated with the merged data
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: expectedMergedData }),
        true
      )

      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )

      // Verify final state of bookmarkStorage
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)
    })

    it('should handle sync with lastDataChangeTimestamp and newer merge strategy', async () => {
      // Arrange: Setup lastSyncTimestamp
      const lastSyncTimestamp = now - 100_000 // Last sync was 100 seconds ago

      // Configure merge strategy to use newer for both meta and tags
      serviceConfigWithStrategy.mergeStrategy = {
        meta: 'newer',
        tags: 'newer',
        defaultDate: DEFAULT_DATE,
      }
      serviceConfigWithStrategy.lastDataChangeTimestamp = lastSyncTimestamp

      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })

      // Re-initialize syncManager to pick up new settings
      syncManager.destroy()
      syncManager = new SyncManager()
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )

      // Setup initial local data with various timestamps
      const initialLocalData: BookmarksData = {
        'http://example.com/unchanged': {
          tags: ['old-tag'],
          meta: {
            created: lastSyncTimestamp - 50_000,
            updated: lastSyncTimestamp - 40_000, // Not modified since last sync
            title: 'Unchanged Item',
          },
        },
        'http://example.com/local-modified': {
          tags: ['local-new-tag'],
          meta: {
            created: lastSyncTimestamp - 30_000,
            updated: lastSyncTimestamp + 5000, // Modified after last sync
            title: 'Local Modified Item',
          },
        },
        'http://example.com/conflict': {
          tags: ['local-conflict-tag'],
          meta: {
            created: lastSyncTimestamp - 20_000,
            updated: lastSyncTimestamp + 15_000, // Modified after last sync
            title: 'Local Conflict Item',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(initialLocalData)

      // Setup remote data
      const remoteData: BookmarksData = {
        'http://example.com/unchanged': {
          tags: ['old-tag'],
          meta: {
            created: lastSyncTimestamp - 50_000,
            updated: lastSyncTimestamp - 40_000, // Same as local
            title: 'Unchanged Item',
          },
        },
        'http://example.com/remote-modified': {
          tags: ['remote-new-tag'],
          meta: {
            created: lastSyncTimestamp - 25_000,
            updated: lastSyncTimestamp + 10_000, // Modified after last sync
            title: 'Remote Modified Item',
          },
        },
        'http://example.com/conflict': {
          tags: ['remote-conflict-tag'],
          meta: {
            created: lastSyncTimestamp - 20_000,
            updated: lastSyncTimestamp + 20_000, // Modified after last sync, newer than local
            title: 'Remote Conflict Item',
          },
        },
      }

      const remoteMeta: SyncMetadata = {
        version: 'remote-v2',
        timestamp: now - 1000,
      }

      // Mock adapter methods
      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue(
        remoteMeta
      )
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta,
      })
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-version',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      // Setup event handlers
      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      // Expected merged data based on newer strategy
      const expectedMergedData: BookmarksData = {
        'http://example.com/unchanged':
          initialLocalData['http://example.com/unchanged'], // Unchanged
        'http://example.com/remote-modified':
          remoteData['http://example.com/remote-modified'], // Remote is new
        'http://example.com/conflict':
          remoteData['http://example.com/conflict'], // Remote is newer
        'http://example.com/local-modified':
          initialLocalData['http://example.com/local-modified'], // Local is newer
      }

      const expectedRemoteData = structuredClone(expectedMergedData)

      // Add updated3 for merged items
      const exceptionsForLocal = [
        // local
        'http://example.com/unchanged',
        'http://example.com/local-modified',
      ]
      setUpdated3ForBookmarks(
        expectedMergedData,
        currentSyncTime,
        exceptionsForLocal
      )

      const exceptionsForRemote = [
        // remote
        'http://example.com/unchanged',
        'http://example.com/conflict',
        'http://example.com/remote-modified',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      // Check that upload was called with the correctly merged data
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(
          expectedRemoteData,
          undefined,
          lastSyncTimestamp,
          currentSyncTime
        ),
        remoteMeta
      )

      // Check that bookmarkStorage was updated with the merged data
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: expectedMergedData }),
        true
      )

      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )

      // Verify final state of bookmarkStorage
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)
    })

    it('should handle sync with lastDataChangeTimestamp, newer strategy, and updates on both local and remote', async () => {
      // Arrange
      const lastSyncTimestamp = now - 100_000 // e.g., 100 seconds ago
      serviceConfigWithStrategy.lastDataChangeTimestamp = lastSyncTimestamp
      serviceConfigWithStrategy.mergeStrategy = {
        meta: 'newer',
        tags: 'newer',
        defaultDate: DEFAULT_DATE,
      }

      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })

      syncManager.destroy()
      syncManager = new SyncManager()
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )

      const initialLocalData: BookmarksData = {
        'http://example.com/nochange': {
          tags: ['common'],
          meta: {
            created: lastSyncTimestamp - 20_000, // before lastSyncTimestamp
            updated: lastSyncTimestamp - 10_000, // before lastSyncTimestamp
            title: 'No Change Item',
          },
        },
        'http://example.com/local_newer': {
          tags: ['local', 'common'],
          meta: {
            created: lastSyncTimestamp - 5000,
            updated: lastSyncTimestamp + 5000, // local is newer
            title: 'Local Newer Title',
          },
        },
        'http://example.com/remote_newer': {
          tags: ['remote', 'common'],
          meta: {
            created: lastSyncTimestamp - 6000,
            updated: lastSyncTimestamp + 1000, // remote will be newer
            title: 'Remote Will Be Newer Title - Local Old',
          },
        },
        'http://example.com/local_only_new': {
          tags: ['local-new'],
          meta: {
            created: lastSyncTimestamp + 1000,
            updated: lastSyncTimestamp + 2000,
            title: 'New Local Only Item',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(initialLocalData)

      const remoteData: BookmarksData = {
        'http://example.com/nochange': {
          tags: ['common'], // Same as local
          meta: {
            created: lastSyncTimestamp - 20_000,
            updated: lastSyncTimestamp - 10_000,
            title: 'No Change Item',
          },
        },
        'http://example.com/local_newer': {
          tags: ['remote', 'old-tag'],
          meta: {
            created: lastSyncTimestamp - 5000,
            updated: lastSyncTimestamp + 1000, // older than local
            title: 'Local Newer Title - Remote Old',
          },
        },
        'http://example.com/remote_newer': {
          tags: ['remote', 'new-tag'],
          meta: {
            created: lastSyncTimestamp - 6000,
            updated: lastSyncTimestamp + 6000, // newer than local
            title: 'Remote Newer Title',
          },
        },
        'http://example.com/remote_only_new': {
          tags: ['remote-new'],
          meta: {
            created: lastSyncTimestamp + 3000,
            updated: lastSyncTimestamp + 4000,
            title: 'New Remote Only Item',
          },
        },
      }
      const remoteMeta: SyncMetadata = {
        version: 'remote-v-newer-test',
        timestamp: now - 500, // Remote data timestamp, after lastSyncTimestamp
      }

      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue(
        remoteMeta
      )
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta,
      })
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-v-newer-test',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      // Construct expected merged data based on 'newer' strategy
      const expectedMergedData: BookmarksData = {
        'http://example.com/nochange':
          initialLocalData['http://example.com/nochange'], // Unchanged
        'http://example.com/local_newer': {
          // Local meta is newer, local tags are newer (or union if different)
          tags: ['local', 'common'], // Based on 'newer' and local being more recent
          meta: initialLocalData['http://example.com/local_newer'].meta,
        },
        'http://example.com/remote_newer': {
          // Remote meta is newer, remote tags are newer
          tags: ['remote', 'new-tag'], // Based on 'newer' and remote being more recent
          meta: remoteData['http://example.com/remote_newer'].meta,
        },
        'http://example.com/remote_only_new':
          remoteData['http://example.com/remote_only_new'], // New remote item
        'http://example.com/local_only_new':
          initialLocalData['http://example.com/local_only_new'], // New local item
      }

      const expectedRemoteData = structuredClone(expectedMergedData)

      // Add updated3 for merged items
      const exceptionsForLocal = [
        // local
        'http://example.com/nochange',
        'http://example.com/local_newer',
        'http://example.com/local_only_new',
      ]
      setUpdated3ForBookmarks(
        expectedMergedData,
        currentSyncTime,
        exceptionsForLocal
      )

      const exceptionsForRemote = [
        // remote
        'http://example.com/nochange',
        'http://example.com/remote_newer',
        'http://example.com/remote_only_new',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(
          expectedRemoteData,
          undefined,
          lastSyncTimestamp,
          currentSyncTime
        ),
        remoteMeta
      )
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: expectedMergedData }),
        true
      )

      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )

      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)
    })

    it('should handle bookmark deletions and updates with lastDataChangeTimestamp', async () => {
      // Arrange
      const lastSyncTimestamp = now - 100_000 // e.g., 100 seconds ago
      serviceConfigWithStrategy.lastDataChangeTimestamp = lastSyncTimestamp
      serviceConfigWithStrategy.mergeStrategy = {
        meta: 'newer',
        tags: 'newer',
        defaultDate: DEFAULT_DATE,
      }

      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })

      syncManager.destroy()
      syncManager = new SyncManager()
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )

      // Initial local data with items to be deleted and updated
      const initialLocalData: BookmarksData = {
        // 'http://example.com/local_deleted' is deleted in local
        'http://example.com/remote_deleted': {
          // This will be deleted in remote
          tags: ['will-be-deleted'],
          meta: {
            created: lastSyncTimestamp - 15_000,
            updated: lastSyncTimestamp - 5000, // Not updated since last sync
            title: 'Remote Will Delete This',
          },
        },
        'http://example.com/both_updated': {
          // Both local and remote updated
          tags: ['local-new-tag'],
          meta: {
            created: lastSyncTimestamp - 10_000,
            updated: lastSyncTimestamp + 5000, // Updated after last sync
            title: 'Both Updated - Local Version',
          },
        },
        'http://example.com/local_updated': {
          // Only local updated
          tags: ['local-updated'],
          meta: {
            created: lastSyncTimestamp - 8000,
            updated: lastSyncTimestamp + 2000, // Updated after last sync
            title: 'Local Updated Only',
          },
        },
        'http://example.com/remote_updated': {
          // Only remote will update
          tags: ['old-tag'],
          meta: {
            created: lastSyncTimestamp - 7000,
            updated: lastSyncTimestamp - 1000, // Not updated since last sync
            title: 'Remote Will Update This',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(initialLocalData)

      // Remote data with deletions and updates
      const remoteData: BookmarksData = {
        'http://example.com/local_deleted': {
          // Still exists in remote
          tags: ['to-delete'],
          meta: {
            created: lastSyncTimestamp - 20_000,
            updated: lastSyncTimestamp - 10_000,
            title: 'Local Deleted Item',
          },
        },
        // 'http://example.com/remote_deleted' is deleted in remote
        'http://example.com/both_updated': {
          // Both updated but remote is newer
          tags: ['remote-new-tag'],
          meta: {
            created: lastSyncTimestamp - 10_000,
            updated: lastSyncTimestamp + 8000, // Updated after local update
            title: 'Both Updated - Remote Version',
          },
        },
        'http://example.com/local_updated': {
          // Not updated in remote
          tags: ['not-updated'],
          meta: {
            created: lastSyncTimestamp - 8000,
            updated: lastSyncTimestamp - 2000, // staled
            title: 'Not Updated in Remote',
          },
        },
        'http://example.com/remote_updated': {
          // Updated in remote
          tags: ['new-remote-tag'],
          meta: {
            created: lastSyncTimestamp - 7000,
            updated: lastSyncTimestamp + 3000, // Updated after last sync
            title: 'Remote Updated Version',
          },
        },
      }

      const remoteMeta: SyncMetadata = {
        version: 'remote-v-deletion-test',
        timestamp: now - 500,
      }

      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue(
        remoteMeta
      )
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta,
      })
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-v-deletion-test',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      // Expected merged data after sync
      const expectedMergedData: BookmarksData = {
        // 'http://example.com/local_deleted' should not exist
        // 'http://example.com/remote_deleted' should not exist
        'http://example.com/both_updated': {
          // Remote version wins (newer)
          tags: ['remote-new-tag'],
          meta: remoteData['http://example.com/both_updated'].meta,
        },
        'http://example.com/local_updated': {
          // Local version wins (newer)
          tags: ['local-updated'],
          meta: initialLocalData['http://example.com/local_updated'].meta,
        },
        'http://example.com/remote_updated': {
          // Remote version wins (newer)
          tags: ['new-remote-tag'],
          meta: remoteData['http://example.com/remote_updated'].meta,
        },
      }

      const expectedRemoteData = structuredClone(expectedMergedData)

      // Add updated3 for merged items
      const exceptionsForLocal = [
        // local
        'http://example.com/local_updated',
      ]
      setUpdated3ForBookmarks(
        expectedMergedData,
        currentSyncTime,
        exceptionsForLocal
      )

      const exceptionsForRemote = [
        'http://example.com/both_updated',
        'http://example.com/remote_updated',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      // Check that upload was called with the correctly merged data
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(
          expectedRemoteData,
          undefined,
          lastSyncTimestamp,
          currentSyncTime
        ),
        remoteMeta
      )

      // Check that bookmarkStorage was updated with the merged data
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: expectedMergedData }),
        true
      )

      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )

      // Verify final state of bookmarkStorage
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)

      // Specific assertions for deletion and update scenarios
      expect(
        finalLocalData['http://example.com/remote_deleted']
      ).toBeUndefined()
      expect(finalLocalData['http://example.com/local_deleted']).toBeUndefined()
      expect(finalLocalData['http://example.com/both_updated'].meta.title).toBe(
        'Both Updated - Remote Version'
      )
      expect(
        finalLocalData['http://example.com/local_updated'].meta.title
      ).toBe('Local Updated Only')
      expect(
        finalLocalData['http://example.com/remote_updated'].meta.title
      ).toBe('Remote Updated Version')
    })

    it('should handle multiple local/remote deletions and updates with lastDataChangeTimestamp, meta:merge, tags:remote', async () => {
      // Arrange
      const lastSyncTimestamp = now - 200_000 // e.g., 200 seconds ago
      serviceConfigWithStrategy.lastDataChangeTimestamp = lastSyncTimestamp
      serviceConfigWithStrategy.mergeStrategy = {
        meta: 'merge', // Meta fields are merged, newer wins for conflicts
        tags: 'remote', // Tags from remote always win
        defaultDate: DEFAULT_DATE,
      }

      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })

      syncManager.destroy()
      syncManager = new SyncManager()
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )

      // --- Initial Local Data Setup ---
      const initialLocalData: BookmarksData = {
        // Scenario 1: Local delete, Remote exists (and is newer)
        // 'http://example.com/local_del_remote_exists_newer' -> deleted locally

        // Scenario 2: Local delete, Remote exists (and is older)
        // 'http://example.com/local_del_remote_exists_older' -> deleted locally

        // Scenario 3: Remote delete, Local exists (and is newer)
        'http://example.com/remote_del_local_exists_newer': {
          tags: ['local-tag1', 'shared-tag'],
          meta: {
            created: lastSyncTimestamp - 15_000,
            updated: lastSyncTimestamp + 5000, // Newer than lastSync
            title: 'Remote Deleted, Local Newer',
            description: 'Local description',
          },
        },

        // Scenario 4: Remote delete, Local exists (and is older)
        'http://example.com/remote_del_local_exists_older': {
          tags: ['local-tag2'],
          meta: {
            created: lastSyncTimestamp - 16_000,
            updated: lastSyncTimestamp - 4000, // Older than lastSync
            title: 'Remote Deleted, Local Older',
          },
        },

        // Scenario 5: Both exist, Local newer, Remote has different tags
        'http://example.com/both_exist_local_newer': {
          tags: ['local-tag3', 'local-specific'],
          meta: {
            created: lastSyncTimestamp - 10_000,
            updated: lastSyncTimestamp + 6000, // Newer than lastSync & remote
            title: 'Both Exist, Local Newer Title',
            description: 'Local specific description',
          },
        },

        // Scenario 6: Both exist, Remote newer, Local has different tags
        'http://example.com/both_exist_remote_newer': {
          tags: ['local-tag4', 'will-be-overwritten'],
          meta: {
            created: lastSyncTimestamp - 12_000,
            updated: lastSyncTimestamp + 3000, // Older than remote
            title: 'Both Exist, Remote Newer Title - Local Version',
          },
        },

        // Scenario 7: Both exist, Same update time (local meta wins due to 'merge' tie-breaking, remote tags win)
        'http://example.com/both_exist_same_time': {
          tags: ['local-tag5'],
          meta: {
            created: lastSyncTimestamp - 13_000,
            updated: lastSyncTimestamp + 7000,
            title: 'Both Exist, Same Time - Local Title',
            customField: 'local custom value',
          },
        },

        // Scenario 8: Only local, created after lastSync
        'http://example.com/only_local_new': {
          tags: ['new-local-tag'],
          meta: {
            created: lastSyncTimestamp + 1000,
            updated: lastSyncTimestamp + 1000,
            title: 'New Local Item',
          },
        },
        // Scenario 9: Local updated, remote not changed since last sync
        'http://example.com/local_updated_remote_stale': {
          tags: ['local-updated-tag'],
          meta: {
            created: lastSyncTimestamp - 5000,
            updated: lastSyncTimestamp + 2000, // Updated after last sync
            title: 'Local Updated, Remote Stale',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(initialLocalData)
      // Simulate local deletions
      await bookmarkStorage.deleteBookmark(
        'http://example.com/local_del_remote_exists_newer'
      )
      await bookmarkStorage.deleteBookmark(
        'http://example.com/local_del_remote_exists_older'
      )

      // --- Remote Data Setup ---
      const remoteData: BookmarksData = {
        // Corresponds to Scenario 1
        'http://example.com/local_del_remote_exists_newer': {
          tags: ['remote-tag1', 'remote-specific1'],
          meta: {
            created: lastSyncTimestamp - 18_000,
            updated: lastSyncTimestamp + 8000, // Newer than lastSync
            title: 'Local Deleted, Remote Exists Newer',
            description: 'Remote description for newer',
          },
        },

        // Corresponds to Scenario 2
        'http://example.com/local_del_remote_exists_older': {
          tags: ['remote-tag2'],
          meta: {
            created: lastSyncTimestamp - 19_000,
            updated: lastSyncTimestamp - 2000, // Older than lastSync
            title: 'Local Deleted, Remote Exists Older',
          },
        },

        // Corresponds to Scenario 3 (deleted in remote)
        // 'http://example.com/remote_del_local_exists_newer' -> deleted remotely

        // Corresponds to Scenario 4 (deleted in remote)
        // 'http://example.com/remote_del_local_exists_older' -> deleted remotely

        // Corresponds to Scenario 5
        'http://example.com/both_exist_local_newer': {
          tags: ['remote-tag3', 'remote-specific2'], // Remote tags will win
          meta: {
            created: lastSyncTimestamp - 10_000,
            updated: lastSyncTimestamp + 2000, // Older than local
            title: 'Both Exist, Local Newer Title - Remote Version',
            description: 'Remote description for local newer',
          },
        },

        // Corresponds to Scenario 6
        'http://example.com/both_exist_remote_newer': {
          tags: ['remote-tag4', 'remote-wins'], // Remote tags will win
          meta: {
            created: lastSyncTimestamp - 12_000,
            updated: lastSyncTimestamp + 9000, // Newer than local
            title: 'Both Exist, Remote Newer Title - Remote Version',
            remoteField: 'remote specific value',
          },
        },

        // Corresponds to Scenario 7
        'http://example.com/both_exist_same_time': {
          tags: ['remote-tag5', 'remote-always'], // Remote tags will win
          meta: {
            created: lastSyncTimestamp - 13_000,
            updated: lastSyncTimestamp + 7000, // Same as local
            title: 'Both Exist, Same Time - Remote Title',
            anotherCustomField: 'remote custom value 2',
          },
        },

        // Scenario 10: Only remote, created after lastSync
        'http://example.com/only_remote_new': {
          tags: ['new-remote-tag'],
          meta: {
            created: lastSyncTimestamp + 1500,
            updated: lastSyncTimestamp + 1500,
            title: 'New Remote Item',
          },
        },
        // Corresponds to Scenario 9 (remote not changed)
        'http://example.com/local_updated_remote_stale': {
          tags: ['stale-remote-tag'],
          meta: {
            created: lastSyncTimestamp - 5000,
            updated: lastSyncTimestamp - 3000, // Not updated since last sync
            title: 'Local Updated, Remote Stale - Remote Version',
          },
        },
      }

      const remoteMeta: SyncMetadata = {
        version: 'remote-v-multi-del-update',
        timestamp: now - 100, // Remote is slightly behind current time but ahead of some items
      }

      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue(
        remoteMeta
      )
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta,
      })
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-v-multi-del-update',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks')

      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      // --- Expected Merged Data ---
      const expectedMergedData: BookmarksData = {
        // Scenario 1: Local deleted, Remote exists & newer. Remote wins, item restored.
        'http://example.com/local_del_remote_exists_newer': {
          tags: remoteData['http://example.com/local_del_remote_exists_newer']
            .tags, // remote tags
          meta: {
            ...remoteData['http://example.com/local_del_remote_exists_newer']
              .meta,
          },
        },

        // Scenario 2: Local deleted, Remote exists & older. Item deleted.
        // Remote is older, Local is deleted, so it's gone.

        // Scenario 3: Remote deleted, Local exists & newer. Local wins, item kept.
        'http://example.com/remote_del_local_exists_newer': {
          // Tags should be from remote if it existed, but it's deleted. So local tags remain.
          // However, with 'tags: remote', if the item was on remote before and now is not, it implies remote wants it deleted.
          // This is tricky. The current merge logic might keep it if local is newer.
          // Let's assume for 'merge' meta, if remote is deleted, local 'newer' meta keeps it.
          // For 'tags: remote', if the item is kept due to local meta, what tags does it get?
          // If remote doesn't have the item, it can't provide tags. So local tags should persist.
          // This needs clarification in merge logic for deleted items + 'tags: remote'.
          // For now, assuming local tags persist if item is kept due to local meta and remote deletion.
          // Based on `resolveBookmarkMerge` and `resolveTags`, if remote is undefined, local tags are used.
          tags: initialLocalData[
            'http://example.com/remote_del_local_exists_newer'
          ].tags,
          meta: {
            ...initialLocalData[
              'http://example.com/remote_del_local_exists_newer'
            ].meta,
          },
        },

        // Scenario 4: Remote deleted, Local exists & older. Item deleted.
        // Local is older, remote is deleted, so it's gone.

        // Scenario 5: Both exist, Local newer. Meta merged (local wins conflicts), Tags from remote.
        'http://example.com/both_exist_local_newer': {
          tags: remoteData['http://example.com/both_exist_local_newer'].tags, // remote tags
          meta: {
            // Merged: local title, local description, remote created (if different and chosen by merge), local updated
            created:
              initialLocalData['http://example.com/both_exist_local_newer'].meta
                .created, // Assuming created is not changed by remote if local is newer
            updated:
              initialLocalData['http://example.com/both_exist_local_newer'].meta
                .updated,
            title:
              initialLocalData['http://example.com/both_exist_local_newer'].meta
                .title,
            description:
              initialLocalData['http://example.com/both_exist_local_newer'].meta
                .description, // Local has it, remote doesn't
          },
        },

        // Scenario 6: Both exist, Remote newer. Meta merged (remote wins conflicts), Tags from remote.
        'http://example.com/both_exist_remote_newer': {
          tags: remoteData['http://example.com/both_exist_remote_newer'].tags, // remote tags
          meta: {
            // Merged: remote title, remote remoteField, local created (if different), remote updated
            created:
              initialLocalData['http://example.com/both_exist_remote_newer']
                .meta.created,
            updated:
              remoteData['http://example.com/both_exist_remote_newer'].meta
                .updated,
            title:
              remoteData['http://example.com/both_exist_remote_newer'].meta
                .title,
            remoteField:
              remoteData['http://example.com/both_exist_remote_newer'].meta
                .remoteField, // Remote has it
          },
        },

        // Scenario 7: Both exist, Same update time. Meta merged (local wins tie-break), Tags from remote.
        'http://example.com/both_exist_same_time': {
          tags: remoteData['http://example.com/both_exist_same_time'].tags, // remote tags
          meta: {
            created:
              initialLocalData['http://example.com/both_exist_same_time'].meta
                .created,
            updated:
              initialLocalData['http://example.com/both_exist_same_time'].meta
                .updated, // Same, local wins tie-break for whole meta object
            title:
              initialLocalData['http://example.com/both_exist_same_time'].meta
                .title, // Local title
            customField:
              initialLocalData['http://example.com/both_exist_same_time'].meta
                .customField, // Local field
            anotherCustomField:
              remoteData['http://example.com/both_exist_same_time'].meta
                .anotherCustomField, // Remote field
          },
        },

        // Scenario 8: Only local, new. Kept.
        'http://example.com/only_local_new': {
          tags: initialLocalData['http://example.com/only_local_new'].tags,
          meta: initialLocalData['http://example.com/only_local_new'].meta,
        },

        // Scenario 9: Local updated, remote stale. Local wins for meta and tags (staled data will be ignored).
        'http://example.com/local_updated_remote_stale': {
          tags: initialLocalData[
            'http://example.com/local_updated_remote_stale'
          ].tags, // Remote tags win
          meta: {
            // Meta from local as it's newer
            ...initialLocalData['http://example.com/local_updated_remote_stale']
              .meta,
          },
        },

        // Scenario 10: Only remote, new. Added.
        'http://example.com/only_remote_new': {
          tags: remoteData['http://example.com/only_remote_new'].tags,
          meta: remoteData['http://example.com/only_remote_new'].meta,
        },
      }

      const expectedRemoteData = structuredClone(expectedMergedData)

      // Add updated3 for merged items that are not deleted
      const exceptions = [
        // 'http://example.com/local_del_remote_exists_newer',
        'http://example.com/remote_del_local_exists_newer',
        'http://example.com/local_updated_remote_stale',
        'http://example.com/only_local_new',
        // 'http://example.com/only_remote_new',
      ]
      setUpdated3ForBookmarks(expectedMergedData, currentSyncTime, exceptions)

      const exceptionsForRemote = [
        'http://example.com/only_remote_new',
        'http://example.com/both_exist_remote_newer',
        'http://example.com/local_del_remote_exists_newer',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      // Manually remove the item that should be deleted (Scenario 4)
      delete expectedMergedData[
        'http://example.com/remote_del_local_exists_older'
      ]

      // Check that upload was called with the correctly merged data
      // Need to stringify then parse because of potential undefined fields from merge that JSON.stringify removes
      const uploadedData = JSON.parse(uploadSpy.mock.calls[0][0])
      expect(uploadedData).toEqual(
        JSON.parse(
          convertToUploadData(
            expectedRemoteData,
            undefined,
            lastSyncTimestamp,
            currentSyncTime
          )
        )
      )

      // Check that bookmarkStorage was updated with the merged data
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: expectedMergedData }),
        true
      )

      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )

      // Verify final state of bookmarkStorage
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)

      // Specific assertions for key scenarios
      // Scenario 1: Restored from remote
      expect(
        finalLocalData['http://example.com/local_del_remote_exists_newer']
      ).toBeDefined()
      expect(
        finalLocalData['http://example.com/local_del_remote_exists_newer'].meta
          .title
      ).toBe('Local Deleted, Remote Exists Newer')
      expect(
        finalLocalData['http://example.com/local_del_remote_exists_newer'].tags
      ).toEqual(['remote-tag1', 'remote-specific1'])

      // Scenario 2: Restored from remote (older data)
      expect(
        finalLocalData['http://example.com/local_del_remote_exists_older']
      ).toBeUndefined()

      // Scenario 3: Kept from local (remote deleted, local newer)
      expect(
        finalLocalData['http://example.com/remote_del_local_exists_newer']
      ).toBeDefined()
      expect(
        finalLocalData['http://example.com/remote_del_local_exists_newer'].meta
          .title
      ).toBe('Remote Deleted, Local Newer')
      expect(
        finalLocalData['http://example.com/remote_del_local_exists_newer'].tags
      ).toEqual(['local-tag1', 'shared-tag']) // Local tags kept as remote item is gone

      // Scenario 4: Deleted (remote deleted, local older)
      expect(
        finalLocalData['http://example.com/remote_del_local_exists_older']
      ).toBeUndefined()

      // Scenario 5: Local newer meta, remote tags
      expect(
        finalLocalData['http://example.com/both_exist_local_newer'].meta.title
      ).toBe('Both Exist, Local Newer Title')
      expect(
        finalLocalData['http://example.com/both_exist_local_newer'].meta
          .description
      ).toBe('Local specific description')
      expect(
        finalLocalData['http://example.com/both_exist_local_newer'].tags
      ).toEqual(['remote-tag3', 'remote-specific2'])

      // Scenario 6: Remote newer meta, remote tags
      expect(
        finalLocalData['http://example.com/both_exist_remote_newer'].meta.title
      ).toBe('Both Exist, Remote Newer Title - Remote Version')
      expect(
        finalLocalData['http://example.com/both_exist_remote_newer'].meta
          .remoteField
      ).toBe('remote specific value')
      expect(
        finalLocalData['http://example.com/both_exist_remote_newer'].tags
      ).toEqual(['remote-tag4', 'remote-wins'])

      // Scenario 7: Same time, local meta tie-break, remote tags
      expect(
        finalLocalData['http://example.com/both_exist_same_time'].meta.title
      ).toBe('Both Exist, Same Time - Local Title')
      expect(
        finalLocalData['http://example.com/both_exist_same_time'].meta
          .customField
      ).toBe('local custom value')
      expect(
        finalLocalData['http://example.com/both_exist_same_time'].tags
      ).toEqual(['remote-tag5', 'remote-always'])

      // Scenario 9: Local updated meta, remote stale tags
      expect(
        finalLocalData['http://example.com/local_updated_remote_stale'].meta
          .title
      ).toBe('Local Updated, Remote Stale')
      expect(
        finalLocalData['http://example.com/local_updated_remote_stale'].tags
      ).toEqual(['local-updated-tag'])
    })

    it('should handle deleted bookmarks with lastDataChangeTimestamp, meta:merge, tags:remote', async () => {
      // Arrange
      const lastSyncTimestamp = now - 100_000 // e.g., 100 seconds ago
      serviceConfigWithStrategy.lastDataChangeTimestamp = lastSyncTimestamp
      serviceConfigWithStrategy.mergeStrategy = {
        meta: 'merge',
        tags: 'remote',
        defaultDate: DEFAULT_DATE,
      }

      syncConfigStore.set({
        syncServices: [serviceConfigWithStrategy],
        activeSyncServiceId: serviceConfigWithStrategy.id,
      })

      syncManager.destroy()
      syncManager = new SyncManager()
      // @ts-expect-error - access privte method to get the adapter
      const currentAdapter = await syncManager.getAdapter(
        serviceConfigWithStrategy
      )

      // Initial local data with deleted and non-deleted items
      const initialLocalData: BookmarksData = {
        // Scenario 1: Local deleted (newer), Remote not deleted
        'http://example.com/local_deleted_newer': {
          tags: [DELETED_BOOKMARK_TAG, 'local-tag'],
          meta: {
            created: lastSyncTimestamp - 15_000,
            updated: lastSyncTimestamp + 5000, // Newer than lastSync
            title: 'Local Deleted Newer',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp + 5000,
            actionType: 'DELETE',
          },
        },

        // Scenario 2: Local deleted (older), Remote not deleted
        'http://example.com/local_deleted_older': {
          tags: [DELETED_BOOKMARK_TAG, 'local-tag'],
          meta: {
            created: lastSyncTimestamp - 16_000,
            updated: lastSyncTimestamp - 4000, // Older than lastSync
            title: 'Local Deleted Older',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp - 4000,
            actionType: 'DELETE',
          },
        },

        // Scenario 3: Local not deleted, Remote deleted (newer)
        'http://example.com/remote_deleted_newer': {
          tags: ['local-tag'],
          meta: {
            created: lastSyncTimestamp - 10_000,
            updated: lastSyncTimestamp - 2000, // Older than remote
            title: 'Local Not Deleted',
          },
        },

        // Scenario 4: Local not deleted, Remote deleted (older)
        'http://example.com/remote_deleted_older': {
          tags: ['local-tag'],
          meta: {
            created: lastSyncTimestamp - 12_000,
            updated: lastSyncTimestamp + 3000, // Newer than remote
            title: 'Local Not Deleted Newer',
          },
        },

        // Scenario 5: Both deleted, Local newer
        'http://example.com/both_deleted_local_newer': {
          tags: [DELETED_BOOKMARK_TAG, 'local-tag'],
          meta: {
            created: lastSyncTimestamp - 13_000,
            updated: lastSyncTimestamp + 7000, // Newer than remote
            title: 'Both Deleted - Local Newer',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp + 7000,
            actionType: 'DELETE',
          },
        },

        // Scenario 6: Both deleted, Remote newer
        'http://example.com/both_deleted_remote_newer': {
          tags: [DELETED_BOOKMARK_TAG, 'local-tag'],
          meta: {
            created: lastSyncTimestamp - 14_000,
            updated: lastSyncTimestamp + 2000, // Older than remote
            title: 'Both Deleted - Local Older',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp + 2000,
            actionType: 'DELETE',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(initialLocalData)

      // Remote data setup
      const remoteData: BookmarksData = {
        // Scenario 1: Local deleted (newer), Remote not deleted
        'http://example.com/local_deleted_newer': {
          tags: ['remote-tag'],
          meta: {
            created: lastSyncTimestamp - 15_000,
            updated: lastSyncTimestamp + 3000, // Older than local
            title: 'Remote Not Deleted',
          },
        },

        // Scenario 2: Local deleted (older), Remote not deleted
        'http://example.com/local_deleted_older': {
          tags: ['remote-tag'],
          meta: {
            created: lastSyncTimestamp - 16_000,
            updated: lastSyncTimestamp + 6000, // Newer than local
            title: 'Remote Not Deleted Newer',
          },
        },

        // Scenario 3: Local not deleted, Remote deleted (newer)
        'http://example.com/remote_deleted_newer': {
          tags: [DELETED_BOOKMARK_TAG, 'remote-tag'],
          meta: {
            created: lastSyncTimestamp - 10_000,
            updated: lastSyncTimestamp + 8000, // Newer than local
            title: 'Remote Deleted Newer',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp + 8000,
            actionType: 'DELETE',
          },
        },

        // Scenario 4: Local not deleted, Remote deleted (older)
        'http://example.com/remote_deleted_older': {
          tags: [DELETED_BOOKMARK_TAG, 'remote-tag'],
          meta: {
            created: lastSyncTimestamp - 12_000,
            updated: lastSyncTimestamp - 1000, // Older than local, staled
            title: 'Remote Deleted Older',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp - 1000,
            actionType: 'DELETE',
          },
        },

        // Scenario 5: Both deleted, Local newer
        'http://example.com/both_deleted_local_newer': {
          tags: [DELETED_BOOKMARK_TAG, 'remote-tag'],
          meta: {
            created: lastSyncTimestamp - 13_000,
            updated: lastSyncTimestamp + 4000, // Older than local
            title: 'Both Deleted - Remote Older',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp + 4000,
            actionType: 'DELETE',
          },
        },

        // Scenario 6: Both deleted, Remote newer
        'http://example.com/both_deleted_remote_newer': {
          tags: [DELETED_BOOKMARK_TAG, 'remote-tag'],
          meta: {
            created: lastSyncTimestamp - 14_000,
            updated: lastSyncTimestamp + 9000, // Newer than local
            title: 'Both Deleted - Remote Newer',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp + 9000,
            actionType: 'DELETE',
          },
        },
      }

      const remoteMeta: SyncMetadata = {
        version: 'remote-v-deletion-test',
        timestamp: now - 500,
      }

      vi.spyOn(currentAdapter, 'getRemoteMetadata').mockResolvedValue(
        remoteMeta
      )
      vi.spyOn(currentAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta,
      })
      const uploadSpy = vi.spyOn(currentAdapter, 'upload').mockResolvedValue({
        version: 'new-remote-v-deletion-test',
        timestamp: now,
      })
      const saveStoreSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')
      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks') // Spy on the actual mergeBookmarks function

      const statusChangeHandler = vi.fn()
      const syncSuccessHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncSuccess', syncSuccessHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)

      // Check status updates
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'idle',
        lastSyncTime: expect.any(Number),
      })

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Expected merged data after sync
      const expectedMergedData: BookmarksData = {
        // Scenario 1: Local deleted newer wins over remote not deleted
        'http://example.com/local_deleted_newer': {
          tags: ['remote-tag'], // tags: remote strategy
          meta: {
            created: lastSyncTimestamp - 15_000,
            updated: lastSyncTimestamp + 5000, // Local newer wins
            title: 'Local Deleted Newer',
          },
        },

        // Scenario 2: Remote not deleted newer wins over local deleted older
        'http://example.com/local_deleted_older': {
          tags: ['remote-tag'], // tags: remote strategy
          meta: {
            created: lastSyncTimestamp - 16_000,
            updated: lastSyncTimestamp + 6000, // Remote newer wins
            title: 'Remote Not Deleted Newer',
          },
        },

        // Scenario 3: Remote deleted newer wins over local not deleted
        'http://example.com/remote_deleted_newer': {
          tags: [DELETED_BOOKMARK_TAG, 'remote-tag'], // tags: remote strategy
          meta: {
            created: lastSyncTimestamp - 10_000,
            updated: lastSyncTimestamp + 8000, // Remote newer wins
            title: 'Remote Deleted Newer',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp + 8000,
            actionType: 'DELETE',
          },
        },

        // Scenario 4: Local not deleted newer wins over remote deleted older
        'http://example.com/remote_deleted_older': {
          tags: ['local-tag'], // staled will be ignored
          meta: {
            created: lastSyncTimestamp - 12_000,
            updated: lastSyncTimestamp + 3000, // Local newer wins
            title: 'Local Not Deleted Newer',
          },
        },

        // Scenario 5: Both deleted, Local newer wins
        'http://example.com/both_deleted_local_newer': {
          tags: [DELETED_BOOKMARK_TAG, 'remote-tag'], // tags: remote strategy
          meta: {
            created: lastSyncTimestamp - 13_000,
            updated: lastSyncTimestamp + 7000, // Local newer wins
            title: 'Both Deleted - Local Newer',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp + 7000,
            actionType: 'DELETE',
          },
        },

        // Scenario 6: Both deleted, Remote newer wins
        'http://example.com/both_deleted_remote_newer': {
          tags: [DELETED_BOOKMARK_TAG, 'remote-tag'], // tags: remote strategy
          meta: {
            created: lastSyncTimestamp - 14_000,
            updated: lastSyncTimestamp + 9000, // Remote newer wins
            title: 'Both Deleted - Remote Newer',
          },
          deletedMeta: {
            deleted: lastSyncTimestamp + 9000,
            actionType: 'DELETE',
          },
        },
      }

      const expectedRemoteData = structuredClone(expectedMergedData)

      const exceptionsForLocal = [
        // local
        'http://example.com/remote_deleted_older',
      ]
      setUpdated3ForBookmarks(
        expectedMergedData,
        currentSyncTime,
        exceptionsForLocal
      )

      const exceptionsForRemote = [
        'http://example.com/local_deleted_older',
        'http://example.com/remote_deleted_newer',
        'http://example.com/both_deleted_remote_newer',
      ]
      setUpdated3ForBookmarks(
        expectedRemoteData,
        currentSyncTime,
        exceptionsForRemote
      )

      // Check that upload was called with the correctly merged data
      expect(uploadSpy).toHaveBeenCalledWith(
        convertToUploadData(
          expectedRemoteData,
          undefined,
          lastSyncTimestamp,
          currentSyncTime
        ),
        remoteMeta
      )

      // Check that bookmarkStorage was updated with the merged data
      expect(saveStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: expectedMergedData }),
        true
      )

      expect(syncSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: serviceConfigWithStrategy.id,
        })
      )
      expect(syncEndHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )

      // Verify final state of bookmarkStorage
      const finalLocalData = await bookmarkStorage.getBookmarksData()
      expect(finalLocalData).toEqual(expectedMergedData)

      // Specific assertions for deletion scenarios
      // Scenario 1: Local deleted newer wins
      expect(
        finalLocalData['http://example.com/local_deleted_newer'].deletedMeta
      ).toBeUndefined()
      expect(
        finalLocalData['http://example.com/local_deleted_newer'].tags
      ).toEqual(['remote-tag'])

      // Scenario 2: Remote not deleted newer wins
      expect(
        finalLocalData['http://example.com/local_deleted_older'].deletedMeta
      ).toBeUndefined()
      expect(
        finalLocalData['http://example.com/local_deleted_older'].tags
      ).toEqual(['remote-tag'])

      // Scenario 3: Remote deleted newer wins
      expect(
        finalLocalData['http://example.com/remote_deleted_newer'].deletedMeta
      ).toBeDefined()
      expect(
        finalLocalData['http://example.com/remote_deleted_newer'].tags
      ).toEqual([DELETED_BOOKMARK_TAG, 'remote-tag'])

      // Scenario 4: Local not deleted newer wins
      expect(
        finalLocalData['http://example.com/remote_deleted_older'].deletedMeta
      ).toBeUndefined()
      expect(
        finalLocalData['http://example.com/remote_deleted_older'].tags
      ).toEqual(['local-tag'])

      // Scenario 5: Both deleted, Local newer wins
      expect(
        finalLocalData['http://example.com/both_deleted_local_newer']
          .deletedMeta
      ).toBeDefined()
      expect(
        finalLocalData['http://example.com/both_deleted_local_newer'].tags
      ).toEqual([DELETED_BOOKMARK_TAG, 'remote-tag'])

      // Scenario 6: Both deleted, Remote newer wins
      expect(
        finalLocalData['http://example.com/both_deleted_remote_newer']
          .deletedMeta
      ).toBeDefined()
      expect(
        finalLocalData['http://example.com/both_deleted_remote_newer'].tags
      ).toEqual([DELETED_BOOKMARK_TAG, 'remote-tag'])
    })

    describe('when lastSyncTimestamp is present and merge strategy is meta:newer, tags:newer', () => {
      it('should sync over 200 bookmarks with various changes and meta:newer, tags:newer strategy', async () => {
        const initialLastSyncTimestamp = now - 200_000
        const currentSyncTime = now // Simulate current time for sync operation

        const newMergeStrategy: MergeStrategy = {
          meta: 'newer',
          tags: 'newer',
          defaultDate: DEFAULT_DATE,
        }

        const serviceConfigWithLargeData: SyncServiceConfig = {
          ...serviceConfigWithStrategy,
          id: 'largeDataService',
          name: 'Large Data Sync Service',
          lastDataChangeTimestamp: initialLastSyncTimestamp,
          mergeStrategy: newMergeStrategy,
        }

        syncConfigStore.set({
          syncServices: [serviceConfigWithLargeData],
          activeSyncServiceId: serviceConfigWithLargeData.id,
        })

        // Re-initialize SyncManager with the new settings
        const newSyncManager = new SyncManager()
        // @ts-expect-error - access to private property
        const activeAdapter = await newSyncManager.getAdapter(
          serviceConfigWithLargeData
        ) // Assuming CustomApiSyncAdapter

        const localBookmarks: BookmarksData = {}
        const remoteBookmarksData: BookmarksData = {}

        const generateMockBookmarkEntry = (
          id: string,
          title: string,
          timestamp: number,
          tags: string[] = ['common'],
          isDeleted = false,
          deletedTimestamp?: number
        ): BookmarkTagsAndMetadata => {
          const entry: BookmarkTagsAndMetadata = {
            meta: {
              title,
              created: timestamp - 10_000,
              updated: timestamp,
              updated3: timestamp + 1, // ensure updated3 is present
            },
            tags: [...tags],
          }
          if (isDeleted) {
            entry.tags.push(DELETED_BOOKMARK_TAG)
            entry.deletedMeta = {
              deleted: deletedTimestamp || timestamp,
              actionType: 'DELETE',
            }
          }

          return entry
        }

        // 1. Bookmarks only in local (50)
        for (let i = 0; i < 50; i++) {
          const id = `http://local-only-${i}.com`
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            `Local Only ${i}`,
            initialLastSyncTimestamp + i * 10
          )
        }

        // 2. Bookmarks only in remote (50)
        for (let i = 0; i < 50; i++) {
          const id = `http://remote-only-${i}.com`
          remoteBookmarksData[id] = generateMockBookmarkEntry(
            id,
            `Remote Only ${i}`,
            initialLastSyncTimestamp + i * 10
          )
        }

        // 3. Common bookmarks, unchanged (50)
        for (let i = 0; i < 50; i++) {
          const id = `http://common-unchanged-${i}.com`
          const ts = initialLastSyncTimestamp - 50_000 + i * 10
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            `Common Unchanged ${i}`,
            ts
          )
          remoteBookmarksData[id] = structuredClone(localBookmarks[id]) // Exact copy
        }

        // 4. Common bookmarks, local is newer (30)
        for (let i = 0; i < 30; i++) {
          const id = `http://local-newer-${i}.com`
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            'Local Updated Title',
            initialLastSyncTimestamp + 10_000 + i * 10, // Newer
            ['local', 'updated']
          )
          remoteBookmarksData[id] = generateMockBookmarkEntry(
            id,
            'Remote Original Title',
            initialLastSyncTimestamp - 10_000 + i * 10, // Older
            ['remote', 'original']
          )
        }

        // 5. Common bookmarks, remote is newer (30)
        for (let i = 0; i < 30; i++) {
          const id = `http://remote-newer-${i}.com`
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            'Local Original Title',
            initialLastSyncTimestamp - 10_000 + i * 10, // Older
            ['local', 'original']
          )
          remoteBookmarksData[id] = generateMockBookmarkEntry(
            id,
            'Remote Updated Title',
            initialLastSyncTimestamp + 10_000 + i * 10, // Newer
            ['remote', 'updated']
          )
        }

        // 6. Common bookmarks, local deleted (newer) (20)
        for (let i = 0; i < 20; i++) {
          const id = `http://local-deleted-${i}.com`
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            `Local Deleted ${i}`,
            initialLastSyncTimestamp + 15_000 + i * 10, // Deletion time (newer)
            ['local', DELETED_BOOKMARK_TAG],
            true,
            initialLastSyncTimestamp + 15_000 + i * 10
          )
          remoteBookmarksData[id] = generateMockBookmarkEntry(
            id,
            `Remote Active ${i}`,
            initialLastSyncTimestamp - 5000 + i * 10 // Older, not deleted
          )
        }

        // 7. Common bookmarks, remote deleted (newer) (20)
        for (let i = 0; i < 20; i++) {
          const id = `http://remote-deleted-${i}.com`
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            `Local Active ${i}`,
            initialLastSyncTimestamp - 5000 + i * 10 // Older, not deleted
          )
          remoteBookmarksData[id] = generateMockBookmarkEntry(
            id,
            `Remote Deleted ${i}`,
            initialLastSyncTimestamp + 15_000 + i * 10, // Deletion time (newer)
            ['remote', DELETED_BOOKMARK_TAG],
            true,
            initialLastSyncTimestamp + 15_000 + i * 10
          )
        }

        // 8. Common bookmarks, local updated, remote deleted (newer) (20)
        for (let i = 0; i < 20; i++) {
          const id = `http://local-updated-remote-deleted-${i}.com`
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            `Local Updated ${i}`,
            initialLastSyncTimestamp + 5000 + i * 10 // Updated, not deleted
          )
          remoteBookmarksData[id] = generateMockBookmarkEntry(
            id,
            `Remote Deleted ${i}`,
            initialLastSyncTimestamp + 15_000 + i * 10, // Deletion time (newer)
            ['remote', DELETED_BOOKMARK_TAG],
            true,
            initialLastSyncTimestamp + 15_000 + i * 10
          )
        }

        // 9. Common bookmarks, local deleted (newer), remote updated (20)
        for (let i = 0; i < 20; i++) {
          const id = `http://local-deleted-remote-updated-${i}.com`
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            `Local Deleted ${i}`,
            initialLastSyncTimestamp + 15_000 + i * 10, // Deletion time (newer)
            ['local', DELETED_BOOKMARK_TAG],
            true,
            initialLastSyncTimestamp + 15_000 + i * 10
          )
          remoteBookmarksData[id] = generateMockBookmarkEntry(
            id,
            `Remote Updated ${i}`,
            initialLastSyncTimestamp + 5000 + i * 10 // Older, not deleted
          )
        }

        // 10. Common bookmarks, local deleted (newer), remote deleted (20)
        for (let i = 0; i < 20; i++) {
          const id = `http://local-deleted-newer-remote-deleted-${i}.com`
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            `Local Deleted ${i}`,
            initialLastSyncTimestamp + 15_000 + i * 10, // Deletion time (newer)
            ['local', DELETED_BOOKMARK_TAG],
            true,
            initialLastSyncTimestamp + 15_000 + i * 10
          )
          remoteBookmarksData[id] = generateMockBookmarkEntry(
            id,
            `Remote Deleted ${i}`,
            initialLastSyncTimestamp + 5000 + i * 10, // Deletion time (older)
            ['remote', DELETED_BOOKMARK_TAG],
            true,
            initialLastSyncTimestamp + 5000 + i * 10
          )
        }

        // 11. Common bookmarks, local deleted, remote deleted (newer) (20)
        for (let i = 0; i < 20; i++) {
          const id = `http://local-deleted-remote-deleted-newer-${i}.com`
          localBookmarks[id] = generateMockBookmarkEntry(
            id,
            `Local Deleted ${i}`,
            initialLastSyncTimestamp + 5000 + i * 10, // Deletion time (older)
            ['local', DELETED_BOOKMARK_TAG],
            true,
            initialLastSyncTimestamp + 5000 + i * 10
          )
          remoteBookmarksData[id] = generateMockBookmarkEntry(
            id,
            `Remote Deleted ${i}`,
            initialLastSyncTimestamp + 15_000 + i * 10, // Deletion time (newer)
            ['remote', DELETED_BOOKMARK_TAG],
            true,
            initialLastSyncTimestamp + 15_000 + i * 10
          )
        }
        // Total: 50+50+50+30+30+20+20+20+20+20+20 = 330 bookmarks

        await bookmarkStorage.overwriteBookmarks(
          structuredClone(localBookmarks) // Deep copy
        )

        const remoteMeta: SyncMetadata = {
          version: 'remote-v-large-test',
          timestamp: currentSyncTime - 500, // Remote data is slightly older than current sync op
        }

        vi.spyOn(activeAdapter, 'getRemoteMetadata').mockResolvedValue(
          remoteMeta
        )
        vi.spyOn(activeAdapter, 'download').mockResolvedValue({
          data: convertToDownloadData(
            structuredClone(remoteBookmarksData) // Deep copy
          ), // Deep copy
          remoteMeta,
        })

        const uploadSpy = vi.spyOn(activeAdapter, 'upload').mockResolvedValue({
          version: 'new-remote-v-large-test',
          timestamp: currentSyncTime, // Simulate upload success timestamp
        })

        const persistStoreSpy = vi.spyOn(
          bookmarkStorage,
          'persistBookmarksStore'
        )

        const statusChangeEvents: Array<{ type: string; [key: string]: any }> =
          []
        newSyncManager.on('statusChange', (status) =>
          statusChangeEvents.push(status)
        )
        let syncSuccessEvent: any
        newSyncManager.on('syncSuccess', (data) => {
          syncSuccessEvent = data
        })
        let syncEndEvent: any
        newSyncManager.on('syncEnd', (data) => {
          syncEndEvent = data
        })

        // Act
        const syncResult = await newSyncManager.sync()

        // Assert
        expect(syncResult).toBe(true)
        expect(statusChangeEvents).toEqual([
          { type: 'initializing' },
          { type: 'checking' },
          { type: 'downloading' },
          { type: 'merging' },
          { type: 'merging', progress: 100 },
          { type: 'uploading' },
          { type: 'success', lastSyncTime: expect.any(Number) },
          { type: 'idle', lastSyncTime: expect.any(Number) },
        ])
        expect(syncSuccessEvent).toBeDefined()
        expect(syncSuccessEvent.serviceId).toBe(serviceConfigWithLargeData.id)
        expect(syncEndEvent).toBeDefined()
        expect(syncEndEvent.status).toBe('success')

        expect(uploadSpy).toHaveBeenCalledOnce()
        // The first argument to uploadSpy is the stringified data, second is remoteMeta
        const uploadedDataString = uploadSpy.mock.calls[0][0]
        const uploadedRemoteMeta = uploadSpy.mock.calls[0][1]!
        const uploadedBookmarksStore = JSON.parse(
          uploadedDataString
        ) as BookmarksStore
        const uploadedBookmarksData = uploadedBookmarksStore.data

        expect(uploadedRemoteMeta).toEqual(remoteMeta)

        expect(persistStoreSpy).toHaveBeenCalledOnce()
        // The first argument to persistStoreSpy is the BookmarksStore object
        const persistedStoreArg = persistStoreSpy.mock.calls[0][0] as any // Type according to actual BookmarksStore structure
        const mergedBookmarksData = persistedStoreArg.data as BookmarksData

        const allKeys = new Set([
          ...Object.keys(localBookmarks),
          ...Object.keys(remoteBookmarksData),
        ])
        expect(Object.keys(mergedBookmarksData).length).toBe(allKeys.size)
        expect(Object.keys(uploadedBookmarksData).length).toBe(allKeys.size)

        const findMerged = (id: string) => mergedBookmarksData[id]

        // 1. Local only - should exist
        for (let i = 0; i < 50; i++) {
          const id = `http://local-only-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.meta.title).toBe(localBookmarks[id].meta.title)
          expect(merged.tags).toEqual(
            expect.arrayContaining(localBookmarks[id].tags)
          )
        }

        // 2. Remote only - should exist
        for (let i = 0; i < 50; i++) {
          const id = `http://remote-only-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.meta.title).toBe(remoteBookmarksData[id].meta.title)
          expect(merged.tags).toEqual(
            expect.arrayContaining(remoteBookmarksData[id].tags)
          )
        }

        // 3. Common unchanged - should exist with original data (newer strategy means timestamps are compared)
        for (let i = 0; i < 50; i++) {
          const id = `http://common-unchanged-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          // Since timestamps are identical, either local or remote could be picked. Meta and tags should be identical.
          expect(merged.meta.title).toBe(localBookmarks[id].meta.title)
          expect(merged.meta.updated).toBe(localBookmarks[id].meta.updated)
          expect(merged.tags).toEqual(
            expect.arrayContaining(localBookmarks[id].tags)
          )
        }

        // 4. Local newer - local data should win for meta and tags
        for (let i = 0; i < 30; i++) {
          const id = `http://local-newer-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.meta.title).toBe('Local Updated Title')
          expect(merged.meta.updated).toBe(localBookmarks[id].meta.updated)
          expect(merged.tags).toEqual(
            expect.arrayContaining(localBookmarks[id].tags)
          )
        }

        // 5. Remote newer - remote data should win for meta and tags
        for (let i = 0; i < 30; i++) {
          const id = `http://remote-newer-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.meta.title).toBe('Remote Updated Title')
          expect(merged.meta.updated).toBe(remoteBookmarksData[id].meta.updated)
          expect(merged.tags).toEqual(
            expect.arrayContaining(remoteBookmarksData[id].tags)
          )
        }

        // 6. Local deleted (newer) - should be marked as deleted, local meta/tags win due to newer timestamp
        for (let i = 0; i < 20; i++) {
          const id = `http://local-deleted-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.tags).toContain(DELETED_BOOKMARK_TAG)
          expect(merged.deletedMeta?.deleted).toBe(
            localBookmarks[id].deletedMeta?.deleted
          )
          expect(merged.meta.title).toBe(localBookmarks[id].meta.title) // Local meta wins
          // Tags also from local as it's newer overall
          expect(merged.tags).toEqual(
            expect.arrayContaining(
              localBookmarks[id].tags
                .filter((t) => t !== DELETED_BOOKMARK_TAG)
                .concat(DELETED_BOOKMARK_TAG)
            )
          )
        }

        // 7. Remote deleted (newer) - should be marked as deleted, remote meta/tags win
        for (let i = 0; i < 20; i++) {
          const id = `http://remote-deleted-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.tags).toContain(DELETED_BOOKMARK_TAG)
          expect(merged.deletedMeta?.deleted).toBe(
            remoteBookmarksData[id].deletedMeta?.deleted
          )
          expect(merged.meta.title).toBe(remoteBookmarksData[id].meta.title) // Remote meta wins
          // Tags also from remote
          expect(merged.tags).toEqual(
            expect.arrayContaining(
              remoteBookmarksData[id].tags
                .filter((t) => t !== DELETED_BOOKMARK_TAG)
                .concat(DELETED_BOOKMARK_TAG)
            )
          )
        }

        // 8. Common bookmarks, local updated, remote deleted (newer) (20)
        // Expected: Marked as deleted, remote meta/tags win because remote deletion is newer.
        for (let i = 0; i < 20; i++) {
          const id = `http://local-updated-remote-deleted-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.tags).toContain(DELETED_BOOKMARK_TAG)
          expect(merged.deletedMeta?.deleted).toBe(
            remoteBookmarksData[id].deletedMeta?.deleted
          )
          expect(merged.meta.title).toBe(remoteBookmarksData[id].meta.title) // Remote meta wins
          // Tags also from remote (excluding DELETED_BOOKMARK_TAG from remote and adding it back)
          expect(merged.tags).toEqual(
            expect.arrayContaining(
              remoteBookmarksData[id].tags
                .filter((t) => t !== DELETED_BOOKMARK_TAG)
                .concat(DELETED_BOOKMARK_TAG)
            )
          )
        }

        // 9. Common bookmarks, local deleted (newer), remote updated (20)
        // Expected: Marked as deleted, local meta/tags win because local deletion is newer.
        for (let i = 0; i < 20; i++) {
          const id = `http://local-deleted-remote-updated-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.tags).toContain(DELETED_BOOKMARK_TAG)
          expect(merged.deletedMeta?.deleted).toBe(
            localBookmarks[id].deletedMeta?.deleted
          )
          expect(merged.meta.title).toBe(localBookmarks[id].meta.title) // Local meta wins
          // Tags also from local (excluding DELETED_BOOKMARK_TAG from local and adding it back)
          expect(merged.tags).toEqual(
            expect.arrayContaining(
              localBookmarks[id].tags
                .filter((t) => t !== DELETED_BOOKMARK_TAG)
                .concat(DELETED_BOOKMARK_TAG)
            )
          )
        }

        // 10. Common bookmarks, local deleted (newer), remote deleted (20)
        // Expected: Marked as deleted, local meta/tags win because local deletion is newer.
        for (let i = 0; i < 20; i++) {
          const id = `http://local-deleted-newer-remote-deleted-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.tags).toContain(DELETED_BOOKMARK_TAG)
          expect(merged.deletedMeta?.deleted).toBe(
            localBookmarks[id].deletedMeta?.deleted // Local deletion time is newer
          )
          expect(merged.meta.title).toBe(localBookmarks[id].meta.title) // Local meta wins
          // Tags also from local
          expect(merged.tags).toEqual(
            expect.arrayContaining(
              localBookmarks[id].tags
                .filter((t) => t !== DELETED_BOOKMARK_TAG)
                .concat(DELETED_BOOKMARK_TAG)
            )
          )
        }

        // 11. Common bookmarks, local deleted, remote deleted (newer) (20)
        // Expected: Marked as deleted, remote meta/tags win because remote deletion is newer.
        for (let i = 0; i < 20; i++) {
          const id = `http://local-deleted-remote-deleted-newer-${i}.com`
          const merged = findMerged(id)
          expect(merged).toBeDefined()
          expect(merged.tags).toContain(DELETED_BOOKMARK_TAG)
          expect(merged.deletedMeta?.deleted).toBe(
            remoteBookmarksData[id].deletedMeta?.deleted // Remote deletion time is newer
          )
          expect(merged.meta.title).toBe(remoteBookmarksData[id].meta.title) // Remote meta wins
          // Tags also from remote
          expect(merged.tags).toEqual(
            expect.arrayContaining(
              remoteBookmarksData[id].tags
                .filter((t) => t !== DELETED_BOOKMARK_TAG)
                .concat(DELETED_BOOKMARK_TAG)
            )
          )
        }

        // Verify uploaded data contains the same merged results
        const findUploaded = (id: string) => uploadedBookmarksData[id]
        const uploadedLocalNewer = findUploaded(`http://local-newer-0.com`)
        expect(uploadedLocalNewer?.meta.title).toBe('Local Updated Title')
        expect(uploadedLocalNewer?.tags).toEqual(
          expect.arrayContaining(
            localBookmarks[`http://local-newer-0.com`].tags
          )
        )

        const uploadedRemoteDeleted = findUploaded(
          `http://remote-deleted-0.com`
        )
        expect(uploadedRemoteDeleted?.tags).toContain(DELETED_BOOKMARK_TAG)
        expect(uploadedRemoteDeleted?.meta.title).toBe(
          remoteBookmarksData[`http://remote-deleted-0.com`].meta.title
        )

        newSyncManager.destroy()
      })
    })
  })

  describe('Destroy Method', () => {
    let mockPostMessage: ReturnType<typeof vi.fn>
    let mockAddEventListener: ReturnType<typeof vi.fn>
    let mockRemoveEventListener: ReturnType<typeof vi.fn>
    let messageHandler: ((event: MessageEvent) => void) | undefined

    const simulateExtensionResponse = (
      id: string,
      payload?: any,
      error?: string,
      extensionId = 'mock-extension-id' // Default to the one we are testing against
    ) => {
      if (messageHandler) {
        const event = new MessageEvent('message', {
          data: {
            source: 'utags-extension',
            id,
            extensionId,
            payload,
            error,
          },
        }) as MessageEvent
        messageHandler(event)
      }
    }

    const getSentMessage = (callIndex = 0) =>
      mockPostMessage.mock.calls[callIndex][0] // Adjust type as needed

    beforeEach(() => {
      // ... existing beforeEach setup ...

      mockPostMessage = vi.fn()
      messageHandler = undefined

      // Mock event listener setup similar to browser-extension-sync-adapter.test.ts
      const mockEventListenerResult = mockEventListener((event, handler) => {
        if (event === 'message') {
          messageHandler = handler as (event: MessageEvent) => void
        }
      })
      mockAddEventListener = mockEventListenerResult.addEventListener
      mockRemoveEventListener = mockEventListenerResult.removeEventListener

      vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid' })
      vi.stubGlobal('location', { origin: 'test-origin' })
      vi.stubGlobal('window', {
        postMessage: mockPostMessage,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
        setTimeout: vi.fn((fn: () => void, delay: number) => {
          const timerId = globalThis.setTimeout(fn, delay)
          return timerId as unknown as number
        }),
        clearTimeout: vi.fn((id: number) => {
          globalThis.clearTimeout(id)
        }),
        location: {
          origin: 'test-origin',
        },
      })

      // Reset and re-initialize syncManager if it's not done in a global beforeEach
      // syncManager = new SyncManager();
      // addSyncService(...); // etc.
      // vi.useFakeTimers()
    })

    afterEach(() => {
      // ... existing afterEach cleanup ...
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('should call destroy on all cached adapters', async () => {
      // Create and cache a couple of adapters
      const config1 = { ...mockSyncServiceConfig, id: 'service1' }
      const config2: SyncServiceConfig<
        BrowserExtensionCredentials,
        BrowserExtensionTarget
      > = {
        id: 'service2',
        type: 'browserExtension',
        name: 'Test Browser Extension Sync',
        credentials: {},
        target: { extensionId: 'mock-target-id' },
        enabled: true,
        scope: 'all',
      } // Use a different type to ensure different adapter instances
      addSyncService(config1)
      addSyncService(config2)

      // Trigger adapter creation by calling a method that uses them
      await syncManager.checkAuthStatus(config1.id)

      // For BrowserExtensionSyncAdapter (config2), we need to simulate the PING/PONG and GET_AUTH_STATUS
      const authStatusPromiseConfig2 = syncManager.checkAuthStatus(config2.id)
      // 1. Wait for the PING message to be sent by BrowserExtensionSyncAdapter's init
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'PING',
            source: 'utags-webapp',
            targetExtensionId: 'mock-target-id',
          }),
          '*'
        )
      })
      const pingMessageCall = mockPostMessage.mock.calls.find(
        (call) => call[0].type === 'PING'
      )
      expect(pingMessageCall).toBeDefined()
      const pingMessage = pingMessageCall![0]
      // 2. Simulate the PONG response from the extension
      simulateExtensionResponse(
        pingMessage.id,
        { status: 'PONG' },
        undefined,
        'mock-target-id'
      )

      // 3. Wait for the GET_AUTH_STATUS message to be sent after successful PING/PONG
      await vi.waitFor(() => {
        const lastCall = mockPostMessage.mock.calls.at(-1) as [
          message: any,
          targetOrigin: string,
        ]
        expect(lastCall[0]).toEqual(
          expect.objectContaining({
            type: GET_AUTH_STATUS_MESSAGE_TYPE,
            source: 'utags-webapp',
            targetExtensionId: 'mock-target-id',
          })
        )
        expect(lastCall[1]).toBe('*')
      })
      const getAuthStatusMessageCall = mockPostMessage.mock.calls.find(
        (call) => call[0].type === GET_AUTH_STATUS_MESSAGE_TYPE
      )
      expect(getAuthStatusMessageCall).toBeDefined()
      const getAuthStatusMessage = getAuthStatusMessageCall![0]
      // 4. Simulate the auth status response from the extension
      simulateExtensionResponse(
        getAuthStatusMessage.id,
        'authenticated' as AuthStatus,
        undefined,
        'mock-target-id'
      ) // Or any other valid AuthStatus

      await authStatusPromiseConfig2 // Now the init and checkAuthStatus for browser adapter should complete

      // Clear postMessage mock calls related to init to focus on destroy calls later if needed
      mockPostMessage.mockClear()

      const adapter1 = await getCreatedAdapterInstance(syncManager, config1.id)
      const adapter2 = (await getCreatedAdapterInstance(
        syncManager,
        config2.id
      )) as BrowserExtensionSyncAdapter

      expect(adapter1).toBeDefined()
      expect(adapter2).toBeDefined()
      // Ensure adapter2 is indeed a BrowserExtensionSyncAdapter if needed for type safety
      expect(adapter2).toBeInstanceOf(BrowserExtensionSyncAdapter)

      const destroy1Spy = vi.spyOn(adapter1!, 'destroy')
      const destroy2Spy = vi.spyOn(adapter2, 'destroy')

      syncManager.destroy()

      expect(destroy1Spy).toHaveBeenCalled()
      expect(destroy2Spy).toHaveBeenCalled()
      // @ts-expect-error - Accessing private member for testing
      expect(syncManager.adapters.size).toBe(0)

      // Check if window.removeEventListener was called by BrowserExtensionSyncAdapter's destroy
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
    })

    it('should unsubscribe from syncConfigStore on destroy', () => {
      const subscribeSpy = vi.spyOn(syncConfigStore, 'subscribe')
      let unsubscribeSpy

      // Re-initialize SyncManager to use the mocked subscribe
      // Important: ensure syncManager is declared with let if it's reassigned
      const syncManager = new SyncManager() // Create a new instance for this test

      // @ts-expect-error - Accessing private member for testing
      if (syncManager.unsubscriber) {
        unsubscribeSpy = vi
          // @ts-expect-error - Accessing private member for testing
          .spyOn(syncManager, 'unsubscriber')
      }

      const settingsChangedHandler = vi.fn()
      syncManager.on('settingsChanged', settingsChangedHandler)

      // Ensure subscribe was called during SyncManager initialization
      expect(subscribeSpy).toHaveBeenCalled()
      expect(unsubscribeSpy).toBeDefined()

      // Make a change to syncConfigStore to ensure the handler is working
      syncConfigStore.update((s) => ({
        ...s,
        activeSyncServiceId: 'new-id-before-destroy',
      }))

      // The handler should be called once due to the update
      // Note: Depending on the exact timing and initial settings, this might be called
      // during construction as well if settings change immediately.
      // Adjust the expected count if necessary based on SyncManager's constructor logic.
      expect(settingsChangedHandler).toHaveBeenCalledTimes(1)

      // Call destroy, which should trigger the unsubscriber
      syncManager.destroy()

      // Check if the mockUnsubscriber was called
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1)

      // Make another change to syncConfigStore
      syncConfigStore.update((s) => ({
        ...s,
        activeSyncServiceId: 'new-id-after-destroy',
      }))

      // The handler should NOT have been called again because of unsubscription
      expect(settingsChangedHandler).toHaveBeenCalledTimes(1)

      // Restore the original subscribe method
      subscribeSpy.mockRestore()
      unsubscribeSpy?.mockRestore()
    })

    it('should prevent sync and other operations after being destroyed', async () => {
      const manager = new SyncManager()
      const errorSpy = vi.fn()
      manager.on('error', errorSpy)

      // Destroy the manager
      manager.destroy()

      // Assert: Attempt to call sync after destroy
      const syncResult = await manager.sync()
      expect(syncResult).toBe(false)
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'No sync service ID provided and no active sync service configured.',
        })
      )
      expect(manager.getStatus().type).toBe('error')
      // @ts-expect-error - for testing purposes
      expect(manager.getStatus().error).toBe(
        'No sync service ID provided and no active sync service configured.'
      )

      // Assert: Attempt to call checkAuthStatus after destroy
      const authStatus = await manager.checkAuthStatus()
      // Depending on implementation, it might return 'unknown' or 'error'
      // 'unknown' is more likely if activeAdapter is simply set to undefined
      expect(['unknown', 'error']).toContain(authStatus)
      // If it emits an error for checkAuthStatus, we can check that too
      // For now, we assume it might log a warning or return 'unknown' silently
      // if activeAdapter is null, as per current SyncManager.checkAuthStatus logic.

      // Ensure no further errors are emitted if not expected
      // errorSpy.mockClear(); // Clear if you want to check for specific subsequent errors
    })

    it('should not re-initialize adapters from syncConfigStore updates after being destroyed', async () => {
      const manager = new SyncManager()

      // Simulate a settings update to initialize an adapter
      const initialSyncServiceConfig: SyncServiceConfig = {
        id: 'initial-service',
        name: 'Initial Test Service',
        type: 'customApi',
        credentials: { apiKey: 'initial-api-key' },
        target: {
          url: 'http://localhost:3000/sync',
          path: 'bookmarks.json',
        },
        scope: 'all',
        enabled: true,
      }

      // Spy on getAdapter to ensure it's called initially
      const getAdapterSpy = vi.spyOn(manager as any, 'getAdapter')
      // Trigger the internal initializeActiveAdapter by calling the captured callback again
      // This simulates a settings change that would normally trigger it
      syncConfigStore.set({
        syncServices: [initialSyncServiceConfig],
        activeSyncServiceId: initialSyncServiceConfig.id,
      })

      // Will call getAdapter
      await manager.checkAuthStatus()
      expect(getAdapterSpy).toHaveBeenCalled()

      // Destroy the manager
      manager.destroy()

      // Reset the spy for the next check
      getAdapterSpy.mockClear()

      // Simulate another settings update AFTER destroy
      const newSyncServiceConfig: SyncServiceConfig = {
        id: 'test-service-after-destroy',
        name: 'Test Service After Destroy',
        type: 'customApi',
        credentials: { apiKey: 'test-api-key' },
        target: {
          url: 'http://localhost:3000/sync',
          path: 'bookmarks.json',
        },
        scope: 'all',
        enabled: true,
      }
      // Manually call the callback to simulate a syncConfigStore update if it were still subscribed
      // (which it shouldn't be)
      syncConfigStore.set({
        syncServices: [newSyncServiceConfig],
        activeSyncServiceId: newSyncServiceConfig.id,
      })

      // Assert that getAdapter was NOT called again, and activeAdapter is undefined
      expect(getAdapterSpy).not.toHaveBeenCalled()

      vi.restoreAllMocks() // Cleans up spies and mocks
    })

    it("should continue destroying other adapters if one adapter's destroy method throws an error", async () => {
      // Arrange
      const erroringAdapterConfig: SyncServiceConfig = {
        id: 'erroring-adapter',
        type: 'customApi',
        name: 'Erroring Adapter',
        enabled: true,
        scope: 'all',
        credentials: { apiKey: 'error-key' },
        target: {
          url: 'http://localhost:3005/sync',
          path: 'erroring.json',
        },
      }
      const workingAdapterConfig: SyncServiceConfig = {
        id: 'working-adapter',
        type: 'customApi',
        name: 'Working Adapter',
        enabled: true,
        scope: 'all',
        credentials: { apiKey: 'working-key' },
        target: { url: 'http://localhost:3006/sync', path: 'working.json' },
      }

      addSyncService(erroringAdapterConfig)
      addSyncService(workingAdapterConfig)

      syncConfigStore.set({
        syncServices: [
          mockSyncServiceConfig,
          erroringAdapterConfig,
          workingAdapterConfig,
        ],
        activeSyncServiceId: mockSyncServiceConfig.id, // Active adapter is the first one
      })

      const manager = new SyncManager()
      // @ts-expect-error - for testing purposes
      const activeAdapter = await manager.getAdapter(mockSyncServiceConfig)
      const activeAdapterDestroySpy = vi.spyOn(activeAdapter, 'destroy')

      // Get the erroring adapter instance and mock its destroy to throw an error
      // @ts-expect-error - for testing purposes
      const erroringAdapterInstance = await manager.getAdapter(
        erroringAdapterConfig
      )
      const erroringAdapterDestroySpy = vi
        .spyOn(erroringAdapterInstance, 'destroy')
        // @ts-expect-error - we know this is a function
        .mockImplementation(() => {
          throw new Error('Simulated destroy error')
        })

      // Get the working adapter instance and spy on its destroy method
      const workingAdapterInstance =
        // @ts-expect-error - for testing purposes
        await manager.getAdapter(workingAdapterConfig)
      const workingAdapterDestroySpy = vi.spyOn(
        workingAdapterInstance,
        'destroy'
      )

      // Mock console.error to check if the error is logged
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      // Act: Call synchronize for the other services to get them cached.
      // Mock bookmarkStorage to avoid side effects
      vi.spyOn(bookmarkStorage, 'getBookmarksData').mockResolvedValue({})
      // Mock methods for erroring adapter
      vi.spyOn(erroringAdapterInstance, 'getRemoteMetadata').mockResolvedValue(
        undefined
      )
      vi.spyOn(erroringAdapterInstance, 'download').mockResolvedValue({
        data: undefined,
        remoteMeta: undefined,
      })
      vi.spyOn(erroringAdapterInstance, 'upload').mockResolvedValue({
        version: 'v1',
        timestamp: Date.now(),
      })
      // Mock methods for working adapter
      vi.spyOn(workingAdapterInstance, 'getRemoteMetadata').mockResolvedValue(
        undefined
      )
      vi.spyOn(workingAdapterInstance, 'download').mockResolvedValue({
        data: undefined,
        remoteMeta: undefined,
      })
      vi.spyOn(workingAdapterInstance, 'upload').mockResolvedValue({
        version: 'v1',
        timestamp: Date.now(),
      })

      await manager.synchronize(erroringAdapterConfig.id)
      await manager.synchronize(workingAdapterConfig.id)

      // Now destroy the manager
      expect(() => {
        manager.destroy()
      }).not.toThrow() // Destroy itself should not throw

      // Assert
      expect(activeAdapterDestroySpy).toHaveBeenCalledTimes(1) // Active adapter's destroy is called
      expect(erroringAdapterDestroySpy).toHaveBeenCalledTimes(1) // Erroring adapter's destroy is called
      expect(workingAdapterDestroySpy).toHaveBeenCalledTimes(1) // Working adapter's destroy should still be called

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error destroying cached adapter (ID: ${erroringAdapterConfig.id}):`,
        expect.any(Error)
      )
      expect(consoleErrorSpy.mock.calls[0][1].message).toBe(
        'Simulated destroy error'
      )

      // Verify manager state after destroy
      // @ts-expect-error - accessing private member for test
      expect(manager.adapters.size).toBe(0)

      // Cleanup
      consoleErrorSpy.mockRestore()
      vi.restoreAllMocks()
    })
  })

  it('should handle errors during different sync stages and emit correct events', async () => {
    const mockAdapterConfig: SyncServiceConfig = {
      id: 'error-test-adapter',
      name: 'Error Test Adapter',
      type: 'customApi', // Type can be anything as MockSyncAdapter handles it
      enabled: true,
      scope: 'all',
      credentials: { apiKey: 'test-api-key' }, // Dummy credentials
      target: { url: 'http://localhost:3000/sync' }, // Dummy target
    }
    const mockAdapter = new MockSyncAdapter(mockAdapterConfig)
    const getAdapterSpy = vi
      .spyOn(syncManager as any, 'getAdapter')
      .mockReturnValue(mockAdapter)

    syncConfigStore.set({
      ...get(syncConfigStore),
      activeSyncServiceId: 'error-test-adapter',
      syncServices: [mockAdapter.getConfig()],
    })

    const errorSpy = vi.fn()
    const syncEndSpy = vi.fn()
    const statusChangeSpy = vi.fn()

    syncManager.on('error', errorSpy)
    syncManager.on('syncEnd', syncEndSpy)
    syncManager.on('statusChange', statusChangeSpy)

    // Test error during getRemoteMetadata
    const getRemoteMetadataError = new Error('GetRemoteMetadata failed')
    vi.spyOn(mockAdapter, 'getRemoteMetadata').mockRejectedValueOnce(
      getRemoteMetadataError
    )

    let syncResult = await syncManager.sync()
    expect(syncResult).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith({
      message: `Failed to fetch remote data for Error Test Adapter: ${getRemoteMetadataError.message}`,
      serviceId: 'error-test-adapter',
      error: getRemoteMetadataError,
    })
    expect(syncEndSpy).toHaveBeenCalledWith({
      serviceId: 'error-test-adapter',
      status: 'error',
      error: `Failed to fetch remote data for Error Test Adapter: ${getRemoteMetadataError.message}`,
    })
    expect(statusChangeSpy).toHaveBeenCalledWith({
      type: 'error',
      error: `Failed to fetch remote data for Error Test Adapter: ${getRemoteMetadataError.message}`,
      lastAttemptTime: expect.any(Number),
    })
    expect(syncManager.getStatus().type).toBe('error')

    // Reset spies and mock for next test case
    errorSpy.mockClear()
    syncEndSpy.mockClear()
    statusChangeSpy.mockClear()
    vi.spyOn(mockAdapter, 'getRemoteMetadata').mockResolvedValueOnce(null) // Make getRemoteMetadata succeed for next tests

    // Test error during download
    const downloadError = new Error('Download failed')
    vi.spyOn(mockAdapter, 'download').mockRejectedValueOnce(downloadError)

    syncResult = await syncManager.sync()
    expect(syncResult).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith({
      message: `Failed to fetch remote data for Error Test Adapter: ${downloadError.message}`,
      serviceId: 'error-test-adapter',
      error: downloadError,
    })
    expect(syncEndSpy).toHaveBeenCalledWith({
      serviceId: 'error-test-adapter',
      status: 'error',
      error: `Failed to fetch remote data for Error Test Adapter: ${downloadError.message}`,
    })
    expect(statusChangeSpy).toHaveBeenCalledWith({
      type: 'error',
      error: `Failed to fetch remote data for Error Test Adapter: ${downloadError.message}`,
      lastAttemptTime: expect.any(Number),
    })
    expect(syncManager.getStatus().type).toBe('error')

    // Reset spies and mock for next test case
    errorSpy.mockClear()
    syncEndSpy.mockClear()
    statusChangeSpy.mockClear()
    vi.spyOn(mockAdapter, 'download').mockResolvedValueOnce({
      data: convertToDownloadData({}),
      remoteMeta: { etag: 'etag1', lastModified: 'some-date' },
    })

    // Test error during upload
    const uploadError = new Error('Upload failed')
    vi.spyOn(mockAdapter, 'upload').mockRejectedValueOnce(uploadError)
    // Mock bookmarkStorage to return some data to trigger upload
    vi.spyOn(bookmarkStorage, 'getBookmarksData').mockResolvedValueOnce({
      'http://example.com': {
        meta: {
          url: 'http://example.com',
          title: 'Test',
          created: 0,
          updated: 0,
        },
        tags: ['tag1'],
      },
    })

    syncResult = await syncManager.sync()
    expect(syncResult).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith({
      message: `Failed to upload data for Error Test Adapter: ${uploadError.message}`,
      serviceId: 'error-test-adapter',
      error: uploadError,
    })
    expect(syncEndSpy).toHaveBeenCalledWith({
      serviceId: 'error-test-adapter',
      status: 'error',
      error: `Failed to upload data for Error Test Adapter: ${uploadError.message}`,
    })
    expect(statusChangeSpy).toHaveBeenCalledWith({
      type: 'error',
      error: `Failed to upload data for Error Test Adapter: ${uploadError.message}`,
      lastAttemptTime: expect.any(Number),
    })
    expect(syncManager.getStatus().type).toBe('error')

    // Test error during merge (e.g., bookmarkStorage fails)
    errorSpy.mockClear()
    syncEndSpy.mockClear()
    statusChangeSpy.mockClear()
    vi.spyOn(mockAdapter, 'upload').mockResolvedValueOnce({
      etag: 'etag2',
      lastModified: 'new-date',
    }) // Make upload succeed for next test

    const mergeError = new Error('Merge failed - storage error')
    vi.spyOn(bookmarkStorage, 'getBookmarksData').mockRejectedValueOnce(
      mergeError
    )

    syncResult = await syncManager.sync()
    expect(syncResult).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith({
      message: `Bookmark merging failed for Error Test Adapter: ${mergeError.message}`,
      serviceId: 'error-test-adapter',
      error: mergeError,
    })
    expect(syncEndSpy).toHaveBeenCalledWith({
      serviceId: 'error-test-adapter',
      status: 'error',
      error: `Bookmark merging failed for Error Test Adapter: ${mergeError.message}`,
    })
    expect(statusChangeSpy).toHaveBeenCalledWith({
      type: 'error',
      error: `Bookmark merging failed for Error Test Adapter: ${mergeError.message}`,
      lastAttemptTime: expect.any(Number),
    })
    expect(syncManager.getStatus().type).toBe('error')

    // Cleanup
    syncManager.off('error', errorSpy)
    syncManager.off('syncEnd', syncEndSpy)
    syncManager.off('statusChange', statusChangeSpy)
    getAdapterSpy.mockRestore()
    vi.restoreAllMocks() // Restore all mocks
  })

  it('should handle concurrent sync operations correctly', async () => {
    const mockAdapter = new MockSyncAdapter({
      id: 'concurrent-test-adapter',
      name: 'Concurrent Test Adapter',
      type: 'customApi',
      enabled: true,
      scope: 'all',
      credentials: { apiKey: 'test-api-key' },
      target: { url: 'http://localhost:3000/sync' },
    })

    vi.spyOn(syncManager as any, 'getAdapter').mockReturnValue(mockAdapter)

    syncConfigStore.set({
      ...get(syncConfigStore),
      activeSyncServiceId: 'concurrent-test-adapter',
      syncServices: [mockAdapter.getConfig()],
    })

    // Mock adapter methods to simulate slow responses
    const getMetadataDelay = 500
    const downloadDelay = 1000
    vi.spyOn(mockAdapter, 'getRemoteMetadata').mockImplementation(
      async () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({ etag: 'etag1', lastModified: 'date1' })
          }, getMetadataDelay)
        )
    )
    vi.spyOn(mockAdapter, 'download').mockImplementation(
      async () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              data: convertToDownloadData({}),
              remoteMeta: { etag: 'etag1', lastModified: 'date1' },
            })
          }, downloadDelay)
        )
    )

    // Start multiple sync operations concurrently
    const syncPromises = [
      syncManager.sync(),
      syncManager.sync(),
      syncManager.sync(),
    ]

    const results = await Promise.all(syncPromises)

    // Only the first sync should succeed, others should be rejected
    expect(results[0]).toBe(true)
    expect(results[1]).toBe(false)
    expect(results[2]).toBe(false)

    // Verify adapter methods were only called once
    expect(mockAdapter.getRemoteMetadata).toHaveBeenCalledTimes(1)
    expect(mockAdapter.download).toHaveBeenCalledTimes(1)
  })

  it('should handle empty or unchanged data sync correctly', async () => {
    const mockAdapter = new MockSyncAdapter({
      id: 'empty-data-adapter',
      name: 'Empty Data Adapter',
      type: 'customApi',
      enabled: true,
      scope: 'all',
      credentials: { apiKey: 'test-api-key' },
      target: { url: 'http://localhost:3000/sync' },
    })

    vi.spyOn(syncManager as any, 'getAdapter').mockReturnValue(mockAdapter)

    syncConfigStore.set({
      ...get(syncConfigStore),
      activeSyncServiceId: 'empty-data-adapter',
      syncServices: [mockAdapter.getConfig()],
    })

    // Mock empty remote data
    vi.spyOn(mockAdapter, 'getRemoteMetadata').mockResolvedValue(undefined)
    vi.spyOn(mockAdapter, 'download').mockResolvedValue({
      data: convertToDownloadData({}),
      remoteMeta: undefined,
    })

    // Mock empty local data
    vi.spyOn(bookmarkStorage, 'getBookmarksData').mockResolvedValue({})

    const syncEndSpy = vi.fn()
    syncManager.on('syncEnd', syncEndSpy)

    const result = await syncManager.sync()

    expect(result).toBe(true)
    expect(syncEndSpy).toHaveBeenCalledWith({
      serviceId: 'empty-data-adapter',
      status: 'success',
      error: undefined,
    })
    expect(mockAdapter.upload).not.toHaveBeenCalled() // No upload needed for empty/unchanged data
  })

  describe('Error Handling with bookmarkStorage', () => {
    let mockAdapter: MockSyncAdapter
    const serviceConfig: SyncServiceConfig = {
      id: 'storage-error-adapter',
      name: 'Storage Error Adapter',
      type: 'customApi', // This will be a MockSyncAdapter
      enabled: true,
      scope: 'all',
      credentials: { apiKey: 'test-api-key' },
      target: { url: 'http://localhost:3000/sync' },
    }

    beforeEach(() => {
      syncManager = new SyncManager() // Re-initialize to pick up settings

      // Setup MockSyncAdapter
      mockAdapter = new MockSyncAdapter(serviceConfig)
      vi.spyOn(syncManager as any, 'getAdapter').mockReturnValue(mockAdapter)

      // Initialize settings and SyncManager for these tests
      syncConfigStore.set({
        syncServices: [serviceConfig],
        activeSyncServiceId: serviceConfig.id,
      })

      // Default mocks for adapter methods (can be overridden in specific tests)
      vi.spyOn(mockAdapter, 'getRemoteMetadata').mockResolvedValue({
        etag: 'remote-etag',
        lastModified: 'remote-last-modified',
      })
      vi.spyOn(mockAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData({
          'http://remote.com': {
            meta: { title: 'Remote', created: now, updated: now },
            tags: [],
          },
        }),
        remoteMeta: {
          etag: 'remote-etag',
          lastModified: 'remote-last-modified',
        },
      })
      vi.spyOn(mockAdapter, 'upload').mockResolvedValue({
        etag: 'new-etag',
        lastModified: 'new-last-modified',
      })
    })

    afterEach(() => {
      syncManager.destroy()
      vi.restoreAllMocks()
    })

    it('should handle error when getBookmarksData fails', async () => {
      const storageError = new Error('Failed to read from bookmarkStorage')
      vi.spyOn(bookmarkStorage, 'getBookmarksData').mockRejectedValueOnce(
        storageError
      )

      const errorSpy = vi.fn()
      const syncEndSpy = vi.fn()
      syncManager.on('error', errorSpy)
      syncManager.on('syncEnd', syncEndSpy)

      const result = await syncManager.sync()

      expect(result).toBe(false)
      expect(errorSpy).toHaveBeenCalledWith({
        message: `Bookmark merging failed for Storage Error Adapter: ${storageError.message}`,
        serviceId: serviceConfig.id,
        error: storageError,
      })
      expect(syncEndSpy).toHaveBeenCalledWith({
        serviceId: serviceConfig.id,
        status: 'error',
        error: `Bookmark merging failed for Storage Error Adapter: ${storageError.message}`,
      })
      expect(syncManager.getStatus().type).toBe('error')
    })

    it('should handle error when persistBookmarksStore fails during merge', async () => {
      // Simulate local data existing
      vi.spyOn(bookmarkStorage, 'getBookmarksData').mockResolvedValueOnce({
        'http://local.com': {
          meta: { title: 'Local', created: 0, updated: 0 },
          tags: [],
        },
      })

      const storageError = new Error('Failed to write to bookmarkStorage')
      vi.spyOn(bookmarkStorage, 'persistBookmarksStore').mockRejectedValueOnce(
        storageError
      )

      const errorSpy = vi.fn()
      const syncEndSpy = vi.fn()
      syncManager.on('error', errorSpy)
      syncManager.on('syncEnd', syncEndSpy)

      const result = await syncManager.sync()

      expect(result).toBe(false)
      // The error message might vary slightly depending on where persistBookmarksStore is called in the merge process
      // Assuming it's part of the broader 'Bookmark merging failed' error
      expect(errorSpy).toHaveBeenCalledWith({
        message: expect.stringContaining(
          `Bookmark merging failed for Storage Error Adapter: ${storageError.message}`
        ),
        serviceId: serviceConfig.id,
        error: storageError,
      })
      expect(syncEndSpy).toHaveBeenCalledWith({
        serviceId: serviceConfig.id,
        status: 'error',
        error: expect.stringContaining(
          `Bookmark merging failed for Storage Error Adapter: ${storageError.message}`
        ),
      })
      expect(syncManager.getStatus().type).toBe('error')
    })
  })

  describe('Merge Strategy Handling', () => {
    let mockAdapter: MockSyncAdapter

    const baseServiceConfig: SyncServiceConfig = {
      id: 'base-adapter',
      name: 'Base Adapter',
      type: 'customApi', // This will be a MockSyncAdapter
      enabled: true,
      scope: 'all',
      credentials: { apiKey: 'test-api-key' },
      target: { url: 'http://localhost:3000/sync' },
      // mergeStrategy is intentionally omitted
    }
    const serviceConfigWithoutStrategy: SyncServiceConfig = {
      id: 'no-strategy-adapter',
      name: 'No Strategy Adapter',
      type: 'customApi', // This will be a MockSyncAdapter
      enabled: true,
      scope: 'all',
      credentials: { apiKey: 'test-api-key' },
      target: { url: 'http://localhost:3000/sync' },
      // mergeStrategy is intentionally omitted
    }

    const defaultMergeStrategyFromManager = {
      // This should match the defaultMergeStrategy in SyncManager.ts
      meta: 'merge',
      tags: 'union',
      defaultDate: DEFAULT_DATE,
    }

    beforeEach(async () => {
      localStorageMock.clear()
      await bookmarkStorage.overwriteBookmarks({})
    })

    afterEach(() => {
      syncManager.destroy()
      vi.restoreAllMocks()
    })

    it('should use defaultMergeStrategy when SyncServiceConfig does not provide one', async () => {
      syncManager = new SyncManager() // Re-initialize

      mockAdapter = new MockSyncAdapter(serviceConfigWithoutStrategy)
      vi.spyOn(syncManager as any, 'getAdapter').mockReturnValue(mockAdapter)

      // Default mocks for adapter methods
      vi.spyOn(mockAdapter, 'getRemoteMetadata').mockResolvedValue({
        etag: 'remote-etag',
        lastModified: 'remote-last-modified',
      })
      vi.spyOn(mockAdapter, 'upload').mockResolvedValue({
        version: 'new-version',
        timestamp: now,
      })
      vi.spyOn(mockAdapter, 'getAuthStatus').mockResolvedValue('authenticated')

      syncConfigStore.set({
        syncServices: [serviceConfigWithoutStrategy],
        activeSyncServiceId: serviceConfigWithoutStrategy.id,
      })

      // Arrange: Define local and remote data that would be merged differently by different strategies
      const localData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['local', 'common'],
          meta: {
            created: now - 2000,
            updated: now - 1000,
            title: 'Local Item 1',
          },
        },
        'http://example.com/item2': {
          tags: ['local-only'],
          meta: {
            created: now - 3000,
            updated: now - 2500,
            title: 'Local Item 2',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(localData)

      const remoteData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['remote', 'common'],
          meta: {
            created: now - 1500, // Newer creation than local
            updated: now - 500, // Newer update than local
            title: 'Remote Item 1 Title Wins by default meta:merge',
          },
        },
        'http://example.com/item3': {
          tags: ['remote-only'],
          meta: {
            created: now - 4000,
            updated: now - 3500,
            title: 'Remote Item 3',
          },
        },
      }

      vi.spyOn(mockAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta: {
          etag: 'remote-etag',
          lastModified: 'remote-last-modified',
        },
      })

      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks') // Spy on the actual mergeBookmarks function

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)
      expect(mergeBookmarksSpy).toHaveBeenCalledTimes(1)
      // Verify that mergeBookmarks was called with the SyncManager's default strategy
      expect(mergeBookmarksSpy).toHaveBeenCalledWith(
        localData,
        remoteData,
        defaultMergeStrategyFromManager, // Check if this matches SyncManager's internal default
        expect.objectContaining({
          currentSyncTime: expect.any(Number),
          // lastSyncTime will be 0 if not set in serviceConfig
        })
      )

      // Further assertions on the merged data can be added if needed,
      // to ensure the default strategy was indeed applied correctly.
      const finalData = await bookmarkStorage.getBookmarksData()
      expect(finalData['http://example.com/item1']?.meta?.title).toBe(
        'Remote Item 1 Title Wins by default meta:merge' // Assuming 'merge' picks newer
      )
      expect(finalData['http://example.com/item1']?.tags).toEqual(
        expect.arrayContaining(['local', 'remote', 'common']) // Assuming 'union' for tags
      )
      expect(finalData['http://example.com/item2']).toBeDefined()
      expect(finalData['http://example.com/item3']).toBeDefined()

      mergeBookmarksSpy.mockRestore() // Restore the spy
    })

    it('should fallback to default merge strategy for unspecified parts when custom strategy is partial', async () => {
      const partialCustomStrategy: Partial<
        typeof defaultMergeStrategyFromManager
      > = {
        meta: 'remote',
      }

      const serviceConfigWithPartialStrategy: SyncServiceConfig = {
        ...baseServiceConfig,
        id: 'partialStrategyService',
        mergeStrategy: partialCustomStrategy as any, // Cast to any to allow partial definition for testing
      }

      syncManager = new SyncManager() // Re-initialize

      mockAdapter = new MockSyncAdapter(serviceConfigWithPartialStrategy)
      vi.spyOn(syncManager as any, 'getAdapter').mockReturnValue(mockAdapter)

      // Default mocks for adapter methods
      vi.spyOn(mockAdapter, 'getRemoteMetadata').mockResolvedValue({
        etag: 'remote-etag',
        lastModified: 'remote-last-modified',
      })
      vi.spyOn(mockAdapter, 'upload').mockResolvedValue({
        version: 'new-version',
        timestamp: now,
      })
      vi.spyOn(mockAdapter, 'getAuthStatus').mockResolvedValue('authenticated')

      syncConfigStore.set({
        syncServices: [serviceConfigWithPartialStrategy],
        activeSyncServiceId: serviceConfigWithPartialStrategy.id,
      })

      // Arrange: Define local and remote data that would be merged differently by different strategies
      const localData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['local', 'common'],
          meta: {
            created: now - 2000,
            updated: now - 1000,
            title: 'Local Item 1',
            localField: 'local',
          },
        },
        'http://example.com/item2': {
          tags: ['local-only'],
          meta: {
            created: now - 3000,
            updated: now - 2500,
            title: 'Local Item 2',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(localData)

      const remoteData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['remote', 'common'],
          meta: {
            created: now - 1500, // Newer creation than local
            updated: now - 500, // Newer update than local
            title: 'Remote Item 1 Title Wins by default meta:merge',
            remoteField: 'remote',
          },
        },
        'http://example.com/item3': {
          tags: ['remote-only'],
          meta: {
            created: now - 4000,
            updated: now - 3500,
            title: 'Remote Item 3',
          },
        },
      }

      vi.spyOn(mockAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta: {
          etag: 'remote-etag',
          lastModified: 'remote-last-modified',
        },
      })

      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks') // Spy on the actual mergeBookmarks function

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)
      expect(mergeBookmarksSpy).toHaveBeenCalledTimes(1)
      // Verify that mergeBookmarks was called with the SyncManager's default strategy
      expect(mergeBookmarksSpy).toHaveBeenCalledWith(
        localData,
        remoteData,
        {
          ...defaultMergeStrategyFromManager,
          meta: 'remote',
        },
        expect.objectContaining({
          currentSyncTime: expect.any(Number),
          // lastSyncTime will be 0 if not set in serviceConfig
        })
      )

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Further assertions on the merged data can be added if needed,
      // to ensure the default strategy was indeed applied correctly.
      const finalData = await bookmarkStorage.getBookmarksData()
      expect(finalData['http://example.com/item1']?.meta?.title).toBe(
        'Remote Item 1 Title Wins by default meta:merge' // Assuming 'merge' picks newer
      )
      expect(finalData['http://example.com/item1']?.tags).toEqual(
        expect.arrayContaining(['local', 'remote', 'common']) // Assuming 'union' for tags
      )
      expect(finalData['http://example.com/item1']?.meta).toEqual({
        ...remoteData['http://example.com/item1']?.meta,
        created: Math.min(
          localData['http://example.com/item1']?.meta.created,
          remoteData['http://example.com/item1']?.meta.created
        ),
        updated3: currentSyncTime,
      })
      expect(finalData['http://example.com/item2']).toBeDefined()
      expect(finalData['http://example.com/item3']).toBeDefined()

      mergeBookmarksSpy.mockRestore() // Restore the spy
    })

    it('should handle invalid merge strategy values gracefully (e.g., fallback to default or log error', async () => {
      const partialCustomStrategy: Partial<
        typeof defaultMergeStrategyFromManager
      > = {
        meta: 'invalid_strategy_value',
        tags: 'invalid_strategy_value',
        // @ts-expect-error - for testing
        defaultDate: 'invalid_strategy_value',
      }

      const serviceConfigWithPartialStrategy: SyncServiceConfig = {
        ...baseServiceConfig,
        id: 'partialStrategyService',
        mergeStrategy: partialCustomStrategy as any, // Cast to any to allow partial definition for testing
      }

      syncManager = new SyncManager() // Re-initialize

      mockAdapter = new MockSyncAdapter(serviceConfigWithPartialStrategy)
      vi.spyOn(syncManager as any, 'getAdapter').mockReturnValue(mockAdapter)

      // Default mocks for adapter methods
      vi.spyOn(mockAdapter, 'getRemoteMetadata').mockResolvedValue({
        etag: 'remote-etag',
        lastModified: 'remote-last-modified',
      })
      vi.spyOn(mockAdapter, 'upload').mockResolvedValue({
        version: 'new-version',
        timestamp: now,
      })
      vi.spyOn(mockAdapter, 'getAuthStatus').mockResolvedValue('authenticated')

      syncConfigStore.set({
        syncServices: [serviceConfigWithPartialStrategy],
        activeSyncServiceId: serviceConfigWithPartialStrategy.id,
      })

      // Arrange: Define local and remote data that would be merged differently by different strategies
      const localData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['local', 'common'],
          meta: {
            // created: 0, // will be normalized to 'defaultDate'
            created: 0, // will be normalized to 'updated'
            updated: now - 1000,
            title: 'Local Item 1',
            localField: 'local',
          },
        },
        'http://example.com/item2': {
          tags: ['local-only'],
          meta: {
            created: now - 3000,
            updated: now - 2500,
            title: 'Local Item 2',
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(localData)

      const remoteData: BookmarksData = {
        'http://example.com/item1': {
          tags: ['remote', 'common'],
          meta: {
            created: now - 1500, // Newer creation than local
            updated: now - 500, // Newer update than local
            title: 'Remote Item 1 Title Wins by default meta:merge',
            remoteField: 'remote',
          },
        },
        'http://example.com/item3': {
          tags: ['remote-only'],
          meta: {
            created: now - 4000,
            updated: now - 3500,
            title: 'Remote Item 3',
          },
        },
      }

      vi.spyOn(mockAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData(remoteData),
        remoteMeta: {
          etag: 'remote-etag',
          lastModified: 'remote-last-modified',
        },
      })

      const mergeBookmarksSpy = vi.spyOn(bookmarkMergeUtils, 'mergeBookmarks') // Spy on the actual mergeBookmarks function

      // Act
      const result = await syncManager.sync()

      // Assert
      expect(result).toBe(true)
      expect(mergeBookmarksSpy).toHaveBeenCalledTimes(1)
      // Do not convert strategy in the current implement. Handle default value in `mergeBookmarks` function.
      // Will fallback to { meta: 'merge', tags: 'union' }
      expect(mergeBookmarksSpy).toHaveBeenCalledWith(
        localData,
        remoteData,
        {
          ...defaultMergeStrategyFromManager,
          meta: 'invalid_strategy_value',
          tags: 'invalid_strategy_value',
          defaultDate: 'invalid_strategy_value',
        },
        expect.objectContaining({
          currentSyncTime: expect.any(Number),
          // lastSyncTime will be 0 if not set in serviceConfig
        })
      )

      const currentSyncTime = mergeBookmarksSpy.mock.calls[0][3].currentSyncTime
      expect(currentSyncTime).toBeGreaterThanOrEqual(now)
      expect(currentSyncTime).toBeLessThanOrEqual(Date.now())

      // Further assertions on the merged data can be added if needed,
      // to ensure the default strategy was indeed applied correctly.
      const finalData = await bookmarkStorage.getBookmarksData()
      expect(finalData['http://example.com/item1']?.meta?.title).toBe(
        'Remote Item 1 Title Wins by default meta:merge' // Assuming 'merge' picks newer
      )
      expect(finalData['http://example.com/item1']?.tags).toEqual(
        expect.arrayContaining(['local', 'remote', 'common']) // Assuming 'union' for tags
      )
      expect(finalData['http://example.com/item1']?.meta).toEqual({
        ...localData['http://example.com/item1']?.meta,
        ...remoteData['http://example.com/item1']?.meta,
        created: Math.min(
          // localData['http://example.com/item1']?.meta.created || DEFAULT_DATE,
          localData['http://example.com/item1']?.meta.updated || DEFAULT_DATE,
          remoteData['http://example.com/item1']?.meta.created || DEFAULT_DATE
        ),
        updated3: currentSyncTime,
      })
      expect(finalData['http://example.com/item2']).toBeDefined()
      expect(finalData['http://example.com/item3']).toBeDefined()

      mergeBookmarksSpy.mockRestore() // Restore the spy
    })
  })

  describe('Synchronize Method with Specific Config ID', () => {
    let syncManager: SyncManager

    const serviceConfig1: SyncServiceConfig = {
      id: 'service-1',
      type: 'customApi',
      name: 'Service 1',
      enabled: true,
      scope: 'all',
      credentials: { apiKey: 'key-1' },
      target: {
        url: 'http://localhost:3001/sync',
        path: 'bookmarks1.json',
      },
    }

    const serviceConfig2Disabled: SyncServiceConfig = {
      id: 'service-2-disabled',
      type: 'customApi',
      name: 'Service 2 Disabled',
      enabled: false, // This service is disabled
      scope: 'all',
      credentials: { apiKey: 'key-2' },
      target: {
        url: 'http://localhost:3002/sync',
        path: 'bookmarks2.json',
      },
    }

    const serviceConfig3ErrorOnInit: SyncServiceConfig = {
      id: 'service-3-error',
      type: 'unknownInvalidType' as any, // Will cause an error during adapter initialization
      name: 'Service 3 Error On Init',
      enabled: true,
      scope: 'all',
      credentials: { apiKey: 'key-3' },
      target: {
        url: 'http://localhost:3003/sync',
        path: 'bookmarks3.json',
      },
    }

    let mockAdapterService1: MockSyncAdapter // Use the existing MockSyncAdapter

    beforeEach(async () => {
      localStorageMock.clear()
      await bookmarkStorage.overwriteBookmarks({})
      syncConfigStore.set({
        syncServices: [
          serviceConfig1,
          serviceConfig2Disabled,
          serviceConfig3ErrorOnInit,
        ],
        activeSyncServiceId: undefined, // No active adapter by default for these tests
      })

      syncManager = new SyncManager()

      // We need to be able to mock the adapter that SyncManager creates internally for serviceConfig1
      // One way is to spy on the constructor or a factory method if SyncManager used one.
      // For simplicity with the current SyncManager structure, we'll rely on getAdapter being called.
      // This setup assumes getAdapter will be called for 'service-1' when synchronize('service-1') is invoked.
      // We will mock the methods of the adapter instance that SyncManager creates for 'service-1'.

      // This is a bit tricky as the adapter is created inside SyncManager. We can't directly pass a mock.
      // A workaround: spy on the CustomApiSyncAdapter constructor or its methods if we know it will be 'service-1'.
      // Or, more robustly, if SyncManager cached adapters, we could retrieve and spy on it after first call.
      // Given the current structure, we'll mock the methods on the actual adapter instance after it's created by SyncManager.
    })

    afterEach(() => {
      syncManager.destroy()
      vi.restoreAllMocks()
    })

    it('should successfully synchronize with a valid and enabled configId', async () => {
      // Arrange: Mock the adapter methods for serviceConfig1
      // This requires getting the adapter instance that SyncManager will use for 'service-1'.
      // We'll assume SyncManager creates a new CustomApiSyncAdapter for serviceConfig1.
      // To mock its methods, we can spy on the prototype before SyncManager instantiates it, or mock globally.

      vi.spyOn(bookmarkStorage, 'getBookmarksData').mockResolvedValue({
        'http://example.com/item': {
          tags: ['local-only'],
          meta: {
            created: now - 3000,
            updated: now - 2500,
            title: 'Local Item',
          },
        },
      })
      const mockDownload = vi.fn().mockResolvedValue({
        data: convertToDownloadData({}),
        remoteMeta: { version: 'remote-v1', timestamp: now },
      })
      const mockUpload = vi
        .fn()
        .mockResolvedValue({ version: 'new-remote-v1', timestamp: now + 1000 })
      const mockGetRemoteMetadata = vi
        .fn()
        .mockResolvedValue({ version: 'remote-v1', timestamp: now })

      // Spy on the methods of the specific adapter type SyncManager will create
      // This is a general spy; it will affect all instances. For more targeted spying, specific instance access is needed.
      vi.spyOn(CustomApiSyncAdapter.prototype, 'download').mockImplementation(
        mockDownload
      )
      vi.spyOn(CustomApiSyncAdapter.prototype, 'upload').mockImplementation(
        mockUpload
      )
      vi.spyOn(
        CustomApiSyncAdapter.prototype,
        'getRemoteMetadata'
      ).mockImplementation(mockGetRemoteMetadata)

      const statusChangeHandler = vi.fn()
      syncManager.on('statusChange', statusChangeHandler)
      const syncEndHandler = vi.fn()
      syncManager.on('syncEnd', syncEndHandler)

      // Act
      const result = await syncManager.synchronize(serviceConfig1.id)

      // Assert
      expect(result).toBe(true)
      expect(mockGetRemoteMetadata).toHaveBeenCalled()
      expect(mockDownload).toHaveBeenCalled()
      expect(mockUpload).toHaveBeenCalled()

      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'checking' })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'downloading' })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'merging' })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'uploading' })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'idle' })
      )

      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: serviceConfig1.id,
        status: 'success',
        error: undefined,
      })
    })

    it('should fail to synchronize if configId corresponds to a disabled service', async () => {
      const statusChangeHandler = vi.fn()
      syncManager.on('statusChange', statusChangeHandler)
      const errorHandler = vi.fn()
      syncManager.on('error', errorHandler)
      const infoHandler = vi.fn()
      syncManager.on('info', infoHandler)

      const result = await syncManager.synchronize(serviceConfig2Disabled.id)

      expect(result).toBe(false)
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'disabled' })
      expect(infoHandler).toHaveBeenCalledWith({
        message: `Sync service '${serviceConfig2Disabled.name}' (ID: ${serviceConfig2Disabled.id}) is not enabled.`,
        serviceId: serviceConfig2Disabled.id,
      })
      expect(errorHandler).not.toHaveBeenCalled() // Should be an info, not an error for disabled
    })

    it('should fail to synchronize if configId does not exist', async () => {
      const nonExistentConfigId = 'non-existent-id'
      const statusChangeHandler = vi.fn()
      syncManager.on('statusChange', statusChangeHandler)
      const errorHandler = vi.fn()
      syncManager.on('error', errorHandler)

      const result = await syncManager.synchronize(nonExistentConfigId)

      expect(result).toBe(false)
      const expectedErrorMessage = `Sync configuration for service ID '${nonExistentConfigId}' not found.`
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'error',
        error: expectedErrorMessage,
      })
      expect(errorHandler).toHaveBeenCalledWith({
        message: expectedErrorMessage,
        serviceId: nonExistentConfigId,
      })
    })

    it('should fail to synchronize if adapter initialization fails for the given configId', async () => {
      const statusChangeHandler = vi.fn()
      syncManager.on('statusChange', statusChangeHandler)
      const errorHandler = vi.fn()
      syncManager.on('error', errorHandler)

      const result = await syncManager.synchronize(serviceConfig3ErrorOnInit.id)

      expect(result).toBe(false)
      const expectedErrorMessage = `Sync adapter for ${serviceConfig3ErrorOnInit.name} (ID: ${serviceConfig3ErrorOnInit.id}) could not be initialized: Unknown sync service type: unknownInvalidType`
      // The status might be set by initializeActiveAdapter if synchronize also calls it, or directly by synchronize's error handling.
      // Based on SyncManager.synchronize, it tries to getAdapter, which throws.
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'error',
        error: expectedErrorMessage,
      })
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            `could not be initialized: Unknown sync service type: unknownInvalidType`
          ),
          serviceId: serviceConfig3ErrorOnInit.id,
        })
      )
    })

    it('should not start sync if another sync is already in progress', async () => {
      // Arrange: Start a sync that will be "in progress"
      // Mock the first synchronize call to hang or take time
      const longRunningSyncPromise = new Promise<boolean>((resolve) => {
        // Mock adapter methods for the first call
        vi.spyOn(
          CustomApiSyncAdapter.prototype,
          'getRemoteMetadata'
        ).mockResolvedValueOnce({ version: 'v1', timestamp: Date.now() })
        vi.spyOn(
          CustomApiSyncAdapter.prototype,
          'download'
        ).mockImplementationOnce(async () => {
          await new Promise((r) => setTimeout(r, 50)) // Simulate delay
          return {
            data: '{}',
            remoteMeta: { version: 'v1', timestamp: Date.now() },
          }
        })
        vi.spyOn(
          CustomApiSyncAdapter.prototype,
          'upload'
        ).mockImplementationOnce(async () => {
          await new Promise((r) => setTimeout(r, 50)) // Simulate delay
          resolve(true) // Eventually resolve the first sync
          return { version: 'v2', timestamp: Date.now() }
        })
      })

      const infoHandler = vi.fn()
      syncManager.on('info', infoHandler)

      // Act: Start the first sync (don't await it fully yet)
      const firstSyncCall = syncManager.synchronize(serviceConfig1.id)

      // Give the first sync a moment to enter a 'checking' or 'downloading' state
      await new Promise((r) => setTimeout(r, 10)) // Small delay

      // Attempt to start another sync while the first is (simulated) in progress
      const secondSyncResult = await syncManager.synchronize(serviceConfig1.id) // Or a different configId

      // Assert
      expect(secondSyncResult).toBe(false)
      expect(infoHandler).toHaveBeenCalledWith({
        message: expect.stringContaining('Synchronization already in progress'),
        serviceId: serviceConfig1.id,
      })

      // Allow the first sync to complete
      await firstSyncCall
    })
  })

  describe('CheckAuthStatus Method', () => {
    beforeEach(() => {
      // Reset settings and SyncManager for each test in this suite
      syncConfigStore.set({
        syncServices: [mockSyncServiceConfig],
        activeSyncServiceId: undefined,
      })
      syncManager.destroy() // Clean up any existing manager
      syncManager = new SyncManager()
    })

    it('should return "unknown" when no active adapter is defined', async () => {
      // Ensure no active adapter
      setActiveSyncService(undefined)
      // Re-initialize syncManager to reflect the change if necessary, or ensure its internal state is updated.
      // For this test, direct re-creation or ensuring subscription has fired is key.
      syncManager.destroy()
      syncManager = new SyncManager()

      const consoleWarnSpy = vi.spyOn(console, 'warn')
      const authStatus = await syncManager.checkAuthStatus()

      expect(authStatus).toBe('unknown')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'No service ID provided and no active adapter available to check auth status.'
      )
      consoleWarnSpy.mockRestore()
    })

    it('should return "unknown" if active adapter does not implement getAuthStatus', async () => {
      // Use a mock adapter that doesn't have getAuthStatus
      const mockAdapterWithoutAuthStatus = {
        getConfig: () => mockSyncServiceConfig,
        // getAuthStatus is deliberately missing
      } as unknown as SyncAdapter

      // @ts-expect-error - access private property for testing
      vi.spyOn(syncManager, 'getAdapter').mockReturnValue(
        mockAdapterWithoutAuthStatus as never
      )

      const consoleWarnSpy = vi.spyOn(console, 'warn')
      const authStatus = await syncManager.checkAuthStatus(
        mockSyncServiceConfig.id
      )

      expect(authStatus).toBe('unknown')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Adapter Object for service ${mockSyncServiceConfig.id} does not implement getAuthStatus. Returning 'unknown'.`
      )
      consoleWarnSpy.mockRestore()
      vi.restoreAllMocks() // Restore getActiveAdapter mock
    })

    it('should return "error" and emit an error event if getAuthStatus throws an exception', async () => {
      setActiveSyncService(mockSyncServiceConfig.id)
      syncManager.destroy() // Ensure previous one is gone
      syncManager = new SyncManager() // Re-create to pick up active adapter

      // @ts-expect-error - access private property for testing
      const activeAdapter = await syncManager.getAdapter(mockSyncServiceConfig)
      expect(activeAdapter).toBeInstanceOf(CustomApiSyncAdapter)

      const MOCK_ERROR_MESSAGE = 'Failed to check auth status'
      if (activeAdapter && typeof activeAdapter.getAuthStatus === 'function') {
        // @ts-expect-error - we know this is a function
        vi.spyOn(activeAdapter, 'getAuthStatus').mockRejectedValue(
          new Error(MOCK_ERROR_MESSAGE)
        )
      }

      const errorHandler = vi.fn()
      syncManager.on('error', errorHandler)

      const consoleErrorSpy = vi.spyOn(console, 'error')
      const authStatus = await syncManager.checkAuthStatus()

      expect(authStatus).toBe('error')
      expect(errorHandler).toHaveBeenCalledWith({
        message: `Error checking auth status for ${mockSyncServiceConfig.name}`,
        serviceId: mockSyncServiceConfig.id,
        error: expect.any(Error),
      })
      expect(errorHandler.mock.calls[0][0].error.message).toBe(
        MOCK_ERROR_MESSAGE
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error checking auth status for service ${mockSyncServiceConfig.id} in SyncManager:`,
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
      vi.restoreAllMocks() // Clean up spies
    })
  })

  describe('Event Emission Accuracy', () => {
    let syncManager: SyncManager
    let mockAdapter: MockSyncAdapter
    const serviceConfig: SyncServiceConfig = {
      id: 'event-test-service',
      type: 'customApi', // Using customApi to leverage MockSyncAdapter easily
      name: 'Event Test Service',
      enabled: true,
      scope: 'all',
      credentials: { apiKey: 'event-api-key' },
      target: { url: 'http://localhost:3000/events', path: 'events.json' },
    }

    beforeEach(async () => {
      localStorageMock.clear()
      await bookmarkStorage.overwriteBookmarks({})
      syncConfigStore.set({
        syncServices: [serviceConfig],
        activeSyncServiceId: serviceConfig.id,
        // ... other default settings
      })

      // Instead of creating a new SyncManager which might re-use cached adapters,
      // we ensure a fresh one and then get the adapter it creates.
      syncManager = new SyncManager()

      // Retrieve the adapter instance created by SyncManager
      // @ts-expect-error - access private property for testing
      const activeAdapterInstance = await syncManager.getAdapter(serviceConfig)
      if (activeAdapterInstance instanceof MockSyncAdapter) {
        mockAdapter = activeAdapterInstance
      } else {
        // If not using a global mock for CustomApiSyncAdapter to return MockSyncAdapter,
        // we might need to spy on the actual CustomApiSyncAdapter methods.
        // For simplicity, this example assumes MockSyncAdapter is used or CustomApiSyncAdapter is suitably mocked.
        // This part might need adjustment based on how MockSyncAdapter is integrated.
        // A robust way is to mock the constructor of CustomApiSyncAdapter to return a MockSyncAdapter instance.
        // For now, let's assume getAdapter was modified or CustomApiSyncAdapter was globally mocked for testing.
        // Fallback: create a new MockSyncAdapter and try to replace, though not ideal.
        mockAdapter = new MockSyncAdapter(serviceConfig) // This is a placeholder
        // A better approach would be to ensure SyncManager uses a mock.
        // This might involve vi.mock('./CustomApiSyncAdapter', ...) or similar setup.
        // For this example, we'll proceed assuming mockAdapter can be controlled.
        // A more direct way if SyncManager's getAdapter could be spied/mocked:
        // vi.spyOn(syncManager as any, 'getAdapter').mockReturnValue(new MockSyncAdapter(serviceConfig));
        // Then re-initialize active adapter or re-create syncManager.
        // Given the current structure, we'll spy on the methods of the adapter SyncManager holds.
        const activeAdapterInstance =
          // @ts-expect-error - access private property for testing
          await syncManager.getAdapter(serviceConfig)
        if (activeAdapterInstance) {
          mockAdapter = activeAdapterInstance as MockSyncAdapter // This cast is risky if not truly a MockSyncAdapter
          // Ensure methods are spies if it's not a fresh MockSyncAdapter instance from a factory/mock
          if (!vi.isMockFunction(mockAdapter.download))
            mockAdapter.download = vi.fn()
          if (!vi.isMockFunction(mockAdapter.upload))
            mockAdapter.upload = vi.fn()
          if (!vi.isMockFunction(mockAdapter.getRemoteMetadata))
            mockAdapter.getRemoteMetadata = vi.fn()
        } else {
          throw new Error(
            'Test setup: Active adapter not found or not a MockSyncAdapter.'
          )
        }
      }

      // Default mocks for adapter methods
      vi.spyOn(mockAdapter, 'getRemoteMetadata').mockResolvedValue(undefined)
      vi.spyOn(mockAdapter, 'download').mockResolvedValue({
        data: convertToDownloadData({}),
        remoteMeta: undefined,
      })
      vi.spyOn(mockAdapter, 'upload').mockResolvedValue({
        version: 'v1',
        timestamp: Date.now(),
      })
    })

    afterEach(() => {
      syncManager.destroy()
      vi.restoreAllMocks()
    })

    it('should emit correct events in order for a successful sync', async () => {
      const statusChangeHandler = vi.fn()
      const syncStartHandler = vi.fn()
      const syncEndHandler = vi.fn()
      const errorHandler = vi.fn()
      const infoHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncStart', syncStartHandler)
      syncManager.on('syncEnd', syncEndHandler)
      syncManager.on('error', errorHandler)
      syncManager.on('info', infoHandler)

      await bookmarkStorage.overwriteBookmarks({
        'http://example.com/new': {
          tags: [],
          meta: { created: Date.now(), updated: Date.now(), title: 'New' },
        },
      })

      await syncManager.sync()

      expect(syncStartHandler).toHaveBeenCalledWith({
        serviceId: serviceConfig.id,
      })
      expect(syncStartHandler).toHaveBeenCalledTimes(1)

      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          lastSyncTime: expect.any(Number),
        })
      )
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'idle',
          lastSyncTime: expect.any(Number),
        })
      )

      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: serviceConfig.id,
        status: 'success',
        error: undefined,
      })
      expect(syncEndHandler).toHaveBeenCalledTimes(1)

      expect(errorHandler).not.toHaveBeenCalled()
      expect(infoHandler).not.toHaveBeenCalled() // Assuming no specific info messages for a standard successful sync
    })

    it('should fail validation when lastDataChangeTimestamp > 0 but required data is missing', async () => {
      // Set up a service config with lastDataChangeTimestamp > 0 to trigger validation
      const configWithLastSync: SyncServiceConfig = {
        ...serviceConfig,
        lastDataChangeTimestamp: Date.now() - 1000, // Set to a past timestamp
      }

      syncConfigStore.set({
        syncServices: [configWithLastSync],
        activeSyncServiceId: configWithLastSync.id,
      })

      const mockAdapter = new MockSyncAdapter(configWithLastSync)

      vi.spyOn(syncManager as any, 'getAdapter').mockReturnValue(mockAdapter)

      const statusChangeHandler = vi.fn()
      const syncStartHandler = vi.fn()
      const syncEndHandler = vi.fn()
      const errorHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncStart', syncStartHandler)
      syncManager.on('syncEnd', syncEndHandler)
      syncManager.on('error', errorHandler)

      // Mock adapter to return missing data (null/undefined values)
      vi.mocked(mockAdapter.getRemoteMetadata).mockResolvedValue(null) // Missing initialRemoteSyncMeta
      vi.mocked(mockAdapter.download).mockResolvedValue({
        data: convertToDownloadData({}),
        remoteMeta: undefined,
      })
      vi.mocked(mockAdapter.upload).mockResolvedValue({
        version: 'v1',
        timestamp: Date.now(),
      })

      await syncManager.sync()

      expect(syncStartHandler).toHaveBeenCalledWith({
        serviceId: configWithLastSync.id,
      })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error: expect.stringContaining('Data validation failed'),
          lastAttemptTime: expect.any(Number),
        })
      )

      expect(errorHandler).toHaveBeenCalledWith({
        message: expect.stringContaining('Data validation failed'),
        serviceId: configWithLastSync.id,
        error: expect.any(Error),
      })
      expect(errorHandler).toHaveBeenCalledTimes(1)

      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: configWithLastSync.id,
        status: 'error',
        error: expect.stringContaining('Data validation failed'),
      })
      expect(syncEndHandler).toHaveBeenCalledTimes(1)
    })

    it('should fail validation when lastDataChangeTimestamp > 0 but remoteStoreMeta is missing', async () => {
      // Set up a service config with lastDataChangeTimestamp > 0
      const configWithLastSync: SyncServiceConfig = {
        ...serviceConfig,
        lastDataChangeTimestamp: Date.now() - 1000,
      }

      syncConfigStore.set({
        syncServices: [configWithLastSync],
        activeSyncServiceId: configWithLastSync.id,
      })

      const mockAdapter = new MockSyncAdapter(configWithLastSync)

      vi.spyOn(syncManager as any, 'getAdapter').mockReturnValue(mockAdapter)

      const statusChangeHandler = vi.fn()
      const errorHandler = vi.fn()
      const syncStartHandler = vi.fn()
      const syncEndHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('error', errorHandler)
      syncManager.on('syncStart', syncStartHandler)
      syncManager.on('syncEnd', syncEndHandler)

      // Mock adapter to return valid initial data but missing remoteStoreMeta
      const mockInitialMeta = { version: '1.0', timestamp: Date.now() }
      const mockDownloadMeta = { version: '1.0', timestamp: Date.now() }
      // Create data string without meta field to trigger missing remoteStoreMeta validation
      const mockDataString = JSON.stringify({ data: {} }) // Missing meta field

      // Reset and re-setup mocks to override beforeEach defaults
      mockAdapter.getRemoteMetadata.mockResolvedValue(mockInitialMeta)
      mockAdapter.download.mockResolvedValue({
        data: mockDataString,
        remoteMeta: mockDownloadMeta,
      })
      mockAdapter.upload.mockResolvedValue({
        version: 'v1',
        timestamp: Date.now(),
      })

      console.log('Test setup - mockDataString:', mockDataString)
      console.log('Test setup - parsed data:', JSON.parse(mockDataString))

      // Debug: Check if our mock adapter is being used
      const adapterFromManager = (syncManager as any).adapters.get(
        configWithLastSync.id
      )
      console.log('Adapter from manager:', adapterFromManager)
      console.log('Is it our mock adapter?', adapterFromManager === mockAdapter)
      console.log('Adapter download method:', adapterFromManager?.download)

      await syncManager.sync()

      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error: expect.stringContaining('Missing remoteStoreMeta'),
        })
      )

      expect(errorHandler).toHaveBeenCalledWith({
        message: expect.stringContaining('Missing remoteStoreMeta'),
        serviceId: configWithLastSync.id,
        error: expect.any(Error),
      })
    })

    it('should emit correct events when download fails', async () => {
      const statusChangeHandler = vi.fn()
      const syncStartHandler = vi.fn()
      const syncEndHandler = vi.fn()
      const errorHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncStart', syncStartHandler)
      syncManager.on('syncEnd', syncEndHandler)
      syncManager.on('error', errorHandler)

      const downloadError = new Error('Download failed miserably')
      if (vi.isMockFunction(mockAdapter.download)) {
        mockAdapter.download.mockRejectedValueOnce(downloadError)
      } else {
        vi.spyOn(mockAdapter, 'download').mockRejectedValueOnce(downloadError)
      }

      await syncManager.sync()

      expect(syncStartHandler).toHaveBeenCalledWith({
        serviceId: serviceConfig.id,
      })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      // Downloading is attempted
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      // Then error occurs
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error: expect.stringContaining('Failed to fetch remote data'),
          lastAttemptTime: expect.any(Number),
        })
      )

      expect(errorHandler).toHaveBeenCalledWith({
        message: expect.stringContaining('Failed to fetch remote data'),
        serviceId: serviceConfig.id,
        error: downloadError,
      })
      expect(errorHandler).toHaveBeenCalledTimes(1)

      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: serviceConfig.id,
        status: 'error',
        error: expect.stringContaining('Failed to fetch remote data'),
      })
      expect(syncEndHandler).toHaveBeenCalledTimes(1)
    })

    it('should emit correct events when upload fails', async () => {
      const statusChangeHandler = vi.fn()
      const syncStartHandler = vi.fn()
      const syncEndHandler = vi.fn()
      const errorHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('syncStart', syncStartHandler)
      syncManager.on('syncEnd', syncEndHandler)
      syncManager.on('error', errorHandler)

      const uploadError = new Error('Upload catastrophically failed')
      if (vi.isMockFunction(mockAdapter.upload)) {
        mockAdapter.upload.mockRejectedValueOnce(uploadError)
      } else {
        vi.spyOn(mockAdapter, 'upload').mockRejectedValueOnce(uploadError)
      }

      // Ensure there's something to upload
      await bookmarkStorage.overwriteBookmarks({
        'http://example.com/to-upload': {
          tags: [],
          meta: {
            created: Date.now(),
            updated: Date.now(),
            title: 'To Upload',
          },
        },
      })

      await syncManager.sync()

      expect(syncStartHandler).toHaveBeenCalledWith({
        serviceId: serviceConfig.id,
      })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'checking' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'downloading' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'merging' })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'uploading' })
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error: expect.stringContaining('Failed to upload data'),
          lastAttemptTime: expect.any(Number),
        })
      )

      expect(errorHandler).toHaveBeenCalledWith({
        message: expect.stringContaining('Failed to upload data'),
        serviceId: serviceConfig.id,
        error: uploadError,
      })
      expect(errorHandler).toHaveBeenCalledTimes(1)

      expect(syncEndHandler).toHaveBeenCalledWith({
        serviceId: serviceConfig.id,
        status: 'error',
        error: expect.stringContaining('Failed to upload data'),
      })
    })

    it('should emit info and statusChange to disabled when activating a disabled service', async () => {
      const disabledConfig: SyncServiceConfig = {
        ...serviceConfig,
        id: 'disabled-event-service',
        enabled: false,
      }
      // addSyncService(disabledConfig)
      syncConfigStore.set({
        syncServices: [disabledConfig],
        activeSyncServiceId: disabledConfig.id,
      })

      const statusChangeHandler = vi.fn()
      const infoHandler = vi.fn()

      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('info', infoHandler)

      // setActiveSyncService(disabledConfig.id)

      await syncManager.sync()

      expect(infoHandler).toHaveBeenCalledWith({
        message: expect.stringContaining(
          `Sync service '${disabledConfig.name}' (ID: ${disabledConfig.id}) is not enabled.`
        ),
        serviceId: disabledConfig.id,
      })
      expect(statusChangeHandler).toHaveBeenCalledWith({ type: 'disabled' })
    })

    it('should emit error and statusChange to error when activating a service with invalid config', async () => {
      const invalidConfig: SyncServiceConfig = {
        ...serviceConfig,
        id: 'invalid-event-service',
        type: 'unknownType' as any,
      }
      // addSyncService(invalidConfig)
      syncConfigStore.set({
        syncServices: [invalidConfig],
        activeSyncServiceId: invalidConfig.id,
      })

      const statusChangeHandler = vi.fn()
      const errorHandler = vi.fn()

      // Clear previous listeners from syncManager if it's reused, or use a fresh one.
      // For this test, let's assume syncManager is fresh from beforeEach or listeners are cleared.
      syncManager.on('statusChange', statusChangeHandler)
      syncManager.on('error', errorHandler)

      // setActiveSyncService(invalidConfig.id)

      await syncManager.sync()

      expect(errorHandler).toHaveBeenCalledWith({
        error: expect.any(Error),
        message: expect.stringContaining(
          `Unknown sync service type: ${invalidConfig.type}`
        ),
        serviceId: invalidConfig.id,
      })
      expect(statusChangeHandler).toHaveBeenCalledWith({
        type: 'error',
        error: expect.stringContaining(
          `Unknown sync service type: ${invalidConfig.type}`
        ),
      })
    })
  })
})

// `
// 基于当前的覆盖情况，我认为我们可以从以下几个方面补充测试用例，以进一步增强代码的健壮性：

// 一、 SyncManager.ts 核心逻辑增强覆盖

// 1. _performSyncOperation 方法的 finally 块逻辑验证 :

//    - 场景 : 验证在各种同步成功或失败的路径后（例如，下载成功但合并失败、合并成功但上传失败等）， syncEnd 事件的 status ( success , error , conflict ) 和 error 字段是否被正确设置。
//    - 场景 : 验证在同步操作的不同阶段（如 checking , downloading , merging , uploading ）发生错误并被捕获后，最终的 currentSyncStatus 是否正确地反映了错误状态（如 error 或 conflict ），或者在成功后是否回到了 idle 状态。
// 2. getAdapter 方法的缓存与配置更新处理 :

//    - 场景 : 测试当使用相同的 config.id 多次调用 getAdapter 时，是否确实返回的是缓存的适配器实例，而不是每次都创建新的实例。
//    - 场景 (进阶) : 如果一个服务的配置（非 id ，例如 credentials 或 target.url ）在 SyncManager 运行期间被外部修改（通过 SettingsStore ），当再次需要此适配器时（例如通过 synchronize(configId) ）， SyncManager 是继续使用带有旧配置的缓存实例，还是会基于更新后的配置创建新实例或更新现有实例。目前的实现似乎倾向于不重新初始化，但测试可以明确这一点。
// 二、与 SettingsStore 交互的更多场景

// 1. syncConfigStore 订阅回调对非活动配置变更的响应 :

//    - 场景 : 当 syncConfigStore 更新，但改变的是一个非当前活动服务的配置，或者仅仅是 SyncSettings 中的其他无关属性时， SyncManager 的 initializeActiveAdapter 方法是否会被不必要地触发，或者是否会对当前活动的适配器产生副作用。
// 2. 活动服务配置的动态更新 :

//    - 场景 : 当 syncConfigStore 更新，且当前活动的 SyncServiceConfig 的某些属性（例如， mergeStrategy 或 target URL）发生变化时， SyncManager 是否能够感知到这些变化并应用于后续的同步操作，或者 activeAdapter 内部是否能处理这种配置的动态更新。
// 三、 destroy() 方法的边界条件测试

// 1. 在同步操作过程中调用 destroy() :

//    - 场景 : 当 SyncManager 正处于同步的某个阶段（例如，正在 downloading 数据或 uploading 数据）时，如果此时调用了 destroy() 方法，需要验证：
//      - 正在进行的网络请求是否能被尝试中止（如果适配器支持）。
//      - SyncManager 是否能干净地取消订阅 syncConfigStore 。
//      - 所有适配器（活动的和缓存的）的 destroy 方法是否被调用。
//      - 是否会抛出未处理的异常或导致应用状态不稳定。
//      - currentSyncStatus 的最终状态是什么。
// 2. 多次调用 destroy() :

//    - 场景 : 验证连续多次调用 destroy() 方法是否安全，不会引发错误或意外行为。
// 四、适配器行为的更多模拟 (针对健壮性)

// 1. 适配器方法返回非预期或不完整的数据 :
//    - 场景 : 模拟 getRemoteMetadata() 返回 SyncMetadata 对象，但其内部关键字段（如 version 或 timestamp ）为 null 或 undefined 。
//    - 场景 : 模拟 download() 方法返回的数据对象中， data 为非预期的格式（例如，不是合法的JSON字符串，或者与 remoteMeta 不一致）。
//    - 场景 : 模拟 upload() 方法成功，但返回的 SyncMetadata 不完整。 SyncManager 应能优雅处理这些情况，例如记录错误并可能中止同步。
// 建议的下一步行动：

// 我建议我们可以优先补充以下场景的测试用例：

// 1. _performSyncOperation 方法中 finally 块的逻辑验证 ：这对于确保同步流程结束时的状态和事件通知的正确性至关重要。
// 2. 在同步操作过程中调用 destroy() 方法 ：这是一个重要的边界条件，关系到应用的稳定性和资源清理。
// `
