import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type {
  BookmarksStore,
  BookmarkKeyValuePair,
} from '../types/bookmarks.js'
import { prettyPrintJson } from '../utils/pretty-print-json.js'
import { BookmarkStorage } from './bookmark-storage.js'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => {
      return store[key] || null
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear() {
      store = {}
    },
  }
})()

// Replace global localStorage with mock
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

// Add dispatchEvent mock to prevent errors
Object.defineProperty(globalThis, 'dispatchEvent', {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  value() {},
})

describe('BookmarkStorage instance', () => {
  it('should use "utags-bookmarks" as default storage key', async () => {
    // Create a spy on localStorage.getItem
    const getItemSpy = vi.spyOn(localStorage, 'getItem')

    // Create a new instance with default key
    const defaultStorage = new BookmarkStorage()

    // Call a method that uses the storage key
    await defaultStorage.getBookmarksStore()

    // Verify localStorage.getItem was called with the default key
    expect(getItemSpy).toHaveBeenCalledWith('utags-bookmarks')
  })

  it('should keep data isolated between different storage instances', async () => {
    // Create two storage instances with different keys
    const storage1 = new BookmarkStorage('test-storage-1')
    const storage2 = new BookmarkStorage('test-storage-2')

    // Create spies on localStorage methods
    const setItemSpy = vi.spyOn(localStorage, 'setItem')
    const getItemSpy = vi.spyOn(localStorage, 'getItem')

    // Prepare test data for each storage
    const bookmark1 = {
      key: 'https://example1.com',
      entry: {
        tags: ['test1', 'example1'],
        meta: {
          title: 'Example 1',
          created: Date.now(),
          updated: Date.now(),
        },
      },
    }

    const bookmark2 = {
      key: 'https://example2.com',
      entry: {
        tags: ['test2', 'example2'],
        meta: {
          title: 'Example 2',
          created: Date.now(),
          updated: Date.now(),
        },
      },
    }

    // Save bookmarks to each storage
    await storage1.upsertBookmark(bookmark1.key, bookmark1.entry)
    await storage2.upsertBookmark(bookmark2.key, bookmark2.entry)

    // Verify localStorage.setItem was called with different keys
    expect(setItemSpy).toHaveBeenCalledWith(
      'test-storage-1',
      expect.any(String)
    )
    expect(setItemSpy).toHaveBeenCalledWith(
      'test-storage-2',
      expect.any(String)
    )

    // Reset the spies to check getItem calls
    getItemSpy.mockClear()

    // Get bookmarks from each storage
    const store1 = await storage1.getBookmarksStore()
    const store2 = await storage2.getBookmarksStore()

    // Verify localStorage.getItem was called with different keys
    expect(getItemSpy).toHaveBeenCalledWith('test-storage-1')
    expect(getItemSpy).toHaveBeenCalledWith('test-storage-2')

    // Verify each storage has its own data
    expect(store1.data[bookmark1.key]).toBeDefined()
    expect(store1.data[bookmark2.key]).toBeUndefined()
    expect(store2.data[bookmark2.key]).toBeDefined()
    expect(store2.data[bookmark1.key]).toBeUndefined()

    // Verify the data is correct
    expect(store1.data[bookmark1.key].tags).toEqual(bookmark1.entry.tags)
    expect(store2.data[bookmark2.key].tags).toEqual(bookmark2.entry.tags)
  })
})

