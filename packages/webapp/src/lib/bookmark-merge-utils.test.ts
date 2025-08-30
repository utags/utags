import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  BookmarksData,
  BookmarkTagsAndMetadata,
} from '../types/bookmarks.js'
import { DELETED_BOOKMARK_TAG, DEFAULT_DATE } from '../config/constants.js'
import {
  type MergeMetaStrategy,
  type MergeTagsStrategy,
} from '../config/merge-options.js'
import { areArraysEqual, areObjectsEqual } from '../utils/index.js'
import { mockLocalStorage } from '../utils/test/mock-local-storage.js'
import { bookmarkStorage } from '../lib/bookmark-storage.js'
import {
  mergeBookmarks,
  type MergeStrategy,
  type SyncOption,
} from './bookmark-merge-utils.js'

const localStorageMock = mockLocalStorage()
// Add dispatchEvent mock to prevent errors
Object.defineProperty(globalThis, 'dispatchEvent', {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  value() {},
})

// Helper function to create a bookmark entry
const createBookmarkEntry = (
  created: number,
  updated: number,
  title: string,
  tags: string[],
  extraFileds?: Record<string, unknown>,
  updated2?: number,
  updated3?: number,
  deletedMeta?: BookmarkTagsAndMetadata['deletedMeta']
): BookmarkTagsAndMetadata => ({
  meta: {
    created,
    updated,
    title,
    updated2,
    updated3,
    ...extraFileds,
  },
  tags,
  deletedMeta,
})

// Default timestamps
const now = Date.now()
const oneHourAgo = now - 3600 * 1000
const twoHoursAgo = now - 2 * 3600 * 1000
const threeHoursAgo = now - 3 * 3600 * 1000
const defaultDateTimestamp = oneHourAgo - 1000 // new Date('2023-01-01T00:00:00.000Z').getTime()

type TestMergeBookmarksParams = {
  localData: BookmarksData
  remoteData: BookmarksData
  strategy: MergeStrategy
  syncOption: SyncOption
  expectedUpdatesForLocal: BookmarksData
  expectedLocalDeletions?: string[]
  expectedUpdatesForRemote?: BookmarksData
  expectedRemoteDeletions?: string[]
  expectedLocalEqualsToRemote?: boolean
  ignoreCompareAfterMerge?: boolean
}

const runMergeTest = async ({
  localData,
  remoteData,
  strategy,
  syncOption,
  expectedUpdatesForLocal,
  expectedLocalDeletions = [],
  expectedUpdatesForRemote = {},
  expectedRemoteDeletions = [],
  expectedLocalEqualsToRemote = false,
  ignoreCompareAfterMerge = false,
}: TestMergeBookmarksParams) => {
  const result = await mergeBookmarks(
    localData,
    remoteData,
    strategy,
    syncOption
  )
  expect(result.updatesForLocal).toEqual(expectedUpdatesForLocal)
  expect(result.localDeletions.sort()).toEqual(expectedLocalDeletions.sort()) // Sort for consistent comparison
  expect(result.updatesForRemote).toEqual(
    expectedLocalEqualsToRemote
      ? expectedUpdatesForLocal
      : expectedUpdatesForRemote
  )
  expect(result.remoteDeletions.sort()).toEqual(expectedRemoteDeletions.sort()) // Sort for consistent comparison

  if (ignoreCompareAfterMerge) {
    return
  }

  const localDataAfterMerge = await getMergedData(
    localData,
    result.updatesForLocal,
    result.localDeletions
  )
  const remoteDataAfterMerge = await getMergedData(
    remoteData,
    result.updatesForRemote,
    result.remoteDeletions
  )

  // Verify that localDataAfterMerge and remoteDataAfterMerge are the same,
  // ignoring created, updated, and updated2 fields in meta.
  const localKeys = Object.keys(localDataAfterMerge).sort()
  const remoteKeys = Object.keys(remoteDataAfterMerge).sort()
  const finalLocalKeys = Object.keys(result.finalLocalData).sort()
  const finalRemoteKeys = Object.keys(result.finalRemoteData).sort()

  expect(localKeys).toEqual(remoteKeys)
  expect(finalLocalKeys).toEqual(localKeys)
  expect(finalRemoteKeys).toEqual(remoteKeys)

  for (const key of localKeys) {
    const localBookmark = localDataAfterMerge[key]
    const remoteBookmark = remoteDataAfterMerge[key]
    const finalLocalBookmark = result.finalLocalData[key]
    const finalRemoteBookmark = result.finalRemoteData[key]

    expect(remoteBookmark).toBeDefined()
    expect(finalLocalBookmark).toBeDefined()
    expect(finalRemoteBookmark).toBeDefined()

    // Compare tags
    expect(areArraysEqual(localBookmark.tags, remoteBookmark.tags)).toBe(true)
    expect(areArraysEqual(localBookmark.tags, finalLocalBookmark.tags)).toBe(
      true
    )
    expect(areArraysEqual(localBookmark.tags, finalRemoteBookmark.tags)).toBe(
      true
    )

    expect(localBookmark.meta).toEqual(finalLocalBookmark.meta)
    expect(remoteBookmark.meta).toEqual(finalRemoteBookmark.meta)
    expect({ ...localBookmark.meta, updated3: 0 }).toEqual({
      ...remoteBookmark.meta,
      updated3: 0,
    })

    // Compare meta, ignoring specified keys
    const ignoredMetaKeys = ['updated3']
    expect(
      areObjectsEqual(localBookmark.meta, remoteBookmark.meta, ignoredMetaKeys)
    ).toBe(true)

    // Compare deletedMeta
    expect(
      areObjectsEqual(localBookmark.deletedMeta, remoteBookmark.deletedMeta, [])
    ).toBe(true)
    expect(
      areObjectsEqual(
        localBookmark.deletedMeta,
        finalLocalBookmark.deletedMeta,
        []
      )
    ).toBe(true)
    expect(
      areObjectsEqual(
        localBookmark.deletedMeta,
        finalRemoteBookmark.deletedMeta,
        []
      )
    ).toBe(true)

    expect(localBookmark).toEqual(finalLocalBookmark)
    expect(remoteBookmark).toEqual(finalRemoteBookmark)

    finalLocalBookmark.meta.updated3 = 0
    finalRemoteBookmark.meta.updated3 = 0
    expect(finalLocalBookmark).toEqual(finalRemoteBookmark)
  }
}

async function getMergedData(
  orgData: BookmarksData,
  updates: BookmarksData,
  deletions: string[]
): Promise<BookmarksData> {
  localStorageMock.clear() // Ensure a clean state
  await bookmarkStorage.overwriteBookmarks(orgData)
  await bookmarkStorage.deleteBookmarks(deletions)
  await bookmarkStorage.upsertBookmarksFromData(updates)
  return bookmarkStorage.getBookmarksData()
}

