import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CURRENT_DATABASE_VERSION,
  DELETED_BOOKMARK_TAG,
} from '../config/constants.js'
import type {
  BookmarksStore,
  BookmarkKeyValuePair,
  BookmarkTagsAndMetadata,
} from '../types/bookmarks.js'
import { BookmarkService } from './bookmark-service.js'

// Mock console-tagger
vi.mock('console-tagger', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    default: class Console {
      constructor() {
        // eslint-disable-next-line no-constructor-return
        return {
          log: vi.fn((...arguments_) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            console.log(...arguments_)
          }),
          warn: vi.fn((...arguments_) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            console.warn(...arguments_)
          }),
          error: vi.fn((...arguments_) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            console.error(...arguments_)
          }),
        }
      }
    },
  }
})

// Mock localStorage
const localStorageMock = (() => {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key]
    }),
    clear: vi.fn(() => {
      for (const key of Object.keys(store)) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete store[key]
      }
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    length: 0,
  }
})()

// Add localStorage to global
vi.stubGlobal('localStorage', localStorageMock)

// Mock svelte-persisted-store
vi.mock('svelte-persisted-store', () => {
  const stores = new Map<string, any>()

  // Mock implementation of persisted store
  const persisted = vi.fn((key: string, initialValue: any) => {
    if (!stores.has(key)) {
      stores.set(key, initialValue)
    }

    return {
      subscribe: vi.fn((callback: (value: any) => void) => {
        callback(stores.get(key))
        return { unsubscribe: vi.fn() }
      }),
      set: vi.fn((value: any) => {
        stores.set(key, value)
      }),
      update: vi.fn((updater: (value: any) => any) => {
        const currentValue = stores.get(key)

        const newValue = updater(currentValue)
        stores.set(key, newValue)
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      _getStore: () => stores.get(key), // Helper for testing
      _clearStore() {
        stores.clear()
      }, // Helper for testing
    }
  })

  return { persisted }
})

// Mock fetch API
globalThis.fetch = vi.fn()

// Create a simple event emitter if addEventListener doesn't exist
if (!globalThis.addEventListener) {
  // Define the type for event listeners storage object
  type EventListenersMap = Record<string, EventListenerOrEventListenerObject>

  // Add event listener storage to globalThis
  ;(globalThis as any).eventListeners = {} as EventListenersMap

  // Implement addEventListener method
  ;(globalThis as any).addEventListener = (
    event: string,
    callback: EventListenerOrEventListenerObject
  ): void => {
    ;(globalThis as any).eventListeners[event] = callback
  }

  // Implement dispatchEvent method
  ;(globalThis as any).dispatchEvent = (event: Event): boolean => {
    const callback = (globalThis as any).eventListeners[
      event.type
    ] as EventListenerOrEventListenerObject
    if (callback) {
      if (typeof callback === 'function') {
        callback(event)
      } else {
        callback.handleEvent(event)
      }
    }

    return true
  }

  // Implement removeEventListener method
  ;(globalThis as any).removeEventListener = (
    event: string,
    _callback?: EventListenerOrEventListenerObject
  ): void => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as any).eventListeners[event]
  }
}

/**
 * Helper function to create valid bookmark data for testing
 */
function createTestBookmark(
  tags: string[] = ['test']
): BookmarkTagsAndMetadata {
  return {
    tags,
    meta: {
      title: 'Example Title',
      created: Date.now(),
      updated: Date.now(),
    },
  }
}

