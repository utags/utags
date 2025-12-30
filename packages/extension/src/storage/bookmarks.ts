import {
  addValueChangeListener,
  getValue,
  setPolling,
  setValue,
} from 'browser-extension-storage'
import { isUrl, uniq } from 'browser-extension-utils'
import { normalizeCreated, normalizeUpdated, trimTitle } from 'utags-utils'

import type {
  BookmarkMetadata,
  BookmarksData,
  BookmarkTagsAndMetadata,
} from '../types/bookmarks.js'
import { addRecentTags } from './tags.js'

/**
 * The bookmarks store.
 * This is the main data structure that holds all bookmark information.
 * It contains both the actual bookmark data and metadata about the store itself.
 */
export type BookmarksStoreV2 = {
  [key: string]: TagsAndMeta | UrlMapMeta
  /**
   * Metadata about the bookmarks store.
   * Contains version information and timestamps for tracking database state.
   */
  meta: {
    /**
     * The version number of the database schema.
     * Used to handle migrations between different data structure versions.
     */
    databaseVersion: number
    /**
     * The version of the extension.
     */
    extensionVersion: string
  }
}

/**
 * The bookmarks store.
 * This is the main data structure that holds all bookmark information.
 * It contains both the actual bookmark data and metadata about the store itself.
 */
type BookmarksStoreV3 = {
  /**
   * The collection of all bookmarks, organized as a record with URLs as keys.
   * Each entry contains tags and metadata for a specific bookmark.
   */
  data: BookmarksData
  /**
   * Metadata about the bookmarks store.
   * Contains version information and timestamps for tracking database state.
   */
  meta: {
    /**
     * The version number of the database schema.
     * Used to handle migrations between different data structure versions.
     */
    databaseVersion: number
    /**
     * The version of the extension.
     */
    extensionVersion: string
    /**
     * The timestamp when the bookmarks store was initially created.
     * Stored as milliseconds since epoch.
     */
    created: number
    /**
     * The timestamp when the bookmarks store was last updated.
     * Stored as milliseconds since epoch.
     */
    updated?: number
    /**
     * The timestamp when the bookmarks were last exported.
     * Only used during bookmark export operations.
     * Stored as milliseconds since epoch.
     */
    exported?: number
  }
}

// V3 changed to BookmarkTagsAndMetadata
type TagsAndMeta = {
  tags: string[]
  meta?: ItemMeta
}

// V3 changed to BookmarkMetadata
type ItemMeta = Record<string, any>

type UrlMapMeta = {
  extensionVersion: string
  databaseVersion: number
}
type UrlMap = BookmarksStoreV2
type BookmarksStore = BookmarksStoreV3

/**
 * Current extension version and database configuration
 * TODO: Read version from package.json
 */
export const currentExtensionVersion = '0.14.2'
export const currentDatabaseVersion = 3
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DELETED_BOOKMARK_TAG = '._DELETED_'
const storageKey = 'extension.utags.urlmap'

/** Cache for URL map data to improve performance */
let cachedUrlMap: BookmarksData = {}
let addValueChangeListenerInitialized = false
let tagsValueChangeListener: () => void | undefined

/**
 * Clears the cached URL map to free memory
 * Should be called when the extension is being unloaded or reset
 */
export function clearCachedUrlMap(): void {
  cachedUrlMap = {}
}

function createEmptyBookmarksStore(): BookmarksStore {
  const store: BookmarksStore = {
    data: {},
    meta: {
      databaseVersion: currentDatabaseVersion,
      extensionVersion: currentExtensionVersion,
      created: Date.now(),
      updated: Date.now(),
    },
  }
  return store
}

