import { get } from 'svelte/store'
import { STORAGE_KEY_BOOKMARKS_DELETED } from '../config/constants.js'
import {
  type BookmarkKeyValuePair,
  type DeleteActionType,
} from '../types/bookmarks.js'
import { settings } from './stores.js'

/**
 * Retrieves deleted bookmarks from localStorage
 * @returns Array of deleted bookmark key-value pairs
 */
function getDeletedBookmarksFromStorage() {
  // Get existing deleted bookmarks from localStorage or initialize empty array
  let deletedBookmarks: BookmarkKeyValuePair[] = []
  try {
    const existingData = localStorage.getItem(STORAGE_KEY_BOOKMARKS_DELETED)
    if (existingData) {
      deletedBookmarks = JSON.parse(existingData) as BookmarkKeyValuePair[]
    }
  } catch (error) {
    console.error('Error parsing deleted bookmarks from localStorage:', error)
    // Continue with empty array if parsing fails
  }

  return deletedBookmarks
}

/**
 * Saves deleted bookmarks to localStorage
 * @param deletedBookmarks - Array of bookmark key-value pairs to save
 */
function saveDeletedBookmarksToStorage(
  deletedBookmarks: BookmarkKeyValuePair[]
) {
  // Save back to localStorage
  localStorage.setItem(
    STORAGE_KEY_BOOKMARKS_DELETED,
    JSON.stringify(deletedBookmarks)
  )
}

/**
 * Save deleted bookmarks to localStorage
 * Supports saving a single bookmark or multiple bookmarks at once
 *
 * @param bookmarkKeyValuePairs - Single bookmark or array of bookmarks to be saved as deleted
 * @param options - Options containing the action type that caused the deletion
 * @returns boolean indicating whether the operation was successful
 */
export function saveDeletedBookmarks(
  bookmarkKeyValuePairs: BookmarkKeyValuePair | BookmarkKeyValuePair[],
  options: {
    actionType: DeleteActionType
  }
): boolean {
  const maxEntries = get(settings).maxDeletedBookmarks || 10_000
  try {
    // Convert single bookmark to array for consistent processing
    // Check if the input is an array of bookmarks (array of arrays) rather than just checking if it's an array
    const isBookmarkArray =
      Array.isArray(bookmarkKeyValuePairs) &&
      bookmarkKeyValuePairs.length > 0 &&
      Array.isArray(bookmarkKeyValuePairs[0])

    const bookmarksArray = (
      isBookmarkArray
        ? (bookmarkKeyValuePairs as BookmarkKeyValuePair[])
        : [bookmarkKeyValuePairs as BookmarkKeyValuePair]
    ).filter((bookmark) => bookmark && bookmark[0] && bookmark[1])

    if (bookmarksArray.length === 0) {
      console.warn('No valid bookmarks provided for saving.')
      return false
    }

    const deletedMeta = {
      deleted: Date.now(),
      actionType: options.actionType,
    }

    // Add deletion metadata to each bookmark
    for (const bookmarkKeyValuePair of bookmarksArray) {
      bookmarkKeyValuePair[1].deletedMeta = deletedMeta
    }

    // Get existing deleted bookmarks from localStorage or initialize empty array
    const deletedBookmarks = getDeletedBookmarksFromStorage()

    // Add new entries to the array
    deletedBookmarks.push(...bookmarksArray)

    // Limit the number of entries to prevent localStorage overflow
    if (deletedBookmarks.length > maxEntries) {
      deletedBookmarks.splice(0, deletedBookmarks.length - maxEntries)
    }

    // Save back to localStorage
    saveDeletedBookmarksToStorage(deletedBookmarks)

    return true
  } catch (error) {
    console.error('Error saving deleted bookmarks to localStorage:', error)
    return false
  }
}

/**
 * Remove specified bookmarks from deleted bookmarks history
 * Used when undoing a delete operation
 *
 * @param urls - Array of bookmark URLs to remove from history
 * @param options - Options for removal
 * @param options.actionType - The action type that was used when deleting
 * @returns boolean indicating whether the operation was successful
 */
export function removeDeletedBookmarks(
  urls: string[],
  options: {
    actionType?: DeleteActionType
  } = {}
): boolean {
  try {
    // Get current deletion history
    const deletedBookmarks = getDeletedBookmarksFromStorage()

    // If no history records exist, return success immediately
    if (!deletedBookmarks || deletedBookmarks.length === 0) {
      return true
    }

    // Default actionType
    const actionType = options.actionType || 'DELETE'

    // Remove specified bookmarks from history
    let found = false
    for (const url of urls) {
      // Search from the end of the array to find the most recently added record
      const index = deletedBookmarks.findLastIndex(
        (item) =>
          item[0] === url && item[1].deletedMeta?.actionType === actionType
      )

      if (index !== -1) {
        deletedBookmarks.splice(index, 1)
        found = true
      }
    }

    // If records were found and removed, save the updated history
    if (found) {
      // Save back to localStorage
      saveDeletedBookmarksToStorage(deletedBookmarks)
    }

    return true
  } catch (error) {
    console.error('Error removing bookmarks from deletion history:', error)
    return false
  }
}

export function getDeletedBookmarks() {
  return getDeletedBookmarksFromStorage()
}
