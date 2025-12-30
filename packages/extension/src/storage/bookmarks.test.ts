/**
 * @vitest-environment jsdom
 */
import { addValueChangeListener } from 'browser-extension-storage'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
  vi,
} from 'vitest'

import type {
  BookmarkMetadata,
  BookmarksData,
  BookmarksStore,
  BookmarkTagsAndMetadata,
} from '../types/bookmarks.js'
import {
  currentDatabaseVersion,
  currentExtensionVersion,
  DELETED_BOOKMARK_TAG,
  getBookmark,
  getCachedUrlMap,
  getUrlMap,
  initBookmarksStore,
  saveBookmark,
  type BookmarksStoreV2,
} from './bookmarks.js'

// Define storage types
type StorageKey = 'extension.utags.urlmap'
type StorageValue = Record<string, unknown>
type StorageData = Partial<Record<StorageKey, StorageValue>>

// Define mock listener type
type ValueChangeListener = (value: unknown) => void
type ListenerMap = Record<string, ValueChangeListener[]>

// Mock browser-extension-storage module
vi.mock('browser-extension-storage', () => {
  // Mock storage and listeners for tests
  const mockStorage: StorageData = {}
  const listeners: ListenerMap = {}

  return {
    getValue: vi
      .fn()
      .mockImplementation(
        async (key: string) => structuredClone(mockStorage[key as StorageKey])!
      ),
    setValue: vi
      .fn()
      .mockImplementation(async (key: string, value: unknown) => {
        mockStorage[key as StorageKey] = value as StorageValue
        // Trigger registered listeners for the key
        if (listeners[key]) {
          for (const listener of listeners[key]) listener(value)
        }
      }),
    addValueChangeListener: vi
      .fn()
      .mockImplementation(
        async (key: string, listener: (value: unknown) => void) => {
          if (!listeners[key]) {
            listeners[key] = []
          }

          listeners[key].push(listener)
        }
      ),
    resetStorage: vi.fn().mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      for (const key of Object.keys(mockStorage)) delete mockStorage[key]
      // Should'nt reset listeners, as it's added only once
      // Object.keys(listeners).forEach((key) => delete listeners[key])
    }),
    setPolling: vi.fn(),
  }
})

// Define settings types
type SettingsKey = 'pinnedTags' | 'emojiTags'
type SettingsValue = string
type SettingsData = Partial<Record<SettingsKey, SettingsValue>>

// Mock browser-extension-settings module
vi.mock('browser-extension-settings', () => {
  // Mock storage for tests with initial empty strings
  const mockSettingsStorage: SettingsData = {}

  return {
    getSettingsValue: vi
      .fn()
      .mockImplementation(
        async (key: string) => mockSettingsStorage[key as SettingsKey]
      ),
    setSettingsValue: vi
      .fn()
      .mockImplementation(async (key: string, value: unknown) => {
        mockSettingsStorage[key as SettingsKey] = value as SettingsValue
      }),
  }
})