async function getBookmarksStore(): Promise<BookmarksStore> {
  try {
    const bookmarksStore: BookmarksStore =
      (await getValue(storageKey))! || createEmptyBookmarksStore()

    if (!bookmarksStore.data) {
      bookmarksStore.data = {}
    }

    if (!bookmarksStore.meta) {
      bookmarksStore.meta = createEmptyBookmarksStore().meta
    }

    cachedUrlMap = filterDeleted(bookmarksStore.data)
    return bookmarksStore
  } catch (error) {
    console.error('Error getting bookmarks store:', error)
    cachedUrlMap = {}
    return createEmptyBookmarksStore()
  }
}

/**
 * Serializes the current bookmarks store to a JSON string.
 * This is used for exporting bookmarks or syncing with other instances.
 *
 * @returns A promise that resolves with the serialized bookmarks store
 */
export async function serializeBookmarks(): Promise<string> {
  const bookmarksStore = await getBookmarksStore()
  return JSON.stringify(bookmarksStore)
}

/**
 * Persists the bookmarks store to storage and updates the cache.
 *
 * @param bookmarksStore The bookmarks store to persist
 * @returns A promise that resolves when the store is persisted
 */
async function persistBookmarksStore(
  bookmarksStore: BookmarksStore | undefined
) {
  await setValue(storageKey, bookmarksStore)
  cachedUrlMap = bookmarksStore ? filterDeleted(bookmarksStore.data) : {}
}

/**
 * Deserializes a JSON string into the bookmarks store and persists it.
 * This is used for importing bookmarks or syncing with other instances.
 *
 * @param data The serialized bookmarks store data
 * @returns A promise that resolves when the data is deserialized and persisted
 * @throws {Error} If the data is invalid or cannot be parsed
 */
export async function deserializeBookmarks(
  data: string | undefined
): Promise<void> {
  const bookmarksStore = data ? (JSON.parse(data) as BookmarksStore) : undefined
  // TODO: validate data structure and types
  // TODO: validate version compatibility
  // TODO: validate data integrity

  await persistBookmarksStore(bookmarksStore)
}

export async function getUrlMap(): Promise<BookmarksData> {
  const bookmarksStore = await getBookmarksStore()

  return bookmarksStore.data
}

// For test purpose
export async function getCachedUrlMap(): Promise<BookmarksData> {
  // Ensure cachedUrlMap is initialized
  // if (!cachedUrlMap) {
  //   try {
  //     cachedUrlMap = await getUrlMap()
  //   } catch (error) {
  //     console.error("Error getting cachedUrlMap:", error)
  //     cachedUrlMap = {}
  //   }
  // }

  return cachedUrlMap
}

/**
 * Retrieves bookmark data for a given URL
 * @param key URL of the bookmark
 * @returns Bookmark data including tags and metadata
 */
export function getBookmark(key: string): BookmarkTagsAndMetadata {
  return (
    cachedUrlMap[key] || {
      tags: [],
      meta: { created: 0, updated: 0 },
    }
  )
}

// Alias for backward compatibility
export const getTags = getBookmark

/**
 * Saves or updates a bookmark with tags and metadata
 * @param key URL of the bookmark
 * @param tags Array of tags to associate with the bookmark
 * @param meta Additional metadata for the bookmark
 */