describe('mergeBookmarks', () => {
  let baseStrategy: MergeStrategy
  let baseSyncOption: SyncOption

  beforeEach(() => {
    baseStrategy = {
      meta: 'newer', // Default to 'newer' for meta
      tags: 'union', // Default to 'union' for tags
      defaultDate: defaultDateTimestamp,
    }
    baseSyncOption = {
      currentSyncTime: now,
      lastSyncTime: twoHoursAgo, // Default last sync time
    }
  })

  describe('Basic Merge Scenarios', () => {
    it('should merge when both local and remote have valid data', async () => {
      const localData: BookmarksData = {
        'http://example.com/a': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Local A',
          ['tag1'],
          {
            localField: 'local field',
          },
          undefined,
          oneHourAgo
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/a': createBookmarkEntry(
          oneHourAgo, // Remote created later but updated earlier
          oneHourAgo + 1,
          'Remote A',
          ['tag2'],
          {
            remoteField: 'remote field',
          },
          undefined,
          oneHourAgo
        ),
      }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/a': {
          meta: {
            created: oneHourAgo,
            updated: oneHourAgo + 1,
            title: 'Remote A', // 'newer' meta strategy, remote is effectively newer due to updated logic
            remoteField: 'remote field',
            updated3: now,
          },
          tags: ['tag1', 'tag2'], // 'union' tags strategy
        },
      }
      const expectedUpdatesForLocal2: BookmarksData = {
        'http://example.com/a': {
          meta: {
            created: oneHourAgo,
            updated: oneHourAgo + 1,
            title: 'Local A', // 'local' meta strategy, remote is effectively newer due to updated logic
            localField: 'local field',
            updated3: now,
          },
          tags: ['tag1', 'tag2'], // 'union' tags strategy
        },
      }
      const expectedUpdatesForMerge: BookmarksData = {
        'http://example.com/a': {
          meta: {
            created: oneHourAgo,
            updated: oneHourAgo + 1,
            title: 'Remote A', // 'newer' meta strategy, remote is effectively newer due to updated logic
            localField: 'local field',
            remoteField: 'remote field',
            updated3: now,
          },
          tags: ['tag1', 'tag2'], // 'union' tags strategy
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'newer' },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'remote' },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'local' },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdatesForLocal2,
        expectedLocalEqualsToRemote: true,
      })

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'merge' },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdatesForMerge,
        expectedLocalEqualsToRemote: true,
      })

      // Use defferent tags strategy
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'newer', tags: 'newer' },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {
          'http://example.com/a': {
            meta: {
              created: oneHourAgo,
              updated: oneHourAgo + 1,
              title: 'Remote A', // 'newer' meta strategy, remote is effectively newer due to updated logic
              remoteField: 'remote field',
              updated3: now,
            },
            tags: ['tag2'], // 'newer' tags strategy
          },
        },
        expectedUpdatesForRemote: {},
      })

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'remote', tags: 'remote' },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {
          'http://example.com/a': {
            meta: {
              created: oneHourAgo,
              updated: oneHourAgo + 1,
              title: 'Remote A', // 'remote' meta strategy, remote is effectively newer due to updated logic
              remoteField: 'remote field',
              updated3: now,
            },
            tags: ['tag2'], // 'remote' tags strategy
          },
        },
        expectedUpdatesForRemote: {},
      })

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'local', tags: 'local' },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {
          'http://example.com/a': {
            meta: {
              created: oneHourAgo,
              updated: oneHourAgo + 1,
              title: 'Local A', // 'local' meta strategy, remote is effectively newer due to updated logic
              localField: 'local field',
              updated3: now,
            },
            tags: ['tag1'], // 'local' tags strategy
          },
        },
        expectedLocalEqualsToRemote: true,
      })

      await runMergeTest({
        localData,
        remoteData,
        strategy: {
          ...baseStrategy,
          meta: 'local',
          tags: 'local',
          preferNewestUpdated: false,
        },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote: {
          'http://example.com/a': {
            meta: {
              created: oneHourAgo,
              updated: oneHourAgo,
              title: 'Local A', // 'local' meta strategy, remote is effectively newer due to updated logic
              localField: 'local field',
              updated3: now,
            },
            tags: ['tag1'], // 'local' tags strategy
          },
        },
      })
    })

    it('should keep local data when both local and remote have valid data and have same updated timestamp', async () => {
      const localData: BookmarksData = {
        'http://example.com/a': createBookmarkEntry(
          oneHourAgo - 2000,
          oneHourAgo,
          'Local A',
          ['tag1'],
          {
            localField: 'local field',
          },
          undefined,
          oneHourAgo
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/a': createBookmarkEntry(
          oneHourAgo - 2000,
          oneHourAgo,
          'Remote A',
          ['tag2'],
          {
            remoteField: 'remote field',
          },
          undefined,
          oneHourAgo
        ),
      }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/a': {
          meta: {
            created: oneHourAgo - 2000,
            updated: oneHourAgo,
            title: 'Local A', // 'newer' meta strategy, local is effectively newer due to updated logic
            localField: 'local field',
            updated3: now,
          },
          tags: ['tag1', 'tag2'], // 'union' tags strategy
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('should keep local data if only local exists and is valid', async () => {
      const localData: BookmarksData = {
        'http://example.com/b': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Local B',
          ['local']
        ),
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/b': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Local B',
          ['local'],
          {},
          undefined,
          now
        ),
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
      })
    })

    it('should add remote data if only remote exists and is valid', async () => {
      const localData: BookmarksData = {}
      const remoteData: BookmarksData = {
        'http://example.com/c': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Remote C',
          ['remote']
        ),
      }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/c': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Remote C',
          ['remote'],
          {},
          undefined,
          now
        ),
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
      })
    })

    it('should mark local-only data as deleted if it is older than lastSyncTime', async () => {
      const localData: BookmarksData = {
        'http://example.com/d': createBookmarkEntry(
          threeHoursAgo,
          threeHoursAgo,
          'Old Local D',
          ['old']
        ),
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForLocal: BookmarksData = {}
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalDeletions: ['http://example.com/d'],
      })
    })

    it('should mark remote-only data as deleted if it is older than lastSyncTime', async () => {
      const localData: BookmarksData = {}
      const remoteData: BookmarksData = {
        'http://example.com/e': createBookmarkEntry(
          threeHoursAgo,
          threeHoursAgo,
          'Old Remote E',
          ['old']
        ),
      }
      const expectedUpdatesForLocal: BookmarksData = {}
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedRemoteDeletions: ['http://example.com/e'],
      })
    })

    it('should filter out invalid URLs and merge valid ones', async () => {
      const localData: BookmarksData = {
        'http://example.com/valid-local': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Valid Local',
          ['local']
        ),
        'invalid-url': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Invalid Local',
          ['invalid']
        ),
        'http://example.com/another-valid': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Another Valid Local',
          ['local', 'extra']
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/valid-remote': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Valid Remote',
          ['remote']
        ),
        'another-invalid-url': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Invalid Remote',
          ['invalid']
        ),
        'http://example.com/another-valid': createBookmarkEntry(
          twoHoursAgo, // Older
          twoHoursAgo,
          'Another Valid Remote Old',
          ['remote']
        ),
      }

      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/valid-remote': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Valid Remote',
          ['remote'],
          {},
          undefined,
          now
        ),
        // 'http://example.com/another-valid' should take local's version as it's newer
        // and merge tags
        'http://example.com/another-valid': createBookmarkEntry(
          twoHoursAgo, // from remote (older)
          oneHourAgo, // from local (newer)
          'Another Valid Local', // from local (newer)
          ['local', 'extra'], // tags union, but remote is staled
          {},
          undefined,
          now
        ),
      }
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/valid-local': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Valid Local',
          ['local'],
          {},
          undefined,
          now
        ),
        'http://example.com/another-valid': createBookmarkEntry(
          twoHoursAgo, // from remote (older)
          oneHourAgo, // from local (newer)
          'Another Valid Local', // from local (newer)
          ['local', 'extra'], // tags union, but remote is staled
          {},
          undefined,
          now
        ),
      }

      // Spy on console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn')

      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedUpdatesForRemote,
        expectedLocalDeletions: [],
        expectedRemoteDeletions: [],
        ignoreCompareAfterMerge: true,
      })

      // Check if console.warn was called with the expected messages
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid URL found and skipped: invalid-url'
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid URL found and skipped: another-invalid-url'
      )

      // Restore console.warn
      consoleWarnSpy.mockRestore()
    })
  })

  describe('MergeTarget Zero Scenarios (Identical Data)', () => {
    it('should result in mergeTarget === 0 (no updates) when local and remote data are identical and not modified since lastSyncTime', async () => {
      const identicalBookmark = createBookmarkEntry(
        threeHoursAgo, // Older than lastSyncTime
        threeHoursAgo,
        'Identical Bookmark',
        ['tagA', 'tagB'],
        { customField: 'value' },
        threeHoursAgo
      )
      const localData: BookmarksData = {
        'http://example.com/identical': identicalBookmark,
      }
      const remoteData: BookmarksData = {
        'http://example.com/identical': { ...identicalBookmark }, // Ensure a clone for safety
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption, // lastSyncTime is twoHoursAgo
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote: {},
        expectedLocalDeletions: [],
        expectedRemoteDeletions: [],
      })
    })

    it('should result in mergeTarget === 0 (no updates) when local and remote data are identical and modified since lastSyncTime but content remains the same', async () => {
      const identicalBookmarkModified = createBookmarkEntry(
        oneHourAgo, // Newer than lastSyncTime
        oneHourAgo,
        'Identical Modified Bookmark',
        ['tagX', 'tagY'],
        { anotherField: 'anotherValue' },
        oneHourAgo
      )
      const localData: BookmarksData = {
        'http://example.com/identical-modified': identicalBookmarkModified,
      }
      const remoteData: BookmarksData = {
        'http://example.com/identical-modified': {
          ...identicalBookmarkModified,
        }, // Ensure a clone
      }

      // Modify syncOption to ensure bookmarks are considered 'valid'
      const syncOptionForValid = {
        ...baseSyncOption,
        lastSyncTime: twoHoursAgo, // Bookmarks updated at oneHourAgo are valid
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'local' },
        syncOption: syncOptionForValid,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote: {},
        expectedLocalDeletions: [],
        expectedRemoteDeletions: [],
      })

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'remote' },
        syncOption: syncOptionForValid,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote: {},
        expectedLocalDeletions: [],
        expectedRemoteDeletions: [],
      })

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'newer' },
        syncOption: syncOptionForValid,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote: {},
        expectedLocalDeletions: [],
        expectedRemoteDeletions: [],
      })

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'merge' },
        syncOption: syncOptionForValid,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote: {},
        expectedLocalDeletions: [],
        expectedRemoteDeletions: [],
      })
    })

    it('should result in mergeTarget === 0 when local and remote are identical, valid, and timestamps are also identical', async () => {
      const bookmarkData = createBookmarkEntry(
        oneHourAgo, // valid
        oneHourAgo, // valid
        'Identical Valid Bookmark',
        ['tag1', 'tag2'],
        { field: 'value' },
        oneHourAgo // valid
      )
      const localData: BookmarksData = {
        'http://example.com/identical-valid': bookmarkData,
      }
      const remoteData: BookmarksData = {
        'http://example.com/identical-valid': { ...bookmarkData },
      }

      const result = await mergeBookmarks(
        localData,
        remoteData,
        baseStrategy,
        baseSyncOption
      )

      // Expect no updates or deletions because data is identical and valid on both sides
      expect(result.updatesForLocal).toEqual({})
      expect(result.updatesForRemote).toEqual({})
      expect(result.localDeletions).toEqual([])
      expect(result.remoteDeletions).toEqual([])
    })

    it('should result in mergeTarget === 0 when local and remote are identical and both marked as deleted (and valid)', async () => {
      const deletedBookmarkEntry = createBookmarkEntry(
        oneHourAgo, // created
        oneHourAgo, // updated (deletion time)
        'Identical Deleted Bookmark',
        [DELETED_BOOKMARK_TAG, 'archived'],
        { originalTitle: 'Was Deleted Bookmark' }, // extra meta fields
        oneHourAgo, // updated2 (deletion time)
        oneHourAgo, // updated3
        {
          deleted: oneHourAgo, // Renamed from deletedAt to match expected type
          actionType: 'SYNC', // Corrected to a valid DeleteActionType based on type definition
        }
      )

      const localData: BookmarksData = {
        'http://example.com/identical-deleted': deletedBookmarkEntry,
      }
      const remoteData: BookmarksData = {
        'http://example.com/identical-deleted': { ...deletedBookmarkEntry }, // Ensure a clone
      }

      // syncOption ensures the deletion is considered 'valid' (occurred after lastSyncTime)
      const syncOptionForValidDeletion = {
        ...baseSyncOption,
        lastSyncTime: twoHoursAgo, // Deletion at oneHourAgo is more recent
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: syncOptionForValidDeletion,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote: {},
        expectedLocalDeletions: [],
        expectedRemoteDeletions: [],
      })
    })
  })

  describe('Timestamp and Validity', () => {
    it('should use local data if local is valid and remote is stale', async () => {
      const localData: BookmarksData = {
        'http://example.com/f': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Valid Local F',
          ['local']
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/f': createBookmarkEntry(
          threeHoursAgo, // Staled remote data
          threeHoursAgo,
          'Invalid Remote F',
          ['remote']
        ),
      }
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/f': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Valid Local F',
          ['local'],
          {},
          undefined,
          now
        ),
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, preferOldestCreated: false },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
      })

      const expectedUpdates: BookmarksData = {
        'http://example.com/f': createBookmarkEntry(
          threeHoursAgo,
          oneHourAgo,
          'Valid Local F',
          ['local'],
          {},
          undefined,
          now
        ),
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedUpdatesForRemote: expectedUpdates,
      })

      const localDataWithOldCreated: BookmarksData = {
        'http://example.com/f': createBookmarkEntry(
          threeHoursAgo,
          oneHourAgo,
          'Valid Local F',
          ['local']
        ),
      }

      const expectedUpdatesForRemote2: BookmarksData = {
        'http://example.com/f': createBookmarkEntry(
          threeHoursAgo,
          oneHourAgo,
          'Valid Local F',
          ['local'],
          {},
          undefined,
          now
        ),
      }
      await runMergeTest({
        localData: localDataWithOldCreated,
        remoteData,
        strategy: { ...baseStrategy, preferOldestCreated: true },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote: expectedUpdatesForRemote2,
      })
    })

    it('should use remote data if remote is valid and local is stale', async () => {
      const localData: BookmarksData = {
        'http://example.com/g': createBookmarkEntry(
          threeHoursAgo, // Stale local data
          threeHoursAgo,
          'Invalid Local G',
          ['local']
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/g': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Valid Remote G',
          ['remote']
        ),
      }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/g': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Valid Remote G',
          ['remote'],
          {},
          undefined,
          now
        ),
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, preferOldestCreated: false },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
      })

      const expectedUpdates: BookmarksData = {
        'http://example.com/g': createBookmarkEntry(
          threeHoursAgo,
          oneHourAgo,
          'Valid Remote G',
          ['remote'],
          {},
          undefined,
          now
        ),
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedLocalEqualsToRemote: true,
      })

      const remoteDataWithOlderCreated: BookmarksData = {
        'http://example.com/g': createBookmarkEntry(
          threeHoursAgo,
          oneHourAgo,
          'Valid Remote G',
          ['remote']
        ),
      }

      const expectedUpdatesForLocal2: BookmarksData = {
        'http://example.com/g': createBookmarkEntry(
          threeHoursAgo,
          oneHourAgo,
          'Valid Remote G',
          ['remote'],
          {},
          undefined,
          now
        ),
      }
      await runMergeTest({
        localData,
        remoteData: remoteDataWithOlderCreated,
        strategy: { ...baseStrategy, preferOldestCreated: true },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdatesForLocal2,
      })
    })

    // Test case: Verifies behavior when a bookmark is stale (updated < lastSyncTime) on both local and remote.
    // It also tests the scenario where the bookmark is considered valid if lastSyncTime is older than the bookmark's update time.
    it('should exclude bookmark from merge result if both local and remote are stale, but merge if valid relative to lastSyncTime', async () => {
      const localData: BookmarksData = {
        'http://example.com/h': createBookmarkEntry(
          threeHoursAgo,
          threeHoursAgo, // updated timestamp
          'Stale Local H',
          ['local'],
          {
            localField: 'local field',
          }
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/h': createBookmarkEntry(
          threeHoursAgo,
          threeHoursAgo, // updated timestamp
          'Stale Remote H',
          ['remote'],
          {
            remoteField: 'remote field',
          }
        ),
      }

      // Scenario 1: Both local and remote are stale (updated < lastSyncTime).
      // In this case, mergeBothSources returns undefined. This means the item is excluded from the merged result.
      // It's important to note that the item is NOT explicitly deleted from local or remote storage in this scenario.
      // The deletedURLs array is not populated for this type of exclusion.
      // This situation can occur if data diverged (e.g., due to manual edits on local/remote without updating timestamps)
      // after the last successful sync, making both versions appear older than the sync record.
      const expectedUpdatesForLocalStale: BookmarksData = {}
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption, // lastSyncTime is 'now', which is > threeHoursAgo
        expectedUpdatesForLocal: expectedUpdatesForLocalStale,
        expectedLocalDeletions: [], // No explicit deletion from local/remote, item is just not included in merge result
        ignoreCompareAfterMerge: true, // Merged result will be empty for this item
      })

      // Scenario 2: Both local and remote are considered valid (updated > lastSyncTime).
      // If lastSyncTime is older than the bookmark's 'updated' timestamp, the bookmark is treated as valid and should be merged.
      const expectedUpdatesForValid: BookmarksData = {
        'http://example.com/h': {
          meta: {
            created: threeHoursAgo,
            updated: threeHoursAgo,
            title: 'Stale Local H', // Assuming 'local' strategy for meta if not specified, or merged based on strategy
            localField: 'local field',
            remoteField: 'remote field',
            updated3: now,
          },
          tags: ['local', 'remote'], // 'union' strategy for tags
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'merge', tags: 'union' }, // Explicitly use merge for meta and union for tags
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo - 20_000 }, // lastSyncTime is now older than bookmark's updated time
        expectedUpdatesForLocal: expectedUpdatesForValid,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('should correctly use defaultDate for normalization if timestamps are invalid', async () => {
      const localData: BookmarksData = {
        'http://example.com/i': {
          meta: {
            // @ts-expect-error Testing invalid date
            created: 'invalid-date',
            // @ts-expect-error Testing invalid date
            updated: 'invalid-date',
            title: 'Local I',
          },
          tags: ['local'],
        },
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/i': {
          meta: {
            created: defaultDateTimestamp,
            updated: defaultDateTimestamp,
            title: 'Local I',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        // Don't update local data even it's timestamps are invalid
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true,
      })
    })

    it('should correctly use defaultDate for updated if updated is an invalid date string', async () => {
      const localData: BookmarksData = {
        'http://example.com/j': {
          meta: {
            created: oneHourAgo,
            // @ts-expect-error Testing invalid date string for updated
            updated: 'not-a-real-date',
            title: 'Local J',
          },
          tags: ['local'],
        },
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/j': {
          meta: {
            created: oneHourAgo,
            updated: oneHourAgo, // Should fall back to created because updated is invalid
            title: 'Local J',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true,
      })
    })

    it('should correctly use created timestamp for updated if updated is an invalid number (e.g. 0 or NaN)', async () => {
      const localData: BookmarksData = {
        'http://example.com/k': {
          meta: {
            created: oneHourAgo,
            updated: 0, // Testing invalid number for updated
            title: 'Local K',
          },
          tags: ['local'],
        },
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/k': {
          meta: {
            created: oneHourAgo,
            updated: oneHourAgo, // Should fall back to created because updated is invalid
            title: 'Local K',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedLocalDeletions: [],
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true,
      })
    })

    it('should normalize created timestamp when created is invalid but updated is valid', async () => {
      const localData: BookmarksData = {
        'http://example.com/l': {
          meta: {
            // @ts-expect-error Testing invalid date for created
            created: 'invalid-created-date',
            updated: oneHourAgo, // Valid updated timestamp
            title: 'Local L',
          },
          tags: ['local'],
        },
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/l': {
          meta: {
            created: oneHourAgo, // Should use updated timestamp because created is invalid
            updated: oneHourAgo,
            title: 'Local L',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedLocalDeletions: [],
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true,
      })
    })

    it('should normalize created timestamp when created is later than updated', async () => {
      const localData: BookmarksData = {
        'http://example.com/m': {
          meta: {
            created: oneHourAgo, // Created is later than updated
            updated: threeHoursAgo, // Updated is earlier
            title: 'Local M',
          },
          tags: ['local'],
        },
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/m': {
          meta: {
            created: threeHoursAgo, // Should use the earlier timestamp (updated)
            updated: threeHoursAgo,
            title: 'Local M',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo - 20_000 }, // lastSyncTime is older than updated
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true,
      })
    })

    it('should use defaultDate when both created and updated are invalid', async () => {
      const localData: BookmarksData = {
        'http://example.com/n': {
          meta: {
            created: Number.NaN,
            // @ts-expect-error Testing invalid dates
            updated: 'invalid-updated',
            title: 'Local N',
          },
          tags: ['local'],
        },
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/n': {
          meta: {
            created: defaultDateTimestamp, // Should use defaultDate
            updated: defaultDateTimestamp, // Should use defaultDate
            title: 'Local N',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true,
      })
    })

    it('should normalize created to use the earliest valid timestamp between created and updated', async () => {
      const localData: BookmarksData = {
        'http://example.com/o': {
          meta: {
            created: oneHourAgo, // Later timestamp
            updated: twoHoursAgo, // Earlier timestamp
            title: 'Local O',
          },
          tags: ['local'],
        },
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/o': {
          meta: {
            created: twoHoursAgo, // Should use the earlier timestamp
            updated: twoHoursAgo,
            title: 'Local O',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: { ...baseSyncOption, lastSyncTime: twoHoursAgo - 1 }, // lastSyncTime is older than updated
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true,
      })
    })

    it('should handle edge case where created is valid but updated is earlier than created', async () => {
      const localData: BookmarksData = {
        'http://example.com/p': {
          meta: {
            created: oneHourAgo,
            updated: threeHoursAgo, // Updated is earlier than created (unusual case)
            title: 'Local P',
          },
          tags: ['local'],
        },
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/p': {
          meta: {
            created: threeHoursAgo, // Should normalize to the earlier timestamp
            updated: threeHoursAgo, // Updated should be at least as late as created
            title: 'Local P',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo - 1 }, // lastSyncTime is older than updated
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true,
      })
    })

    it('should handle case where only created is valid and updated is invalid', async () => {
      const localData: BookmarksData = {
        'http://example.com/q': {
          meta: {
            created: oneHourAgo, // Valid created timestamp
            updated: -1, // Invalid updated timestamp
            title: 'Local Q',
          },
          tags: ['local'],
        },
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/q': {
          meta: {
            created: oneHourAgo, // Should keep valid created
            updated: oneHourAgo, // Should fall back to created
            title: 'Local Q',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true,
      })
    })
  })

  describe('MergeMetaStrategy (Title)', () => {
    const localEntry = createBookmarkEntry(
      oneHourAgo,
      oneHourAgo,
      'Local Title',
      ['common', 'local'],
      {},
      undefined,
      oneHourAgo
    )
    const remoteEntryNewer = createBookmarkEntry(
      now,
      now,
      'Remote Newer Title',
      ['common', 'remote'],
      {},
      undefined,
      now
    )
    const remoteEntryOlder = createBookmarkEntry(
      threeHoursAgo,
      threeHoursAgo,
      'Remote Older Title',
      ['common'],
      {},
      undefined,
      threeHoursAgo
    )

    it('meta strategy: local - should use local meta', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, meta: 'local' }
      const localData = { 'http://item.com': localEntry }
      const remoteData = { 'http://item.com': remoteEntryNewer } // Remote is newer
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            ...localEntry.meta,
            title: 'Local Title', // Explicitly local
            updated: remoteEntryNewer.meta.updated,
            updated3: now + 1, // Max of updated times + 1
          },
          tags: ['common', 'local', 'remote'], // Tags strategy is 'union' by default
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('meta strategy: remote - should use remote meta', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, meta: 'remote' }
      const localData = { 'http://item.com': localEntry } // Local is older
      const remoteData = { 'http://item.com': remoteEntryNewer }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            ...remoteEntryNewer.meta,
            title: 'Remote Newer Title', // Explicitly remote
            created: localEntry.meta.created,
            updated3: now + 1,
          },
          tags: ['common', 'local', 'remote'], // Tags strategy is 'union' by default
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('meta strategy: newer - should use newer meta (remote in this case)', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, meta: 'newer' }
      const localData = { 'http://item.com': localEntry }
      const remoteData = { 'http://item.com': remoteEntryNewer }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            ...remoteEntryNewer.meta, // Newer meta base
            title: 'Remote Newer Title',
            created: localEntry.meta.created,
            updated3: now + 1,
          },
          tags: ['common', 'local', 'remote'], // Tags strategy is 'union' by default
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('meta strategy: newer - should use newer meta (local in this case)', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, meta: 'newer' }
      const localData = { 'http://item.com': remoteEntryNewer } // Local is newer now
      const remoteData = { 'http://item.com': localEntry }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            ...remoteEntryNewer.meta,
            title: 'Remote Newer Title',
            created: localEntry.meta.created,
            updated3: now + 1,
          },
          tags: ['common', 'remote', 'local'], // Tags strategy is 'union' by default
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })

    // The 'merge' (default for meta in code) strategy for meta means newer takes precedence for individual fields
    // but it's more like a property-wise 'newer' or 'overwrite with newer'
    it('meta strategy: merge (default) - should behave like newer for meta', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, meta: 'merge' } // 'merge' is default in implementation if not 'local', 'remote', 'newer'
      const localData = { 'http://item.com': localEntry } // local older
      const remoteData = { 'http://item.com': remoteEntryNewer } // remote newer
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            // created: localEntry.meta.created, // 'merge' takes newer for all fields
            // updated: remoteEntryNewer.meta.updated,
            ...remoteEntryNewer.meta, // effectively, newer object's properties overwrite older
            title: 'Remote Newer Title',
            created: localEntry.meta.created,
            updated3: now + 1,
          },
          tags: ['common', 'local', 'remote'], // Tags strategy is 'union' by default
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('meta strategy: merge - should use local meta if local is newer', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, meta: 'merge' }
      const localNewerEntry = createBookmarkEntry(
        now,
        now,
        'Local Newer Title',
        ['common', 'local'],
        {},
        now
      )
      const remoteOlderEntry = createBookmarkEntry(
        oneHourAgo,
        oneHourAgo,
        'Remote Older Title',
        ['common', 'remote'],
        {},
        oneHourAgo
      )
      const localData = { 'http://item.com': localNewerEntry }
      const remoteData = { 'http://item.com': remoteOlderEntry }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            ...localNewerEntry.meta,
            title: 'Local Newer Title',
            created: remoteOlderEntry.meta.created, // 'merge' keeps older created if newer one is later
            updated3: now + 1,
          },
          tags: ['common', 'local', 'remote'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })
  })

  describe('MergeTagsStrategy', () => {
    const localEntry = createBookmarkEntry(
      oneHourAgo,
      oneHourAgo,
      'Title local',
      ['tagL1', 'common'],
      {},
      oneHourAgo
    )
    const remoteEntryNewer = createBookmarkEntry(
      now,
      now,
      'Title remote',
      ['tagR1', 'common'],
      {},
      now
    )

    it('tags strategy: local - should use local tags', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, tags: 'local' }
      const localData = { 'http://item.com': localEntry }
      const remoteData = { 'http://item.com': remoteEntryNewer }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            ...remoteEntryNewer.meta, // meta strategy is 'newer'
            created: localEntry.meta.created,
            updated3: now + 1,
          },
          tags: ['tagL1', 'common'], // Explicitly local tags
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('tags strategy: remote - should use remote tags', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, tags: 'remote' }
      const localData = { 'http://item.com': localEntry }
      const remoteData = { 'http://item.com': remoteEntryNewer }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            ...remoteEntryNewer.meta,
            updated3: now + 1,
          },
          tags: ['tagR1', 'common'], // Explicitly remote tags
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...strategy, preferOldestCreated: false },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
      })
      const expectedUpdates: BookmarksData = {
        'http://item.com': {
          meta: {
            ...remoteEntryNewer.meta,
            created: localEntry.meta.created,
            updated3: now + 1,
          },
          tags: ['tagR1', 'common'], // Explicitly remote tags
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('tags strategy: newer - should use newer tags (remote in this case)', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, tags: 'newer' }
      const localData = { 'http://item.com': localEntry }
      const remoteData = { 'http://item.com': remoteEntryNewer }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            ...remoteEntryNewer.meta,
            updated3: now + 1,
          },
          tags: ['tagR1', 'common'], // Newer tags
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...strategy, preferOldestCreated: false },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
      })

      const expectedUpdates: BookmarksData = {
        'http://item.com': {
          meta: {
            ...remoteEntryNewer.meta,
            created: localEntry.meta.created,
            updated3: now + 1,
          },
          tags: ['tagR1', 'common'], // Newer tags
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('tags strategy: newer - should use local tags if local is newer', async () => {
      const strategy: MergeStrategy = {
        ...baseStrategy,
        tags: 'newer',
        preferOldestCreated: false,
      }
      const localNewerEntry = createBookmarkEntry(
        now,
        now,
        'Title local newer',
        ['tagL-new', 'common-new'],
        {},
        now
      )
      const remoteOlderEntry = createBookmarkEntry(
        oneHourAgo,
        oneHourAgo,
        'Title remote older',
        ['tagR-old', 'common-old'],
        {},
        oneHourAgo
      )
      const localData = { 'http://item.com': localNewerEntry }
      const remoteData = { 'http://item.com': remoteOlderEntry }
      const expectedUpdatesForRemote: BookmarksData = {
        'http://item.com': {
          meta: {
            ...localNewerEntry.meta, // meta strategy is 'newer' by default
            updated3: now + 1,
          },
          tags: ['tagL-new', 'common-new'], // Newer tags from local
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
      })

      const expectedUpdates: BookmarksData = {
        'http://item.com': {
          meta: {
            ...localNewerEntry.meta, // meta strategy is 'newer' by default
            created: remoteOlderEntry.meta.created,
            updated3: now + 1,
          },
          tags: ['tagL-new', 'common-new'], // Newer tags from local
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...strategy, preferOldestCreated: true },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedUpdatesForRemote: expectedUpdates,
      })
    })

    it('tags strategy: union (default) - should merge and deduplicate tags', async () => {
      const strategy: MergeStrategy = { ...baseStrategy, tags: 'union' }
      const localData = { 'http://item.com': localEntry }
      const remoteData = { 'http://item.com': remoteEntryNewer }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://item.com': {
          meta: {
            ...remoteEntryNewer.meta,
            created: localEntry.meta.created,
            updated3: now + 1,
          },
          tags: ['tagL1', 'common', 'tagR1'], // .sort(), // Union of tags, sorted for consistent test
        },
      }
      // Adjust expected tags to be sorted as Set conversion might change order
      // expectedUpdatesForLocal['http://item.com'].tags.sort()
      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })
  })

  describe('Deleted Bookmarks Handling', () => {
    it('should merge normally if local is deleted but remote is newer and not deleted', async () => {
      const localData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          threeHoursAgo, // Staled
          threeHoursAgo,
          'Local Deleted',
          [DELETED_BOOKMARK_TAG, 'local'],
          {},
          undefined,
          threeHoursAgo,
          { deleted: threeHoursAgo, actionType: 'DELETE' }
        ),
      }
      const remoteData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Remote Active',
          ['remote'],
          {},
          undefined,
          oneHourAgo
        ),
      }
      // Default strategy: meta 'newer', tags 'union'
      // Remote is newer and not deleted, so remote should win.
      const expectedUpdatesForLocal: BookmarksData = {
        'http://deleted.com': {
          meta: {
            created: oneHourAgo,
            updated: oneHourAgo,
            title: 'Remote Active',
            updated3: now,
          },
          tags: ['remote'], // Remote's tags, as it's the chosen version
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, preferOldestCreated: false },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
      })

      const expectedUpdates: BookmarksData = {
        'http://deleted.com': {
          meta: {
            created: threeHoursAgo,
            updated: oneHourAgo,
            title: 'Remote Active',
            updated3: now,
          },
          tags: ['remote'], // Remote's tags, as it's the chosen version
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('should merge normally if remote is deleted but local is newer and not deleted - 1', async () => {
      const localData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Local Active',
          ['local'],
          {},
          undefined,
          oneHourAgo
        ),
      }
      // Stale
      const remoteData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          threeHoursAgo,
          threeHoursAgo,
          'Remote Deleted',
          [DELETED_BOOKMARK_TAG, 'remote'],
          {},
          undefined,
          threeHoursAgo,
          { deleted: threeHoursAgo, actionType: 'DELETE' }
        ),
      }
      const expectedUpdatesForRemote: BookmarksData = {
        'http://deleted.com': {
          meta: {
            created: oneHourAgo,
            updated: oneHourAgo,
            title: 'Local Active',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, preferOldestCreated: false },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
      })

      const expectedUpdates: BookmarksData = {
        'http://deleted.com': {
          meta: {
            created: threeHoursAgo,
            updated: oneHourAgo,
            title: 'Local Active',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedUpdatesForRemote: expectedUpdates,
      })
    })

    it('should merge normally if remote is deleted but local is newer and not deleted - 2', async () => {
      const localData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Local Active',
          ['local'],
          {},
          undefined,
          oneHourAgo
        ),
      }
      const remoteData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          twoHoursAgo + 10_000,
          twoHoursAgo + 20_000,
          'Remote Deleted',
          [DELETED_BOOKMARK_TAG, 'remote'],
          {},
          undefined,
          twoHoursAgo + 30_000,
          { deleted: threeHoursAgo, actionType: 'DELETE' }
        ),
      }
      const expectedUpdates: BookmarksData = {
        'http://deleted.com': {
          meta: {
            created: twoHoursAgo + 10_000,
            updated: oneHourAgo,
            title: 'Local Active',
            updated3: now,
          },
          tags: ['local', DELETED_BOOKMARK_TAG, 'remote'],
          deletedMeta: { deleted: threeHoursAgo, actionType: 'DELETE' },
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedUpdatesForRemote: expectedUpdates,
      })
    })

    it('should merge normally if remote is deleted but local is newer and not deleted - 3', async () => {
      const localData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Local Active',
          ['local'],
          {},
          undefined,
          oneHourAgo
        ),
      }
      const remoteData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          twoHoursAgo + 10_000,
          twoHoursAgo + 20_000,
          'Remote Deleted',
          [DELETED_BOOKMARK_TAG, 'remote'],
          {},
          undefined,
          twoHoursAgo + 30_000,
          { deleted: threeHoursAgo, actionType: 'DELETE' }
        ),
      }
      const expectedUpdates: BookmarksData = {
        'http://deleted.com': {
          meta: {
            created: twoHoursAgo + 10_000,
            updated: oneHourAgo,
            title: 'Local Active',
            updated3: now,
          },
          tags: ['local'],
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'newer', tags: 'newer' },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedUpdatesForRemote: expectedUpdates,
      })
    })

    it('should keep deleted status if both are deleted and newer strategy picks the deleted one - 1', async () => {
      const localData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          oneHourAgo, // Newer
          oneHourAgo,
          'Local Deleted Newer',
          [DELETED_BOOKMARK_TAG, 'local'],
          {},
          undefined,
          oneHourAgo,
          { deleted: oneHourAgo, actionType: 'DELETE' }
        ),
      }
      // Stale
      const remoteData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          threeHoursAgo, // Older
          threeHoursAgo,
          'Remote Deleted Older',
          [DELETED_BOOKMARK_TAG, 'remote'],
          {},
          undefined,
          threeHoursAgo,
          { deleted: threeHoursAgo, actionType: 'SYNC' }
        ),
      }
      // Meta: newer, Tags: union. Local is newer.
      const expectedUpdates: BookmarksData = {
        'http://deleted.com': {
          meta: {
            created: oneHourAgo,
            updated: oneHourAgo,
            title: 'Local Deleted Newer',
            updated3: now,
          },
          tags: [DELETED_BOOKMARK_TAG, 'local'],
          deletedMeta: { deleted: oneHourAgo, actionType: 'DELETE' }, // from local
        },
      }
      // expectedUpdatesForLocal['http://deleted.com'].tags.sort()
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, preferOldestCreated: false },
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote: expectedUpdates,
      })

      const expectedUpdates2: BookmarksData = {
        'http://deleted.com': {
          meta: {
            created: threeHoursAgo,
            updated: oneHourAgo,
            title: 'Local Deleted Newer',
            updated3: now,
          },
          tags: [DELETED_BOOKMARK_TAG, 'local'],
          deletedMeta: { deleted: oneHourAgo, actionType: 'DELETE' }, // from local
        },
      }
      // expectedUpdatesForLocal['http://deleted.com'].tags.sort()
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates2,
        expectedUpdatesForRemote: expectedUpdates2,
      })
    })

    it('should keep deleted status if both are deleted and newer strategy picks the deleted one - 2', async () => {
      const localData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          oneHourAgo, // Newer
          oneHourAgo,
          'Local Deleted Newer',
          [DELETED_BOOKMARK_TAG, 'local'],
          {},
          undefined,
          oneHourAgo,
          { deleted: oneHourAgo, actionType: 'DELETE' }
        ),
      }

      const remoteData: BookmarksData = {
        'http://deleted.com': createBookmarkEntry(
          twoHoursAgo + 1000, // Older
          twoHoursAgo + 2000,
          'Remote Deleted Older',
          [DELETED_BOOKMARK_TAG, 'remote'],
          {},
          undefined,
          twoHoursAgo + 3000,
          { deleted: threeHoursAgo, actionType: 'SYNC' }
        ),
      }
      // Meta: newer, Tags: union. Local is newer.
      const expectedUpdates: BookmarksData = {
        'http://deleted.com': {
          meta: {
            created: twoHoursAgo + 1000,
            updated: oneHourAgo,
            title: 'Local Deleted Newer',
            updated3: now,
          },
          tags: [DELETED_BOOKMARK_TAG, 'local', 'remote'],
          deletedMeta: { deleted: oneHourAgo, actionType: 'DELETE' }, // from local
        },
      }
      // expectedUpdatesForLocal['http://deleted.com'].tags.sort()
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdates,
        expectedUpdatesForRemote: expectedUpdates,
      })
    })

    //  (local newer or remote newer)
    describe('when local is deleted and remote is active', () => {
      const localDeletedNewerData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          now, // local is newer
          now,
          'Local Deleted',
          [DELETED_BOOKMARK_TAG, 'local-tag'],
          {
            localField: 'local deleted newer',
          },
          undefined,
          now,
          { deleted: now, actionType: 'DELETE' }
        ),
      }
      const remoteActiveOlderData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          oneHourAgo,
          oneHourAgo,
          'Remote Active',
          ['remote-tag'],
          {
            remoteField: 'remote avtive older',
          },
          undefined,
          oneHourAgo
        ),
      }

      const localDeletedOlderData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          oneHourAgo, // local is older
          oneHourAgo,
          'Local Deleted Old',
          [DELETED_BOOKMARK_TAG, 'local-tag-old'],
          {
            localField: 'local deleted older',
          },
          undefined,
          oneHourAgo,
          { deleted: oneHourAgo, actionType: 'DELETE' } // older deletion time
        ),
      }
      const remoteActiveNewerData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          now, // remote is newer
          now,
          'Remote Active New',
          ['remote-tag-new'],
          {
            remoteField: 'remote avtive newer',
          },
          undefined,
          now
        ),
      }

      type TestCase = [
        metaStrategy: MergeMetaStrategy,
        tagsStrategy: MergeTagsStrategy,
        descriptipn: string,
        {
          localData: BookmarksData
          remoteData: BookmarksData
          expectedLocalTagsAndMetadata: BookmarkTagsAndMetadata | undefined
          expectedRemoteTagsAndMetadata?: BookmarkTagsAndMetadata
          expectedLocalEqualsToRemote?: boolean
        },
        preferOldestCreated?: boolean,
        preferNewestUpdated?: boolean,
      ]

      const testCases: TestCase[] = [
        [
          'newer',
          'newer',
          'local deleted (newer), remote active (older) - 1',
          {
            localData: localDeletedNewerData,
            remoteData: remoteActiveOlderData,
            expectedLocalTagsAndMetadata: undefined,
            expectedRemoteTagsAndMetadata: {
              meta: {
                created: now,
                updated: now,
                title: 'Local Deleted',
                localField: 'local deleted newer',
                updated3: now + 1, // Assuming updated3 is based on the newer item's update time + 1
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag'],
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
          },
          false,
        ],
        [
          'newer',
          'newer',
          'local deleted (newer), remote active (older) - 2',
          {
            localData: localDeletedNewerData,
            remoteData: remoteActiveOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Local Deleted',
                localField: 'local deleted newer',
                updated3: now + 1, // Assuming updated3 is based on the newer item's update time + 1
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag'],
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'local',
          'newer',
          'local deleted (newer), remote active (older) - 1',
          {
            localData: localDeletedNewerData,
            remoteData: remoteActiveOlderData,
            expectedLocalTagsAndMetadata: undefined,
            expectedRemoteTagsAndMetadata: {
              meta: {
                created: now,
                updated: now,
                title: 'Local Deleted', // from local
                localField: 'local deleted newer', // from local
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag'],
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
          },
          false,
        ],
        [
          'local',
          'newer',
          'local deleted (newer), remote active (older) - 2',
          {
            localData: localDeletedNewerData,
            remoteData: remoteActiveOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Local Deleted', // from local
                localField: 'local deleted newer', // from local
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag'],
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'remote',
          'newer',
          'local deleted (newer), remote active (older) - 1',
          {
            localData: localDeletedNewerData,
            remoteData: remoteActiveOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from older (remote)
                updated: now, // from newer (local)
                title: 'Remote Active', // from remote
                remoteField: 'remote avtive older', // from remote
                updated3: now + 1, // from newer (local)
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag'], // from local (newer tags)
              // If meta is remote, and remote is not deleted, deletedMeta should be undefined.
              // Since tags from local (newer tags) are chosen, and tags contains DELETED_BOOKMARK_TAG,
              // the deletedMeta should be copy from local.
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'remote',
          'newer',
          'local deleted (newer), remote active (older) - 2',
          {
            localData: localDeletedNewerData,
            remoteData: remoteActiveOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from older (remote)
                updated: oneHourAgo, // from newer (local)
                title: 'Remote Active', // from remote
                remoteField: 'remote avtive older', // from remote
                updated3: now + 1, // from newer (local)
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag'], // from local (newer tags)
              // If meta is remote, and remote is not deleted, deletedMeta should be undefined.
              // Since tags from local (newer tags) are chosen, and tags contains DELETED_BOOKMARK_TAG,
              // the deletedMeta should be copy from local.
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
          false,
          false,
        ],
        [
          'merge',
          'newer',
          'local deleted (newer), remote active (older) - 1',
          {
            localData: localDeletedNewerData,
            remoteData: remoteActiveOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from older (remote)
                updated: now, // from newer (local)
                title: 'Local Deleted', // from newer (local)
                localField: 'local deleted newer', // from local
                remoteField: 'remote avtive older', // from remote
                updated3: now + 1, // from newer (local)
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag'], // from local (newer tags)
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'merge',
          'newer',
          'local deleted (newer), remote active (older) - 2',
          {
            localData: localDeletedNewerData,
            remoteData: remoteActiveOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: now, // from newer (local)
                updated: now, // from newer (local)
                title: 'Local Deleted', // from newer (local)
                localField: 'local deleted newer', // from local
                remoteField: 'remote avtive older', // from remote
                updated3: now + 1, // from newer (local)
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag'], // from local (newer tags)
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
          false,
          false,
        ],
        [
          'newer',
          'union',
          'local deleted (older), remote active (newer)',
          {
            localData: localDeletedOlderData,
            remoteData: remoteActiveNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from local (older)
                updated: now, // from remote (newer)
                title: 'Remote Active New', // from remote (newer)
                remoteField: 'remote avtive newer', // from remote
                updated3: now + 1, // from remote (newer) + 1
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag-old', 'remote-tag-new'],
              deletedMeta: localDeletedOlderData['http://item.com'].deletedMeta,
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'local',
          'union',
          'local deleted (older), remote active (newer)',
          {
            localData: localDeletedOlderData,
            remoteData: remoteActiveNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from local (older)
                updated: now, // from remote (newer)
                title: 'Local Deleted Old', // from local (older)
                localField: 'local deleted older', // from local
                updated3: now + 1, // from remote (newer) + 1
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag-old', 'remote-tag-new'],
              deletedMeta: localDeletedOlderData['http://item.com'].deletedMeta,
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'remote',
          'union',
          'local deleted (older), remote active (newer)',
          {
            localData: localDeletedOlderData,
            remoteData: remoteActiveNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from local (older)
                updated: now, // from remote (newer)
                title: 'Remote Active New', // from remote (newer)
                remoteField: 'remote avtive newer', // from remote
                updated3: now + 1, // from remote (newer) + 1
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag-old', 'remote-tag-new'],
              deletedMeta: localDeletedOlderData['http://item.com'].deletedMeta,
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'merge',
          'local',
          'local deleted (older), remote active (newer)',
          {
            localData: localDeletedOlderData,
            remoteData: remoteActiveNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from local (older)
                updated: now, // from remote (newer)
                title: 'Remote Active New', // from remote (newer)
                localField: 'local deleted older', // from local
                remoteField: 'remote avtive newer', // from remote
                updated3: now + 1, // from remote (newer) + 1
              },
              // If remote (newer) is chosen for meta, and it's not deleted, then the merged item is not deleted.
              // Tags are 'local', so DELETED_BOOKMARK_TAG comes from local.
              // This combination (merge meta favoring newer-active, but tags from older-deleted) is complex.
              // The presence of DELETED_BOOKMARK_TAG from 'local' tags would trigger mergeDeletedMeta.
              // mergeDeletedMeta with 'merge' strategy would then look at the main item's newer status.
              // Since remote is newer and active, its (non-existent) deletedMeta would be preferred.
              tags: [DELETED_BOOKMARK_TAG, 'local-tag-old'],
              deletedMeta: localDeletedOlderData['http://item.com'].deletedMeta, // Because DELETED_BOOKMARK_TAG is present from 'local' tags strategy
              // and mergeDeletedMeta will pick based on newer item (remote), which has no deletedMeta.
              // Wait, if remote is newer and active, and meta is 'merge', the resulting item should be active.
              // The DELETED_BOOKMARK_TAG from 'local' tags would make it deleted.
              // This needs careful re-evaluation of the expected outcome based on merge logic.
              // For now, sticking to the original test's implication that deletedMeta is present.
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
      ]

      it.each(testCases)(
        'meta strategy: %s, tags strategy: %s - %s',
        async (
          metaStrategy,
          tagsStrategy,
          description,
          {
            localData,
            remoteData,
            expectedLocalTagsAndMetadata,
            expectedRemoteTagsAndMetadata,
            expectedLocalEqualsToRemote,
          },
          preferOldestCreated = true,
          preferNewestUpdated = true
        ) => {
          const expectedUpdatesForLocal: BookmarksData =
            expectedLocalTagsAndMetadata
              ? {
                  'http://item.com': expectedLocalTagsAndMetadata,
                }
              : {}
          const expectedUpdatesForRemote: BookmarksData =
            expectedRemoteTagsAndMetadata
              ? {
                  'http://item.com': expectedRemoteTagsAndMetadata,
                }
              : {}

          await runMergeTest({
            localData,
            remoteData,
            strategy: {
              ...baseStrategy,
              meta: metaStrategy,
              tags: tagsStrategy,
              preferOldestCreated,
              preferNewestUpdated,
            },
            syncOption: baseSyncOption,
            expectedUpdatesForLocal,
            expectedUpdatesForRemote,
            expectedLocalEqualsToRemote,
          })
        }
      )
    })

    describe('when local is not deleted and remote is deleted', () => {
      const localActiveNewerData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          now, // local is newer
          now,
          'Local Active Newer',
          ['local-tag-newer'],
          {
            localField: 'active newer',
          },
          undefined,
          now
        ),
      }
      const remoteDeletedOlderData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          oneHourAgo, // remote is older
          oneHourAgo,
          'Remote Deleted Older',
          [DELETED_BOOKMARK_TAG, 'remote-tag-older'],
          {
            remoteField: 'deleted older',
          },
          undefined,
          oneHourAgo,
          { deleted: oneHourAgo, actionType: 'DELETE' }
        ),
      }

      const localActiveOlderData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          oneHourAgo, // local is older
          oneHourAgo,
          'Local Active Older',
          ['local-tag-older'],
          {
            localField: 'active older',
          },
          undefined,
          oneHourAgo
        ),
      }
      const remoteDeletedNewerData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          now, // remote is newer
          now,
          'Remote Deleted Newer',
          [DELETED_BOOKMARK_TAG, 'remote-tag-newer'],
          {
            remoteField: 'deleted newer',
          },
          undefined,
          now,
          { deleted: now, actionType: 'DELETE' }
        ),
      }

      type TestCase = [
        metaStrategy: MergeMetaStrategy,
        tagsStrategy: MergeTagsStrategy,
        descriptipn: string,
        {
          localData: BookmarksData
          remoteData: BookmarksData
          expectedLocalTagsAndMetadata: BookmarkTagsAndMetadata
          expectedRemoteTagsAndMetadata?: BookmarkTagsAndMetadata
          expectedLocalEqualsToRemote?: boolean
        },
        preferOldestCreated?: boolean,
        preferNewestUpdated?: boolean,
      ]

      it.each([
        [
          'newer' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local active (newer), remote deleted (older) - 1',
          {
            localData: localActiveNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: undefined,
            expectedRemoteTagsAndMetadata: {
              meta: {
                created: now,
                updated: now,
                title: 'Local Active Newer',
                localField: 'active newer',
                updated3: now + 1,
              },
              tags: ['local-tag-newer'], // from local (newer)
            },
          },
          false,
        ],
        [
          'newer' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local active (newer), remote deleted (older) - 2',
          {
            localData: localActiveNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Local Active Newer',
                localField: 'active newer',
                updated3: now + 1,
              },
              tags: ['local-tag-newer'], // from local (newer)
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'newer' as MergeMetaStrategy,
          'union' as MergeTagsStrategy,
          'local active (newer), remote deleted (older)',
          {
            localData: localActiveNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Local Active Newer',
                localField: 'active newer',
                updated3: now + 1,
              },
              tags: [
                'local-tag-newer',
                DELETED_BOOKMARK_TAG,
                'remote-tag-older',
              ],
              deletedMeta: { deleted: oneHourAgo, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'local' as MergeMetaStrategy,
          'union' as MergeTagsStrategy,
          'local active (newer), remote deleted (older)',
          {
            localData: localActiveNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Local Active Newer',
                localField: 'active newer',
                updated3: now + 1,
              },
              tags: [
                'local-tag-newer',
                DELETED_BOOKMARK_TAG,
                'remote-tag-older',
              ],
              deletedMeta: { deleted: oneHourAgo, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'remote' as MergeMetaStrategy,
          'union' as MergeTagsStrategy,
          'local active (newer), remote deleted (older)',
          {
            localData: localActiveNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Remote Deleted Older',
                remoteField: 'deleted older',
                updated3: now + 1,
              },
              tags: [
                'local-tag-newer',
                DELETED_BOOKMARK_TAG,
                'remote-tag-older',
              ],
              deletedMeta: { deleted: oneHourAgo, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'merge' as MergeMetaStrategy,
          'union' as MergeTagsStrategy,
          'local active (newer), remote deleted (older)',
          {
            localData: localActiveNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Local Active Newer',
                localField: 'active newer',
                remoteField: 'deleted older',
                updated3: now + 1,
              },
              tags: [
                'local-tag-newer',
                DELETED_BOOKMARK_TAG,
                'remote-tag-older',
              ],
              deletedMeta: { deleted: oneHourAgo, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'newer' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local active (older), remote deleted (newer) - 1',
          {
            localData: localActiveOlderData,
            remoteData: remoteDeletedNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: now, // from local (older, but remote is deleted)
                updated: now, // from remote (newer)
                title: 'Remote Deleted Newer', // from remote (newer)
                remoteField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'remote-tag-newer'], // from remote (newer)
              deletedMeta: { deleted: now, actionType: 'DELETE' }, // from remote (newer)
            },
          },
          false,
        ],
        [
          'newer' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local active (older), remote deleted (newer) - 2',
          {
            localData: localActiveOlderData,
            remoteData: remoteDeletedNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from local (older, but remote is deleted)
                updated: now, // from remote (newer)
                title: 'Remote Deleted Newer', // from remote (newer)
                remoteField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'remote-tag-newer'], // from remote (newer)
              deletedMeta: { deleted: now, actionType: 'DELETE' }, // from remote (newer)
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'local' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local active (older), remote deleted (newer)',
          {
            localData: localActiveOlderData,
            remoteData: remoteDeletedNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from local (older, but remote is deleted)
                updated: now, // from remote (newer)
                title: 'Local Active Older', // from local
                localField: 'active older',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'remote-tag-newer'], // from remote (newer)
              deletedMeta: { deleted: now, actionType: 'DELETE' }, // from remote (newer)
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'remote' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local active (older), remote deleted (newer) - 1',
          {
            localData: localActiveOlderData,
            remoteData: remoteDeletedNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: now, // from local (older, but remote is deleted)
                updated: now, // from remote (newer)
                title: 'Remote Deleted Newer', // from remote (newer)
                remoteField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'remote-tag-newer'], // from remote (newer)
              deletedMeta: { deleted: now, actionType: 'DELETE' }, // from remote (newer)
            },
          },
          false,
        ],
        [
          'remote' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local active (older), remote deleted (newer) - 2',
          {
            localData: localActiveOlderData,
            remoteData: remoteDeletedNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from local (older, but remote is deleted)
                updated: now, // from remote (newer)
                title: 'Remote Deleted Newer', // from remote (newer)
                remoteField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'remote-tag-newer'], // from remote (newer)
              deletedMeta: { deleted: now, actionType: 'DELETE' }, // from remote (newer)
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'merge' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local active (older), remote deleted (newer)',
          {
            localData: localActiveOlderData,
            remoteData: remoteDeletedNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // from local (older, but remote is deleted)
                updated: now, // from remote (newer)
                title: 'Remote Deleted Newer', // from remote (newer)
                localField: 'active older',
                remoteField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'remote-tag-newer'], // from remote (newer)
              deletedMeta: { deleted: now, actionType: 'DELETE' }, // from remote (newer)
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
      ] as TestCase[])(
        'meta strategy: %s, tags strategy: %s - %s',
        async (
          metaStrategy,
          tagsStrategy,
          description,
          {
            localData,
            remoteData,
            expectedLocalTagsAndMetadata,
            expectedRemoteTagsAndMetadata,
            expectedLocalEqualsToRemote,
          },
          preferOldestCreated = true,
          preferNewestUpdated = true
        ) => {
          const expectedUpdatesForLocal: BookmarksData =
            expectedLocalTagsAndMetadata
              ? {
                  'http://item.com': expectedLocalTagsAndMetadata,
                }
              : {}
          const expectedUpdatesForRemote: BookmarksData =
            expectedRemoteTagsAndMetadata
              ? {
                  'http://item.com': expectedRemoteTagsAndMetadata,
                }
              : {}

          await runMergeTest({
            localData,
            remoteData,
            strategy: {
              ...baseStrategy,
              meta: metaStrategy,
              tags: tagsStrategy,
              preferOldestCreated,
              preferNewestUpdated,
            },
            syncOption: baseSyncOption,
            expectedUpdatesForLocal,
            expectedUpdatesForRemote,
            expectedLocalEqualsToRemote,
          })
        }
      )
    })

    describe('when local and remote are both deleted', () => {
      const localDeletedNewerData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          now, // local is newer
          now,
          'Local Deleted Newer',
          [DELETED_BOOKMARK_TAG, 'local-tag-newer'],
          {
            localField: 'deleted newer',
          },
          undefined,
          now,
          { deleted: now, actionType: 'DELETE' }
        ),
      }
      const remoteDeletedOlderData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          oneHourAgo, // remote is older
          oneHourAgo,
          'Remote Deleted Older',
          [DELETED_BOOKMARK_TAG, 'remote-tag-older'],
          {
            remoteField: 'deleted older',
          },
          undefined,
          oneHourAgo,
          { deleted: oneHourAgo, actionType: 'DELETE' }
        ),
      }

      const localDeletedOlderData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          oneHourAgo, // local is older
          oneHourAgo,
          'Local Deleted Older',
          [DELETED_BOOKMARK_TAG, 'local-tag-older'],
          {
            localField: 'deleted older',
          },
          undefined,
          oneHourAgo,
          { deleted: oneHourAgo, actionType: 'DELETE' }
        ),
      }
      const remoteDeletedNewerData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          now, // remote is newer
          now,
          'Remote Deleted Newer',
          [DELETED_BOOKMARK_TAG, 'remote-tag-newer'],
          {
            remoteField: 'deleted newer',
          },
          undefined,
          now,
          { deleted: now, actionType: 'DELETE' }
        ),
      }

      const localDeletedOlderNoDeleteMetaData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          oneHourAgo, // local is older
          oneHourAgo,
          'Local Deleted Older',
          [DELETED_BOOKMARK_TAG, 'local-tag-older'],
          {
            localField: 'deleted older no deleted metadata',
          },
          undefined,
          oneHourAgo
        ),
      }
      const remoteDeletedNewerNoDeleteMetaData: BookmarksData = {
        'http://item.com': createBookmarkEntry(
          now, // remote is newer
          now,
          'Remote Deleted Newer',
          [DELETED_BOOKMARK_TAG, 'remote-tag-newer'],
          {
            remoteField: 'deleted newer no deleted metadata',
          },
          undefined,
          now
        ),
      }

      type TestCase = [
        metaStrategy: MergeMetaStrategy,
        tagsStrategy: MergeTagsStrategy,
        descriptipn: string,
        {
          localData: BookmarksData
          remoteData: BookmarksData
          expectedLocalTagsAndMetadata: BookmarkTagsAndMetadata
          expectedRemoteTagsAndMetadata?: BookmarkTagsAndMetadata
          expectedLocalEqualsToRemote?: boolean
        },
        preferOldestCreated?: boolean,
        preferNewestUpdated?: boolean,
      ]

      it.each([
        [
          'local' as MergeMetaStrategy,
          'local' as MergeTagsStrategy,
          'local deleted (newer), remote deleted (older) - local strategy - 1',
          {
            localData: localDeletedNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: undefined,
            expectedRemoteTagsAndMetadata: {
              meta: {
                created: now,
                updated: now,
                title: 'Local Deleted Newer',
                localField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag-newer'],
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
          },
          false,
          false,
        ],
        [
          'local' as MergeMetaStrategy,
          'local' as MergeTagsStrategy,
          'local deleted (newer), remote deleted (older) - local strategy - 2',
          {
            localData: localDeletedNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Local Deleted Newer',
                localField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag-newer'],
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'local' as MergeMetaStrategy,
          'remote' as MergeTagsStrategy,
          'local deleted (newer), remote deleted (older) - local meta, remote tags strategy',
          {
            localData: localDeletedNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Local Deleted Newer',
                localField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'remote-tag-older'],
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'remote' as MergeMetaStrategy,
          'remote' as MergeTagsStrategy,
          'local deleted (newer), remote deleted (older) - remote strategy',
          {
            localData: localDeletedNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Remote Deleted Older',
                remoteField: 'deleted older',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'remote-tag-older'],
              deletedMeta: { deleted: oneHourAgo, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'remote' as MergeMetaStrategy,
          'local' as MergeTagsStrategy,
          'local deleted (newer), remote deleted (older) - remote meta, local tags strategy',
          {
            localData: localDeletedNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Remote Deleted Older',
                remoteField: 'deleted older',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag-newer'],
              deletedMeta: { deleted: oneHourAgo, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'newer' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local deleted (newer), remote deleted (older) - newer strategy',
          {
            localData: localDeletedNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Local Deleted Newer',
                localField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'local-tag-newer'],
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'newer' as MergeMetaStrategy,
          'newer' as MergeTagsStrategy,
          'local deleted (older), remote deleted (newer) - newer strategy',
          {
            localData: localDeletedOlderData,
            remoteData: remoteDeletedNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo,
                updated: now,
                title: 'Remote Deleted Newer',
                remoteField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [DELETED_BOOKMARK_TAG, 'remote-tag-newer'],
              deletedMeta: { deleted: now, actionType: 'DELETE' },
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'union' as MergeMetaStrategy,
          'union' as MergeTagsStrategy,
          'local deleted (newer), remote deleted (older) - union strategy',
          {
            localData: localDeletedNewerData,
            remoteData: remoteDeletedOlderData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // union takes older created
                updated: now, // union takes newer updated
                title: 'Local Deleted Newer', // union takes newer title
                localField: 'deleted newer',
                remoteField: 'deleted older',
                updated3: now + 1,
              },
              tags: [
                DELETED_BOOKMARK_TAG,
                'local-tag-newer',
                'remote-tag-older',
              ], // union of tags
              deletedMeta: { deleted: now, actionType: 'DELETE' }, // union takes newer deletedMeta
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'union' as MergeMetaStrategy,
          'union' as MergeTagsStrategy,
          'local deleted (older), remote deleted (newer) - union strategy',
          {
            localData: localDeletedOlderData,
            remoteData: remoteDeletedNewerData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // union takes older created
                updated: now, // union takes newer updated
                title: 'Remote Deleted Newer', // union takes newer title
                localField: 'deleted older',
                remoteField: 'deleted newer',
                updated3: now + 1,
              },
              tags: [
                DELETED_BOOKMARK_TAG,
                'local-tag-older',
                'remote-tag-newer',
              ], // union of tags
              deletedMeta: { deleted: now, actionType: 'DELETE' }, // union takes newer deletedMeta
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
        [
          'union' as MergeMetaStrategy,
          'union' as MergeTagsStrategy,
          'local deleted (older), remote deleted (newer) - no deleted metadata',
          {
            localData: localDeletedOlderNoDeleteMetaData,
            remoteData: remoteDeletedNewerNoDeleteMetaData,
            expectedLocalTagsAndMetadata: {
              meta: {
                created: oneHourAgo, // union takes older created
                updated: now, // union takes newer updated
                title: 'Remote Deleted Newer', // union takes newer title
                localField: 'deleted older no deleted metadata',
                remoteField: 'deleted newer no deleted metadata',
                updated3: now + 1,
              },
              tags: [
                DELETED_BOOKMARK_TAG,
                'local-tag-older',
                'remote-tag-newer',
              ], // union of tags
            },
            expectedLocalEqualsToRemote: true,
          },
        ],
      ] as TestCase[])(
        'meta strategy: %s, tags strategy: %s - %s',
        async (
          metaStrategy,
          tagsStrategy,
          description,
          {
            localData,
            remoteData,
            expectedLocalTagsAndMetadata,
            expectedRemoteTagsAndMetadata,
            expectedLocalEqualsToRemote = false,
          },
          preferOldestCreated = true,
          preferNewestUpdated = true
        ) => {
          const expectedUpdatesForLocal: BookmarksData =
            expectedLocalTagsAndMetadata
              ? {
                  'http://item.com': expectedLocalTagsAndMetadata,
                }
              : {}
          const expectedUpdatesForRemote: BookmarksData =
            expectedRemoteTagsAndMetadata
              ? {
                  'http://item.com': expectedRemoteTagsAndMetadata,
                }
              : {}

          await runMergeTest({
            localData,
            remoteData,
            strategy: {
              ...baseStrategy,
              meta: metaStrategy,
              tags: tagsStrategy,
              preferOldestCreated,
              preferNewestUpdated,
            },
            syncOption: baseSyncOption,
            expectedUpdatesForLocal,
            expectedUpdatesForRemote,
            expectedLocalEqualsToRemote,
          })
        }
      )
    })

    it('should correctly populate deletedURLs for items not present in remote and invalid locally', async () => {
      const localData: BookmarksData = {
        'http://gone.com': createBookmarkEntry(
          threeHoursAgo,
          threeHoursAgo,
          'Old Gone',
          ['old']
        ),
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForLocal: BookmarksData = {}
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalDeletions: ['http://gone.com'],
      })
    })
  })

  describe('updated3 Timestamp Handling', () => {
    it('should correctly set updated3 based on the max of local and remote update times + 1', async () => {
      const localData: BookmarksData = {
        'http://updated3.com': createBookmarkEntry(
          twoHoursAgo, // created
          twoHoursAgo, // updated
          'Local',
          ['tag', 'local'],
          {},
          oneHourAgo, // ensure local data is valid
          oneHourAgo // updated3 (newer than updated)
        ),
      }
      const remoteData: BookmarksData = {
        'http://updated3.com': createBookmarkEntry(
          twoHoursAgo, // created
          now, // updated (newest)
          'Remote',
          ['tag', 'remote']
          // no updated3, so updated is newest for remote
        ),
      }
      // local effective last update: oneHourAgo (from updated3)
      // remote effective last update: now (from updated)
      // max is 'now'
      const expectedUpdatesForLocal: BookmarksData = {
        'http://updated3.com': {
          meta: {
            created: twoHoursAgo,
            updated: now, // from remote, as it's newer
            title: 'Remote', // from remote, as it's newer
            updated2: oneHourAgo,
            updated3: now + 1, // max(oneHourAgo, now) + 1
          },
          tags: ['tag', 'local', 'remote'], // union
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedUpdatesForRemote: expectedUpdatesForLocal,
      })
    })
  })

  describe('Edge Cases and Invalid Inputs', () => {
    it('should return empty merged and deleted if localData is undefined', async () => {
      const remoteData: BookmarksData = {
        'http://example.com': createBookmarkEntry(now, now, 'Remote', ['tag']),
      }
      const result = await mergeBookmarks(
        undefined,
        remoteData,
        baseStrategy,
        baseSyncOption
      )
      expect(result.updatesForLocal).toEqual({}) // or remoteData, depending on desired behavior for undefined inputs
      expect(result.localDeletions).toEqual([])
    })

    it('should return empty merged and deleted if remoteData is undefined', async () => {
      const localData: BookmarksData = {
        'http://example.com': createBookmarkEntry(now, now, 'Local', ['tag']),
      }
      const result = await mergeBookmarks(
        localData,
        undefined,
        baseStrategy,
        baseSyncOption
      )
      expect(result.updatesForLocal).toEqual({}) // or localData
      expect(result.localDeletions).toEqual([])
    })

    it('should handle empty local and remote data', async () => {
      const result = await mergeBookmarks({}, {}, baseStrategy, baseSyncOption)
      expect(result.updatesForLocal).toEqual({})
      expect(result.localDeletions).toEqual([])
    })
  })

  describe('Advanced Merge Scenarios', () => {
    // Scenario 1: Local new, Remote none
    it('should add local new item to remote and update updated3', async () => {
      const localData: BookmarksData = {
        'http://example.com/new-local': createBookmarkEntry(
          now - 2000, // Created now - 2000
          now - 1000, // Updated now - 1000
          'New Local Item',
          ['local-tag']
        ),
      }
      const remoteData: BookmarksData = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/new-local': createBookmarkEntry(
          now - 2000,
          now - 1000,
          'New Local Item',
          ['local-tag'],
          {},
          undefined,
          baseSyncOption.currentSyncTime // updated3 should be currentSyncTime
        ),
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
      })
    })

    // Scenario 2: Remote new, Local none
    it('should add remote new item to local and update updated3', async () => {
      const localData: BookmarksData = {}
      const remoteData: BookmarksData = {
        'http://example.com/new-remote': createBookmarkEntry(
          now - 2000, // Created now - 2000
          now - 1000, // Updated now - 1000
          'New Remote Item',
          ['remote-tag']
        ),
      }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/new-remote': createBookmarkEntry(
          now - 2000,
          now - 1000,
          'New Remote Item',
          ['remote-tag'],
          {},
          undefined,
          baseSyncOption.currentSyncTime // updated3 should be currentSyncTime
        ),
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedUpdatesForRemote: {},
      })
    })

    // Scenario 3: Local updated, Remote not updated (local is newer)
    it('should update remote with local changes when local is newer', async () => {
      const localData: BookmarksData = {
        'http://example.com/item1': createBookmarkEntry(
          twoHoursAgo, // Original creation
          oneHourAgo, // Local updated recently
          'Updated Local Item 1',
          ['local-updated'],
          {},
          oneHourAgo // local updated2 reflects its update time
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/item1': createBookmarkEntry(
          twoHoursAgo,
          twoHoursAgo, // Remote not updated recently
          'Original Item 1',
          ['original'],
          {},
          twoHoursAgo // remote updated2 is old
        ),
      }

      let expectedUpdatesForLocal = {}
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/item1': {
          meta: {
            created: twoHoursAgo,
            updated: oneHourAgo,
            title: 'Updated Local Item 1',
            updated2: oneHourAgo,
            updated3: Math.max(oneHourAgo + 1, baseSyncOption.currentSyncTime),
          },
          tags: ['local-updated'], // Assuming 'local' tag strategy or similar if not union
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, tags: 'newer' }, // meta: 'newer', tags: 'newer'
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo }, // Ensure both are 'valid'
        expectedUpdatesForLocal,
        expectedUpdatesForRemote,
      })

      // If tags strategy is 'union', tags would be ['original', 'local-updated']
      // For simplicity, let's assume a 'local' or 'newer' like behavior for tags if not specified, or adjust if needed.
      // Given baseStrategy.tags = 'union', the tags should be merged.
      if (baseStrategy.tags === 'union') {
        expectedUpdatesForRemote['http://example.com/item1'].tags = [
          'original',
          'local-updated',
        ].sort()
        expectedUpdatesForLocal = expectedUpdatesForRemote
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy, // meta: 'newer', tags: 'union'
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo }, // Ensure both are 'valid'
        expectedUpdatesForLocal,
        expectedUpdatesForRemote,
      })
    })

    // Scenario 4: Remote updated, Local not updated (remote is newer)
    it('should update local with remote changes when remote is newer', async () => {
      const localData: BookmarksData = {
        'http://example.com/item2': createBookmarkEntry(
          twoHoursAgo,
          twoHoursAgo, // Local not updated recently
          'Original Item 2',
          ['original'],
          {},
          twoHoursAgo
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/item2': createBookmarkEntry(
          twoHoursAgo, // Original creation
          oneHourAgo, // Remote updated recently
          'Updated Remote Item 2',
          ['remote-updated'],
          {},
          oneHourAgo
        ),
      }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/item2': {
          meta: {
            created: twoHoursAgo,
            updated: oneHourAgo,
            title: 'Updated Remote Item 2', // meta: 'newer'
            updated2: oneHourAgo,
            updated3: Math.max(oneHourAgo + 1, baseSyncOption.currentSyncTime),
          },
          tags: ['original', 'remote-updated'].sort(), // tags: 'union'
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy, // meta: 'newer', tags: 'union'
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo }, // Ensure both are 'valid'
        expectedUpdatesForLocal,
        expectedUpdatesForRemote: {},
        expectedLocalEqualsToRemote: true, // if mergeTarget is 3, remote also gets this update
      })
    })

    // Scenario 5: Both local and remote updated (conflict)
    it('should merge based on strategy when both local and remote are updated', async () => {
      const localData: BookmarksData = {
        'http://example.com/conflict': createBookmarkEntry(
          twoHoursAgo,
          oneHourAgo, // Local updated
          'Local Conflict Version',
          ['tag-local'],
          { localOnly: 'yes' },
          oneHourAgo
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/conflict': createBookmarkEntry(
          twoHoursAgo, // Same creation time
          oneHourAgo + 1000, // Remote updated slightly later
          'Remote Conflict Version',
          ['tag-remote'],
          { remoteOnly: 'yes' },
          oneHourAgo + 1000
        ),
      }
      // With meta: 'newer', remote title wins. With tags: 'union', tags are merged.
      let expectedMergedData: BookmarksData = {
        'http://example.com/conflict': {
          meta: {
            created: twoHoursAgo,
            updated: oneHourAgo + 1000, // Newer update time
            title: 'Remote Conflict Version', // Newer title
            remoteOnly: 'yes', // Newer meta object properties win
            updated2: oneHourAgo + 1000,
            updated3: Math.max(
              oneHourAgo + 1000 + 1,
              baseSyncOption.currentSyncTime
            ),
          },
          tags: ['tag-local', 'tag-remote'].sort(),
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy, // meta: 'newer', tags: 'union'
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo }, // Ensure both are 'valid'
        expectedUpdatesForLocal: expectedMergedData,
        expectedUpdatesForRemote: expectedMergedData, // mergeTarget should be 3
        expectedLocalEqualsToRemote: true,
      })

      // With meta: 'merge' and tags: 'union', tags are merged.
      expectedMergedData = {
        'http://example.com/conflict': {
          meta: {
            created: twoHoursAgo,
            updated: oneHourAgo + 1000, // Newer update time
            title: 'Remote Conflict Version', // Newer title
            localOnly: 'yes',
            remoteOnly: 'yes', // Newer meta object properties win
            updated2: oneHourAgo + 1000,
            updated3: Math.max(
              oneHourAgo + 1000 + 1,
              baseSyncOption.currentSyncTime
            ),
          },
          tags: ['tag-local', 'tag-remote'].sort(),
        },
      }
      await runMergeTest({
        localData,
        remoteData,
        strategy: { ...baseStrategy, meta: 'merge' }, // meta: 'merge', tags: 'union'
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo }, // Ensure both are 'valid'
        expectedUpdatesForLocal: expectedMergedData,
        expectedUpdatesForRemote: expectedMergedData, // mergeTarget should be 3
        expectedLocalEqualsToRemote: true,
      })
    })

    // Scenario 6: Local deleted, Remote exists
    it('should mark remote as deleted if local is deleted (and strategy implies local wins or merge)', async () => {
      const localData: BookmarksData = {
        'http://example.com/tobedeleted-local': createBookmarkEntry(
          twoHoursAgo,
          oneHourAgo, // Updated recently to mark as deleted
          'To Be Deleted by Local',
          [DELETED_BOOKMARK_TAG, 'other-tag'],
          {},
          oneHourAgo // updated2 reflects this deletion change
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/tobedeleted-local': createBookmarkEntry(
          twoHoursAgo,
          twoHoursAgo, // Not deleted on remote, older update
          'Existing on Remote',
          ['remote-tag'],
          {},
          twoHoursAgo
        ),
      }
      // Expected: local is newer and deleted, so remote should also be marked deleted.
      // The merged result will have the DELETED_BOOKMARK_TAG.
      // The title and other meta might come from local due to 'newer' strategy if local's deletion timestamp is newer.
      const expectedMergedData: BookmarksData = {
        'http://example.com/tobedeleted-local': {
          meta: {
            created: twoHoursAgo,
            updated: oneHourAgo, // from local, as it's newer
            title: 'To Be Deleted by Local',
            updated2: oneHourAgo,
            updated3: Math.max(oneHourAgo + 1, baseSyncOption.currentSyncTime),
          },
          tags: [DELETED_BOOKMARK_TAG, 'other-tag', 'remote-tag'].sort(), // Union of tags, including DELETED_BOOKMARK_TAG
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy, // meta: 'newer', tags: 'union'
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo }, // Ensure both are 'valid'
        expectedUpdatesForLocal: expectedMergedData,
        expectedUpdatesForRemote: expectedMergedData,
        // If local is deleted and newer, remote should be updated to reflect deletion.
        // The item itself is not added to remoteDeletions array, but its content is updated to be a deleted bookmark.
      })
    })

    // Scenario 7: Remote deleted, Local exists
    it('should mark local as deleted if remote is deleted (and strategy implies remote wins or merge)', async () => {
      const localData: BookmarksData = {
        'http://example.com/tobedeleted-remote': createBookmarkEntry(
          twoHoursAgo,
          twoHoursAgo, // Not deleted on local, older update
          'Existing on Local',
          ['local-tag'],
          {},
          twoHoursAgo
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/tobedeleted-remote': createBookmarkEntry(
          twoHoursAgo,
          oneHourAgo, // Updated recently to mark as deleted
          'To Be Deleted by Remote',
          [DELETED_BOOKMARK_TAG, 'other-tag'],
          {},
          oneHourAgo // updated2 reflects this deletion change
        ),
      }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/tobedeleted-remote': {
          meta: {
            created: twoHoursAgo,
            updated: oneHourAgo, // from remote, as it's newer
            title: 'To Be Deleted by Remote',
            updated2: oneHourAgo,
            updated3: Math.max(oneHourAgo + 1, baseSyncOption.currentSyncTime),
          },
          tags: ['local-tag', DELETED_BOOKMARK_TAG, 'other-tag'],
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy, // meta: 'newer', tags: 'union'
        syncOption: { ...baseSyncOption, lastSyncTime: threeHoursAgo }, // Ensure both are 'valid'
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true, // if mergeTarget is 3 (or 1), local gets updated
      })
    })

    // Scenario 8: Local exists but invalid, Remote none
    it('should add local item to localDeletions if it exists locally but is invalid, and not on remote', async () => {
      const localData: BookmarksData = {
        'http://example.com/invalid-local-only': createBookmarkEntry(
          threeHoursAgo, // Older than lastSyncTime (twoHoursAgo)
          threeHoursAgo,
          'Invalid Local Only',
          ['old-local']
        ),
      }
      const remoteData: BookmarksData = {}

      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption, // lastSyncTime is twoHoursAgo
        expectedUpdatesForLocal: {},
        expectedLocalDeletions: ['http://example.com/invalid-local-only'],
        expectedUpdatesForRemote: {},
      })
    })

    // Scenario 9: Remote exists but invalid, Local none
    it('should add remote item to remoteDeletions if it exists remotely but is invalid, and not on local', async () => {
      const localData: BookmarksData = {}
      const remoteData: BookmarksData = {
        'http://example.com/invalid-remote-only': createBookmarkEntry(
          threeHoursAgo, // Older than lastSyncTime (twoHoursAgo)
          threeHoursAgo,
          'Invalid Remote Only',
          ['old-remote']
        ),
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: baseStrategy,
        syncOption: baseSyncOption, // lastSyncTime is twoHoursAgo
        expectedUpdatesForLocal: {},
        expectedRemoteDeletions: ['http://example.com/invalid-remote-only'],
      })
    })
  })

  describe('MergeStrategy default and invalid property values', () => {
    it('should use DEFAULT_DATE when strategy.defaultDate is an empty string and bookmark date is invalid', async () => {
      const localData: BookmarksData = {
        'http://example.com/invalid-date': createBookmarkEntry(
          // @ts-expect-error - Invalid date string
          'invalid',
          'invalid',
          'Local Invalid Date',
          ['tag1']
        ),
      }
      const remoteData: BookmarksData = {}
      const strategy: MergeStrategy = {
        ...baseStrategy,
        defaultDate: 0, // Invalid timestamp for defaultDate
      }
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/invalid-date': {
          meta: {
            created: DEFAULT_DATE, // Should fall back to DEFAULT_DATE from constants
            updated: DEFAULT_DATE, // Should fall back to DEFAULT_DATE from constants
            title: 'Local Invalid Date',
            updated3: now,
          },
          tags: ['tag1'],
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: { ...baseSyncOption, lastSyncTime: 0 },
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true, // Timestamps are tricky with DEFAULT_DATE vs test's defaultDateTimestamp
      })
    })

    it('should use DEFAULT_DATE when strategy.defaultDate is an invalid date string and bookmark date is invalid', async () => {
      const localData: BookmarksData = {
        'http://example.com/invalid-date-str': createBookmarkEntry(
          // @ts-expect-error - Invalid date string
          'invalid',
          'invalid',
          'Local Invalid Date Str',
          ['tag1']
        ),
      }
      const remoteData: BookmarksData = {}
      const strategy: MergeStrategy = {
        ...baseStrategy,
        defaultDate: Number.NaN, // Invalid number for defaultDate
      }
      const expectedUpdatesForRemote: BookmarksData = {
        'http://example.com/invalid-date-str': {
          meta: {
            created: DEFAULT_DATE, // Should fall back to DEFAULT_DATE from constants
            updated: DEFAULT_DATE, // Should fall back to DEFAULT_DATE from constants
            title: 'Local Invalid Date Str',
            updated3: now,
          },
          tags: ['tag1'],
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: { ...baseSyncOption, lastSyncTime: 0 },
        expectedUpdatesForLocal: {},
        expectedUpdatesForRemote,
        ignoreCompareAfterMerge: true, // Timestamps are tricky with DEFAULT_DATE vs test's defaultDateTimestamp
      })
    })

    it('should prefer oldest created timestamp when strategy.preferOldestCreated is undefined (defaults to true)', async () => {
      const localCreated = oneHourAgo - 1000
      const remoteCreated = oneHourAgo
      const localData: BookmarksData = {
        'http://example.com/created-check': createBookmarkEntry(
          localCreated, // Older
          oneHourAgo,
          'Local Title',
          ['tagL']
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/created-check': createBookmarkEntry(
          remoteCreated, // Newer
          oneHourAgo,
          'Remote Title',
          ['tagR']
        ),
      }
      const strategy: MergeStrategy = {
        ...baseStrategy,
        meta: 'remote', // Remote meta wins
        preferOldestCreated: undefined, // Test default behavior
      }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/created-check': {
          meta: {
            created: localCreated, // Expect oldest created
            updated: oneHourAgo, // Timestamps from remote due to 'remote' meta strategy for other fields
            title: 'Remote Title',
            updated3: now,
          },
          tags: ['tagL', 'tagR'], // Union
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })
    })

    it('should prefer newest updated timestamp when strategy.preferNewestUpdated is undefined (defaults to true)', async () => {
      const localUpdated = oneHourAgo + 1000 // Newer
      const remoteUpdated = oneHourAgo
      const localData: BookmarksData = {
        'http://example.com/updated-check': createBookmarkEntry(
          oneHourAgo,
          localUpdated, // Newer
          'Local Title',
          ['tagL']
        ),
      }
      const remoteData: BookmarksData = {
        'http://example.com/updated-check': createBookmarkEntry(
          oneHourAgo,
          remoteUpdated, // Older
          'Remote Title',
          ['tagR']
        ),
      }
      const strategy: MergeStrategy = {
        ...baseStrategy,
        meta: 'remote', // Remote meta wins for title, etc.
        preferNewestUpdated: undefined, // Test default behavior
      }
      const expectedUpdatesForLocal: BookmarksData = {
        'http://example.com/updated-check': {
          meta: {
            created: oneHourAgo,
            updated: localUpdated, // Expect newest updated
            title: 'Remote Title',
            updated3: now,
          },
          tags: ['tagL', 'tagR'], // Union
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal,
        expectedLocalEqualsToRemote: true,
      })

      // ====

      const strategy2: MergeStrategy = {
        ...baseStrategy,
        meta: 'remote', // Remote meta wins for title, etc.
        preferNewestUpdated: false, // Test default behavior
      }
      const expectedUpdatesForLocal2: BookmarksData = {
        'http://example.com/updated-check': {
          meta: {
            created: oneHourAgo,
            updated: remoteUpdated, // Expect updated of remote
            title: 'Remote Title',
            updated3: now,
          },
          tags: ['tagL', 'tagR'], // Union
        },
      }

      await runMergeTest({
        localData,
        remoteData,
        strategy: strategy2,
        syncOption: baseSyncOption,
        expectedUpdatesForLocal: expectedUpdatesForLocal2,
        expectedLocalEqualsToRemote: true,
      })
    })
  })

  describe('MergeStrategy edge cases for meta and tags properties', () => {
    let baseStrategy: MergeStrategy // Define baseStrategy here
    beforeEach(() => {
      // Initialize it
      baseStrategy = {
        meta: 'newer',
        tags: 'union',
        defaultDate: defaultDateTimestamp,
      }
    })

    const dummyLocalData: BookmarksData = {
      'http://example.com/item1': createBookmarkEntry(
        oneHourAgo,
        oneHourAgo,
        'Local Item 1',
        ['tagA']
      ),
    }
    const dummyRemoteData: BookmarksData = {
      'http://example.com/item1': createBookmarkEntry(
        twoHoursAgo,
        twoHoursAgo,
        'Remote Item 1',
        ['tagB']
      ),
    }
    const dummySyncOption: SyncOption = {
      currentSyncTime: now,
      lastSyncTime: threeHoursAgo,
    }

    it('should throw an error if strategy itself is null', async () => {
      await expect(
        mergeBookmarks(
          dummyLocalData,
          dummyRemoteData,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          null as any, // Testing null strategy
          dummySyncOption
        )
      ).rejects.toThrowError() // Or a more specific error if known
    })

    it('should throw an error if strategy itself is undefined', async () => {
      await expect(
        mergeBookmarks(
          dummyLocalData,
          dummyRemoteData,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          undefined as any, // Testing undefined strategy
          dummySyncOption
        )
      ).rejects.toThrowError() // Or a more specific error if known
    })

    it('should use default meta strategy (merge) when strategy.meta is an empty string', async () => {
      const strategyWithEmptyMeta: MergeStrategy = {
        ...baseStrategy,
        meta: '' as any, // Testing empty string meta strategy
      }
      const strategyWithDefaultMeta: MergeStrategy = {
        ...baseStrategy,
        meta: 'merge', // Explicitly use default meta strategy
      }

      const resultWithEmptyMeta = await mergeBookmarks(
        dummyLocalData,
        dummyRemoteData,
        strategyWithEmptyMeta,
        dummySyncOption
      )

      const resultWithDefaultMeta = await mergeBookmarks(
        dummyLocalData,
        dummyRemoteData,
        strategyWithDefaultMeta,
        dummySyncOption
      )

      expect(resultWithEmptyMeta).toEqual(resultWithDefaultMeta)
    })

    it('should use default tags strategy (union) when strategy.tags is an empty string', async () => {
      const strategyWithEmptyTags: MergeStrategy = {
        ...baseStrategy,
        tags: '' as any, // Testing empty string tags strategy
      }
      const strategyWithDefaultTags: MergeStrategy = {
        ...baseStrategy,
        tags: 'union', // Explicitly use default tags strategy
      }

      const resultWithEmptyTags = await mergeBookmarks(
        dummyLocalData,
        dummyRemoteData,
        strategyWithEmptyTags,
        dummySyncOption
      )

      const resultWithDefaultTags = await mergeBookmarks(
        dummyLocalData,
        dummyRemoteData,
        strategyWithDefaultTags,
        dummySyncOption
      )

      expect(resultWithEmptyTags).toEqual(resultWithDefaultTags)
    })
  })
})

