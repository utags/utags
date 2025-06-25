/**
 * @vitest-environment jsdom
 */
import { addValueChangeListener } from "browser-extension-storage"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
  vi,
} from "vitest"

import type {
  BookmarkMetadata,
  BookmarksData,
  BookmarksStore,
  BookmarkTagsAndMetadata,
} from "../types/bookmarks.js"
import {
  currentDatabaseVersion,
  currentExtensionVersion,
  getBookmark,
  getCachedUrlMap,
  getUrlMap,
  initBookmarksStore,
  saveBookmark,
  type BookmarksStoreV2,
} from "./bookmarks.js"

// Define storage types
type StorageKey = "extension.utags.urlmap"
type StorageValue = Record<string, unknown>
type StorageData = Partial<Record<StorageKey, StorageValue>>

// Define mock listener type
type ValueChangeListener = (value: unknown) => void
type ListenerMap = Record<string, ValueChangeListener[]>

// Mock browser-extension-storage module
vi.mock("browser-extension-storage", () => {
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
      .mockImplementation((key: string, listener: (value: unknown) => void) => {
        if (!listeners[key]) {
          listeners[key] = []
        }

        listeners[key].push(listener)
      }),
    resetStorage: vi.fn().mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      for (const key of Object.keys(mockStorage)) delete mockStorage[key]
      // Should'nt reset listeners, as it's added only once
      // Object.keys(listeners).forEach((key) => delete listeners[key])
    }),
  }
})

// Define settings types
type SettingsKey = "pinnedTags" | "emojiTags"
type SettingsValue = string
type SettingsData = Partial<Record<SettingsKey, SettingsValue>>

