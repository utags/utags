/**
 * @vitest-environment jsdom
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import { addRecentTags, getMostUsedTags, getRecentAddedTags } from "./tags"

// Import addValueChangeListener from browser-extension-storage
const { addValueChangeListener } = await import("browser-extension-storage")

// Define RecentTag type locally since we can't import from types.js
type RecentTag = {
  tag: string
  score: number
}

// Define storage types
type StorageKey =
  | "extension.utags.recenttags"
  | "extension.utags.mostusedtags"
  | "extension.utags.recentaddedtags"
type StorageValue = RecentTag[] | string[]
type StorageData = Partial<Record<StorageKey, StorageValue>>

// Mock storage for tests with initial empty arrays
const mockStorage: StorageData = {}

// Mock browser-extension-storage module
const listeners: Record<string, Array<(value: unknown) => void>> = {}

vi.mock("browser-extension-storage", () => ({
  getValue: vi
    .fn()
    .mockImplementation(async (key: string) => mockStorage[key as StorageKey]),
  setValue: vi.fn().mockImplementation(async (key: string, value: unknown) => {
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
}))

// Define settings types
type SettingsKey = "pinnedTags" | "emojiTags"
type SettingsValue = string
type SettingsData = Partial<Record<SettingsKey, SettingsValue>>

// Mock storage for tests with initial empty strings
const mockSettingsStorage: SettingsData = {}

// Mock browser-extension-settings module
vi.mock("browser-extension-settings", () => ({
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
}))

describe("addRecentTags", () => {
  // Import mocked functions
  let getValue: ReturnType<typeof vi.fn>
  let setValue: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    const browserExtensionStorage = await import("browser-extension-storage")
    getValue = vi.mocked(browserExtensionStorage.getValue)
    setValue = vi.mocked(browserExtensionStorage.setValue)
  })
  beforeEach(() => {
    // Clear all mocks and storage
    vi.clearAllMocks()
    vi.useFakeTimers()
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    for (const key of Object.keys(mockStorage)) delete mockStorage[key]
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test("should add new tags and update related collections", async () => {
    // Set initial timestamp
    const now = 1_700_000_000_000 // 2023-11-14T22:13:20.000Z
    vi.setSystemTime(now)

    // Add tags multiple times with increasing timestamps to make them "most used"
    await addRecentTags(["tag1", "tag2"], [])

    // Advance time by 1 second and add tags again
    vi.advanceTimersByTime(1000)
    await addRecentTags(["tag1", "tag2"], [])

    // Advance time by 1 second and add tags one more time
    vi.advanceTimersByTime(1000)
    await addRecentTags(["tag1", "tag2"], [])

    // Calculate scores for verification
    const score1: number = Math.floor(now / 1000) / 1_000_000_000
    const score2: number = Math.floor((now + 1000) / 1000) / 1_000_000_000
    const score3: number = Math.floor((now + 2000) / 1000) / 1_000_000_000

    // Verify recent tags storage
    expect(getValue).toHaveBeenCalledWith(
      "extension.utags.recenttags" as StorageKey
    )
    expect(setValue).toHaveBeenCalledWith(
      "extension.utags.recenttags" as StorageKey,
      [
        { tag: "tag1", score: score1 },
        { tag: "tag2", score: score1 },
        { tag: "tag1", score: score2 },
        { tag: "tag2", score: score2 },
        { tag: "tag1", score: score3 },
        { tag: "tag2", score: score3 },
      ] as RecentTag[]
    )

    // Verify most used tags
    const mostUsedTags: string[] = await getMostUsedTags()
    expect(mostUsedTags).toEqual(["tag1", "tag2"])

    // Verify recent added tags
    const recentAddedTags: string[] = await getRecentAddedTags()
    expect(recentAddedTags).toEqual(["tag2", "tag1"])
  })

  test("should handle duplicate tags", async () => {
    const now = 1_700_000_000_000
    vi.setSystemTime(now)

    // Add initial tags
    await addRecentTags(["tag1", "tag2"], [])

    // Advance time by 1 second and add tags again
    vi.advanceTimersByTime(1000)
    // Add some duplicate tags
    await addRecentTags(["tag2", "tag3"], ["tag1"])

    // Verify only unique tags are added
    const score1: number = Math.floor(now / 1000) / 1_000_000_000
    const score2: number = Math.floor((now + 1000) / 1000) / 1_000_000_000
    const recentTags = (await getValue(
      "extension.utags.recenttags" as StorageKey
    )) as RecentTag[]
    expect(recentTags).toEqual([
      { tag: "tag1", score: score1 },
      { tag: "tag2", score: score1 },
      { tag: "tag2", score: score2 },
      { tag: "tag3", score: score2 },
    ] as RecentTag[])
  })

  test("should maintain size limits and update tag scores", async () => {
    const now = 1_700_000_000_000
    vi.setSystemTime(now)

    // Generate 1100 tags
    const tags: string[] = Array.from({ length: 1100 }, (_, i) => `tag${i}`)
    await addRecentTags(tags, [])

    // Verify oldest 100 tags are removed
    const recentTags = (await getValue(
      "extension.utags.recenttags" as StorageKey
    )) as RecentTag[]
    expect(recentTags).toHaveLength(1000)
    expect(recentTags[0].tag).toBe("tag100")

    // Add same tag multiple times to increase score
    await addRecentTags(["frequent-tag"], [])
    vi.setSystemTime(now + 1000)
    await addRecentTags(["frequent-tag"], [])
    vi.setSystemTime(now + 2000)
    await addRecentTags(["frequent-tag"], [])

    // Verify most used tags prioritizes frequently used tags
    const mostUsedTags: string[] = await getMostUsedTags()
    expect(mostUsedTags[0]).toBe("frequent-tag")
  })

  test("should handle empty and invalid inputs", async () => {
    // Test with empty arrays
    await addRecentTags([], [])
    expect(setValue).not.toHaveBeenCalled()

    // Test with empty strings and null values
    await addRecentTags(["valid-tag", "", null as unknown as string], [])
    const recentTags = (await getValue(
      "extension.utags.recenttags" as StorageKey
    )) as RecentTag[]
    expect(recentTags).toEqual([
      { tag: "valid-tag", score: expect.any(Number) as number },
    ] as RecentTag[])
  })

  test("should handle special characters in tags", async () => {
    const specialTags: string[] = [
      "tag#1",
      "tag@2",
      "tag$3",
      "tag%4",
      "tag&5",
      "tag*6",
      "tag(7)",
      "tag[8]",
      "tag{9}",
      "tag+10",
    ]
    await addRecentTags(specialTags, [])
    const recentTags = (await getValue(
      "extension.utags.recenttags" as StorageKey
    )) as RecentTag[]
    expect(recentTags).toHaveLength(specialTags.length)
    expect(recentTags.map((t: RecentTag) => t.tag)).toEqual(specialTags)
  })

  test("should handle concurrent tag additions correctly with queue mechanism", async () => {
    const now = 1_700_000_000_000
    vi.setSystemTime(now)

    // Simulate concurrent tag additions
    const promises: Array<Promise<void>> = [
      addRecentTags(["concurrent1", "concurrent2"], []),
      addRecentTags(["concurrent2", "concurrent3"], []),
      addRecentTags(["concurrent3", "concurrent1"], []),
    ]

    await Promise.all(promises)

    const recentTags = (await getValue(
      "extension.utags.recenttags" as StorageKey
    )) as RecentTag[]
    console.log("Recent tags after concurrent additions:", recentTags)

    // With the queue mechanism, we should now have all unique tags
    const uniqueTags = new Set<string>(recentTags.map((t: RecentTag) => t.tag))
    expect(uniqueTags.size).toBe(3) // Should have all 3 unique tags

    // Verify all expected tags are present
    const expectedTags = new Set<string>([
      "concurrent1",
      "concurrent2",
      "concurrent3",
    ])
    expect(uniqueTags).toEqual(expectedTags)

    // Verify all tags have the same score since they were added at the same time
    const scores = new Set<number>(recentTags.map((t: RecentTag) => t.score))
    expect(scores.size).toBe(1) // All tags should have the same score

    // Verify the order of tags matches the order of additions
    const tagOrder: string[] = recentTags.map((t: RecentTag) => t.tag)
    expect(tagOrder.indexOf("concurrent1")).toBeLessThan(
      tagOrder.indexOf("concurrent3")
    )
  })

  test("should handle extreme tag lengths", async () => {
    const longTag: string = "a".repeat(1000) // 1000 characters long tag
    const shortTag = "x" // 1 character tag
    await addRecentTags([longTag, shortTag], [])

    const recentTags = (await getValue(
      "extension.utags.recenttags" as StorageKey
    )) as RecentTag[]
    expect(recentTags.map((t: RecentTag) => t.tag)).toEqual([longTag, shortTag])
  })

  test("should generate unique scores for tags added with 1-second intervals", async () => {
    const now = 1_700_000_000_000
    vi.setSystemTime(now)

    // Add tags with 1-second intervals to ensure different scores
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await addRecentTags([`rapid-tag-${i}`], [])
      vi.advanceTimersByTime(1000) // Advance by 1 second each time
    }

    const recentTags = (await getValue(
      "extension.utags.recenttags" as StorageKey
    )) as RecentTag[]
    expect(recentTags).toHaveLength(5)

    // Verify scores are different despite rapid additions
    const scores: number[] = recentTags.map((t: RecentTag) => t.score)
    const uniqueScores = new Set<number>(scores)
    expect(uniqueScores.size).toBe(5) // Each tag should have a unique score
  })

  test("should handle value change listener for tag updates", async () => {
    const mockListener = vi.fn()
    addValueChangeListener("extension.utags.recenttags", mockListener)

    // Add new tags to trigger storage update
    await addRecentTags(["listener-test-tag"], [])

    // Verify listener was called with updated value
    expect(mockListener).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          tag: "listener-test-tag",
          score: expect.any(Number) as number,
        }),
      ])
    )
  })

  test("should calculate correct scores with different weights", async () => {
    const now = 1_700_000_000_000
    vi.setSystemTime(now)

    // Add tags with different weights
    await addRecentTags(["weight-test-1"], [])
    vi.advanceTimersByTime(1000)
    await addRecentTags(["weight-test-2"], [])

    const recentTags = (await getValue(
      "extension.utags.recenttags" as StorageKey
    )) as RecentTag[]

    // Calculate expected scores
    const baseScore1 = Math.floor(now / 1000) / 1_000_000_000
    const baseScore2 = Math.floor((now + 1000) / 1000) / 1_000_000_000

    // Verify scores are calculated correctly
    expect(recentTags[0].score).toBe(baseScore1)
    expect(recentTags[1].score).toBe(baseScore2)

    // Verify most used tags threshold uses weight correctly
    const mostUsedTags = await getMostUsedTags()
    expect(mostUsedTags).toHaveLength(0) // Scores should be below threshold with weight 1.5
  })
})