describe('mergeBookmarks Batch Processing', () => {
  let baseStrategy: MergeStrategy
  let baseSyncOption: SyncOption

  beforeEach(() => {
    baseStrategy = {
      meta: 'newer',
      tags: 'union',
      defaultDate: defaultDateTimestamp,
    }
    baseSyncOption = {
      currentSyncTime: now,
      lastSyncTime: twoHoursAgo,
    }
  })

  it('should process all bookmarks when the number of URLs exceeds batchSize', async () => {
    const localData: BookmarksData = {}
    const remoteData: BookmarksData = {}
    const expectedUpdatesForLocalData: BookmarksData = {}
    const numBookmarks = 250 // More than default batchSize of 100

    for (let i = 0; i < numBookmarks; i++) {
      const url = `http://example.com/page${i}`
      // For simplicity, we'll make remote newer so it's always chosen
      remoteData[url] = createBookmarkEntry(
        oneHourAgo,
        now - 10_000, // remote is newer
        `Remote Page ${i}`,
        [`tag${i}`],
        {},
        now - 5000
      )
      expectedUpdatesForLocalData[url] = {
        meta: {
          created: oneHourAgo,
          updated: now - 10_000,
          title: `Remote Page ${i}`,
          updated2: now - 5000,
          updated3: now,
        },
        tags: [`tag${i}`],
      }
    }

    const result = await mergeBookmarks(
      localData,
      remoteData,
      baseStrategy,
      baseSyncOption
    )

    expect(Object.keys(result.updatesForLocal).length).toBe(numBookmarks)
    expect(result.updatesForLocal).toEqual(expectedUpdatesForLocalData)
    expect(result.localDeletions.length).toBe(0)
  })
})