// Mock browser-extension-settings module
vi.mock("browser-extension-settings", () => {
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

describe("bookmarks", () => {
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
    const browserExtensionStorage = await import("browser-extension-storage")
    getValue = vi.mocked(browserExtensionStorage.getValue)
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

  test("should initialize empty bookmarks store", async () => {
    await initBookmarksStore()

    expect(getValue).toHaveBeenCalledWith("extension.utags.urlmap")
    const urlMap = await getUrlMap()
    expect(urlMap).toEqual({})
    expect(setValue).not.toHaveBeenCalled()
  })

  test("should migrate from V2 to V3 format", async () => {
    const v2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      "https://example1.com": {
        tags: ["tag1", "tag2"],
        meta: {
          title: "Example 1",
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
      "https://example2.com": {
        tags: ["tag2", "tag3"],
        meta: {
          title: "Example 2",
          created: initialTime - 2000,
          updated: initialTime - 1500,
        },
      },
    }

    getValue.mockResolvedValueOnce(v2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        "https://example1.com": {
          tags: ["tag1", "tag2"],
          meta: {
            title: "Example 1",
            created: initialTime - 1000,
            updated: expect.any(Number),
          },
        },
        "https://example2.com": {
          tags: ["tag2", "tag3"],
          meta: {
            title: "Example 2",
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
      "https://example1.com": v2Store["https://example1.com"],
      "https://example2.com": v2Store["https://example2.com"],
    })
    expect(newBookmarksStore["https://example1.com"]).toBeUndefined()
    expect(newBookmarksStore["https://example2.com"]).toBeUndefined()
  })

  test("should handle empty V2 store during migration", async () => {
    const emptyV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
    }

    getValue.mockResolvedValueOnce(emptyV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {},
      meta: expect.objectContaining({
        databaseVersion: currentDatabaseVersion,
        extensionVersion: currentExtensionVersion,
        created: expect.any(Number),
        updated: expect.any(Number),
      }),
    })
  })

  test("should handle special characters during V2 to V3 migration", async () => {
    const specialCharsV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      "https://example.com/path with spaces": {
        tags: ["tag:1", "tag/2", "tag\\3", "tag.4", "tag_5", "tag-6", "tag+7"],
        meta: {
          title: "Special Characters Test",
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
      "https://example.com/path%20with%20encoded%20spaces": {
        tags: ["emoji:🎉", "unicode:测试", "special:!@#$%^&*()"],
        meta: {
          title: "URL Encoding Test",
          created: initialTime - 2000,
          updated: initialTime - 1500,
        },
      },
    }

    getValue.mockResolvedValueOnce(specialCharsV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        "https://example.com/path with spaces": {
          tags: [
            "tag:1",
            "tag/2",
            "tag\\3",
            "tag.4",
            "tag_5",
            "tag-6",
            "tag+7",
          ],
          meta: expect.objectContaining({
            title: "Special Characters Test",
            created: initialTime - 1000,
            updated: expect.any(Number),
          }),
        },
        "https://example.com/path%20with%20encoded%20spaces": {
          tags: ["emoji:🎉", "unicode:测试", "special:!@#$%^&*()"],
          meta: expect.objectContaining({
            title: "URL Encoding Test",
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

  test("should handle version compatibility during V2 to V3 migration", async () => {
    const oldVersionV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: "1.0.0", // Old extension version
        databaseVersion: 2,
      },
      "https://example.com": {
        tags: ["tag1"],
        meta: {
          title: "Test",
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
    }

    getValue.mockResolvedValueOnce(oldVersionV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        "https://example.com": {
          tags: ["tag1"],
          meta: expect.objectContaining({
            title: "Test",
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

  test("should handle metadata inheritance during V2 to V3 migration", async () => {
    const metadataV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      "https://example1.com": {
        tags: ["tag1"],
        meta: {
          title: "Example 1",
          description: "Description 1",
          icon: "https://example1.com/favicon.ico",
          customField: "Value 1",
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
      "https://example2.com": {
        tags: ["tag2"],
        meta: {
          // Partial metadata
          title: "Example 2",
          icon: "https://example2.com/favicon.ico",
          created: initialTime - 2000,
          updated: initialTime - 1500,
        },
      },
      "https://example3.com": {
        tags: ["tag3"],
        // No metadata
      },
    }

    getValue.mockResolvedValueOnce(metadataV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        "https://example1.com": {
          tags: ["tag1"],
          meta: expect.objectContaining({
            title: "Example 1",
            description: "Description 1",
            icon: "https://example1.com/favicon.ico",
            customField: "Value 1",
            created: initialTime - 1000,
            updated: initialTime - 500, // Inherited from V2
          }) as unknown,
        },
        "https://example2.com": {
          tags: ["tag2"],
          meta: expect.objectContaining({
            title: "Example 2",
            icon: "https://example2.com/favicon.ico",
            created: initialTime - 2000,
            updated: initialTime - 1500, // Inherited from V2
          }) as unknown,
        },
        "https://example3.com": {
          tags: ["tag3"],
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

  test("should handle invalid data during V2 to V3 migration", async () => {
    const invalidV2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      "not-a-url": { tags: ["tag1"] },
      "https://example.com": null as unknown as any,
      "https://valid.com": { tags: null as unknown as any },
      "https://valid2.com": { tags: ["tag1"] },
    }

    getValue.mockResolvedValueOnce(invalidV2Store)
    await initBookmarksStore()

    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        "https://valid2.com": {
          tags: ["tag1"],
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

  test("should handle corrupted data during V2 to V3 migration", async () => {
    const corruptedV2Store = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      "https://example1.com": {
        tags: [123, null, "valid-tag", { invalid: "object" }],
        meta: {
          title: true, // Invalid type
          created: "invalid-date", // Invalid date
          updated: -1, // Invalid timestamp
          description: Buffer.from("invalid"), // Invalid object type
        },
      },
      "https://example2.com": "invalid-bookmark-data", // Invalid bookmark structure
      "https://example3.com": {
        tags: ["valid-tag"],
        meta: {
          title: "Valid Title",
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
      "https://example4.com": {
        tags: ["valid-tag"],
        meta: {
          title: true, // Invalid type
          created: "invalid-date", // Invalid date
          updated: -1, // Invalid timestamp
          description: Buffer.from("invalid"), // Invalid object type
        },
      },
    }

    getValue.mockResolvedValueOnce(corruptedV2Store)
    await initBookmarksStore()

    // Should only migrate valid data and ignore corrupted entries
    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        "https://example3.com": {
          tags: ["valid-tag"],
          meta: {
            title: "Valid Title",
            created: initialTime - 1000,
            updated: initialTime - 500,
          },
        },
        "https://example4.com": {
          tags: ["valid-tag"],
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

  test("should recover from interrupted V2 to V3 migration", async () => {
    // First migration attempt with network error
    const v2Store: BookmarksStoreV2 = {
      meta: {
        extensionVersion: currentExtensionVersion,
        databaseVersion: 2,
      },
      "https://example1.com": {
        tags: ["tag1"],
        meta: {
          title: "Example 1",
          created: initialTime - 1000,
          updated: initialTime - 500,
        },
      },
    }

    // Simulate network error during first migration attempt
    getValue.mockResolvedValueOnce(v2Store)
    setValue.mockRejectedValueOnce(new Error("Network error"))

    // First attempt should fail
    await expect(initBookmarksStore()).rejects.toThrow("Network error")

    // Second migration attempt should succeed
    getValue.mockResolvedValueOnce(v2Store)
    await initBookmarksStore()

    // Verify the migration completed successfully on second attempt
    expect(setValue).toHaveBeenLastCalledWith("extension.utags.urlmap", {
      data: {
        "https://example1.com": {
          tags: ["tag1"],
          meta: expect.objectContaining({
            title: "Example 1",
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

  test("should handle large-scale data during V2 to V3 migration", async () => {
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
    const firstBookmark = migratedStore.data["https://example0.com"]
    expect(firstBookmark).toEqual({
      tags: ["tag0", "category0"],
      meta: expect.objectContaining({
        title: "Example 0",
        description: "Description for example 0",
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

  test("should save and retrieve bookmarks", async () => {
    const url = "https://example.com"
    const tags = ["tag1", "tag2"]
    const meta: Partial<BookmarkMetadata> = { title: "Example" }

    await initBookmarksStore()

    const urlMap = await getUrlMap()
    expect(urlMap).toEqual({})

    await saveBookmark(url, tags, meta)

    // Verify saveBookmark call
    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        [url]: {
          tags,
          meta: expect.objectContaining({
            title: "Example",
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
        title: "Example",
        created: initialTime,
        updated: initialTime,
      }) as unknown,
    })
  })

  test("should handle duplicate tags", async () => {
    const url = "https://example.com"
    const tags = ["tag1", "tag2", "tag1"]

    await initBookmarksStore()

    const urlMap = await getUrlMap()
    expect(urlMap).toEqual({})

    await saveBookmark(url, tags, {})

    // Verify saveBookmark call
    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        [url]: {
          tags: ["tag1", "tag2"],
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
    expect(bookmark.tags).toEqual(["tag1", "tag2"])
  })

  test("should remove bookmark when no tags provided", async () => {
    const url = "https://example.com"

    await initBookmarksStore()
    await saveBookmark(url, ["tag1"], {})

    // Verify first saveBookmark call
    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        [url]: {
          tags: ["tag1"],
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
    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        // Deleted the previous bookmark
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

  test("should update existing bookmark metadata", async () => {
    vi.useFakeTimers()
    const updatedTime = new Date(2023, 0, 1, 12, 1).getTime() // 2023-01-01 12:01

    const url = "https://example.com"
    const initialMeta: Partial<BookmarkMetadata> = { title: "Old Title" }
    const updatedMeta: Partial<BookmarkMetadata> = { title: "New Title" }

    await initBookmarksStore()
    await saveBookmark(url, ["tag1"], initialMeta)

    // Verify first saveBookmark call
    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        [url]: {
          tags: ["tag1"],
          meta: expect.objectContaining({
            title: "Old Title",
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
    await saveBookmark(url, ["tag1"], updatedMeta)

    // Verify second saveBookmark call
    expect(setValue).toHaveBeenCalledWith("extension.utags.urlmap", {
      data: {
        [url]: {
          tags: ["tag1"],
          meta: expect.objectContaining({
            title: "New Title",
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
        title: "New Title",
        created: initialTime,
        updated: updatedTime,
      })
    )

    vi.useRealTimers()
  })

  test("should handle value change listener for bookmark updates", async () => {
    const mockListener: ValueChangeListener = vi.fn()
    const url = "https://example.com"

    await initBookmarksStore()
    addValueChangeListener("extension.utags.urlmap", mockListener)
    await saveBookmark(url, ["tag1"], {})

    expect(mockListener).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          [url]: expect.objectContaining({
            tags: ["tag1"],
            meta: { created: initialTime, updated: initialTime },
          }) as unknown,
        }) as unknown,
      })
    )

    vi.useRealTimers()
  })

  test("should validate URLs before saving", async () => {
    const invalidUrl = "not-a-url"
    const validUrl = "https://example.com"

    await initBookmarksStore()
    await saveBookmark(invalidUrl, ["tag1"], {})
    await saveBookmark(validUrl, ["tag1"], {})

    const urlMap = await getUrlMap()
    expect(Object.keys(urlMap)).not.toContain(invalidUrl)
    expect(Object.keys(urlMap)).toContain(validUrl)
  })

  test("should handle extremely long tags and metadata", async () => {
    const url = "https://example.com"
    const longTag = "a".repeat(1000)
    const longTitle = "b".repeat(5000)

    await saveBookmark(url, [longTag], { title: longTitle })

    const bookmark = getBookmark(url)
    expect(bookmark.tags[0]).toHaveLength(1000)
    expect(bookmark.meta.title).toHaveLength(5000)
  })

  test("should validate and normalize URLs", async () => {
    const invalidUrls = [
      "not-a-url",
      "ftp://example.com",
      "//example.com",
      "example.com",
    ]
    const validUrls = [
      "https://example.com",
      "http://example.com",
      "https://example.com/path?query=value#hash",
    ]

    await initBookmarksStore()

    // Invalid URLs should not be saved
    for (const url of invalidUrls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ["tag1"], {
        title: "Test",
      } as Partial<BookmarkMetadata>)
      const bookmark = getBookmark(url)
      expect(bookmark).toEqual({ tags: [], meta: { created: 0, updated: 0 } })
    }

    // Valid URLs should be saved
    for (const url of validUrls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ["tag1"], {
        title: "Test 1",
      } as Partial<BookmarkMetadata>)
      const bookmark = getBookmark(url)
      expect(bookmark.tags).toEqual(["tag1"])
    }
  })

  test("should merge metadata objects correctly", async () => {
    const url = "https://example.com"
    const initialMeta: Partial<BookmarkMetadata> = {
      title: "Initial Title",
      description: "Initial Description",
      customField: "Initial Value",
    }
    const updateMeta: Partial<BookmarkMetadata> = {
      title: "Updated Title",
      newField: "New Value",
    }

    await initBookmarksStore()
    await saveBookmark(url, ["tag1"], initialMeta)

    vi.setSystemTime(secondCallTime)
    await saveBookmark(url, ["tag1"], updateMeta)

    const bookmark = getBookmark(url)
    expect(bookmark.meta).toEqual({
      title: "Updated Title",
      description: "Initial Description",
      customField: "Initial Value",
      newField: "New Value",
      created: initialTime,
      updated: secondCallTime,
    })
  })

  test("should handle URL encoded characters", async () => {
    const urls = [
      "https://example.com/path with spaces",
      "https://example.com/path%20with%20spaces",
      "https://example.com/path+with+spaces",
    ]

    await initBookmarksStore()

    for (const url of urls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ["tag1"], {
        title: "Test",
      } as Partial<BookmarkMetadata>)
      const bookmark = getBookmark(url)
      expect(bookmark.tags).toEqual(["tag1"])
    }

    // All URLs should be normalized to the same format
    const urlMap = await getUrlMap()
    // TODO: handle encoded urls
    // expect(Object.keys(urlMap.data).length).toBe(1)
  })

  test("should validate metadata fields", async () => {
    const url = "https://example.com"
    const invalidMeta: Record<string, unknown> = {
      title: null,
      description: undefined,
      customField: 123, // Should be string
      created: "invalid-date", // Should be number
      updated: {}, // Should be number
    }

    await initBookmarksStore()
    await saveBookmark(url, ["tag1"], invalidMeta)

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

  test("should deduplicate tags case-sensitively", async () => {
    const url = "https://example.com"
    const tags = ["tag", "Tag", "TAG", "tag", "Tag"]
    const expectedTags = ["tag", "Tag", "TAG"]

    await initBookmarksStore()
    await saveBookmark(url, tags, {
      title: "Test",
    } as Partial<BookmarkMetadata>)

    const bookmark = getBookmark(url)
    expect(bookmark.tags).toEqual(expectedTags)
  })

  test("should normalize URLs with trailing slashes", async () => {
    const urls = [
      "https://example.com",
      "https://example.com/",
      "https://example.com/path",
      "https://example.com/path/",
    ]

    await initBookmarksStore()

    for (const url of urls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ["tag1"], {
        title: "Test",
      } as Partial<BookmarkMetadata>)
    }

    const urlMap = await getUrlMap()
    // TODO:
    // expect(Object.keys(urlMap.data).length).toBe(2) // Should normalize to with/without trailing slash

    // URLs without path should be normalized to without trailing slash
    const bookmark1 = getBookmark("https://example.com")
    expect(bookmark1.tags).toEqual(["tag1"])
    const bookmark2 = getBookmark("https://example.com/")
    expect(bookmark2.tags).toEqual(["tag1"])

    // URLs with path should preserve trailing slash
    const bookmark3 = getBookmark("https://example.com/path")
    expect(bookmark3.tags).toEqual(["tag1"])
    const bookmark4 = getBookmark("https://example.com/path/")
    expect(bookmark4.tags).toEqual(["tag1"])
  })

  test("should handle tags with special characters", async () => {
    const url = "https://example.com"
    const tags = [
      "tag:1",
      "tag/2",
      "tag\\3",
      "tag.4",
      "tag_5",
      "tag-6",
      "tag+7",
    ]

    await initBookmarksStore()
    await saveBookmark(url, tags, { title: "Test" })

    const bookmark = getBookmark(url)
    expect(bookmark.tags).toEqual(tags)
  })

  test("should filter out invalid tags", async () => {
    const url = "https://example.com"
    const tags = [
      "", // Empty string
      " ", // Only whitespace
      "\n", // Only newline
      "\t", // Only tab
      "valid-tag",
    ]

    await initBookmarksStore()
    await saveBookmark(url, tags, { title: "Test" })

    const bookmark = getBookmark(url)
    expect(bookmark.tags).toEqual(["valid-tag"])
  })

  test("should handle different URL protocols", async () => {
    const urls = [
      "http://example.com",
      "https://example.com",
      "chrome://example.com",
      "file://example.com",
    ]

    await initBookmarksStore()

    for (const url of urls) {
      // eslint-disable-next-line no-await-in-loop
      await saveBookmark(url, ["tag1"], {
        title: "Test",
      } as Partial<BookmarkMetadata>)
      const bookmark = getBookmark(url)
      if (url.startsWith("http")) {
        expect(bookmark.tags).toEqual(["tag1"])
      } else {
        expect(bookmark.tags).toEqual([])
      }
    }
  })

  test("should inherit metadata from previous bookmarks", async () => {
    const url = "https://example.com"
    const initialMeta: Partial<BookmarkMetadata> = {
      title: "Initial Title",
      description: "Initial Description",
      icon: "https://example.com/favicon.ico",
      customField: "Initial Value",
    }

    await initBookmarksStore()
    await saveBookmark(url, ["tag1"], initialMeta)

    // Update with partial metadata
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url, ["tag2"], { title: "Updated Title" })

    // Update with empty metadata
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url, ["tag3"], {})

    const bookmark = getBookmark(url)
    expect(bookmark.meta).toEqual({
      title: "Updated Title",
      description: "Initial Description",
      icon: "https://example.com/favicon.ico",
      customField: "Initial Value",
      created: initialTime,
      updated: thirdCallTime,
    })
  })

  test("should maintain tag usage count", async () => {
    const urls = [
      "https://example1.com",
      "https://example2.com",
      "https://example3.com",
    ]

    await initBookmarksStore()

    // Add tags to multiple URLs
    await saveBookmark(urls[0], ["common", "tag1"], {
      title: "Test 1",
    } as Partial<BookmarkMetadata>)
    await saveBookmark(urls[1], ["common", "tag2"], {
      title: "Test 2",
    } as Partial<BookmarkMetadata>)
    await saveBookmark(urls[2], ["common", "tag3"], {
      title: "Test 3",
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

  test("should handle URLs with query parameters", async () => {
    const baseUrl = "https://example.com/path"
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
      await saveBookmark(url, ["tag1"], { title: "Test" })
    }

    const urlMap = await getUrlMap()
    // Should normalize URLs with same query parameters
    // TODO:
    // expect(Object.keys(urlMap.data).length).toBe(4)

    // Check specific cases
    const bookmark1 = getBookmark(urls[0])
    const bookmark2 = getBookmark(urls[1])
    const bookmark3 = getBookmark(urls[2])

    expect(bookmark1.tags).toEqual(["tag1"])
    expect(bookmark2.tags).toEqual(["tag1"])
    expect(bookmark3.tags).toEqual(["tag1"])
  })

  test("should handle concurrent bookmark updates across tabs", async () => {
    // Initialize store
    await initBookmarksStore()

    // Simulate first tab saving a bookmark
    const url1 = "https://example1.com"
    const tags1 = ["tag1", "tag2"]
    const meta1 = { title: "Example 1" }
    await saveBookmark(url1, tags1, meta1)

    // Get initial cached state
    const initialCachedUrlMap = await getCachedUrlMap()
    expect(initialCachedUrlMap[url1]).toEqual({
      tags: tags1,
      meta: expect.objectContaining({
        title: "Example 1",
        created: initialTime,
        updated: initialTime,
      }),
    })

    // Simulate second tab updating the same bookmark
    vi.setSystemTime(secondCallTime)
    const tags2 = ["tag2", "tag3"]
    const meta2 = { title: "Example 1 Updated" }
    await saveBookmark(url1, tags2, meta2)

    // Verify the value change listener was triggered
    expect(initialCachedUrlMap[url1]).not.toEqual({
      tags: tags2,
      meta: expect.objectContaining({
        title: "Example 1 Updated",
        created: initialTime,
        updated: secondCallTime,
      }),
    })

    // Get updated cached state after listener execution
    const updatedCachedUrlMap = await getCachedUrlMap()
    expect(updatedCachedUrlMap[url1]).toEqual({
      tags: tags2,
      meta: expect.objectContaining({
        title: "Example 1 Updated",
        created: initialTime,
        updated: secondCallTime,
      }),
    })
  })

  test("should maintain cache consistency during concurrent operations", async () => {
    // Initialize store
    await initBookmarksStore()

    // Simulate multiple concurrent operations
    const url1 = "https://example1.com"
    const url2 = "https://example2.com"

    // First operation
    vi.setSystemTime(initialTime)
    await saveBookmark(url1, ["tag1"], { title: "Example 1" })

    // Second operation (different URL)
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url2, ["tag2"], { title: "Example 2" })

    // Third operation (update first URL)
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url1, ["tag1", "tag3"], { title: "Example 1 Updated" })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency with actual data
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify both bookmarks are present with correct data
    expect(finalUrlMap[url1]).toEqual({
      tags: ["tag1", "tag3"],
      meta: expect.objectContaining({
        title: "Example 1 Updated",
        created: initialTime,
        updated: thirdCallTime,
      }),
    })

    expect(finalUrlMap[url2]).toEqual({
      tags: ["tag2"],
      meta: expect.objectContaining({
        title: "Example 2",
        created: secondCallTime,
        updated: secondCallTime,
      }),
    })
  })

  test("should handle concurrent bookmark deletions across tabs", async () => {
    // Initialize store with two bookmarks
    await initBookmarksStore()
    const url1 = "https://example1.com"
    const url2 = "https://example2.com"

    // Create initial bookmarks
    vi.setSystemTime(initialTime)
    await saveBookmark(url1, ["tag1"], { title: "Example 1" })
    await saveBookmark(url2, ["tag2"], { title: "Example 2" })

    // Verify initial state
    const initialUrlMap = await getUrlMap()
    expect(Object.keys(initialUrlMap).length).toBe(2)

    // Simulate concurrent deletions from different tabs
    // First tab deletes url1 by setting empty tags
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url1, [], { title: "Example 1" })

    // Second tab deletes url2
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url2, [], { title: "Example 2" })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Both maps should be empty after deletions
    expect(Object.keys(finalUrlMap).length).toBe(0)
    expect(Object.keys(finalCachedUrlMap).length).toBe(0)
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify specific bookmarks are removed
    expect(finalUrlMap[url1]).toBeUndefined()
    expect(finalUrlMap[url2]).toBeUndefined()
  })

  test("should handle concurrent tag usage count updates", async () => {
    // Initialize store with multiple bookmarks using the same tags
    await initBookmarksStore()
    const url1 = "https://example1.com"
    const url2 = "https://example2.com"
    const url3 = "https://example3.com"
    const commonTags = ["common1", "common2"]

    // Create initial bookmarks with common tags
    vi.setSystemTime(initialTime)
    await saveBookmark(url1, [...commonTags, "unique1"], { title: "Example 1" })
    await saveBookmark(url2, [...commonTags, "unique2"], { title: "Example 2" })

    // Simulate concurrent operations that affect tag usage
    // First tab adds a new bookmark with common tags
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url3, [...commonTags, "unique3"], { title: "Example 3" })

    // Second tab updates an existing bookmark removing common tags
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url1, ["unique1"], { title: "Example 1 Updated" })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify bookmark states
    expect(finalUrlMap[url1]).toEqual({
      tags: ["unique1"],
      meta: expect.objectContaining({
        title: "Example 1 Updated",
        created: initialTime,
        updated: thirdCallTime,
      }),
    })

    expect(finalUrlMap[url2]).toEqual({
      tags: expect.arrayContaining([...commonTags, "unique2"]),
      meta: expect.objectContaining({
        title: "Example 2",
        created: initialTime,
        updated: initialTime,
      }),
    })

    expect(finalUrlMap[url3]).toEqual({
      tags: expect.arrayContaining([...commonTags, "unique3"]),
      meta: expect.objectContaining({
        title: "Example 3",
        created: secondCallTime,
        updated: secondCallTime,
      }),
    })
  })

  test("should handle concurrent metadata inheritance", async () => {
    // Initialize store with a bookmark that will serve as metadata source
    await initBookmarksStore()
    const sourceUrl = "https://example.com/source"
    const url1 = "https://example.com/page1"
    const url2 = "https://example.com/page2"

    // Create source bookmark with rich metadata
    vi.setSystemTime(initialTime)
    await saveBookmark(sourceUrl, ["tag1"], {
      title: "Source Page",
      description: "Original description",
      icon: "https://example.com/icon.png",
      custom: "custom value",
    })

    // Simulate concurrent operations inheriting metadata
    // First tab saves a bookmark inheriting metadata
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url1, ["tag2"], {
      title: "Page 1",
    })

    // Second tab updates source metadata and saves another bookmark
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(sourceUrl, ["tag1"], {
      title: "Source Page Updated",
      description: "Updated description",
      icon: "https://example.com/new-icon.png",
      custom: "new value",
    })

    // Third tab saves another bookmark that should inherit updated metadata
    const fourthCallTime = thirdCallTime + 1000
    vi.setSystemTime(fourthCallTime)
    await saveBookmark(url2, ["tag3"], {
      title: "Page 2",
    })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify source bookmark state
    expect(finalUrlMap[sourceUrl]).toEqual({
      tags: ["tag1"],
      meta: expect.objectContaining({
        title: "Source Page Updated",
        description: "Updated description",
        icon: "https://example.com/new-icon.png",
        custom: "new value",
        created: initialTime,
        updated: thirdCallTime,
      }),
    })

    // First bookmark should have its own metadata
    expect(finalUrlMap[url1]).toEqual({
      tags: ["tag2"],
      meta: expect.objectContaining({
        title: "Page 1",
        created: secondCallTime,
        updated: secondCallTime,
      }),
    })

    // Second bookmark should have its own metadata
    expect(finalUrlMap[url2]).toEqual({
      tags: ["tag3"],
      meta: expect.objectContaining({
        title: "Page 2",
        created: fourthCallTime,
        updated: fourthCallTime,
      }),
    })
  })

  it("should handle concurrent import/export operations", async () => {
    // Create initial bookmarks
    const url1 = "https://example1.com"
    const url2 = "https://example2.com"
    vi.setSystemTime(initialTime)
    await saveBookmark(url1, ["tag1"], { title: "Example 1" })
    await saveBookmark(url2, ["tag2"], { title: "Example 2" })

    // Simulate first tab modifying a bookmark during export
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url1, ["tag1", "export"], {
      title: "Example 1 Updated",
      exported: secondCallTime,
    })

    // Simulate second tab adding a new bookmark
    const url3 = "https://example3.com"
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url3, ["tag3"], { title: "Example 3" })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify all bookmarks are present
    expect(Object.keys(finalUrlMap).length).toBe(3)

    // Verify individual bookmarks
    expect(finalUrlMap[url1]).toEqual({
      tags: ["tag1", "export"],
      meta: expect.objectContaining({
        title: "Example 1 Updated",
        exported: secondCallTime,
        created: initialTime,
        updated: secondCallTime,
      }),
    })

    expect(finalUrlMap[url2]).toEqual({
      tags: ["tag2"],
      meta: expect.objectContaining({
        title: "Example 2",
        created: initialTime,
        updated: initialTime,
      }),
    })

    expect(finalUrlMap[url3]).toEqual({
      tags: ["tag3"],
      meta: expect.objectContaining({
        title: "Example 3",
        created: thirdCallTime,
        updated: thirdCallTime,
      }),
    })
  })

  it("should handle concurrent tag renaming operations", async () => {
    // Initialize store with some bookmarks
    await initBookmarksStore()

    const initialTime = new Date(2023, 0, 1).getTime()
    const secondCallTime = new Date(2023, 0, 2).getTime()
    const thirdCallTime = new Date(2023, 0, 3).getTime()
    vi.setSystemTime(initialTime)

    // Create initial bookmarks with common tag
    const url1 = "https://example1.com"
    const url2 = "https://example2.com"
    const url3 = "https://example3.com"
    const oldTag = "old-tag"
    const newTag1 = "new-tag-1"
    const newTag2 = "new-tag-2"

    await saveBookmark(url1, [oldTag, "tag1"], { title: "Example 1" })
    await saveBookmark(url2, [oldTag, "tag2"], { title: "Example 2" })
    await saveBookmark(url3, [oldTag, "tag3"], { title: "Example 3" })

    // Simulate first tab renaming the tag
    vi.setSystemTime(secondCallTime)
    await saveBookmark(url1, [newTag1, "tag1"], { title: "Example 1" })
    await saveBookmark(url2, [newTag1, "tag2"], { title: "Example 2" })

    // Simulate second tab renaming the same tag
    vi.setSystemTime(thirdCallTime)
    await saveBookmark(url2, [newTag2, "tag2"], { title: "Example 2" })
    await saveBookmark(url3, [newTag2, "tag3"], { title: "Example 3" })

    // Verify final state
    const finalUrlMap = await getUrlMap()
    const finalCachedUrlMap = await getCachedUrlMap()

    // Check cache consistency
    expect(finalCachedUrlMap).toEqual(finalUrlMap)

    // Verify all bookmarks are present
    expect(Object.keys(finalUrlMap).length).toBe(3)

    // Verify individual bookmarks
    expect(finalUrlMap[url1]).toEqual({
      tags: [newTag1, "tag1"],
      meta: expect.objectContaining({
        title: "Example 1",
        created: initialTime,
        updated: secondCallTime,
      }),
    })

    expect(finalUrlMap[url2]).toEqual({
      tags: [newTag2, "tag2"],
      meta: expect.objectContaining({
        title: "Example 2",
        created: initialTime,
        updated: thirdCallTime,
      }),
    })

    expect(finalUrlMap[url3]).toEqual({
      tags: [newTag2, "tag3"],
      meta: expect.objectContaining({
        title: "Example 3",
        created: initialTime,
        updated: thirdCallTime,
      }),
    })
  })

  describe("Error handling", () => {
    test("should handle storage operation failures", async () => {
      // Mock storage operation failure
      getValue.mockRejectedValue(new Error("Storage operation failed"))

      // Attempt to initialize bookmarks store
      await expect(initBookmarksStore()).rejects.toThrow(
        "Storage operation failed"
      )

      // Verify error handling behavior
      expect(getValue).toHaveBeenCalledWith("extension.utags.urlmap")
      expect(setValue).not.toHaveBeenCalled()
      const urlMap = await getCachedUrlMap()
      expect(urlMap).toEqual({})
    })

    test("should handle version incompatibility", async () => {
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
      Object.defineProperty(globalThis, "location", {
        writable: true,
        value: {},
      })
      Object.defineProperty(globalThis.location, "reload", {
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
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: originalLocation,
      })
    })

    test("should throw error for unsupported database version", async () => {
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
      expect(getValue).toHaveBeenCalledWith("extension.utags.urlmap")
      expect(setValue).not.toHaveBeenCalled()
    })

    test("should handle migration failure", async () => {
      // Mock a V2 store with invalid data that will cause migration to fail
      const invalidV2Store = {
        meta: {
          extensionVersion: currentExtensionVersion,
          databaseVersion: 2,
        },
        "https://example.com": {
          tags: ["tag1"],
          meta: {
            title: "Example",
            created: "invalid_timestamp", // Invalid timestamp will cause migration to fail
            updated: initialTime,
          },
        },
      }

      getValue.mockResolvedValueOnce(invalidV2Store)
      setValue.mockRejectedValueOnce(new Error("Migration failed"))

      // Attempt to initialize store with invalid data
      await expect(initBookmarksStore()).rejects.toThrow("Migration failed")

      // Verify error handling behavior
      expect(getValue).toHaveBeenCalledWith("extension.utags.urlmap")
      expect(setValue).toHaveBeenCalledTimes(1)
      const urlMap = await getCachedUrlMap()
      expect(urlMap).toEqual({})
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
