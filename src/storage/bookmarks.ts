import {
  addValueChangeListener,
  getValue,
  setValue,
} from "browser-extension-storage"
import { isUrl, uniq } from "browser-extension-utils"

import type {
  BookmarkMetadata,
  BookmarksData,
  BookmarkTagsAndMetadata,
} from "../types/bookmarks.js"
import { addRecentTags } from "./tags.js"

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
export const currentExtensionVersion = "0.13.0"
export const currentDatabaseVersion = 3
const storageKey = "extension.utags.urlmap"

/** Cache for URL map data to improve performance */
let cachedUrlMap: BookmarksData = {}
let addTagsValueChangeListenerInitialized = false

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
  const bookmarksStore: BookmarksStore =
    ((await getValue(storageKey)) as BookmarksStore) ||
    createEmptyBookmarksStore()

  if (!bookmarksStore.data) {
    bookmarksStore.data = {}
  }

  if (!bookmarksStore.meta) {
    bookmarksStore.meta = createEmptyBookmarksStore().meta
  }

  cachedUrlMap = bookmarksStore.data
  return bookmarksStore
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
  cachedUrlMap = bookmarksStore ? bookmarksStore.data : {}
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

// TODO: remove this function
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
  meta: Record<string, any>
): Promise<void> {
  const now = Date.now()
  const bookmarksStore = await getBookmarksStore()
  const urlMap = bookmarksStore.data

  // Update store metadata
  bookmarksStore.meta = {
    ...bookmarksStore.meta,
    databaseVersion: currentDatabaseVersion,
    extensionVersion: currentExtensionVersion,
    updated: now,
  }

  const newTags = mergeTags(tags, [])
  let oldTags: string[] = []

  if (newTags.length === 0 || !isValidKey(key)) {
    // Remove bookmark if no tags are provided
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete urlMap[key]
  } else {
    // Update or create bookmark
    const existingData = urlMap[key] || {}
    oldTags = existingData.tags || []

    const newMeta: BookmarkMetadata = {
      ...existingData.meta,
      ...meta,
      created: existingData.meta?.created || now,
      updated: now,
    }

    urlMap[key] = {
      tags: newTags,
      meta: newMeta,
    }
  }

  await persistBookmarksStore(bookmarksStore)
  await addRecentTags(newTags, oldTags)
}

// Alias for backward compatibility
export const saveTags = saveBookmark

export function addTagsValueChangeListener(
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
) {
  addValueChangeListener(storageKey, func)
}

/**
 * Reloads the page when extension version mismatch is detected
 * TODO: Add confirmation dialog and implement reload count tracking to prevent infinite reloads
 */
async function reload() {
  console.log("Current extension is outdated, page reload required")
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
  return Array.isArray(tags) && tags.every((tag) => typeof tag === "string")
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
  ) as string[]
}

/**
 * Migrates bookmark data from V2 to V3 format
 * @param bookmarksStore V2 format bookmark store
 */
async function migrateV2toV3(bookmarksStore: BookmarksStoreV2) {
  console.log("Starting migration from V2 to V3")
  const now = Date.now()
  let minCreated = now
  const bookmarksStoreNew: BookmarksStoreV3 = createEmptyBookmarksStore()

  for (const key in bookmarksStore) {
    if (key === "meta") {
      continue // Skip meta field
    }

    if (!isValidKey(key)) {
      console.warn(`Migration: Invalid URL key: ${key}`)
      continue
    }

    const bookmarkV2 = bookmarksStore[key] as TagsAndMeta
    if (!bookmarkV2 || typeof bookmarkV2 !== "object") {
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
    if (bookmarkV2.meta && typeof bookmarkV2.meta === "object") {
      if (
        bookmarkV2.meta.title !== undefined &&
        typeof bookmarkV2.meta.title !== "string"
      ) {
        console.warn(
          `Migration: Invalid title type for key ${key}: ${typeof bookmarkV2.meta.title}`
        )
        delete bookmarkV2.meta.title
      }

      if (
        bookmarkV2.meta.description !== undefined &&
        typeof bookmarkV2.meta.description !== "string"
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

    const meta: BookmarkMetadata = {
      ...bookmarkV2.meta,
      created: (bookmarkV2.meta?.created as number | undefined) || now,
      updated: (bookmarkV2.meta?.updated as number | undefined) || now,
    }
    const bookmarkV3: BookmarkTagsAndMetadata = {
      tags: bookmarkV2.tags,
      meta,
    }
    bookmarksStoreNew.data[key] = bookmarkV3

    minCreated = Math.min(minCreated, meta.created)
  }

  bookmarksStoreNew.meta.created = minCreated
  await persistBookmarksStore(bookmarksStoreNew)
  console.log("Migration to V3 completed successfully")
}

/**
 * Checks if the current version is compatible with stored version
 * @param meta Metadata containing version information
 * @returns boolean indicating version compatibility
 */
async function checkVersion(meta: BookmarksStore["meta"]) {
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

  if (meta.databaseVersion !== currentDatabaseVersion) {
    const errorMessage = `Database version mismatch - Previous: ${meta.databaseVersion}, Current: ${currentDatabaseVersion}`
    console.error(errorMessage)
    throw new Error(errorMessage)
  }

  console.log("Bookmarks store initialized")

  if (!addTagsValueChangeListenerInitialized) {
    addTagsValueChangeListenerInitialized = true
    // When data is updated in other tabs, clear cache and check version
    addTagsValueChangeListener(async () => {
      console.log("Data updated in other tab, clearing cache")
      cachedUrlMap = {}
      await initBookmarksStore()
    })
  }
}
