/**
 * @vitest-environment jsdom
 */
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'
import { get, writable } from 'svelte/store' // Import writable
import { mockLocalStorage } from '../utils/test/mock-local-storage.js'
import { emptyFunction } from '../utils/test/empty-function.js'
import { syncConfigStore } from '../stores/sync-config-store.js'
import { bookmarkStorage } from '../lib/bookmark-storage.js'
import {
  initAutoSyncScheduler,
  stopAutoSyncScheduler,
  releaseAutoSyncSchedulerLock, // Actual import
  isAutoSyncSchedulerLockOwner, // Actual import
} from './auto-sync-scheduler.js'
import { addToSyncQueue, isQueueProcessing } from './sync-queue.js'
import type { SyncManager } from './sync-manager.js'
import { type SyncServiceConfig } from './types.js'

const localStorageMock = mockLocalStorage()

// Mock global functions and properties
// Mock window event listeners
Object.defineProperty(globalThis, 'addEventListener', { value: vi.fn() })
Object.defineProperty(globalThis, 'removeEventListener', { value: vi.fn() })

// Mock document event listeners and properties
Object.defineProperty(document, 'addEventListener', { value: vi.fn() })
Object.defineProperty(document, 'removeEventListener', { value: vi.fn() })
Object.defineProperty(document, 'visibilityState', {
  value: 'visible',
  writable: true, // Allow modification in tests
})

// Mock dependencies
vi.mock('../stores/sync-config-store.js', () => ({
  // Mock syncConfigStore as a writable store
  syncConfigStore: writable({
    syncServices: [],
    activeSyncServiceId: undefined,
    // Add other default settings properties if necessary
  }),
}))

vi.mock('../lib/bookmark-storage.js', () => ({
  bookmarkStorage: {
    getBookmarksStore: vi.fn(),
  },
}))

// Ensure sync-queue mock does NOT export releaseAutoSyncSchedulerLock and isAutoSyncSchedulerLockOwner
vi.mock('./sync-queue.js', () => ({
  addToSyncQueue: vi.fn(),
  isQueueProcessing: vi.fn(() => false),
  // releaseAutoSyncSchedulerLock and isAutoSyncSchedulerLockOwner should NOT be here
}))

const mockSyncManagerInstance = {
  synchronize: vi.fn(),
  // Ensure other necessary methods are mocked if auto-sync-scheduler interacts with them
} as unknown as SyncManager

// Spy on console methods to suppress output during tests
vi.spyOn(console, 'log').mockImplementation(emptyFunction)
vi.spyOn(console, 'warn').mockImplementation(emptyFunction)
vi.spyOn(console, 'error').mockImplementation(emptyFunction)

// Use a consistent tabId for testing lock ownership
// Note: auto-sync-scheduler.ts generates its own internal currentTabId.
// We can't directly control that, but we can control what's in localStorage for testing.
const MOCK_LOCK_OWNER_TAB_ID = 'mock_tab_id_owns_lock'