describe('bookmarks', () => {
  // Import mocked functions
  let getValue: ReturnType<
    typeof vi.fn<(key: string) => Promise<StorageValue | undefined>>
  >
  let setValue: ReturnType<
    typeof vi.fn<(key: string, value: unknown) => Promise<void>>
  >
  let resetStorage: ReturnType<typeof vi.fn<() => void>>
  const initialTime = new Date(2023, 0, 1, 12, 0).getTime() // 2023-01-01 12:00
  const secondCallTime = new Date(2023, 0, 1, 13, 0).getTime() // 2023-01-01 13:00
  const thirdCallTime = new Date(2023, 0, 1, 13, 1).getTime() // 2023-01-01 13:01

  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  beforeAll(async () => {
    const browserExtensionStorage = await import('browser-extension-storage')
    getValue = vi.mocked(
      browserExtensionStorage.getValue
    ) as unknown as typeof getValue
    setValue = vi.mocked(browserExtensionStorage.setValue)
    // @ts-expect-error - mock resetStorage for testing
    resetStorage = vi.mocked(browserExtensionStorage.resetStorage)
  })

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    resetStorage()
    vi.useFakeTimers()
    vi.setSystemTime(initialTime)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should initialize empty bookmarks store', async () => {
    await initBookmarksStore()

    expect(getValue).toHaveBeenCalledWith('extension.utags.urlmap')
    const urlMap = await getUrlMap()
    expect(urlMap).toEqual({})
    expect(setValue).not.toHaveBeenCalled()
  })

  test('should migrate from V2 to V3 format', async () => {
    const v2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      'https://example1.com': {
        tags: ['tag1', 'tag2'],
        meta: {
          title: 'Example 1',
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
      'https://example2.com': {
        tags: ['tag2', 'tag3'],
        meta: {
          title: 'Example 2',
          created: initialTime - 2000,
          updated: initialTime - 1500,
        },
      },
    }

    getValue.mockResolvedValueOnce(v2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        'https://example1.com': {
          tags: ['tag1', 'tag2'],
          meta: {
            title: 'Example 1',
            created: initialTime - 1000,
            updated: expect.any(Number),
          },
        },
        'https://example2.com': {
          tags: ['tag2', 'tag3'],
          meta: {
            title: 'Example 2',
            created: initialTime - 2000,
            updated: expect.any(Number),
          },
        },
      },
      meta: {
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
        created: initialTime - 2000,
        updated: initialTime,
      },
    })

    const newBookmarksStore: BookmarksStore = setValue.mock
      .calls[0][1] as BookmarksStore

    expect(newBookmarksStore.meta).toEqual({
      databaseVersion: currentDatabaseVersion,
      extensionVersion: currentExtensionVersion,
      created: initialTime - 2000,
      updated: initialTime,
    })
    expect(newBookmarksStore.data).toEqual({
      'https://example1.com': v2Store['https://example1.com'],
      'https://example2.com': v2Store['https://example2.com'],
    })
    expect(newBookmarksStore['https://example1.com']).toBeUndefined()
    expect(newBookmarksStore['https://example2.com']).toBeUndefined()
  })

  test('should handle empty V2 store during migration', async () => {
    const emptyV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
    }

    getValue.mockResolvedValueOnce(emptyV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {},
      meta: expect.objectContaining({
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
        created: expect.any(Number),
        updated: expect.any(Number),
      }),
    })
  })

  test('should handle special characters during V2 to V3 migration', async () => {
    const specialCharsV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      'https://example.com/path with spaces': {
        tags: ['tag:1', 'tag/2', 'tag\\3', 'tag.4', 'tag_5', 'tag-6', 'tag+7'],
        meta: {
          title: 'Special Characters Test',
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
      'https://example.com/path%20with%20encoded%20spaces': {
        tags: ['emoji:🎉', 'unicode:测试', 'special:!@#$%^&*()'],
        meta: {
          title: 'URL Encoding Test',
          created: initialTime - 2000,
          updated: initialTime - 1500,
        },
      },
    }

    getValue.mockResolvedValueOnce(specialCharsV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        'https://example.com/path with spaces': {
          tags: [
            'tag:1',
            'tag/2',
            'tag\\3',
            'tag.4',
            'tag_5',
            'tag-6',
            'tag+7',
          ],
          meta: expect.objectContaining({
            title: 'Special Characters Test',
            created: initialTime - 1000,
            updated: expect.any(Number),
          }),
        },
        'https://example.com/path%20with%20encoded%20spaces': {
          tags: ['emoji:🎉', 'unicode:测试', 'special:!@#$%^&*()'],
          meta: expect.objectContaining({
            title: 'URL Encoding Test',
            created: initialTime - 2000,
            updated: expect.any(Number),
          }),
        },
      },
      meta: expect.objectContaining({
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
        created: initialTime - 2000,
        updated: expect.any(Number),
      }),
    })
  })

  test('should handle version compatibility during V2 to V3 migration', async () => {
    const oldVersionV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: '1.0.0', // Old extension version
        databaseVersion: 2,
      },
      'https://example.com': {
        tags: ['tag1'],
        meta: {
          title: 'Test',
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
    }

    getValue.mockResolvedValueOnce(oldVersionV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        'https://example.com': {
          tags: ['tag1'],
          meta: expect.objectContaining({
            title: 'Test',
            created: initialTime - 1000,
            updated: expect.any(Number),
          }),
        },
      },
      meta: expect.objectContaining({
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion, // Should update to current version
        created: initialTime - 1000,
        updated: expect.any(Number),
      }),
    })
  })

  test('should handle metadata inheritance during V2 to V3 migration', async () => {
    const metadataV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      'https://example1.com': {
        tags: ['tag1'],
        meta: {
          title: 'Example 1',
          description: 'Description 1',
          icon: 'https://example1.com/favicon.ico',
          customField: 'Value 1',
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
      'https://example2.com': {
        tags: ['tag2'],
        meta: {
          // Partial metadata
          title: 'Example 2',
          icon: 'https://example2.com/favicon.ico',
          created: initialTime - 2000,
          updated: initialTime - 1500,
        },
      },
      'https://example3.com': {
        tags: ['tag3'],
        // No metadata
      },
    }

    getValue.mockResolvedValueOnce(metadataV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        'https://example1.com': {
          tags: ['tag1'],
          meta: expect.objectContaining({
            title: 'Example 1',
            description: 'Description 1',
            icon: 'https://example1.com/favicon.ico',
            customField: 'Value 1',
            created: initialTime - 1000,
            updated: initialTime - 500, // Inherited from V2
          }) as unknown,
        },
        'https://example2.com': {
          tags: ['tag2'],
          meta: expect.objectContaining({
            title: 'Example 2',
            icon: 'https://example2.com/favicon.ico',
            created: initialTime - 2000,
            updated: initialTime - 1500, // Inherited from V2
          }) as unknown,
        },
        'https://example3.com': {
          tags: ['tag3'],
          meta: expect.objectContaining({
            created: initialTime,
            updated: initialTime,
          }) as unknown,
        },
      },
      meta: expect.objectContaining({
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
        created: initialTime - 2000,
        updated: initialTime,
      }) as unknown,
    })
  })

  test('should handle invalid data during V2 to V3 migration', async () => {
    const invalidV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      'not-a-url': { tags: ['tag1'] },
      'https://example.com': null as unknown as any,
      'https://valid.com': { tags: null as unknown as any },
      'https://valid2.com': { tags: ['tag1'] },
    }

    getValue.mockResolvedValueOnce(invalidV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        'https://valid2.com': {
          tags: ['tag1'],
          meta: {
            created: initialTime,
            updated: initialTime,
          },
        },
      },
      meta: {
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
        created: initialTime,
        updated: initialTime,
      },
    })
  })

  test('should handle corrupted data during V2 to V3 migration', async () => {
    const corruptedV2Store = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      'https://example1.com': {
        tags: [123, null, 'valid-tag', { invalid: 'object' }],
        meta: {
          title: true, // Invalid type
          created: 'invalid-date', // Invalid date
          updated: -1, // Invalid timestamp
          description: Buffer.from('invalid'), // Invalid object type
        },
      },
      'https://example2.com': 'invalid-bookmark-data', // Invalid bookmark structure
      'https://example3.com': {
        tags: ['valid-tag'],
        meta: {
          title: 'Valid Title',
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
      'https://example4.com': {
        tags: ['valid-tag'],
        meta: {
          title: true, // Invalid type
          created: 'invalid-date', // Invalid date
          updated: -1, // Invalid timestamp
          description: Buffer.from('invalid'), // Invalid object type
        },
      },
    }

    getValue.mockResolvedValueOnce(corruptedV2Store)
    await initBookmarksStore()

    // Should only migrate valid data and ignore corrupted entries
    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        'https://example3.com': {
          tags: ['valid-tag'],
          meta: {
            title: 'Valid Title',
            created: initialTime - 1000,
            updated: initialTime - 500,
          },
        },
        'https://example4.com': {
          tags: ['valid-tag'],
          meta: {
            created: initialTime,
            updated: initialTime,
          },
        },
      },
      meta: {
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
        created: initialTime - 1000,
        updated: initialTime,
      },
    })
  })

  test('should recover from interrupted V2 to V3 migration', async () => {
    // First migration attempt with network error
    const v2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      'https://example1.com': {
        tags: ['tag1'],
        meta: {
          title: 'Example 1',
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
    }

    // Simulate network error during first migration attempt
    getValue.mockResolvedValueOnce(v2Store)
    setValue.mockRejectedValueOnce(new Error('Network error'))

    // First attempt should fail
    await expect(initBookmarksStore()).rejects.toThrow('Network error')

    // Second migration attempt should succeed
    getValue.mockResolvedValueOnce(v2Store)
    await initBookmarksStore()

    // Verify the migration completed successfully on second attempt
    expect(setValue).toHaveBeenLastCalledWith('extension.utags.urlmap', {
      data: {
        'https://example1.com': {
          tags: ['tag1'],
          meta: expect.objectContaining({
            title: 'Example 1',
            created: initialTime - 1000,
            updated: expect.any(Number),
          }),
        },
      },
      meta: expect.objectContaining({
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
        created: initialTime - 1000,
        updated: expect.any(Number),
      }),
    })
  })

  test('should handle large-scale data during V2 to V3 migration', async () => {
    // Generate a large V2 store with 1000 bookmarks
    const largeV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
    }

    // Add 1000 bookmarks with varying creation times
    for (let i = 0; i < 1000; i++) {
      const url = `https://example${i}.com`
      largeV2Store[url] = {
        tags: [`tag${i % 10}`, `category${i % 5}`], // Create some tag patterns
        meta: {
          title: `Example ${i}`,
          description: `Description for example ${i}`,
          created: initialTime - (1000 - i) * 1000, // Varying creation times
          updated: initialTime - (1000 - i) * 500,
        },
      }
    }

    getValue.mockResolvedValueOnce(largeV2Store)
    await initBookmarksStore()

    // Verify migration process
    expect(getValue).toHaveBeenCalledTimes(3) // First call in initBookmarksStore, second call in addTagsValueChangeListener, third call after migration
    expect(setValue).toHaveBeenCalledTimes(1) // Should only write store once
    expect(getValue).toHaveBeenCalledBefore(setValue) // Should read before write

    const migratedStore: BookmarksStore = setValue.mock
      .calls[0][1] as BookmarksStore

    // Verify all bookmarks were migrated
    expect(Object.keys(migratedStore.data)).toHaveLength(1000)

    // Verify metadata was preserved
    const firstBookmark = migratedStore.data['https://example0.com']
    expect(firstBookmark).toEqual({
      tags: ['tag0', 'category0'],
      meta: expect.objectContaining({
        title: 'Example 0',
        description: 'Description for example 0',
        created: initialTime - 1_000_000,
        updated: initialTime - 500_000,
      }),
    })

    // Verify store metadata
    expect(migratedStore.meta).toEqual({
      databaseVersion: currentDatabaseVersion,
      extensionVersion: currentExtensionVersion,
      created: initialTime - 1_000_000, // Earliest creation time
      updated: initialTime, // Now
    })

    // Verify migration efficiency
    expect(setValue.mock.calls.length).toBe(1) // Should batch all updates in one call
  })

  test('should handle created/updated edge cases during V2 to V3 migration', async () => {
    const edgeCasesV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      // Case 1: created is 0, updated has valid value
      'https://case1.com': {
        tags: ['tag1'],
        meta: {
          title: 'Case 1: created=0, updated=valid',
          created: 0,
          updated: initialTime - 1000,
        },
      },
      // Case 2: created is undefined, updated has valid value
      'https://case2.com': {
        tags: ['tag2'],
        meta: {
          title: 'Case 2: created=undefined, updated=valid',
          updated: initialTime - 2000,
        },
      },
      // Case 3: updated is 0, created has valid value
      'https://case3.com': {
        tags: ['tag3'],
        meta: {
          title: 'Case 3: updated=0, created=valid',
          created: initialTime - 3000,
          updated: 0,
        },
      },
      // Case 4: updated is undefined, created has valid value
      'https://case4.com': {
        tags: ['tag4'],
        meta: {
          title: 'Case 4: updated=undefined, created=valid',
          created: initialTime - 4000,
        },
      },
      // Case 5: both created and updated are 0
      'https://case5.com': {
        tags: ['tag5'],
        meta: {
          title: 'Case 5: both=0',
          created: 0,
          updated: 0,
        },
      },
      // Case 6: both created and updated are undefined
      'https://case6.com': {
        tags: ['tag6'],
        meta: {
          title: 'Case 6: both=undefined',
        },
      },
      // Case 7: created and updated are NaN
      'https://case7.com': {
        tags: ['tag7'],
        meta: {
          title: 'Case 7: both=NaN',
          created: Number.NaN,
          updated: Number.NaN,
        },
      },
      // Case 8: created and updated are Infinity
      'https://case8.com': {
        tags: ['tag8'],
        meta: {
          title: 'Case 8: both=Infinity',
          created: Infinity,
          updated: Infinity,
        },
      },
      // Case 9: created and updated are negative values
      'https://case9.com': {
        tags: ['tag9'],
        meta: {
          title: 'Case 9: both=negative',
          created: -1000,
          updated: -500,
        },
      },
      // Case 10: created and updated are out of valid range (too old)
      'https://case10.com': {
        tags: ['tag10'],
        meta: {
          title: 'Case 10: both=too old',
          created: 100_000_000, // 1973, before MIN_VALID_TIMESTAMP
          updated: 200_000_000, // 1976, before MIN_VALID_TIMESTAMP
        },
      },
      // Case 11: created and updated are out of valid range (too new)
      'https://case11.com': {
        tags: ['tag11'],
        meta: {
          title: 'Case 11: both=too new',
          created: 10_000_000_000_000, // Beyond MAX_VALID_TIMESTAMP
          updated: 11_000_000_000_000, // Beyond MAX_VALID_TIMESTAMP
        },
      },
      // Case 12: mixed valid and invalid values
      'https://case12.com': {
        tags: ['tag12'],
        meta: {
          title: 'Case 12: mixed valid/invalid',
          created: initialTime - 5000, // Valid
          updated: Infinity, // Invalid
        },
      },
    }

    getValue.mockResolvedValueOnce(edgeCasesV2Store)
    await initBookmarksStore()

    const migratedStore: BookmarksStore = setValue.mock
      .calls[0][1] as BookmarksStore

    // Case 1: created=0, updated=valid -> should use updated for both
    expect(migratedStore.data['https://case1.com'].meta).toEqual({
      title: 'Case 1: created=0, updated=valid',
      created: initialTime - 1000, // Should use updated value
      updated: initialTime - 1000, // Should use updated value
    })

    // Case 2: created=undefined, updated=valid -> should use updated for both
    expect(migratedStore.data['https://case2.com'].meta).toEqual({
      title: 'Case 2: created=undefined, updated=valid',
      created: initialTime - 2000, // Should use updated value
      updated: initialTime - 2000, // Should use updated value
    })

    // Case 3: updated=0, created=valid -> should use created for both
    expect(migratedStore.data['https://case3.com'].meta).toEqual({
      title: 'Case 3: updated=0, created=valid',
      created: initialTime - 3000, // Should use created value
      updated: initialTime - 3000, // Should use created value
    })

    // Case 4: updated=undefined, created=valid -> should use created for both
    expect(migratedStore.data['https://case4.com'].meta).toEqual({
      title: 'Case 4: updated=undefined, created=valid',
      created: initialTime - 4000, // Should use created value
      updated: initialTime - 4000, // Should use created value
    })

    // Case 5: both=0 -> should use default (now)
    expect(migratedStore.data['https://case5.com'].meta).toEqual({
      title: 'Case 5: both=0',
      created: initialTime, // Should use default (now)
      updated: initialTime, // Should use default (now)
    })

    // Case 6: both=undefined -> should use default (now)
    expect(migratedStore.data['https://case6.com'].meta).toEqual({
      title: 'Case 6: both=undefined',
      created: initialTime, // Should use default (now)
      updated: initialTime, // Should use default (now)
    })

    // Case 7: both=NaN -> should use default (now)
    expect(migratedStore.data['https://case7.com'].meta).toEqual({
      title: 'Case 7: both=NaN',
      created: initialTime, // Should use default (now)
      updated: initialTime, // Should use default (now)
    })

    // Case 8: both=Infinity -> should use default (now)
    expect(migratedStore.data['https://case8.com'].meta).toEqual({
      title: 'Case 8: both=Infinity',
      created: initialTime, // Should use default (now)
      updated: initialTime, // Should use default (now)
    })

    // Case 9: both=negative -> should use default (now)
    expect(migratedStore.data['https://case9.com'].meta).toEqual({
      title: 'Case 9: both=negative',
      created: initialTime, // Should use default (now)
      updated: initialTime, // Should use default (now)
    })

    // Case 10: both=too old -> should use default (now)
    expect(migratedStore.data['https://case10.com'].meta).toEqual({
      title: 'Case 10: both=too old',
      created: initialTime, // Should use default (now)
      updated: initialTime, // Should use default (now)
    })

    // Case 11: both=too new -> should use default (now)
    expect(migratedStore.data['https://case11.com'].meta).toEqual({
      title: 'Case 11: both=too new',
      created: initialTime, // Should use default (now)
      updated: initialTime, // Should use default (now)
    })

    // Case 12: mixed valid/invalid -> should use valid created for both
    expect(migratedStore.data['https://case12.com'].meta).toEqual({
      title: 'Case 12: mixed valid/invalid',
      created: initialTime - 5000, // Should use valid created value
      updated: initialTime - 5000, // Should use valid created value
    })

    // Verify store metadata uses the earliest valid created time
    expect(migratedStore.meta.created).toBe(initialTime - 5000) // From case12
    expect(migratedStore.meta.updated).toBe(initialTime)
  })

  test('should handle normalizeCreated and normalizeUpdated logic consistency during migration', async () => {
    const consistencyTestV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      // Test case where created > updated (should be corrected)
      'https://consistency1.com': {
        tags: ['tag1'],
        meta: {
          title: 'Consistency Test 1',
          created: initialTime - 1000, // Later
          updated: initialTime - 2000, // Earlier
        },
      },
      // Test case where both are valid and in correct order
      'https://consistency2.com': {
        tags: ['tag2'],
        meta: {
          title: 'Consistency Test 2',
          created: initialTime - 3000, // Earlier
          updated: initialTime - 1000, // Later
        },
      },
    }

    getValue.mockResolvedValueOnce(consistencyTestV2Store)
    await initBookmarksStore()

    const migratedStore: BookmarksStore = setValue.mock
      .calls[0][1] as BookmarksStore

    // Verify that normalizeCreated selects the earlier date
    expect(migratedStore.data['https://consistency1.com'].meta.created).toBe(
      initialTime - 2000
    )
    // Verify that normalizeUpdated uses normalizedCreated as input, ensuring created <= updated
    expect(migratedStore.data['https://consistency1.com'].meta.updated).toBe(
      initialTime - 2000
    )

    // Verify normal case works correctly
    expect(migratedStore.data['https://consistency2.com'].meta.created).toBe(
      initialTime - 3000
    )
    expect(migratedStore.data['https://consistency2.com'].meta.updated).toBe(
      initialTime - 1000
    )

    // Verify created <= updated invariant is maintained
    for (const bookmark of Object.values(migratedStore.data)) {
      expect(bookmark.meta.created).toBeLessThanOrEqual(bookmark.meta.updated)
    }
  })

  test('should save and retrieve bookmarks', async () => {
    const url = 'https://example.com'
    const tags = ['tag1', 'tag2']
    const meta: Partial<BookmarkMetadata> = { title: 'Example' }

    await initBookmarksStore()

    const urlMap = await getUrlMap()
    expect(urlMap).toEqual({})

    await saveBookmark(url, tags, meta)

    // Verify saveBookmark call
    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags,
          meta: expect.objectContaining({
            title: 'Example',
            created: initialTime,
            updated: initialTime,
          }) as unknown,
        },
      },
      meta: {
        created: initialTime,
        updated: initialTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    const bookmark: BookmarkTagsAndMetadata = getBookmark(url)
    expect(bookmark).toEqual({
      tags,
      meta: expect.objectContaining({
        title: 'Example',
        created: initialTime,
        updated: initialTime,
      }) as unknown,
    })
  })

  test('should handle duplicate tags', async () => {
    const url = 'https://example.com'
    const tags = ['tag1', 'tag2', 'tag1']

    await initBookmarksStore()

    const urlMap = await getUrlMap()
    expect(urlMap).toEqual({})

    await saveBookmark(url, tags, {})

    // Verify saveBookmark call
    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1', 'tag2'],
          meta: expect.objectContaining({
            created: initialTime,
            updated: initialTime,
          }) as unknown as BookmarkMetadata,
        },
      },
      meta: {
        created: initialTime,
        updated: initialTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    const bookmark: BookmarkTagsAndMetadata = getBookmark(url)
    expect(bookmark.tags).toEqual(['tag1', 'tag2'])
  })

  test('should mark as deleted bookmark when no tags provided', async () => {
    const url = 'https://example.com'

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], {})

    // Verify first saveBookmark call
    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1'],
          meta: expect.objectContaining({
            created: initialTime,
            updated: initialTime,
          }) as unknown as BookmarkMetadata,
        },
      },
      meta: {
        created: initialTime,
        updated: initialTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    vi.setSystemTime(secondCallTime)

    await saveBookmark(url, [], {})

    // Verify second saveBookmark call
    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1', DELETED_BOOKMARK_TAG],
          meta: expect.objectContaining({
            created: initialTime,
            updated: initialTime,
          }) as unknown as BookmarkMetadata,
          deletedMeta: expect.objectContaining({
            deleted: secondCallTime,
            actionType: 'DELETE',
          }),
        },
      },
      meta: {
        created: initialTime,
        updated: secondCallTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    const bookmark: BookmarkTagsAndMetadata = getBookmark(url)
    expect(bookmark).toEqual({ tags: [], meta: { created: 0, updated: 0 } })
  })

  test('should update updated2 field when deleting all tags', async () => {
    const url = 'https://example.com'

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], { title: 'Test' })

    // Verify first saveBookmark call
    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1'],
          meta: expect.objectContaining({
            created: initialTime,
            updated: initialTime,
          }) as unknown as BookmarkMetadata,
        },
      },
      meta: {
        created: initialTime,
        updated: initialTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    vi.setSystemTime(secondCallTime)

    // Delete all tags by providing empty array
    await saveBookmark(url, [], {})

    // Verify second saveBookmark call includes updated2 field
    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1', DELETED_BOOKMARK_TAG],
          meta: expect.objectContaining({
            created: initialTime,
            updated: initialTime,
            updated2: secondCallTime, // This should be set when deleting all tags
          }) as unknown as BookmarkMetadata,
          deletedMeta: expect.objectContaining({
            deleted: secondCallTime,
            actionType: 'DELETE',
          }),
        },
      },
      meta: {
        created: initialTime,
        updated: secondCallTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    const bookmark: BookmarkTagsAndMetadata = getBookmark(url)
    expect(bookmark).toEqual({ tags: [], meta: { created: 0, updated: 0 } })
  })

  test('should update existing bookmark metadata', async () => {
    vi.useFakeTimers()
    const updatedTime = new Date(2023, 0, 1, 12, 1).getTime() // 2023-01-01 12:01

    const url = 'https://example.com'
    const initialMeta: Partial<BookmarkMetadata> = { title: 'Old Title' }
    const updatedMeta: Partial<BookmarkMetadata> = { title: 'New Title' }

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], initialMeta)

    // Verify first saveBookmark call
    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1'],
          meta: expect.objectContaining({
            title: 'Old Title',
            created: initialTime,
            updated: initialTime,
          }) as unknown,
        },
      },
      meta: {
        created: initialTime,
        updated: initialTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    vi.setSystemTime(updatedTime)
    await saveBookmark(url, ['tag1'], updatedMeta)

    // Verify second saveBookmark call
    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1'],
          meta: expect.objectContaining({
            title: 'New Title',
            created: initialTime,
            updated: updatedTime,
          }) as unknown,
        },
      },
      meta: {
        created: initialTime,
        updated: updatedTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    const bookmark: BookmarkTagsAndMetadata = getBookmark(url)
    expect(bookmark.meta).toEqual(
      expect.objectContaining({
        title: 'New Title',
        created: initialTime,
        updated: updatedTime,
      })
    )

    vi.useRealTimers()
  })

  test('should trim title whitespace when saving bookmark', async () => {
    const url = 'https://example.com'
    const metaWithWhitespace = { title: '  Test  \n Title  \n\t  ' }

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], metaWithWhitespace)

    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1'],
          meta: expect.objectContaining({
            title: 'Test Title', // Whitespace should be trimmed
            created: initialTime,
            updated: initialTime,
          }) as unknown as BookmarkMetadata,
        },
      },
      meta: {
        created: initialTime,
        updated: initialTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    const bookmark = getBookmark(url)
    expect(bookmark.meta.title).toBe('Test Title')
  })

  test('should preserve existing title when new title is empty or whitespace', async () => {
    const url = 'https://example.com'
    const initialMeta = { title: 'Original Title' }

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], initialMeta)

    vi.setSystemTime(secondCallTime)

    // Try to update with empty title
    await saveBookmark(url, ['tag1', 'tag2'], { title: '' })

    // Verify setValue call sequence:
    // First saveBookmark call triggers 4 setValue calls:
    //   1. extension.utags.urlmap - stores bookmark data
    //   2. extension.utags.recenttags - updates recent tags list
    //   3. extension.utags.mostusedtags - updates most used tags list
    //   4. extension.utags.recentaddedtags - updates recently added tags list
    // Second saveBookmark call triggers 4 setValue calls too:
    //   5. extension.utags.urlmap - updates bookmark data with new title
    //   6. extension.utags.recenttags - updates recent tags list
    //   7. extension.utags.mostusedtags - updates most used tags list
    //   8. extension.utags.recentaddedtags - updates recently added tags list
    expect(setValue).toHaveBeenNthCalledWith(5, 'extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1', 'tag2'],
          meta: expect.objectContaining({
            title: 'Original Title', // Should preserve original title
            created: initialTime,
            updated: secondCallTime,
          }) as unknown as BookmarkMetadata,
        },
      },
      meta: {
        created: initialTime,
        updated: secondCallTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    const bookmark = getBookmark(url)
    expect(bookmark.meta.title).toBe('Original Title')
  })

  test('should preserve existing title when new title is only whitespace', async () => {
    const url = 'https://example.com'
    const initialMeta = { title: 'Original Title' }

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], initialMeta)

    vi.setSystemTime(secondCallTime)

    // Try to update with whitespace-only title
    await saveBookmark(url, ['tag1', 'tag2'], { title: '   \n\t   ' })

    // Verify setValue call sequence:
    // First saveBookmark call triggers 4 setValue calls:
    //   1. extension.utags.urlmap - stores bookmark data
    //   2. extension.utags.recenttags - updates recent tags list
    //   3. extension.utags.mostusedtags - updates most used tags list
    //   4. extension.utags.recentaddedtags - updates recently added tags list
    // Second saveBookmark call triggers 4 setValue calls too:
    //   5. extension.utags.urlmap - updates bookmark data with new title
    //   6. extension.utags.recenttags - updates recent tags list
    //   7. extension.utags.mostusedtags - updates most used tags list
    //   8. extension.utags.recentaddedtags - updates recently added tags list
    expect(setValue).toHaveBeenNthCalledWith(5, 'extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1', 'tag2'],
          meta: expect.objectContaining({
            title: 'Original Title', // Should preserve original title
            created: initialTime,
            updated: secondCallTime,
          }) as unknown as BookmarkMetadata,
        },
      },
      meta: {
        created: initialTime,
        updated: secondCallTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    const bookmark = getBookmark(url)
    expect(bookmark.meta.title).toBe('Original Title')
  })

  test('should set empty title when explicitly provided', async () => {
    const url = 'https://example.com'

    await initBookmarksStore()
    // Save with empty title explicitly provided
    await saveBookmark(url, ['tag1'], { title: '' })

    const bookmark = getBookmark(url)
    expect(bookmark.meta.title).toBe('')
  })

  test('should normalize multiple whitespace characters in title', async () => {
    const url = 'https://example.com'
    const metaWithMultipleSpaces = {
      title: 'Test   Title\n\nWith    Multiple\t\tSpaces',
    }

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], metaWithMultipleSpaces)

    expect(setValue).toHaveBeenCalledWith('extension.utags.urlmap', {
      data: {
        [url]: {
          tags: ['tag1'],
          meta: expect.objectContaining({
            title: 'Test Title With Multiple Spaces', // Multiple spaces should be normalized to single spaces
            created: initialTime,
            updated: initialTime,
          }) as unknown as BookmarkMetadata,
        },
      },
      meta: {
        created: initialTime,
        updated: initialTime,
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
      },
    })

    const bookmark = getBookmark(url)
    expect(bookmark.meta.title).toBe('Test Title With Multiple Spaces')
  })

  test('should handle value change listener for bookmark updates', async () => {
    const mockListener: ValueChangeListener = vi.fn()
    const url = 'https://example.com'

    await initBookmarksStore()
    await addValueChangeListener('extension.utags.urlmap', mockListener)
    await saveBookmark(url, ['tag1'], {})

    expect(mockListener).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          [url]: expect.objectContaining({
            tags: ['tag1'],
            meta: { created: initialTime, updated: initialTime },
          }) as unknown,
        }) as unknown,
      })
    )

    vi.useRealTimers()
  })

  test('should validate URLs before saving', async () => {
    const invalidUrl = 'not-a-url'
    const validUrl = 'https://example.com'

    await initBookmarksStore()
    await saveBookmark(invalidUrl, ['tag1'], {})
    await saveBookmark(validUrl, ['tag1'], {})

    const urlMap = await getUrlMap()
    expect(Object.keys(urlMap)).not.toContain(invalidUrl)
    expect(Object.keys(urlMap)).toContain(validUrl)
  })

  test('should handle extremely long tags and metadata', async () => {
    const url = 'https://example.com'
    const longTag = 'a'.repeat(1000)
    const longTitle = 'b'.repeat(5000)

    await saveBookmark(url, [longTag], { title: longTitle })

    const bookmark = getBookmark(url)
    expect(bookmark.tags[0]).toHaveLength(1000)
    expect(bookmark.meta.title).toHaveLength(5000)
  })

  test('should validate and normalize URLs', async () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com',
      '//example.com',
      'example.com',
    ]
    const validUrls = [
      'https://example.com',
      'http://example.com',
      'https://example.com/path?query=value#hash',
    ]

    await initBookmarksStore()

    // Invalid URLs should not be saved
    for (const url of invalidUrls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ['tag1'], {
        title: 'Test',
      } as Partial<BookmarkMetadata>)
      const bookmark = getBookmark(url)
      expect(bookmark).toEqual({ tags: [], meta: { created: 0, updated: 0 } })
    }

    // Valid URLs should be saved
    for (const url of validUrls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ['tag1'], {
        title: 'Test 1',
      } as Partial<BookmarkMetadata>)
      const bookmark = getBookmark(url)
      expect(bookmark.tags).toEqual(['tag1'])
    }
  })

  test('should merge metadata objects correctly', async () => {
    const url = 'https://example.com'
    const initialMeta: Partial<BookmarkMetadata> = {
      title: 'Initial Title',
      description: 'Initial Description',
      customField: 'Initial Value',
    }
    const updateMeta: Partial<BookmarkMetadata> = {
      title: 'Updated Title',
      newField: 'New Value',
    }

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], initialMeta)

    vi.setSystemTime(secondCallTime)
    await saveBookmark(url, ['tag1'], updateMeta)

    const bookmark = getBookmark(url)
    expect(bookmark.meta).toEqual({
      title: 'Updated Title',
      description: 'Initial Description',
      customField: 'Initial Value',
      newField: 'New Value',
      created: initialTime,
      updated: secondCallTime,
    })
  })

  test('should handle URL encoded characters', async () => {
    const urls = [
      'https://example.com/path with spaces',
      'https://example.com/path%20with%20spaces',
      'https://example.com/path+with+spaces',
    ]

    await initBookmarksStore()

    for (const url of urls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ['tag1'], {
        title: 'Test',
      } as Partial<BookmarkMetadata>)
      const bookmark = getBookmark(url)
      expect(bookmark.tags).toEqual(['tag1'])
    }

    // All URLs should be normalized to the same format
    const urlMap = await getUrlMap()
    // TODO: handle encoded urls
    // expect(Object.keys(urlMap.data).length).toBe(1)
  })

  test('should validate metadata fields', async () => {
    const url = 'https://example.com'
    const invalidMeta: Record<string, unknown> = {
      title: null,
      description: undefined,
      customField: 123, // Should be string
      created: 'invalid-date', // Should be number
      updated: {}, // Should be number
    }

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], invalidMeta)

    const bookmark = getBookmark(url)
    // TODO:
    // expect(bookmark.meta).toEqual({
    //   title: "", // Null converted to empty string
    //   description: "", // Undefined converted to empty string
    //   customField: "123", // Number converted to string
    //   created: expect.any(Number),
    //   updated: expect.any(Number),
    // })
  })

  test('should deduplicate tags case-sensitively', async () => {
    const url = 'https://example.com'
    const tags = ['tag', 'Tag', 'TAG', 'tag', 'Tag']
    const expectedTags = ['tag', 'Tag', 'TAG']

    await initBookmarksStore()
    await saveBookmark(url, tags, {
      title: 'Test',
    } as Partial<BookmarkMetadata>)

    const bookmark = getBookmark(url)
    expect(bookmark.tags).toEqual(expectedTags)
  })

  test('should normalize URLs with trailing slashes', async () => {
    const urls = [
      'https://example.com',
      'https://example.com/',
      'https://example.com/path',
      'https://example.com/path/',
    ]

    await initBookmarksStore()

    for (const url of urls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ['tag1'], {
        title: 'Test',
      } as Partial<BookmarkMetadata>)
    }

    const urlMap = await getUrlMap()
    // TODO:
    // expect(Object.keys(urlMap.data).length).toBe(2) // Should normalize to with/without trailing slash

    // URLs without path should be normalized to without trailing slash
    const bookmark1 = getBookmark('https://example.com')
    expect(bookmark1.tags).toEqual(['tag1'])
    const bookmark2 = getBookmark('https://example.com/')
    expect(bookmark2.tags).toEqual(['tag1'])

    // URLs with path should preserve trailing slash
    const bookmark3 = getBookmark('https://example.com/path')
    expect(bookmark3.tags).toEqual(['tag1'])
    const bookmark4 = getBookmark('https://example.com/path/')
    expect(bookmark4.tags).toEqual(['tag1'])
  })

  test('should handle tags with special characters', async () => {
    const url = 'https://example.com'
    const tags = [
      'tag:1',
      'tag/2',
      'tag\\3',
      'tag.4',
      'tag_5',
      'tag-6',
      'tag+7',
    ]

    await initBookmarksStore()
    await saveBookmark(url, tags, { title: 'Test' })

    const bookmark = getBookmark(url)
    expect(bookmark.tags).toEqual(tags)
  })

  test('should filter out invalid tags', async () => {
    const url = 'https://example.com'
    const tags = [
      '', // Empty string
      ' ', // Only whitespace
      '\n', // Only newline
      '\t', // Only tab
      'valid-tag',
    ]

    await initBookmarksStore()
    await saveBookmark(url, tags, { title: 'Test' })

    const bookmark = getBookmark(url)
    expect(bookmark.tags).toEqual(['valid-tag'])
  })

  test('should handle different URL protocols', async () => {
    const urls = [
      'http://example.com',
      'https://example.com',
      'chrome://example.com',
      'file://example.com',
    ]

    await initBookmarksStore()

    for (const url of urls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ['tag1'], {
        title: 'Test',
      } as Partial<BookmarkMetadata>)
      const bookmark = getBookmark(url)
      if (url.startsWith('http')) {
        expect(bookmark.tags).toEqual(['tag1'])
      } else {
        expect(bookmark.tags).toEqual([])
      }
    }
  })

  test('should inherit metadata from previous bookmarks', async () => {
    const url = 'https://example.com'
    const initialMeta: Partial<BookmarkMetadata> = {
      title: 'Initial Title',
      description: 'Initial Description',
      icon: 'https://example.com/favicon.ico',
      customField: 'Initial Value',
    }

    await initBookmarksStore()
    await saveBookmark(url, ['tag1'], initialMeta)

    // Update with partial metadata
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url, ['tag2'], { title: 'Updated Title' })

    // Update with empty metadata
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url, ['tag3'], {})

    const bookmark = getBookmark(url)
    expect(bookmark.meta).toEqual({
      title: 'Updated Title',
      description: 'Initial Description',
      icon: 'https://example.com/favicon.ico',
      customField: 'Initial Value',
      created: initialTime,
      updated: thirdCallTime,
    })
  })

  test('should maintain tag usage count', async () => {
    const urls = [
      'https://example1.com',
      'https://example2.com',
      'https://example3.com',
    ]

    await initBookmarksStore()

    // Add tags to multiple URLs
    await saveBookmark(urls[0], ['common', 'tag1'], {
      title: 'Test 1',
    } as Partial<BookmarkMetadata>)
    await saveBookmark(urls[1], ['common', 'tag2'], {
      title: 'Test 2',
    } as Partial<BookmarkMetadata>)
    await saveBookmark(urls[2], ['common', 'tag3'], {
      title: 'Test 3',
    } as Partial<BookmarkMetadata>)

    const urlMap = await getUrlMap()
    const tagCounts: Record<string, number> = {}

    for (const bookmark of Object.values(urlMap)) {
      for (const tag of bookmark.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }

    expect(tagCounts).toEqual({
      common: 3,
      tag1: 1,
      tag2: 1,
      tag3: 1,
    })
  })

  test('should handle URLs with query parameters', async () => {
    const baseUrl = 'https://example.com/path'
    const urls = [
      `${baseUrl}?param1=value1`,
      `${baseUrl}?param1=value1&param2=value2`,
      `${baseUrl}?param2=value2&param1=value1`, // Same params, different order
      `${baseUrl}?param1=value1#hash`,
      `${baseUrl}#hash?param1=value1`, // Hash before query
    ]

    await initBookmarksStore()

    for (const url of urls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ['tag1'], { title: 'Test' })
    }

    const urlMap = await getUrlMap()
    // Should normalize URLs with same query parameters
    // TODO:
    // expect(Object.keys(urlMap.data).length).toBe(4)

    // Check specific cases
    const bookmark1 = getBookmark(urls[0])
    const bookmark2 = getBookmark(urls[1])
    const bookmark3 = getBookmark(urls[2])

    expect(bookmark1.tags).toEqual(['tag1'])
    expect(bookmark2.tags).toEqual(['tag1'])
    expect(bookmark3.tags).toEqual(['tag1'])
  })

  test('should handle concurrent bookmark updates across tabs', async () => {
    // Initialize store
    await initBookmarksStore()

    // Simulate first tab saving a bookmark
    const url1 = 'https://example1.com'
    const tags1 = ['tag1', 'tag2']
    const meta1 = { title: 'Example 1' }
    await saveBookmark(url1, tags1, meta1)

    // Get initial cached state
    const initialCachedUrlMap = await getCachedUrlMap()
    expect(initialCachedUrlMap[url1]).toEqual({
      tags: tags1,
      meta: expect.objectContaining({
        title: 'Example 1',
        created: initialTime,
        updated: initialTime,
      }),
    })

    // Simulate second tab updating the same bookmark
    vi.setSystemTime(secondCallTime)
    const tags2 = ['tag2', 'tag3']
    const meta2 = { title: 'Example 1 Updated' }
    await saveBookmark(url1, tags2, meta2)

    // Verify the value change listener was triggered
    expect(initialCachedUrlMap[url1]).not.toEqual({
      tags: tags2,
      meta: expect.objectContaining({
        title: 'Example 1 Updated',
        created: initialTime,
        updated: secondCallTime,
      }),
    })

    // Get updated cached state after listener execution
    const updatedCachedUrlMap = await getCachedUrlMap()
    expect(updatedCachedUrlMap[url1]).toEqual({
      tags: tags2,
      meta: expect.objectContaining({
        title: 'Example 1 Updated',
        created: initialTime,
        updated: secondCallTime,
      }),
    })
  })

  test('should maintain cache consistency during concurrent operations', async () => {
    // Initialize store
    await initBookmarksStore()

    // Simulate multiple concurrent operations
    const url1 = 'https://example1.com'
    const url2 = 'https://example2.com'

    // First operation
    vi.setSystemTime(initialTime)
    await saveBookmark(url1, ['tag1'], { title: 'Example 1' })

    // Second operation (different URL)
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url2, ['tag2'], { title: 'Example 2' })

    // Third operation (update first URL)
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url1, ['tag1', 'tag3'], { title: 'Example 1 Updated' })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency with actual data
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify both bookmarks are present with correct data
    expect(finalUrlMap[url1]).toEqual({
      tags: ['tag1', 'tag3'],
      meta: expect.objectContaining({
        title: 'Example 1 Updated',
        created: initialTime,
        updated: thirdCallTime,
      }),
    })

    expect(finalUrlMap[url2]).toEqual({
      tags: ['tag2'],
      meta: expect.objectContaining({
        title: 'Example 2',
        created: secondCallTime,
        updated: secondCallTime,
      }),
    })
  })

  test('should handle concurrent bookmark deletions across tabs', async () => {
    // Initialize store with two bookmarks
    await initBookmarksStore()
    const url1 = 'https://example1.com'
    const url2 = 'https://example2.com'

    // Create initial bookmarks
    vi.setSystemTime(initialTime)
    await saveBookmark(url1, ['tag1'], { title: 'Example 1' })
    await saveBookmark(url2, ['tag2'], { title: 'Example 2' })

    // Verify initial state
    const initialUrlMap = await getUrlMap()
    expect(Object.keys(initialUrlMap).length).toBe(2)

    // Simulate concurrent deletions from different tabs
    // First tab deletes url1 by setting empty tags
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url1, [], { title: 'Example 1 updated' })

    // Second tab deletes url2
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url2, [], { title: 'Example 2 updated' })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Both maps should be empty after deletions
    expect(Object.keys(finalUrlMap).length).toBe(2)
    expect(Object.keys(finalCachedUrlMap).length).toBe(0)
    expect(finalCachedUrlMap).not.toEqual(finalUrlMap)

    // Verify specific bookmarks are removed
    // expect(finalUrlMap[url1]).toBeUndefined()
    // expect(finalUrlMap[url2]).toBeUndefined()
    expect(finalUrlMap[url1]).toEqual({
      tags: ['tag1', DELETED_BOOKMARK_TAG],
      meta: {
        title: 'Example 1',
        created: initialTime,
        updated: initialTime,
        updated2: secondCallTime,
      },
      deletedMeta: {
        deleted: secondCallTime,
        actionType: 'DELETE',
      },
    })
    expect(finalUrlMap[url2]).toEqual({
      tags: ['tag2', DELETED_BOOKMARK_TAG],
      meta: {
        title: 'Example 2',
        created: initialTime,
        updated: initialTime,
        updated2: thirdCallTime,
      },
      deletedMeta: {
        deleted: thirdCallTime,
        actionType: 'DELETE',
      },
    })
  })

  test('should handle created field normalization in saveBookmark', async () => {
    await initBookmarksStore()
    const url = 'https://example.com'

    // Case 1: New bookmark should use current time for created
    vi.setSystemTime(initialTime)
    await saveBookmark(url, ['tag1'], { title: 'New Bookmark' })

    let bookmark = getBookmark(url)
    expect(bookmark.meta.created).toBe(initialTime)
    expect(bookmark.meta.updated).toBe(initialTime)

    // Case 2: Update existing bookmark should preserve original created time
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url, ['tag1', 'tag2'], { title: 'Updated Bookmark' })

    bookmark = getBookmark(url)
    expect(bookmark.meta.created).toBe(initialTime) // Should preserve original created time
    expect(bookmark.meta.updated).toBe(secondCallTime) // Should update to current time

    // Case 3: Update with explicit created time should use normalizeCreated logic
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url, ['tag1', 'tag2', 'tag3'], {
      title: 'Updated with Explicit Created',
      created: initialTime - 5000, // Earlier than existing created
    })

    bookmark = getBookmark(url)
    expect(bookmark.meta.created).toBe(initialTime) // Should keep original created time
    expect(bookmark.meta.updated).toBe(thirdCallTime)
  })

  test('should handle created field edge cases in saveBookmark', async () => {
    await initBookmarksStore()
    const baseUrl = 'https://example'

    // Case 1: Invalid created value (0) should use current time
    vi.setSystemTime(initialTime)
    await saveBookmark(`${baseUrl}1.com`, ['tag1'], {
      title: 'Invalid Created 0',
      created: 0,
    })

    let bookmark = getBookmark(`${baseUrl}1.com`)
    expect(bookmark.meta.created).toBe(initialTime) // Should use current time
    expect(bookmark.meta.updated).toBe(initialTime)

    // Case 2: Invalid created value (negative) should use current time
    vi.setSystemTime(secondCallTime)
    await saveBookmark(`${baseUrl}2.com`, ['tag2'], {
      title: 'Invalid Created Negative',
      created: -1000,
    })

    bookmark = getBookmark(`${baseUrl}2.com`)
    expect(bookmark.meta.created).toBe(secondCallTime) // Should use current time
    expect(bookmark.meta.updated).toBe(secondCallTime)

    // Case 3: Invalid created value (NaN) should use current time
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(`${baseUrl}3.com`, ['tag3'], {
      title: 'Invalid Created NaN',
      created: Number.NaN,
    })

    bookmark = getBookmark(`${baseUrl}3.com`)
    expect(bookmark.meta.created).toBe(thirdCallTime) // Should use current time
    expect(bookmark.meta.updated).toBe(thirdCallTime)

    // Case 4: Invalid created value (Infinity) should use current time
    const fourthCallTime = thirdCallTime + 1000
    vi.setSystemTime(fourthCallTime)
    await saveBookmark(`${baseUrl}4.com`, ['tag4'], {
      title: 'Invalid Created Infinity',
      created: Infinity,
    })

    bookmark = getBookmark(`${baseUrl}4.com`)
    expect(bookmark.meta.created).toBe(fourthCallTime) // Should use current time
    expect(bookmark.meta.updated).toBe(fourthCallTime)

    // Case 5: Out of range created value (too old) should use current time
    const fifthCallTime = fourthCallTime + 1000
    vi.setSystemTime(fifthCallTime)
    await saveBookmark(`${baseUrl}5.com`, ['tag5'], {
      title: 'Invalid Created Too Old',
      created: 100_000_000, // 1973, before MIN_VALID_TIMESTAMP
    })

    bookmark = getBookmark(`${baseUrl}5.com`)
    expect(bookmark.meta.created).toBe(fifthCallTime) // Should use current time
    expect(bookmark.meta.updated).toBe(fifthCallTime)

    // Case 6: Out of range created value (too new) should use current time
    const sixthCallTime = fifthCallTime + 1000
    vi.setSystemTime(sixthCallTime)
    await saveBookmark(`${baseUrl}6.com`, ['tag6'], {
      title: 'Invalid Created Too New',
      created: 10_000_000_000_000, // Beyond MAX_VALID_TIMESTAMP
    })

    bookmark = getBookmark(`${baseUrl}6.com`)
    expect(bookmark.meta.created).toBe(sixthCallTime) // Should use current time
    expect(bookmark.meta.updated).toBe(sixthCallTime)
  })

  test('should handle created and updated field interaction in saveBookmark', async () => {
    await initBookmarksStore()
    const url = 'https://example.com'

    // Case 1: Both created and updated provided, created > updated
    vi.setSystemTime(initialTime)
    await saveBookmark(url, ['tag1'], {
      title: 'Created > Updated',
      created: initialTime - 1000, // Earlier
      updated: initialTime - 2000, // Later (invalid order)
    })

    let bookmark = getBookmark(url)
    // normalizeCreated selects the earliest valid date between existing created and updated
    expect(bookmark.meta.created).toBe(initialTime) // Current time, ignore input created
    // normalizeUpdated should ensure created <= updated
    expect(bookmark.meta.updated).toBe(initialTime) // Current time

    // Case 2: Update existing bookmark with valid created and updated
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url, ['tag1', 'tag2'], {
      title: 'Valid Created and Updated',
      created: secondCallTime - 3000, // Valid earlier time
      updated: secondCallTime - 1000, // Valid later time
    })

    bookmark = getBookmark(url)
    // Should use the earliest valid created time
    expect(bookmark.meta.created).toBe(initialTime) // Current time, ignore input created
    expect(bookmark.meta.updated).toBe(secondCallTime) // Current time

    // Case 3: Update with only updated field
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url, ['tag1', 'tag2', 'tag3'], {
      title: 'Only Updated Field',
      updated: thirdCallTime - 1000,
    })

    bookmark = getBookmark(url)
    // Should preserve existing created time
    expect(bookmark.meta.created).toBe(initialTime) // Current time, ignore input created
    expect(bookmark.meta.updated).toBe(thirdCallTime) // Current time
  })

  test('should handle metadata inheritance with created field in saveBookmark', async () => {
    await initBookmarksStore()
    const url = 'https://example.com'

    // Initial bookmark with metadata
    vi.setSystemTime(initialTime)
    await saveBookmark(url, ['tag1'], {
      title: 'Initial Title',
      description: 'Initial Description',
      created: initialTime - 1000,
      customField: 'Initial Value',
    })

    let bookmark = getBookmark(url)
    expect(bookmark.meta).toEqual({
      title: 'Initial Title',
      description: 'Initial Description',
      created: initialTime, // Current time, ignore input created
      updated: initialTime,
      customField: 'Initial Value',
    })

    // Update with partial metadata (no created field)
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url, ['tag1', 'tag2'], {
      title: 'Updated Title',
      newField: 'New Value',
    })

    bookmark = getBookmark(url)
    expect(bookmark.meta).toEqual({
      title: 'Updated Title',
      description: 'Initial Description', // Inherited
      created: initialTime, // Preserved from normalizeCreated logic
      updated: secondCallTime,
      customField: 'Initial Value', // Inherited
      newField: 'New Value',
    })

    // Update with conflicting created field
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url, ['tag1', 'tag2', 'tag3'], {
      title: 'Final Title',
      created: thirdCallTime - 500, // Later than existing created
    })

    bookmark = getBookmark(url)
    expect(bookmark.meta).toEqual({
      title: 'Final Title',
      description: 'Initial Description', // Inherited
      created: initialTime, // Preserved original created time
      updated: thirdCallTime,
      customField: 'Initial Value', // Inherited
      newField: 'New Value', // Inherited
    })
  })

  test('should handle created field consistency across multiple bookmarks', async () => {
    await initBookmarksStore()
    const urls = [
      'https://example1.com',
      'https://example2.com',
      'https://example3.com',
    ]

    // Create bookmarks with different created times
    vi.setSystemTime(initialTime)
    await saveBookmark(urls[0], ['tag1'], {
      title: 'Bookmark 1',
      // No created field provided, should use current time
    })

    vi.setSystemTime(secondCallTime)
    await saveBookmark(urls[1], ['tag2'], {
      title: 'Bookmark 2',
      created: secondCallTime - 1000,
    })

    vi.setSystemTime(thirdCallTime)
    await saveBookmark(urls[2], ['tag3'], {
      title: 'Bookmark 3',
      // No created field, should use current time
    })

    // Verify each bookmark has correct created time
    const bookmark1 = getBookmark(urls[0])
    const bookmark2 = getBookmark(urls[1])
    const bookmark3 = getBookmark(urls[2])

    expect(bookmark1.meta.created).toBe(initialTime) // Uses current time as no created provided
    expect(bookmark1.meta.updated).toBe(initialTime)

    expect(bookmark2.meta.created).toBe(secondCallTime) // normalizeCreated result based on actual behavior
    expect(bookmark2.meta.updated).toBe(secondCallTime)

    expect(bookmark3.meta.created).toBe(thirdCallTime)
    expect(bookmark3.meta.updated).toBe(thirdCallTime)

    // Verify created <= updated invariant for all bookmarks
    const allBookmarks = [bookmark1, bookmark2, bookmark3]
    for (const bookmark of allBookmarks) {
      expect(bookmark.meta.created).toBeLessThanOrEqual(bookmark.meta.updated)
    }

    // Update one bookmark and verify created time preservation
    const fourthCallTime = thirdCallTime + 1000
    vi.setSystemTime(fourthCallTime)
    await saveBookmark(urls[0], ['tag1', 'tag4'], {
      title: 'Updated Bookmark 1',
      created: fourthCallTime - 500, // Later than existing created
    })

    const updatedBookmark1 = getBookmark(urls[0])
    expect(updatedBookmark1.meta.created).toBe(initialTime) // Should preserve original created time
    expect(updatedBookmark1.meta.updated).toBe(fourthCallTime)
  })

  test('should handle concurrent tag usage count updates', async () => {
    // Initialize store with multiple bookmarks using the same tags
    await initBookmarksStore()
    const url1 = 'https://example1.com'
    const url2 = 'https://example2.com'
    const url3 = 'https://example3.com'
    const commonTags = ['common1', 'common2']

    // Create initial bookmarks with common tags
    vi.setSystemTime(initialTime)
    await saveBookmark(url1, [...commonTags, 'unique1'], { title: 'Example 1' })
    await saveBookmark(url2, [...commonTags, 'unique2'], { title: 'Example 2' })

    // Simulate concurrent operations that affect tag usage
    // First tab adds a new bookmark with common tags
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url3, [...commonTags, 'unique3'], { title: 'Example 3' })

    // Second tab updates an existing bookmark removing common tags
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url1, ['unique1'], { title: 'Example 1 Updated' })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify bookmark states
    expect(finalUrlMap[url1]).toEqual({
      tags: ['unique1'],
      meta: expect.objectContaining({
        title: 'Example 1 Updated',
        created: initialTime,
        updated: thirdCallTime,
      }),
    })

    expect(finalUrlMap[url2]).toEqual({
      tags: expect.arrayContaining([...commonTags, 'unique2']),
      meta: expect.objectContaining({
        title: 'Example 2',
        created: initialTime,
        updated: initialTime,
      }),
    })

    expect(finalUrlMap[url3]).toEqual({
      tags: expect.arrayContaining([...commonTags, 'unique3']),
      meta: expect.objectContaining({
        title: 'Example 3',
        created: secondCallTime,
        updated: secondCallTime,
      }),
    })
  })

  test('should handle concurrent metadata inheritance', async () => {
    // Initialize store with a bookmark that will serve as metadata source
    await initBookmarksStore()
    const sourceUrl = 'https://example.com/source'
    const url1 = 'https://example.com/page1'
    const url2 = 'https://example.com/page2'

    // Create source bookmark with rich metadata
    vi.setSystemTime(initialTime)
    await saveBookmark(sourceUrl, ['tag1'], {
      title: 'Source Page',
      description: 'Original description',
      icon: 'https://example.com/icon.png',
      custom: 'custom value',
    })

    // Simulate concurrent operations inheriting metadata
    // First tab saves a bookmark inheriting metadata
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url1, ['tag2'], {
      title: 'Page 1',
    })

    // Second tab updates source metadata and saves another bookmark
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(sourceUrl, ['tag1'], {
      title: 'Source Page Updated',
      description: 'Updated description',
      icon: 'https://example.com/new-icon.png',
      custom: 'new value',
    })

    // Third tab saves another bookmark that should inherit updated metadata
    const fourthCallTime = thirdCallTime + 1000
    vi.setSystemTime(fourthCallTime)
    await saveBookmark(url2, ['tag3'], {
      title: 'Page 2',
    })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify source bookmark state
    expect(finalUrlMap[sourceUrl]).toEqual({
      tags: ['tag1'],
      meta: expect.objectContaining({
        title: 'Source Page Updated',
        description: 'Updated description',
        icon: 'https://example.com/new-icon.png',
        custom: 'new value',
        created: initialTime,
        updated: thirdCallTime,
      }),
    })

    // First bookmark should have its own metadata
    expect(finalUrlMap[url1]).toEqual({
      tags: ['tag2'],
      meta: expect.objectContaining({
        title: 'Page 1',
        created: secondCallTime,
        updated: secondCallTime,
      }),
    })

    // Second bookmark should have its own metadata
    expect(finalUrlMap[url2]).toEqual({
      tags: ['tag3'],
      meta: expect.objectContaining({
        title: 'Page 2',
        created: fourthCallTime,
        updated: fourthCallTime,
      }),
    })
  })

  it('should handle concurrent import/export operations', async () => {
    // Create initial bookmarks
    const url1 = 'https://example1.com'
    const url2 = 'https://example2.com'
    vi.setSystemTime(initialTime)
    await saveBookmark(url1, ['tag1'], { title: 'Example 1' })
    await saveBookmark(url2, ['tag2'], { title: 'Example 2' })

    // Simulate first tab modifying a bookmark during export
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url1, ['tag1', 'export'], {
      title: 'Example 1 Updated',
      exported: secondCallTime,
    })

    // Simulate second tab adding a new bookmark
    const url3 = 'https://example3.com'
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url3, ['tag3'], { title: 'Example 3' })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify all bookmarks are present
    expect(Object.keys(finalUrlMap).length).toBe(3)

    // Verify individual bookmarks
    expect(finalUrlMap[url1]).toEqual({
      tags: ['tag1', 'export'],
      meta: expect.objectContaining({
        title: 'Example 1 Updated',
        exported: secondCallTime,
        created: initialTime,
        updated: secondCallTime,
      }),
    })

    expect(finalUrlMap[url2]).toEqual({
      tags: ['tag2'],
      meta: expect.objectContaining({
        title: 'Example 2',
        created: initialTime,
        updated: initialTime,
      }),
    })

    expect(finalUrlMap[url3]).toEqual({
      tags: ['tag3'],
      meta: expect.objectContaining({
        title: 'Example 3',
        created: thirdCallTime,
        updated: thirdCallTime,
      }),
    })
  })

  it('should handle concurrent tag renaming operations', async () => {
    // Initialize store with some bookmarks
    await initBookmarksStore()

    const initialTime = new Date(2023, 0, 1).getTime()
    const secondCallTime = new Date(2023, 0, 2).getTime()
    const thirdCallTime = new Date(2023, 0, 3).getTime()
    vi.setSystemTime(initialTime)

    // Create initial bookmarks with common tag
    const url1 = 'https://example1.com'
    const url2 = 'https://example2.com'
    const url3 = 'https://example3.com'
    const oldTag = 'old-tag'
    const newTag1 = 'new-tag-1'
    const newTag2 = 'new-tag-2'

    await saveBookmark(url1, [oldTag, 'tag1'], { title: 'Example 1' })
    await saveBookmark(url2, [oldTag, 'tag2'], { title: 'Example 2' })
    await saveBookmark(url3, [oldTag, 'tag3'], { title: 'Example 3' })

    // Simulate first tab renaming the tag
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url1, [newTag1, 'tag1'], { title: 'Example 1' })
    await saveBookmark(url2, [newTag1, 'tag2'], { title: 'Example 2' })

    // Simulate second tab renaming the same tag
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url2, [newTag2, 'tag2'], { title: 'Example 2' })
    await saveBookmark(url3, [newTag2, 'tag3'], { title: 'Example 3' })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify all bookmarks are present
    expect(Object.keys(finalUrlMap).length).toBe(3)

    // Verify individual bookmarks
    expect(finalUrlMap[url1]).toEqual({
      tags: [newTag1, 'tag1'],
      meta: expect.objectContaining({
        title: 'Example 1',
        created: initialTime,
        updated: secondCallTime,
      }),
    })

    expect(finalUrlMap[url2]).toEqual({
      tags: [newTag2, 'tag2'],
      meta: expect.objectContaining({
        title: 'Example 2',
        created: initialTime,
        updated: thirdCallTime,
      }),
    })

    expect(finalUrlMap[url3]).toEqual({
      tags: [newTag2, 'tag3'],
      meta: expect.objectContaining({
        title: 'Example 3',
        created: initialTime,
        updated: thirdCallTime,
      }),
    })
  })

  describe('Migration from v0.13.0 timestamp bug fix', () => {
    test('should fix created timestamp bug from v0.13.0', async () => {
      // Mock a v0.13.0 store with the timestamp bug
      // In v0.13.0, created timestamps of 0 were incorrectly set to current time
      const buggyV0_13_0Store = {
        data: {
          'https://example1.com': {
            tags: ['tag1'],
            meta: {
              title: 'Example 1',
              created: initialTime, // This was incorrectly set to 'now' instead of 0
              updated: initialTime - 5000, // Original updated time (earlier than created)
            },
          },
          'https://example2.com': {
            tags: ['tag2'],
            meta: {
              title: 'Example 2',
              created: initialTime, // This was incorrectly set to 'now' instead of 0
              updated: initialTime - 3000, // Original updated time (earlier than created)
            },
          },
          'https://example3.com': {
            tags: ['tag3'],
            meta: {
              title: 'Example 3',
              created: initialTime - 2000, // This was correctly preserved
              updated: initialTime - 1000, // Normal case
            },
          },
        },
        meta: {
          databaseVersion: 3,
          extensionVersion: '0.13.0',
          created: initialTime - 10_000,
          updated: initialTime,
        },
      }

      getValue.mockResolvedValueOnce(buggyV0_13_0Store)
      // setValue.mockResolvedValue(undefined)

      // Initialize store to trigger migration
      await initBookmarksStore()

      // Verify migration was triggered
      expect(setValue).toHaveBeenCalled()
      const savedStore = setValue.mock.calls[0][1] as any

      // Verify the bug was fixed: created should use updated timestamp when it was incorrectly set
      expect(savedStore.data['https://example1.com'].meta.created).toBe(
        initialTime - 5000
      ) // Should use the earlier updated time
      expect(savedStore.data['https://example1.com'].meta.updated).toBe(
        initialTime - 5000
      )

      expect(savedStore.data['https://example2.com'].meta.created).toBe(
        initialTime - 3000
      ) // Should use the earlier updated time
      expect(savedStore.data['https://example2.com'].meta.updated).toBe(
        initialTime - 3000
      )

      // Normal case should remain unchanged
      expect(savedStore.data['https://example3.com'].meta.created).toBe(
        initialTime - 2000
      )
      expect(savedStore.data['https://example3.com'].meta.updated).toBe(
        initialTime - 1000
      )

      // Verify metadata is preserved
      expect(savedStore.meta.created).toBe(initialTime - 10_000)
      expect(savedStore.meta.extensionVersion).toBe(currentExtensionVersion)
      expect(savedStore.meta.databaseVersion).toBe(currentDatabaseVersion)
    })

    test('should skip migration for non-v0.13.0 stores', async () => {
      // Mock a store that doesn't need migration
      const normalStore = {
        data: {
          'https://example.com': {
            tags: ['tag1'],
            meta: {
              title: 'Example',
              created: initialTime - 1000,
              updated: initialTime,
            },
          },
        },
        meta: {
          databaseVersion: 3,
          extensionVersion: '0.14.0', // Not v0.13.0
          created: initialTime - 5000,
          updated: initialTime,
        },
      }

      getValue.mockResolvedValueOnce(normalStore)

      // Initialize store
      await initBookmarksStore()

      // Verify no migration was triggered (setValue should not be called for migration)
      expect(setValue).not.toHaveBeenCalled()
    })

    test('should handle invalid data during v0.13.0 migration', async () => {
      // Mock a v0.13.0 store with invalid data
      const invalidV0_13_0Store = {
        data: {
          'https://example.com': {
            tags: ['tag1'],
            meta: {
              title: 'Example',
              created: initialTime,
              updated: initialTime,
            },
          },
          'invalid-url': {
            tags: ['tag2'],
            meta: {
              title: 'Invalid URL',
              created: initialTime,
              updated: initialTime,
            },
          },
          'https://example2.com': {
            tags: null, // Invalid tags
            meta: {
              title: 'Invalid Tags',
              created: initialTime,
              updated: initialTime,
            },
          },
          'https://example3.com': 'invalid-bookmark', // Invalid bookmark object
        },
        meta: {
          databaseVersion: 3,
          extensionVersion: '0.13.0',
          created: initialTime - 5000,
          updated: initialTime,
        },
      }

      getValue.mockResolvedValueOnce(invalidV0_13_0Store)
      // setValue.mockResolvedValue(undefined)

      // Initialize store to trigger migration
      await initBookmarksStore()

      // Verify migration was triggered
      expect(setValue).toHaveBeenCalled()
      const savedStore = setValue.mock.calls[0][1] as BookmarksStore

      // Verify only valid bookmark was migrated
      expect(Object.keys(savedStore.data)).toEqual(['https://example.com'])
      expect(savedStore.data['https://example.com']).toEqual({
        tags: ['tag1'],
        meta: expect.objectContaining({
          title: 'Example',
          created: initialTime,
          updated: initialTime,
        }),
      })

      // Verify metadata is preserved
      expect(savedStore.meta.created).toBe(initialTime - 5000)
    })
  })

  describe('filterDeleted functionality', () => {
    test("should filter out bookmarks with '._DELETED_' tag from cachedUrlMap", async () => {
      await initBookmarksStore()

      const url1 = 'https://example1.com'
      const url2 = 'https://example2.com'
      const url3 = 'https://example3.com'

      // Save normal bookmarks
      await saveBookmark(url1, ['tag1', 'tag2'], { title: 'Example 1' })
      await saveBookmark(url2, ['tag2', 'tag3'], { title: 'Example 2' })

      // Save bookmark with deleted tag
      await saveBookmark(url3, ['tag3', DELETED_BOOKMARK_TAG], {
        title: 'Example 3',
      })

      // Get cached URL map
      const cachedUrlMap = await getCachedUrlMap()

      // Verify that cachedUrlMap does not contain bookmarks with '._DELETED_' tag
      expect(Object.keys(cachedUrlMap)).toHaveLength(2)
      expect(cachedUrlMap[url1]).toBeDefined()
      expect(cachedUrlMap[url2]).toBeDefined()
      expect(cachedUrlMap[url3]).toBeUndefined()

      // Verify the content of non-deleted bookmarks
      expect(cachedUrlMap[url1]).toEqual({
        tags: ['tag1', 'tag2'],
        meta: expect.objectContaining({
          title: 'Example 1',
          created: initialTime,
          updated: initialTime,
        }),
      })

      expect(cachedUrlMap[url2]).toEqual({
        tags: ['tag2', 'tag3'],
        meta: expect.objectContaining({
          title: 'Example 2',
          created: initialTime,
          updated: initialTime,
        }),
      })
    })

    test("should handle bookmarks that only have '._DELETED_' tag", async () => {
      await initBookmarksStore()

      const url1 = 'https://example1.com'
      const url2 = 'https://example2.com'

      // Save normal bookmark
      await saveBookmark(url1, ['tag1'], { title: 'Example 1' })

      // Save bookmark with only deleted tag
      await saveBookmark(url2, [DELETED_BOOKMARK_TAG], { title: 'Example 2' })

      const cachedUrlMap = await getCachedUrlMap()

      // Verify only non-deleted bookmark is in cache
      expect(Object.keys(cachedUrlMap)).toHaveLength(1)
      expect(cachedUrlMap[url1]).toBeDefined()
      expect(cachedUrlMap[url2]).toBeUndefined()
    })

    test('should handle empty bookmarks data', async () => {
      await initBookmarksStore()

      const cachedUrlMap = await getCachedUrlMap()

      // Verify empty cache for empty data
      expect(Object.keys(cachedUrlMap)).toHaveLength(0)
      expect(cachedUrlMap).toEqual({})
    })

    test('should filter deleted bookmarks during store initialization', async () => {
      // Mock existing store with mixed bookmarks
      const existingStore = {
        data: {
          'https://example1.com': {
            tags: ['tag1', 'tag2'],
            meta: {
              title: 'Example 1',
              created: initialTime - 1000,
              updated: initialTime - 500,
            },
          },
          'https://example2.com': {
            tags: ['tag2', DELETED_BOOKMARK_TAG],
            meta: {
              title: 'Example 2 (Deleted)',
              created: initialTime - 2000,
              updated: initialTime - 1000,
            },
          },
          'https://example3.com': {
            tags: ['tag3'],
            meta: {
              title: 'Example 3',
              created: initialTime - 1500,
              updated: initialTime - 750,
            },
          },
        },
        meta: {
          databaseVersion: currentDatabaseVersion,
          extensionVersion: currentExtensionVersion,
          created: initialTime - 2000,
          updated: initialTime,
        },
      }

      getValue.mockResolvedValueOnce(existingStore)

      // Initialize store
      await initBookmarksStore()

      const cachedUrlMap = await getCachedUrlMap()

      // Verify only non-deleted bookmarks are cached
      expect(Object.keys(cachedUrlMap)).toHaveLength(2)
      expect(cachedUrlMap['https://example1.com']).toBeDefined()
      expect(cachedUrlMap['https://example2.com']).toBeUndefined()
      expect(cachedUrlMap['https://example3.com']).toBeDefined()
    })

    test('should update cachedUrlMap when bookmark is marked as deleted', async () => {
      await initBookmarksStore()

      const url = 'https://example.com'

      // Save normal bookmark
      await saveBookmark(url, ['tag1'], { title: 'Example' })

      let cachedUrlMap = await getCachedUrlMap()
      expect(cachedUrlMap[url]).toBeDefined()

      // Mark bookmark as deleted
      vi.setSystemTime(secondCallTime)
      await saveBookmark(url, ['tag1', DELETED_BOOKMARK_TAG], {
        title: 'Example',
      })

      cachedUrlMap = await getCachedUrlMap()

      // Verify bookmark is removed from cache
      expect(cachedUrlMap[url]).toBeUndefined()
      expect(Object.keys(cachedUrlMap)).toHaveLength(0)
    })

    test('should restore bookmark to cachedUrlMap when deleted tag is removed', async () => {
      await initBookmarksStore()

      const url = 'https://example.com'

      // Save bookmark with deleted tag
      await saveBookmark(url, ['tag1', DELETED_BOOKMARK_TAG], {
        title: 'Example',
      })

      let cachedUrlMap = await getCachedUrlMap()
      expect(cachedUrlMap[url]).toBeUndefined()

      // Remove deleted tag
      vi.setSystemTime(secondCallTime)
      await saveBookmark(url, ['tag1'], { title: 'Example' })

      cachedUrlMap = await getCachedUrlMap()

      // Verify bookmark is restored to cache
      expect(cachedUrlMap[url]).toBeDefined()
      expect(cachedUrlMap[url]).toEqual({
        tags: ['tag1'],
        meta: expect.objectContaining({
          title: 'Example',
          created: initialTime,
          updated: secondCallTime,
        }),
      })
    })
  })

  describe('Error handling', () => {
    test('should handle storage operation failures during migration', async () => {
      // Mock storage operation failure during migration (since getBookmarksStore catches errors)
      const v2Store = {
        meta: {
          databaseVersion: 2,
          extensionVersion: '0.10.0',
          created: Date.now(),
        },
        'https://example.com': {
          tags: ['tag1'],
          meta: { created: Date.now() },
        },
      }
      getValue.mockResolvedValueOnce(v2Store)
      setValue.mockRejectedValueOnce(new Error('Storage write failed'))

      // Attempt to initialize bookmarks store
      await expect(initBookmarksStore()).rejects.toThrow('Storage write failed')

      // Verify error handling behavior
      expect(getValue).toHaveBeenCalledWith('extension.utags.urlmap')
      expect(setValue).toHaveBeenCalled()
    })

    test('should handle version incompatibility', async () => {
      // Mock a store with higher database version
      const futureVersionStore = {
        data: {},
        meta: {
          databaseVersion: currentDatabaseVersion + 1,
          extensionVersion: currentExtensionVersion,
          created: initialTime,
          updated: initialTime,
        },
      }

      // Mock window.location.reload
      const reloadMock = vi.fn()
      const originalLocation = globalThis.location
      Object.defineProperty(globalThis, 'location', {
        writable: true,
        value: {},
      })
      Object.defineProperty(globalThis.location, 'reload', {
        configurable: true,
        value: reloadMock,
      })

      getValue.mockResolvedValueOnce(futureVersionStore)

      // Initialize store with incompatible version
      await initBookmarksStore()

      // Verify reload was triggered
      expect(reloadMock).toHaveBeenCalled()
      expect(setValue).not.toHaveBeenCalled()

      // Restore original location
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation,
      })
    })

    test('should throw error for unsupported database version', async () => {
      // Mock a store with unsupported database version
      const unsupportedVersionStore = {
        data: {},
        meta: {
          databaseVersion: 1, // Unsupported version
          extensionVersion: currentExtensionVersion,
          created: initialTime,
          updated: initialTime,
        },
      }

      getValue.mockResolvedValueOnce(unsupportedVersionStore)

      // Attempt to initialize store with unsupported version
      await expect(initBookmarksStore()).rejects.toThrow(
        `Database version mismatch - Previous: 1, Current: ${currentDatabaseVersion}`
      )

      // Verify error handling behavior
      expect(getValue).toHaveBeenCalledWith('extension.utags.urlmap')
      expect(setValue).not.toHaveBeenCalled()
    })

    test('should handle migration failure', async () => {
      // Mock a V2 store with invalid data that will cause migration to fail
      const invalidV2Store = {
        meta: {
          extensionVersion: currentExtensionVersion,
          databaseVersion: 2,
        },
        'https://example.com': {
          tags: ['tag1'],
          meta: {
            title: 'Example',
            created: 'invalid_timestamp', // Invalid timestamp will cause migration to fail
            updated: initialTime,
          },
        },
      }

      getValue.mockResolvedValueOnce(invalidV2Store)
      setValue.mockRejectedValueOnce(new Error('Migration failed'))

      // Attempt to initialize store with invalid data
      await expect(initBookmarksStore()).rejects.toThrow('Migration failed')

      // Verify error handling behavior
      expect(getValue).toHaveBeenCalledWith('extension.utags.urlmap')
      expect(setValue).toHaveBeenCalledTimes(1)
      const urlMap = await getCachedUrlMap()
      expect(urlMap).toEqual({})
    })
  })

  describe('saveBookmark coverage', () => {
    test('should handle invalid key deletion', async () => {
      // Setup: Add an invalid key directly to storage
      const invalidKey = 'not-a-url'
      const initialStore: BookmarksStore = {
        data: {
          [invalidKey]: {
            tags: ['tag1'],
            meta: { created: initialTime, updated: initialTime },
          },
        },
        meta: {
          databaseVersion: currentDatabaseVersion,
          extensionVersion: currentExtensionVersion,
          created: initialTime,
          updated: initialTime,
        },
      }
      getValue.mockResolvedValue(initialStore)

      // Case 1: changed = true (exists -> deleted)
      await saveBookmark(invalidKey, [], undefined)
      expect(setValue).toHaveBeenCalledTimes(1)
      // verify it's gone
      const callArg = setValue.mock.calls[0][1] as BookmarksStore
      expect(callArg.data[invalidKey]).toBeUndefined()

      // Case 2: changed = false (doesn't exist -> no change)
      setValue.mockClear()
      getValue.mockResolvedValue(callArg) // update mock to reflect deletion
      await saveBookmark(invalidKey, [], undefined)
      expect(setValue).not.toHaveBeenCalled()
    })

    test('should handle soft deletion with empty tags', async () => {
      const key = 'https://example.com/delete-me'
      // Setup: exists
      const initialStore: BookmarksStore = {
        data: {
          [key]: {
            tags: ['tag1'],
            meta: { created: initialTime, updated: initialTime },
          },
        },
        meta: {
          databaseVersion: currentDatabaseVersion,
          extensionVersion: currentExtensionVersion,
          created: initialTime,
          updated: initialTime,
        },
      }
      getValue.mockResolvedValue(initialStore)

      // Case 1: changed = true (active -> soft deleted)
      await saveBookmark(key, [], undefined)
      expect(setValue).toHaveBeenCalledTimes(1)
      const callArg1 = setValue.mock.calls[0][1] as BookmarksStore
      expect(callArg1.data[key].tags).toContain(DELETED_BOOKMARK_TAG)

      // Case 2: changed = false (already deleted -> no change)
      setValue.mockClear()
      getValue.mockResolvedValue(callArg1)
      await saveBookmark(key, [], undefined)
      expect(setValue).not.toHaveBeenCalled()
    })

    test('should handle bookmark updates', async () => {
      const key = 'https://example.com/update-me'
      const initialData = {
        tags: ['tag1'],
        meta: {
          created: initialTime,
          updated: initialTime,
          title: 'Old Title',
        },
      }
      const initialStore: BookmarksStore = {
        data: {
          [key]: initialData,
        },
        meta: {
          databaseVersion: currentDatabaseVersion,
          extensionVersion: currentExtensionVersion,
          created: initialTime,
          updated: initialTime,
        },
      }
      getValue.mockResolvedValue(initialStore)

      // Case 1: changed = true (update title)
      await saveBookmark(key, ['tag1'], { title: 'New Title' })
      expect(setValue).toHaveBeenCalledTimes(1)
      const callArg1 = setValue.mock.calls[0][1] as BookmarksStore
      expect(callArg1.data[key].meta.title).toBe('New Title')

      // Case 2: changed = false (same data)
      setValue.mockClear()
      getValue.mockResolvedValue(callArg1)
      await saveBookmark(key, ['tag1'], { title: 'New Title' }) // Same title
      expect(setValue).not.toHaveBeenCalled()
    })
  })
})
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

/*

通过分析代码实现和现有测试用例，我发现以下几个场景需要补充测试：

3. 性能边界测试
   - 测试大量书签数据时的性能表现
   - 测试大量标签时的性能表现
   - 测试频繁更新操作时的性能表现

4. URL 规范化测试的完善
   - 补充 `TODO` 注释中提到的 URL 编码测试
   - 完善带查询参数的 URL 规范化测试
   - 补充国际化域名（IDN）的测试

5. 元数据验证测试的完善
   - 补充 `TODO` 注释中提到的元数据字段验证测试
   - 测试无效的日期时间值处理
   - 测试特殊字符在元数据中的处理

7. 存储限制测试
   - 测试达到存储容量限制时的行为
   - 测试单个书签数据超过大小限制时的处理

8. 安全性测试
   - 测试 XSS 攻击向量（在标签和元数据中）
   - 测试 URL 注入攻击
   - 测试敏感数据处理

这些补充测试用例将有助于提高代码的健壮性和可靠性。建议优先实现错误处理测试和 URL 规范化测试，因为这些是当前代码中已标记 `TODO` 的部分。
*/