export async function saveBookmark(
  key: string,
  tags: string[],
  meta: Record<string, any> | undefined
): Promise<void> {
  const now = Date.now()
  const bookmarksStore = await getBookmarksStore()
  const urlMap = bookmarksStore.data
  let changed = false

  // Update store metadata
  bookmarksStore.meta = {
    ...bookmarksStore.meta,
    databaseVersion: currentDatabaseVersion,
    extensionVersion: currentExtensionVersion,
  }

  const newTags = mergeTags(tags, [])
  let oldTags: string[] = []

  if (!isValidKey(key)) {
    if (urlMap[key]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete urlMap[key]
      changed = true
    }
  } else if (newTags.length === 0) {
    // Mark as deleted bookmark if no tags are provided
    const existingData = urlMap[key]
    if (existingData) {
      oldTags = existingData.tags || []
      if (!oldTags.includes(DELETED_BOOKMARK_TAG)) {
        existingData.tags = [...oldTags, DELETED_BOOKMARK_TAG]
        existingData.meta = {
          ...existingData.meta,
          updated2: now,
        }
        existingData.deletedMeta = {
          deleted: now,
          actionType: 'DELETE',
        }
        changed = true
      }
    }
  } else {
    // Update or create bookmark
    const existingData = urlMap[key] || {}
    const existingDataStr = JSON.stringify(existingData)
    oldTags = existingData.tags || []

    const title =
      trimTitle(meta?.title as string) || trimTitle(existingData.meta?.title)
    const newMeta: BookmarkMetadata = {
      ...existingData.meta,
      ...meta,
    }

    // Use existing data's created time, not the input meta.created
    // This preserves the original creation timestamp of the bookmark
    newMeta.created = normalizeCreated(
      existingData.meta?.created,
      existingData.meta?.updated,
      now
    )
    if (existingData.meta?.updated) {
      newMeta.updated = existingData.meta.updated
    }

    if (title) {
      newMeta.title = title
    }

    const newData = {
      tags: newTags,
      meta: newMeta,
    }
    const newDataStr = JSON.stringify(newData)

    if (existingDataStr !== newDataStr) {
      changed = true
      newData.meta.updated = now
    }

    urlMap[key] = newData
  }

  if (changed) {
    bookmarksStore.meta.updated = now
    await persistBookmarksStore(bookmarksStore)
    await addRecentTags(newTags, oldTags)
  }
}

// Alias for backward compatibility
export const saveTags = saveBookmark

export function addTagsValueChangeListener(func: () => void) {
  tagsValueChangeListener = func
}

/**
 * Reloads the page when extension version mismatch is detected
 * TODO: Add confirmation dialog and implement reload count tracking to prevent infinite reloads
 */
async function reload() {
  console.log('Current extension is outdated, page reload required')
  location.reload()
}

/**
 * Validates if a given key is a valid URL
 * @param key The key to validate
 * @returns boolean indicating if key is a valid URL
 */
function isValidKey(key: string): boolean {
  return isUrl(key)
}

/**
 * Validates if the provided value is a valid tags array
 * @param tags Value to validate
 * @returns boolean indicating if value is a valid tags array
 */
function isValidTags(tags: unknown): boolean {
  return Array.isArray(tags) && tags.every((tag) => typeof tag === 'string')
}

/**
 * Merges two arrays of tags, removing duplicates and empty values
 * @param tags First array of tags
 * @param tags2 Second array of tags
 * @returns Merged and cleaned array of tags
 */
function mergeTags(tags: string[], tags2: string[]): string[] {
  const array1 = tags || []
  const array2 = tags2 || []

  return uniq(
    array1
      .concat(array2)
      .map((tag) => (tag ? String(tag).trim() : tag))
      .filter(Boolean)
  )
}

/**
 * Filters out bookmarks that contain the '._DELETED_' tag
 * @param data The bookmarks data to filter
 * @returns A new BookmarksData object with deleted bookmarks removed
 */
function filterDeleted(data: BookmarksData): BookmarksData {
  const filteredData: BookmarksData = {}

  for (const [key, bookmark] of Object.entries(data)) {
    // Check if the bookmark contains the '._DELETED_' tag
    if (bookmark.tags && !bookmark.tags.includes(DELETED_BOOKMARK_TAG)) {
      filteredData[key] = bookmark
    }
  }

  return filteredData
}

/**
 * Migrates bookmark data from V2 to V3 format
 * @param bookmarksStore V2 format bookmark store
 */