describe('BookmarkService', () => {
  let service: BookmarkService

  // Reset mocks and service before each test
  beforeEach(() => {
    vi.resetAllMocks()

    // Reset singleton instance
    // @ts-expect-error - Accessing private static property for testing
    BookmarkService.instance = undefined

    service = BookmarkService.getInstance()

    // Clear localStorage mock
    localStorage.clear()

    // Mock fetch response
    mockFetchResponse({
      data: {
        'https://example.com': createTestBookmark(),
      },
      meta: {
        databaseVersion: CURRENT_DATABASE_VERSION,
        created: Date.now(),
      },
    })
  })

  afterEach(() => {
    // @ts-expect-error - Accessing private static property for testing
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    service.getStore()._clearStore()
    vi.clearAllMocks()
  })

  /**
   * Helper function to mock fetch response
   * @param data Response data
   * @param status HTTP status code
   * @param statusText HTTP status text (defaults to 'OK' for 200, custom text or 'Error' for others)
   */
  function mockFetchResponse(data: any, status = 200, statusText?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    ;(globalThis.fetch as any).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: statusText || (status === 200 ? 'OK' : 'Error'),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      json: async () => data,
    })
  }

  /**
   * Helper function to mock fetch error
   */
  function mockFetchError(error: Error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    ;(globalThis.fetch as any).mockRejectedValue(error)
  }

  /**
   * Helper function to create a custom event listener
   */
  function createEventListener() {
    const listener = vi.fn()
    globalThis.addEventListener('bookmarks-updated', listener)
    return listener
  }

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = BookmarkService.getInstance()
      const instance2 = BookmarkService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('setApiBaseUrl', () => {
    it('should update the API base URL', () => {
      const newUrl = 'https://api.example.com/bookmarks'
      service.setApiBaseUrl(newUrl)

      // @ts-expect-error - Accessing private property for testing
      expect(service.apiBaseUrl).toBe(newUrl)
    })

    it('should remove trailing slash from API base URL', () => {
      const newUrlWithSlash = 'https://api.example.com/bookmarks/'
      const expectedUrl = 'https://api.example.com/bookmarks'
      service.setApiBaseUrl(newUrlWithSlash)

      // @ts-expect-error - Accessing private property for testing
      expect(service.apiBaseUrl).toBe(expectedUrl)
    })
  })

  describe('setApiSuffix', () => {
    it('should update the API suffix', () => {
      const newSuffix = 'json'
      service.setApiSuffix(newSuffix)

      // @ts-expect-error - Accessing private property for testing
      expect(service.apiSuffix).toBe(newSuffix)
    })

    it('should remove leading dot from API suffix', () => {
      const newSuffixWithDot = '.json'
      const expectedSuffix = 'json'
      service.setApiSuffix(newSuffixWithDot)

      // @ts-expect-error - Accessing private property for testing
      expect(service.apiSuffix).toBe(expectedSuffix)
    })

    it('should handle empty string for API suffix', () => {
      service.setApiSuffix('')
      // @ts-expect-error - Accessing private property for testing
      expect(service.apiSuffix).toBe('')
    })
  })

  describe('initializeStore', () => {
    it('should initialize with default storage key when no parameters provided', () => {
      service.initializeStore()

      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBeUndefined()
    })

    it('should initialize with shared collection key when isShared is true', () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
    })

    it('should initialize with deleted collection key for special "deleted" collection', () => {
      service.initializeStore('deleted')

      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe('deleted')
    })

    it('should fetch data from API when initializing shared collection', () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/shared/${collectionId}`
      )
    })

    it('should fetch data from API when initializing shared collection with suffix', () => {
      const collectionId = 'test-collection'
      const apiSuffix = 'json'
      service.setApiSuffix(apiSuffix)
      service.initializeStore(collectionId, 'shared')

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/shared/${collectionId}.${apiSuffix}`
      )
      service.setApiSuffix('') // Reset for other tests
    })

    it('should not fetch data from API when initializing regular collection', () => {
      service.initializeStore()

      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should not fetch data from API when initializing deleted collection', () => {
      service.initializeStore('deleted')

      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should correctly update state when calling initializeStore multiple times', () => {
      // First initialize with shared collection
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)

      // Reset fetch mock to track new calls
      vi.resetAllMocks()

      // Then initialize with default storage
      service.initializeStore()

      // Verify state has been updated correctly
      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBeUndefined()
      expect(globalThis.fetch).not.toHaveBeenCalled()

      // Reset fetch mock again
      vi.resetAllMocks()

      // Finally initialize with deleted collection
      service.initializeStore('deleted')

      // Verify state has been updated correctly again
      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe('deleted')
      expect(globalThis.fetch).not.toHaveBeenCalled()

      // Try again with shared collection
      service.initializeStore(collectionId, 'shared')

      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)

      // Reset fetch mock to track new calls
      vi.resetAllMocks()

      // Then initialize with default storage
      service.initializeStore()

      // Verify state has been updated correctly
      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBeUndefined()
      expect(globalThis.fetch).not.toHaveBeenCalled()

      // Reset fetch mock again
      vi.resetAllMocks()

      // Finally initialize with deleted collection
      service.initializeStore('deleted')

      // Verify state has been updated correctly again
      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe('deleted')
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should initialize with collectionId but not shared', () => {
      const collectionId = 'test-collection'
      // @ts-expect-error - Testing with false value
      service.initializeStore(collectionId, false)

      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should handle empty string collectionId with isShared=false', () => {
      // @ts-expect-error - Testing with false value
      service.initializeStore('', false)

      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe('')
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should handle null collectionId with isShared=false', () => {
      // @ts-expect-error - Testing with null value
      service.initializeStore(null, false)

      expect(service.isShared()).toBe(false)
      // null should be treated as undefined in this context
      expect(service.getCollectionId()).toBeNull()
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should handle undefined collectionId with isShared=false', () => {
      // @ts-expect-error - Testing with false value
      service.initializeStore(undefined, false)

      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBeUndefined()
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should handle empty string collectionId with isShared=true', () => {
      // @ts-expect-error - Testing with true value
      service.initializeStore('', true)

      // Empty string with isShared=true should not be treated as shared
      // because the implementation requires a truthy collectionId
      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe('')
      // Should not fetch because collectionId is empty
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should handle null collectionId with isShared=true', () => {
      // @ts-expect-error - Testing with null value
      service.initializeStore(null, true)

      // Null with isShared=true should not be treated as shared
      // because the implementation requires a truthy collectionId
      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBeNull()
      // Should not fetch because collectionId is null
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should handle undefined collectionId with isShared=true', () => {
      // @ts-expect-error - Testing with true value
      service.initializeStore(undefined, true)

      // Undefined with isShared=true should not be treated as shared
      // because the implementation requires a truthy collectionId
      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBeUndefined()
      // Should not fetch because collectionId is undefined
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })
  })

  describe('initializeStore with different visibility values', () => {
    it('should initialize with public visibility', () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'public')

      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(service.getVisibility()).toBe('public')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/public/${collectionId}`
      )
    })

    it('should initialize with private visibility', () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'private')

      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(service.getVisibility()).toBe('private')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/private/${collectionId}`
      )
    })

    it('should handle unsupported visibility value', () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'unsupported')

      // Unsupported visibility values should not be treated as shared collections
      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe(collectionId)
      // expect(service.getVisibility()).toBe('unsupported')
      expect(service.getVisibility()).toBeUndefined()
      // Should not attempt to fetch data from API
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should handle empty visibility value', () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, '')

      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(service.getVisibility()).toBeUndefined()
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })
  })

  describe('fetchSharedCollection', () => {
    it('should fetch data from API for shared collection', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      // Reset fetch mock to clear the call from initializeStore
      vi.resetAllMocks()
      // Re-mock the fetch response as resetAllMocks clears it
      mockFetchResponse({
        data: { 'https://example.com': createTestBookmark() },
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION,
          created: Date.now(),
        },
      })

      await service.fetchSharedCollection()

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/shared/${collectionId}`
      )
    })

    it('should fetch data from API for shared collection with suffix', async () => {
      const collectionId = 'test-collection'
      const apiSuffix = 'json'
      service.setApiSuffix(apiSuffix)
      service.initializeStore(collectionId, 'shared')

      // Reset fetch mock to clear the call from initializeStore
      vi.resetAllMocks()
      // Re-mock the fetch response
      mockFetchResponse({
        data: { 'https://example.com': createTestBookmark() },
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION,
          created: Date.now(),
        },
      })

      await service.fetchSharedCollection()

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/shared/${collectionId}.${apiSuffix}`
      )
      service.setApiSuffix('') // Reset for other tests
    })

    it('should not fetch data if not a shared collection', async () => {
      service.initializeStore()

      await service.fetchSharedCollection()

      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should update store and notify listeners on successful fetch', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      const listener = createEventListener()

      // Reset fetch mock to clear the call from initializeStore
      vi.resetAllMocks()
      // Re-mock the fetch response as resetAllMocks clears it
      mockFetchResponse({
        data: { 'https://example.com': createTestBookmark() },
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION,
          created: Date.now(),
        },
      })

      await service.fetchSharedCollection()

      expect(listener).toHaveBeenCalledTimes(2)
      expect(listener.mock.calls[0][0].detail).toEqual({
        isShared: true,
        collectionId,
        visibility: 'shared',
      })
    })

    it('should handle fetch error gracefully', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      // Mock console.error to prevent test output noise
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {})

      // Mock fetch to throw an error
      mockFetchError(new Error('Network error'))

      // Reset fetch mock to clear the call from initializeStore
      vi.resetAllMocks()

      await service.fetchSharedCollection()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch shared collection:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle API error response', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      // Mock console.error to prevent test output noise
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {})

      // Mock fetch to return an error response
      mockFetchResponse({}, 404)

      // Reset fetch mock to clear the call from initializeStore
      vi.resetAllMocks()

      await service.fetchSharedCollection()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch shared collection:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('fetchSharedCollection with different visibility values', () => {
    it('should fetch data from API for public collection', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'public')

      // Reset fetch mock to clear the calls from initializeStore
      vi.resetAllMocks()

      await service.fetchSharedCollection()

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/public/${collectionId}`
      )
    })

    it('should fetch data from API for private collection', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'private')

      // Reset fetch mock to clear the calls from initializeStore
      vi.resetAllMocks()

      await service.fetchSharedCollection()

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/private/${collectionId}`
      )
    })

    it('should update store and notify listeners on successful fetch for public collection', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'public')

      const listener = createEventListener()

      // Reset fetch mock to clear the calls from initializeStore
      vi.resetAllMocks()

      await service.fetchSharedCollection()

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].detail).toEqual({
        isShared: true,
        collectionId,
        visibility: 'public',
      })
    })

    it('should update store and notify listeners on successful fetch for private collection', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'private')

      const listener = createEventListener()

      // Reset fetch mock to clear the calls from initializeStore
      vi.resetAllMocks()

      await service.fetchSharedCollection()

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].detail).toEqual({
        isShared: true,
        collectionId,
        visibility: 'private',
      })
    })

    it('should handle fetch error for public collection gracefully', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'public')

      // Mock console.error to prevent test output noise
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {})

      // Mock fetch to throw an error
      mockFetchError(new Error('Network error'))

      // Reset fetch mock to clear the calls from initializeStore
      vi.resetAllMocks()

      await service.fetchSharedCollection()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch public collection:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle API error response for private collection', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'private')

      // Mock console.error to prevent test output noise
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {})

      // Mock fetch to return error response
      mockFetchResponse({}, 404)

      // Reset fetch mock to clear calls from initializeStore
      vi.resetAllMocks()

      await service.fetchSharedCollection()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch private collection:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('switching between different visibility types', () => {
    it('should correctly switch from shared to public collection', () => {
      // First initialize as shared collection
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(service.getVisibility()).toBe('shared')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)

      // Reset fetch mock to track new calls
      vi.resetAllMocks()

      // Then switch to public collection
      service.initializeStore(collectionId, 'public')

      // Verify state updated correctly
      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(service.getVisibility()).toBe('public')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/public/${collectionId}`
      )
    })

    it('should correctly switch from public to private collection', () => {
      // First initialize as public collection
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'public')

      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(service.getVisibility()).toBe('public')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)

      // Reset fetch mock to track new calls
      vi.resetAllMocks()

      // Then switch to private collection
      service.initializeStore(collectionId, 'private')

      // Verify state updated correctly
      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(service.getVisibility()).toBe('private')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/private/${collectionId}`
      )
    })

    it('should correctly switch from private to unsupported visibility', () => {
      // First initialize as private collection
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'private')

      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(service.getVisibility()).toBe('private')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)

      // Reset fetch mock to track new calls
      vi.resetAllMocks()

      // Then switch to unsupported visibility value
      service.initializeStore(collectionId, 'unsupported')

      // Verify state updated correctly
      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe(collectionId)
      // expect(service.getVisibility()).toBe('unsupported')
      expect(service.getVisibility()).toBeUndefined()
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should correctly switch from unsupported visibility to shared collection', () => {
      // First initialize with unsupported visibility value
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'unsupported')

      expect(service.isShared()).toBe(false)
      expect(service.getCollectionId()).toBe(collectionId)
      // expect(service.getVisibility()).toBe('unsupported')
      expect(service.getVisibility()).toBeUndefined()
      expect(globalThis.fetch).not.toHaveBeenCalled()

      // Reset fetch mock to track new calls
      vi.resetAllMocks()

      // Then switch to shared collection
      service.initializeStore(collectionId, 'shared')

      // Verify state updated correctly
      expect(service.isShared()).toBe(true)
      expect(service.getCollectionId()).toBe(collectionId)
      expect(service.getVisibility()).toBe('shared')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://api.utags.link/shared/${collectionId}`
      )
    })
  })

  describe('race condition handling', () => {
    beforeEach(() => {
      // Clear localStorage mock
      localStorage.clear()
      // Reset service instance
      service = BookmarkService.getInstance()
      service.setApiBaseUrl('https://api.utags.link')

      // Reset fetch mock
      vi.resetAllMocks()

      // Mock console.warn and console.error to prevent test output noise
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      // @ts-expect-error - Accessing private static property for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      service.getStore()._clearStore()
      // Restore console methods
      vi.restoreAllMocks()
    })

    it('should ignore API response when switching store during API request', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      // Create delayed fetch response
      let resolveResponse: (value: any) => void
      const responsePromise = new Promise((resolve) => {
        resolveResponse = resolve
      })

      // Mock fetch to return delayed response
      globalThis.fetch = vi.fn().mockImplementation(async () => responsePromise)

      // Monitor console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn')

      // Start API request
      const fetchPromise = service.fetchSharedCollection()

      // Switch store during API request
      service.initializeStore('another-collection', 'local')

      // Now resolve API response
      resolveResponse!({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: { 'https://example.com': { tags: ['test'] } },
          meta: {
            databaseVersion: CURRENT_DATABASE_VERSION,
            created: Date.now(),
          },
        }),
      })

      // Wait for fetchSharedCollection to complete
      await fetchPromise

      // Verify warning message
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Collection changed during API request')
      )

      // Verify store was not updated with API response data
      const bookmarks = service.getBookmarks()
      expect(bookmarks.length).toBe(0) // Should be empty as API response was ignored
    })

    it('should ignore API response when visibility is changed during API request', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'public')

      // Create two delayed fetch responses
      let resolveFirstResponse: (value: any) => void
      let resolveSecondResponse: (value: any) => void
      const firstResponsePromise = new Promise((resolve) => {
        resolveFirstResponse = resolve
      })
      const secondResponsePromise = new Promise((resolve) => {
        resolveSecondResponse = resolve
      })

      // Reset fetch mock to clear calls from initializeStore
      vi.resetAllMocks()

      // Mock fetch to return delayed responses, first and second calls return different Promises
      let fetchCallCount = 0
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++
        return fetchCallCount === 1
          ? firstResponsePromise
          : secondResponsePromise
      })

      // Listen for console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn')

      // Start the first API request
      const fetchPromise = service.fetchSharedCollection()

      // Change visibility during the first API request, this will trigger a second API request
      service.initializeStore(collectionId, 'private')

      // First, resolve the second API response (response for the private collection)
      resolveSecondResponse!({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: { 'https://example.com/private': { tags: ['private'] } },
          meta: {
            databaseVersion: CURRENT_DATABASE_VERSION,
            created: Date.now(),
          },
        }),
      })

      // Wait for a short period to ensure the second response is processed
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Now, resolve the first API response (response for the public collection)
      resolveFirstResponse!({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: { 'https://example.com/public': { tags: ['public'] } },
          meta: {
            databaseVersion: CURRENT_DATABASE_VERSION,
            created: Date.now(),
          },
        }),
      })

      // Wait for the first fetchSharedCollection to complete
      await fetchPromise

      // Verify the warning message
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Collection changed during API request')
      )

      // Verify that the store contains data from the second API response (private collection), not from the first API response (public collection)
      const bookmarks = service.getBookmarks()
      expect(bookmarks.length).toBe(1)
      expect(bookmarks[0][0]).toBe('https://example.com/private')
      expect(bookmarks[0][1].tags).toContain('private')
      expect(bookmarks[0][1].tags).not.toContain('public')
    })

    it('should ignore API response when collectionId is changed during API request', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      // Create two delayed fetch responses
      let resolveFirstResponse: (value: any) => void
      let resolveSecondResponse: (value: any) => void
      const firstResponsePromise = new Promise((resolve) => {
        resolveFirstResponse = resolve
      })
      const secondResponsePromise = new Promise((resolve) => {
        resolveSecondResponse = resolve
      })

      // Reset fetch mock to clear calls from initializeStore
      vi.resetAllMocks()

      // Mock fetch to return delayed responses, first and second calls return different Promises
      let fetchCallCount = 0
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++
        return fetchCallCount === 1
          ? firstResponsePromise
          : secondResponsePromise
      })

      // Listen for console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn')

      // Start the first API request
      const fetchPromise = service.fetchSharedCollection()

      // Change collectionId during the API request
      service.initializeStore('another-collection', 'shared')

      // First, resolve the second API response (response for the 'another-collection' collection)
      resolveSecondResponse!({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: {
            'https://example.com/another-collection': {
              tags: ['another-collection'],
            },
          },
          meta: {
            databaseVersion: CURRENT_DATABASE_VERSION,
            created: Date.now(),
          },
        }),
      })

      // Wait for a short period to ensure the second response is processed
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Now, resolve the first API response (response for the 'test-collection' collection)
      resolveFirstResponse!({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: {
            'https://example.com/test-collection': {
              tags: ['test-collection'],
            },
          },
          meta: {
            databaseVersion: CURRENT_DATABASE_VERSION,
            created: Date.now(),
          },
        }),
      })

      // Wait for the first fetchSharedCollection to complete
      await fetchPromise

      // Verify the warning message
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Collection changed during API request')
      )

      // Verify that the store contains data from the second API response ('another-collection'), not from the first API response ('test-collection')
      const bookmarks = service.getBookmarks()
      expect(bookmarks.length).toBe(1)
      expect(bookmarks[0][0]).toBe('https://example.com/another-collection')
      expect(bookmarks[0][1].tags).toContain('another-collection')
      expect(bookmarks[0][1].tags).not.toContain('test-collection')
    })

    it('should correctly handle API response when collectionId and visibility remain unchanged', async () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      // Create a delayed fetch response
      let resolveResponse: (value: any) => void
      const responsePromise = new Promise((resolve) => {
        resolveResponse = resolve
      })

      // Mock fetch to return a delayed response
      globalThis.fetch = vi.fn().mockImplementation(async () => responsePromise)

      // Listen for console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn')

      // Create event listener
      const listener = createEventListener()

      // Start API request
      const fetchPromise = service.fetchSharedCollection()

      // Now resolve API response
      resolveResponse!({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: { 'https://example.com': { tags: ['test'] } },
          meta: {
            databaseVersion: CURRENT_DATABASE_VERSION,
            created: Date.now(),
          },
        }),
      })

      // Wait for fetchSharedCollection to complete
      await fetchPromise

      // Verify no warning message
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Collection changed during API request')
      )

      // Verify store has been updated with API response data
      const bookmarks = service.getBookmarks()
      expect(bookmarks.length).toBe(1)
      expect(bookmarks[0][0]).toBe('https://example.com')

      // Verify event listener was called
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].detail).toEqual({
        isShared: true,
        collectionId,
        visibility: 'shared',
      })
    })
  })

  describe('getStore', () => {
    // Reset mocks and service before each test
    beforeEach(() => {
      // Clear localStorage mock
      localStorage.clear()
      vi.resetAllMocks()

      // Reset singleton instance
      // @ts-expect-error - Accessing private static property for testing
      BookmarkService.instance = undefined

      service = BookmarkService.getInstance()
    })

    afterEach(() => {
      // @ts-expect-error - Accessing private static property for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      service.getStore()._clearStore()
      vi.clearAllMocks()
    })

    it('should return the current store instance', () => {
      // Initialize default store
      service.initializeStore()

      // Get store instance
      const store = service.getStore()

      // Verify store is a valid object
      expect(store).toBeDefined()
      expect(typeof store).toBe('object')
      expect(store).toHaveProperty('subscribe')
      expect(store).toHaveProperty('set')
      expect(store).toHaveProperty('update')
    })

    it('should return a BookmarksStore type store for regular bookmark collections', () => {
      // Initialize default store
      service.initializeStore()

      // Get store instance
      const store = service.getStore()

      // Verify store content type
      // Use _getStore helper method to get the actual stored value
      // @ts-expect-error - Accessing private method for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const storeValue = store._getStore()

      expect(storeValue).toHaveProperty('data')
      expect(storeValue).toHaveProperty('meta')
      expect(storeValue.meta).toHaveProperty('databaseVersion')
    })

    it('should return a BookmarksStore type store for shared bookmark collections', () => {
      // Initialize shared store
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      // Get store instance
      const store = service.getStore()

      // Verify store content type
      // @ts-expect-error - Accessing private method for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const storeValue = store._getStore()

      expect(storeValue).toHaveProperty('data')
      expect(storeValue).toHaveProperty('meta')
      expect(storeValue.meta).toHaveProperty('databaseVersion')
    })

    it('should return an array type store for collections with collectionId "deleted"', () => {
      // Initialize deleted bookmarks store
      service.initializeStore('deleted')

      // Get store instance
      const store = service.getStore()

      // Verify store content type
      // @ts-expect-error - Accessing private method for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const storeValue = store._getStore()

      expect(storeValue).toHaveProperty('data')
      expect(storeValue).toHaveProperty('meta')
      expect(storeValue.meta).toHaveProperty('databaseVersion')
    })

    it('should return the correct type of store when switching store types', () => {
      // First initialize as a regular bookmark store
      service.initializeStore()

      // Get store instance and verify type
      let store = service.getStore()
      // @ts-expect-error - Accessing private method for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      let storeValue = store._getStore()

      expect(storeValue).toHaveProperty('data')
      expect(storeValue).toHaveProperty('meta')

      // Then switch to deleted bookmarks store
      service.initializeStore('deleted')

      // Re-get store instance and verify type
      store = service.getStore()
      // @ts-expect-error - Accessing private method for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      storeValue = store._getStore()

      expect(storeValue).toHaveProperty('data')
      expect(storeValue).toHaveProperty('meta')
      expect(storeValue.meta).toHaveProperty('databaseVersion')

      // Finally switch back to regular bookmark store
      service.initializeStore()

      // Get store instance again and verify type
      store = service.getStore()
      // @ts-expect-error - Accessing private method for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      storeValue = store._getStore()

      expect(storeValue).toHaveProperty('data')
      expect(storeValue).toHaveProperty('meta')
    })

    it('should return a BookmarksStore type store for shared collections with different visibilities', () => {
      // Test different visibility types
      const visibilityTypes = ['public', 'private', 'shared']
      const collectionId = 'test-collection'

      for (const visibility of visibilityTypes) {
        // Initialize shared store with specific visibility
        service.initializeStore(collectionId, visibility)

        // Get store instance
        const store = service.getStore()

        // Verify store content type
        // @ts-expect-error - Accessing private method for testing
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const storeValue = store._getStore()

        expect(storeValue).toHaveProperty('data')
        expect(storeValue).toHaveProperty('meta')
        expect(storeValue.meta).toHaveProperty('databaseVersion')
      }
    })
  })

  describe('updateStore', () => {
    it('should update regular bookmark store correctly', async () => {
      service.initializeStore()

      const testData: BookmarksStore = {
        data: {
          'https://example.com': createTestBookmark(['test', 'update']),
        },
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION,
          created: Date.now(),
        },
      }

      // @ts-expect-error - Accessing private method for testing
      service.updateStore(testData)

      const bookmarks = service.getBookmarks()
      expect(bookmarks).toHaveLength(1)
      expect(bookmarks[0][0]).toBe('https://example.com')
      expect(bookmarks[0][1].tags).toEqual(['test', 'update'])
    })

    it('should update deleted bookmarks store correctly', async () => {
      service.initializeStore('deleted')

      const deletedBookmarkUrl = 'https://example.com/deleted'
      const initialTags = ['test', 'update']
      const testData: BookmarksStore = {
        data: {
          [deletedBookmarkUrl]: {
            ...createTestBookmark([...initialTags, DELETED_BOOKMARK_TAG]),
            deletedMeta: {
              actionType: 'DELETE',
              deleted: Date.now(),
            },
          },
        },
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION,
          created: Date.now(),
        },
      }

      // @ts-expect-error - Accessing private method for testing
      service.updateStore(testData)

      const bookmarks = service.getBookmarks()

      expect(bookmarks).toHaveLength(1)

      const updatedBookmarkEntry = bookmarks.find(
        (bm) => bm[0] === deletedBookmarkUrl
      )

      expect(updatedBookmarkEntry).toBeDefined()
      if (updatedBookmarkEntry) {
        expect(updatedBookmarkEntry[1].tags).toContain(DELETED_BOOKMARK_TAG)
        expect(updatedBookmarkEntry[1].tags).toEqual(
          expect.arrayContaining(initialTags)
        )
        expect(updatedBookmarkEntry[1].deletedMeta).toBeDefined()
      }
    })

    it('should throw error when database version is incompatible', () => {
      service.initializeStore()

      const testData: BookmarksStore = {
        data: {},
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION + 1, // Incompatible version
          created: Date.now(),
        },
      }

      expect(() => {
        // @ts-expect-error - Accessing private method for testing
        service.updateStore(testData)
      }).toThrow(
        `Database version mismatch: expected ${CURRENT_DATABASE_VERSION}, got ${CURRENT_DATABASE_VERSION + 1}`
      )
    })

    it('should preserve original creation date when updating', async () => {
      service.initializeStore()

      const originalCreationTime = Date.now() - 1000

      // Set initial data with creation time
      // @ts-expect-error - Accessing private property for testing
      service.currentStore.set({
        data: {},
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION,
          created: originalCreationTime,
        },
      })

      // Update with new data
      const newData: BookmarksStore = {
        data: {
          'https://example.com': createTestBookmark(),
        },
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION,
          created: Date.now(), // Different creation time
        },
      }

      // @ts-expect-error - Accessing private method for testing
      service.updateStore(newData)

      // Get current data to verify creation time was preserved
      const currentData = service.getBookmarks()
      expect(currentData).toHaveLength(1)

      // @ts-expect-error - Accessing private property for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const storeData = service.currentStore._getStore() as BookmarksStore
      expect(storeData.meta.created).toBe(originalCreationTime)
    })
  })

  describe('getBookmarks', () => {
    it('should return bookmarks from regular store as key-value pairs', () => {
      service.initializeStore()

      const testData: BookmarksStore = {
        data: {
          'https://example.com': createTestBookmark(),
          'https://another.com': createTestBookmark(['another']),
        },
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION,
          created: Date.now(),
        },
      }

      // @ts-expect-error - Accessing private method for testing
      service.updateStore(testData)

      const bookmarks = service.getBookmarks()
      expect(bookmarks).toHaveLength(2)
      expect(bookmarks[0][0]).toBe('https://example.com')
      expect(bookmarks[1][0]).toBe('https://another.com')
    })

    // it('should return bookmarks from deleted store directly', () => {
    //   service.initializeStore('deleted')

    //   const testData: BookmarkKeyValuePair[] = [
    //     ['https://example.com', createTestBookmark()],
    //   ]

    //   // @ts-expect-error - Accessing private method for testing
    //   service.updateStore(testData)

    //   const bookmarks = service.getBookmarks()
    //   expect(bookmarks).toHaveLength(1)
    //   expect(bookmarks[0][0]).toBe('https://example.com')
    // })
  })

  describe('event handling', () => {
    it('should add and remove event listeners correctly', () => {
      const callback = vi.fn()

      // Add listener
      service.onUpdate(callback)

      // Trigger event
      const event = new CustomEvent('bookmarks-updated', {
        detail: { isShared: false },
      })
      globalThis.dispatchEvent(event)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(event)

      // Reset mock
      callback.mockReset()

      // Remove listener
      service.offUpdate(callback)

      // Trigger event again
      globalThis.dispatchEvent(event)

      // Callback should not be called
      expect(callback).not.toHaveBeenCalled()
    })

    it('should notify listeners when bookmarks are updated', () => {
      const collectionId = 'test-collection'
      service.initializeStore(collectionId, 'shared')

      const listener = createEventListener()

      // @ts-expect-error - Accessing private method for testing
      service.notifyUpdate()

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].detail).toEqual({
        isShared: true,
        collectionId,
        visibility: 'shared',
      })
    })
  })

  describe('API error handling', () => {
    beforeEach(() => {
      // Clear localStorage mock
      localStorage.clear()
      // Reset service instance
      service = BookmarkService.getInstance()
      service.setApiBaseUrl('https://api.utags.link')

      // Reset fetch mock
      vi.resetAllMocks()

      // Mock console.error to prevent test output noise
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      vi.spyOn(console, 'error').mockImplementation(() => {})

      // Set default successful response mock
      mockFetchResponse({
        data: {
          'https://example.com': createTestBookmark(),
        },
        meta: {
          databaseVersion: CURRENT_DATABASE_VERSION,
          created: Date.now(),
        },
      })
    })

    afterEach(() => {
      // @ts-expect-error - Accessing private static property for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      service.getStore()._clearStore()
      // Restore console.error
      vi.restoreAllMocks()
    })

    it('should handle 400 Bad Request response', async () => {
      const collectionId = 'invalid-collection'
      service.initializeStore(collectionId, 'shared')

      // Mock 400 Bad Request response
      mockFetchResponse({ error: 'Bad Request' }, 400, 'Bad Request')

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error')

      await service.fetchSharedCollection()

      // Verify error handling
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch shared collection:',
        expect.objectContaining({
          message: 'API error: 400 Bad Request',
        })
      )
    })

    it('should handle 401 Unauthorized response', async () => {
      const collectionId = 'unauthorized-collection'
      service.initializeStore(collectionId, 'private')

      // Mock 401 Unauthorized response
      mockFetchResponse({ error: 'Unauthorized' }, 401, 'Unauthorized')

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error')

      await service.fetchSharedCollection()

      // Verify error handling
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch private collection:',
        expect.objectContaining({
          message: 'API error: 401 Unauthorized',
        })
      )
    })

    it('should handle 403 Forbidden response', async () => {
      const collectionId = 'forbidden-collection'
      service.initializeStore(collectionId, 'public')

      // Mock 403 Forbidden response
      mockFetchResponse({ error: 'Forbidden' }, 403, 'Forbidden')

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error')

      await service.fetchSharedCollection()

      // Verify error handling
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch public collection:',
        expect.objectContaining({
          message: 'API error: 403 Forbidden',
        })
      )
    })

    it('should handle 404 Not Found response', async () => {
      const collectionId = 'nonexistent-collection'
      service.initializeStore(collectionId, 'shared')

      // Mock 404 Not Found response
      mockFetchResponse({ error: 'Not Found' }, 404, 'Not Found')

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error')

      await service.fetchSharedCollection()

      // Verify error handling
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch shared collection:',
        expect.objectContaining({
          message: 'API error: 404 Not Found',
        })
      )
    })

    it('should handle 500 Internal Server Error response', async () => {
      const collectionId = 'error-collection'
      service.initializeStore(collectionId, 'shared')

      // Mock 500 Internal Server Error response
      mockFetchResponse(
        { error: 'Internal Server Error' },
        500,
        'Internal Server Error'
      )

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error')

      await service.fetchSharedCollection()

      // Verify error handling
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch shared collection:',
        expect.objectContaining({
          message: 'API error: 500 Internal Server Error',
        })
      )
    })

    it('should handle network timeout error', async () => {
      const collectionId = 'timeout-collection'
      service.initializeStore(collectionId, 'shared')

      // Mock network timeout error
      mockFetchError(new Error('Network timeout'))

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error')

      await service.fetchSharedCollection()

      // Verify error handling
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch shared collection:',
        expect.objectContaining({
          message: 'Network timeout',
        })
      )
    })

    it('should handle malformed JSON response', async () => {
      const collectionId = 'malformed-collection'
      service.initializeStore(collectionId, 'shared')

      // Mock fetch to return success status code but JSON parsing fails
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      })

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error')

      await service.fetchSharedCollection()

      // Verify error handling
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch shared collection:',
        expect.objectContaining({
          message: 'Invalid JSON',
        })
      )
    })

    it('should handle different visibility types with error responses', async () => {
      // Test error handling for different visibility types
      const testCases = [
        { visibility: 'shared', status: 429, statusText: 'Too Many Requests' },
        {
          visibility: 'public',
          status: 503,
          statusText: 'Service Unavailable',
        },
        { visibility: 'private', status: 502, statusText: 'Bad Gateway' },
      ]

      for (const testCase of testCases) {
        // Reset mocks
        vi.resetAllMocks()

        const collectionId = 'test-collection'
        service.initializeStore(collectionId, testCase.visibility)

        // Mock error response
        mockFetchResponse(
          { error: testCase.statusText },
          testCase.status,
          testCase.statusText
        )

        // Spy on console.error
        const consoleErrorSpy = vi.spyOn(console, 'error')

        // eslint-disable-next-line no-await-in-loop
        await service.fetchSharedCollection()

        // Verify error handling
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          `Failed to fetch ${testCase.visibility} collection:`,
          expect.objectContaining({
            message: `API error: ${testCase.status} ${testCase.statusText}`,
          })
        )

        // Restore mocks for the next iteration
        vi.restoreAllMocks()
      }
    })
  })
})