describe('BookmarkStorage', () => {
  let bookmarkStorage: BookmarkStorage
  const testStorageKey = 'test-utags-bookmarks'

  // Valid bookmark store for testing
  const validBookmarksStore: BookmarksStore = {
    data: {
      'https://example.com': {
        tags: ['example', 'test'],
        meta: {
          title: 'Example Website',
          created: Date.now(),
          updated: Date.now(),
        },
      },

      'https://test.org': {
        tags: ['test', 'organization'],
        meta: {
          title: 'Test Organization',
          created: Date.now(),
          updated: Date.now(),
        },
      },
    },
    meta: {
      databaseVersion: 3,
      created: Date.now(),
      updated: Date.now(),
    },
  }

  // Setup before each test
  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear()
    vi.clearAllMocks()

    // Create a new instance with test storage key
    bookmarkStorage = new BookmarkStorage(testStorageKey)
  })

  describe('persistBookmarksStore', () => {
    it('should save valid bookmark store to localStorage', async () => {
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Verify localStorage.setItem was called with correct parameters
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        testStorageKey,
        expect.any(String)
      )

      // Verify the saved data is correct
      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls[0][1]
      ) as BookmarksStore
      expect(savedData).toEqual(validBookmarksStore)
    })

    it('should validate bookmark store before saving', async () => {
      // Create a spy on the validateBookmarksStore method
      const validateSpy = vi.spyOn(
        bookmarkStorage as any,
        'validateBookmarksStore'
      )

      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Verify validation was called
      expect(validateSpy).toHaveBeenCalledTimes(1)
      expect(validateSpy).toHaveBeenCalledWith(validBookmarksStore, false)
    })

    it('should skip validation when skipValidation is true', async () => {
      // Create a spy on the validateBookmarksStore method
      const validateSpy = vi.spyOn(
        bookmarkStorage as any,
        'validateBookmarksStore'
      )

      await bookmarkStorage.persistBookmarksStore(validBookmarksStore, true)

      // Verify validation was not called
      expect(validateSpy).not.toHaveBeenCalled()
    })

    it('should throw error when saving invalid data', async () => {
      // Invalid bookmark store missing required fields

      const invalidStore = {
        data: {},
        // Missing meta field
      } as any

      // Expect the save operation to throw an error
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        bookmarkStorage.persistBookmarksStore(invalidStore)
      ).rejects.toThrow()
    })

    it('should throw error when databaseVersion is not a number', async () => {
      // Invalid bookmark store with non-numeric databaseVersion

      const invalidVersionStore = {
        data: {},
        meta: {
          databaseVersion: '3', // String instead of number
          created: Date.now(),
          updated: Date.now(),
        },
      } as any

      // Expect the save operation to throw an error
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        bookmarkStorage.persistBookmarksStore(invalidVersionStore)
      ).rejects.toThrow(
        'Invalid bookmark store format: databaseVersion must be a number'
      )
    })

    it('should throw error when databaseVersion is greater than current version', async () => {
      // Invalid bookmark store with future version
      const futureVersionStore = {
        data: {},
        meta: {
          databaseVersion: 4, // Greater than current version (3)
          created: Date.now(),
          updated: Date.now(),
        },
      }

      // Expect the save operation to throw an error
      await expect(
        bookmarkStorage.persistBookmarksStore(futureVersionStore)
      ).rejects.toThrow(/Incompatible database version/)
    })

    it('should throw error when localStorage fails', async () => {
      // Mock localStorage.setItem to throw an error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })

      // Expect the save operation to throw an error
      await expect(
        bookmarkStorage.persistBookmarksStore(validBookmarksStore)
      ).rejects.toThrow()
    })
  })

  describe('getBookmarksStore', () => {
    it('should return empty store with current database version', async () => {
      // Setup empty localStorage
      localStorageMock.getItem.mockReturnValueOnce(null)

      // Get the result from getBookmarksStore
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify the database version matches the current version
      expect(result.meta.databaseVersion).toBe(3) // Current version is 3
    })

    it('should return empty store when localStorage is empty', async () => {
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify localStorage.getItem was called
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(1)
      expect(localStorageMock.getItem).toHaveBeenCalledWith(testStorageKey)

      // Verify the result is an empty initialized store
      expect(result).toEqual({
        data: {},
        meta: {
          databaseVersion: 3, // Current version

          created: expect.any(Number),

          updated: expect.any(Number),
        },
      })
    })

    it('should return parsed data from localStorage', async () => {
      // Setup localStorage with valid data
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify(validBookmarksStore)
      )

      const result = await bookmarkStorage.getBookmarksStore()

      // Verify the result matches the stored data
      expect(result).toEqual(validBookmarksStore)
    })

    it('should validate data retrieved from localStorage', async () => {
      // Setup localStorage with valid data
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify(validBookmarksStore)
      )

      // Create a spy on the validateBookmarksStore method
      const validateSpy = vi.spyOn(
        bookmarkStorage as any,
        'validateBookmarksStore'
      )

      await bookmarkStorage.getBookmarksStore()

      // Verify validation was called
      expect(validateSpy).toHaveBeenCalledTimes(1)
      expect(validateSpy).toHaveBeenCalledWith(validBookmarksStore)
    })

    it('should throw error when localStorage contains invalid JSON', async () => {
      // Setup localStorage with invalid JSON
      localStorageMock.getItem.mockReturnValueOnce('invalid json')

      // Expect the get operation to throw an error
      await expect(bookmarkStorage.getBookmarksStore()).rejects.toThrow()
    })

    it('should throw error when data structure is invalid', async () => {
      // Setup localStorage with invalid data structure
      const invalidData = { foo: 'bar' }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(invalidData))

      // Expect the get operation to throw an error
      await expect(bookmarkStorage.getBookmarksStore()).rejects.toThrow()
    })

    it('should throw error when database version is incompatible', async () => {
      // Setup localStorage with future version
      const futureVersionData = {
        ...validBookmarksStore,
        meta: {
          ...validBookmarksStore.meta,
          databaseVersion: 999, // Future version
        },
      }
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify(futureVersionData)
      )

      // Expect the get operation to throw an error
      await expect(bookmarkStorage.getBookmarksStore()).rejects.toThrow(
        /Incompatible database version/
      )
    })

    it('should migrate data when database version is older', async () => {
      // Setup localStorage with older version
      const olderVersionData = {
        ...validBookmarksStore,
        meta: {
          ...validBookmarksStore.meta,
          databaseVersion: 1, // Older version
        },
      }
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify(olderVersionData)
      )

      // Create a spy on the migrateBookmarksStore method
      const migrateSpy = vi.spyOn(
        bookmarkStorage as any,
        'migrateBookmarksStore'
      )

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      const result = await bookmarkStorage.getBookmarksStore()

      // Verify migration was called
      expect(migrateSpy).toHaveBeenCalledTimes(1)
      expect(migrateSpy).toHaveBeenCalledWith(olderVersionData, 1, true)

      // Verify persistBookmarksStore was called with skipValidation=true
      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledWith(expect.any(Object), true)

      // Verify the database version matches the current version
      expect(result.meta.databaseVersion).toBe(3) // Current version is 3
    })

    it('should handle persistBookmarksStore failure during migration without throwing', async () => {
      // Setup localStorage with older version
      const olderVersionData = {
        ...validBookmarksStore,
        meta: {
          ...validBookmarksStore.meta,
          databaseVersion: 1, // Old version
        },
      }
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify(olderVersionData)
      )

      // Create a spy on migrateBookmarksStore method
      const migrateSpy = vi.spyOn(
        bookmarkStorage as any,
        'migrateBookmarksStore'
      )

      // Create a spy on persistBookmarksStore method and mock throwing an exception
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const saveSpy = vi
        .spyOn(bookmarkStorage, 'persistBookmarksStore')
        .mockImplementationOnce(() => {
          throw new Error('Mock save failure')
        })

      // Call the method - should not throw an exception
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify migration method was called
      expect(migrateSpy).toHaveBeenCalledTimes(1)
      expect(migrateSpy).toHaveBeenCalledWith(olderVersionData, 1, true)

      // Verify persistBookmarksStore was called
      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledWith(expect.any(Object), true)

      // Verify error was logged to console
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save migrated bookmarks:',
        expect.objectContaining({
          message: 'Mock save failure',
        })
      )

      // Verify database version has been updated to current version
      expect(result.meta.databaseVersion).toBe(3) // Current version is 3

      // Restore original console.error implementation
      consoleSpy.mockRestore()
    })
  })

  describe('batchUpdateBookmarks', () => {
    it('should handle both deletions and modifications in a single operation', async () => {
      // Setup initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Prepare test data
      const deletions = ['https://example.com']
      const modifications: BookmarkKeyValuePair[] = [
        [
          'https://test.org',
          {
            tags: ['test', 'organization', 'updated'],
            meta: {
              title: 'Updated Test Organization',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
        [
          'https://new.com',
          {
            tags: ['new'],
            meta: {
              title: 'New Website',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      await bookmarkStorage.batchUpdateBookmarks(deletions, modifications)
      const store = await bookmarkStorage.getBookmarksStore()

      // Verify deletions
      expect(store.data['https://example.com']).toBeUndefined()

      // Verify modifications
      expect(store.data['https://test.org'].tags).toContain('updated')
      expect(store.data['https://test.org'].meta.title).toBe(
        'Updated Test Organization'
      )
      expect(store.data['https://new.com']).toBeDefined()
      expect(store.data['https://new.com'].tags).toEqual(['new'])
    })

    it('should handle empty deletions and modifications arrays', async () => {
      // Setup initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)
      const initialStore = await bookmarkStorage.getBookmarksStore()

      // Call with empty arrays
      await bookmarkStorage.batchUpdateBookmarks([], [])
      const store = await bookmarkStorage.getBookmarksStore()

      // Verify no changes were made
      expect(store.data).toEqual(initialStore.data)
      expect(store.meta.updated).toBe(initialStore.meta.updated)
    })

    it('should only persist changes when actual modifications occur', async () => {
      // Setup initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)
      const initialStore = await bookmarkStorage.getBookmarksStore()

      // Try to delete non-existent bookmark
      await bookmarkStorage.batchUpdateBookmarks(
        ['https://nonexistent.com'],
        []
      )
      const store = await bookmarkStorage.getBookmarksStore()

      // Verify no changes were made
      expect(store.data).toEqual(initialStore.data)
      expect(store.meta.updated).toBe(initialStore.meta.updated)
    })

    it('should throw error when getBookmarksStore fails', async () => {
      vi.spyOn(bookmarkStorage, 'getBookmarksStore').mockRejectedValueOnce(
        new Error('Failed to get store')
      )

      await expect(
        bookmarkStorage.batchUpdateBookmarks(
          ['https://example.com'],
          [
            [
              'https://new.com',
              { tags: [], meta: { title: '', created: 0, updated: 0 } },
            ],
          ]
        )
      ).rejects.toThrow('Failed to get store')
    })

    it('should throw error when persistBookmarksStore fails', async () => {
      vi.spyOn(bookmarkStorage, 'persistBookmarksStore').mockRejectedValueOnce(
        new Error('Failed to save store')
      )

      await expect(
        bookmarkStorage.batchUpdateBookmarks(
          ['https://example.com'],
          [
            [
              'https://new.com',
              { tags: [], meta: { title: '', created: 0, updated: 0 } },
            ],
          ]
        )
      ).rejects.toThrow('Failed to save store')
    })
  })

  describe('overwriteBookmarks', () => {
    it('should replace existing bookmarks data with new data', async () => {
      // Initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      const newData = {
        'https://newsite.com': {
          tags: ['new', 'site'],
          meta: {
            title: 'New Site',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      }

      await bookmarkStorage.overwriteBookmarks(newData)
      const store = await bookmarkStorage.getBookmarksStore()

      expect(store.data).toEqual(newData)
      expect(store.data['https://example.com']).toBeUndefined()
    })

    it('should update the meta.updated timestamp', async () => {
      // Initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)
      const initialStore = await bookmarkStorage.getBookmarksStore()
      const initialCreatedTimestamp = initialStore.meta.created
      const initialUpdatedTimestamp = initialStore.meta.updated!

      // Ensure some time passes for the timestamp to be different
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))

      const newData = {
        'https://anothersite.com': {
          tags: ['another'],
          meta: {
            title: 'Another Site',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      }
      await bookmarkStorage.overwriteBookmarks(newData)
      const updatedStore = await bookmarkStorage.getBookmarksStore()

      expect(updatedStore.meta.created).toEqual(initialCreatedTimestamp)
      expect(updatedStore.meta.updated).toBeGreaterThan(initialUpdatedTimestamp)
    })

    it('should call persistBookmarksStore with skipValidation true', async () => {
      const persistBookmarksStoreSpy = vi.spyOn(
        bookmarkStorage,
        'persistBookmarksStore'
      )
      const newData = {
        'https://yetanothersite.com': {
          tags: ['yet', 'another'],
          meta: {
            title: 'Yet Another Site',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      }

      await bookmarkStorage.overwriteBookmarks(newData)

      expect(persistBookmarksStoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: newData,
        }),
        true
      )
    })

    it('should throw an error if getBookmarksStore fails', async () => {
      vi.spyOn(bookmarkStorage, 'getBookmarksStore').mockRejectedValueOnce(
        new Error('Failed to get store')
      )
      const newData = {
        'https://site.com': {
          tags: [],
          meta: { title: '', created: 0, updated: 0 },
        },
      }
      await expect(bookmarkStorage.overwriteBookmarks(newData)).rejects.toThrow(
        'Failed to get store'
      )
    })

    it('should throw an error if persistBookmarksStore fails', async () => {
      vi.spyOn(bookmarkStorage, 'persistBookmarksStore').mockRejectedValueOnce(
        new Error('Failed to save store')
      )
      const newData = {
        'https://site.com': {
          tags: [],
          meta: { title: '', created: 0, updated: 0 },
        },
      }
      await expect(bookmarkStorage.overwriteBookmarks(newData)).rejects.toThrow(
        'Failed to save store'
      )
    })
  })

  describe('upsertBookmarksFromData', () => {
    it('should add new bookmarks to existing data', async () => {
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)
      const initialDataCount = Object.keys(validBookmarksStore.data).length

      const newDataToMerge = {
        'https://mergedsite.com': {
          tags: ['merged', 'new'],
          meta: {
            title: 'Merged Site',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      }

      await bookmarkStorage.upsertBookmarksFromData(newDataToMerge)
      const store = await bookmarkStorage.getBookmarksStore()

      expect(Object.keys(store.data).length).toBe(initialDataCount + 1)
      expect(store.data['https://mergedsite.com']).toEqual(
        newDataToMerge['https://mergedsite.com']
      )
      expect(store.data['https://example.com']).toEqual(
        validBookmarksStore.data['https://example.com']
      )
    })

    it('should update existing bookmarks', async () => {
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      const updatedData = {
        'https://example.com': {
          tags: ['example', 'test', 'updated'], // Added 'updated' tag
          meta: {
            title: 'Example Website Updated',
            created:
              validBookmarksStore.data['https://example.com'].meta.created, // Keep original creation date
            updated: Date.now(), // New update timestamp
          },
        },
      }

      await bookmarkStorage.upsertBookmarksFromData(updatedData)
      const store = await bookmarkStorage.getBookmarksStore()

      expect(store.data['https://example.com'].tags).toContain('updated')
      expect(store.data['https://example.com'].meta.title).toBe(
        'Example Website Updated'
      )
      expect(store.data['https://example.com'].meta.updated).not.toBe(
        validBookmarksStore.data['https://example.com'].meta.updated
      )
    })

    it('should call upsertBookmarks with the correct data', async () => {
      const upsertBookmarksSpy = vi.spyOn(bookmarkStorage, 'upsertBookmarks')
      const dataToMerge = {
        'https://somesite.com': {
          tags: ['some', 'site'],
          meta: {
            title: 'Some Site',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      }
      const expectedBookmarksToUpdate: BookmarkKeyValuePair[] = Object.entries(
        dataToMerge
      ) as BookmarkKeyValuePair[]

      await bookmarkStorage.upsertBookmarksFromData(dataToMerge)

      expect(upsertBookmarksSpy).toHaveBeenCalledWith(expectedBookmarksToUpdate)
    })

    it('should throw an error if upsertBookmarks fails', async () => {
      vi.spyOn(bookmarkStorage, 'upsertBookmarks').mockRejectedValueOnce(
        new Error('Failed to update bookmarks')
      )
      const dataToMerge = {
        'https://site.com': {
          tags: [],
          meta: { title: '', created: 0, updated: 0 },
        },
      }
      await expect(
        bookmarkStorage.upsertBookmarksFromData(dataToMerge)
      ).rejects.toThrow('Failed to update bookmarks')
    })
  })

  describe('getAllBookmarksAsEntries', () => {
    it('should return an empty array when no bookmarks exist', async () => {
      // Setup empty localStorage
      localStorageMock.getItem.mockReturnValueOnce(null)

      const result = await bookmarkStorage.getAllBookmarksAsEntries()

      // Verify result is an empty array
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should convert bookmarks data to key-value pairs array', async () => {
      // Setup localStorage by saving valid data through the API
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      const result = await bookmarkStorage.getAllBookmarksAsEntries()

      // Verify result is an array of key-value pairs
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2) // Two bookmarks in the test data

      // Verify structure of the array items
      expect(result[0][0]).toBe('https://example.com')
      expect(result[0][1].tags).toContain('example')
      expect(result[0][1].tags).toContain('test')
      expect(result[0][1].meta.title).toBe('Example Website')

      expect(result[1][0]).toBe('https://test.org')
      expect(result[1][1].tags).toContain('test')
      expect(result[1][1].tags).toContain('organization')
      expect(result[1][1].meta.title).toBe('Test Organization')
    })

    it('should maintain the original data structure in the array', async () => {
      // Setup localStorage by saving valid data through the API
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      const result = await bookmarkStorage.getAllBookmarksAsEntries()

      // Verify the array entries match the original data structure
      const originalEntries = Object.entries(validBookmarksStore.data)

      expect(result).toEqual(originalEntries)

      // Deep check of the first entry
      const firstBookmark = result[0][1]
      const originalFirstBookmark =
        validBookmarksStore.data['https://example.com']

      expect(firstBookmark).toEqual(originalFirstBookmark)
    })

    it('should throw error when getBookmarksStore fails', async () => {
      // Create a spy on getBookmarksStore to simulate failure
      vi.spyOn(bookmarkStorage, 'getBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to retrieve bookmarks')
        }
      )

      // Expect the operation to throw an error
      await expect(bookmarkStorage.getAllBookmarksAsEntries()).rejects.toThrow(
        'Failed to retrieve bookmarks'
      )
    })

    it('should call getBookmarksStore method', async () => {
      // Create a spy on getBookmarksStore
      const getBookmarksStoreSpy = vi.spyOn(
        bookmarkStorage,
        'getBookmarksStore'
      )

      // Setup localStorage with valid data
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify(validBookmarksStore)
      )

      await bookmarkStorage.getAllBookmarksAsEntries()

      // Verify getBookmarksStore was called
      expect(getBookmarksStoreSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('getBookmarkEntriesByKeys', () => {
    it('should return bookmarks array for specified keys', async () => {
      // Setup localStorage with valid data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Prepare keys to retrieve
      const keysToRetrieve = ['https://example.com']

      const result =
        await bookmarkStorage.getBookmarkEntriesByKeys(keysToRetrieve)

      // Verify result is an array
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1) // Should return only one bookmark

      // Verify bookmark data structure
      expect(result[0][0]).toBe('https://example.com')
      expect(result[0][1].tags).toContain('example')
      expect(result[0][1].tags).toContain('test')
      expect(result[0][1].meta.title).toBe('Example Website')
    })

    it('should return multiple bookmarks for multiple keys', async () => {
      // Setup localStorage with valid data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Prepare multiple keys to retrieve
      const keysToRetrieve = ['https://example.com', 'https://test.org']

      const result =
        await bookmarkStorage.getBookmarkEntriesByKeys(keysToRetrieve)

      // Verify result contains two bookmarks
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)

      // Verify bookmarks order matches the requested keys order
      expect(result[0][0]).toBe('https://example.com')
      expect(result[1][0]).toBe('https://test.org')

      // Verify first bookmark data
      expect(result[0][1].tags).toEqual(['example', 'test'])
      expect(result[0][1].meta.title).toBe('Example Website')

      // Verify second bookmark data
      expect(result[1][1].tags).toEqual(['test', 'organization'])
      expect(result[1][1].meta.title).toBe('Test Organization')
    })

    it('should ignore non-existent keys', async () => {
      // Setup localStorage with valid data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Prepare keys including non-existent ones
      const keysToRetrieve = [
        'https://example.com',
        'https://non-existent.com',
        'https://test.org',
      ]

      const result =
        await bookmarkStorage.getBookmarkEntriesByKeys(keysToRetrieve)

      // Verify result only contains existing bookmarks
      expect(result.length).toBe(2)

      // Verify returned bookmark URLs
      const returnedUrls = result.map((item) => item[0])
      expect(returnedUrls).toContain('https://example.com')
      expect(returnedUrls).toContain('https://test.org')
      expect(returnedUrls).not.toContain('https://non-existent.com')
    })

    it('should return empty array when all keys are non-existent', async () => {
      // Setup localStorage with valid data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Prepare non-existent keys
      const keysToRetrieve = [
        'https://non-existent1.com',
        'https://non-existent2.com',
      ]

      const result =
        await bookmarkStorage.getBookmarkEntriesByKeys(keysToRetrieve)

      // Verify result is an empty array
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should return empty array for empty keys array', async () => {
      // Setup localStorage with valid data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Pass empty array
      const result = await bookmarkStorage.getBookmarkEntriesByKeys([])

      // Verify result is an empty array
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should return empty array when localStorage is empty', async () => {
      // Ensure localStorage is empty
      localStorageMock.clear()

      // Prepare keys to retrieve
      const keysToRetrieve = ['https://example.com', 'https://test.org']

      const result =
        await bookmarkStorage.getBookmarkEntriesByKeys(keysToRetrieve)

      // Verify result is an empty array
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should throw error when getBookmarksStore fails', async () => {
      // Mock getBookmarksStore to simulate failure
      vi.spyOn(bookmarkStorage, 'getBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to retrieve bookmarks store')
        }
      )

      // Prepare keys to retrieve
      const keysToRetrieve = ['https://example.com']

      // Expect operation to throw error
      await expect(
        bookmarkStorage.getBookmarkEntriesByKeys(keysToRetrieve)
      ).rejects.toThrow('Failed to retrieve bookmarks store')
    })
  })

  describe('upsertBookmarks', () => {
    it('should batch update multiple bookmarks', async () => {
      // Save initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Prepare update data
      const updatedBookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example.com',
          {
            tags: ['example', 'test', 'updated'],
            meta: {
              title: 'Updated Example Website',
              created:
                validBookmarksStore.data['https://example.com'].meta.created,
              updated: Date.now(),
            },
          },
        ],
        [
          'https://new-site.com',
          {
            tags: ['new', 'site'],
            meta: {
              title: 'New Website',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      // Execute batch update
      await bookmarkStorage.upsertBookmarks(updatedBookmarks)

      // Get updated data
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify update results
      expect(result.data['https://example.com'].tags).toContain('updated')
      expect(result.data['https://example.com'].meta.title).toBe(
        'Updated Example Website'
      )
      expect(result.data['https://new-site.com']).toBeDefined()
      expect(result.data['https://new-site.com'].tags).toContain('new')
      expect(result.data['https://new-site.com'].tags).toContain('site')

      // Verify original data still exists
      expect(result.data['https://test.org']).toBeDefined()
    })

    it('should update metadata timestamp', async () => {
      // Save initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Record timestamp before update
      const beforeUpdate = validBookmarksStore.meta.updated!

      // Wait a short time to ensure timestamp will be different
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Prepare update data
      const updatedBookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example.com',
          {
            tags: ['updated'],
            meta: {
              title: 'Updated Title',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      // Execute batch update
      await bookmarkStorage.upsertBookmarks(updatedBookmarks)

      // Get updated data
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify metadata timestamp has been updated
      expect(result.meta.updated).toBeGreaterThan(beforeUpdate)
    })

    it('should skip validation during update', async () => {
      // Save initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Prepare update data
      const updatedBookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example.com',
          {
            tags: ['updated'],
            meta: {
              title: 'Updated Title',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      // Execute batch update
      await bookmarkStorage.upsertBookmarks(updatedBookmarks)

      // Verify persistBookmarksStore was called with skipValidation parameter
      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledWith(expect.any(Object), true)
    })

    it('should throw error when getBookmarksStore fails', async () => {
      // Mock getBookmarksStore method to fail
      vi.spyOn(bookmarkStorage, 'getBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to retrieve bookmarks')
        }
      )

      // Prepare update data
      const updatedBookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example.com',
          {
            tags: ['updated'],
            meta: {
              title: 'Updated Title',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      // Expect operation to throw error
      await expect(
        bookmarkStorage.upsertBookmarks(updatedBookmarks)
      ).rejects.toThrow('Failed to retrieve bookmarks')
    })

    it('should throw error when persistBookmarksStore fails', async () => {
      // Save initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Mock persistBookmarksStore method to fail
      vi.spyOn(bookmarkStorage, 'persistBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to save bookmarks')
        }
      )

      // Prepare update data
      const updatedBookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example.com',
          {
            tags: ['updated'],
            meta: {
              title: 'Updated Title',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      // Expect operation to throw error
      await expect(
        bookmarkStorage.upsertBookmarks(updatedBookmarks)
      ).rejects.toThrow('Failed to save bookmarks')
    })

    it('should handle empty array input', async () => {
      // Save initial data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Record data before update
      const beforeUpdate = await bookmarkStorage.getBookmarksStore()

      // Execute batch update with empty array
      await bookmarkStorage.upsertBookmarks([])

      // Get data after update
      const afterUpdate = await bookmarkStorage.getBookmarksStore()

      // Verify data content hasn't changed, but timestamp has been updated
      expect(Object.keys(afterUpdate.data)).toEqual(
        Object.keys(beforeUpdate.data)
      )
      expect(afterUpdate.meta.updated).toEqual(beforeUpdate.meta.updated!)
    })
  })

  describe('upsertBookmark', () => {
    it('should save a new bookmark to localStorage', async () => {
      // Setup empty localStorage
      localStorageMock.getItem.mockReturnValueOnce(null)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Prepare bookmark data
      const bookmarkKey = 'https://example.com'
      const bookmarkData = {
        tags: ['example', 'test'],
        meta: {
          title: 'Example Website',
          created: Date.now(),
          updated: Date.now(),
        },
      }

      // Save the bookmark
      await bookmarkStorage.upsertBookmark(bookmarkKey, bookmarkData)

      // Verify persistBookmarksStore was called with skipValidation
      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            [bookmarkKey]: bookmarkData,
          }),
        }),
        true
      )

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify bookmark was saved correctly
      expect(result.data[bookmarkKey]).toBeDefined()
      expect(result.data[bookmarkKey].tags).toEqual(bookmarkData.tags)
      expect(result.data[bookmarkKey].meta.title).toBe(bookmarkData.meta.title)
    })

    it('should update an existing bookmark', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Prepare updated bookmark data
      const bookmarkKey = 'https://example.com'
      const updatedBookmarkData = {
        tags: ['example', 'updated'],
        meta: {
          title: 'Updated Example Website',
          created: validBookmarksStore.data[bookmarkKey].meta.created,
          updated: Date.now(),
        },
      }

      // Save the updated bookmark
      await bookmarkStorage.upsertBookmark(bookmarkKey, updatedBookmarkData)

      // Verify persistBookmarksStore was called
      expect(saveSpy).toHaveBeenCalledTimes(1)

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify bookmark was updated correctly
      expect(result.data[bookmarkKey].tags).toContain('updated')
      expect(result.data[bookmarkKey].meta.title).toBe(
        'Updated Example Website'
      )

      // Verify other bookmarks remain unchanged
      expect(result.data['https://test.org']).toEqual(
        validBookmarksStore.data['https://test.org']
      )
    })

    it('should update the store metadata timestamp', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Record timestamp before update
      const beforeUpdate = validBookmarksStore.meta.updated!

      // Wait a short time to ensure timestamp will be different
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Prepare bookmark data
      const bookmarkKey = 'https://example.com'
      const bookmarkData = {
        tags: ['example', 'test'],
        meta: {
          title: 'Example Website',
          created: Date.now(),
          updated: Date.now(),
        },
      }

      // Save the bookmark
      await bookmarkStorage.upsertBookmark(bookmarkKey, bookmarkData)

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify metadata timestamp has been updated
      expect(result.meta.updated).toBeGreaterThan(beforeUpdate)
    })

    it('should call getBookmarksStore and persistBookmarksStore methods', async () => {
      // Create spies on both methods
      const getSpy = vi.spyOn(bookmarkStorage, 'getBookmarksStore')
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Prepare bookmark data
      const bookmarkKey = 'https://example.com'
      const bookmarkData = {
        tags: ['example', 'test'],
        meta: {
          title: 'Example Website',
          created: Date.now(),
          updated: Date.now(),
        },
      }

      // Save the bookmark
      await bookmarkStorage.upsertBookmark(bookmarkKey, bookmarkData)

      // Verify both methods were called
      expect(getSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledWith(expect.any(Object), true)
    })

    it('should throw error when getBookmarksStore fails', async () => {
      // Mock getBookmarksStore method to fail
      vi.spyOn(bookmarkStorage, 'getBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to retrieve bookmarks')
        }
      )

      // Prepare bookmark data
      const bookmarkKey = 'https://example.com'
      const bookmarkData = {
        tags: ['example', 'test'],
        meta: {
          title: 'Example Website',
          created: Date.now(),
          updated: Date.now(),
        },
      }

      // Expect operation to throw error
      await expect(
        bookmarkStorage.upsertBookmark(bookmarkKey, bookmarkData)
      ).rejects.toThrow('Failed to retrieve bookmarks')
    })

    it('should throw error when persistBookmarksStore fails', async () => {
      // Mock persistBookmarksStore method to fail
      vi.spyOn(bookmarkStorage, 'persistBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to save bookmarks')
        }
      )

      // Prepare bookmark data
      const bookmarkKey = 'https://example.com'
      const bookmarkData = {
        tags: ['example', 'test'],
        meta: {
          title: 'Example Website',
          created: Date.now(),
          updated: Date.now(),
        },
      }

      // Expect operation to throw error
      await expect(
        bookmarkStorage.upsertBookmark(bookmarkKey, bookmarkData)
      ).rejects.toThrow('Failed to save bookmarks')
    })
  })

  describe('deleteBookmark', () => {
    it('should delete an existing bookmark from localStorage', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Bookmark key to delete
      const bookmarkKey = 'https://example.com'

      // Delete the bookmark
      await bookmarkStorage.deleteBookmark(bookmarkKey)

      // Verify persistBookmarksStore was called with skipValidation
      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            [bookmarkKey]: expect.anything(),
          }),
        }),
        true
      )

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify bookmark was deleted
      expect(result.data[bookmarkKey]).toBeUndefined()

      // Verify other bookmarks remain unchanged
      expect(result.data['https://test.org']).toBeDefined()
      expect(result.data['https://test.org']).toEqual(
        validBookmarksStore.data['https://test.org']
      )
    })

    it('should update the store metadata timestamp when deleting a bookmark', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Record timestamp before deletion
      const beforeDelete = validBookmarksStore.meta.updated!

      // Wait a short time to ensure timestamp will be different
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Bookmark key to delete
      const bookmarkKey = 'https://example.com'

      // Delete the bookmark
      await bookmarkStorage.deleteBookmark(bookmarkKey)

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify metadata timestamp has been updated
      expect(result.meta.updated).toBeGreaterThan(beforeDelete)
    })

    it('should not modify localStorage when bookmark does not exist', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Non-existent bookmark key
      const nonExistentKey = 'https://non-existent.com'

      // Delete the non-existent bookmark
      await bookmarkStorage.deleteBookmark(nonExistentKey)

      // Verify persistBookmarksStore was not called
      expect(saveSpy).not.toHaveBeenCalled()

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify data remains unchanged
      expect(Object.keys(result.data)).toEqual(
        Object.keys(validBookmarksStore.data)
      )
    })

    it('should call getBookmarksStore method', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on getBookmarksStore method
      const getSpy = vi.spyOn(bookmarkStorage, 'getBookmarksStore')

      // Bookmark key to delete
      const bookmarkKey = 'https://example.com'

      // Delete the bookmark
      await bookmarkStorage.deleteBookmark(bookmarkKey)

      // Verify getBookmarksStore was called
      expect(getSpy).toHaveBeenCalledTimes(1)
    })

    it('should throw error when getBookmarksStore fails', async () => {
      // Mock getBookmarksStore method to fail
      vi.spyOn(bookmarkStorage, 'getBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to retrieve bookmarks')
        }
      )

      // Bookmark key to delete
      const bookmarkKey = 'https://example.com'

      // Expect operation to throw error
      await expect(bookmarkStorage.deleteBookmark(bookmarkKey)).rejects.toThrow(
        'Failed to retrieve bookmarks'
      )
    })

    it('should throw error when persistBookmarksStore fails', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Mock persistBookmarksStore method to fail
      vi.spyOn(bookmarkStorage, 'persistBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to save bookmarks')
        }
      )

      // Bookmark key to delete
      const bookmarkKey = 'https://example.com'

      // Expect operation to throw error
      await expect(bookmarkStorage.deleteBookmark(bookmarkKey)).rejects.toThrow(
        'Failed to save bookmarks'
      )
    })
  })

  describe('deleteBookmarks', () => {
    it('should delete multiple existing bookmarks from localStorage', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Bookmark keys to delete
      const bookmarkKeysToDelete = ['https://example.com', 'https://test.org']

      // Delete the bookmarks
      await bookmarkStorage.deleteBookmarks(bookmarkKeysToDelete)

      // Verify persistBookmarksStore was called with skipValidation
      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            'https://example.com': expect.anything(),

            'https://test.org': expect.anything(),
          }),
        }),
        true
      )

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify bookmarks were deleted
      expect(result.data['https://example.com']).toBeUndefined()
      expect(result.data['https://test.org']).toBeUndefined()
    })

    it('should update the store metadata timestamp when deleting multiple bookmarks', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Record timestamp before deletion
      const beforeDelete = validBookmarksStore.meta.updated!

      // Wait a short time to ensure timestamp will be different
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Bookmark keys to delete
      const bookmarkKeysToDelete = ['https://example.com']

      // Delete the bookmarks
      await bookmarkStorage.deleteBookmarks(bookmarkKeysToDelete)

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify metadata timestamp has been updated
      expect(result.meta.updated).toBeGreaterThan(beforeDelete)
    })

    it('should not modify localStorage when no bookmarks are deleted (keys do not exist)', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Non-existent bookmark keys
      const nonExistentKeys = [
        'https://non-existent1.com',
        'https://non-existent2.com',
      ]

      // Delete the non-existent bookmarks
      await bookmarkStorage.deleteBookmarks(nonExistentKeys)

      // Verify persistBookmarksStore was not called
      expect(saveSpy).not.toHaveBeenCalled()

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify data remains unchanged
      expect(Object.keys(result.data)).toEqual(
        Object.keys(validBookmarksStore.data)
      )
    })

    it('should not modify localStorage when provided with an empty array of keys', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Delete with empty array
      await bookmarkStorage.deleteBookmarks([])

      // Verify persistBookmarksStore was not called
      expect(saveSpy).not.toHaveBeenCalled()

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify data remains unchanged
      expect(Object.keys(result.data)).toEqual(
        Object.keys(validBookmarksStore.data)
      )
    })

    it('should call getBookmarksStore method', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on getBookmarksStore method
      const getSpy = vi.spyOn(bookmarkStorage, 'getBookmarksStore')

      // Bookmark keys to delete
      const bookmarkKeysToDelete = ['https://example.com']

      // Delete the bookmarks
      await bookmarkStorage.deleteBookmarks(bookmarkKeysToDelete)

      // Verify getBookmarksStore was called
      expect(getSpy).toHaveBeenCalledTimes(1)
    })

    it('should throw error when getBookmarksStore fails', async () => {
      // Mock getBookmarksStore method to fail
      vi.spyOn(bookmarkStorage, 'getBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to retrieve bookmarks')
        }
      )

      // Bookmark keys to delete
      const bookmarkKeysToDelete = ['https://example.com']

      // Expect operation to throw error
      await expect(
        bookmarkStorage.deleteBookmarks(bookmarkKeysToDelete)
      ).rejects.toThrow('Failed to retrieve bookmarks')
    })

    it('should throw error when persistBookmarksStore fails', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Mock persistBookmarksStore method to fail
      vi.spyOn(bookmarkStorage, 'persistBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to save bookmarks')
        }
      )

      // Bookmark keys to delete
      const bookmarkKeysToDelete = ['https://example.com']

      // Expect operation to throw error
      await expect(
        bookmarkStorage.deleteBookmarks(bookmarkKeysToDelete)
      ).rejects.toThrow('Failed to save bookmarks')
    })

    it('should delete a mix of existing and non-existing bookmarks', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Bookmark keys to delete, including one that doesn't exist
      const bookmarkKeysToDelete = [
        'https://example.com',
        'https://non-existent.com',
      ]

      // Delete the bookmarks
      await bookmarkStorage.deleteBookmarks(bookmarkKeysToDelete)

      // Verify persistBookmarksStore was called (because at least one existed)
      expect(saveSpy).toHaveBeenCalledTimes(1)

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify existing bookmark was deleted, non-existent was ignored
      expect(result.data['https://example.com']).toBeUndefined()
      expect(result.data['https://test.org']).toBeDefined() // This one should remain
      expect(result.data['https://non-existent.com']).toBeUndefined()
    })
  })

  describe('exportBookmarks', () => {
    it('should export bookmarks as a formatted JSON string', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Export the bookmarks
      const exportedJson = await bookmarkStorage.exportBookmarks()

      // Verify the result is a string
      expect(typeof exportedJson).toBe('string')

      // Parse the exported JSON to verify its structure
      const parsedData = JSON.parse(exportedJson) as BookmarksStore

      // Verify the parsed data matches the original data
      expect(parsedData.data).toEqual(validBookmarksStore.data)
      expect(parsedData.meta.databaseVersion).toEqual(
        validBookmarksStore.meta.databaseVersion
      )
    })

    it('should add an exported timestamp to the metadata', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Export the bookmarks
      const exportedJson = await bookmarkStorage.exportBookmarks()

      // Parse the exported JSON
      const parsedData = JSON.parse(exportedJson) as BookmarksStore

      // Verify an exported timestamp was added
      expect(parsedData.meta.exported).toBeDefined()
      expect(typeof parsedData.meta.exported).toBe('number')

      // Verify the exported timestamp is recent
      const now = Date.now()
      expect(parsedData.meta.exported).toBeLessThanOrEqual(now)
      expect(parsedData.meta.exported).toBeGreaterThan(now - 1000) // Within the last second
    })

    it('should format the JSON with indentation for readability', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Export the bookmarks
      const exportedJson = await bookmarkStorage.exportBookmarks()

      // Verify the JSON is formatted with indentation
      expect(exportedJson).toContain('\n  ') // Check for indented lines

      // Verify the JSON is properly formatted
      const formattedJson = prettyPrintJson(validBookmarksStore)

      // The exported JSON should have similar formatting (ignoring the exported timestamp)
      expect(exportedJson.length).toBeGreaterThan(formattedJson.length - 100) // Approximate check
    })

    it('should call getBookmarksStore method', async () => {
      // Create a spy on getBookmarksStore method
      const getSpy = vi.spyOn(bookmarkStorage, 'getBookmarksStore')

      // Export the bookmarks
      await bookmarkStorage.exportBookmarks()

      // Verify getBookmarksStore was called
      expect(getSpy).toHaveBeenCalledTimes(1)
    })

    it('should export empty bookmarks store when no data exists', async () => {
      // Setup empty localStorage
      localStorageMock.getItem.mockReturnValueOnce(null)

      // Export the bookmarks
      const exportedJson = await bookmarkStorage.exportBookmarks()

      // Parse the exported JSON
      const parsedData = JSON.parse(exportedJson) as BookmarksStore

      // Verify the structure of empty bookmarks store
      expect(Object.keys(parsedData.data)).toHaveLength(0)
      expect(parsedData.meta.databaseVersion).toBe(3) // Current version is 3
      expect(parsedData.meta.exported).toBeDefined()
    })

    it('should throw error when getBookmarksStore fails', async () => {
      // Mock getBookmarksStore method to fail
      vi.spyOn(bookmarkStorage, 'getBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Failed to retrieve bookmarks')
        }
      )

      // Expect operation to throw error
      await expect(bookmarkStorage.exportBookmarks()).rejects.toThrow(
        'Failed to retrieve bookmarks'
      )
    })
  })

  describe('importBookmarks', () => {
    it('should import bookmarks from a valid JSON string', async () => {
      // Setup empty localStorage
      localStorageMock.getItem.mockReturnValueOnce(null)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Prepare import data
      const importData = {
        data: {
          'https://example.com': {
            tags: ['example', 'test'],
            meta: {
              title: 'Example Website',
              created: Date.now(),
              updated: Date.now(),
            },
          },

          'https://test.org': {
            tags: ['test', 'organization'],
            meta: {
              title: 'Test Organization',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        },
        meta: {
          databaseVersion: 3,
          created: Date.now(),
          updated: Date.now(),
        },
      }

      // Convert to JSON string
      const jsonData = JSON.stringify(importData)

      // Import the bookmarks
      await bookmarkStorage.importBookmarks(jsonData)

      // Verify persistBookmarksStore was called with the correct data
      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledWith(importData, true)

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()
      console.log(result)

      // Verify bookmarks were imported correctly
      expect(Object.keys(result.data)).toHaveLength(2)
      expect(result.data['https://example.com']).toBeDefined()
      expect(result.data['https://test.org']).toBeDefined()
      expect(result.data['https://example.com'].tags).toContain('example')
      expect(result.data['https://test.org'].tags).toContain('organization')
    })

    it('should throw error when JSON data is invalid', async () => {
      // Prepare invalid JSON string
      const invalidJson = '{ invalid json }'

      // Expect operation to throw error
      await expect(
        bookmarkStorage.importBookmarks(invalidJson)
      ).rejects.toThrow()
    })

    it('should throw error when imported data structure is invalid', async () => {
      // Prepare JSON with invalid structure
      const invalidData = { foo: 'bar' }
      const jsonData = JSON.stringify(invalidData)

      // Mock persistBookmarksStore to simulate validation failure
      vi.spyOn(bookmarkStorage, 'persistBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Invalid bookmark store format')
        }
      )

      // Expect operation to throw error
      await expect(bookmarkStorage.importBookmarks(jsonData)).rejects.toThrow()
    })

    it('should throw error when imported data has non-numeric databaseVersion', async () => {
      // Prepare JSON with non-numeric databaseVersion
      const invalidVersionData = {
        data: {},
        meta: {
          databaseVersion: '3', // String instead of number
          created: Date.now(),
          updated: Date.now(),
        },
      }
      const jsonData = JSON.stringify(invalidVersionData)

      // Expect operation to throw error
      await expect(bookmarkStorage.importBookmarks(jsonData)).rejects.toThrow(
        'Invalid bookmark store format: databaseVersion must be a number'
      )
    })

    it('should throw error when imported data has NaN databaseVersion', async () => {
      // Prepare JSON with non-numeric databaseVersion
      const invalidVersionData = {
        data: {},
        meta: {
          databaseVersion: Number.NaN, // NaN instead of number
          created: Date.now(),
          updated: Date.now(),
        },
      }
      const jsonData = JSON.stringify(invalidVersionData)

      // Expect operation to throw error
      await expect(bookmarkStorage.importBookmarks(jsonData)).rejects.toThrow(
        'Invalid bookmark store format: databaseVersion must be a number'
      )
    })

    it('should throw error when imported data version is incompatible', async () => {
      // Prepare JSON with incompatible version
      const incompatibleData = {
        data: {},
        meta: {
          databaseVersion: 999, // Future version
          created: Date.now(),
          updated: Date.now(),
        },
      }
      const jsonData = JSON.stringify(incompatibleData)

      // Mock persistBookmarksStore to simulate version incompatibility
      vi.spyOn(bookmarkStorage, 'persistBookmarksStore').mockImplementationOnce(
        () => {
          throw new Error('Incompatible database version')
        }
      )

      // Expect operation to throw error
      await expect(bookmarkStorage.importBookmarks(jsonData)).rejects.toThrow()
    })

    it('should migrate imported data when version is older', async () => {
      // Prepare older version data
      const olderVersionData = {
        data: {
          'https://example-old.com': {
            tags: ['old', 'example'],
            meta: {
              title: 'Old Example Website',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        },
        meta: {
          databaseVersion: 1, // Old version
          created: Date.now(),
          updated: Date.now(),
        },
      }
      const jsonData = JSON.stringify(olderVersionData)

      // Create a spy on validateBookmarksStore method
      const validateSpy = vi.spyOn(
        bookmarkStorage as any,
        'validateBookmarksStore'
      )

      // Execute import operation
      await bookmarkStorage.importBookmarks(jsonData)

      // Get imported data
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify validateBookmarksStore was called
      expect(validateSpy).toHaveBeenCalledTimes(2) // Once for validating imported data, once for getting current data
      expect(validateSpy).toHaveBeenCalledWith(olderVersionData, false) // Validate imported data, do not save after migration
      expect(validateSpy).toHaveBeenNthCalledWith(2, result) // Validate when getting current data

      // Verify imported data exists
      expect(result.data['https://example-old.com']).toBeDefined()
      expect(result.data['https://example-old.com'].tags).toContain('old')

      // Verify database version has been updated to current version
      expect(result.meta.databaseVersion).toBe(3) // Current version is 3
    })

    it('should merge imported bookmarks with existing ones', async () => {
      // Setup localStorage with existing data
      await bookmarkStorage.persistBookmarksStore(validBookmarksStore)

      // Prepare import data with a new bookmark
      const importData = {
        data: {
          'https://new-site.com': {
            tags: ['new', 'site'],
            meta: {
              title: 'New Website',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        },
        meta: {
          databaseVersion: 3,
          created: Date.now(),
          updated: Date.now(),
        },
      }

      // Convert to JSON string
      const jsonData = JSON.stringify(importData)

      // Create a spy on persistBookmarksStore method
      const saveSpy = vi.spyOn(bookmarkStorage, 'persistBookmarksStore')

      // Import the bookmarks
      await bookmarkStorage.importBookmarks(jsonData)

      // Verify persistBookmarksStore was called
      expect(saveSpy).toHaveBeenCalledTimes(1)

      // Get the saved data to verify
      const result = await bookmarkStorage.getBookmarksStore()

      // Verify both existing and new bookmarks are present
      expect(Object.keys(result.data)).toHaveLength(3) // 2 existing + 1 new
      expect(result.data['https://example.com']).toBeDefined()
      expect(result.data['https://test.org']).toBeDefined()
      expect(result.data['https://new-site.com']).toBeDefined()
      expect(result.data['https://new-site.com'].tags).toContain('new')
    })

    it('should log success message when import completes', async () => {
      // Setup spy on console.log
      const consoleSpy = vi.spyOn(console, 'log')

      // Prepare valid import data
      const importData = {
        data: {},
        meta: {
          databaseVersion: 3,
          created: Date.now(),
          updated: Date.now(),
        },
      }

      // Convert to JSON string
      const jsonData = JSON.stringify(importData)

      // Import the bookmarks
      await bookmarkStorage.importBookmarks(jsonData)

      // Verify success message was logged
      expect(consoleSpy).toHaveBeenCalledWith('Bookmarks imported successfully')
    })
  })
})