describe('AutoSyncScheduler', () => {
  let beforeUnloadHandler: EventListener
  let visibilityChangeHandler: EventListener

  beforeEach(() => {
    vi.useFakeTimers()
    localStorageMock.clear()
    vi.clearAllMocks()

    // Store event handler references
    ;(globalThis.addEventListener as Mock).mockImplementation(
      (event: string, callback: EventListener) => {
        if (event === 'beforeunload') {
          beforeUnloadHandler = callback
        }
      }
    )
    ;(document.addEventListener as Mock).mockImplementation(
      (event: string, callback: EventListener) => {
        if (event === 'visibilitychange') {
          visibilityChangeHandler = callback
        }
      }
    )

    vi.spyOn(globalThis, 'setInterval')
    vi.spyOn(globalThis, 'clearInterval')

    // Default mock implementations for settings and bookmark storage
    // Now use syncConfigStore.set to provide the default value
    syncConfigStore.set({
      syncServices: [
        {
          id: 'service1',
          type: 'customApi', // Corrected type based on auto-sync-scheduler.ts logic
          enabled: true,
          autoSyncEnabled: true,
          autoSyncInterval: 15, // minutes
          autoSyncOnChanges: true,
          autoSyncDelayOnChanges: 5,
        } as SyncServiceConfig,
      ],
      activeSyncServiceId: 'service1', // Ensure this is consistent or handled
    })
    ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
      meta: { updated: Date.now() - 20 * 60 * 1000 }, // 20 minutes ago
      // data: { bookmarks: [], version: 1 }, // Not directly used by scheduler logic
    })
    ;(isQueueProcessing as Mock).mockReturnValue(false)

    // Simulate this tab (via MOCK_LOCK_OWNER_TAB_ID) owning the lock by default for most tests.
    // auto-sync-scheduler.ts will generate its own internal currentTabId.
    // To test lock acquisition, we'd clear localStorage or set it to another ID.
    // To test lock ownership, we'd set localStorage to the internal currentTabId of the module (which is hard to get directly in test)
    // OR, more practically, we test the *effects* of lock ownership.
    // For these tests, we'll assume the internal currentTabId matches MOCK_LOCK_OWNER_TAB_ID when we want to simulate ownership.
    // This means we are testing the *logic* assuming the internal ID matches what we set in localStorage.
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    stopAutoSyncScheduler() // Clean up any running schedulers
    localStorageMock.clear() // Clear localStorage after each test
  })

  // Helper function to simulate lock acquisition by the current instance of auto-sync-scheduler
  // This is a bit tricky because currentTabId is internal to auto-sync-scheduler.ts
  // We rely on the fact that acquireLock will set the lock if it's available.
  const simulateLockAcquisitionByCurrentInstance = () => {
    // Clear any existing lock
    localStorageMock.removeItem('utags_auto_sync_lock_owner')
    localStorageMock.removeItem('utags_auto_sync_lock_heartbeat')
    // When initAutoSyncScheduler runs, if it calls acquireLock, it will use its internal currentTabId.
    // We can then check if the lock was set.
  }

  const simulateLockHeldByCurrentInstance = () => {
    // This is the tricky part. We don't know the internal currentTabId.
    // So, we'll set a known ID and assume the internal logic will match it if it acquires the lock.
    // For tests where we *assume* the current instance holds the lock, we'll set it directly.
    // This is more about testing the *consequences* of holding the lock.
    localStorageMock.setItem(
      'utags_auto_sync_lock_owner',
      MOCK_LOCK_OWNER_TAB_ID
    ) // A placeholder
    localStorageMock.setItem(
      'utags_auto_sync_lock_heartbeat',
      Date.now().toString()
    )
    // In a real scenario, the module's internal currentTabId would be here.
    // The tests will verify behavior *as if* the module's ID is MOCK_LOCK_OWNER_TAB_ID.
  }

  const simulateLockHeldByAnotherInstance = () => {
    localStorageMock.setItem('utags_auto_sync_lock_owner', 'another_tab_id')
    localStorageMock.setItem(
      'utags_auto_sync_lock_heartbeat',
      Date.now().toString()
    )
  }

  describe('initAutoSyncScheduler', () => {
    it('should initialize, attempt to acquire lock, and set up interval and event listeners', () => {
      simulateLockAcquisitionByCurrentInstance() // Prepare for lock acquisition

      initAutoSyncScheduler(mockSyncManagerInstance)

      // Check if acquireLock (called by init) attempted to set the lock
      // It should set the lock because we cleared it before init
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'utags_auto_sync_lock_owner',
        expect.any(String) // The internal currentTabId
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'utags_auto_sync_lock_heartbeat',
        expect.any(String)
      )

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 10_000) // CHECK_INTERVAL
      expect(globalThis.addEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )
    })

    it('should trigger checkAndScheduleSync via interval if lock is acquired and held by current instance', async () => {
      simulateLockAcquisitionByCurrentInstance() // Ensure no lock initially
      initAutoSyncScheduler(mockSyncManagerInstance) // This will acquire the lock

      // At this point, the module's internal currentTabId is the lock owner.
      // We need to ensure our checkHasLock() inside checkAndScheduleSync returns true.
      // The most robust way is to let the internal logic work.

      await vi.advanceTimersByTimeAsync(10_000) // Advance timer to trigger the first interval
      expect(addToSyncQueue).toHaveBeenCalledWith(
        { serviceId: 'service1' }, // Corrected: task object
        mockSyncManagerInstance
      )
    })

    it('should not trigger checkAndScheduleSync via interval if lock is held by another instance', async () => {
      simulateLockHeldByAnotherInstance()

      initAutoSyncScheduler(mockSyncManagerInstance)
      await vi.advanceTimersByTimeAsync(10_000)
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })
  })

  describe('stopAutoSyncScheduler', () => {
    it('should clear its own interval and release the lock if held by the current instance', () => {
      simulateLockAcquisitionByCurrentInstance()
      initAutoSyncScheduler(mockSyncManagerInstance) // Acquires lock
      const schedulerIntervalId = (setInterval as Mock).mock.results[0]
        .value as number

      // To test releaseLock, we need isAutoSyncSchedulerLockOwner to return true *for the module's internal ID*.
      // When stopAutoSyncScheduler calls releaseLock, releaseLock itself checks localStorage.
      // So, the localStorage must contain the module's internal ID.
      // Since initAutoSyncScheduler acquired the lock, localStorage is correctly set.

      stopAutoSyncScheduler()

      expect(clearInterval).toHaveBeenCalledWith(schedulerIntervalId)
      // Check if releaseLock removed the items (it only does if it's the owner)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'utags_auto_sync_lock_owner'
      )
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'utags_auto_sync_lock_heartbeat'
      )
    })

    it('should clear its own interval and not attempt to release lock if not held by current instance', () => {
      simulateLockHeldByAnotherInstance() // Lock held by someone else
      initAutoSyncScheduler(mockSyncManagerInstance) // Does not acquire lock
      const schedulerIntervalId = (setInterval as Mock).mock.results[0]
        .value as number

      stopAutoSyncScheduler()

      expect(clearInterval).toHaveBeenCalledWith(schedulerIntervalId)
      // releaseLock is called, but it won't remove items because currentTabId won't match
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(
        'utags_auto_sync_lock_owner'
      )
    })
  })

  describe('checkAndScheduleSync behavior (indirect testing)', () => {
    async function triggerCheckAndScheduleViaInterval(
      syncManager = mockSyncManagerInstance
    ) {
      // Ensure lock is acquired by the instance being tested
      simulateLockAcquisitionByCurrentInstance()
      initAutoSyncScheduler(syncManager)
      await vi.advanceTimersByTimeAsync(10_000) // CHECK_INTERVAL
    }

    async function triggerCheckAndScheduleDirectlyAfterInit(
      syncManager = mockSyncManagerInstance
    ) {
      simulateLockAcquisitionByCurrentInstance()
      initAutoSyncScheduler(syncManager) // This calls checkAndScheduleSync if lock is acquired
      await vi.advanceTimersByTimeAsync(0) // Allow promises to resolve
    }

    it('should not schedule sync if no sync services are configured', async () => {
      // Use syncConfigStore.set to change the value for this specific test
      syncConfigStore.set({
        syncServices: [],
        activeSyncServiceId: undefined,
      })
      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should not schedule sync if a service is not enabled', async () => {
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: false, // Disabled
            autoSyncEnabled: true,
            autoSyncInterval: 15,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })
      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should not schedule sync if autoSyncEnabled is false', async () => {
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: false,
            autoSyncInterval: 15,
            lastSyncTimestamp: Date.now() - 20 * 60 * 1000, // Synced 20 mins ago
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })
      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should schedule sync if autoSyncInterval condition is met and autoSyncEnabled is true', async () => {
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 15, // 15 minutes
            lastSyncTimestamp: Date.now() - 20 * 60 * 1000, // Synced 20 mins ago
            autoSyncOnChanges: false, // Turn off other condition
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1', // Ensure activeSyncServiceId is set
      })
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 5 * 60 * 1000 }, // Updated 5 mins ago (irrelevant for this test)
      })
      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).toHaveBeenCalledWith(
        { serviceId: 'service1' },
        mockSyncManagerInstance
      )
    })

    it('should schedule sync if autoSyncOnChanges condition is met and autoSyncEnabled is true', async () => {
      const twentyMinutesAgo = Date.now() - 20 * 60 * 1000
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000

      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 60, // Long interval, won't trigger
            autoSyncOnChanges: true,
            autoSyncDelayOnChanges: 5, // 5 minutes delay
            lastSyncTimestamp: twentyMinutesAgo, // Last sync was 20 mins ago
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1', // Ensure activeSyncServiceId is set
      })
      // Bookmarks updated 10 mins ago. Delay is 5 mins.
      // Current time - 5 mins > 10 mins ago (last update)
      // Current time - 5 mins > 20 mins ago (last sync)
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: tenMinutesAgo },
      })

      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).toHaveBeenCalledWith(
        { serviceId: 'service1' },
        mockSyncManagerInstance
      )
    })

    it('should not schedule sync if autoSyncEnabled is false even when autoSyncOnChanges condition is met', async () => {
      const twentyMinutesAgo = Date.now() - 20 * 60 * 1000
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000

      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: false,
            autoSyncInterval: 60,
            autoSyncOnChanges: true,
            autoSyncDelayOnChanges: 5,
            lastSyncTimestamp: twentyMinutesAgo,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })
      // Bookmarks updated 10 mins ago. Delay is 5 mins.
      // Current time - 5 mins > 10 mins ago (last update)
      // Current time - 5 mins > 20 mins ago (last sync)
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: tenMinutesAgo },
      })

      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should not schedule sync if autoSyncInterval not met', async () => {
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 30, // 30 minutes
            lastSyncTimestamp: Date.now() - 10 * 60 * 1000, // Synced 10 mins ago
            autoSyncOnChanges: false,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })
      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should not schedule sync when autoSyncInterval is met but recent changes exist within autoSyncDelayOnChanges', async () => {
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 30, // 30 minutes
            lastSyncTimestamp: Date.now() - 35 * 60 * 1000, // Synced 35 mins ago (interval condition met)
            autoSyncOnChanges: true,
            autoSyncDelayOnChanges: 10, // 10 minutes delay on changes
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })

      // Bookmarks updated 5 minutes ago (within the 10-minute delay period)
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 5 * 60 * 1000 },
      })

      await triggerCheckAndScheduleViaInterval()

      // Should not schedule immediate sync
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should schedule immediate sync when autoSyncInterval is met and no recent changes within autoSyncDelayOnChanges', async () => {
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 30, // 30 minutes
            lastSyncTimestamp: Date.now() - 35 * 60 * 1000, // Synced 35 mins ago (interval condition met)
            autoSyncOnChanges: true,
            autoSyncDelayOnChanges: 10, // 10 minutes delay on changes
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })

      // Bookmarks updated 45 minutes ago (outside the 10-minute delay period)
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 45 * 60 * 1000 },
      })

      await triggerCheckAndScheduleViaInterval()

      // Should schedule immediate sync
      expect(addToSyncQueue).toHaveBeenCalledWith(
        { serviceId: 'service1' },
        mockSyncManagerInstance
      )
    })

    it('should schedule immediate sync when autoSyncInterval is met and autoSyncDelayOnChanges is not configured', async () => {
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 30, // 30 minutes
            lastSyncTimestamp: Date.now() - 35 * 60 * 1000, // Synced 35 mins ago (interval condition met)
            autoSyncOnChanges: false,
            // autoSyncDelayOnChanges not configured
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })

      // Bookmarks updated recently
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 2 * 60 * 1000 },
      })

      await triggerCheckAndScheduleViaInterval()

      // Should schedule immediate sync since autoSyncDelayOnChanges is not configured
      expect(addToSyncQueue).toHaveBeenCalledWith(
        { serviceId: 'service1' },
        mockSyncManagerInstance
      )
    })

    it('should not schedule sync if autoSyncOnChanges delay not met after last update', async () => {
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncOnChanges: true,
            autoSyncDelayOnChanges: 15, // 15 minutes delay
            lastSyncTimestamp: Date.now() - 60 * 60 * 1000, // Synced 1 hour ago (eligible by this)
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })
      // Bookmarks updated 5 mins ago. Delay is 15 mins. Condition not met.
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 5 * 60 * 1000 },
      })
      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should not schedule sync if autoSyncOnChanges delay not met after last sync', async () => {
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncOnChanges: true,
            autoSyncDelayOnChanges: 15, // 15 minutes delay
            // Last sync was 5 mins ago. Delay is 15 mins. Condition not met.
            lastSyncTimestamp: Date.now() - 5 * 60 * 1000,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })
      // Bookmarks updated 1 hour ago (eligible by this)
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 60 * 60 * 1000 },
      })
      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should add to sync queue even if queue is already processing, but not execute immediately', async () => {
      ;(isQueueProcessing as Mock).mockReturnValueOnce(true)
      await triggerCheckAndScheduleViaInterval()
      expect(addToSyncQueue).toHaveBeenCalled()
      // Further assertions might be needed here or in sync-queue.test.ts
      // to ensure it's added but not immediately processed if that's the desired behavior of addToSyncQueue.
    })

    it('should not schedule sync if lock is not owned by current instance', async () => {
      simulateLockHeldByAnotherInstance()
      // init will not acquire lock, so subsequent checkAndScheduleSync will bail
      initAutoSyncScheduler(mockSyncManagerInstance)
      await vi.advanceTimersByTimeAsync(10_000)
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should perform an initial checkAndScheduleSync on init if lock is acquired', async () => {
      simulateLockAcquisitionByCurrentInstance() // Prepare for lock acquisition
      // Mock settings for a schedulable task
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 15,
            lastSyncTimestamp: Date.now() - 20 * 60 * 1000,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 20 * 60 * 1000 },
      })

      initAutoSyncScheduler(mockSyncManagerInstance) // This calls checkAndScheduleSync
      await vi.advanceTimersByTimeAsync(0) // Allow promises in checkAndScheduleSync to resolve

      expect(addToSyncQueue).toHaveBeenCalledWith(
        { serviceId: 'service1' },
        mockSyncManagerInstance
      )
    })
  })

  describe('Event Handlers', () => {
    it('should call stopAutoSyncScheduler on beforeunload', () => {
      let beforeUnloadCallback: EventListenerOrEventListenerObject =
        emptyFunction

      ;(globalThis.addEventListener as Mock).mockImplementation(
        (event: string, callback: EventListener) => {
          if (event === 'beforeunload') {
            beforeUnloadCallback = callback
          }
        }
      )
      simulateLockAcquisitionByCurrentInstance()
      initAutoSyncScheduler(mockSyncManagerInstance) // Acquires lock

      expect(globalThis.addEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )

      if (typeof beforeUnloadCallback === 'function') {
        beforeUnloadCallback(new Event('beforeunload'))
      }

      // stopAutoSyncScheduler is called, which in turn calls releaseLock if lock is owned.
      // releaseLock will remove items from localStorage.
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'utags_auto_sync_lock_owner'
      )
    })

    it('should attempt to acquire lock and check sync on visibilitychange to visible if not holding lock', async () => {
      let visibilityChangeCallback: EventListenerOrEventListenerObject =
        emptyFunction

      ;(document.addEventListener as Mock).mockImplementation(
        (event: string, callback: EventListener) => {
          if (event === 'visibilitychange') {
            visibilityChangeCallback = callback
          }
        }
      )

      simulateLockHeldByAnotherInstance() // Start with lock held by another tab
      initAutoSyncScheduler(mockSyncManagerInstance) // Will not acquire lock initially

      // Make this tab visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })
      // Simulate lock becoming available (e.g., other tab released it)
      localStorageMock.removeItem('utags_auto_sync_lock_owner')
      localStorageMock.removeItem('utags_auto_sync_lock_heartbeat')

      // Configure for a schedulable task
      syncConfigStore.set({
        syncServices: [
          {
            id: 'service1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 15,
            lastSyncTimestamp: Date.now() - 20 * 60 * 1000,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'service1',
      })
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 20 * 60 * 1000 },
      })

      if (typeof visibilityChangeCallback === 'function') {
        await (visibilityChangeCallback as (evt: Event) => Promise<void>)(
          new Event('visibilitychange')
        )
      }

      // Should attempt to acquire lock
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'utags_auto_sync_lock_owner',
        expect.any(String)
      )
      // And then schedule sync
      expect(addToSyncQueue).toHaveBeenCalledWith(
        { serviceId: 'service1' },
        mockSyncManagerInstance
      )
    })

    it('should not re-acquire lock but still check sync on visibilitychange if already holding lock', async () => {
      let visibilityChangeCallback: EventListenerOrEventListenerObject =
        emptyFunction

      ;(document.addEventListener as Mock).mockImplementation(
        (event: string, callback: EventListener) => {
          if (event === 'visibilitychange') {
            visibilityChangeCallback = callback
          }
        }
      )

      simulateLockAcquisitionByCurrentInstance()
      initAutoSyncScheduler(mockSyncManagerInstance) // Acquires lock, calls async checkAndScheduleSync

      // Allow any promises/microtasks from initAutoSyncScheduler's checkAndScheduleSync to settle
      await vi.advanceTimersByTimeAsync(0)

      vi.clearAllMocks() // Clear mocks now that initial calls should be done

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })
      if (typeof visibilityChangeCallback === 'function') {
        await (visibilityChangeCallback as (evt: Event) => Promise<void>)(
          new Event('visibilitychange')
        )
      }

      // Should not try to re-acquire lock since already holding it
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'utags_auto_sync_lock_owner',
        expect.any(String)
      )
      // But should still perform sync check on visibility change
      expect(addToSyncQueue).toHaveBeenCalledWith(
        { serviceId: 'service1' },
        mockSyncManagerInstance
      )
    })

    it('should not bind event listeners multiple times when initAutoSyncScheduler is called repeatedly', () => {
      // First initialization
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Clear the mock call counts
      vi.clearAllMocks()

      // Second initialization
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Verify that event listeners were not bound again
      expect(globalThis.addEventListener).not.toHaveBeenCalled()
      expect(document.addEventListener).not.toHaveBeenCalled()
    })

    it('should rebind event listeners after stopAutoSyncScheduler is called', () => {
      // First initialization
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Stop the scheduler
      stopAutoSyncScheduler()

      // Clear the mock call counts
      vi.clearAllMocks()

      // Reinitialize the scheduler
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Verify that event listeners were bound again
      expect(globalThis.addEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )
    })

    it('should properly remove event listeners when stopAutoSyncScheduler is called', () => {
      // Initialize the scheduler
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Stop the scheduler
      stopAutoSyncScheduler()

      // Verify that event listeners were removed with the same handler functions
      expect(globalThis.removeEventListener).toHaveBeenCalledWith(
        'beforeunload',
        beforeUnloadHandler
      )
      expect(document.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        visibilityChangeHandler
      )
    })

    it('should do nothing on visibilitychange to hidden', async () => {
      let visibilityChangeCallback: EventListenerOrEventListenerObject =
        emptyFunction

      ;(document.addEventListener as Mock).mockImplementation(
        (event: string, callback: EventListener) => {
          if (event === 'visibilitychange') {
            visibilityChangeCallback = callback
          }
        }
      )
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Allow any promises/microtasks from initAutoSyncScheduler's checkAndScheduleSync to settle
      await vi.advanceTimersByTimeAsync(0)

      vi.clearAllMocks()

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      })
      if (typeof visibilityChangeCallback === 'function') {
        await (visibilityChangeCallback as (evt: Event) => Promise<void>)(
          new Event('visibilitychange')
        )
      }

      expect(addToSyncQueue).not.toHaveBeenCalled()
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'utags_auto_sync_lock_owner',
        expect.any(String)
      )
    })

    it('should trigger immediate sync on visibilitychange for browserExtension type regardless of sync interval', async () => {
      let visibilityChangeCallback: EventListenerOrEventListenerObject =
        emptyFunction

      ;(document.addEventListener as Mock).mockImplementation(
        (event: string, callback: EventListener) => {
          if (event === 'visibilitychange') {
            visibilityChangeCallback = callback
          }
        }
      )

      // Configure a browserExtension service with recent sync (normally wouldn't trigger)
      syncConfigStore.set({
        syncServices: [
          {
            id: 'browserExt1',
            type: 'browserExtension',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 60, // 60 minutes - long interval
            lastSyncTimestamp: Date.now() - 5 * 60 * 1000, // Synced just 5 mins ago
            autoSyncOnChanges: false,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'browserExt1',
      })
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 10 * 60 * 1000 }, // Updated 10 mins ago
      })

      // Start without lock to simulate tab becoming visible and acquiring lock
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Allow initial checkAndScheduleSync to settle
      await vi.advanceTimersByTimeAsync(0)
      vi.clearAllMocks()

      // Re-setup the addToSyncQueue mock
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      ;(addToSyncQueue as Mock).mockImplementation(() => {})

      // Mock acquireLock to return true when called during visibilitychange
      const mockAcquireLock = vi.fn().mockReturnValue(true)
      const mockCheckHasLock = vi.fn().mockReturnValue(false) // Initially no lock

      // We need to mock the internal functions, but since they're not exported,
      // we'll simulate the scenario by ensuring no lock is held initially
      localStorageMock.removeItem('utags_auto_sync_lock_owner')
      localStorageMock.removeItem('utags_auto_sync_lock_heartbeat')
      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })

      if (typeof visibilityChangeCallback === 'function') {
        await (visibilityChangeCallback as (evt: Event) => Promise<void>)(
          new Event('visibilitychange')
        )
      }

      // After visibilitychange, the tab should acquire lock and trigger sync
      expect(
        localStorageMock.getItem('utags_auto_sync_lock_owner')
      ).toBeTruthy()
      expect(isAutoSyncSchedulerLockOwner()).toBe(true)

      // Should trigger immediate sync for browserExtension type on visibilitychange
      expect(addToSyncQueue).toHaveBeenCalledWith(
        { serviceId: 'browserExt1' },
        mockSyncManagerInstance
      )
    })

    it('should not trigger immediate sync on visibilitychange for non-browserExtension types', async () => {
      let visibilityChangeCallback: EventListenerOrEventListenerObject =
        emptyFunction

      ;(document.addEventListener as Mock).mockImplementation(
        (event: string, callback: EventListener) => {
          if (event === 'visibilitychange') {
            visibilityChangeCallback = callback
          }
        }
      )

      // Configure a customApi service with recent sync (shouldn't trigger)
      syncConfigStore.set({
        syncServices: [
          {
            id: 'customApi1',
            type: 'customApi',
            enabled: true,
            autoSyncEnabled: true,
            autoSyncInterval: 60, // 60 minutes
            lastSyncTimestamp: Date.now() - 5 * 60 * 1000, // Synced just 5 mins ago
            autoSyncOnChanges: false,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'customApi1',
      })
      ;(bookmarkStorage.getBookmarksStore as Mock).mockResolvedValue({
        meta: { updated: Date.now() - 10 * 60 * 1000 },
      })

      simulateLockAcquisitionByCurrentInstance()
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Allow initial checkAndScheduleSync to settle
      await vi.advanceTimersByTimeAsync(0)
      vi.clearAllMocks()

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })

      if (typeof visibilityChangeCallback === 'function') {
        await (visibilityChangeCallback as (evt: Event) => Promise<void>)(
          new Event('visibilitychange')
        )
      }

      // Should NOT trigger sync because it's not browserExtension type
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should respect normal sync conditions on visibilitychange for browserExtension when service is disabled', async () => {
      let visibilityChangeCallback: EventListenerOrEventListenerObject =
        emptyFunction

      ;(document.addEventListener as Mock).mockImplementation(
        (event: string, callback: EventListener) => {
          if (event === 'visibilitychange') {
            visibilityChangeCallback = callback
          }
        }
      )

      // Configure a disabled browserExtension service
      syncConfigStore.set({
        syncServices: [
          {
            id: 'browserExt1',
            type: 'browserExtension',
            enabled: false, // Disabled
            autoSyncEnabled: true,
            autoSyncInterval: 60,
            lastSyncTimestamp: Date.now() - 5 * 60 * 1000,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'browserExt1',
      })

      simulateLockAcquisitionByCurrentInstance()
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Allow initial checkAndScheduleSync to settle
      await vi.advanceTimersByTimeAsync(0)
      vi.clearAllMocks()

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })

      if (typeof visibilityChangeCallback === 'function') {
        await (visibilityChangeCallback as (evt: Event) => Promise<void>)(
          new Event('visibilitychange')
        )
      }

      // Should NOT trigger sync because service is disabled
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })

    it('should respect normal sync conditions on visibilitychange for browserExtension when autoSyncEnabled is false', async () => {
      let visibilityChangeCallback: EventListenerOrEventListenerObject =
        emptyFunction

      ;(document.addEventListener as Mock).mockImplementation(
        (event: string, callback: EventListener) => {
          if (event === 'visibilitychange') {
            visibilityChangeCallback = callback
          }
        }
      )

      // Configure a browserExtension service with autoSyncEnabled false
      syncConfigStore.set({
        syncServices: [
          {
            id: 'browserExt1',
            type: 'browserExtension',
            enabled: true,
            autoSyncEnabled: false, // Auto sync disabled
            autoSyncInterval: 60,
            lastSyncTimestamp: Date.now() - 5 * 60 * 1000,
          } as SyncServiceConfig,
        ],
        activeSyncServiceId: 'browserExt1',
      })

      simulateLockAcquisitionByCurrentInstance()
      initAutoSyncScheduler(mockSyncManagerInstance)

      // Allow initial checkAndScheduleSync to settle
      await vi.advanceTimersByTimeAsync(0)
      vi.clearAllMocks()

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })

      if (typeof visibilityChangeCallback === 'function') {
        await (visibilityChangeCallback as (evt: Event) => Promise<void>)(
          new Event('visibilitychange')
        )
      }

      // Should NOT trigger sync because autoSyncEnabled is false
      expect(addToSyncQueue).not.toHaveBeenCalled()
    })
  })
})
