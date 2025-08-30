import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { STORAGE_KEY_BOOKMARKS_DELETED } from '../config/constants.js'
import { type BookmarkKeyValuePair } from '../types/bookmarks.js'
import {
  saveDeletedBookmarks,
  removeDeletedBookmarks,
} from './deleted-bookmarks.js'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    removeItem: vi.fn((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key]
    }),
    getAll: () => store,
  }
})()

// Mock settings store
vi.mock('./stores', () => ({
  settings: {
    subscribe: vi.fn((callback) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      callback({ maxDeletedBookmarks: 5 })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {}
    }),
  },
}))

// Mock console.error and console.warn
console.error = vi.fn()
console.warn = vi.fn()

describe('deleted-bookmarks', () => {
  describe('saveDeletedBookmarks', () => {
    beforeEach(() => {
      // Setup localStorage mock
      Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
      })
      localStorageMock.clear()
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    /**
     * Test case for saving a single bookmark
     */
    it('should save a single bookmark to localStorage', () => {
      // Arrange
      const bookmark: BookmarkKeyValuePair = [
        'https://example.com',
        {
          tags: ['test', 'example'],
          meta: {
            created: 1_234_567_890,
            updated: 1_234_567_900,
          },
        },
      ]

      // Act
      const result = saveDeletedBookmarks(bookmark, { actionType: 'DELETE' })

      // Assert
      expect(result).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY_BOOKMARKS_DELETED,
        expect.any(String)
      )

      // Verify the saved data
      const savedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED)!
      ) as BookmarkKeyValuePair[]
      expect(savedData).toHaveLength(1)
      expect(savedData[0][0]).toBe('https://example.com')
      expect(savedData[0][1].tags).toEqual(['test', 'example'])
      expect(savedData[0][1].deletedMeta).toBeDefined()
      expect(savedData[0][1].deletedMeta!.actionType).toBe('DELETE')
      expect(savedData[0][1].deletedMeta!.deleted).toBeGreaterThan(0)
    })

    /**
     * Test case for saving multiple bookmarks
     */
    it('should save multiple bookmarks to localStorage', () => {
      // Arrange
      const bookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example1.com',
          {
            tags: ['test1'],
            meta: {
              created: 1_234_567_890,
              updated: 1_234_567_900,
            },
          },
        ],
        [
          'https://example2.com',
          {
            tags: ['test2'],
            meta: {
              created: 1_234_567_891,
              updated: 1_234_567_901,
            },
          },
        ],
      ]

      // Act
      const result = saveDeletedBookmarks(bookmarks, { actionType: 'IMPORT' })

      // Assert
      expect(result).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1)

      // Verify the saved data
      const savedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED)!
      ) as BookmarkKeyValuePair[]
      expect(savedData).toHaveLength(2)
      expect(savedData[0][0]).toBe('https://example1.com')
      expect(savedData[1][0]).toBe('https://example2.com')
      expect(savedData[0][1].deletedMeta!.actionType).toBe('IMPORT')
      expect(savedData[1][1].deletedMeta!.actionType).toBe('IMPORT')
    })

    /**
     * Test case for appending to existing bookmarks
     */
    it('should append to existing deleted bookmarks', () => {
      // Arrange
      const existingBookmarks: BookmarkKeyValuePair[] = [
        [
          'https://existing.com',
          {
            tags: ['existing'],
            meta: {
              created: 1_234_567_880,
              updated: 1_234_567_885,
            },
            deletedMeta: {
              deleted: 1_234_567_890,
              actionType: 'DELETE',
            },
          },
        ],
      ]

      localStorageMock.setItem(
        STORAGE_KEY_BOOKMARKS_DELETED,
        JSON.stringify(existingBookmarks)
      )

      const newBookmark: BookmarkKeyValuePair = [
        'https://new.com',
        {
          tags: ['new'],
          meta: {
            created: 1_234_567_895,
            updated: 1_234_567_899,
          },
        },
      ]

      // Act
      const result = saveDeletedBookmarks(newBookmark, { actionType: 'SYNC' })

      // Assert
      expect(result).toBe(true)

      // Verify the saved data
      const savedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED)!
      ) as BookmarkKeyValuePair[]
      expect(savedData).toHaveLength(2)
      expect(savedData[0][0]).toBe('https://existing.com')
      expect(savedData[0][1].deletedMeta!.actionType).toBe('DELETE')
      expect(savedData[1][0]).toBe('https://new.com')
      expect(savedData[1][1].deletedMeta!.actionType).toBe('SYNC')
    })

    /**
     * Test case for enforcing maximum entries limit
     */
    it('should enforce maximum entries limit from settings', () => {
      // Arrange - Create more bookmarks than the limit (5)
      const existingBookmarks: BookmarkKeyValuePair[] = Array.from({
        length: 4,
      })
        .fill(0)
        .map((_, i) => [
          `https://existing${i}.com`,
          {
            tags: [`existing${i}`],
            meta: {
              created: 1_234_567_880 + i,
              updated: 1_234_567_885 + i,
            },
            deletedMeta: {
              deleted: 1_234_567_890 + i,
              actionType: 'DELETE',
            },
          },
        ])

      localStorageMock.setItem(
        STORAGE_KEY_BOOKMARKS_DELETED,
        JSON.stringify(existingBookmarks)
      )

      const newBookmarks: BookmarkKeyValuePair[] = [
        [
          'https://new1.com',
          {
            tags: ['new1'],
            meta: {
              created: 1_234_567_900,
              updated: 1_234_567_910,
            },
          },
        ],
        [
          'https://new2.com',
          {
            tags: ['new2'],
            meta: {
              created: 1_234_567_901,
              updated: 1_234_567_911,
            },
          },
        ],
      ]

      // Act
      const result = saveDeletedBookmarks(newBookmarks, {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(true)

      // Verify the saved data - should only have 5 entries (maxDeletedBookmarks)
      const savedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED)!
      ) as BookmarkKeyValuePair[]
      expect(savedData).toHaveLength(5)

      // The oldest entries should be removed
      expect(savedData[0][0]).toBe('https://existing1.com')
      expect(savedData[1][0]).toBe('https://existing2.com')
      expect(savedData[2][0]).toBe('https://existing3.com')
      expect(savedData[3][0]).toBe('https://new1.com')
      expect(savedData[4][0]).toBe('https://new2.com')
    })

    /**
     * Test case for handling localStorage parsing errors
     */
    it('should handle localStorage parsing errors', () => {
      // Arrange - Set invalid JSON in localStorage
      localStorageMock.setItem(STORAGE_KEY_BOOKMARKS_DELETED, 'invalid json')

      const bookmark: BookmarkKeyValuePair = [
        'https://example.com',
        {
          tags: ['test'],
          meta: {
            created: 1_234_567_890,
            updated: 1_234_567_900,
          },
        },
      ]

      // Act
      const result = saveDeletedBookmarks(bookmark, { actionType: 'DELETE' })

      // Assert
      expect(result).toBe(true)
      expect(console.error).toHaveBeenCalledWith(
        'Error parsing deleted bookmarks from localStorage:',
        expect.any(Error)
      )

      // Verify the saved data - should only contain the new bookmark
      const savedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED)!
      ) as BookmarkKeyValuePair[]
      expect(savedData).toHaveLength(1)
      expect(savedData[0][0]).toBe('https://example.com')
    })

    /**
     * Test case for handling localStorage setItem errors
     */
    it('should handle localStorage setItem errors', () => {
      // Arrange
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })

      const bookmark: BookmarkKeyValuePair = [
        'https://example.com',
        {
          tags: ['test'],
          meta: {
            created: 1_234_567_890,
            updated: 1_234_567_900,
          },
        },
      ]

      // Act
      const result = saveDeletedBookmarks(bookmark, { actionType: 'DELETE' })

      // Assert
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        'Error saving deleted bookmarks to localStorage:',
        expect.any(Error)
      )
    })

    /**
     * Test case for different action types
     */
    it('should correctly set different action types', () => {
      // Test for 'DELETE' action type
      saveDeletedBookmarks(
        [
          'https://delete.com',
          {
            tags: ['DELETE'],
            meta: {
              created: 1_234_567_890,
              updated: 1_234_567_900,
            },
          },
        ],
        { actionType: 'DELETE' }
      )

      // Test for 'IMPORT' action type
      saveDeletedBookmarks(
        [
          'https://import.com',
          {
            tags: ['IMPORT'],
            meta: {
              created: 1_234_567_891,
              updated: 1_234_567_901,
            },
          },
        ],
        { actionType: 'IMPORT' }
      )

      // Test for 'SYNC' action type
      saveDeletedBookmarks(
        [
          'https://sync.com',
          {
            tags: ['SYNC'],
            meta: {
              created: 1_234_567_892,
              updated: 1_234_567_902,
            },
          },
        ],
        { actionType: 'SYNC' }
      )

      // Verify all action types were saved correctly
      const savedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED)!
      ) as BookmarkKeyValuePair[]
      expect(savedData).toHaveLength(3)
      expect(savedData[0][1].deletedMeta!.actionType).toBe('DELETE')
      expect(savedData[1][1].deletedMeta!.actionType).toBe('IMPORT')
      expect(savedData[2][1].deletedMeta!.actionType).toBe('SYNC')
    })

    /**
     * Test case for handling empty input
     */
    it('should handle empty input gracefully', () => {
      // Arrange - Empty array
      const emptyArray: BookmarkKeyValuePair[] = []

      // Act
      const result = saveDeletedBookmarks(emptyArray, { actionType: 'DELETE' })

      // Assert
      expect(result).toBe(false)
      expect(console.warn).toHaveBeenCalledWith(
        'No valid bookmarks provided for saving.'
      )
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    /**
     * Test case for handling undefined input
     */
    it('should handle undefined input gracefully', () => {
      // Arrange - Undefined input (simulating a programming error)
      const undefinedInput = undefined as unknown as BookmarkKeyValuePair[]

      // Act
      const result = saveDeletedBookmarks(undefinedInput, {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(false)
      expect(console.warn).toHaveBeenCalledWith(
        'No valid bookmarks provided for saving.'
      )
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    /**
     * Test case for handling null input
     */
    it('should handle null input gracefully', () => {
      // Arrange - Null input (simulating a programming error)
      const nullInput = null as unknown as BookmarkKeyValuePair[]

      // Act
      const result = saveDeletedBookmarks(nullInput, { actionType: 'DELETE' })

      // Assert
      expect(result).toBe(false)
      expect(console.warn).toHaveBeenCalledWith(
        'No valid bookmarks provided for saving.'
      )
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    /**
     * Test case for handling incomplete bookmark data (missing metadata)
     */
    it('should handle incomplete bookmark data (missing metadata)', () => {
      // Arrange - Bookmark with only URL, missing metadata
      const incompleteBookmark = [
        'https://example.com',
      ] as unknown as BookmarkKeyValuePair

      // Act
      const result = saveDeletedBookmarks(incompleteBookmark, {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(false)
      expect(console.warn).toHaveBeenCalledWith(
        'No valid bookmarks provided for saving.'
      )
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    /**
     * Test case for handling incomplete bookmark data (missing URL)
     */
    it('should handle incomplete bookmark data (missing URL)', () => {
      // Arrange - Bookmark with only metadata, missing URL
      const incompleteBookmark = [
        undefined,
        {
          tags: ['test'],
          meta: {
            created: 1_234_567_890,
            updated: 1_234_567_900,
          },
        },
      ] as unknown as BookmarkKeyValuePair

      // Act
      const result = saveDeletedBookmarks(incompleteBookmark, {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(false)
      expect(console.warn).toHaveBeenCalledWith(
        'No valid bookmarks provided for saving.'
      )
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    /**
     * Test case for handling mixed valid and invalid bookmarks
     */
    it('should filter out invalid bookmarks and process valid ones', () => {
      // Arrange - Array with both valid and invalid bookmarks
      const mixedBookmarks: BookmarkKeyValuePair[] = [
        // Valid bookmark
        [
          'https://valid.com',
          {
            tags: ['valid'],
            meta: {
              created: 1_234_567_890,
              updated: 1_234_567_900,
            },
          },
        ],
        // Invalid bookmark (missing metadata)
        ['https://invalid1.com'] as unknown as BookmarkKeyValuePair,
        // Invalid bookmark (missing URL)
        [
          undefined,
          {
            tags: ['invalid'],
            meta: {
              created: 1_234_567_891,
              updated: 1_234_567_901,
            },
          },
        ] as unknown as BookmarkKeyValuePair,
        // Another valid bookmark
        [
          'https://valid2.com',
          {
            tags: ['valid2'],
            meta: {
              created: 1_234_567_892,
              updated: 1_234_567_902,
            },
          },
        ],
      ]

      // Act
      const result = saveDeletedBookmarks(mixedBookmarks, {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1)

      // Verify only valid bookmarks were saved
      const savedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED)!
      ) as BookmarkKeyValuePair[]
      expect(savedData).toHaveLength(2)
      expect(savedData[0][0]).toBe('https://valid.com')
      expect(savedData[1][0]).toBe('https://valid2.com')
    })
  })
})

describe('deleted-bookmarks', () => {
  // Sample bookmark data for testing
  const sampleBookmarks: BookmarkKeyValuePair[] = [
    [
      'https://example.com',
      {
        tags: ['example', 'test'],
        meta: {
          created: 1_234_567_890,
          updated: 1_234_567_900,
        },
      },
    ],
    [
      'https://test.com',
      {
        tags: ['test'],
        meta: {
          created: 1_234_567_891,
          updated: 1_234_567_901,
        },
      },
    ],
  ]

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear()
    vi.clearAllMocks()
    // 启用模拟计时器
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Clear mocks after each test
    vi.clearAllMocks()
    // 恢复真实计时器
    vi.useRealTimers()
  })

  describe('removeDeletedBookmarks', () => {
    /**
     * Test case for removing a single bookmark from deletion history
     */
    it('should remove a single bookmark from deletion history', () => {
      // Arrange - Save bookmarks to deletion history first
      saveDeletedBookmarks(sampleBookmarks, { actionType: 'DELETE' })

      // Verify bookmarks were saved
      const savedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED) || '[]'
      ) as BookmarkKeyValuePair[]
      expect(savedData).toHaveLength(2)

      // Act - Remove one bookmark
      const result = removeDeletedBookmarks(['https://example.com'], {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(true)

      // Verify bookmark was removed from storage
      const updatedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED) || '[]'
      ) as BookmarkKeyValuePair[]
      expect(updatedData).toHaveLength(1)
      expect(updatedData[0][0]).toBe('https://test.com')
    })

    /**
     * Test case for removing multiple bookmarks from deletion history
     */
    it('should remove multiple bookmarks from deletion history', () => {
      // Arrange - Save bookmarks to deletion history first
      saveDeletedBookmarks(sampleBookmarks, { actionType: 'DELETE' })

      // Act - Remove multiple bookmarks
      const result = removeDeletedBookmarks(
        ['https://example.com', 'https://test.com'],
        {
          actionType: 'DELETE',
        }
      )

      // Assert
      expect(result).toBe(true)

      // Verify all bookmarks were removed from storage
      const updatedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED) || '[]'
      ) as BookmarkKeyValuePair[]
      expect(updatedData).toHaveLength(0)
    })

    /**
     * Test case for removing a bookmark with specific action type
     */
    it('should only remove bookmarks with matching action type', () => {
      // Arrange - Save bookmarks with different action types
      saveDeletedBookmarks([sampleBookmarks[0]], { actionType: 'DELETE' })
      saveDeletedBookmarks([sampleBookmarks[1]], { actionType: 'IMPORT' })

      // Act - Remove bookmark with specific action type
      const result = removeDeletedBookmarks(
        ['https://example.com', 'https://test.com'],
        {
          actionType: 'DELETE',
        }
      )

      // Assert
      expect(result).toBe(true)

      // Verify only matching action type bookmark was removed
      const updatedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED) || '[]'
      ) as BookmarkKeyValuePair[]
      expect(updatedData).toHaveLength(1)
      expect(updatedData[0][0]).toBe('https://test.com')
      expect(updatedData[0][1].deletedMeta!.actionType).toBe('IMPORT')
    })

    /**
     * Test case for removing non-existent bookmarks
     */
    it('should handle removing non-existent bookmarks gracefully', () => {
      // Arrange - Save bookmarks to deletion history first
      saveDeletedBookmarks([sampleBookmarks[0]], { actionType: 'DELETE' })

      // Act - Remove non-existent bookmark
      const result = removeDeletedBookmarks(['https://nonexistent.com'], {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(true)

      // Verify storage remains unchanged
      const updatedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED) || '[]'
      ) as BookmarkKeyValuePair[]
      expect(updatedData).toHaveLength(1)
      expect(updatedData[0][0]).toBe('https://example.com')
    })

    /**
     * Test case for removing bookmarks from empty history
     */
    it('should handle removing from empty history gracefully', () => {
      // Act - Remove from empty history
      const result = removeDeletedBookmarks(['https://example.com'], {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(true)

      // Verify no errors occurred
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    /**
     * Test case for removing the most recent bookmark when duplicates exist
     */
    it('should remove only the most recent bookmark when duplicates exist', () => {
      // Arrange - Save the same bookmark multiple times
      saveDeletedBookmarks([sampleBookmarks[0]], { actionType: 'DELETE' })

      // Wait a moment to ensure different timestamps
      vi.advanceTimersByTime(1000)

      // Save the same bookmark again
      saveDeletedBookmarks([sampleBookmarks[0]], { actionType: 'DELETE' })

      // Verify we have two entries for the same bookmark
      const savedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED) || '[]'
      ) as BookmarkKeyValuePair[]
      expect(savedData).toHaveLength(2)
      expect(savedData[0][0]).toBe('https://example.com')
      expect(savedData[1][0]).toBe('https://example.com')

      // Act - Remove the bookmark once
      const result = removeDeletedBookmarks(['https://example.com'], {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(true)

      // Verify only the most recent entry was removed
      const updatedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED) || '[]'
      ) as BookmarkKeyValuePair[]
      expect(updatedData).toHaveLength(1)
      expect(updatedData[0][0]).toBe('https://example.com')

      // The remaining entry should be the older one
      expect(updatedData[0][1].deletedMeta!.deleted).toBeLessThan(
        savedData[1][1].deletedMeta!.deleted
      )
    })

    /**
     * Test case for handling localStorage errors
     */
    it('should handle localStorage errors gracefully', () => {
      // Arrange - Save bookmarks to deletion history first
      saveDeletedBookmarks([sampleBookmarks[0]], { actionType: 'DELETE' })

      // Mock localStorage.setItem to throw an error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })

      // Act - Try to remove bookmark
      const result = removeDeletedBookmarks(['https://example.com'], {
        actionType: 'DELETE',
      })

      // Assert
      expect(result).toBe(false)

      // Verify error was handled gracefully
      expect(console.error).toHaveBeenCalledWith(
        'Error removing bookmarks from deletion history:',
        expect.any(Error)
      )
    })

    /**
     * Test case for default action type
     */
    it('should use default action type when not specified', () => {
      // Arrange - Save bookmarks with specific action type
      saveDeletedBookmarks([sampleBookmarks[0]], { actionType: 'DELETE' })

      // Act - Remove without specifying action type (should default to 'DELETE')
      const result = removeDeletedBookmarks(['https://example.com'])

      // Assert
      expect(result).toBe(true)

      // Verify bookmark was removed
      const updatedData = JSON.parse(
        localStorageMock.getItem(STORAGE_KEY_BOOKMARKS_DELETED) || '[]'
      ) as BookmarkKeyValuePair[]
      expect(updatedData).toHaveLength(0)
    })
  })
})