async function migrateV2toV3(bookmarksStore: BookmarksStoreV2) {
  console.log('Starting migration from V2 to V3')
  const now = Date.now()
  let minCreated = now
  const bookmarksStoreNew: BookmarksStoreV3 = createEmptyBookmarksStore()

  for (const key in bookmarksStore) {
    if (key === 'meta') {
      continue // Skip meta field
    }

    if (!isValidKey(key)) {
      console.warn(`Migration: Invalid URL key: ${key}`)
      continue
    }

    const bookmarkV2 = bookmarksStore[key] as TagsAndMeta
    if (!bookmarkV2 || typeof bookmarkV2 !== 'object') {
      console.warn(
        `Migration: Invalid value for key ${key}: ${String(bookmarkV2)}`
      )
      continue
    }

    if (!bookmarkV2.tags || !isValidTags(bookmarkV2.tags)) {
      console.warn(
        `Migration: Invalid tags for key ${key}: ${String(bookmarkV2.tags)}`
      )
      continue
    }

    // Validate metadata fields
    if (bookmarkV2.meta && typeof bookmarkV2.meta === 'object') {
      if (
        bookmarkV2.meta.title !== undefined &&
        typeof bookmarkV2.meta.title !== 'string'
      ) {
        console.warn(
          `Migration: Invalid title type for key ${key}: ${typeof bookmarkV2.meta.title}`
        )
        delete bookmarkV2.meta.title
      }

      if (
        bookmarkV2.meta.description !== undefined &&
        typeof bookmarkV2.meta.description !== 'string'
      ) {
        console.warn(
          `Migration: Invalid description type for key ${key}: ${typeof bookmarkV2.meta.description}`
        )
        delete bookmarkV2.meta.description
      }

      const created = Number(bookmarkV2.meta.created)
      if (Number.isNaN(created) || created < 0) {
        console.warn(
          `Migration: Invalid created timestamp for key ${key}: ${bookmarkV2.meta.created}`
        )
        delete bookmarkV2.meta.created
      }

      const updated = Number(bookmarkV2.meta.updated)
      if (Number.isNaN(updated) || updated < 0) {
        console.warn(
          `Migration: Invalid updated timestamp for key ${key}: ${bookmarkV2.meta.updated}`
        )
        delete bookmarkV2.meta.updated
      }
    }

    const normalizedCreated = normalizeCreated(
      bookmarkV2.meta?.created as number | undefined,
      bookmarkV2.meta?.updated as number | undefined,
      now
    )
    const normalizedUpdated = normalizeUpdated(
      normalizedCreated,
      bookmarkV2.meta?.updated as number | undefined,
      now
    )
    const meta: BookmarkMetadata = {
      ...bookmarkV2.meta,
      created: normalizedCreated,
      updated: normalizedUpdated,
    }
    const bookmarkV3: BookmarkTagsAndMetadata = {
      tags: bookmarkV2.tags,
      meta,
    }
    bookmarksStoreNew.data[key] = bookmarkV3

    minCreated = Math.min(minCreated, normalizedCreated)
  }

  bookmarksStoreNew.meta.created = minCreated
  await persistBookmarksStore(bookmarksStoreNew)
  console.log('Migration to V3 completed successfully')
}

/**
 * Fixes timestamp bug from extension version 0.13.0 and migrates to latest version
 *
 * In v0.13.0, there was a bug where created timestamps of 0 were incorrectly
 * replaced with current time due to falsy check: `created || now`
 * This migration restores the correct created timestamp by using the updated
 * timestamp when created was incorrectly set to now
 *
 * @param bookmarksStore V3 format bookmark store from v0.13.0
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
async function migrateV3_fixV0_13_0TimestampBug(
  bookmarksStore: BookmarksStoreV3
) {
  const oldMeta = bookmarksStore.meta
  const oldData = bookmarksStore.data
  if (oldMeta.extensionVersion !== '0.13.0') {
    return
  }

  console.log(
    'Starting migration from extension v0.13.0 to v' + currentExtensionVersion
  )
  const now = Date.now()
  const bookmarksStoreNew: BookmarksStoreV3 = createEmptyBookmarksStore()

  for (const key in oldData) {
    if (!Object.hasOwn(oldData, key)) {
      continue
    }

    if (!isValidKey(key)) {
      console.warn(`Migration: Invalid URL key: ${key}`)
      continue
    }

    const bookmarkOld = oldData[key]
    if (!bookmarkOld || typeof bookmarkOld !== 'object') {
      console.warn(
        `Migration: Invalid value for key ${key}: ${String(bookmarkOld)}`
      )
      continue
    }

    if (!bookmarkOld.tags || !isValidTags(bookmarkOld.tags)) {
      console.warn(
        `Migration: Invalid tags for key ${key}: ${String(bookmarkOld.tags)}`
      )
      continue
    }

    const normalizedCreated = normalizeCreated(
      bookmarkOld.meta?.created as number | undefined,
      bookmarkOld.meta?.updated as number | undefined,
      now
    )
    const normalizedUpdated = normalizeUpdated(
      normalizedCreated,
      bookmarkOld.meta?.updated as number | undefined,
      now
    )
    const meta: BookmarkMetadata = {
      ...bookmarkOld.meta,
      created: normalizedCreated,
      updated: normalizedUpdated,
    }
    const bookmarkNew: BookmarkTagsAndMetadata = {
      tags: bookmarkOld.tags,
      meta,
    }
    bookmarksStoreNew.data[key] = bookmarkNew
  }

  bookmarksStoreNew.meta.created = oldMeta.created
  await persistBookmarksStore(bookmarksStoreNew)
  console.log('Migration to V3 completed successfully')
}

/**
 * Checks if the current version is compatible with stored version
 * @param meta Metadata containing version information
 * @returns boolean indicating version compatibility
 */
async function checkVersion(meta: BookmarksStore['meta']) {
  if (meta.extensionVersion !== currentExtensionVersion) {
    console.warn(
      `Version mismatch - Previous: ${meta.extensionVersion}, Current: ${currentExtensionVersion}`
    )
    if (meta.extensionVersion > currentExtensionVersion) {
      // TODO: Implement version upgrade handling
      // await reload()
      // return false
    }
  }

  if (meta.databaseVersion !== currentDatabaseVersion) {
    console.warn(
      `Database version mismatch - Previous: ${meta.databaseVersion}, Current: ${currentDatabaseVersion}`
    )
    // TODO: Add user confirmation before reload
    if (meta.databaseVersion > currentDatabaseVersion) {
      await reload()
      return false
    }
  }

  return true
}

/**
 * Initialize the bookmarks store
 * This is the first function to be called when the extension loads
 */
export async function initBookmarksStore(): Promise<void> {
  cachedUrlMap = {}
  const bookmarksStore = await getBookmarksStore()
  const meta = bookmarksStore.meta

  const isVersionCompatible = await checkVersion(meta)
  if (!isVersionCompatible) {
    return
  }

  if (meta.databaseVersion === 2) {
    await migrateV2toV3(bookmarksStore as unknown as BookmarksStoreV2)
    // Reload data after migration
    await initBookmarksStore()
    return
  }

  if (meta.databaseVersion === 3 && meta.extensionVersion === '0.13.0') {
    await migrateV3_fixV0_13_0TimestampBug(bookmarksStore)
    // Reload data after migration
    await initBookmarksStore()
    return
  }

  if (meta.databaseVersion !== currentDatabaseVersion) {
    const errorMessage = `Database version mismatch - Previous: ${meta.databaseVersion}, Current: ${currentDatabaseVersion}`
    console.error(errorMessage)
    throw new Error(errorMessage)
  }

  console.log('Bookmarks store initialized')
  if (tagsValueChangeListener) {
    tagsValueChangeListener()
  }

  if (!addValueChangeListenerInitialized) {
    addValueChangeListenerInitialized = true
    setPolling(true)
    // When data is updated in other tabs, clear cache and check version
    await addValueChangeListener(
      storageKey,
      async (_key, _oldValue, _newValue, remote) => {
        if (remote) {
          console.log('Data updated in other tab, clearing cache')
        } else {
          console.log('Data updated, clearing cache')
        }

        cachedUrlMap = {}
        await initBookmarksStore()
      }
    )
  }
}
